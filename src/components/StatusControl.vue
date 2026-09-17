<script setup>
import { STATUSES } from "../storage/schema.js";
import { STATUS_LABELS } from "../composables/useProgress.js";

defineProps({
	modelValue: { type: String, required: true },
	entryId: { type: String, required: true },
	entryName: { type: String, required: true },
});

defineEmits(["update:modelValue"]);
</script>

<template>
	<fieldset class="status-control">
		<legend class="visually-hidden">Status for {{ entryName }}</legend>
		<!-- Real radios (arrow-key navigation, single-choice semantics) restyled
		     as a segmented control with full-size touch targets. -->
		<label v-for="status in STATUSES" :key="status" class="segment" :data-status="status">
			<input
				type="radio"
				:name="`status-${entryId}`"
				:value="status"
				:checked="modelValue === status"
				@change="$emit('update:modelValue', status)"
			>
			<span>{{ STATUS_LABELS[status] }}</span>
		</label>
	</fieldset>
</template>

<style scoped>
.status-control {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 0.25rem;
	border: 0;
	padding: 0;
	margin: 0;
}

.segment input {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}

.segment span {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: var(--tap-min);
	padding: 0 0.4em;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	font-size: var(--font-sm);
	line-height: 1.2;
	text-align: center;
	color: var(--text);
	cursor: pointer;
	transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.segment span:hover {
	border-color: var(--border-strong);
	color: var(--text-strong);
}

.segment input:focus-visible ~ span {
	outline: var(--focus-ring);
	outline-offset: var(--focus-offset);
}

.segment input:checked ~ span {
	color: var(--text-on-fill);
	font-weight: bold;
	border-color: transparent;
}

.segment[data-status="open"] input:checked ~ span { background: var(--status-open); }
.segment[data-status="requested"] input:checked ~ span { background: var(--status-requested); }
.segment[data-status="removed"] input:checked ~ span { background: var(--status-removed); }
.segment[data-status="not-present"] input:checked ~ span { background: var(--status-not-present); }

/* 30em = 480px; media-query em is always 16px-relative. */
@media (max-width: 30em) {
	.status-control {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
