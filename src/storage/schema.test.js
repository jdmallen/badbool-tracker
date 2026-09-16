import { describe, expect, it } from "vitest";
import listData from "../entries.json";
import { createEmptyDocument, normalizeDocument, MAX_NOTES_LENGTH } from "./schema.js";

const KNOWN_SLUG = listData.entries[0].id;

describe("normalizeDocument", () => {
	it("returns an empty document for garbage input", () => {
		expect(normalizeDocument(null)).toEqual(createEmptyDocument());
		expect(normalizeDocument(undefined)).toEqual(createEmptyDocument());
		expect(normalizeDocument("nope")).toEqual(createEmptyDocument());
	});

	it("migrates the legacy flat-map shape", () => {
		const legacy = { [KNOWN_SLUG]: { status: "requested", updatedAt: "2026-09-14T12:00:00.000Z", notes: "used alt email" } };
		const result = normalizeDocument(legacy);
		expect(result.schemaVersion).toBe(1);
		expect(result.entries[KNOWN_SLUG]).toEqual({
			status: "requested",
			notes: "used alt email",
			statusChangedAt: "2026-09-14T12:00:00.000Z",
			modifiedAt: "2026-09-14T12:00:00.000Z",
		});
	});

	it("accepts today's { schemaVersion, entries } shape", () => {
		const input = { schemaVersion: 1, entries: { [KNOWN_SLUG]: { status: "removed", modifiedAt: "2026-09-15T09:10:00.000Z", statusChangedAt: "2026-09-15T09:00:00.000Z" } } };
		const result = normalizeDocument(input);
		expect(result.entries[KNOWN_SLUG].status).toBe("removed");
	});

	it("drops unknown slugs", () => {
		const result = normalizeDocument({ "totally-not-a-real-site": { status: "removed", modifiedAt: "2026-09-15T09:00:00.000Z" } });
		expect(result.entries).toEqual({});
	});

	it("falls back an invalid status to open, omitting the entry when there are no notes", () => {
		const result = normalizeDocument({ [KNOWN_SLUG]: { status: "bogus-status", modifiedAt: "2026-09-15T09:00:00.000Z" } });
		expect(result.entries[KNOWN_SLUG]).toBeUndefined();
	});

	it("keeps an open entry with notes, but omits the status field", () => {
		const result = normalizeDocument({ [KNOWN_SLUG]: { status: "open", notes: "called them once", modifiedAt: "2026-09-15T09:00:00.000Z" } });
		expect(result.entries[KNOWN_SLUG]).toEqual({ notes: "called them once", modifiedAt: "2026-09-15T09:00:00.000Z" });
	});

	it("truncates notes longer than the max length", () => {
		const longNotes = "x".repeat(MAX_NOTES_LENGTH + 50);
		const result = normalizeDocument({ [KNOWN_SLUG]: { status: "requested", notes: longNotes, modifiedAt: "2026-09-15T09:00:00.000Z" } });
		expect(result.entries[KNOWN_SLUG].notes).toHaveLength(MAX_NOTES_LENGTH);
	});
});
