<script setup>
import { computed } from "vue";
import { STATUSES } from "../storage/schema.js";
import { STATUS_LABELS, statusCounts, doneCount, donePercent, totalCount } from "../composables/useProgress.js";

// Finished work first so the bar fills left-to-right as you make progress.
const SEGMENT_ORDER = ["removed", "not-present", "requested", "open"];

const segments = computed(() =>
	SEGMENT_ORDER.map((status) => ({
		status,
		count: statusCounts.value[status],
		percent: (statusCounts.value[status] / totalCount) * 100,
	})).filter((segment) => segment.count > 0),
);

const barLabel = computed(() =>
	STATUSES.map((status) => `${statusCounts.value[status]} ${STATUS_LABELS[status].toLowerCase()}`).join(", "),
);
</script>

<template>
	<div class="progress-wrap">
		<div class="bar" role="img" :aria-label="`Progress: ${barLabel}`">
			<div
				v-for="segment in segments"
				:key="segment.status"
				class="segment"
				:data-status="segment.status"
				:style="{ width: `${segment.percent}%` }"
			></div>
		</div>
		<p class="readout" aria-live="polite">
			<strong>{{ doneCount }} of {{ totalCount }}</strong> done — {{ donePercent }}%
			<span class="breakdown">
				<span v-for="segment in segments" :key="segment.status" class="tally" :data-status="segment.status">
					{{ segment.count }} {{ STATUS_LABELS[segment.status].toLowerCase() }}
				</span>
			</span>
		</p>
	</div>
</template>

<style scoped>
.progress-wrap {
	display: flex;
	flex-direction: column;
	gap: 0.3em;
}

.bar {
	display: flex;
	width: 100%;
	height: 0.5rem;
	border-radius: var(--radius-xs);
	overflow: hidden;
	background: var(--surface-sunken);
}

.segment {
	height: 100%;
	transition: width var(--transition-slow);
}

.segment[data-status="removed"] { background: var(--status-removed); }
.segment[data-status="not-present"] { background: var(--status-not-present); }
.segment[data-status="requested"] { background: var(--status-requested); }
.segment[data-status="open"] { background: var(--status-open-soft); }

.readout {
	margin: 0;
	font-size: var(--font-xs);
	color: var(--text-muted);
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.2em 0.8em;
}

.readout strong {
	color: var(--text-strong);
}

.breakdown {
	display: flex;
	flex-wrap: wrap;
	gap: 0.2em 0.8em;
}

.tally::before {
	content: "";
	display: inline-block;
	width: 0.55em;
	height: 0.55em;
	border-radius: 50%;
	margin-right: 0.35em;
	vertical-align: baseline;
}

.tally[data-status="removed"]::before { background: var(--status-removed); }
.tally[data-status="not-present"]::before { background: var(--status-not-present); }
.tally[data-status="requested"]::before { background: var(--status-requested); }
.tally[data-status="open"]::before { background: var(--text-faint); }
</style>
