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

test("partial PO remains pending even when a deposit has been received", () => {
	const state = {
		poReceived: true,
		poAmount: 6000,
		price: 10000,
		paid: 2000,
		balance: 8000,
	};
	assert.equal(billing.deriveStatus(state), "po_partial");
	assert.equal(billing.isStateConfirmed(state), false);
});

test("a PO covering the quote reaches the received authorization state", () => {
	const state = { poReceived: true, poAmount: 10000, price: 10000 };
	assert.equal(billing.deriveStatus(state), "po_received");
	assert.equal(billing.isStateConfirmed(state), true);
});

test("legacy PO records without an amount preserve their previous coverage", () => {
	const normalized = billing.normalizeRecord({
		po_received: true,
		quoted_price: 10000,
	});
	assert.equal(normalized.poAmount, 10000);
	assert.equal(billing.deriveStatus(normalized), "po_received");
});

test("new records with an explicit empty PO amount remain partial", () => {
	assert.equal(billing.deriveRecordStatus({
		po_received: true,
		po_amount: null,
		quoted_price: 10000,
	}), "po_partial");
});
