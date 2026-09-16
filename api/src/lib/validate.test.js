import { describe, expect, it } from "vitest";
import { validateProgressPayload } from "./validate.js";
import sites from "../sites.json";

const SLUG = sites[0];
const validDocument = { schemaVersion: 1, entries: { [SLUG]: { status: "requested", modifiedAt: "2026-09-15T00:00:00.000Z", statusChangedAt: "2026-09-15T00:00:00.000Z" } } };

describe("validateProgressPayload", () => {
	it("accepts a valid payload", () => {
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(validDocument) })).toBeNull();
	});

	it("rejects a non-object body", () => {
		expect(validateProgressPayload(null)).toMatch(/JSON object/);
		expect(validateProgressPayload("nope")).toMatch(/JSON object/);
	});

	it("rejects a missing or negative baseVersion", () => {
		expect(validateProgressPayload({ data: "{}" })).toMatch(/baseVersion/);
		expect(validateProgressPayload({ baseVersion: -1, data: "{}" })).toMatch(/baseVersion/);
	});

	it("rejects an oversized body", () => {
		const big = { schemaVersion: 1, entries: { [SLUG]: { notes: "x".repeat(70 * 1024), modifiedAt: "2026-09-15T00:00:00.000Z" } } };
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(big) })).toMatch(/60 KB/);
	});

	it("rejects data that isn't valid JSON", () => {
		expect(validateProgressPayload({ baseVersion: 0, data: "{not json" })).toMatch(/not valid JSON/);
	});

	it("rejects the wrong schema version", () => {
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify({ schemaVersion: 2, entries: {} }) })).toMatch(/schemaVersion/);
	});

	it("rejects an unknown slug", () => {
		const document = { schemaVersion: 1, entries: { "not-a-real-site": { modifiedAt: "2026-09-15T00:00:00.000Z" } } };
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(document) })).toMatch(/unknown site/);
	});

	it("rejects an invalid status enum value", () => {
		const document = { schemaVersion: 1, entries: { [SLUG]: { status: "bogus", modifiedAt: "2026-09-15T00:00:00.000Z" } } };
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(document) })).toMatch(/invalid status/);
	});

	it("rejects notes over the length cap", () => {
		const document = { schemaVersion: 1, entries: { [SLUG]: { notes: "x".repeat(1001), modifiedAt: "2026-09-15T00:00:00.000Z" } } };
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(document) })).toMatch(/invalid notes/);
	});

	it("rejects a missing or malformed modifiedAt", () => {
		const document = { schemaVersion: 1, entries: { [SLUG]: { status: "requested" } } };
		expect(validateProgressPayload({ baseVersion: 0, data: JSON.stringify(document) })).toMatch(/modifiedAt/);
	});
});
