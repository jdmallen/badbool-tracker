<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { exportDocument, readImportFile, applyImport } from "../importExport.js";
import { createEmptyDocument } from "../storage/schema.js";
import { replaceDocument, setSaveStatus, useProgress } from "../composables/useProgress.js";
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
						<a href="/privacy.html">Delete my cloud data</a>
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
	width: 44px;
	height: 44px;
	font-size: 1.4em;
	line-height: 1;
	color: #999;
	background: none;
	border: 1px solid #2c2c2c;
	border-radius: 8px;
	cursor: pointer;
}

.trigger:hover {
	color: #ddd;
	border-color: #555;
}

.panel {
	position: absolute;
	top: calc(100% + 6px);
	right: 0;
	z-index: 20;
	/* Column-aware, not viewport-aware: body is capped at 720px with 16px
	   gutters, so the panel can never hang outside the content column. rem
	   rather than em, because mobile font-boosting inflates em here. */
	width: min(20rem, calc(min(100vw, 720px) - 32px));
	padding: 0.9em 1em;
	background: #0d0d0d;
	border: 1px solid #333;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgb(0 0 0 / 60%);
}

section + section {
	margin-top: 1em;
	padding-top: 1em;
	border-top: 1px solid #222;
}

h2 {
	margin: 0 0 0.5em;
	font-size: 0.7em;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: #777;
}

.line {
	margin: 0 0 0.5em;
	font-size: 0.85em;
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
	min-height: 36px;
	padding: 0;
	font: inherit;
	font-size: 0.85em;
	color: #f9ba52;
	text-align: left;
	background: none;
	border: 0;
	cursor: pointer;
}

.actions .danger {
	color: #e0736f;
}

.file-label input {
	display: none;
}

.status {
	margin: 0.5em 0 0;
	font-size: 0.75em;
	color: #777;
}

/* Narrow screens: a sheet spanning the full content column, anchored to the
   title row (.settings goes static) instead of to the 44px trigger, so both
   edges line up with the page gutters. */
@media (max-width: 560px) {
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
