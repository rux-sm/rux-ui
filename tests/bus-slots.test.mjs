import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	assignmentsOnLeg,
	busSlotCount,
	legOf,
	legsForTrip,
	missingBusSlots,
} from "../js/core/bus-slots.js";

const roundTrip = {
	trip_type: "round_trip",
	start_date: "2026-09-07",
	bus_count: 6,
};

const splitTrip = {
	trip_type: "dropoff_pickup",
	start_date: "2026-09-07",
	return_start_date: "2026-09-14",
	bus_count: 2,
	return_bus_count: 3,
};

const row = (leg, busId = "bus-1") => ({ leg, bus_id: busId });

/* ── Legs ──────────────────────────────────────────────────────────────── */

test("a null leg column reads as the outbound leg", () => {
	assert.equal(legOf({ leg: null }), "outbound");
	assert.equal(legOf({}), "outbound");
	assert.equal(legOf({ leg: "return" }), "return");
	// Anything that isn't the return leg is the outbound one — matches how
	// both callers already read the column.
	assert.equal(legOf({ leg: "unexpected" }), "outbound");
});

test("only a Drop-off / Pick-up trip with a return date has a second leg", () => {
	assert.deepEqual(legsForTrip(roundTrip), ["outbound"]);
	assert.deepEqual(legsForTrip(splitTrip), ["outbound", "return"]);
	assert.deepEqual(
		legsForTrip({ ...splitTrip, return_start_date: null }),
		["outbound"],
	);
	// A one-way trip's return date, if one somehow survives a type change, is
	// not a leg — the trip runs one way.
	assert.deepEqual(
		legsForTrip({ ...splitTrip, trip_type: "one_way" }),
		["outbound"],
	);
});

test("a trip with no start date has no legs to place", () => {
	assert.deepEqual(legsForTrip({ trip_type: "round_trip" }), []);
	assert.deepEqual(legsForTrip(null), []);
});

test("assignment rows split by leg, counting a null leg as outbound", () => {
	const rows = [row("outbound"), row(null), row("return")];
	assert.equal(assignmentsOnLeg(rows, "outbound").length, 2);
	assert.equal(assignmentsOnLeg(rows, "return").length, 1);
	assert.equal(assignmentsOnLeg(undefined, "outbound").length, 0);
});

/* ── Slot counts ───────────────────────────────────────────────────────── */

test("each leg takes its own declared bus count", () => {
	assert.equal(busSlotCount(splitTrip, "outbound", []), 2);
	assert.equal(busSlotCount(splitTrip, "return", []), 3);
});

test("a missing or zero bus count still means one bus", () => {
	assert.equal(busSlotCount({}, "outbound", []), 1);
	assert.equal(busSlotCount({ bus_count: null }, "outbound", []), 1);
	assert.equal(busSlotCount({ bus_count: 0 }, "outbound", []), 1);
});

test("the row count is a floor, so a stale bus_count can never hide a bus", () => {
	const rows = [row("outbound"), row("outbound"), row("outbound")];
	assert.equal(busSlotCount({ bus_count: 1 }, "outbound", rows), 3);
	assert.equal(missingBusSlots({ bus_count: 1 }, "outbound", rows), 0);
});

test("empty slots are the shortfall against the declared count", () => {
	// The live case this was built for: six buses asked for, three assigned.
	const rows = [row("outbound"), row("outbound"), row("outbound")];
	assert.equal(busSlotCount(roundTrip, "outbound", rows), 6);
	assert.equal(missingBusSlots(roundTrip, "outbound", rows), 3);
});

test("a trip with no rows at all needs every slot it asked for", () => {
	assert.equal(missingBusSlots(roundTrip, "outbound", []), 6);
	assert.equal(missingBusSlots(splitTrip, "return", []), 3);
});

test("a bus-less row occupies its slot rather than adding one", () => {
	// Dragging a bar onto the Unassigned row leaves a real row with a null bus.
	// It already renders there, so it must not also be synthesised.
	const rows = [row("outbound", null)];
	assert.equal(missingBusSlots({ bus_count: 1 }, "outbound", rows), 0);
});

test("one leg's rows never fill the other leg's slots", () => {
	const rows = [row("outbound"), row("outbound")];
	assert.equal(missingBusSlots(splitTrip, "outbound", rows), 0);
	assert.equal(missingBusSlots(splitTrip, "return", rows), 3);
});

/* ── Callers ───────────────────────────────────────────────────────────── */

test("the scheduler and the trip editor both place bus slots from this module", () => {
	// The rule existed twice before — inline in loadTrip, and not at all in the
	// grid, which is how a part-assigned trip could look complete. Pin both
	// call sites so a future edit cannot quietly fork it again.
	const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
	assert.match(page, /from "\.\/js\/core\/bus-slots\.js"/);
	assert.match(page, /missingBusSlots\(trip, leg, rows\)/);

	const tripDb = readFileSync(
		new URL("../js/data/trip-db.js", import.meta.url),
		"utf8",
	);
	assert.match(tripDb, /from "\.\.\/core\/bus-slots\.js"/);
	assert.match(tripDb, /busSlotCount\(normalized, "outbound", loadedAssignments\)/);
	assert.match(tripDb, /busSlotCount\(normalized, "return", loadedAssignments\)/);
	// The insert guard has to measure against the slot count, not against
	// "this leg has any row at all" — otherwise filling the fourth of six
	// buses is refused as a duplicate.
	assert.match(tripDb, /onThisLeg\.length >= busSlotCount\(/);
});
