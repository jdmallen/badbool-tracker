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
	color: var(--text-strong);
}

.intro {
	margin: 0.5em 0 1em;
	font-size: var(--font-md);
	color: var(--text-muted);
}

/* Sticky so the progress bar and search stay reachable down a 48-item list */
.toolbar {
	display: block;
	position: sticky;
	top: 0;
	z-index: var(--z-toolbar);
	padding: 0.6em 0 0.5em;
	background: var(--surface);
	border-bottom: 1px solid var(--border-subtle);
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
	min-height: var(--control-h);
	padding: 0 0.7em;
	font: inherit;
	font-size: var(--font-md);
	color: inherit;
	background: var(--surface-raised);
	border: 1px solid var(--border);
	border-radius: var(--radius);
}

.sort-field select {
	min-height: var(--control-h);
	max-width: 10em;
	padding: 0 0.5em;
	font: inherit;
	font-size: var(--font-sm);
	color: var(--text);
	background: var(--surface-raised);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	cursor: pointer;
}

.filter-toggle {
	display: flex;
	align-items: center;
	gap: 0.4em;
	flex: none;
	min-height: var(--control-h);
	padding: 0 0.8em;
	font: inherit;
	font-size: var(--font-sm);
	color: var(--text);
	background: var(--surface-raised);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	cursor: pointer;
}

.filter-toggle.active {
	color: var(--accent);
	border-color: var(--accent-dim);
}

.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.4em;
	height: 1.4em;
	font-size: var(--font-xs);
	color: var(--text-on-fill);
	background: var(--accent);
	border-radius: var(--radius-pill);
}

main {
	padding-top: 0.5em;
}

main:focus {
	outline: none;
}

.result-count {
	margin: 0 0 0.5em;
	font-size: var(--font-micro);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-dim);
}

.empty {
	padding: 2em 0;
	color: var(--text-dim);
	text-align: center;
}

/* em in a media query is always 16px-relative, unaffected by the root
   font-size, which is what makes it the portable choice here. 30em = 480px. */
@media (max-width: 30em) {
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
