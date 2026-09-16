import { normalizeDocument } from "./storage/schema.js";
import { mergeDocuments } from "./storage/merge.js";

const MAX_IMPORT_BYTES = 200 * 1024;

export function exportDocument(progressDocument) {
	const blob = new Blob([JSON.stringify(progressDocument, null, "\t")], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `badbool-progress-${new Date().toISOString().slice(0, 10)}.json`;
	link.click();
	URL.revokeObjectURL(url);
}

export async function readImportFile(file) {
	if (file.size > MAX_IMPORT_BYTES) throw new Error("File is too large (max 200 KB)");
	const parsed = JSON.parse(await file.text());
	const rawCount = Object.keys(parsed?.entries ?? parsed ?? {}).length;
	const normalized = normalizeDocument(parsed);
	const importedCount = Object.keys(normalized.entries).length;
	return { normalized, importedCount, skippedCount: Math.max(0, rawCount - importedCount) };
}

export function applyImport(existing, incoming, mode) {
	return mode === "merge" ? mergeDocuments(existing, incoming) : incoming;
}
