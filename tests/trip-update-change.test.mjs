import test from "node:test";
import assert from "node:assert/strict";

import { changeSentence, customerChange, shownUpdates, updateStamp } from "../js/core/trip-update-change.js";

const none = { inserts: [], updates: [], deletes: [] };

test("a save the customer would not ask about names nothing", () => {
	assert.equal(customerChange({ patch: { trip_bar_color: "teal", bus_count: 2, notes: "Gate B" }, payments: none }), null);
});

test("each change is named in the scheduler's words, the first as the line", () => {
	const change = customerChange({
		patch: { start_date: "2026-10-03", end_date: "2026-10-04", destination: "Laredo, TX", quoted_price: "1700" },
		before: { start_date: "2026-10-02", end_date: "2026-10-04" },
	});
	assert.deepEqual(change.keys, ["dates", "destination", "quote"]);
	assert.equal(change.line, "Moved the dates to Oct 3–Oct 4");
	assert.equal(changeSentence(change, false),
		"You moved the dates to Oct 3–Oct 4, changed the destination to Laredo, TX and quoted $1,700.");
});

test("a changed itinerary or trip type is a route change", () => {
	assert.deepEqual(customerChange({ route: true }).keys, ["route"]);
	assert.deepEqual(customerChange({ patch: { trip_type: "one_way" } }).keys, ["route"]);
});

test("a new PO, invoice or payment row is named by its own value", () => {
	const change = customerChange({
		pos: { ...none, inserts: [{ ref: "4410", amount: 900 }] },
		invoices: { ...none, deletes: ["7"] },
		payments: { ...none, inserts: [{ amount: 250 }] },
	});
	assert.deepEqual(change.said, ["Added PO 4410", "Changed the invoice", "Recorded a payment of $250"]);
});

test("the booking contact and the contract", () => {
	assert.equal(customerChange({ patch: { booking_contact_name: "Ana Ruiz" } }).line, "Changed the booking contact to Ana Ruiz");
	assert.equal(customerChange({ patch: { booking_contact_phone: "555" } }).line, "Changed the booking contact");
	assert.equal(customerChange({ patch: { contract_status: "Signed" } }).line, "Contract signed");
});

test("a new trip and an unnamed change each have their own sentence", () => {
	assert.equal(changeSentence(null, true), "You created the trip. Say what the customer has been sent.");
	assert.equal(changeSentence(null, false), "Say what changed, or save with no update.");
});

test("a skipped prompt is never drawn, and an old note has no time or author", () => {
	assert.deepEqual(shownUpdates([{ kind: "nothing" }, { kind: "update", body: "x" }]).map((u) => u.body), ["x"]);
	const stamp = updateStamp({ kind: "imported", created_at: "2026-03-04T12:00:00Z" }, new Date("2026-09-30T12:00:00"));
	assert.match(stamp, /^Mar 4 · From the old notes$/);
	assert.match(updateStamp({ kind: "update", created_at: "2025-03-04T12:00:00Z", actor_name: "Ana", edited_at: "x" },
		new Date("2026-09-30T12:00:00")), /2025.* · Ana · edited$/);
});
