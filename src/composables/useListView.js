import { computed, ref } from "vue";
import listData from "../entries.json";
import { STATUSES } from "../storage/schema.js";
import { statusOf } from "./useProgress.js";

export const SORT_MODES = [
	{ value: "priority", label: "Priority first" },
	{ value: "list", label: "BADBOOL list order" },
	{ value: "name", label: "Name (A–Z)" },
];

// 💐 crucial and ☠ high priority float to the top in "priority" sort; every
// other entry keeps its BADBOOL list position within its rank.
const PRIORITY_RANK = { "💐": 0, "☠": 1 };
const LOWEST_RANK = 2;

function priorityRankOf(entry) {
	return entry.symbols.reduce((best, symbol) => Math.min(best, PRIORITY_RANK[symbol] ?? LOWEST_RANK), LOWEST_RANK);
}

const searchQuery = ref("");
const sortMode = ref("priority");
const visibleStatuses = ref(new Set(STATUSES));
const requiredSymbols = ref(new Set());
const expandedIds = ref(new Set());
const statusOpenIds = ref(new Set());

function toggleInSet(setRef, value) {
	const next = new Set(setRef.value);
	if (next.has(value)) next.delete(value);
	else next.add(value);
	setRef.value = next;
}

export const visibleEntries = computed(() => {
	const needle = searchQuery.value.trim().toLowerCase();
	const symbols = requiredSymbols.value;
	const statuses = visibleStatuses.value;

	const matched = listData.entries.filter((entry) => {
		if (!statuses.has(statusOf(entry.id))) return false;
		if (symbols.size && !entry.symbols.some((symbol) => symbols.has(symbol))) return false;
		if (needle && !entry.name.toLowerCase().includes(needle)) return false;
		return true;
	});

	if (sortMode.value === "name") return [...matched].sort((a, b) => a.name.localeCompare(b.name));
	if (sortMode.value === "priority") return [...matched].sort((a, b) => priorityRankOf(a) - priorityRankOf(b));
	return matched;
});

export const activeFilterCount = computed(() => {
	const hiddenStatuses = STATUSES.length - visibleStatuses.value.size;
	return hiddenStatuses + requiredSymbols.value.size;
});

export function useListView() {
	return {
		searchQuery,
		sortMode,
		visibleStatuses,
		requiredSymbols,
		expandedIds,
		statusOpenIds,
		visibleEntries,
		activeFilterCount,
		toggleStatusFilter: (status) => toggleInSet(visibleStatuses, status),
		toggleSymbolFilter: (symbol) => toggleInSet(requiredSymbols, symbol),
		toggleExpanded: (entryId) => toggleInSet(expandedIds, entryId),
		toggleStatusOpen: (entryId) => toggleInSet(statusOpenIds, entryId),
		clearFilters: () => {
			visibleStatuses.value = new Set(STATUSES);
			requiredSymbols.value = new Set();
			searchQuery.value = "";
		},
	};
}
