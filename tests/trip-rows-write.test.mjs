import test from "node:test";
import assert from "node:assert/strict";

import { planRows, writeRows } from "../js/core/trip-rows-write.js";

// Enough of the query builder for the writes: insert().select().single(),
// update().eq().eq() and delete().eq().in().
function fakeClient(rows) {
	let next = 1;
	const calls = [];
	return {
		rows, calls,
		from(table) {
			const filters = [];
			let action = null;
			let payload = null;
			const b = {
				insert(p) { action = "insert"; payload = p; return b; },
				update(p) { action = "update"; payload = p; return b; },
				delete() { action = "delete"; return b; },
				select() { return b; },
				single() { return b; },
				eq(k, v) { filters.push((r) => String(r[k]) === String(v)); return b; },
				in(k, v) { filters.push((r) => v.map(String).includes(String(r[k]))); return b; },
				then(resolve) {
					calls.push({ table, action, payload });
					const hit = (r) => filters.every((f) => f(r));
					if (action === "insert") {
						const row = { id: `new-${next++}`, ...payload };
						rows.push(row);
						return resolve({ data: { id: row.id }, error: null });
					}
					if (action === "update") rows.filter(hit).forEach((r) => Object.assign(r, payload));
					if (action === "delete") {
						const gone = rows.filter(hit);
						gone.forEach((r) => rows.splice(rows.indexOf(r), 1));
					}
					return resolve({ data: null, error: null });
				},
			};
			return b;
		},
	};
}

const loaded = [
	{ id: "p1", trip_id: "t1", position: 0, amount: 500, method: "Check", date: "2026-07-01", ref: "1001" },
	{ id: "p2", trip_id: "t1", position: 1, amount: "250.00", method: "Card", date: null, ref: null },
];

test("an untouched list writes nothing", async () => {
	const rows = loaded.map((r) => ({ ...r }));
	const client = fakeClient(rows);
	const after = [
		{ id: "p1", position: 0, amount: 500, method: "Check", date: "2026-07-01", ref: "1001" },
		{ id: "p2", position: 1, amount: 250, method: "Card", date: "", ref: null },
	];
	await writeRows(client, "trip_payments", "t1", loaded, after, ["amount", "method", "date", "ref"]);
	assert.deepEqual(client.calls, []);
});

test("a changed row is updated in place, keeping its id", async () => {
	const plan = planRows(loaded, [
		{ id: "p1", position: 0, amount: 600, method: "Check", date: "2026-07-01", ref: "1001" },
		{ id: "p2", position: 1, amount: 250, method: "Card", date: null, ref: null },
	], ["amount", "method", "date", "ref"]);
	assert.deepEqual(plan.updates.map((u) => u.id), ["p1"]);
	assert.equal(plan.inserts.length, 0);
	assert.deepEqual(plan.deletes, []);
});

test("a removed row is deleted, a new one inserted and handed its id", async () => {
	const rows = [...loaded.map((r) => ({ ...r }))];
	const client = fakeClient(rows);
	const added = { id: null, position: 1, amount: 75, method: "Cash", date: null, ref: null };
	const saved = await writeRows(client, "trip_payments", "t1", loaded,
		[{ id: "p1", position: 0, amount: 500, method: "Check", date: "2026-07-01", ref: "1001" }, added],
		["amount", "method", "date", "ref"]);
	assert.equal(rows.find((r) => r.id === "p2"), undefined);
	assert.ok(added.savedId);
	assert.deepEqual(saved.map((r) => r.id), ["p1", added.savedId]);
});

test("a row the other app added after the form loaded is never deleted", async () => {
	const rows = [...loaded.map((r) => ({ ...r })), { id: "theirs", trip_id: "t1", position: 2, amount: 90 }];
	const client = fakeClient(rows);
	await writeRows(client, "trip_payments", "t1", loaded,
		loaded.map(({ trip_id, ...r }) => r), ["amount", "method", "date", "ref"]);
	assert.ok(rows.find((r) => r.id === "theirs"));
});
