import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import listData from "../entries.json";
import { createEmptyDocument } from "../storage/schema.js";
import { replaceDocument, statusOf } from "../composables/useProgress.js";
import { useListView } from "../composables/useListView.js";
import EntryCard from "./EntryCard.vue";

const entry = listData.entries.find((candidate) => candidate.id === "beenverified");

describe("EntryCard", () => {
	beforeEach(() => {
		replaceDocument(createEmptyDocument());
		const view = useListView();
		view.expandedIds.value = new Set();
		view.statusOpenIds.value = new Set();
	});

	it("renders collapsed: name and status badge only, no body", () => {
		const wrapper = mount(EntryCard, { props: { entry } });
		expect(wrapper.find(".entry-name").text()).toBe("BeenVerified");
		expect(wrapper.find(".status-badge").text()).toBe("Open");
		expect(wrapper.find(".entry-body").exists()).toBe(false);
		expect(wrapper.find(".status-panel").exists()).toBe(false);
		expect(wrapper.find(".disclosure").attributes("aria-expanded")).toBe("false");
	});

	it("expands the body on disclosure click", async () => {
		const wrapper = mount(EntryCard, { props: { entry } });
		await wrapper.find(".disclosure").trigger("click");
		expect(wrapper.find(".entry-body").exists()).toBe(true);
		expect(wrapper.find(".instructions").exists()).toBe(true);
		expect(wrapper.find(".disclosure").attributes("aria-expanded")).toBe("true");
	});

	it("keeps notes behind an opt-in button until a note exists", async () => {
		const wrapper = mount(EntryCard, { props: { entry } });
		await wrapper.find(".disclosure").trigger("click");
		expect(wrapper.find("textarea").exists()).toBe(false);

		await wrapper.find(".add-note").trigger("click");
		expect(wrapper.find("textarea").exists()).toBe(true);
	});

	it("reveals the status control independently of the body", async () => {
		const wrapper = mount(EntryCard, { props: { entry } });
		await wrapper.find(".status-badge").trigger("click");
		expect(wrapper.find(".status-panel").exists()).toBe(true);
		expect(wrapper.find(".entry-body").exists()).toBe(false);
		expect(wrapper.findAll(".status-control .segment")).toHaveLength(4);
	});

	it("writes the chosen status through to the progress document", async () => {
		const wrapper = mount(EntryCard, { props: { entry } });
		await wrapper.find(".status-badge").trigger("click");

		const removedRadio = wrapper.find('input[value="removed"]');
		await removedRadio.setValue();

		expect(statusOf("beenverified")).toBe("removed");
		expect(wrapper.find(".status-badge").text()).toBe("Removed");
		expect(wrapper.find(".status-note").text()).toMatch(/^Removed /);
	});
});
