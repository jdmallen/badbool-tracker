import { createRequire } from "node:module";

// Avoids ESM JSON import-attribute syntax, whose support varies across the
// Node versions Azure Functions has shipped.
const require = createRequire(import.meta.url);
const KNOWN_SLUGS = new Set(require("../sites.json"));

const STATUSES = ["open", "requested", "removed", "not-present"];
const MAX_BODY_BYTES = 60 * 1024;
const MAX_NOTES_LENGTH = 1000;

function isValidTimestamp(value) {
	return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

// Returns null when the payload is valid, or a string describing the first
// problem found. `payload` is the parsed PUT body: { baseVersion, data }.
export function validateProgressPayload(payload) {
	if (typeof payload !== "object" || payload === null) return "Body must be a JSON object";
	if (typeof payload.baseVersion !== "number" || payload.baseVersion < 0) return "baseVersion must be a non-negative number";
	if (typeof payload.data !== "string") return "data must be a JSON string";
	if (Buffer.byteLength(payload.data, "utf-8") > MAX_BODY_BYTES) return "data exceeds 60 KB";

	let progressDocument;
	try {
		progressDocument = JSON.parse(payload.data);
	} catch {
		return "data is not valid JSON";
	}
	if (typeof progressDocument !== "object" || progressDocument === null) return "data must be a JSON object";
	if (progressDocument.schemaVersion !== 1) return "schemaVersion must be 1";
	if (typeof progressDocument.entries !== "object" || progressDocument.entries === null) return "entries must be an object";

	const entries = Object.entries(progressDocument.entries);
	if (entries.length > KNOWN_SLUGS.size) return "too many entries";

	for (const [slug, entry] of entries) {
		if (!KNOWN_SLUGS.has(slug)) return `unknown site: ${slug}`;
		if (typeof entry !== "object" || entry === null) return `invalid entry: ${slug}`;
		if (entry.status !== undefined && !STATUSES.includes(entry.status)) return `invalid status: ${slug}`;
		if (entry.notes !== undefined && (typeof entry.notes !== "string" || entry.notes.length > MAX_NOTES_LENGTH)) return `invalid notes: ${slug}`;
		if (!isValidTimestamp(entry.modifiedAt)) return `invalid modifiedAt: ${slug}`;
		if (entry.statusChangedAt !== undefined && !isValidTimestamp(entry.statusChangedAt)) return `invalid statusChangedAt: ${slug}`;
	}
	return null;
}
