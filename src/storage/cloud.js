import { normalizeDocument } from "./schema.js";
import { mergeDocuments } from "./merge.js";
import { saveLocalProgress } from "./local.js";

const API_URL = "/api/progress";
const SYNC_INTERVAL_MS = 2 * 60 * 1000;
const MAX_BODY_BYTES = 60 * 1024;

let dirty = false;
let syncing = false;
let baseVersion = 0;
let onStatus = () => {};
let getLocalDocument = () => null;
let applyDocument = () => {};

export function initCloudSync({ onStatus: statusHandler, getLocalDocument: getDoc, applyDocument: setDoc }) {
	onStatus = statusHandler ?? onStatus;
	getLocalDocument = getDoc ?? getLocalDocument;
	applyDocument = setDoc ?? applyDocument;
}

export function markDirty() {
	dirty = true;
	onStatus("Changes pending");
}

export async function pullAndMerge() {
	try {
		const response = await fetch(API_URL);
		if (response.status === 401) return;
		if (!response.ok) throw new Error(`${response.status}`);
		const { version, data } = await response.json();
		baseVersion = version ?? 0;
		if (!data) {
			onStatus("Synced just now");
			return;
		}
		const remote = normalizeDocument(JSON.parse(data));
		const local = getLocalDocument();
		const merged = mergeDocuments(local, remote);
		applyDocument(merged);
		saveLocalProgress(merged);
		if (JSON.stringify(merged) !== JSON.stringify(remote)) markDirty();
		else onStatus("Synced just now");
	} catch (error) {
		onStatus(`Sync unavailable (${error.message})`);
	}
}

export async function pushIfDirty({ retry = true } = {}) {
	if (!dirty || syncing) return;
	syncing = true;
	try {
		const localDocument = getLocalDocument();
		const body = JSON.stringify({ baseVersion, data: JSON.stringify(localDocument) });
		if (body.length > MAX_BODY_BYTES) {
			onStatus("Sync paused (progress data too large)");
			return;
		}

		const response = await fetch(API_URL, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body,
			keepalive: true,
		});

		if (response.status === 409) {
			const { version, data } = await response.json();
			baseVersion = version;
			const remote = normalizeDocument(JSON.parse(data));
			const merged = mergeDocuments(localDocument, remote);
			applyDocument(merged);
			saveLocalProgress(merged);
			syncing = false;
			if (retry) return pushIfDirty({ retry: false });
			return;
		}
		if (response.status === 429) {
			const retryAfter = response.headers.get("Retry-After");
			onStatus(`Sync paused (rate limited${retryAfter ? `, retry in ${retryAfter}s` : ""})`);
			return;
		}
		if (!response.ok) throw new Error(`${response.status}`);

		const result = await response.json();
		baseVersion = result.version;
		dirty = false;
		onStatus("Synced just now");
	} catch {
		// Network error: local copy is safe, next session (or the periodic timer) retries.
		onStatus("Changes pending (will retry)");
	} finally {
		syncing = false;
	}
}

export function startAutoSync() {
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") pushIfDirty();
	});
	setInterval(() => pushIfDirty(), SYNC_INTERVAL_MS);
}
