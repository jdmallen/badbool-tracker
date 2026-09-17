import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsMenu from "./SettingsMenu.vue";

function openMenu() {
	const wrapper = mount(SettingsMenu, { props: { user: { provider: "github", username: "jdmallen" } } });
	return wrapper.find(".trigger").trigger("click").then(() => wrapper);
}

function findAction(wrapper, label) {
	return wrapper.findAll(".actions button").find((button) => button.text() === label);
}

describe("SettingsMenu cloud deletion", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	// Regression: this used to be <a href="/privacy.html">, and the privacy page
	// pointed back at this menu, so neither end could delete anything.
	it("is a button that acts, not a link to the privacy page", async () => {
		const wrapper = await openMenu();

		expect(findAction(wrapper, "Delete my cloud data")).toBeTruthy();
		expect(wrapper.find('a[href="/privacy.html"]').exists()).toBe(false);
	});

	it("does nothing when the confirm is dismissed", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

		const wrapper = await openMenu();
		await findAction(wrapper, "Delete my cloud data").trigger("click");

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("deletes then signs out once confirmed", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }));
		vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
		const assignMock = vi.fn();
		vi.stubGlobal("location", { assign: assignMock });

		const wrapper = await openMenu();
		await findAction(wrapper, "Delete my cloud data").trigger("click");
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(assignMock).toHaveBeenCalledWith("/.auth/logout");
	});
});
