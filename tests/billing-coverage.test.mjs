import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/core/billing-config.js", import.meta.url), "utf8");
const tripBarSource = await readFile(new URL("../js/components/trip-bar.js", import.meta.url), "utf8");
const tripBarCss = await readFile(new URL("../css/features/trip-bar.css", import.meta.url), "utf8");
const context = {
	window: {},
	console,
	document: { dispatchEvent() {} },
	CustomEvent: class CustomEvent {},
};
vm.runInNewContext(source, context);
const billing = context.window.RuxBilling;

test("partial PO confirms the trip but preserves its warning status", () => {
	const state = {
		poReceived: true,
		poAmount: 6000,
		price: 10000,
		paid: 2000,
		balance: 8000,
	};
	assert.equal(billing.deriveStatus(state), "po_partial");
	assert.equal(billing.isStateConfirmed(state), true);
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

test("trip bars render partial PO with a strong warning indicator", () => {
	assert.match(tripBarSource, /key:\s*"partial_po"[\s\S]*?icon:\s*"request_quote"[\s\S]*?tone:\s*"warning"[\s\S]*?paymentStatus === "po_partial"/);
	assert.match(tripBarCss, /\.rux-trip-bar__pending-icon--warning\s*\{[^}]*color:\s*var\(--rux-warning-strong\)/s);
});

test("partial PO warns through the outline without replacing the trip color", () => {
	assert.match(tripBarSource, /paymentStatus === "po_partial"\s*\?\s*"rux-trip-bar--partial-po"/);
	const rule = tripBarCss.match(/\.rux-trip-bar--partial-po\s*\{([^}]*)\}/s)?.[1] ?? "";
	assert.match(rule, /--_outline:\s*var\(--rux-warning-strong\)/);
	assert.match(rule, /--rux-trip-bar-border-width:\s*2px/);
	assert.doesNotMatch(rule, /--_tone|background/);
});
