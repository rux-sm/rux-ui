import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { htmlPages } from "./pages.mjs";

/* Browser chrome follows the page ground.
 *
 * A `theme-color` meta paints the browser's own chrome, and the value it
 * should paint is the page ground: `--rux-surface-0`, which is
 * `background-200` per theme (docs/foundations/color.md rule 2.3). These tags
 * are hex literals in HTML, which none of the stylesheet gates in
 * docs/design-system-distribution.md §4 can see — all five tags had already
 * drifted from the surface when this was measured on 2026-08-25, and one pair
 * predated the step-4 migration entirely.
 *
 * The expected hex is DERIVED from tokens.css here, not restated: a Class B
 * amendment that moves `background-200` fails this test until the metas
 * follow, which is the point.
 *
 * Which theme a page's tag must match is read off the page itself:
 *   - `data-theme="light"` on <html>  -> the light value (request.html);
 *   - a media-scoped pair             -> each tag matches its own scheme
 *                                        (index.html — its boot script
 *                                        resolves stored-then-OS, which
 *                                        media= approximates);
 *   - a bare tag and no data-theme    -> the dark value, because tokens.css
 *                                        has no prefers-color-scheme fallback:
 *                                        a page that never sets the attribute
 *                                        renders dark (driver, maintenance).
 * Pages with no theme-color tag are out of scope — requiring one would be a
 * new rule, and this test only enforces the existing one.
 */

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

/* ---- expected values, derived from tokens.css ---------------------------- */

const tokens = read("rux-ui/css/tokens.css");
const lightAt = tokens.search(/\[data-theme=["']?light/);
assert.ok(lightAt > 0, "tokens.css must carry a light-theme block");

function background200(block) {
	const m = block.match(/--rux-background-200:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+[\d.]+\)/);
	assert.ok(m, "tokens.css must declare --rux-background-200 as oklch()");
	assert.equal(Number(m[2]), 0,
		"background-200 grew chroma; extend this test's oklch conversion before repainting the metas");
	return Number(m[1]) / 100;
}

/* Achromatic OKLCH -> sRGB hex: for a=b=0 the LMS channels all equal L, so
 * linear rgb = L^3, then the standard sRGB transfer curve. */
function hexOfGrayL(L) {
	const linear = L ** 3;
	const srgb = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
	const v = Math.round(srgb * 255);
	return `#${v.toString(16).padStart(2, "0").repeat(3)}`;
}

const EXPECT = {
	dark: hexOfGrayL(background200(tokens.slice(0, lightAt))),
	light: hexOfGrayL(background200(tokens.slice(lightAt))),
};

/* ---- the sweep ----------------------------------------------------------- */

const META = /<meta[^>]*name=["']theme-color["'][^>]*>/g;
const content = (tag) => tag.match(/content=["']([^"']*)["']/)?.[1];
const scheme = (tag) => tag.match(/prefers-color-scheme:\s*(light|dark)/)?.[1];

for (const page of htmlPages()) {
	const html = read(page);
	const tags = html.match(META) ?? [];
	if (tags.length === 0) continue;

	test(`${page}: theme-color matches --rux-surface-0`, () => {
		const forcedLight = /<html[^>]*data-theme=["']light["']/.test(html);
		if (tags.length === 1 && !scheme(tags[0])) {
			const theme = forcedLight ? "light" : "dark";
			assert.equal(content(tags[0]), EXPECT[theme],
				`${page} renders ${theme}; its single theme-color must be ${theme} background-200`);
			return;
		}
		assert.equal(tags.length, 2,
			`${page}: theme-color must be one bare tag or a light/dark media pair`);
		for (const tag of tags) {
			const s = scheme(tag);
			assert.ok(s, `${page}: each tag in a pair needs a prefers-color-scheme media`);
			assert.equal(content(tag), EXPECT[s],
				`${page}'s ${s}-scoped theme-color must be ${s} background-200`);
		}
	});
}
