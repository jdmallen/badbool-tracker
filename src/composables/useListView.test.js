import { beforeEach, describe, expect, it } from "vitest";
import listData from "../entries.json";
import { createEmptyDocument } from "../storage/schema.js";
import { useListView } from "./useListView.js";
import { replaceDocument, updateEntry } from "./useProgress.js";

const CRUCIAL_COUNT = listData.entries.filter((entry) => entry.symbols.includes("💐")).length;

describe("useListView", () => {
	let view;

	beforeEach(() => {
		replaceDocument(createEmptyDocument());
		view = useListView();
		view.clearFilters();
		view.sortMode.value = "list";
	});

	it("shows every entry with no search or filters applied", () => {
		expect(view.visibleEntries.value).toHaveLength(listData.entries.length);
		expect(view.activeFilterCount.value).toBe(0);
	});

	it("filters by name, case-insensitively", () => {
		view.searchQuery.value = "beenVERIFIED";
		expect(view.visibleEntries.value.map((entry) => entry.id)).toEqual(["beenverified"]);
	});

	it("returns nothing for a name that matches no site", () => {
		view.searchQuery.value = "definitely-not-a-broker";
		expect(view.visibleEntries.value).toEqual([]);
	});

	it("floats 💐 crucial then ☠ high-priority entries to the top in priority sort", () => {
		view.sortMode.value = "priority";
		const ranks = view.visibleEntries.value.map((entry) => {
			if (entry.symbols.includes("💐")) return 0;
			if (entry.symbols.includes("☠")) return 1;
			return 2;
		});
		expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		expect(ranks.slice(0, CRUCIAL_COUNT).every((rank) => rank === 0)).toBe(true);
	});

	it("sorts alphabetically by name", () => {
		view.sortMode.value = "name";
		const names = view.visibleEntries.value.map((entry) => entry.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it("hides entries whose status is filtered out", () => {
		updateEntry("beenverified", { status: "removed" });
		expect(view.visibleEntries.value.some((entry) => entry.id === "beenverified")).toBe(true);

		view.toggleStatusFilter("removed");
		expect(view.visibleEntries.value.some((entry) => entry.id === "beenverified")).toBe(false);
		expect(view.activeFilterCount.value).toBe(1);
	});

	it("keeps only entries carrying a required symbol", () => {
		view.toggleSymbolFilter("💐");
		expect(view.visibleEntries.value).toHaveLength(CRUCIAL_COUNT);
		expect(view.visibleEntries.value.every((entry) => entry.symbols.includes("💐"))).toBe(true);
	});

	it("combines search, symbol and status filters", () => {
		view.toggleSymbolFilter("💐");
		view.searchQuery.value = "beenverified";
		expect(view.visibleEntries.value.map((entry) => entry.id)).toEqual(["beenverified"]);

		view.toggleStatusFilter("open");
		expect(view.visibleEntries.value).toEqual([]);
	});

	it("clearFilters resets search, statuses and symbols", () => {
		view.searchQuery.value = "been";
		view.toggleSymbolFilter("☠");
		view.toggleStatusFilter("open");
		expect(view.activeFilterCount.value).toBeGreaterThan(0);

		view.clearFilters();
		expect(view.searchQuery.value).toBe("");
		expect(view.activeFilterCount.value).toBe(0);
		expect(view.visibleEntries.value).toHaveLength(listData.entries.length);
	});
});
