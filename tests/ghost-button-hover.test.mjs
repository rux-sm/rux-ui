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

test("ghost hovers by stepping its foreground, not by growing a fill", () => {
	// Workable only because text collapsed to two levels: rest is
	// --rux-text-secondary (7.9:1 on --rux-surface-0) and hover is
	// --rux-text-primary, a 24-point OKLCH jump. The earlier attempt sat at
	// --rux-text-muted with --rux-text-default above it at oklch 100%, which
	// left nowhere to step to.
	assert.equal(tokenValue("--rux-button-ghost-text"), "var(--rux-text-secondary)");
	assert.equal(tokenValue("--rux-button-ghost-hover-text"), "var(--rux-text-primary)");
	assert.equal(tokenValue("--rux-button-ghost-hover-background"), "transparent");
	assert.notEqual(
		tokenValue("--rux-button-ghost-text"),
		tokenValue("--rux-button-ghost-hover-text"),
		"the two levels must differ or the hover does nothing",
	);
	// Press cannot step a foreground that is already at full strength, so it
	// keeps a wash — the one state that still uses one.
	assert.equal(
		tokenValue("--rux-button-ghost-active-background"),
		"var(--rux-state-active-overlay)",
	);
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

test("the trip bar is the one surface that keeps a hover fill", () => {
	// A foreground step needs headroom above the rest color. On the bar the
	// foreground is pinned to --rux-fg-on-accent, because a neutral grey is
	// 1.10:1 against that blue where white is 4.34:1 — and white cannot step
	// higher. Dropping rest to --rux-fg-on-accent-muted to make room would put
	// it at 3.07:1, barely past the icon threshold. So the wash stays here.
	for (const token of [
		"--rux-button-ghost-text",
		"--rux-button-ghost-hover-text",
	]) {
		assert.match(
			tripBar,
			new RegExp(`${token}:\\s*var\\(--rux-fg-on-accent\\)`),
		);
	}
	assert.match(
		tripBar,
		/--rux-button-ghost-hover-background:\s*oklch\(from var\(--rux-white\)/,
		"the bar must restore a wash its pinned foreground cannot replace",
	);
	assert.doesNotMatch(tripBar, /\.sched-trip-bar__action\.rux-button--ghost/);
});

test("ghost danger steps within its own intent hue", () => {
	// Same contract as plain ghost — no fill — but the step runs --rux-danger
	// to its --strong stop, so a destructive button brightens toward danger
	// rather than toward neutral.
	assert.equal(
		tokenValue("--rux-button-danger-ghost-hover-background"),
		"transparent",
	);
	assert.equal(tokenValue("--rux-button-danger-ghost-text"), "var(--rux-danger)");
	assert.equal(
		tokenValue("--rux-button-danger-ghost-hover-text"),
		"var(--rux-danger-strong)",
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
		/\.rux-ui-header \.rux-button--lg\[aria-expanded="true"\][^{]*\{[^}]*\}/,
	)[0];
	assert.doesNotMatch(broad, /background/);

	// Each trigger names the surface it owns; the per-trigger rule applies it.
	assert.match(header, /\.rux-ui-header__disclosure\s*\{[^}]*--_header-disclosure-bg:\s*var\(--rux-popover-surface-bg\)/s);
	assert.match(header, /\.rux-ui-header__menu\s*\{[^}]*--_header-disclosure-bg:\s*var\(--rux-side-nav-bg\)/s);

	// That rule has to outrank .rux-button--ghost:hover, which is (0,4,0) and
	// sets background: transparent. It is the open trigger's opaque surface
	// that hides the header's ::after bottom border beneath it — lose it on
	// hover and a line appears under an open trigger, cutting it off from the
	// surface this whole contract exists to connect it to.
	const openRule = header.match(
		/\.rux-ui-header\s*\n?\s*:is\(\.rux-ui-header__disclosure, \.rux-ui-header__menu\)\[aria-expanded="true"\][^{]*\{[^}]*\}/s,
	);
	assert.ok(openRule, "the open-state rule must be scoped to .rux-ui-header");
	assert.match(openRule[0], /background:\s*var\(--_header-disclosure-bg\)/);
	// Two :not() guards + the scope + the class + the attribute = (0,5,0).
	assert.match(openRule[0], /:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
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
	// Since color.md §5 step 4 the overlays read gray-alpha, whose steps carry
	// the catalog's own hover/active alphas, so the alpha has to be resolved
	// through one level of indirection rather than parsed off the role.
	const cut = tokens.indexOf(':root[data-theme="light"]');
	const dark = tokens.slice(0, cut);
	const light = tokens.slice(cut);
	const alpha = (block, name) => {
		const step = dark.match(new RegExp(`${name}:\\s*var\\((--rux-gray-alpha-\\d+)\\)`))?.[1];
		const decl = block.match(new RegExp(`${step ?? name}:\\s*oklch\\([^;]*?/\\s*([\\d.]+)%`));
		return Number(decl[1]);
	};
	// Likewise the surface each is composited over: surface-1 is the catalog's
	// background-100 now, not a hand-set lightness.
	const surfaceL = (block) => {
		const v = block.match(/--rux-background-100:\s*oklch\(([\d.]+)%/);
		return Number((v ?? dark.match(/--rux-background-100:\s*oklch\(([\d.]+)%/))[1]) / 100;
	};

	const darkHover = alpha(dark, "--rux-state-hover-overlay");
	const lightHover = alpha(light, "--rux-state-hover-overlay");
	// Composited against their own themes' surfaces, these land within a few
	// code values of each other; the raw alphas differ because black over a
	// light surface and white over a dark one are not symmetric.
	const deltaDark = shift(surfaceL(dark), 1, darkHover / 100);
	const deltaLight = shift(surfaceL(light), 0, lightHover / 100);
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
