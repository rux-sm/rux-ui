import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/core/billing-config.js", import.meta.url), "utf8");
const context = {
	window: {},
	console,
	document: { dispatchEvent() {} },
	CustomEvent: class CustomEvent {},
};
vm.runInNewContext(source, context);
const billing = context.window.RuxBilling;
// Objects built inside the vm carry its prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

test("the single PO columns mirror the first PO by position and the sum of the amounts", () => {
	const columns = plain(billing.listMirror({
		pos: [
			{ position: 1, ref: "4472", amount: 5000 },
			{ position: 0, ref: "4471", amount: "10000.50" },
		],
		invoices: [],
	}));
	assert.deepEqual(columns, {
		po_received: true,
		po_ref: "4471",
		po_amount: 15000.5,
		invoiced: false,
		invoice_status: "Pending",
		invoice_number: null,
	});
});

test("PO rows with no amount leave po_amount empty, not zero", () => {
	const columns = billing.listMirror({ pos: [{ position: 0, ref: "4471", amount: null }] });
	assert.equal(columns.po_received, true);
	assert.equal(columns.po_amount, null);
});

test("the invoice columns mirror the first invoice", () => {
	const columns = billing.listMirror({
		invoices: [
			{ position: 0, number: "INV-9", amount: 100 },
			{ position: 1, number: "INV-10", amount: 50 },
		],
	});
	assert.equal(columns.invoiced, true);
	assert.equal(columns.invoice_status, "Invoiced");
	assert.equal(columns.invoice_number, "INV-9");
});

test("rows are written by id: a new row inserts, a removed row deletes, an unchanged row is left", () => {
	const before = [
		{ id: "a", position: 0, ref: "1", amount: 100, date: null },
		{ id: "b", position: 1, ref: "2", amount: 200, date: null },
	];
	const after = [
		{ id: "a", position: 0, ref: "1", amount: "100.00", date: "" },
		{ id: null, position: 1, ref: "3", amount: 300, date: "2026-09-01" },
	];
	const diff = plain(billing.diffListRows(before, after, ["ref", "amount", "date"]));
	assert.deepEqual(diff.deletes, ["b"]);
	assert.deepEqual(diff.updates, []);
	assert.deepEqual(diff.inserts, [{ position: 1, ref: "3", amount: 300, date: "2026-09-01" }]);
});

test("an edited or moved row updates by its id", () => {
	const before = [{ id: "a", position: 0, number: "INV-1", amount: 100, date: null }];
	const after = [{ id: "a", position: 0, number: "INV-1b", amount: 100, date: null }];
	const diff = plain(billing.diffListRows(before, after, ["number", "amount", "date"]));
	assert.deepEqual(diff.updates, [{ id: "a", values: { position: 0, number: "INV-1b", amount: 100, date: null } }]);
	assert.deepEqual(diff.inserts, []);
	assert.deepEqual(diff.deletes, []);
});

test("a row saved elsewhere after loading is not in before, so nothing touches it", () => {
	const before = [{ id: "a", position: 0, ref: "1", amount: 100, date: null }];
	const after = [{ id: "a", position: 0, ref: "1", amount: 100, date: null }];
	const diff = plain(billing.diffListRows(before, after, ["ref", "amount", "date"]));
	assert.deepEqual(diff, { inserts: [], updates: [], deletes: [] });
});

test("an id that was not loaded with this trip inserts a new row instead of overwriting", () => {
	const diff = plain(billing.diffListRows([], [{ id: "other-trip-row", position: 0, ref: "9", amount: 1, date: null }], ["ref", "amount", "date"]));
	assert.deepEqual(diff.updates, []);
	assert.deepEqual(diff.inserts, [{ position: 0, ref: "9", amount: 1, date: null }]);
});
