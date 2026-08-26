import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TRIP_COLORS, normalizeTripColor } from "../js/core/trip-colors.js";

/* The board's categorical palette. It lived as four copies of one array
   literal plus swatch markup until step 16 (docs/foundations/color.md Q9), and
   removing a single colour meant finding all five — which is what this file
   and js/core/trip-colors.js exist to prevent happening twice. */

/* Every name the board has ever stored, and what it renders as now. The whole
   point of retiring colours this way: nothing was migrated, so rows in Supabase
   still hold these. They must keep a colour rather than lose one — if any of
   these ever returns "", those trips silently go uncoloured on the board. */
const RETIRED_NAMES = [
	["orange", "amber"], // step 16 — the board had two warm hues, the catalog has one
	["cyan", "teal"],    // step 17 — onto the catalog's hue
	["yellow", "amber"], // step 17 — onto the catalog's hue
];

test("every retired name still renders as its replacement", () => {
	for (const [stored, shown] of RETIRED_NAMES) {
		assert.equal(normalizeTripColor(stored), shown, `${stored} should render as ${shown}`);
		assert.ok(!TRIP_COLORS.includes(stored), `${stored} must not be selectable`);
		assert.ok(TRIP_COLORS.includes(shown), `${shown} must be a live colour`);
	}
});

test("the palette is the catalog's unclaimed hues", () => {
	/* red is danger and blue is the accent, so five remain — the set is closed
	   by the catalog rather than chosen, which is what step 17 settled. */
	assert.deepEqual([...TRIP_COLORS].sort(), ["amber", "green", "pink", "purple", "teal"]);
});

test("a live colour passes through and an unknown one is dropped", () => {
	for (const c of TRIP_COLORS) assert.equal(normalizeTripColor(c), c);
	for (const junk of ["", null, undefined, "puce", "ORANGE"])
		assert.equal(normalizeTripColor(junk), "");
});

test("every published colour has a token, and no token outlives its colour", () => {
	/* TWO FAMILIES SINCE color.md §5 step 38, because a trip bar and an avatar
	   are not the same function. The bar carries a white label AND a 900 status
	   icon — rule 2.14's F1 and F2 together — so it stays on 400 through
	   --sched-trip-color-*. The avatar carries initials alone, F1 only, so it
	   takes the categorical fill band at 500. Each is built by hand from a
	   colour name, so a colour without a token renders nothing and a token
	   without a colour is dead — asserted for both.

	   Unique names, not raw declarations: each trip tone is legitimately
	   declared once per theme since docs/trip-bar.md step 18. */
	const sched = readFileSync("scheduler/css/tokens.css", "utf8");
	const tripTones = new Set(
		[...sched.matchAll(/--sched-trip-color-([a-z]+)\s*:/g)].map((m) => m[1]),
	);
	assert.deepEqual(
		[...tripTones].sort(),
		[...TRIP_COLORS].sort(),
		"the trip bar's 400 family must match the palette",
	);

	/* avatarColorValue builds `--rux-${color}-fill-control`. The band publishes
	   all seven hues, not just the five a user can pick, so this is coverage
	   rather than equality — an unpickable hue on the band is not dead, it is
	   there for the next categorical consumer. */
	const tokens = readFileSync("rux-ui/css/tokens.css", "utf8");
	const band = new Set(
		[...tokens.matchAll(/--rux-([a-z]+)-fill-control\s*:/g)].map((m) => m[1]),
	);
	const missing = TRIP_COLORS.filter((c) => !band.has(c));
	assert.deepEqual(
		missing,
		[],
		"a pickable avatar colour has no fill-control token, so it renders nothing",
	);
});

test("every swatch previews the token the thing actually renders", () => {
	/* A swatch is a PROMISE about what you will get. Both pickers had drifted
	   from what they preview, in opposite directions and for different reasons:
	   the avatar swatches showed the trip bar's rung until step 38 moved
	   avatars off it, and the trip bar's "Standard blue" showed --rux-accent —
	   the 900 ink — while a default bar paints --sched-trip-bar-confirmed-tone,
	   so it promised #78d9ff and delivered #0038b0 (step 44).

	   Both sides are derived from source here rather than listed, so this fails
	   when EITHER the renderer or the swatch moves and the other does not. */
	const html = readFileSync("index.html", "utf8");
	const swatches = [
		...html.matchAll(
			/name="(tripBarColor|profileAvatarColor)"\s*\n?\s*value="([a-z]*)"[\s\S]*?--color:\s*var\(\s*([-a-z0-9]+)/g,
		),
	].map((m) => ({ picker: m[1], value: m[2], token: m[3] }));
	assert.ok(swatches.length >= 12, `only found ${swatches.length} swatches`);

	// What the TRIP BAR renders: the per-colour rule, and the no-override fallback.
	const barCss = readFileSync("scheduler/css/features/trip-bar.css", "utf8");
	const barFallback = barCss.match(
		/--_tone:\s*var\(\s*--_trip-bar-color\s*,\s*var\(\s*([-a-z0-9]+)/,
	)?.[1];
	assert.ok(barFallback, "could not read the trip bar's no-override tone");

	// What an AVATAR renders: avatarColorValue builds the name from the colour.
	const avatarJs = readFileSync("js/core/avatar.js", "utf8");
	const avatarPattern = avatarJs.match(/`var\(--rux-\$\{color\}([-a-z]+)\)`/)?.[1];
	assert.ok(avatarPattern, "could not read avatarColorValue's token shape");
	const avatarDefault = readFileSync("rux-ui/css/base/content.css", "utf8")
		.match(/\.rux-avatar \{[^}]*background:\s*var\(\s*([-a-z0-9]+)/)?.[1];
	assert.ok(avatarDefault, "could not read .rux-avatar's default background");

	const wrong = [];
	for (const { picker, value, token } of swatches) {
		let expected;
		if (picker === "tripBarColor") {
			expected = value ? `--sched-trip-color-${value}` : barFallback;
		} else {
			expected = value ? `--rux-${value}${avatarPattern}` : avatarDefault;
		}
		if (token !== expected)
			wrong.push(`${picker} "${value}" previews ${token}, renders ${expected}`);
	}
	assert.deepEqual(wrong, [], "a swatch promises a colour its target does not paint");
});

test("no swatch offers a colour the palette does not publish", () => {
	const html = readFileSync("index.html", "utf8");
	const offered = new Set(
		[...html.matchAll(/name="(?:tripBarColor|profileAvatarColor)"\s*\n?\s*value="([a-z]+)"/g)]
			.map((m) => m[1]),
	);
	const stray = [...offered].filter((c) => !TRIP_COLORS.includes(c));
	assert.deepEqual(stray, [], "a picker offers a retired or unknown colour");
});

test("the one copy that cannot import stays in step", () => {
	/* js/panels/print-schedule.js is a classic IIFE loaded with `defer`, so it
	   cannot import the module. It carries the list by hand and says so; this
	   is what keeps that honest. */
	const print = readFileSync("js/panels/print-schedule.js", "utf8");
	const list = print.match(/\[((?:"[a-z]+",?\s*)+)\]\.includes\(printColor\)/)?.[1];
	assert.ok(list, "print-schedule.js should filter on the palette");
	const names = [...list.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
	assert.deepEqual(names.sort(), [...TRIP_COLORS].sort());

	/* and its copy of the retired map, which is the half that keeps old rows
	   rendering on paper as well as on screen. */
	const map = print.match(/\{([^}]*)\}\[tripBarColor\]/)?.[1];
	assert.ok(map, "print-schedule.js should map retired names");
	for (const [stored, shown] of RETIRED_NAMES)
		assert.match(
			map,
			new RegExp(`${stored}:\\s*"${shown}"`),
			`print-schedule.js is missing ${stored} -> ${shown}`,
		);
});
