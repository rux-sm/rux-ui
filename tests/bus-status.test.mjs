import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	BUS_STATUSES,
	deriveBusStatusLabel,
	indexOutOfServiceByBus,
	isBusActive,
	isBusVisibleThisWeek,
	isOutOfServiceDuring,
	isValidOutOfServiceWindow,
	normalizeBusStatus,
	outOfServiceOn,
	outOfServiceOverlap,
} from "../js/core/bus-status.js";

const win = (start_date, end_date, extra = {}) => ({
	start_date,
	end_date,
	...extra,
});

/* ── Status ────────────────────────────────────────────────────────────── */

test("status is exactly two values", () => {
	assert.deepEqual(BUS_STATUSES, ["active", "inactive"]);
});

test("the pre-patch vocabulary still resolves, so the UI works before the migration", () => {
	// The one retired bus on this database must read as inactive whether or not
	// bus-status-patch.sql has been run yet.
	assert.equal(normalizeBusStatus("retired"), "inactive");
	assert.equal(normalizeBusStatus("inactive"), "inactive");
	// A stretch of time in a column with no dates cannot be preserved, so these
	// become active and the dates, if any, live as windows.
	assert.equal(normalizeBusStatus("maintenance"), "active");
	assert.equal(normalizeBusStatus("out-of-service"), "active");
	assert.equal(normalizeBusStatus("active"), "active");
});

test("an unknown, empty, or missing status is active rather than invisible", () => {
	// Failing closed here would hide a bus from the calendar over a typo.
	assert.equal(normalizeBusStatus(undefined), "active");
	assert.equal(normalizeBusStatus(null), "active");
	assert.equal(normalizeBusStatus(""), "active");
	assert.equal(normalizeBusStatus("something-else"), "active");
});

test("status matching ignores case and stray whitespace", () => {
	assert.equal(normalizeBusStatus(" Retired "), "inactive");
	assert.equal(normalizeBusStatus("INACTIVE"), "inactive");
});

test("isBusActive reads the normalized value", () => {
	assert.equal(isBusActive({ status: "retired" }), false);
	assert.equal(isBusActive({ status: "active" }), true);
	assert.equal(isBusActive({}), true);
});

/* ── Row visibility ────────────────────────────────────────────────────── */

test("an inactive bus earns its row back only by having something on it", () => {
	const inactive = { status: "inactive" };
	assert.equal(isBusVisibleThisWeek(inactive, false), false);
	assert.equal(isBusVisibleThisWeek(inactive, true), true);
});

test("an active bus keeps its row on an empty week", () => {
	assert.equal(isBusVisibleThisWeek({ status: "active" }, false), true);
});

test("the printed page hides an inactive bus on the same terms the grid does", () => {
	/* js/panels/print-schedule.js is a classic IIFE and cannot import this
	   module, so index.html hands the rule over on schedulerDemo. Restating the
	   status check there instead would be a second copy free to drift. */
	const html = readFileSync("index.html", "utf8");
	assert.match(
		html,
		/window\.schedulerDemo = \{[\s\S]*?\bisBusVisibleThisWeek,[\s\S]*?\n\t*\};/,
		"schedulerDemo should hand isBusVisibleThisWeek to the print panel",
	);

	const print = readFileSync("js/panels/print-schedule.js", "utf8");
	assert.match(
		print,
		/demo\.isBusVisibleThisWeek/,
		"print-schedule.js should take the rule from schedulerDemo",
	);
	assert.doesNotMatch(
		print,
		/"(?:inactive|retired)"/,
		"print-schedule.js should not carry its own copy of the status vocabulary",
	);
});

/* ── Windows ───────────────────────────────────────────────────────────── */

test("a window needs both ends, in order", () => {
	assert.equal(isValidOutOfServiceWindow(win("2026-08-24", "2026-08-26")), true);
	// Same day at both ends is one whole day out — the default the form fills in.
	assert.equal(isValidOutOfServiceWindow(win("2026-08-24", "2026-08-24")), true);
	assert.equal(isValidOutOfServiceWindow(win("2026-08-26", "2026-08-24")), false);
	assert.equal(isValidOutOfServiceWindow(win("2026-08-24", null)), false);
	assert.equal(isValidOutOfServiceWindow(win(null, "2026-08-24")), false);
	assert.equal(isValidOutOfServiceWindow(win("24/08/2026", "2026-08-24")), false);
});

test("both ends of a window are inclusive", () => {
	const windows = [win("2026-08-24", "2026-08-26")];
	assert.ok(outOfServiceOn(windows, "2026-08-24"));
	assert.ok(outOfServiceOn(windows, "2026-08-26"));
	assert.equal(outOfServiceOn(windows, "2026-08-23"), null);
	assert.equal(outOfServiceOn(windows, "2026-08-27"), null);
});

test("an invalid window never marks a day out of service", () => {
	assert.equal(outOfServiceOn([win("2026-08-26", "2026-08-24")], "2026-08-25"), null);
	assert.equal(outOfServiceOn([], "2026-08-25"), null);
	assert.equal(outOfServiceOn(undefined, "2026-08-25"), null);
});

test("a trip overlapping any part of a window is caught", () => {
	const windows = [win("2026-08-24", "2026-08-26", { id: "w1" })];
	// Trip starts before and ends inside.
	assert.equal(isOutOfServiceDuring(windows, "2026-08-22", "2026-08-25"), true);
	// Trip starts inside and ends after.
	assert.equal(isOutOfServiceDuring(windows, "2026-08-25", "2026-08-30"), true);
	// Trip straddles the whole window.
	assert.equal(isOutOfServiceDuring(windows, "2026-08-01", "2026-09-01"), true);
	// Trip sits entirely inside.
	assert.equal(isOutOfServiceDuring(windows, "2026-08-25", "2026-08-25"), true);
	// Trip ends the day before, and starts the day after.
	assert.equal(isOutOfServiceDuring(windows, "2026-08-20", "2026-08-23"), false);
	assert.equal(isOutOfServiceDuring(windows, "2026-08-27", "2026-08-29"), false);
});

test("a single-day trip can omit its end date", () => {
	const windows = [win("2026-08-24", "2026-08-26")];
	assert.equal(isOutOfServiceDuring(windows, "2026-08-25", null), true);
	assert.equal(isOutOfServiceDuring(windows, "2026-08-30", null), false);
});

test("overlap returns every window touched, not just the first", () => {
	const windows = [
		win("2026-08-24", "2026-08-26", { id: "w1" }),
		win("2026-08-28", "2026-08-30", { id: "w2" }),
		win("2026-09-10", "2026-09-11", { id: "w3" }),
	];
	const hit = outOfServiceOverlap(windows, "2026-08-25", "2026-08-29");
	assert.deepEqual(hit.map((w) => w.id), ["w1", "w2"]);
});

/* ── Derived label ─────────────────────────────────────────────────────── */

test("the fleet list's status label is derived from today's windows", () => {
	const bus = { status: "active" };
	const windows = [win("2026-08-24", "2026-08-26")];
	assert.equal(deriveBusStatusLabel(bus, windows, "2026-08-25"), "Out of service");
	assert.equal(deriveBusStatusLabel(bus, windows, "2026-08-27"), "Active");
	assert.equal(deriveBusStatusLabel(bus, [], "2026-08-25"), "Active");
});

test("inactive outranks a window — the bus is off the calendar either way", () => {
	const windows = [win("2026-08-24", "2026-08-26")];
	assert.equal(
		deriveBusStatusLabel({ status: "inactive" }, windows, "2026-08-25"),
		"Inactive",
	);
});

/* ── Indexing ──────────────────────────────────────────────────────────── */

test("a flat fetch groups by bus, skipping rows with no bus", () => {
	const byBus = indexOutOfServiceByBus([
		win("2026-08-24", "2026-08-26", { bus_id: "a" }),
		win("2026-09-01", "2026-09-02", { bus_id: "a" }),
		win("2026-08-24", "2026-08-24", { bus_id: "b" }),
		win("2026-08-24", "2026-08-24"),
	]);
	assert.equal(byBus.get("a").length, 2);
	assert.equal(byBus.get("b").length, 1);
	assert.equal(byBus.size, 2);
	assert.equal(indexOutOfServiceByBus(undefined).size, 0);
});
