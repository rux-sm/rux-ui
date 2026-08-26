import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const badges = await readFile(
	new URL("../rux-ui/css/base/badges.css", import.meta.url),
	"utf8",
);
const tokens = await readFile(
	new URL("../rux-ui/css/tokens.css", import.meta.url),
	"utf8",
);

/* Structural assertions run against comment-stripped CSS. Prose must not be
   able to break a rule match or satisfy one — a brace inside a comment (this
   file's own `--rux-{status}-fill-control`) truncated a `[^}]*` block match at
   step 46 and failed a rule that was correct. */
const badgeRules = badges.replace(/\/\*[\s\S]*?\*\//g, "");

function tokenValue(name) {
	return tokens.match(new RegExp(`${name}:\\s*([^;]+);`))[1].trim();
}

test("a badge is sized as a label, not as a control", () => {
	// The regression this guards: --rux-badge-height was --rux-control-height
	// (44px), taller than --rux-table-row-height (36px), so every status cell
	// silently set the row height for its whole table.
	const badgeHeight = Number.parseInt(tokenValue("--rux-badge-height"), 10);
	const rowHeight = Number.parseInt(
		tokenValue("--rux-table-row-height"),
		10,
	);
	assert.ok(
		badgeHeight < rowHeight,
		`badge height ${badgeHeight}px must fit inside a ${rowHeight}px table row`,
	);
	assert.doesNotMatch(
		tokenValue("--rux-badge-height"),
		/--rux-control-height/,
	);
});

test("a badge recedes from the content it annotates", () => {
	// Asserted through the role rather than the raw rung. Rule 1.2: a recurring
	// size+leading recipe goes through a role, and rule 2.12's tree makes a
	// badge a Label — "badge, cell, chip, field label, eyebrow". This read the
	// primitives directly and pinned weight 500, which is what made D16's
	// contradiction executable: rule 2.11 said badges were 500, rule 2.12 said
	// they were Labels, and Labels are 400. Resolved toward the catalog at
	// step 41 — a badge is not interactive, so it is not a Button.
	assert.equal(tokenValue("--rux-badge-font-size"), "var(--rux-text-label-12-size)");
	assert.equal(tokenValue("--rux-badge-font-weight"), "var(--rux-text-label-12-weight)");
	assert.equal(tokenValue("--rux-badge-line-height"), "var(--rux-text-label-12-line-height)");
	assert.equal(tokenValue("--rux-badge-radius"), "var(--rux-radius-full)");
});

test("the fill carries the color, not the outline", () => {
	/* The border is a hairline in the badge's own family, not a third mixed
	   value and not a full-saturation ring around a faint fill (the original
	   regression). Since step 46 it reads the published fill token rather than
	   a color-mix, so the assertion moved with the mechanism. */
	assert.match(
		badgeRules,
		/border:\s*var\(--rux-border-width\) solid var\(--_badge-fill\)/,
	);
	assert.doesNotMatch(badgeRules, /--rux-badge-border-opacity/);
	// backdrop-filter over an already-opaque background was pure cost.
	assert.doesNotMatch(badges, /backdrop-filter/);
});

test("solid emphasis reads the published fill and its label", () => {
	/* REPOINTED AT STEP 46, AND THE OLD ASSERTION WAS THE DEFECT MADE
	   EXECUTABLE. It required `oklch(from var(--_badge-color) ...)` — that is,
	   it required the badge to INVENT its fill by rewriting an ink's lightness.
	   That band was published nowhere, reachable by no other component, and it
	   is why a solid danger badge painted #ff6467 while a danger button painted
	   #bb0522: one meaning, two reds. color.md D22.

	   A fill and its label are published together (rule 2.14) precisely so a
	   component cannot get the pairing wrong, and the badge now reads both. */
	assert.match(
		badgeRules,
		/\.rux-badge--solid\s*\{[^}]*background:\s*var\(--_badge-fill\)/s,
	);
	assert.match(
		badgeRules,
		/\.rux-badge--solid\s*\{[^}]*color:\s*var\(--_badge-on-fill\)/s,
	);
	// A transparent border would make solid and subtle badges different sizes.
	assert.match(
		badgeRules,
		/\.rux-badge--solid\s*\{[^}]*border-color:\s*var\(--_badge-fill\)/s,
	);
	// The derivation must not come back.
	assert.doesNotMatch(badgeRules, /oklch\(from var\(--_badge-color\)/);
});

test("solid emphasis inverts between themes", () => {
	// Dark: bright fill, dark label. Light: darker fill, near-white label.
	// A single pair of stops cannot clear contrast on both canvases.
	const stops = [...tokens.matchAll(/--rux-badge-solid-lightness:\s*(\d+)%/g)];
	const fgStops = [
		...tokens.matchAll(/--rux-badge-solid-fg-lightness:\s*(\d+)%/g),
	];
	assert.equal(stops.length, 2, "expected a dark-theme and a light-theme stop");
	assert.equal(fgStops.length, 2);
	assert.notEqual(stops[0][1], stops[1][1]);
	// Fill and label must sit on opposite sides of the lightness range.
	for (const [i] of stops.entries()) {
		const fill = Number(stops[i][1]);
		const fg = Number(fgStops[i][1]);
		assert.ok(
			Math.abs(fill - fg) > 40,
			`fill ${fill}% and label ${fg}% are too close to read`,
		);
	}
});

test("the legacy --accent alias is gone", () => {
	assert.doesNotMatch(badges, /rux-badge--accent/);
});

test("every semantic names all four published tokens", () => {
	/* Was one derived colour per semantic (`--_badge-color`); since step 46 it
	   is the four the system publishes for a status — tint, ink, fill, label.
	   A new semantic costs four lines instead of one, and gets the system's own
	   colours rather than an approximation of them.

	   Asserted per token, not as a block, so a modifier that names three of the
	   four fails here rather than falling back to whatever the base set. */
	for (const tone of ["info", "success", "warning", "danger"]) {
		const block = badgeRules.match(
			new RegExp(`\\.rux-badge--${tone}\\s*\\{([^}]*)\\}`),
		);
		assert.ok(block, `no .rux-badge--${tone} rule`);
		for (const [prop, token] of [
			["--_badge-tint", `--rux-${tone}-subtle`],
			["--_badge-ink", `--rux-${tone}`],
			["--_badge-fill", `--rux-${tone}-fill-control`],
			["--_badge-on-fill", `--rux-${tone}-on-fill-control`],
		]) {
			assert.match(
				block[1],
				new RegExp(`${prop}:\\s*var\\(${token}\\)`),
				`.rux-badge--${tone} must set ${prop} to var(${token})`,
			);
		}
	}
});
