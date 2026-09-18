import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import listData from "../src/entries.json";
import App from "./App.vue";
import { createEmptyDocument } from "./storage/schema.js";
import { replaceDocument } from "./composables/useProgress.js";
import { useListView } from "./composables/useListView.js";

describe("App", () => {
	beforeEach(() => {
		// onMounted hits /.auth/me; auth.js swallows the failure, but stub it so
		// the test does not depend on network behavior.
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		replaceDocument(createEmptyDocument());
		useListView().clearFilters();
	});

	it("mounts the whole tree and renders one card per site", async () => {
		const wrapper = mount(App);
		await flushPromises();

		expect(wrapper.findAll(".entry")).toHaveLength(listData.entries.length);
		expect(wrapper.find("h1").text()).toBe("BADBOOL Tracker");
		expect(wrapper.find(".result-count").text()).toBe(`${listData.entries.length} sites`);
	});

	it("exposes skip link, search landmark and list landmark", () => {
		const wrapper = mount(App);
		expect(wrapper.find(".skip-link").attributes("href")).toBe("#entry-list");
		expect(wrapper.find('[role="search"]').exists()).toBe(true);
		expect(wrapper.find("main#entry-list").exists()).toBe(true);
	});

	it("narrows the list as you type in the search box", async () => {
		const wrapper = mount(App);
		await wrapper.find('input[type="search"]').setValue("beenverified");

		expect(wrapper.findAll(".entry")).toHaveLength(1);
		expect(wrapper.find(".result-count").text()).toBe(`1 of ${listData.entries.length} sites`);
	});

	it("shows an empty state when nothing matches", async () => {
		const wrapper = mount(App);
		await wrapper.find('input[type="search"]').setValue("zzzzz-no-such-site");

		expect(wrapper.findAll(".entry")).toHaveLength(0);
		expect(wrapper.find(".empty").exists()).toBe(true);
	});

	it("toggles the filter panel from the Filters button", async () => {
		const wrapper = mount(App);
		const toggle = wrapper.find(".filter-toggle");
		expect(toggle.attributes("aria-expanded")).toBe("false");

		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("true");
		expect(wrapper.find("#filter-panel").isVisible()).toBe(true);
	});
});
