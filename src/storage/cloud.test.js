import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDocument } from "./schema.js";
import { deleteCloudData, initCloudSync, markDirty, pushIfDirty } from "./cloud.js";

const okResponse = { ok: true, status: 204 };

describe("deleteCloudData", () => {
	let reportedStatuses;

	beforeEach(() => {
		reportedStatuses = [];
		initCloudSync({
			onStatus: (text) => reportedStatuses.push(text),
			getLocalDocument: () => createEmptyDocument(),
			applyDocument: () => {},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends a DELETE and reports success", async () => {
		const fetchMock = vi.fn().mockResolvedValue(okResponse);
		vi.stubGlobal("fetch", fetchMock);

		await expect(deleteCloudData()).resolves.toBe(true);
		expect(fetchMock).toHaveBeenCalledWith("/api/progress", { method: "DELETE" });
		expect(reportedStatuses.at(-1)).toBe("Cloud data deleted");
	});

	// The row coming straight back is the failure mode worth guarding: signing
	// out fires visibilitychange, and pushIfDirty sends with keepalive: true.
	it("clears the dirty flag so a pending push cannot resurrect the row", async () => {
		markDirty();
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse));
		await deleteCloudData();

		const pushMock = vi.fn();
		vi.stubGlobal("fetch", pushMock);
		await pushIfDirty();
		expect(pushMock).not.toHaveBeenCalled();
	});

	it("reports the status code and leaves the document dirty on failure", async () => {
		markDirty();
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

		await expect(deleteCloudData()).resolves.toBe(false);
		expect(reportedStatuses.at(-1)).toBe("Delete failed (500)");

		// Still dirty, so the next push goes out rather than silently dropping work.
		const pushMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ version: 1 }) });
		vi.stubGlobal("fetch", pushMock);
		await pushIfDirty();
		expect(pushMock).toHaveBeenCalled();
	});
});
