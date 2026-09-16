<script setup>
import { computed } from "vue";
import listData from "../entries.json";

const props = defineProps({ symbol: { type: String, required: true } });

const meaning = computed(() => listData.symbolMeanings[props.symbol] ?? props.symbol);
</script>

<template>
	<span class="symbol" role="img" :title="meaning" :aria-label="meaning">{{ symbol }}</span>
</template>

<style scoped>
.symbol {
	cursor: help;
	font-size: 0.9em;
	line-height: 1;
}
</style>
