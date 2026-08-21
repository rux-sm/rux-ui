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
	assert.equal(tokenValue("--rux-badge-font-size"), "var(--rux-size-12)");
	assert.equal(tokenValue("--rux-badge-font-weight"), "var(--rux-weight-500)");
	assert.equal(tokenValue("--rux-badge-radius"), "var(--rux-radius-full)");
});

test("the fill carries the color, not the outline", () => {
	// Previously a full-saturation border around a 12% fill.
	assert.match(badges, /--rux-badge-border-opacity/);
	assert.doesNotMatch(
		badges,
		/border:\s*var\(--rux-border-width\) solid var\(--_badge-color\)/,
	);
	// backdrop-filter over an already-opaque pre-mixed background was pure cost.
	assert.doesNotMatch(badges, /backdrop-filter/);
});

test("solid emphasis derives from whichever semantic is set", () => {
	// One rule serves every variant, so a new semantic needs no addition here.
	assert.match(
		badges,
		/\.rux-badge--solid\s*\{[^}]*background:\s*oklch\(from var\(--_badge-color\) var\(--rux-badge-solid-lightness\)/s,
	);
	assert.match(
		badges,
		/\.rux-badge--solid\s*\{[^}]*color:\s*oklch\([^}]*var\(--rux-badge-solid-fg-lightness\)/s,
	);
	// A transparent border would make solid and subtle badges different sizes.
	assert.match(
		badges,
		/\.rux-badge--solid\s*\{[^}]*border-color:\s*oklch\(/s,
	);
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

test("every semantic keeps its color modifier", () => {
	for (const tone of ["info", "success", "warning", "danger"]) {
		assert.match(
			badges,
			new RegExp(
				`\\.rux-badge--${tone}[^}]*--_badge-color:\\s*var\\(--rux-${tone}-strong\\)`,
			),
		);
	}
});
