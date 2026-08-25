import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* Enforces the normalized category fill band — docs/foundations/color.md
   rule 1.1a, rule 2.11, §5 step 24.

   The band's whole claim is that label contrast is a property of the BAND and
   not of the hue: one luminance per theme, so no hue needs its own measurement.
   A claim like that decays silently — a later hand-tune to one fill would still
   look fine on screen and would quietly reintroduce D19. So this recomputes the
   ratios from the published values rather than trusting them.

   Measured the way the thing actually renders:
     · in the sRGB branch, because rule 2.11's floor is the WORSE gamut and the
       P3 block would grade the design on the generous one;
     · compositing the 87% tier in GAMMA space, because that is where browsers
       alpha-blend. Compositing linearly reports a materially different number. */

const CSS = readFileSync(new URL("../rux-ui/css/tokens.css", import.meta.url), "utf8");
const SRGB = CSS.slice(0, CSS.indexOf("@media (color-gamut: p3)"));
const LIGHT_AT = SRGB.indexOf(':root[data-theme="light"]');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const DARK = strip(SRGB.slice(0, LIGHT_AT));
const LIGHT = strip(SRGB.slice(LIGHT_AT));

const HUES = ["blue", "red", "amber", "green", "teal", "purple", "pink"];
const TIER_FLOOR = 4.5;      /* rule 2.11's floor, on the binding tier */
const PRIMARY_FLOOR = 4.5;

const declOf = (block, name) => {
	const m = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
	return m ? m[1].trim() : null;
};
const parseOklch = (v) => {
	const m = v.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.-]+)/);
	return m ? [+m[1] / 100, +m[2], +m[3]] : null;
};
const enc = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const dec = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
function srgb([L, C, hDeg]) {
	const h = (hDeg * Math.PI) / 180;
	const a = C * Math.cos(h), b = C * Math.sin(h);
	const l_ = L + 0.3963377774*a + 0.2158037573*b;
	const m_ = L - 0.1055613458*a - 0.0638541728*b;
	const s_ = L - 0.0894841775*a - 1.2914855480*b;
	const l = l_**3, m = m_**3, s = s_**3;
	return [ 4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
	        -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
	        -0.0041960863*l - 0.7034186147*m + 1.7076147010*s ]
		.map((v) => enc(Math.min(1, Math.max(0, v))));
}
const Y = (s) => { const l = s.map(dec); return 0.2126*l[0] + 0.7152*l[1] + 0.0722*l[2]; };
const ratio = (a, b) => { const [hi, lo] = [Y(a), Y(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05); };
const tint = (ink, fill, a = 0.87) => ink.map((v, i) => a * v + (1 - a) * fill[i]);

const WHITE = srgb([1, 0, 0]);
const INK = srgb([0.1457, 0, 0]);
const themes = { dark: DARK, light: LIGHT };

test("every hue publishes a fill and its own label", () => {
	/* The band lives at :root and is deliberately NOT re-stated per theme, so
	   this reads the base block only — that is where all seven resolve from. */
	const missing = [];
	for (const hue of HUES) {
		if (!declOf(DARK, `--rux-${hue}-fill`)) missing.push(`--rux-${hue}-fill`);
		if (!declOf(DARK, `--rux-${hue}-on-fill`)) missing.push(`--rux-${hue}-on-fill`);
	}
	assert.deepEqual(missing, [], `unpublished: ${missing.join(", ")}`);
});

test("every fill clears the floor against the label it publishes", () => {
	const fails = [];
	for (const hue of HUES) {
		const fill = srgb(parseOklch(declOf(DARK, `--rux-${hue}-fill`)));
		const ink = /inverse/.test(declOf(DARK, `--rux-${hue}-on-fill`)) ? INK : WHITE;
		const primary = ratio(fill, ink);
		const tier = ratio(fill, tint(ink, fill));
		if (primary < PRIMARY_FLOOR) fails.push(`${hue} primary ${primary.toFixed(2)}`);
		if (tier < TIER_FLOOR) fails.push(`${hue} 87% tier ${tier.toFixed(2)}`);
	}
	assert.deepEqual(fails, [], `below rule 2.11's floor: ${fails.join(" · ")}`);
});

test("contrast is a property of the band, not of the hue", () => {
	/* The point of step 24. If a later edit tunes one fill by hand, the spread
	   opens and this fails — which is D19 coming back, caught early. */
	const tiers = HUES.map((hue) => {
		const fill = srgb(parseOklch(declOf(DARK, `--rux-${hue}-fill`)));
		const ink = /inverse/.test(declOf(DARK, `--rux-${hue}-on-fill`)) ? INK : WHITE;
		return ratio(fill, tint(ink, fill));
	});
	const spread = Math.max(...tiers) - Math.min(...tiers);
	assert.ok(spread <= 0.5,
		`87% tier spread ${spread.toFixed(2)} across hues — the band is no longer uniform`);
});

test("amber is the only hue that takes the inverse label", () => {
	/* Not a preference: a saturated amber cannot be dark in sRGB, so it cannot
	   carry white at this band's luminance. A named exception under rule 1.1a
	   rather than dulling amber to a brown to make the rule tidy. */
	const inverse = HUES.filter((h) => /inverse/.test(declOf(DARK, `--rux-${h}-on-fill`)));
	assert.deepEqual(inverse, ["amber"]);
});

test("the band is theme-invariant — one palette, both canvases (§5 step 24)", () => {
	/* The owner's shape, and it follows the catalog's own model for high-contrast
	   steps: "a high-contrast fill does not change with the canvas". Invariance is
	   spelled as an EQUAL override rather than as an absent one, because rule 2.1
	   requires any absolute lightness to carry a light-theme value — and because an
	   equality is checkable where an absence only proves nobody has typed it yet. */
	for (const hue of HUES) {
		assert.equal(declOf(LIGHT, `--rux-${hue}-fill`), declOf(DARK, `--rux-${hue}-fill`),
			`--rux-${hue}-fill was re-tuned for light — the band must not vary by canvas`);
		assert.equal(declOf(LIGHT, `--rux-${hue}-on-fill`), declOf(DARK, `--rux-${hue}-on-fill`),
			`--rux-${hue}-on-fill was re-tuned for light`);
	}
});
