import test from "node:test";
import assert from "node:assert/strict";

import { applyVehicleNeedChanges, writeTripAssignments } from "../js/core/trip-assignment-write.js";

/* A stand-in for the Supabase client over two in-memory tables, enough of the
   query builder for the writes under test: select with trip_drivers nested,
   insert with select().single(), update and delete filtered by eq and in. */
function fakeClient(tables) {
	let nextId = 1;
	const matches = (row, filters) => filters.every(([k, v, op]) =>
		op === "in" ? v.map(String).includes(String(row[k])) : String(row[k]) === String(v));
	return {
		tables,
		from(name) {
			const filters = [];
			let action = null;
			let payload = null;
			let single = false;
			const builder = {
				select() { if (!action) action = "select"; return builder; },
				insert(p) { action = "insert"; payload = p; return builder; },
				update(p) { action = "update"; payload = p; return builder; },
				delete() { action = "delete"; return builder; },
				eq(k, v) { filters.push([k, v, "eq"]); return builder; },
				in(k, v) { filters.push([k, v, "in"]); return builder; },
				single() { single = true; return builder; },
				then(resolve) { resolve(run()); },
			};
			const run = () => {
				const rows = tables[name];
				if (action === "select") {
					const data = rows.filter((r) => matches(r, filters)).map((r) => ({
						...r,
						trip_drivers: tables.trip_drivers
							.filter((d) => d.assignment_id === r.id)
							.map((d) => ({ id: d.id, role: d.role })),
					}));
					return { data, error: null };
				}
				if (action === "insert") {
					const made = (Array.isArray(payload) ? payload : [payload])
						.map((p) => ({ id: `row-${nextId++}`, ...p }));
					rows.push(...made);
					return { data: single ? { id: made[0].id } : made, error: null };
				}
				if (action === "update") {
					rows.filter((r) => matches(r, filters)).forEach((r) => Object.assign(r, payload));
					return { data: null, error: null };
				}
				if (action === "delete") {
					const doomed = rows.filter((r) => matches(r, filters)).map((r) => r.id);
					tables[name] = rows.filter((r) => !doomed.includes(r.id));
					if (name === "trip_assignments") {
						tables.trip_drivers = tables.trip_drivers.filter((d) => !doomed.includes(d.assignment_id));
					}
					return { data: null, error: null };
				}
				throw new Error(`unhandled ${action}`);
			};
			return builder;
		},
	};
}

function tripWithTwoBuses() {
	return fakeClient({
		trip_assignments: [
			{ id: "a1", trip_id: "t1", bus_id: "bus-218", position: 0, leg: "outbound",
				active_roles: ["driver"], needs: { adaLift: true }, vehicle_type: "Coach" },
			{ id: "a2", trip_id: "t1", bus_id: "bus-763", position: 1, leg: "outbound",
				active_roles: ["driver", "relief-start"], needs: { pax56: true }, vehicle_type: null },
			{ id: "other", trip_id: "t2", bus_id: "bus-470", position: 0, leg: "outbound",
				active_roles: ["driver"], needs: {}, vehicle_type: null },
		],
		trip_drivers: [
			{ id: "d1", assignment_id: "a1", role: "driver", driver_id: "george", pay: null },
			{ id: "d2", assignment_id: "a2", role: "driver", driver_id: "raul", pay: null },
			{ id: "d3", assignment_id: "a2", role: "relief-start", driver_id: "jose", pay: null },
			{ id: "d9", assignment_id: "other", role: "driver", driver_id: "maria", pay: null },
		],
	});
}

const seat = (role, driver_id) => ({ role, driver_id, pay: null, report_time: null, instructions: null });

test("a save that changes a bus and a driver keeps each row, its id and its needs", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-470", position: 0, leg: "outbound", active_roles: ["driver"],
			drivers: [seat("driver", "hector")] },
		{ id: "a2", bus_id: "bus-763", position: 1, leg: "outbound", active_roles: ["driver", "relief-start"],
			drivers: [seat("driver", "raul"), seat("relief-start", "jose")] },
	]);
	const a1 = client.tables.trip_assignments.find((r) => r.id === "a1");
	assert.equal(a1.bus_id, "bus-470");
	assert.deepEqual(a1.needs, { adaLift: true });
	assert.equal(a1.vehicle_type, "Coach");
	assert.deepEqual(client.tables.trip_assignments.find((r) => r.id === "a2").needs, { pax56: true });
	const d1 = client.tables.trip_drivers.find((d) => d.id === "d1");
	assert.equal(d1.driver_id, "hector", "the driver's seat is updated in place");
	assert.equal(client.tables.trip_drivers.filter((d) => d.assignment_id === "a1").length, 1);
});

test("a role switched off loses its seat, and a new role gets one", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver", "co-driver"],
			drivers: [seat("driver", "george"), seat("co-driver", "ana")] },
		{ id: "a2", bus_id: "bus-763", position: 1, leg: "outbound", active_roles: ["driver"],
			drivers: [seat("driver", "raul")] },
	]);
	const roles = (id) => client.tables.trip_drivers.filter((d) => d.assignment_id === id).map((d) => d.role).sort();
	assert.deepEqual(roles("a1"), ["co-driver", "driver"]);
	assert.deepEqual(roles("a2"), ["driver"]);
	assert.equal(client.tables.trip_drivers.find((d) => d.id === "d3"), undefined);
});

test("a bus taken off the form is deleted with its drivers, and another trip is untouched", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver"],
			drivers: [seat("driver", "george")] },
	]);
	assert.deepEqual(client.tables.trip_assignments.map((r) => r.id).sort(), ["a1", "other"]);
	assert.deepEqual(client.tables.trip_drivers.map((d) => d.id).sort(), ["d1", "d9"]);
});

test("a new bus is inserted with its drivers and reports its new id", async () => {
	const client = tripWithTwoBuses();
	const added = { id: null, bus_id: "bus-607", position: 2, leg: "outbound", active_roles: ["driver"],
		drivers: [seat("driver", "oscar")] };
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver"], drivers: [seat("driver", "george")] },
		{ id: "a2", bus_id: "bus-763", position: 1, leg: "outbound", active_roles: ["driver", "relief-start"],
			drivers: [seat("driver", "raul"), seat("relief-start", "jose")] },
		added,
	]);
	assert.ok(added.savedId);
	const row = client.tables.trip_assignments.find((r) => r.id === added.savedId);
	assert.equal(row.trip_id, "t1");
	assert.equal(row.bus_id, "bus-607");
	assert.deepEqual(client.tables.trip_drivers.filter((d) => d.assignment_id === added.savedId).map((d) => d.driver_id), ["oscar"]);
});

test("a row with no bus keeps its row and its needs", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: null, position: 0, leg: "outbound", active_roles: ["driver"], drivers: [] },
		{ id: "a2", bus_id: "bus-763", position: 1, leg: "outbound", active_roles: ["driver", "relief-start"],
			drivers: [seat("driver", "raul"), seat("relief-start", "jose")] },
	]);
	const a1 = client.tables.trip_assignments.find((r) => r.id === "a1");
	assert.equal(a1.bus_id, null);
	assert.deepEqual(a1.needs, { adaLift: true });
	assert.equal(client.tables.trip_drivers.find((d) => d.id === "d1"), undefined, "its driver seat is emptied");
});

test("an id another dispatcher already deleted is inserted as new", async () => {
	const client = tripWithTwoBuses();
	const stale = { id: "gone-row", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver"],
		drivers: [seat("driver", "george")] };
	await writeTripAssignments(client, "t1", [stale]);
	assert.ok(stale.savedId);
	assert.deepEqual(client.tables.trip_assignments.filter((r) => r.trip_id === "t1").map((r) => r.id), [stale.savedId]);
});

test("without the relief columns a driver is written without them", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver"],
			drivers: [{ ...seat("driver", "george"), report_time: "08:00", instructions: "Meet at gate" }] },
	], { shareFields: false });
	const d1 = client.tables.trip_drivers.find((d) => d.id === "d1");
	assert.equal("report_time" in d1, false);
	assert.equal("instructions" in d1, false);
});

test("a vehicle need turned on here goes to every vehicle, keeping their own", async () => {
	const client = tripWithTwoBuses();
	await applyVehicleNeedChanges(client, "t1", ["sleeper"], []);
	const needs = (id) => client.tables.trip_assignments.find((r) => r.id === id).needs;
	assert.deepEqual(needs("a1"), { adaLift: true, sleeper: true });
	assert.deepEqual(needs("a2"), { pax56: true, sleeper: true });
	assert.deepEqual(needs("other"), {}, "another trip is untouched");
});

test("a vehicle need turned off here comes off every vehicle", async () => {
	const client = tripWithTwoBuses();
	await applyVehicleNeedChanges(client, "t1", [], ["adaLift"]);
	assert.deepEqual(client.tables.trip_assignments.find((r) => r.id === "a1").needs, {});
	assert.deepEqual(client.tables.trip_assignments.find((r) => r.id === "a2").needs, { pax56: true });
});

test("no change writes nothing", async () => {
	const client = tripWithTwoBuses();
	const before = JSON.stringify(client.tables);
	await applyVehicleNeedChanges(client, "t1", [], []);
	assert.equal(JSON.stringify(client.tables), before);
});

test("a bus row added elsewhere after the form loaded is left alone", async () => {
	const client = tripWithTwoBuses();
	await writeTripAssignments(client, "t1", [
		{ id: "a1", bus_id: "bus-218", position: 0, leg: "outbound", active_roles: ["driver"], drivers: [seat("driver", "george")] },
	], { loadedIds: new Set(["a1"]) });
	assert.ok(client.tables.trip_assignments.find((r) => r.id === "a2"), "a2 was not loaded, so it stays");
});
