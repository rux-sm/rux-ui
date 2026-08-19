import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tokens = await readFile(
	new URL("../rux-ui/css/tokens.css", import.meta.url),
	"utf8",
);
const controls = await readFile(
	new URL("../rux-ui/css/base/controls.css", import.meta.url),
	"utf8",
);
const header = await readFile(
	new URL("../rux-ui/css/base/ui-header.css", import.meta.url),
	"utf8",
);
const tripBar = await readFile(
	new URL("../scheduler/css/features/trip-bar.css", import.meta.url),
	"utf8",
);

function tokenValue(name) {
	return tokens.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();
}

test("ghost hover is the shared neutral overlay", () => {
	// Deliberately an alpha overlay, not an OKLCH lightness step. Measured in
	// 8-bit code values — what reaches the screen — 10% white moves
	// surface-0/1/2 by +26/+24/+22. A constant lightness step does not: sRGB
	// compresses near black, so from --rux-surface-0 (pure black)
	// calc(l + 0.06) renders rgb(1,1,1) and the hover vanishes. That
	// regression shipped once; this is the guard.
	assert.equal(
		tokenValue("--rux-button-ghost-hover-background"),
		"var(--rux-state-hover-overlay)",
	);
	assert.equal(
		tokenValue("--rux-button-ghost-active-background"),
		"var(--rux-state-active-overlay)",
	);
	assert.equal(tokenValue("--rux-button-ghost-text"), "var(--rux-text-primary)");
	assert.doesNotMatch(controls, /--rux-surface-current/);
});

test("no state fill is a bare lightness step off a surface token", () => {
	return Promise.all(
		["controls", "menu", "table", "side-nav", "form", "notifications"].map(
			async (name) => {
				const css = await readFile(
					new URL(`../rux-ui/css/base/${name}.css`, import.meta.url),
					"utf8",
				);
				assert.doesNotMatch(
					css,
					/--rux-state-\w+-step/,
					`${name}.css: state fills composite an overlay, they do not step lightness`,
				);
			},
		),
	);
});

test("trip-bar actions run the same hover token as every other ghost button", () => {
	// The bar configures only the foreground. Its earlier bespoke wash borrowed
	// a tone-on-tone opacity (70%) and composited it as plain white, landing 26
	// lightness points up where the bar's own hover step is 4 — the harsh block.
	assert.doesNotMatch(tripBar, /--rux-button-ghost-hover-background:/);
	assert.doesNotMatch(tripBar, /--rux-button-ghost-active-background:/);
	assert.doesNotMatch(tripBar, /\.sched-trip-bar__action\.rux-button--ghost/);
	for (const token of [
		"--rux-button-ghost-text",
		"--rux-button-ghost-hover-text",
	]) {
		assert.match(
			tripBar,
			new RegExp(`${token}:\\s*var\\(--rux-fg-on-accent\\)`),
			`${token} must be pinned to the on-accent foreground`,
		);
	}
});

test("ghost danger tints in its own hue rather than the neutral overlay", () => {
	assert.match(
		tokenValue("--rux-button-danger-ghost-hover-background"),
		/oklch\(from var\(--rux-danger\)/,
	);
	assert.notEqual(
		tokenValue("--rux-button-danger-ghost-hover-background"),
		"transparent",
	);
});

test("an open header trigger paints the surface it opens, nothing else", () => {
	// It has borrowed the wrong background twice: first the ghost *press*
	// token (coupling a persistent open state to a momentary one), then a flat
	// --rux-ui-header-trigger-open-bg that ignored which surface each trigger
	// actually owned. The connected-trigger contract only works per-trigger.
	assert.doesNotMatch(header, /--rux-button-ghost-active-background/);
	assert.doesNotMatch(header, /--rux-ui-header-trigger-open-bg/);
	assert.doesNotMatch(tokens, /--rux-ui-header-trigger-open-bg/);

	// The broad open-state rule outranks the per-trigger one, so it must not
	// declare a background at all.
	const broad = header.match(
		/\.rux-ui-header \.rux-button--header\[aria-expanded="true"\][^{]*\{[^}]*\}/,
	)[0];
	assert.doesNotMatch(broad, /background/);

	// Each trigger names the surface it owns; the per-trigger rule applies it.
	assert.match(header, /\.rux-ui-header__disclosure\s*\{[^}]*--_rux-header-disclosure-bg:\s*var\(--rux-popover-surface-bg\)/s);
	assert.match(header, /\.rux-ui-header__menu\s*\{[^}]*--_rux-header-disclosure-bg:\s*var\(--rux-side-nav-bg\)/s);
	assert.match(header, /\[aria-expanded="true"\]\s*\{[^}]*background:\s*var\(--_rux-header-disclosure-bg\)/s);
});

test("the header's action zones are actually separated", () => {
	// All four spacing tokens were 0 while three comments described a two-zone
	// grouping — five 40px buttons rendered as one undifferentiated strip.
	const gap = (name) =>
		tokens.match(new RegExp(`${name}:\\s*var\\(--rux-space-([\\w-]+)\\)`))?.[1];
	assert.notEqual(gap("--rux-ui-header-actions-gap"), "0");
	assert.notEqual(gap("--rux-ui-header-actions-group-gap"), "0");
	// Between zones must exceed within a zone, or the grouping reads as even.
	const scale = ["px", "1", "2", "3", "4", "5", "6", "8"];
	assert.ok(
		scale.indexOf(gap("--rux-ui-header-actions-group-gap")) >
			scale.indexOf(gap("--rux-ui-header-actions-gap")),
		"the between-zone gap must be wider than the within-zone gap",
	);
});

// ── Rendered-value math ───────────────────────────────────────────────────
// Hover strength has to be judged in what reaches the screen, not in OKLCH
// lightness: sRGB compresses near black, so equal L deltas are not equal
// visible steps down there. oklch -> linear sRGB -> 8-bit.

const NEUTRAL_CHROMA = 0.004;
const NEUTRAL_HUE = 255;

function oklchToSrgb(L) {
	const h = (NEUTRAL_HUE * Math.PI) / 180;
	const a = NEUTRAL_CHROMA * Math.cos(h);
	const b = NEUTRAL_CHROMA * Math.sin(h);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	].map((v) => Math.min(1, Math.max(0, v)));
}

test("both themes move a surface by a comparable amount", () => {
	// The one real defect the mechanism detour turned up: light theme's 5%
	// black moved a surface 13 code values where dark theme's 10% white moved
	// 26, so hover read about half as strongly there.
	const alpha = (block, name) =>
		Number(block.match(new RegExp(`${name}:\\s*oklch\\([^;]*?/\\s*(\\d+)%`))[1]);
	const light = tokens.slice(tokens.indexOf(':root[data-theme="light"]'));
	const dark = tokens.slice(0, tokens.indexOf(':root[data-theme="light"]'));

	const darkHover = alpha(dark, "--rux-state-hover-overlay");
	const lightHover = alpha(light, "--rux-state-hover-overlay");
	// Composited against their own themes' surfaces, these land within a few
	// code values of each other; the raw alphas differ because black over a
	// light surface and white over a dark one are not symmetric.
	const deltaDark = shift(0.18, 1, darkHover / 100);
	const deltaLight = shift(1.0, 0, lightHover / 100);
	assert.ok(
		Math.abs(Math.abs(deltaDark) - Math.abs(deltaLight)) <= 6,
		`hover moves ${deltaDark} in dark but ${deltaLight} in light`,
	);
});

// 8-bit code-value shift when `ovL` is composited at `a` over an OKLCH L base.
function shift(baseL, ovL, a) {
	const g = (t) => (t >= 0.0031308 ? 1.055 * Math.pow(t, 1 / 2.4) - 0.055 : 12.92 * t);
	const gi = (t) => (t >= 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
	const lin = (L) => oklchToSrgb(L);
	const base = lin(baseL)[0];
	const ov = lin(ovL)[0];
	const out = gi(a * g(ov) + (1 - a) * g(base));
	return Math.round(255 * g(out)) - Math.round(255 * g(base));
}
