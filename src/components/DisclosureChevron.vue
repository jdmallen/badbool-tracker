<template>
	<!-- SVG, not a ▸ glyph: the triangle is symmetric about the viewBox centre,
	     so rotate(90deg) pivots exactly. Glyph ink is off-centre by a
	     font-specific amount, and this app declares no font-family.
	     Colour and the rotate(90deg) open state come from the caller. -->
	<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
		<path d="M5.5 4 L10.5 8 L5.5 12 Z" fill="currentColor" />
	</svg>
</template>

<style scoped>
.chevron {
	flex: none;
	width: 1em;
	height: 1em;
	transform-origin: 50% 50%;
	transition: transform var(--transition);
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
