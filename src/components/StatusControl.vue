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
	gap: 4px;
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
	min-height: 44px;
	padding: 0 0.4em;
	border: 1px solid #333;
	border-radius: 6px;
	font-size: 0.85em;
	line-height: 1.2;
	text-align: center;
	color: #aaa;
	cursor: pointer;
	transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.segment span:hover {
	border-color: #555;
	color: #ddd;
}

.segment input:focus-visible ~ span {
	outline: 2px solid #f9ba52;
	outline-offset: 2px;
}

.segment input:checked ~ span {
	color: #000;
	font-weight: bold;
	border-color: transparent;
}

.segment[data-status="open"] input:checked ~ span { background: #999; }
.segment[data-status="requested"] input:checked ~ span { background: var(--status-requested); }
.segment[data-status="removed"] input:checked ~ span { background: var(--status-removed); }
.segment[data-status="not-present"] input:checked ~ span { background: var(--status-not-present); }

@media (max-width: 480px) {
	.status-control {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
