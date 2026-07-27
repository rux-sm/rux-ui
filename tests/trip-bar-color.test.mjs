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
const appSource = await readFile(
	new URL("../index.html", import.meta.url),
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

test("multi-day details can be centered in a full-span head", () => {
	assert.match(
		tripBarSource,
		/headContent\.className = "rux-trip-bar__head-content"/,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar--multi-day\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar--multi-day \.rux-trip-bar__head-content\s*\{[^}]*width:\s*min\(var\(--rux-trip-bar-day-inline-size,\s*100%\),\s*100%\)[^}]*margin-inline:\s*auto/s,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar--multi-day \.rux-trip-bar__tail\s*\{[^}]*display:\s*none/s,
	);
});

test("centered multi-day details are exposed as a persistent view option", () => {
	assert.match(
		appSource,
		/id="opt-centered-trip-heads"[\s\S]*?type="checkbox"[\s\S]*?role="switch"/,
	);
	assert.match(appSource, /rux-scheduler--centered-trip-heads/);
	assert.match(appSource, /localStorage\.getItem\("rux:centered-trip-heads"\)/);
	assert.match(appSource, /localStorage\.setItem\("rux:centered-trip-heads", on\)/);
});

test("centered identity text applies to single and multi-day bars without moving status rails", () => {
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar \.rux-trip-bar__summary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto minmax\(0,\s*1fr\)/s,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar \.rux-trip-bar__destination\s*\{[^}]*grid-column:\s*2[^}]*justify-content:\s*center[^}]*text-align:\s*center/s,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar \.rux-trip-bar__paid-badge\s*\{[^}]*grid-column:\s*3[^}]*justify-self:\s*end/s,
	);
	assert.match(
		tripBarCss,
		/\.rux-scheduler--centered-trip-heads \.rux-trip-bar \.rux-trip-bar__reqs \.rux-trip-bar__pending\s*\{[^}]*margin-inline-start:\s*auto/s,
	);
	assert.match(appSource, />Center trip details<\/span/);
});
