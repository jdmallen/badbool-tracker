<script setup>
import listData from "../entries.json";
import { STATUSES } from "../storage/schema.js";
import { STATUS_LABELS, statusCounts } from "../composables/useProgress.js";
import { useListView } from "../composables/useListView.js";

const { visibleStatuses, requiredSymbols, toggleStatusFilter, toggleSymbolFilter, clearFilters, activeFilterCount } = useListView();

const symbolEntries = Object.entries(listData.symbolMeanings);
</script>

<template>
	<div class="filter-panel">
		<fieldset>
			<legend>Show status</legend>
			<div class="chips">
				<label v-for="status in STATUSES" :key="status" class="chip" :data-status="status">
					<input type="checkbox" :checked="visibleStatuses.has(status)" @change="toggleStatusFilter(status)">
					<span>{{ STATUS_LABELS[status] }} <em>{{ statusCounts[status] }}</em></span>
				</label>
			</div>
		</fieldset>

		<fieldset>
			<legend>Only these flags</legend>
			<div class="chips">
				<label v-for="[symbol, meaning] in symbolEntries" :key="symbol" class="chip symbol-chip">
					<input type="checkbox" :checked="requiredSymbols.has(symbol)" @change="toggleSymbolFilter(symbol)">
					<span><span class="glyph" aria-hidden="true">{{ symbol }}</span> {{ meaning }}</span>
				</label>
			</div>
		</fieldset>

		<button v-if="activeFilterCount" type="button" class="clear" @click="clearFilters">Clear filters</button>
	</div>
</template>

<style scoped>
.filter-panel {
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	padding: 0.75em 0;
	border-top: 1px solid #1c1c1c;
}

fieldset {
	border: 0;
	padding: 0;
	margin: 0;
}

legend {
	padding: 0;
	font-size: 0.75em;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #777;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4em;
	margin-top: 0.4em;
}

.chip input {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}

.chip span {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	min-height: 36px;
	padding: 0 0.75em;
	font-size: 0.8em;
	color: #777;
	border: 1px solid #2c2c2c;
	border-radius: 999px;
	cursor: pointer;
	transition: border-color 0.12s ease, color 0.12s ease;
}

.chip span em {
	font-style: normal;
	color: #555;
}

.chip span:hover {
	border-color: #4a4a4a;
	color: #bbb;
}

.chip input:focus-visible ~ span {
	outline: 2px solid #f9ba52;
	outline-offset: 2px;
}

.chip input:checked ~ span {
	color: #ddd;
	border-color: #666;
	background: #161616;
}

.chip input:checked ~ span em { color: #999; }

.chip[data-status="requested"] input:checked ~ span { border-color: var(--status-requested); }
.chip[data-status="removed"] input:checked ~ span { border-color: var(--status-removed); }
.chip[data-status="not-present"] input:checked ~ span { border-color: var(--status-not-present); }

.symbol-chip .glyph {
	font-size: 1.1em;
	line-height: 1;
}

.clear {
	align-self: flex-start;
	padding: 0.3em 0;
	font: inherit;
	font-size: 0.8em;
	color: #f9ba52;
	background: none;
	border: 0;
	cursor: pointer;
}
</style>
