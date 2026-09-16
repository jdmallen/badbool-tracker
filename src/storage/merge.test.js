import { describe, expect, it } from "vitest";
import { mergeDocuments } from "./merge.js";
import { createEmptyDocument } from "./schema.js";

function doc(entries) {
	return { ...createEmptyDocument(), entries };
}

describe("mergeDocuments", () => {
	it("newest modifiedAt wins", () => {
		const local = doc({ a: { status: "requested", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		const remote = doc({ a: { status: "removed", modifiedAt: "2026-09-15T00:00:00.000Z" } });
		expect(mergeDocuments(local, remote).entries.a).toEqual(remote.entries.a);
	});

	it("ties favor remote", () => {
		const local = doc({ a: { status: "requested", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		const remote = doc({ a: { status: "removed", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		expect(mergeDocuments(local, remote).entries.a).toEqual(remote.entries.a);
	});

	it("keeps entries missing from one side", () => {
		const local = doc({ a: { notes: "local only", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		const remote = doc({ b: { notes: "remote only", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		const merged = mergeDocuments(local, remote);
		expect(merged.entries.a).toEqual(local.entries.a);
		expect(merged.entries.b).toEqual(remote.entries.b);
	});

	it("handles missing local or remote documents", () => {
		const remote = doc({ a: { notes: "x", modifiedAt: "2026-09-14T00:00:00.000Z" } });
		expect(mergeDocuments(null, remote).entries).toEqual(remote.entries);
		expect(mergeDocuments(remote, null).entries).toEqual(remote.entries);
	});
});
