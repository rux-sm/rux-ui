import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* docs/foundations/color.md §5 step 7 — the rules that had no test.
 *
 * 2.8 (neutral is neutral) is already enforced in color-scales.test.mjs. What
 * was left were the two that need actual colour science rather than string
 * matching — 2.9's gamut floor and 2.11's contrast floor — plus 2.1's second
 * half, which is the "does an absolute lightness have a light override" check
 * that D12 recorded as enforced by nothing.
 *
 * The maths is OKLCH -> OKLab -> XYZ, and then out to whichever gamut the
 * branch is published for. Using XYZ's Y directly as relative luminance is
 * exact for an IN-GAMUT colour and is what makes the contrast check
 * gamut-independent: the same Y serves the sRGB and the P3 branch, because a
 * colour's luminance does not depend on which primaries can reproduce it. That
 * only holds while rule 2.9 holds, which is why the gamut test runs first — an
 * out-of-gamut value gets clipped by the browser and its rendered luminance is
 * no longer the one computed here.
 */

const tokens = readFileSync("rux-ui/css/tokens.css", "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const P3_AT = tokens.indexOf("@media (color-gamut: p3)");
const SRGB = stripComments(P3_AT > 0 ? tokens.slice(0, P3_AT) : tokens);
const P3 = stripComments(P3_AT > 0 ? tokens.slice(P3_AT) : "");
/* Index the STRIPPED string, not the raw file: stripComments changes the
   length, so an offset taken from `tokens` splits `SRGB` in the wrong place.
   That bug is why the first run of this suite reported gray-1000 on the dark
   canvas at 17.17 instead of the 17.94 a browser measures — the fixture test
   below is what caught it, which is the reason it exists. */
const LIGHT_AT = SRGB.indexOf(':root[data-theme="light"]');
const SRGB_DARK = SRGB.slice(0, LIGHT_AT);
const SRGB_LIGHT = SRGB.slice(LIGHT_AT);

/* ── colour ─────────────────────────────────────────────────────────────── */

/** `oklch(L% C H[ / A%])` -> {L,C,H,A}; null for anything else. */
function parseOklch(v) {
	const m = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\s*\)$/.exec(
		v.trim(),
	);
	if (!m) return null;
	return { L: +m[1] / 100, C: +m[2], H: +m[3], A: m[4] === undefined ? 1 : +m[4] / 100 };
}

/** OKLCH -> the three cubed cone responses OKLab is built on. */
function cones({ L, C, H }) {
	const h = (H * Math.PI) / 180;
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);
	return [
		(L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
		(L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
		(L - 0.0894841775 * a - 1.291485548 * b) ** 3,
	];
}

/** Relative luminance — XYZ's Y. Exact for an in-gamut colour, gamut-free. */
function luminance(c) {
	const [l, m, s] = cones(c);
	return -0.0405757452 * l + 1.1122868032 * m - 0.0717110568 * s;
}

const linearSrgb = ([l, m, s]) => [
	4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
	-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
	-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
];

const linearP3 = ([l, m, s]) => {
	const X = 1.2268798758 * l - 0.5578149944 * m + 0.2813910456 * s;
	const Y = -0.0405757452 * l + 1.1122868032 * m - 0.0717110568 * s;
	const Z = -0.0763729366 * l - 0.4214933324 * m + 1.5869240244 * s;
	return [
		2.4934969119 * X - 0.9313836179 * Y - 0.4027107845 * Z,
		-0.8294889696 * X + 1.7626640603 * Y + 0.0236246858 * Z,
		0.0358458302 * X - 0.0761723893 * Y + 0.956884524 * Z,
	];
};

/* One 8-bit code value of slack. A channel at -0.002 renders as 0 and is a
   rounding artefact of the conversion, not a colour outside the gamut. */
const TOLERANCE = 1 / 255 / 2;
const inGamut = (rgb) => rgb.every((v) => v >= -TOLERANCE && v <= 1 + TOLERANCE);

const contrast = (a, b) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

/** Every `--rux-name: oklch(...)` in a block, as {name: parsed}. */
function scaleOf(block) {
	const out = {};
	for (const [, name, value] of block.matchAll(
		/(--rux-[a-z0-9-]+)\s*:\s*(oklch\([^;]+\))\s*;/g,
	)) {
		const c = parseOklch(value);
		if (c) out[name] = c;
	}
	return out;
}

const DARK = scaleOf(SRGB_DARK);
const LIGHT = { ...DARK, ...scaleOf(SRGB_LIGHT) };
const P3_ALL = scaleOf(P3);

const HUES = ["blue", "red", "amber", "green", "teal", "purple", "pink"];
const STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

/* ── the maths, checked against the browser before it is trusted ─────────── */

test("the colour maths reproduces values measured in a browser", () => {
	/* Every figure this suite asserts is computed here rather than read off a
	   screen, so the arithmetic itself needs a fixture. These four were measured
	   on a live page with a canvas and recorded in color.md §5 steps 9 and 11;
	   if the conversion drifts, these fail before any rule does. */
	const near = (got, want, why) =>
		assert.ok(
			Math.abs(got - want) < 0.06,
			`${why}: computed ${got.toFixed(2)}, browser measured ${want}`,
		);
	const white = parseOklch("oklch(100% 0 0)");
	const nearBlack = parseOklch("oklch(14.57% 0 0)");

	near(contrast(white, DARK["--rux-red-800"]), 4.74, "white on red-800 (sRGB)");
	near(contrast(white, DARK["--rux-blue-800"]), 5.73, "white on blue-800 (sRGB)");
	near(contrast(nearBlack, DARK["--rux-amber-800"]), 9.25, "near-black on amber-800");
	near(
		contrast(DARK["--rux-gray-1000"], DARK["--rux-background-200"]),
		17.94,
		"primary text on the dark canvas",
	);
});

/* ── 2.9 · gamut ─────────────────────────────────────────────────────────── */

test("every sRGB-branch scale step resolves inside sRGB (rule 2.9)", () => {
	const bad = [];
	for (const [block, theme] of [[DARK, "dark"], [LIGHT, "light"]]) {
		for (const scale of [...HUES, "gray"]) {
			for (const step of STEPS) {
				const c = block[`--rux-${scale}-${step}`];
				if (!c) continue;
				if (!inGamut(linearSrgb(cones(c))))
					bad.push(`--rux-${scale}-${step} (${theme})`);
			}
		}
	}
	assert.deepEqual(bad, []);
});

test("every P3-branch step resolves inside P3, and has an sRGB value behind it", () => {
	/* Rule 2.9's second half: the wide branch raises a ceiling, it never
	   introduces a colour. A P3 step with no sRGB counterpart would render on
	   one class of display and vanish on another. */
	const orphans = [];
	const outside = [];
	for (const [name, c] of Object.entries(P3_ALL)) {
		if (!DARK[name] && !LIGHT[name]) orphans.push(name);
		if (!inGamut(linearP3(cones(c)))) outside.push(name);
	}
	assert.deepEqual(outside, [], "P3 values must be inside P3");
	assert.deepEqual(orphans, [], "every P3 step needs an sRGB fallback");
});

/* ── 2.11 · the AA floor, in the worse gamut ─────────────────────────────── */

const AA = 4.5;

test("the text steps clear AA against both backgrounds, both themes (rule 2.11)", () => {
	const fails = [];
	for (const [block, theme] of [[DARK, "dark"], [LIGHT, "light"]]) {
		for (const scale of [...HUES, "gray"]) {
			for (const step of [900, 1000]) {
				const fg = block[`--rux-${scale}-${step}`];
				if (!fg) continue;
				for (const bg of ["--rux-background-100", "--rux-background-200"]) {
					const cr = contrast(fg, block[bg]);
					if (cr < AA)
						fails.push(`${scale}-${step} on ${bg} (${theme}) = ${cr.toFixed(2)}`);
				}
			}
		}
	}
	assert.deepEqual(fails, []);
});

test("every published fill clears AA against its own label (rule 2.11)", () => {
	/* The half this system originates. A fill and its label are published as a
	   pair, so the pair is what gets tested — and in the WORSE gamut, which for
	   these values is sRGB. blue-700 with a white label measures 5.04 in P3 and
	   4.44 in sRGB; testing the wide branch alone would call it conformant. */
	const resolve = (block, name, seen = 0) => {
		if (seen > 8) return null;
		const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(
			block === LIGHT ? SRGB_LIGHT + SRGB_DARK : SRGB_DARK,
		);
		if (!m) return null;
		const v = m[1].trim();
		const direct = parseOklch(v);
		if (direct) return direct;
		const ref = /^var\((--rux-[a-z0-9-]+)\)$/.exec(v);
		return ref ? resolve(block, ref[1], seen + 1) : null;
	};
	const PAIRS = [
		["--rux-danger-fill", "--rux-danger-on-fill"],
		["--rux-warning-fill", "--rux-warning-on-fill"],
		["--rux-success-fill", "--rux-success-on-fill"],
		["--rux-info-fill", "--rux-info-on-fill"],
		["--rux-accent-800", "--rux-fg-on-accent"],
	];
	const fails = [];
	for (const [block, theme] of [[DARK, "dark"], [LIGHT, "light"]]) {
		for (const [fillName, labelName] of PAIRS) {
			const fill = resolve(block, fillName);
			const label = resolve(block, labelName);
			assert.ok(fill, `${fillName} does not resolve to a colour`);
			assert.ok(label, `${labelName} does not resolve to a colour`);
			const cr = contrast(label, fill);
			if (cr < AA)
				fails.push(`${labelName} on ${fillName} (${theme}) = ${cr.toFixed(2)}`);
		}
	}
	assert.deepEqual(fails, []);
});

/* ── 2.1 · an absolute lightness needs a light value (D12) ───────────────── */

test("an absolute lightness in :root has a light-theme value (rule 2.1)", () => {
	/* The check D12 recorded as enforced by nothing. A token stating an absolute
	   lightness renders the same on both canvases unless something says
	   otherwise, which is how a dark-tuned value leaks into light theme.
	   Three ways to satisfy it: be re-declared in the light block, be relative
	   (`from var(...)`, so it follows whatever it derives from), or be named
	   below as deliberately theme-invariant. */
	const THEME_INVARIANT = new Map([
		["--rux-fg-on-fill", "a fill is the 700/800 step and identical in both themes, so its label must be too — a theme-dependent label would flip to near-black on a dark blue button"],
		["--rux-fg-on-fill-inverse", "same, for the bright fills"],
		["--rux-black", "black is black"],
		["--rux-white", "white is white"],
		["--rux-neutral", "the legacy Tier 0 base; every consumer of it is relative"],
	]);
	const offenders = [];
	for (const [, name, value] of SRGB_DARK.matchAll(
		/(--rux-[a-z0-9-]+)\s*:\s*(oklch\([^;]+\))\s*;/g,
	)) {
		if (THEME_INVARIANT.has(name)) continue;
		if (/\bfrom\s+var\(/.test(value)) continue; // relative: follows its source
		if (new RegExp(`${name}\\s*:`).test(SRGB_LIGHT)) continue; // overridden
		offenders.push(`${name}: ${value.trim().slice(0, 40)}`);
	}
	assert.deepEqual(offenders, []);
});
