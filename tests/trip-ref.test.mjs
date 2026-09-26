import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// A trip's number, trip_ref, is its estimate number: six digits the database
// hands out on the trip's first save and never changes, whichever app saves
// it. The trips_set_trip_ref trigger overrides any number a save sends, so a
// page that made its own would show one number while the trip holds another.

const tripDb = await readFile(
	new URL("../js/data/trip-db.js", import.meta.url),
	"utf8",
);

test("the trip save sends no trip number", () => {
	assert.doesNotMatch(tripDb, /trip_ref\s*=/);
	assert.doesNotMatch(tripDb, /trip_ref\s*:/);
});

test("no trip number is made in the browser", () => {
	assert.doesNotMatch(tripDb, /function (tripRefStem|nextTripRef|generateTripRef)\b/);
});
