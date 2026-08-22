import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TRIP_COLORS, normalizeTripColor } from "../js/core/trip-colors.js";

/* The board's categorical palette. It lived as four copies of one array
   literal plus swatch markup until step 16 (docs/foundations/color.md Q9), and
   removing a single colour meant finding all five — which is what this file
   and js/core/trip-colors.js exist to prevent happening twice. */

test("orange is retired but still renders", () => {
	/* The whole point of retiring it this way: nothing was migrated, so rows in
	   Supabase still hold "orange". They must keep a colour rather than lose
	   one. If this ever returns "", every historically-orange trip silently
	   goes uncoloured on the board. */
	assert.equal(normalizeTripColor("orange"), "yellow");
	assert.ok(!TRIP_COLORS.includes("orange"), "orange is not selectable");
});

test("a live colour passes through and an unknown one is dropped", () => {
	for (const c of TRIP_COLORS) assert.equal(normalizeTripColor(c), c);
	for (const junk of ["", null, undefined, "puce", "ORANGE"])
		assert.equal(normalizeTripColor(junk), "");
});

test("every published colour has a token, and no token outlives its colour", () => {
	/* avatarColorValue builds `--sched-trip-color-${color}` by hand, so a colour
	   without a token renders nothing and a token without a colour is dead. */
	const css = readFileSync("scheduler/css/tokens.css", "utf8");
	const declared = [...css.matchAll(/--sched-trip-color-([a-z]+)\s*:/g)].map((m) => m[1]);
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
	assert.match(print, /printColor = tripBarColor === "orange" \? "yellow"/);
});
