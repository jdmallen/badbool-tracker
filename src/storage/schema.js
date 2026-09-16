import listData from "../entries.json";

export const SCHEMA_VERSION = 1;
export const STATUSES = ["open", "requested", "removed", "not-present"];
export const MAX_NOTES_LENGTH = 1000;

const KNOWN_SLUGS = new Set(listData.entries.map((entry) => entry.id));

export function createEmptyDocument() {
	return { schemaVersion: SCHEMA_VERSION, entries: {} };
}

function isValidTimestamp(value) {
	return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeEntry(slug, raw) {
	if (!KNOWN_SLUGS.has(slug) || typeof raw !== "object" || raw === null) return null;

	const status = STATUSES.includes(raw.status) ? raw.status : "open";
	const notes = typeof raw.notes === "string" ? raw.notes.slice(0, MAX_NOTES_LENGTH) : "";
	if (status === "open" && !notes) return null;

	// `updatedAt` is the field name from the legacy dev-server shape (today's data/progress.json)
	const legacyTimestamp = isValidTimestamp(raw.updatedAt) ? raw.updatedAt : undefined;
	const modifiedAt = isValidTimestamp(raw.modifiedAt) ? raw.modifiedAt : (legacyTimestamp ?? new Date().toISOString());

	const entry = { modifiedAt };
	if (notes) entry.notes = notes;
	if (status !== "open") {
		entry.status = status;
		entry.statusChangedAt = isValidTimestamp(raw.statusChangedAt) ? raw.statusChangedAt : (legacyTimestamp ?? modifiedAt);
	}
	return entry;
}

// Accepts today's shape ({ schemaVersion, entries }) or the legacy flat map
// ({ slug: { status, updatedAt, notes } }) so existing backups still import.
export function normalizeDocument(input) {
	const normalized = createEmptyDocument();
	if (typeof input !== "object" || input === null) return normalized;

	const rawEntries = input.entries && typeof input.entries === "object" ? input.entries : input;
	for (const [slug, raw] of Object.entries(rawEntries)) {
		const entry = normalizeEntry(slug, raw);
		if (entry) normalized.entries[slug] = entry;
	}
	return normalized;
}
