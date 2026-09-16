<script setup>
import { computed, onMounted, ref } from "vue";
import ProgressBar from "./components/ProgressBar.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SettingsMenu from "./components/SettingsMenu.vue";
import EntryCard from "./components/EntryCard.vue";
import { SORT_MODES, useListView } from "./composables/useListView.js";
import { loadFromLocalStorage, replaceDocument, totalCount, useProgress } from "./composables/useProgress.js";
import { initCloudSync, pullAndMerge, pushIfDirty, startAutoSync } from "./storage/cloud.js";
import { loadAuthState } from "./auth.js";

const { progressDocument } = useProgress();
const { searchQuery, sortMode, visibleEntries, activeFilterCount } = useListView();

const user = ref(null);
const syncStatus = ref("");
const filtersOpen = ref(false);

const resultLabel = computed(() =>
	visibleEntries.value.length === totalCount
		? `${totalCount} sites`
		: `${visibleEntries.value.length} of ${totalCount} sites`,
);

onMounted(async () => {
	loadFromLocalStorage();

	initCloudSync({
		onStatus: (text) => {
			syncStatus.value = text;
		},
		getLocalDocument: () => progressDocument.value,
		// cloud.js already writes the merge to localStorage
		applyDocument: (merged) => replaceDocument(merged, { save: false }),
	});

	user.value = await loadAuthState();
	if (user.value) {
		await pullAndMerge();
		startAutoSync();
	}
});
</script>

<template>
	<a class="skip-link" href="#entry-list">Skip to site list</a>

	<header class="page-header">
		<div class="title-row">
			<h1>BADBOOL Tracker</h1>
			<SettingsMenu :user="user" :sync-status="syncStatus" @sync-now="pushIfDirty" />
		</div>
		<p class="intro">
			Progress through the
			<a href="https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List" target="_blank" rel="noopener noreferrer">Big Ass Data Broker Opt-Out List</a>
			(people search sites, in priority order).
		</p>
	</header>

	<!-- role="search" rather than <search>: same landmark, and Vue's compiler
	     does not yet treat <search> as a native tag. -->
	<section class="toolbar" role="search" aria-label="Search and filter sites">
		<ProgressBar />

		<div class="controls">
			<label class="search-field">
				<span class="visually-hidden">Search sites by name</span>
				<input v-model="searchQuery" type="search" placeholder="Search sites…" autocomplete="off">
			</label>

			<label class="sort-field">
				<span class="visually-hidden">Sort order</span>
				<select v-model="sortMode">
					<option v-for="mode in SORT_MODES" :key="mode.value" :value="mode.value">{{ mode.label }}</option>
				</select>
			</label>

			<button
				type="button"
				class="filter-toggle"
				:class="{ active: activeFilterCount > 0 }"
				:aria-expanded="filtersOpen"
				aria-controls="filter-panel"
				@click="filtersOpen = !filtersOpen"
			>
				Filters<span v-if="activeFilterCount" class="badge">{{ activeFilterCount }}</span>
			</button>
		</div>

		<FilterPanel v-show="filtersOpen" id="filter-panel" />
	</section>

	<main id="entry-list" tabindex="-1">
		<p class="result-count" aria-live="polite">{{ resultLabel }}</p>
		<EntryCard v-for="entry in visibleEntries" :key="entry.id" :entry="entry" />
		<p v-if="!visibleEntries.length" class="empty">No sites match the current search and filters.</p>
	</main>

	<footer>
		<p>
			Site list from <a href="https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List" target="_blank" rel="noopener noreferrer">BADBOOL</a>,
			used under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a>.
			Style inspired by <a href="http://motherfuckingwebsite.com/" target="_blank" rel="noopener noreferrer">motherfuckingwebsite.com</a>
			and <a href="https://bettermotherfuckingwebsite.com/" target="_blank" rel="noopener noreferrer">bettermotherfuckingwebsite.com</a>.
			<a href="/privacy.html">Privacy</a>.
		</p>
	</footer>
</template>

<style scoped>
.page-header {
	padding-top: 1.5em;
}

.title-row {
	/* Containing block for the settings panel once .settings goes static on
	   narrow screens, so the panel spans the content column. */
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1em;
}

h1 {
	margin: 0;
	font-size: 1.6em;
	line-height: 1.2;
	color: #ddd;
}

.intro {
	margin: 0.5em 0 1em;
	font-size: 0.9em;
	color: #999;
}

/* Sticky so the progress bar and search stay reachable down a 48-item list */
.toolbar {
	display: block;
	position: sticky;
	top: 0;
	z-index: 10;
	padding: 0.6em 0 0.5em;
	background: #000;
	border-bottom: 1px solid #1c1c1c;
}

.controls {
	display: flex;
	gap: 0.5em;
	margin-top: 0.6em;
}

.search-field {
	flex: 1 1 auto;
	min-width: 0;
}

.search-field input {
	width: 100%;
	box-sizing: border-box;
	min-height: 40px;
	padding: 0 0.7em;
	font: inherit;
	font-size: 0.9em;
	color: inherit;
	background: #0d0d0d;
	border: 1px solid #2c2c2c;
	border-radius: 8px;
}

.sort-field select {
	min-height: 40px;
	max-width: 10em;
	padding: 0 0.5em;
	font: inherit;
	font-size: 0.85em;
	color: #bbb;
	background: #0d0d0d;
	border: 1px solid #2c2c2c;
	border-radius: 8px;
	cursor: pointer;
}

.filter-toggle {
	display: flex;
	align-items: center;
	gap: 0.4em;
	flex: none;
	min-height: 40px;
	padding: 0 0.8em;
	font: inherit;
	font-size: 0.85em;
	color: #bbb;
	background: #0d0d0d;
	border: 1px solid #2c2c2c;
	border-radius: 8px;
	cursor: pointer;
}

.filter-toggle.active {
	color: #f9ba52;
	border-color: #6b4f20;
}

.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.4em;
	height: 1.4em;
	font-size: 0.8em;
	color: #000;
	background: #f9ba52;
	border-radius: 999px;
}

main {
	padding-top: 0.5em;
}

main:focus {
	outline: none;
}

.result-count {
	margin: 0 0 0.5em;
	font-size: 0.75em;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #666;
}

.empty {
	padding: 2em 0;
	color: #777;
	text-align: center;
}

@media (max-width: 480px) {
	.controls {
		flex-wrap: wrap;
	}

	.search-field {
		flex-basis: 100%;
	}

	.sort-field {
		flex: 1 1 auto;
	}

	.sort-field select {
		width: 100%;
		max-width: none;
	}
}
</style>
