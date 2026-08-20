import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/core/billing-config.js", import.meta.url), "utf8");
const notificationSource = await readFile(new URL("../js/data/notification-db.js", import.meta.url), "utf8");
const tripBarSource = await readFile(new URL("../js/components/trip-bar.js", import.meta.url), "utf8");
const tripBarCss = await readFile(new URL("../scheduler/css/features/trip-bar.css", import.meta.url), "utf8");
const tokenSource = await readFile(new URL("../scheduler/css/tokens.css", import.meta.url), "utf8");
const context = {
	window: {},
	console,
	document: { dispatchEvent() {} },
	CustomEvent: class CustomEvent {},
};
vm.runInNewContext(source, context);
const billing = context.window.RuxBilling;

test("PO and payments that do not cover the quote preserve the partial warning", () => {
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

test("a PO covering the remaining unpaid balance clears partial status", () => {
	const state = {
		poReceived: true,
		poAmount: 1300,
		price: 3800,
		paid: 2500,
		balance: 1300,
	};
	assert.equal(billing.deriveStatus(state), "po_received");
	assert.equal(billing.isStateConfirmed(state), true);
});

test("readiness alerts use the shared billing result instead of a stale confirmed flag", () => {
	assert.match(notificationSource, /RuxBilling\?\.isRecordConfirmed\?\.\(trip\)/);
	assert.match(notificationSource, /billingStatus === "po_partial"/);
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
	assert.match(tripBarCss, /\.sched-trip-bar__pending-icon--warning\s*\{[^}]*color:\s*var\(--sched-trip-bar-warning-icon\)/s);
});

test("partial PO warns through the outline without replacing the trip color", () => {
	assert.match(tripBarSource, /paymentStatus === "po_partial"\s*\?\s*"sched-trip-bar--partial-po"/);
	const rule = tripBarCss.match(/\.sched-trip-bar--partial-po\s*\{([^}]*)\}/s)?.[1] ?? "";
	assert.match(rule, /--_outline:\s*var\(--sched-trip-bar-warning-border\)/);
	assert.match(rule, /--sched-trip-bar-border-width:\s*1px/);
	assert.doesNotMatch(rule, /--_tone|background/);
});

test("trip bar action buttons use the compact 32px component contract", () => {
	assert.match(tokenSource, /--sched-trip-bar-action-button-size:\s*32px/);
	assert.match(tripBarSource, /rux-button--sm rux-button--block sched-trip-bar__action/);
	assert.match(tripBarCss, /\.sched-trip-bar__action\s*\{[^}]*--_h:\s*var\(--sched-trip-bar-action-button-size\)/s);
});
