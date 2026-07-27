import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tripBarCss = await readFile(
	new URL("../css/features/trip-bar.css", import.meta.url),
	"utf8",
);
const printScheduleCss = await readFile(
	new URL("../css/features/print-schedule.css", import.meta.url),
	"utf8",
);
const tripBarSource = await readFile(
	new URL("../js/components/trip-bar.js", import.meta.url),
	"utf8",
);

test("trip bar override colors remain visible for unconfirmed trips", () => {
	assert.match(
		tripBarCss,
		/\.rux-trip-bar--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_tone:\s*var\(--rux-danger\)/s,
	);
	assert.doesNotMatch(
		tripBarCss,
		/\.rux-trip-bar--unconfirmed\s*\{[^}]*--_tone:\s*var\(--rux-danger\)/s,
	);
});

test("printed trip override colors remain visible for unconfirmed trips", () => {
	assert.match(
		printScheduleCss,
		/\.rux-print-trip--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_print-trip-tint:\s*var\(--print-danger-tint\)[^}]*--_print-trip-line:\s*var\(--print-danger-line\)/s,
	);
});

test("trip bar color data is assigned independently of confirmation status", () => {
	const colorAssignment = tripBarSource.match(
		/if \(\["cyan", "green", "purple", "yellow", "orange", "pink"\]\.includes\(trip\.trip_bar_color\)\) \{[\s\S]*?\n  \}/,
	)?.[0];
	assert.ok(colorAssignment);
	assert.match(colorAssignment, /bar\.dataset\.tripBarColor = trip\.trip_bar_color/);
	assert.doesNotMatch(colorAssignment, /confirmed/);
});

test("base, head, and tail outlines share a fully opaque color channel", () => {
	assert.match(
		tripBarCss,
		/--_outline:\s*oklch\(\s*from var\(--_tone\)[\s\S]*?h\s*\/\s*100%\s*\)/,
	);
	assert.match(
		tripBarCss,
		/\.rux-trip-bar\s*\{[\s\S]*?border:\s*var\(--rux-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.match(
		tripBarCss,
		/\.rux-trip-bar__head\s*\{[\s\S]*?border:\s*var\(--rux-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.match(
		tripBarCss,
		/\.rux-trip-bar__tail\s*\{[\s\S]*?border:\s*var\(--rux-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.doesNotMatch(
		tripBarCss,
		/border:\s*var\(--rux-trip-bar-border-width\) solid var\(--_surface\)/,
	);
});
