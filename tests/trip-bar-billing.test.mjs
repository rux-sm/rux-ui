import test from "node:test";
import assert from "node:assert/strict";

import { allElements, installDom } from "./dom-fixture.mjs";

installDom();
// createTripBar installs document/window listeners and an SVG stripe layer on
// first use. The fixture models elements, not a browser, so these four are
// stubbed rather than implemented — none of them affects which indicators a
// bar renders, which is all this file asserts.
globalThis.document.addEventListener ??= () => {};
globalThis.document.createElementNS ??= (ns, tag) => globalThis.document.createElement(tag);
globalThis.requestAnimationFrame ??= (fn) => fn();
globalThis.window ??= {
	addEventListener() {},
	removeEventListener() {},
	RuxBilling: { STATUS_META: { deposit_received: { icon: "payments" } } },
};

const { createTripBar } = await import("../js/components/trip-bar.js");

function trip(overrides = {}) {
	return {
		id: "trip-1",
		customer: "MCHI VB Booster",
		destination: "Cedar Park, TX",
		startDate: "2026-08-26",
		endDate: "2026-08-27",
		driverStatus: "confirmed",
		drivers: [],
		assignments: [],
		trip_stops: [],
		trip_documents: [],
		...overrides,
	};
}

function warningTooltips(bar) {
	return allElements(bar)
		.filter((el) => String(el.className || "").includes("sched-trip-bar__pending-icon--warning"))
		.map((el) => el.dataset.tooltip);
}

test("a partly paid trip with no PO warns with the open balance", () => {
	const bar = createTripBar(trip({
		paymentStatus: "deposit_received",
		quotedPrice: 5525,
		trip_payments: [{ amount: 4225, method: "Check", ref: "5502" }],
	}));
	assert.deepEqual(warningTooltips(bar), ["$1,300 not covered by payment or PO"]);
});

test("the open balance warns without unconfirming the trip or taking an outline", () => {
	const bar = createTripBar(trip({
		paymentStatus: "deposit_received",
		quotedPrice: 5525,
		trip_payments: [{ amount: 4225 }],
	}));
	// A deposit outranks a partial PO in STEP_ORDER, so the bar must keep the
	// plain confirmed surface — the outline modifiers belong to the rungs below.
	assert.doesNotMatch(bar.className, /sched-trip-bar--unconfirmed/);
	assert.doesNotMatch(bar.className, /sched-trip-bar--pending-po/);
	assert.doesNotMatch(bar.className, /sched-trip-bar--partial-po/);
});

test("a PO that under-covers keeps its own warning and does not double up", () => {
	const bar = createTripBar(trip({
		paymentStatus: "po_partial",
		quotedPrice: 5525,
		trip_payments: [{ amount: 4225 }],
	}));
	assert.deepEqual(warningTooltips(bar), ["Partial PO — authorization incomplete"]);
});

test("a fully paid trip carries no balance warning", () => {
	const bar = createTripBar(trip({
		paymentStatus: "paid_full",
		quotedPrice: 5525,
		trip_payments: [{ amount: 5525 }],
	}));
	assert.deepEqual(warningTooltips(bar), []);
});

test("a payment against no quoted price does not invent a balance", () => {
	const bar = createTripBar(trip({
		paymentStatus: "deposit_received",
		quotedPrice: null,
		trip_payments: [{ amount: 500 }],
	}));
	assert.deepEqual(warningTooltips(bar), []);
});

test("rows saved before the payments list fall back to the deposit aggregate", () => {
	const bar = createTripBar(trip({
		paymentStatus: "deposit_received",
		quotedPrice: 5525,
		deposit_amount: 4225,
		trip_payments: [],
	}));
	assert.deepEqual(warningTooltips(bar), ["$1,300 not covered by payment or PO"]);
});

test("a fractional balance prints both cents", () => {
	const bar = createTripBar(trip({
		paymentStatus: "deposit_received",
		quotedPrice: 5525,
		trip_payments: [{ amount: 4224.5 }],
	}));
	assert.deepEqual(warningTooltips(bar), ["$1,300.50 not covered by payment or PO"]);
});
