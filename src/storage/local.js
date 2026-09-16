const STORAGE_KEY = "badbool-tracker:progress:v1";

export function loadLocalProgress() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function saveLocalProgress(progressDocument) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(progressDocument));
		return true;
	} catch {
		return false;
	}
}
