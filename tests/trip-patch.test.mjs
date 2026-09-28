import test from "node:test";
import assert from "node:assert/strict";

import { mergedNeeds, sameTripValue, tripPatch, trueNeeds } from "../js/core/trip-patch.js";

test("an untouched form writes nothing, however each side holds its values", () => {
	const opened = {
		destination: "Laredo, TX", notes: null, quoted_price: 1669, bus_count: 2,
		confirmed: true, po_received: null, trip_reqs: { sleeper: true, pax56: false },
		trip_contact_2_id: null, itinerary_confirmed: undefined,
	};
	const form = {
		destination: "Laredo, TX", notes: "", quoted_price: "1669", bus_count: 2,
		confirmed: true, po_received: false, trip_reqs: { sleeper: true },
		trip_contact_2_id: "", itinerary_confirmed: false, contact_not_needed: undefined,
	};
	assert.deepEqual(tripPatch(form, opened), {});
});

test("only the changed columns are written, with the form's values", () => {
	const opened = { destination: "Laredo, TX", notes: "Gate B", quoted_price: 1669, trip_bar_color: "teal" };
	const form = { destination: "Laredo, TX", notes: "Gate C", quoted_price: "1700", trip_bar_color: "teal" };
	assert.deepEqual(tripPatch(form, opened), { notes: "Gate C", quoted_price: "1700" });
});

test("a column cleared in the form is written as cleared", () => {
	assert.deepEqual(tripPatch({ notes: null }, { notes: "Gate B" }), { notes: null });
	assert.deepEqual(tripPatch({ confirmed: false }, { confirmed: true }), { confirmed: false });
});

test("a need turned on or off counts as a change; false and missing do not differ", () => {
	assert.equal(sameTripValue("trip_reqs", { a: true, b: false }, { a: true }), true);
	assert.equal(sameTripValue("trip_reqs", { a: true, b: true }, { a: true }), false);
	assert.deepEqual(trueNeeds({ b: true, a: true, c: false }), ["a", "b"]);
});

test("the needs map keeps what the trip held and sets what the form draws", () => {
	const held = { sleeper: true, outlets: true, hotel: false };
	const merged = mergedNeeds(held, { sleeper: false, pax56: true, hotel: true });
	assert.deepEqual(merged, { sleeper: false, outlets: true, hotel: true, pax56: true });
	assert.deepEqual(mergedNeeds(null, { pax56: true }), { pax56: true });
});
