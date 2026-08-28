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
	// The guarantee is the :not() scoping, not the token name: a trip tagged
	// teal stays teal when it goes unconfirmed. docs/trip-bar.md step 4 moved
	// the tone off --sched-trip-bar-danger-border (red-800, a REST colour one
	// step darker than every other tone with nowhere to hover to); step 18
	// reduced each tone to one per-theme rest declaration. The scoping is
	// what this asserts, in both directions.
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_tone:\s*var\(--sched-trip-bar-unconfirmed-tone\)/s,
	);
	assert.doesNotMatch(
		tripBarCss,
		/\.sched-trip-bar--unconfirmed\s*\{[^}]*--_tone:/s,
	);
});

test("printed trip override colors remain visible for unconfirmed trips", () => {
	assert.match(
		printScheduleCss,
		/\.sched-print-trip--unconfirmed:not\(\[data-trip-bar-color\]\)\s*\{[^}]*--_print-trip-tint:\s*var\(--print-danger-tint\)[^}]*--_print-trip-line:\s*var\(--print-danger-line\)/s,
	);
});

test("trip bar color data is assigned independently of confirmation status", () => {
	/* The contract is the second half: a trip's colour is its own, and never a
	   function of whether it is confirmed. This used to pin the literal palette
	   array as well, which made it a copy of the list rather than a test of the
	   rule — and it failed the moment step 16 moved that list to
	   js/core/trip-colors.js. Repointed at the shape, not the membership;
	   `tests/trip-colors.test.mjs` owns the membership now. */
	const colorAssignment = tripBarSource.match(
		/const tripBarColor = normalizeTripColor\(trip\.trip_bar_color\);[\s\S]*?\n/,
	)?.[0];
	assert.ok(colorAssignment, "the colour assignment should read normalizeTripColor");
	assert.match(
		tripBarSource,
		/if \(tripBarColor\) bar\.dataset\.tripBarColor = tripBarColor;/,
	);
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
	// __summary-end, not __paid-badge: since step 10 the paid badge and bus
	// reference share one trailing grid item, so the summary stays one row.
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__summary-end\s*\{[^}]*grid-column:\s*3[^}]*justify-self:\s*end/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-scheduler--centered-trip-heads \.sched-trip-bar \.sched-trip-bar__reqs \.sched-trip-bar__pending\s*\{[^}]*margin-inline-start:\s*auto/s,
	);
	assert.match(appSource, />Center trip details<\/span/);
});

test("the bus reference is the faintest ink on the destination row", () => {
	// docs/trip-bar.md rule 2.10, step 10: the white pill was the
	// highest-contrast treatment on the surface, spent on a secondary
	// identity marker that outranked the destination it qualifies (D11).
	// Plain text in the subtle tier now, trailing the destination inside
	// __summary-end so centered-heads mode keeps the summary one grid row.
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__bus-label\s*\{[^}]*color:\s*var\(--rux-fg-on-accent-subtle\)/s,
	);
	assert.match(
		tripBarSource,
		/el\.className = "sched-trip-bar__summary-end";[\s\S]{0,120}if \(paidBadge\) el\.appendChild\(paidBadge\);[\s\S]{0,40}if \(busLabel\) el\.appendChild\(busLabel\);/,
		"paid badge sits just inside the marker, marker outermost right",
	);
	assert.doesNotMatch(
		tripBarSource,
		/__reqs";[\s\S]{0,80}busLabel/,
		"the marker has left the reqs row",
	);
});

test("trip surfaces are catalog steps, and hover is the published overlay", () => {
	// docs/trip-bar.md rule 2.12, step 18: rest is the hue's fill step — 400
	// in dark since color.md §5 step 34, 600 in light until its scales move —
	// the rung where one label per theme clears 4.5:1 on all seven tones, and
	// hover/pressed composite the published
	// --rux-state-hover-overlay / -active-overlay over rest instead of
	// stepping to a second rung. Selected is not a fill at all.
	//
	// The retired recipe tokens still EXIST — .sched-driver-grid__cell--conflict
	// reads -bg-lightness and -bg-opacity — so asserting their values would
	// keep passing while testing nothing about this component. What is
	// asserted here is that the bar's own surfaces are the steps.
	assert.match(tripBarCss, /--_surface:\s*var\(--_tone\);/);
	assert.match(tripBarCss, /--_surface-active:\s*var\(--_tone\);/);

	const declarations = tripBarCss.replace(/\/\*[\s\S]*?\*\//g, "");
	// The paired-step machinery is gone: hover is not a second fill.
	assert.doesNotMatch(
		declarations,
		/--_(tone|surface|trip-bar-color|tail-surface)-(hover|pressed):/,
		"a hover/pressed surface is a second fill again instead of an overlay",
	);

	// No trip surface may reconstitute the old recipe.
	assert.doesNotMatch(
		declarations,
		/--_surface[a-z-]*:\s*oklch\([^;]*--sched-trip-bar-(bg|hover-bg|pressed-bg|selected-bg)-(lightness|opacity)/,
		"a head surface is back on the lightness/opacity recipe",
	);

	// Hover and pressed are the shared overlays, composited over an unmoved
	// rest fill, and the article-level rules exclude multi-day bars, whose
	// states paint on __head/__tail so the seam gap stays unpainted.
	assert.match(
		tripBarCss,
		/\.sched-trip-bar:hover:not\(\.is-active\):not\(\.sched-trip-bar--multi-day\)\s*\{[^}]*background-image:\s*linear-gradient\(var\(--rux-state-hover-overlay\), var\(--rux-state-hover-overlay\)\)/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar:active:not\(\.is-active\):not\(\.sched-trip-bar--multi-day\)\s*\{[^}]*background-image:\s*linear-gradient\(var\(--rux-state-active-overlay\), var\(--rux-state-active-overlay\)\)/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--multi-day:hover:not\(\.is-active\) \.sched-trip-bar__head\s*\{[^}]*--rux-state-hover-overlay/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--multi-day:hover:not\(\.is-active\) \.sched-trip-bar__tail\s*\{[^}]*--rux-state-hover-overlay/s,
	);

	// Every categorical tone rests on 400 in dark and 600 in light — one
	// declaration per tone per theme, no paired hover step. Dark moved 500 ->
	// 400 with the three-step model: on the even ramp 500 carries no white
	// label (4.44 worst) and 400 clears every tone at 7.36-10.15.
	const lightAt = tokensCss.indexOf(':root[data-theme="light"]');
	assert.ok(lightAt > 0, "scheduler tokens must keep a light-theme block");
	const darkTokens = tokensCss.slice(0, lightAt);
	const lightTokens = tokensCss.slice(lightAt);
	for (const hue of ["teal", "green", "purple", "amber", "pink"]) {
		assert.match(tripBarCss, new RegExp(`--_trip-bar-color:\\s*var\\(--sched-trip-color-${hue}\\)`));
		assert.match(darkTokens, new RegExp(`--sched-trip-color-${hue}:\\s*var\\(--rux-${hue}-400\\)`));
		assert.match(lightTokens, new RegExp(`--sched-trip-color-${hue}:\\s*var\\(--rux-${hue}-600\\)`));
		assert.doesNotMatch(tokensCss, new RegExp(`--sched-trip-color-${hue}-hover:`));
	}
	// The two status tones take the same per-theme split.
	assert.match(darkTokens, /--sched-trip-bar-confirmed-tone:\s*var\(--rux-blue-400\)/);
	assert.match(lightTokens, /--sched-trip-bar-confirmed-tone:\s*var\(--rux-blue-600\)/);
	assert.match(darkTokens, /--sched-trip-bar-unconfirmed-tone:\s*var\(--rux-red-400\)/);
	assert.match(lightTokens, /--sched-trip-bar-unconfirmed-tone:\s*var\(--rux-red-600\)/);

	// Selected is a ring, not a third fill.
	assert.match(
		tripBarCss,
		/\.sched-trip-bar\.is-active\s*\{[^}]*outline:\s*var\(--sched-trip-bar-selected-ring-width\) solid var\(--sched-trip-bar-selected-ring-color\)/s,
	);
	// On a multi-day bar the article is transparent and __head/__tail paint
	// over an inset article outline, so the ring is an overlay pseudo there
	// and the occluded article outline is unset (docs/trip-bar.md D17).
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--multi-day\.is-active::after\s*\{[^}]*outline:\s*var\(--sched-trip-bar-selected-ring-width\) solid var\(--sched-trip-bar-selected-ring-color\)/s,
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar--multi-day\.is-active\s*\{[^}]*outline:\s*none/s,
	);
	// Amber's lightness exception is gone; nothing may re-scope that token.
	// Checked against DECLARATIONS only — the stylesheet comment that records
	// why the exception existed quotes the old value verbatim, and a rule that
	// cannot tell a declaration from a note about one would forbid explaining
	// itself.
	const declarationsOnly = tripBarCss.replace(/\/\*[\s\S]*?\*\//g, "");
	assert.doesNotMatch(
		declarationsOnly,
		/--sched-trip-bar-bg-lightness:\s*\d/,
		"a tone is overriding the retired lightness recipe again",
	);
});

test("ONE label for both themes, and every dependent token resolves against it (D16)", () => {
	// docs/trip-bar.md rule 2.12, step 18, as corrected by color.md §5 step 47.
	//
	// THIS TEST USED TO REQUIRE A LABEL PER THEME — white in dark, the
	// catalog's near-black in light — and that is exactly what broke. The
	// near-black was correct only while light's rest rung was Geist's lighter
	// 600; step 47 put the light scales back on step 36's ramp, where 600 is
	// L32 and paints rgb(0,34,140). The near-black label measured 1.52:1 on it
	// in the running app. The fill is dark in BOTH themes now (dark 400 = L40,
	// light 600 = L32), so there is ONE label and light does not override it.
	//
	// The light block must therefore NOT restate --sched-trip-bar-fg: a
	// per-theme label is the thing that encoded the broken assumption, so its
	// absence is asserted rather than merely tolerated.
	const lightAt = tokensCss.indexOf(':root[data-theme="light"]');
	const darkTokens = tokensCss.slice(0, lightAt);
	const lightTokens = tokensCss.slice(lightAt).replace(/\/\*[\s\S]*?\*\//g, "");
	assert.match(darkTokens, /--sched-trip-bar-fg:\s*var\(--rux-fg-on-fill\)/);
	assert.match(darkTokens, /--sched-trip-bar-fg-muted:\s*oklch\(from var\(--rux-fg-on-fill\) l c h \/ 87%\)/);
	assert.doesNotMatch(
		lightTokens,
		/--sched-trip-bar-fg(-muted)?:/,
		"light theme is overriding the trip-bar label again — the fill is dark in both themes, so one white label serves both (color.md step 47)",
	);
	// The bar rebinds the on-accent family for its subtree.
	assert.match(
		tripBarCss,
		/\.sched-trip-bar\s*\{[\s\S]*?--rux-fg-on-accent:\s*var\(--sched-trip-bar-fg\);[\s\S]*?--rux-fg-on-accent-muted:\s*var\(--sched-trip-bar-fg-muted\);[\s\S]*?--rux-fg-on-accent-subtle:\s*var\(--sched-trip-bar-fg-muted\);/,
	);
	// D16's shape: a var() in a :root declaration substitutes at :root, so a
	// :root token that must follow the theme reads --sched-trip-bar-fg
	// directly — pointing it at --rux-fg-on-accent would freeze it to the
	// root's white forever. (--sched-trip-bar-meta-fg, D16's original site,
	// was deleted with the rest of the meta-panel family at step 8; the time
	// row now reads --rux-fg-on-accent on-element, where the bar's own
	// override makes that correct.)
	assert.match(tokensCss, /--sched-trip-bar-selected-ring-color:\s*var\(--sched-trip-bar-fg\)/);
	assert.doesNotMatch(
		tokensCss.replace(/\/\*[\s\S]*?\*\//g, ""),
		/--sched-trip-bar-selected-ring-color:\s*var\(--rux-fg-on-accent\)/,
		"a :root trip-bar token is reading the on-accent family again (D16)",
	);
	assert.doesNotMatch(
		tokensCss.replace(/\/\*[\s\S]*?\*\//g, ""),
		/--sched-trip-bar-meta-/,
		"the meta-panel token family stays deleted (Q3, step 8)",
	);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__time\s*\{[^}]*color:\s*var\(--rux-fg-on-accent\)/s,
	);
	// The notes row is a warning-coloured ink per theme, and the two steps are
	// NOT mirror images by accident: the ramp inverts, so the light end of the
	// scale is a LOW step in light theme and a HIGH one in dark. amber-900
	// (dark) and amber-200 (light) are both L90. It was amber-1000 in light
	// until step 47, which is L12 there — near-black text on a near-black
	// fill, the same inversion bug as the label above. Never
	// --rux-warning-on-vivid, which is the near-black for text ON a warning
	// fill (docs/trip-bar.md D18, step 20).
	assert.match(darkTokens, /--sched-trip-bar-notes-fg:\s*var\(--rux-amber-900\)/);
	assert.match(lightTokens, /--sched-trip-bar-notes-fg:\s*var\(--rux-amber-200\)/);
	assert.match(
		tripBarCss,
		/\.sched-trip-bar__notes\s*\{[^}]*color:\s*var\(--sched-trip-bar-notes-fg\)/s,
	);
	assert.doesNotMatch(
		tripBarCss.replace(/\/\*[\s\S]*?\*\//g, ""),
		/__notes\s*\{[^}]*warning-on-vivid/s,
		"the notes row is back on the on-fill ink (D18)",
	);
});

test("driver status is a modifier class, and the dead dot mechanism stays dead", () => {
	// docs/trip-bar.md rule 2.9, step 7 (state.md rule 2.1): a status colour
	// is a class the stylesheet owns, never element.style — and the classes
	// read the same status-icon tokens the pending icons use. The only
	// .style write left in the component is measured geometry
	// (--_details-height), which is state, not a design value.
	assert.match(
		tripBarSource,
		/classList\.add\(`sched-trip-bar__driver-role-icon--\$\{tone\}`\)/,
	);
	assert.doesNotMatch(
		tripBarSource,
		/\.style\.color\s*=/,
		"a design value is being written from JS again (rule 2.9)",
	);
	// Declarations only — the rationale comments may name the dead family.
	assert.doesNotMatch(
		tripBarSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
		/driver-dot|driverStateClass/,
	);
	assert.doesNotMatch(
		tripBarCss.replace(/\/\*[\s\S]*?\*\//g, ""),
		/__driver-dot/,
	);
	for (const tone of ["danger", "warning", "success"]) {
		assert.match(
			tripBarCss,
			new RegExp(
				`\\.sched-trip-bar__driver-role-icon--${tone}\\s*\\{[^}]*color:\\s*var\\(--sched-trip-bar-${tone}-icon\\)`,
			),
		);
	}
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
