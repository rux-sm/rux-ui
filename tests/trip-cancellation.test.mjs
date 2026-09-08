import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// A cancelled trip is a record, not work: it must not double-book buses or
// drivers, must not appear in the Tasks panel (departure prep or post-trip
// follow-up), and must not reach any driver-facing view. Cancellation itself
// unassigns the trip's drivers; the query-side exclusions below are what keep
// trips cancelled before that behavior existed equally inert.

const tripDb = await readFile(
	new URL("../js/data/trip-db.js", import.meta.url),
	"utf8",
);
const tasksPanel = await readFile(
	new URL("../js/panels/tasks-panel.js", import.meta.url),
	"utf8",
);
const driverDb = await readFile(
	new URL("../js/data/driver-db.js", import.meta.url),
	"utf8",
);
const driverShare = await readFile(
	new URL("../js/pages/driver-share.js", import.meta.url),
	"utf8",
);
const fleetDb = await readFile(
	new URL("../js/data/fleet-db.js", import.meta.url),
	"utf8",
);
const indexHtml = await readFile(
	new URL("../index.html", import.meta.url),
	"utf8",
);
const reinstatedPatch = await readFile(
	new URL("../supabase/trip-history-reinstated-patch.sql", import.meta.url),
	"utf8",
);

function between(source, startMarker, endMarker, file) {
	const start = source.indexOf(startMarker);
	assert.notEqual(start, -1, `${file} must contain "${startMarker}"`);
	const end = source.indexOf(endMarker, start);
	assert.ok(end > start, `${file} must contain "${endMarker}" after "${startMarker}"`);
	return source.slice(start, end);
}

test("a cancelled trip cannot double-book a bus or a driver", () => {
	const block = between(
		tripDb,
		"async function findAssignmentConflict",
		"── Populate",
		"trip-db.js",
	);
	assert.match(block, /\.is\("cancelled_at", null\)/);
});

test("cancelling a trip clears its bus and driver assignments", () => {
	const block = between(
		tripDb,
		"async function deleteTrip",
		"── Reinstate",
		"trip-db.js",
	);
	// The trip row is soft-deleted, never removed.
	assert.match(block, /\.update\(\{ cancelled_at: new Date\(\)\.toISOString\(\)/);
	// Counts for the history entry come from a fresh fetch — a concurrent
	// save replaces trip_assignments wholesale, so rows loaded into the panel
	// may already be stale.
	assert.match(
		block,
		/\.from\("trip_assignments"\)\s*\.select\("id, bus_id, trip_drivers\(id\)"\)\s*\.eq\("trip_id", cancelledId\)/,
	);
	// The assignment rows themselves are deleted (trip_drivers cascades),
	// so a cancelled trip holds neither buses nor drivers.
	assert.match(
		block,
		/\.from\("trip_assignments"\)\s*\.delete\(\)\s*\.eq\("trip_id", cancelledId\)/,
	);
	// A failed cleanup must not present the committed cancellation as
	// failed: the deletion is caught, its counts are zeroed so history never
	// claims an unassignment that didn't commit, and history is still
	// recorded after it.
	const catchAt = block.indexOf("catch (cleanupErr)");
	const historyAt = block.indexOf("safelyRecordTripHistory");
	assert.ok(catchAt !== -1, "assignment cleanup must be caught");
	assert.ok(historyAt > catchAt, "history must be recorded after cleanup settles");
	assert.match(block, /unassignedBuses = 0;[\s\S]*?unassignedDrivers = 0;[\s\S]*?assignmentCleanupFailed = true;/);
});

test("tasks and post-trip lists read only active trips", () => {
	assert.match(
		tasksPanel,
		/function activeTrips\(\)\s*\{\s*return \(window\.RuxTrips\?\.list\(\) \|\| \[\]\)\.filter\(\(trip\) => !trip\.cancelled_at\);\s*\}/,
	);
	// The three date-entry builders (day cards, the tab badge's default view,
	// the previous-day recovery check) all draw from the filtered list…
	assert.equal(
		(tasksPanel.match(/const allTrips = activeTrips\(\);/g) ?? []).length,
		3,
	);
	// …as do the post-trip list and its segment status dot.
	assert.match(tasksPanel, /const overTrips = activeTrips\(\)/);
	assert.match(tasksPanel, /const pending = activeTrips\(\)\.filter/);
	// The raw list survives only where no cancelled trip can be reached:
	// inside activeTrips itself, the three by-id lookups fired from rendered
	// cards, and primeBadge's has-data-arrived probe.
	assert.equal(
		(tasksPanel.match(/window\.RuxTrips\?\.list\(\)/g) ?? []).length,
		5,
	);
});

test("cancelled trips stay off driver-facing views even with leftover rows", () => {
	const tripsBlock = between(
		driverDb,
		"export async function fetchDriverTrips",
		"── Workload reporting",
		"driver-db.js",
	);
	// The check only works if the column is actually selected.
	assert.match(tripsBlock, /cancelled_at\b[\s\S]*if \(trip\.cancelled_at\) return null;/);
	const workloadBlock = between(
		driverDb,
		"export async function fetchDriverWorkloadAssignments",
		"── Shared driver schedule",
		"driver-db.js",
	);
	assert.match(workloadBlock, /\.is\("trip_assignments\.trips\.cancelled_at", null\)/);
	// The share page drops a cancelled trip's ref entirely — it must not fall
	// through to the "could not be loaded" error card.
	assert.match(driverShare, /if \(trip\.cancelled_at\) return null;/);
	const shareFetch = between(
		driverShare,
		"function fetchSharedTrips",
		"function isMissingReliefField",
		"driver-share.js",
	);
	assert.match(shareFetch, /cancelled_at/);
	// The fleet panel's per-vehicle trip list drives out-of-service clash
	// warnings — a cancelled trip must not occupy the vehicle there either.
	const busTripsBlock = between(
		fleetDb,
		"export async function fetchBusTrips",
		".sort(",
		"fleet-db.js",
	);
	assert.match(busTripsBlock, /cancelled_at\b[\s\S]*if \(trip\.cancelled_at\) return null;/);
});

test("a cancelled trip can be reinstated, and says what that does not restore", () => {
	const block = between(tripDb, "── Reinstate", "── Fetch", "trip-db.js");
	// Both columns clear together: a reason left behind on an active trip
	// would still render in Trip Finder's badge tooltip.
	assert.match(
		block,
		/\.update\(\{ cancelled_at: null, cancellation_reason: null \}\)/,
	);
	// A failed write must not report success or leave the button spinning.
	assert.match(block, /if \(error\) \{[\s\S]*?return;/);
	assert.match(block, /action: "reinstated"/);
	assert.match(block, /"rux:trip-reinstated"/);
	// Reinstating restores the trip row only — deleteTrip deleted the
	// assignment rows, and re-booking those buses and drivers behind the
	// dispatcher is the double-booking cancelling prevented.
	assert.doesNotMatch(block, /from\("trip_assignments"\)/);
	// One owner for every cancelled-dependent control, so the two callers
	// cannot disagree: cancelling an already-cancelled trip is a no-op.
	assert.match(
		block,
		/function syncCancelledState[\s\S]*?cancelBtn\.disabled = !currentTripId \|\| !!cancelledAt/,
	);
	assert.match(block, /banner\.hidden = !cancelledAt/);
	assert.equal((tripDb.match(/syncCancelledState\(root\);/g) ?? []).length, 3);
	// trip_history.action is a CHECK constraint, so an action the code emits
	// and the allowlist omits is rejected — and recordTripHistory is non-fatal,
	// so it fails as a console warning and a missing audit row. That is what
	// happened to "reinstated" on 2026-09-08. Keep the two in step.
	assert.match(reinstatedPatch, /'reinstated'/);
	assert.match(reinstatedPatch, /'cancelled'/);
});

test("the editor shows a cancelled trip's status and the way back", () => {
	// Without this the editor is identical to an active trip's, and a save
	// commits while the trip still never reaches the grid.
	assert.match(indexHtml, /id="tp-cancelled-banner"/);
	assert.match(indexHtml, /id="tp-cancelled-meta"/);
	assert.match(indexHtml, /id="tp-btn-reinstate"/);
	// The banner sits above the panes, not inside one, so it holds on every tab.
	const bodyAt = indexHtml.indexOf('class="rux-panel__body sched-scope-trip__body"');
	const bannerAt = indexHtml.indexOf('id="tp-cancelled-banner"');
	const firstPaneAt = indexHtml.indexOf('id="pane-trip"');
	assert.ok(bodyAt !== -1 && bannerAt > bodyAt && bannerAt < firstPaneAt);
	// The grid reloads so the bar comes back; the editor stays open, because
	// the trip returns with no buses and no drivers to reassign.
	assert.match(
		indexHtml,
		/addEventListener\("rux:trip-reinstated", \(\) => \{\s*loadTripsFromDB\(\);\s*\}\)/,
	);
});
