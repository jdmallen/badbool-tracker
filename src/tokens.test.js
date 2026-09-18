// @vitest-environment node
// This suite only reads files; under happy-dom import.meta.url is not a
// file: URL, so fileURLToPath below would throw.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL(".", import.meta.url));
const TOKEN_FILE = "tokens.css";

/* px values that are not measurements and so have no token:
   1/2 — hairline borders and focus outlines, which should not scale
   999  — "round the ends" sentinel for pill radii
   9999 — parks the skip link off-screen until it is focused */
const ALLOWED_PX = new Set([1, 2, 999, 9999]);

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|color)\s*\(/g;
const PX_VALUE = /(-?\d*\.?\d+)px/g;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;

function collectSourceFiles(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
		const path = join(directory, item.name);
		if (item.isDirectory()) return collectSourceFiles(path);
		if (item.name === TOKEN_FILE) return [];
		return /\.(?:vue|css)$/.test(item.name) ? [path] : [];
	});
}

/* Only the CSS is checked: a hex string in a <script> block or a template is
   data, not styling. Comments are stripped so that a comment documenting the
   px value a token replaced does not trip the check. */
function styleTextOf(path) {
	const source = readFileSync(path, "utf8");
	const css = path.endsWith(".vue")
		? Array.from(source.matchAll(STYLE_BLOCK), (match) => match[1]).join("\n")
		: source;
	return css.replace(CSS_COMMENT, "");
}

const styleSheets = collectSourceFiles(sourceRoot).map((path) => ({
	name: path.slice(sourceRoot.length),
	css: styleTextOf(path),
}));

describe("design tokens", () => {
	it("finds stylesheets to check", () => {
		expect(styleSheets.filter((sheet) => sheet.css.trim())).not.toHaveLength(0);
	});

	it.each(styleSheets)("$name declares no literal color", ({ css }) => {
		expect(css.match(HEX_COLOR) ?? []).toEqual([]);
		expect(css.match(COLOR_FUNCTION) ?? []).toEqual([]);
	});

	it.each(styleSheets)("$name uses px only for hairlines and sentinels", ({ css }) => {
		const offenders = Array.from(css.matchAll(PX_VALUE), (match) => match[0]).filter(
			(value) => !ALLOWED_PX.has(Math.abs(Number.parseFloat(value))),
		);
		expect(offenders).toEqual([]);
	});

	it("defines every custom property the stylesheets reference", () => {
		const tokensCss = readFileSync(join(sourceRoot, TOKEN_FILE), "utf8");
		const defined = new Set(Array.from(tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm), (match) => match[1]));

		const referenced = new Set(
			styleSheets.flatMap(({ css }) => Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1])),
		);

		expect([...referenced].filter((token) => !defined.has(token))).toEqual([]);
	});
});
