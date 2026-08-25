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
	/* avatarColorValue builds `--sched-trip-color-${color}` by hand, so a colour
	   without a token renders nothing and a token without a colour is dead.
	   Unique names, not raw declarations: each tone is legitimately declared
	   once per theme since docs/trip-bar.md step 18 (500 dark, 600 light). */
	const css = readFileSync("scheduler/css/tokens.css", "utf8");
	const declared = new Set(
		[...css.matchAll(/--sched-trip-color-([a-z]+)\s*:/g)].map((m) => m[1]),
	);
	assert.deepEqual([...declared].sort(), [...TRIP_COLORS].sort());
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
