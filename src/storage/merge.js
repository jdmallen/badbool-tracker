import { createEmptyDocument } from "./schema.js";

// Per-site newest `modifiedAt` wins; ties favor remote (so a device that
// merges its own unchanged copy back in doesn't stomp a same-instant edit).
export function mergeDocuments(local, remote) {
	const merged = createEmptyDocument();
	const localEntries = local?.entries ?? {};
	const remoteEntries = remote?.entries ?? {};
	const slugs = new Set([...Object.keys(localEntries), ...Object.keys(remoteEntries)]);

	for (const slug of slugs) {
		const localEntry = localEntries[slug];
		const remoteEntry = remoteEntries[slug];
		if (!remoteEntry) merged.entries[slug] = localEntry;
		else if (!localEntry) merged.entries[slug] = remoteEntry;
		else merged.entries[slug] = (localEntry.modifiedAt ?? "") > (remoteEntry.modifiedAt ?? "") ? localEntry : remoteEntry;
	}
	return merged;
}
