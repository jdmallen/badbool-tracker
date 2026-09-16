import { computed, ref } from "vue";
import listData from "../entries.json";
import { STATUSES, createEmptyDocument, normalizeDocument } from "../storage/schema.js";
import { loadLocalProgress, saveLocalProgress } from "../storage/local.js";
import { markDirty } from "../storage/cloud.js";

export const STATUS_LABELS = { open: "Open", requested: "Requested", removed: "Removed", "not-present": "Not present" };
// Finished entries count toward progress
export const DONE_STATUSES = new Set(["removed", "not-present"]);

// Module-level singleton: the app mounts exactly one tracker.
const progressDocument = ref(createEmptyDocument());
const saveStatus = ref("");

export function statusOf(entryId) {
	return progressDocument.value.entries[entryId]?.status ?? "open";
}

export function entryRecordOf(entryId) {
	return progressDocument.value.entries[entryId] ?? null;
}

function persist() {
	const saved = saveLocalProgress(progressDocument.value);
	saveStatus.value = saved ? "Saved in this browser." : "Progress can't be saved in this browser — export a backup so you don't lose it.";
	markDirty();
}

// Single write path: stamps modifiedAt (and statusChangedAt on status change),
// saves locally, and marks the document dirty for the next cloud sync.
export function updateEntry(slug, changes) {
	const existing = progressDocument.value.entries[slug] ?? {};
	const now = new Date().toISOString();
	const next = { ...existing, modifiedAt: now };

	if ("status" in changes) {
		if (changes.status && changes.status !== "open") {
			next.status = changes.status;
			next.statusChangedAt = now;
		} else {
			delete next.status;
			delete next.statusChangedAt;
		}
	}
	if ("notes" in changes) {
		if (changes.notes) next.notes = changes.notes;
		else delete next.notes;
	}

	// Replacing `entries` (rather than mutating in place) keeps the ref's
	// dependents — counts, filtered list — reactive without deep watchers.
	const entries = { ...progressDocument.value.entries };
	if (!next.status && !next.notes) delete entries[slug];
	else entries[slug] = next;
	progressDocument.value = { ...progressDocument.value, entries };

	persist();
}

export function replaceDocument(document, { save = true } = {}) {
	progressDocument.value = normalizeDocument(document);
	if (save) saveLocalProgress(progressDocument.value);
}

export function loadFromLocalStorage() {
	progressDocument.value = normalizeDocument(loadLocalProgress() ?? createEmptyDocument());
}

export function setSaveStatus(message) {
	saveStatus.value = message;
}

export const statusCounts = computed(() => {
	const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
	for (const entry of listData.entries) counts[statusOf(entry.id)]++;
	return counts;
});

export const doneCount = computed(() => statusCounts.value.removed + statusCounts.value["not-present"]);
export const totalCount = listData.entries.length;
export const donePercent = computed(() => Math.round((doneCount.value / totalCount) * 100));

export function useProgress() {
	return {
		progressDocument,
		saveStatus,
		statusCounts,
		doneCount,
		donePercent,
		totalCount,
	};
}
