import test from "node:test";
import assert from "node:assert/strict";

import { planStops, sameStopValue } from "../js/core/trip-stops-write.js";

// A round trip as the scheduler saved it: a spot typed for the customer, a day
// row, and a stop back at the pickup that arrives before the bus leaves it.
const stored = [
	{ id: "p", leg: "outbound", position: 0, type: "pickup", name: "School", spot: "06:00:00", depart_prev: "03:10:00", drive: "3:05", miles: "152.3", dwell_status: "on" },
	{ id: "s1", leg: "outbound", position: 1, type: "stop", name: "Stadium", depart_prev: "06:30:00", arrive: "10:30:00", dwell_status: "on" },
	{ id: "d", leg: "outbound", position: 2, type: "day", name: "Day 2" },
	{ id: "s2", leg: "outbound", position: 3, type: "stop", name: "School", depart_prev: "18:00:00", arrive: "18:30:00", dwell_status: "on" },
	{ id: "r", leg: "outbound", position: 4, type: "return", name: "Yard", depart_prev: "18:45:00", arrive: "21:50:00", drive: "3:05", dwell_status: "on" },
];

// The same trip as rux-ui's form builds it: its own spot (depart − 15), the
// drop-off's arrival equal to the bus leaving, no day row.
const form = (over = {}) => [
	{ leg: "outbound", position: 0, type: "pickup", name: "School", spot: "06:15", depart_prev: "03:10", drive: "3:05", miles: "152.3", dwell_status: "on", ...over.pickup },
	{ leg: "outbound", position: 1, type: "stop", name: "Stadium", depart_prev: "06:30", arrive: "10:30", dwell_status: "on", ...over.s1 },
	{ leg: "outbound", position: 2, type: "stop", name: "School", depart_prev: "18:00", arrive: "18:45", dwell_status: "on", ...over.s2 },
	{ leg: "outbound", position: 3, type: "return", name: "Yard", depart_prev: "18:45", arrive: "21:50", drive: "3:05", dwell_status: "on", ...over.back },
];

test("an untouched save writes nothing, keeping the typed spot, the day row and the drop-off's own arrival", () => {
	const plan = planStops({ loaded: stored, baseline: form(), current: form() });
	assert.deepEqual(plan, { updates: [], inserts: [], deletes: [], positions: [] });
});

test("a changed departure writes only the columns it moves, on their own rows", () => {
	const current = form({ pickup: { spot: "06:45", depart_prev: "03:40" }, s1: { depart_prev: "07:00" } });
	const plan = planStops({ loaded: stored, baseline: form(), current });
	assert.deepEqual(plan.updates, [
		{ id: "p", values: { depart_prev: "03:40", spot: "06:45" } },
		{ id: "s1", values: { depart_prev: "07:00" } },
	]);
	assert.deepEqual(plan.inserts, []);
	assert.deepEqual(plan.positions, []);
});

test("a leg missing its return gets one at its end, and the next leg moves down", () => {
	const loaded = [
		...stored.filter((r) => r.id !== "r"),
		{ id: "rp", leg: "return", position: 4, type: "pickup", name: "Stadium" },
		{ id: "rr", leg: "return", position: 5, type: "return", name: "Yard" },
	];
	const back = [
		{ leg: "return", position: 4, type: "pickup", name: "Stadium" },
		{ leg: "return", position: 5, type: "return", name: "Yard" },
	];
	const plan = planStops({ loaded, baseline: [...form(), ...back], current: [...form(), ...back] });
	assert.equal(plan.inserts.length, 1);
	assert.equal(plan.inserts[0].type, "return");
	assert.equal(plan.inserts[0].leg, "outbound");
	assert.equal(plan.inserts[0].position, 4);
	assert.deepEqual(plan.positions, [{ id: "rp", position: 5 }, { id: "rr", position: 6 }]);
	assert.deepEqual(plan.deletes, []);
});

test("day and sleeper rows are never deleted", () => {
	const plan = planStops({ loaded: stored, baseline: form(), current: form({ s2: { name: "Gym" } }) });
	assert.ok(!plan.deletes.includes("d"));
	assert.deepEqual(plan.updates, [{ id: "s2", values: { name: "Gym" } }]);
});

test("a trip that stopped being a split loses its return leg's rows, and only those", () => {
	const loaded = [...stored, { id: "rp", leg: "return", position: 5, type: "pickup" }, { id: "rr", leg: "return", position: 6, type: "return" }];
	const plan = planStops({ loaded, baseline: form(), current: form(), dropLegs: ["return"] });
	assert.deepEqual(plan.deletes.sort(), ["rp", "rr"]);
	assert.deepEqual(plan.updates, []);
});

test("a new trip inserts every row, numbered from 0", () => {
	const plan = planStops({ loaded: [], baseline: [], current: form() });
	assert.deepEqual(plan.inserts.map((r) => [r.type, r.position]), [["pickup", 0], ["stop", 1], ["stop", 2], ["return", 3]]);
	assert.deepEqual(plan.updates, []);
});

test("a leg with no stops yet gets its first after the pickup", () => {
	const loaded = [
		{ id: "p", leg: "outbound", position: 0, type: "pickup", name: "School" },
		{ id: "r", leg: "outbound", position: 1, type: "return", name: "Yard" },
	];
	const current = [
		{ leg: "outbound", position: 0, type: "pickup", name: "School" },
		{ leg: "outbound", position: 1, type: "stop", name: "Stadium", depart_prev: "07:00" },
		{ leg: "outbound", position: 2, type: "return", name: "Yard" },
	];
	const plan = planStops({ loaded, baseline: current, current });
	assert.equal(plan.inserts.length, 1);
	assert.equal(plan.inserts[0].position, 1);
	assert.deepEqual(plan.positions, [{ id: "r", position: 2 }]);
});

test("times compare to the minute, numbers by value, blanks alike", () => {
	assert.equal(sameStopValue("spot", "06:00:00", "06:00"), true);
	assert.equal(sameStopValue("miles", "152.30", 152.3), true);
	assert.equal(sameStopValue("label", "", null), true);
	assert.equal(sameStopValue("arrive", "18:30", "18:45"), false);
});

test("the rows after a save hold the plan's changes and the new ids", async () => {
	const { applyStopPlan } = await import("../js/core/trip-stops-write.js");
	const loaded = stored.filter((r) => r.id !== "r");
	const current = form({ s1: { depart_prev: "07:00" } });
	const plan = planStops({ loaded, baseline: form(), current });
	const after = applyStopPlan(loaded, plan, ["new-return"]);
	assert.deepEqual(after.map((r) => r.id), ["p", "s1", "d", "s2", "new-return"]);
	assert.equal(after.find((r) => r.id === "s1").depart_prev, "07:00");
	// Saved again untouched, from those rows, it writes nothing.
	assert.deepEqual(planStops({ loaded: after, baseline: current, current }),
		{ updates: [], inserts: [], deletes: [], positions: [] });
});
