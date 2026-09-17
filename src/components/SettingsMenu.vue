<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { exportDocument, readImportFile, applyImport } from "../importExport.js";
import { createEmptyDocument } from "../storage/schema.js";
import { replaceDocument, setSaveStatus, useProgress } from "../composables/useProgress.js";
import { deleteCloudData } from "../storage/cloud.js";
import { signInUrl, signOutUrl } from "../auth.js";

defineProps({
	user: { type: Object, default: null },
	syncStatus: { type: String, default: "" },
});

const emit = defineEmits(["sync-now"]);

const { progressDocument, saveStatus } = useProgress();

const isOpen = ref(false);
const rootElement = ref(null);
const importInput = ref(null);

function closeOnOutsideClick(event) {
	if (isOpen.value && rootElement.value && !rootElement.value.contains(event.target)) isOpen.value = false;
}

function closeOnEscape(event) {
	if (event.key === "Escape") isOpen.value = false;
}

onMounted(() => {
	document.addEventListener("click", closeOnOutsideClick);
	document.addEventListener("keydown", closeOnEscape);
});

onBeforeUnmount(() => {
	document.removeEventListener("click", closeOnOutsideClick);
	document.removeEventListener("keydown", closeOnEscape);
});

async function handleImport() {
	const file = importInput.value?.files?.[0];
	if (importInput.value) importInput.value.value = "";
	if (!file) return;
	try {
		const { normalized, importedCount, skippedCount } = await readImportFile(file);
		const mergeChosen = confirm(
			`Import ${importedCount} site(s)${skippedCount ? `, skip ${skippedCount} invalid` : ""}.\n\n` +
				"OK = Merge with existing progress (newest change per site wins)\nCancel = Replace existing progress entirely",
		);
		replaceDocument(applyImport(progressDocument.value, normalized, mergeChosen ? "merge" : "replace"));
		setSaveStatus(`Imported ${importedCount} site(s)${skippedCount ? `, skipped ${skippedCount} invalid` : ""}.`);
	} catch (error) {
		setSaveStatus(`Import failed: ${error.message}`);
	}
}

// Signs out on success so auto-sync cannot repopulate the row from this tab.
// Stays signed in on failure, with the reason visible in the sync status line.
async function handleDeleteCloudData() {
	const confirmed = confirm(
		"Delete your cloud copy and sign out?\n\n" +
			"Your progress stays in this browser — only the synced copy is removed. " +
			"This can't be undone.",
	);
	if (!confirmed) return;
	if (await deleteCloudData()) window.location.assign(signOutUrl());
}

function handleClear() {
	if (!confirm("Clear all progress? This can't be undone unless you exported a backup.")) return;
	replaceDocument(createEmptyDocument());
	setSaveStatus("All progress cleared.");
}
</script>

<template>
	<div ref="rootElement" class="settings">
		<button
			type="button"
			class="trigger"
			:aria-expanded="isOpen"
			aria-controls="settings-panel"
			aria-label="Settings, data and sync"
			@click="isOpen = !isOpen"
		>
			<span aria-hidden="true">⋯</span>
		</button>

		<div v-if="isOpen" id="settings-panel" class="panel">
			<section>
				<h2>Sync</h2>
				<template v-if="user">
					<p class="line">Syncing as <strong>{{ user.username }}</strong></p>
					<div class="actions">
						<button type="button" @click="emit('sync-now')">Sync now</button>
						<a :href="signOutUrl()">Sign out</a>
						<button type="button" class="danger" @click="handleDeleteCloudData">Delete my cloud data</button>
					</div>
				</template>
				<p v-else class="line">
					<a :href="signInUrl()">Sign in with GitHub</a> to sync across devices.
				</p>
				<p v-if="syncStatus" class="status" role="status">{{ syncStatus }}</p>
			</section>

			<section>
				<h2>Data</h2>
				<div class="actions">
					<button type="button" @click="exportDocument(progressDocument)">Export JSON</button>
					<label class="file-label">
						Import JSON
						<input ref="importInput" type="file" accept="application/json" @change="handleImport">
					</label>
					<button type="button" class="danger" @click="handleClear">Clear all progress</button>
				</div>
				<p v-if="saveStatus" class="status" role="status">{{ saveStatus }}</p>
			</section>
		</div>
	</div>
</template>

<style scoped>
.settings {
	position: relative;
	flex: none;
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--tap-min);
	height: var(--tap-min);
	font-size: 1.4em;
	line-height: 1;
	color: var(--text-muted);
	background: none;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	cursor: pointer;
}

.trigger:hover {
	color: var(--text-strong);
	border-color: var(--border-strong);
}

.panel {
	position: absolute;
	top: calc(100% + 0.375rem);
	right: 0;
	z-index: var(--z-menu);
	/* Column-aware, not viewport-aware: the panel is derived from the same
	   tokens the body uses, so it can never hang outside the content column.
	   rem rather than em, because mobile font-boosting inflates em here. */
	width: min(20rem, calc(min(100vw, var(--content-max)) - var(--page-gutter) * 2));
	padding: 0.9em 1em;
	background: var(--surface-raised);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	box-shadow: var(--shadow-panel);
}

section + section {
	margin-top: 1em;
	padding-top: 1em;
	border-top: 1px solid var(--border-subtle);
}

h2 {
	margin: 0 0 0.5em;
	font-size: var(--font-micro);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-dim);
}

.line {
	margin: 0 0 0.5em;
	font-size: var(--font-sm);
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.15em;
}

.actions button,
.actions a,
.file-label {
	display: flex;
	align-items: center;
	min-height: var(--control-h-sm);
	padding: 0;
	font: inherit;
	font-size: var(--font-sm);
	color: var(--accent);
	text-align: left;
	background: none;
	border: 0;
	cursor: pointer;
}

.actions .danger {
	color: var(--danger);
}

.file-label input {
	display: none;
}

.status {
	margin: 0.5em 0 0;
	font-size: var(--font-micro);
	color: var(--text-dim);
}

/* Narrow screens: a sheet spanning the full content column, anchored to the
   title row (.settings goes static) instead of to the trigger button, so both
   edges line up with the page gutters. 35em = 560px. */
@media (max-width: 35em) {
	.settings {
		position: static;
	}

	.panel {
		left: 0;
		right: 0;
		width: auto;
	}
}
</style>
