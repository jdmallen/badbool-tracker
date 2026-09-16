const WINDOW_MS = 60 * 60 * 1000;
const WINDOW_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LIMIT = 200;

function utcDayStart(date) {
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Pure function: given the entity's persisted rate-limit fields and the current
// time, decides whether a write is allowed and what the entity's counters
// should become. The caller persists `nextCounters` alongside the write.
export function checkWriteAllowed(entity, now = new Date()) {
	const nowMs = now.getTime();

	let windowStart = entity?.windowStart ? new Date(entity.windowStart).getTime() : nowMs;
	let windowCount = entity?.windowCount ?? 0;
	if (nowMs - windowStart >= WINDOW_MS) {
		windowStart = nowMs;
		windowCount = 0;
	}

	const today = utcDayStart(now);
	let dayStart = entity?.dayStart ? new Date(entity.dayStart).getTime() : today;
	let dayCount = entity?.dayCount ?? 0;
	if (dayStart !== today) {
		dayStart = today;
		dayCount = 0;
	}

	if (windowCount >= WINDOW_LIMIT) {
		return {
			allowed: false,
			retryAfterSeconds: Math.ceil((windowStart + WINDOW_MS - nowMs) / 1000),
			nextCounters: { windowStart, windowCount, dayStart, dayCount },
		};
	}
	if (dayCount >= DAY_LIMIT) {
		return {
			allowed: false,
			retryAfterSeconds: Math.ceil((dayStart + DAY_MS - nowMs) / 1000),
			nextCounters: { windowStart, windowCount, dayStart, dayCount },
		};
	}

	return {
		allowed: true,
		retryAfterSeconds: 0,
		nextCounters: { windowStart, windowCount: windowCount + 1, dayStart, dayCount: dayCount + 1 },
	};
}
