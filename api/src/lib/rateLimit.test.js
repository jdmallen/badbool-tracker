import { describe, expect, it } from "vitest";
import { checkWriteAllowed } from "./rateLimit.js";

describe("checkWriteAllowed", () => {
	it("allows the first write for a fresh entity", () => {
		const result = checkWriteAllowed(null, new Date("2026-09-15T00:00:00.000Z"));
		expect(result.allowed).toBe(true);
		expect(result.nextCounters.windowCount).toBe(1);
		expect(result.nextCounters.dayCount).toBe(1);
	});

	it("rejects the 31st write within the rolling hour", () => {
		const entity = { windowStart: "2026-09-15T00:00:00.000Z", windowCount: 30, dayStart: "2026-09-15T00:00:00.000Z", dayCount: 30 };
		const result = checkWriteAllowed(entity, new Date("2026-09-15T00:30:00.000Z"));
		expect(result.allowed).toBe(false);
		expect(result.retryAfterSeconds).toBeGreaterThan(0);
	});

	it("resets the window after it rolls over", () => {
		const entity = { windowStart: "2026-09-15T00:00:00.000Z", windowCount: 30, dayStart: "2026-09-15T00:00:00.000Z", dayCount: 30 };
		const result = checkWriteAllowed(entity, new Date("2026-09-15T01:00:01.000Z"));
		expect(result.allowed).toBe(true);
		expect(result.nextCounters.windowCount).toBe(1);
		expect(result.nextCounters.dayCount).toBe(31);
	});

	it("rejects the 201st write in a UTC day even with window room", () => {
		const entity = { windowStart: "2026-09-15T10:00:00.000Z", windowCount: 5, dayStart: "2026-09-15T00:00:00.000Z", dayCount: 200 };
		const result = checkWriteAllowed(entity, new Date("2026-09-15T10:05:00.000Z"));
		expect(result.allowed).toBe(false);
	});

	it("resets the daily counter at UTC midnight", () => {
		const entity = { windowStart: "2026-09-15T23:00:00.000Z", windowCount: 5, dayStart: "2026-09-15T00:00:00.000Z", dayCount: 200 };
		const result = checkWriteAllowed(entity, new Date("2026-09-16T00:00:01.000Z"));
		expect(result.allowed).toBe(true);
		expect(result.nextCounters.dayCount).toBe(1);
	});
});
