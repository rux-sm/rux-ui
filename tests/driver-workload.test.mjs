import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	aggregateDriverWorkload,
	workloadPresetStartDate,
} from "../js/core/driver-workload.js";

const drivers = [
	{ id: "a", name: "Alex" },
	{ id: "b", name: "Blair" },
];

test("both assigned drivers receive full trip days, miles, and their own pay", () => {
	const result = aggregateDriverWorkload(
		drivers,
		[
			{ driverId: "a", tripId: "t1", startDate: "2026-08-01", endDate: "2026-08-03", miles: 600, pay: 900 },
			{ driverId: "b", tripId: "t1", startDate: "2026-08-01", endDate: "2026-08-03", miles: 600, pay: 900 },
		],
		{ startDate: "2026-08-01", endDate: "2026-08-04" },
	);
	for (const row of result.rows) {
		assert.equal(row.daysWorked, 3);
		assert.equal(row.tripsAssigned, 1);
		assert.equal(row.milesTotal, 600);
		assert.equal(row.payTotal, 900);
	}
});

test("days are distinct and clipped to the selected range", () => {
	const [row] = aggregateDriverWorkload(
		[drivers[0]],
		[
			{ driverId: "a", tripId: "t1", startDate: "2026-07-31", endDate: "2026-08-02", miles: 100, pay: 100 },
			{ driverId: "a", tripId: "t2", startDate: "2026-08-02", endDate: "2026-08-04", miles: 200, pay: 200 },
		],
		{ startDate: "2026-08-01", endDate: "2026-08-03" },
	).rows;
	assert.equal(row.daysWorked, 3);
	assert.equal(row.tripsAssigned, 2);
	assert.equal(row.payTotal, 300);
});

test("missing and recorded-zero values remain distinguishable", () => {
	const result = aggregateDriverWorkload(
		[drivers[0]],
		[
			{ driverId: "a", tripId: "missing", startDate: "2026-08-01", miles: null, pay: null },
			{ driverId: "a", tripId: "zero", startDate: "2026-08-02", miles: 0, pay: 0 },
		],
		{ startDate: "2026-08-01", endDate: "2026-08-04" },
	);
	const [row] = result.rows;
	assert.equal(row.payKnownCount, 1);
	assert.equal(row.payMissingCount, 1);
	assert.equal(row.milesKnownTripCount, 1);
	assert.equal(row.milesMissingCount, 1);
	assert.equal(result.missingPayAssignments, 1);
	assert.equal(result.missingMileageTrips, 1);
});

test("trip mileage is counted once when a driver has multiple assignment records", () => {
	const [row] = aggregateDriverWorkload(
		[drivers[0]],
		[
			{ driverId: "a", tripId: "t1", assignmentId: "out", startDate: "2026-08-01", miles: 400, pay: 500 },
			{ driverId: "a", tripId: "t1", assignmentId: "return", startDate: "2026-08-03", miles: 400, pay: 500 },
		],
		{ startDate: "2026-08-01", endDate: "2026-08-04" },
	).rows;
	assert.equal(row.tripsAssigned, 1);
	assert.equal(row.milesTotal, 400);
	assert.equal(row.payTotal, 1000);
});

test("range presets are inclusive of today", () => {
	assert.equal(workloadPresetStartDate("30", "2026-08-04"), "2026-07-06");
	assert.equal(workloadPresetStartDate("90", "2026-08-04"), "2026-05-07");
	assert.equal(workloadPresetStartDate("ytd", "2026-08-04"), "2026-01-01");
});

test("roster and workload share one table while workload controls live in options", () => {
	const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
	assert.equal(html.match(/id="driver-roster-body"/g)?.length, 1);
	assert.doesNotMatch(html, /id="driver-workload-(?:view|body)"/);

	const optionsStart = html.indexOf('id="driver-workload-options-card"');
	const optionsEnd = html.indexOf('id="driver-view-options-card"');
	const optionsMarkup = html.slice(optionsStart, optionsEnd);
	assert.ok(optionsStart > -1 && optionsEnd > optionsStart);
	assert.match(optionsMarkup, /data-workload-preset="30"/);
	assert.match(optionsMarkup, /id="driver-workload-start"/);
});
