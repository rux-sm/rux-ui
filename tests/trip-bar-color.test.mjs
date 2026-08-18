import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tripBarCss = await readFile(
	new URL("../scheduler/css/features/trip-bar.css", import.meta.url),
	"utf8",
);
const ruxTokensCss = await readFile(
	new URL("../rux-ui/css/tokens.css", import.meta.url),
	"utf8",
);
const tokensCss = await readFile(
	new URL("../scheduler/css/tokens.css", import.meta.url),
	"utf8",
);
const printScheduleCss = await readFile(
	new URL("../scheduler/css/features/print-schedule.css", import.meta.url),
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
		/\.sched-trip-bar--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_tone:\s*var\(--sched-trip-bar-danger-border\)/s,
	);
	assert.doesNotMatch(
		tripBarCss,
		/\.sched-trip-bar--unconfirmed\s*\{[^}]*--_tone:\s*var\(--sched-trip-bar-danger-border\)/s,
	);
});

test("printed trip override colors remain visible for unconfirmed trips", () => {
	assert.match(
		printScheduleCss,
		/\.sched-print-trip--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_print-trip-tint:\s*var\(--print-danger-tint\)[^}]*--_print-trip-line:\s*var\(--print-danger-line\)/s,
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

test("trip bar email shortcut replaces the manifest shortcut", () => {
	assert.match(tripBarSource, /trip\.booking_contact_missive_url/);
	assert.match(tripBarSource, /trip\.bookingContact\?\.missiveUrl/);
	assert.match(
		appSource,
		/booking_contact_missive_url:\s*t\.booking_contact_missive_url/,
	);
	assert.match(tripBarSource, /"alternate-email"/);
	assert.match(tripBarSource, /emailThreadBtn\.disabled = !emailThreadUrl/);
	assert.match(tripBarSource, /emailThreadBtn\.dataset\.role = "email-thread-btn"/);
	assert.doesNotMatch(tripBarSource, /callbacks\.onOpenManifest/);
});

test("base, head, and tail outlines share a fully opaque color channel", () => {
	assert.match(
		tripBarCss,
		/--_outline:\s*oklch\(\s*from var\(--_tone\)[\s\S]*?h\s*\/\s*100%\s*\)/,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar\s*\{[\s\S]*?border:\s*var\(--sched-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__head\s*\{[\s\S]*?border:\s*var\(--sched-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__tail\s*\{[\s\S]*?border:\s*var\(--sched-trip-bar-border-width\) solid var\(--_outline\)/,
	);
	assert.doesNotMatch(
		tripBarCss,
		/border:\s*var\(--sched-trip-bar-border-width\) solid var\(--_surface\)/,
	);
});

test("multi-day details can be centered in a full-span head", () => {
	assert.match(
		tripBarSource,
		/headContent\.className = "sched-trip-bar__head-content"/,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar--multi-day\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar--multi-day \.sched-trip-bar__head-content\s*\{[^}]*width:\s*min\(var\(--sched-trip-bar-day-inline-size,\s*100%\),\s*100%\)[^}]*margin-inline:\s*auto/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar--multi-day \.sched-trip-bar__tail\s*\{[^}]*display:\s*none/s,
	);
});

test("centered multi-day details are exposed as a persistent view option", () => {
	assert.match(
		appSource,
		/id="opt-centered-trip-heads"[\s\S]*?type="checkbox"[\s\S]*?role="switch"/,
	);
	assert.match(appSource, /sched-scheduler--centered-trip-heads/);
	assert.match(appSource, /localStorage\.getItem\("rux:centered-trip-heads"\)/);
	assert.match(appSource, /localStorage\.setItem\("rux:centered-trip-heads", on\)/);
});

test("centered identity text applies to single and multi-day bars without moving status rails", () => {
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__summary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto minmax\(0,\s*1fr\)/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__destination\s*\{[^}]*grid-column:\s*2[^}]*justify-content:\s*center[^}]*text-align:\s*center/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__paid-badge\s*\{[^}]*grid-column:\s*3[^}]*justify-self:\s*end/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__reqs \.sched-trip-bar__pending\s*\{[^}]*margin-inline-start:\s*auto/s,
	);
	assert.match(appSource, />Center trip details<\/span/);
});

test("bus-count pills use black text on their white surface", () => {
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__bus-label\s*\{[^}]*background:\s*var\(--sched-trip-bar-bus-label-bg\)[^}]*color:\s*var\(--rux-black\)/s,
	);
});

test("trip interaction surfaces derive modest state changes from one base brightness", () => {
	assert.match(tokensCss, /--sched-trip-bar-bg-lightness:\s*60%/);
	assert.match(tokensCss, /--sched-trip-bar-state-lightness-step:\s*4%/);
	assert.match(
		tokensCss,
		/--sched-trip-bar-hover-bg-lightness:\s*calc\(var\(--sched-trip-bar-bg-lightness\) \+ var\(--sched-trip-bar-state-lightness-step\)\)/,
	);
	assert.match(
		tokensCss,
		/--sched-trip-bar-pressed-bg-lightness:\s*calc\(var\(--sched-trip-bar-bg-lightness\) - var\(--sched-trip-bar-state-lightness-step\)\)/,
	);
	assert.match(tokensCss, /--sched-trip-bar-bg-opacity:\s*80%/);
	assert.match(tokensCss, /--sched-trip-bar-hover-bg-opacity:\s*70%/);
	assert.match(tokensCss, /--sched-trip-bar-pressed-bg-opacity:\s*50%/);
	assert.match(tokensCss, /--sched-trip-bar-selected-bg-opacity:\s*80%/);
});

test("trip tails use direct state surfaces instead of compounding transparency", () => {
	assert.match(tripBarCss, /--_tail-surface:\s*oklch\([^;]*var\(--sched-trip-bar-tail-opacity\)\)/);
	assert.match(tripBarCss, /--_tail-surface-active:\s*oklch\([^;]*var\(--sched-trip-bar-tail-selected-opacity\)\)/);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--multi-day\.is-active \.sched-trip-bar__tail\s*\{[^}]*background-color:\s*var\(--_tail-surface-active\)/s,
	);
	assert.doesNotMatch(
		tripBarCss,
		/\.sched-trip-bar__tail\s*\{[^}]*background-color:\s*color-mix\(/s,
	);
});

test("connected trip surfaces share one backdrop blur", () => {
	// Domain-free and portable: base/controls.css and base/badges.css read it.
	assert.match(
		ruxTokensCss,
		/--rux-backdrop-blur:\s*[1-9]\d*px/,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar:not\(\.sched-trip-bar--multi-day\),\s*\.sched-trip-bar__head,\s*\.sched-trip-bar__tail\s*\{[^}]*-webkit-backdrop-filter:\s*blur\(var\(--rux-backdrop-blur\)\)[^}]*backdrop-filter:\s*blur\(var\(--rux-backdrop-blur\)\)/s,
	);
});

test("default multi-day heads and tails meet at one shared edge", () => {
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__head\s*\{[^}]*border-inline-end:\s*0[^}]*border-start-end-radius:\s*0[^}]*border-end-end-radius:\s*0/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__tail\s*\{[^}]*grid-column:\s*2\s*\/\s*-1[^}]*border-inline-start:\s*0[^}]*border-start-start-radius:\s*0[^}]*border-end-start-radius:\s*0/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar--multi-day \.sched-trip-bar__head\s*\{[^}]*border-inline-end:\s*var\(--sched-trip-bar-border-width\) solid var\(--_outline\)[^}]*border-radius:\s*var\(--sched-trip-bar-radius\)/s,
	);
});

test("standard mode gives late-starting multi-day trips a half-day cue", () => {
	assert.match(
		appSource,
		/const lateMultiDayStart\s*=\s*placement\.span > 1\s*&&\s*!fromPrev\s*&&\s*depFrac !== null\s*&&\s*depFrac >= 16 \/ 24/s,
	);
	assert.match(
		appSource,
		/const standardStartOffset = lateMultiDayStart \? dayPct \/ 2 : 0/,
	);
	assert.match(
		appSource,
		/standardStartOffset = lateMultiDayStart \? dayPct \/ 2 : 0/,
	);
	assert.match(
		appSource,
		/spanPct - standardStartOffset/,
	);
});
