import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The maintenance share page is handed to people outside the office, so a
// change line on it has to belong to a trip actually on the page. trip_ref
// cannot decide that — it is not unique in the live table — so the filter
// matches by trip id, then falls back to the trip's own dates.

const source = await readFile(
	new URL("../js/pages/maintenance-share.js", import.meta.url),
	"utf8",
);

// maintenance-share.js boots against the DOM and Supabase at module scope, so
// the filter is read out of source rather than imported, as trip-cancellation
// and trip-ref do for their modules.
function loadFilter(text) {
	const start = text.indexOf("function changesForDisplayedRange");
	assert.notEqual(start, -1, "maintenance-share.js must define changesForDisplayedRange");
	const end = text.indexOf("\nfunction ", start + 1);
	assert.ok(end > start, "changesForDisplayedRange must be followed by another function");
	const block = text.slice(start, end);
	// The filter's only dependency is the module's date() helper.
	const date = "function date(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }";
	return new Function(`${date}; ${block}; return changesForDisplayedRange;`)();
}

const changesForDisplayedRange = loadFilter(source);

const displayed = {
	rangeStart: "2027-06-01",
	rangeEnd: "2027-06-07",
	trips: [{ id: "trip-a", tripRef: "TRP270601-001" }],
};

test("a change for a displayed trip is kept, matched by id", () => {
	const rows = [{ tripId: "trip-a", tripRef: "TRP270601-001", action: "updated" }];
	assert.equal(changesForDisplayedRange(rows, displayed).length, 1);
});

test("a change for a trip whose dates fall in the range is kept", () => {
	// No id match — the trip is not on the page — but it overlaps the range,
	// which is what the maintenance crew is being shown.
	const rows = [{
		tripId: "trip-c",
		tripStartDate: "2027-06-03",
		tripEndDate: "2027-06-04",
	}];
	assert.equal(changesForDisplayedRange(rows, displayed).length, 1);
});

// The regression. trip-b is a different trip that happens to share trip-a's
// ref, and its dates are nowhere near the displayed range.
test("a change for a different trip sharing a displayed ref is dropped", () => {
	const rows = [{
		tripId: "trip-b",
		tripRef: "TRP270601-001",
		tripStartDate: "2027-04-10",
		tripEndDate: "2027-04-19",
		action: "assignment_changed",
	}];
	assert.deepEqual(changesForDisplayedRange(rows, displayed), []);
});

test("a ref match cannot rescue a row with no id and no usable dates", () => {
	const rows = [{ tripRef: "TRP270601-001", tripStartDate: null, tripEndDate: null }];
	assert.deepEqual(changesForDisplayedRange(rows, displayed), []);
});

test("a change outside the range with no id match is dropped", () => {
	const rows = [{
		tripId: "trip-d",
		tripStartDate: "2027-01-02",
		tripEndDate: "2027-01-03",
	}];
	assert.deepEqual(changesForDisplayedRange(rows, displayed), []);
});

test("the filter never consults trip_ref", () => {
	const start = source.indexOf("function changesForDisplayedRange");
	const end = source.indexOf("\nfunction ", start + 1);
	const block = source.slice(start, end);
	assert.doesNotMatch(block, /displayedRefs/);
	assert.doesNotMatch(block, /row\.tripRef/);
});
