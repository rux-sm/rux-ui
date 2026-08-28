/* The Grid tab's model — js/components/itinerary-grid.js.
 *
 * Only the pure half is exercised here: day derivation, the v3 conversions,
 * and the inversion that reads the Itinerary tab's stops. init() is the only
 * part that touches the DOM, and `new Function` never runs it.
 *
 * deriveDays is the one worth the most coverage. It is the tab's whole claim
 * — that a dispatcher types times and never a date — so every way a day can
 * advance needs a case, and so does every way one must NOT.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("../js/components/itinerary-grid.js", import.meta.url),
	"utf8",
);

// The module is an IIFE that publishes onto window, matching itinerary.js and
// the classic <script> tag that loads it. A bare object is enough of a window:
// the pure functions read window.RuxSettings optionally and nothing else.
const host = {};
new Function("window", source)(host);

const {
	fromV3, toV3, deriveDays, fromEditorStops, normalizeStop,
	legRisks, yardPlan, dutyByDay, sameAddress, toEditorStops, toCleanV3, localityOf,
} = host.ItineraryGrid;

// legRisks and dutyByDay both take the derived days alongside the stops, so
// every case here builds both from one list.
function withDays(...raw) {
	const stops = raw.map(normalizeStop);
	return [stops, deriveDays(stops)];
}

const YARD = "2801 Zinnia Ave, McAllen, TX 78504";
const days = (...stops) => deriveDays(stops.map(normalizeStop));

function v3(stops, startDate = "2026-07-27") {
	return {
		schema_version: 3,
		trip: {
			type: "round_trip",
			service_type: "charter",
			destination: "Austin, TX",
			legs: { outbound: { start_date: startDate, stops } },
		},
	};
}

/* ── deriveDays ──────────────────────────────────────────────────────── */

test("a day that only moves forward stays day zero", () => {
	assert.deepEqual(
		days(
			{ type: "pickup", depart: "05:00" },
			{ type: "stop", arrive: "10:00", depart: "14:30" },
			{ type: "return", arrive: "20:00" },
		),
		[
			{ arriveDay: 0, departDay: 0 },
			{ arriveDay: 0, departDay: 0 },
			{ arriveDay: 0, departDay: 0 },
		],
	);
});

test("a departure earlier than its own arrival crossed midnight", () => {
	const result = days(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "15:30", depart: "07:00" },
		{ type: "return", arrive: "20:00" },
	);
	assert.deepEqual(result[1], { arriveDay: 0, departDay: 1 }, "the overnight departs the next day");
	assert.deepEqual(result[2], { arriveDay: 1, departDay: 1 }, "and everything after stays there");
});

test("an arrival earlier than the previous departure crossed midnight too", () => {
	const result = days(
		{ type: "pickup", depart: "22:00" },
		{ type: "stop", arrive: "02:00", depart: "06:00" },
	);
	assert.deepEqual(result[1], { arriveDay: 1, departDay: 1 });
});

test("a held day is added on top of what the clock derives", () => {
	// Two nights parked at the same casino: the times alone read as one.
	const result = days(
		{ type: "pickup", depart: "06:00" },
		{ type: "stop", arrive: "16:30", depart: "09:00" },
		{ type: "stop", arrive: "10:00", depart: "11:00", extraDays: 1 },
	);
	assert.deepEqual(result[1], { arriveDay: 0, departDay: 1 });
	assert.deepEqual(result[2], { arriveDay: 2, departDay: 2 }, "the held day lands on top of the rollover");
});

test("a stop with no times at all does not advance the day", () => {
	const result = days(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop" },
		{ type: "stop", arrive: "10:00" },
	);
	assert.deepEqual(result[1], { arriveDay: 0, departDay: 0 });
	assert.deepEqual(result[2], { arriveDay: 0, departDay: 0 });
});

test("equal times do not roll over — only strictly earlier ones do", () => {
	const result = days(
		{ type: "pickup", depart: "09:00" },
		{ type: "stop", arrive: "09:00", depart: "09:00" },
	);
	assert.deepEqual(result[1], { arriveDay: 0, departDay: 0 });
});

/* ── v3 ──────────────────────────────────────────────────────────────── */

test("a v3 draft loads one-to-one, with no carry-forward", () => {
	const state = fromV3(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", name: "School", address: "101 E Hackberry Ave", departure_time: "05:00" },
		{ type: "stop", name: "Field", address: "1300 E MLK", activity: "game", arrival_time: "10:00", departure_time: "14:30" },
		{ type: "return", arrival_time: "20:00" },
	]));

	assert.equal(state.startDate, "2026-07-27");
	assert.deepEqual(
		state.stops.map((stop) => [stop.type, stop.arrive, stop.depart]),
		[
			["yard_origin", "", "04:15"],
			["pickup", "", "05:00"],
			["stop", "10:00", "14:30"],
			["return", "20:00", ""],
		],
		"each stop keeps its own two times — the field's 14:30 does not move to the return",
	);
	assert.equal(state.stops[2].activity, "game");
});

test("the yard bookends are filled from settings, not from the draft", () => {
	// The prompt deliberately never writes the yard out; the app owns it.
	const state = fromV3(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", departure_time: "05:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	assert.equal(state.stops[0].address, YARD);
	assert.equal(state.stops[2].address, YARD);
});

test("a sleeper's rest window becomes its arrive and depart", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "sleeper", name: "Lot", rest_start_time: "22:00", rest_end_time: "07:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	assert.equal(state.stops[1].arrive, "22:00");
	assert.equal(state.stops[1].depart, "07:00");
});

test("a pickup's spot time is its arrival, and round-trips as one", () => {
	/* Found on a real school trip: the draft gave spot_time 05:00 and
	   departure_time 05:30, and only the 05:30 survived. The spot time is when
	   the bus is staged with the doors open — the time the parents were
	   actually told — so losing it loses the one time on the page anyone
	   outside the company knows. */
	const state = fromV3(v3([
		{ type: "pickup", name: "School", spot_time: "05:00", departure_time: "05:30" },
		{ type: "return", arrival_time: "23:10" },
	]));
	assert.equal(state.stops[0].arrive, "05:00");
	assert.equal(state.stops[0].depart, "05:30");

	const emitted = toV3(state).trip.legs.outbound.stops[0];
	assert.equal(emitted.spot_time, "05:00", "and it goes back out as spot_time, not arrival_time");
	assert.equal(emitted.arrival_time, undefined);
	assert.equal(emitted.departure_time, "05:30");
});

test("a pickup with only an arrival_time still loads", () => {
	// Some drafts state it the other way; neither should be dropped.
	const state = fromV3(v3([
		{ type: "pickup", arrival_time: "04:40", departure_time: "05:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	assert.equal(state.stops[0].arrive, "04:40");
});

test("day markers in a draft are dropped — this tab derives them", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "day", date: "2026-07-28", label: "End of Day 1" },
		{ type: "return", arrival_time: "20:00", day_offset: 1 },
	]));
	assert.deepEqual(state.stops.map((stop) => stop.type), ["pickup", "return"]);
});

test("a gap the clock cannot explain survives as a held day", () => {
	// Leaves the casino at 17:00 on day 0 and reaches the next stop at 23:00
	// on day 3. The times move forward, so the clock derives no rollover at
	// all — every one of those three days is held, and a fixed "minus one"
	// for an assumed rollover would land a day short.
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "06:00" },
		{ type: "stop", name: "Casino", arrival_time: "16:30", departure_time: "17:00" },
		{ type: "stop", name: "Home", arrival_time: "23:00", day_offset: 3 },
	]));
	assert.equal(state.stops[2].extraDays, 3);
	assert.equal(deriveDays(state.stops)[2].arriveDay, 3, "the derived day matches what the draft said");
});

test("a held day is not invented when the clock already explains the gap", () => {
	// Same shape, but the times roll over on their own: 07:00 is earlier than
	// the 22:00 before it, so day 1 is derived rather than held.
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "06:00" },
		{ type: "stop", name: "Casino", arrival_time: "16:30", departure_time: "22:00" },
		{ type: "stop", name: "Home", arrival_time: "07:00", day_offset: 1 },
	]));
	assert.equal(state.stops[2].extraDays, 0);
	assert.equal(deriveDays(state.stops)[2].arriveDay, 1);
});

test("a draft's trip-level fields survive the round trip", () => {
	/* Save refuses a trip with no dates, so a draft that carried only stops
	   could never become a trip on the calendar without someone retyping what
	   the document already said. These are what fillTripDetails writes. */
	const payload = v3([{ type: "pickup", departure_time: "05:00" }]);
	payload.trip.client = "Audie Murphy Middle School";
	payload.trip.notes = "Lunch is at the park.";
	payload.trip.booking_contact = { name: "Coach Reyes", phone: "956-555-0148" };

	const state = fromV3(payload);
	assert.equal(state.client, "Audie Murphy Middle School");
	assert.equal(state.destination, "Austin, TX");
	assert.equal(state.startDate, "2026-07-27");
	assert.equal(state.notes, "Lunch is at the park.");
	assert.equal(state.bookingName, "Coach Reyes");
	assert.equal(state.bookingPhone, "956-555-0148");

	const back = toCleanV3(state).trip;
	assert.equal(back.client, "Audie Murphy Middle School");
	assert.equal(back.notes, "Lunch is at the park.");
	assert.deepEqual(back.booking_contact, { name: "Coach Reyes", phone: "956-555-0148" });
	assert.equal(back.booking_contact.email, undefined, "an absent field stays absent");
});

test("a draft with no booking contact emits none", () => {
	const state = fromV3(v3([{ type: "pickup", departure_time: "05:00" }]));
	assert.equal(toCleanV3(state).trip.booking_contact, undefined);
});

test("data_flags survive the load", () => {
	const payload = v3([{ type: "pickup", departure_time: "05:00" }]);
	payload.data_flags = ["Confirm the return time.", ""];
	assert.deepEqual(fromV3(payload).dataFlags, ["Confirm the return time."]);
});

test("the document this tab emits loads back into it unchanged", () => {
	const original = fromV3(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", name: "School", address: "101 E Hackberry Ave", departure_time: "05:00" },
		{ type: "stop", name: "Field", address: "1300 E MLK", activity: "game", arrival_time: "10:00", departure_time: "14:30" },
		{ type: "stop", name: "Hotel", address: "500 E 4th St", arrival_time: "15:30", departure_time: "07:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const shape = (state) => state.stops.map((stop) =>
		[stop.type, stop.name, stop.address, stop.activity, stop.arrive, stop.depart, stop.extraDays]);

	assert.deepEqual(shape(fromV3(toV3(original))), shape(original));
});

test("the emitted draft states the day offsets it derived", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Hotel", arrival_time: "15:30", departure_time: "07:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const stops = toV3(state).trip.legs.outbound.stops;

	assert.equal(stops[1].day_offset, undefined, "day zero is left implicit");
	assert.equal(stops[1].departure_day_offset, 1, "the overnight is stated");
	assert.equal(stops[2].day_offset, 1);
});

test("a saved itinerary keeps its measured route, and keeps it measured", () => {
	/* The defect this pins: toV3 emitted no mileage at all, so persisting an
	   itinerary threw away every leg a Resolve pass had measured and it came
	   back needing routing again. Found by the driver sheet, which tried to
	   print numbers that were not in the document.

	   Emitting them as distance_miles is not the fix on its own. In v3 that
	   property means "the source stated it", so the importer marks it manual —
	   and a manual value is one a later Resolve refuses to refresh. Measured
	   mileage therefore travels in the annex, which carries its source with
	   it. */
	const routed = {
		startDate: "2026-07-27", client: "", destination: "", dataFlags: [],
		stops: [
			{ type: "pickup", name: "School", address: "101 E Hackberry", arrive: "04:45", depart: "05:00" },
			{ type: "stop", name: "Field", address: "1300 E MLK", arrive: "10:00", depart: "14:30",
				miles: "312.4", drive: "4:48", lat: 30.2, lng: -97.7, mapboxId: "abc" },
			{ type: "stop", name: "Detour", address: "Somewhere", arrive: "16:00",
				miles: "40.0", drive: "1:05", milesSource: "manual", driveSource: "manual" },
			{ type: "return", arrive: "20:00", miles: "315.0", drive: "4:55" },
		].map(normalizeStop),
	};

	const doc = toV3(routed);
	assert.ok(Array.isArray(doc.rux_route), "the annex is emitted");
	assert.equal(
		doc.trip.legs.outbound.stops[1].distance_miles,
		undefined,
		"a MEASURED leg is not laundered into a customer-stated distance_miles",
	);
	assert.equal(
		doc.trip.legs.outbound.stops[2].distance_miles,
		40,
		"a TYPED override is a stated value and does belong in the draft",
	);

	const back = fromV3(doc);
	assert.deepEqual(
		back.stops.map((stop) => [stop.miles, stop.drive, stop.milesSource]),
		[
			["", "", "estimated"],
			["312.4", "4:48", "estimated"],
			["40.0", "1:05", "manual"],
			["315.0", "4:55", "estimated"],
		],
		"every measured number survives, and stays refreshable by the next Resolve",
	);
	assert.equal(back.stops[1].lat, 30.2, "and so do the coordinates it was measured between");
	assert.equal(back.stops[1].mapboxId, "abc");
});

test("the annex is ignored when it cannot be trusted to line up", () => {
	// A draft edited by hand since it was saved would otherwise put one stop's
	// mileage on another's leg, which is worse than having none.
	const doc = toV3({
		startDate: "2026-07-27", client: "", destination: "", dataFlags: [],
		stops: [{ type: "pickup", depart: "05:00", miles: "5.2", drive: "0:16" }].map(normalizeStop),
	});
	doc.trip.legs.outbound.stops.push({ type: "return", arrival_time: "20:00" });

	const back = fromV3(doc);
	assert.equal(back.stops.length, 2);
	assert.equal(back.stops[0].miles, "", "a mismatched annex is dropped whole, not applied partly");
});

test("a document with no annex still loads, as a model's own draft does", () => {
	const plain = v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Field", arrival_time: "10:00", distance_miles: 37.7, drive_time: "0:44" },
		{ type: "return", arrival_time: "20:00" },
	]);
	assert.equal(plain.rux_route, undefined);
	const back = fromV3(plain);
	assert.equal(back.stops[1].miles, "37.7");
	assert.equal(back.stops[1].milesSource, "manual", "a model stating mileage means the source did");
});

test("what a person copies is schema-clean; what is persisted carries the annex", () => {
	/* The stored document and the exported one are not the same thing. v3's
	   root is additionalProperties: false, so the annex would fail validation
	   for anyone who checked a copied draft against the published schema — and
	   it means nothing outside this tab anyway. */
	const state = {
		startDate: "2026-07-27", client: "", destination: "", dataFlags: [],
		stops: [
			{ type: "pickup", depart: "05:00" },
			{ type: "stop", name: "Field", arrive: "10:00", miles: "312.4", drive: "4:48" },
		].map(normalizeStop),
	};
	assert.ok(toV3(state).rux_route, "persisted");
	assert.equal(toCleanV3(state).rux_route, undefined, "copied");
	assert.deepEqual(
		Object.keys(toCleanV3(state)).sort(),
		["schema_version", "trip"],
		"nothing else leaks into the public draft either",
	);
});

test("a draft with no stops yields no stops rather than throwing", () => {
	assert.deepEqual(fromV3({}).stops, []);
	assert.deepEqual(fromV3(null).stops, []);
	assert.deepEqual(fromV3(v3([])).stops, []);
});

/* ── Reading the Itinerary tab ───────────────────────────────────────── */

test("the Itinerary tab's journey model inverts into arrive/depart", () => {
	// departPrev is when you left the PREVIOUS place, so stop n's depart is
	// stop n+1's departPrev. This is the inverse of trip-import.js's carry.
	const stops = fromEditorStops([
		{ type: "pickup", name: "School", address: "101 E Hackberry", departPrev: "04:15", spot: "04:45" },
		{ type: "stop", name: "Field", address: "1300 E MLK", departPrev: "05:00", arrive: "10:00" },
		{ type: "return", name: "Yard", address: YARD, departPrev: "14:30", arrive: "20:00" },
	], "2026-07-27");

	assert.deepEqual(
		stops.map((stop) => [stop.type, stop.arrive, stop.depart]),
		[
			["yard_origin", "", "04:15"],
			["pickup", "04:45", "05:00"],
			["stop", "10:00", "14:30"],
			["return", "20:00", ""],
		],
	);
});

test("a pickup with no yard time grows no yard row", () => {
	const stops = fromEditorStops([
		{ type: "pickup", name: "School", spot: "04:45" },
		{ type: "return", departPrev: "14:30", arrive: "20:00" },
	], "2026-07-27");
	assert.equal(stops[0].type, "pickup", "nothing to pull out, so nothing is invented");
});

test("day rows are dropped and their gap becomes a held day", () => {
	const stops = fromEditorStops([
		{ type: "pickup", name: "School", spot: "05:45", spotDate: "2026-07-26" },
		{ type: "day", label: "2026-07-27" },
		{ type: "stop", name: "Casino", departPrev: "06:00", arrive: "16:30", arriveDate: "2026-07-28" },
		{ type: "return", departPrev: "09:00", arrive: "20:00", arriveDate: "2026-07-29" },
	], "2026-07-26");

	assert.deepEqual(stops.map((stop) => stop.type), ["pickup", "stop", "return"]);
	assert.equal(stops[1].extraDays, 1, "26th to 28th is one day more than the clock implies");
});

/* ── The mirror back into the Itinerary tab ──────────────────────────── */

// This is what trip-db.js's save path actually collects, so a bug here writes
// a wrong trip_stops for every reader downstream — print schedules, the trip
// envelope, driver share, trip-bar mileage.

const gridState = (stops, startDate = "2026-07-27") => ({
	startDate, client: "", destination: "", dataFlags: [], stops: stops.map(normalizeStop),
});

test("the mirror pushes each departure forward onto the next card", () => {
	const rows = toEditorStops(gridState([
		{ type: "yard_origin", depart: "04:15" },
		{ type: "pickup", name: "School", address: "101 E Hackberry", arrive: "04:45", depart: "05:00" },
		{ type: "stop", name: "Field", address: "1300 E MLK", arrive: "10:00", depart: "14:30" },
		{ type: "return", name: "Yard", address: YARD, arrive: "20:00" },
	]));

	assert.deepEqual(rows.map((row) => row.type), ["pickup", "stop", "return"], "the yard row folds in");
	assert.equal(rows[0].departPrev, "04:15", "the yard's departure lands on the pickup");
	assert.equal(rows[0].spot, "04:45", "a pickup's arrival is its spot time");
	assert.equal(rows[1].departPrev, "05:00", "the pickup's departure moves to the next card");
	assert.equal(rows[1].arrive, "10:00");
	assert.equal(rows[2].departPrev, "14:30");
	assert.equal(rows[2].arrive, "20:00");
});

test("the mirror stamps dates from the derived day offsets", () => {
	const rows = toEditorStops(gridState([
		{ type: "yard_origin", depart: "04:15" },
		{ type: "pickup", arrive: "04:45", depart: "05:00" },
		{ type: "stop", name: "Hotel", arrive: "15:30", depart: "07:00" },
		{ type: "return", arrive: "20:00" },
	]));

	assert.equal(rows[1].arriveDate, "2026-07-27");
	assert.equal(rows[2].departPrevDate, "2026-07-28", "the hotel departs the morning after");
	assert.equal(rows[2].arriveDate, "2026-07-28");
});

test("the mirror never writes the origin:yard sentinel", () => {
	// It means the passengers board AT the depot, which is not what a
	// yard_origin row says, and it is what autoPopulatePickupDepart uses to
	// decide it may overwrite the stated yard departure.
	const rows = toEditorStops(gridState([
		{ type: "yard_origin", depart: "04:15" },
		{ type: "pickup", activity: "load passengers", depart: "05:00" },
		{ type: "return", arrive: "20:00" },
	]));
	assert.notEqual(rows[0].label, "origin:yard");
	assert.equal(rows[0].label, undefined, "and a pickup carries no activity either");
});

test("the mirror carries activity across in the label column", () => {
	const rows = toEditorStops(gridState([
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", name: "Choctaw", activity: "casino", arrive: "16:00", depart: "17:00" },
		{ type: "return", arrive: "20:00" },
	]));
	assert.equal(rows[1].label, "casino");
});

test("the mirror carries the measured route and its coordinates", () => {
	const rows = toEditorStops(gridState([
		{ type: "pickup", depart: "05:00", lat: 26.2, lng: -98.2 },
		{ type: "stop", name: "Field", arrive: "10:00", miles: "312.4", drive: "4:48", lat: 30.2, lng: -97.7 },
		{ type: "return", arrive: "20:00" },
	]));
	assert.equal(rows[1].miles, "312.4");
	assert.equal(rows[1].drive, "4:48");
	assert.equal(rows[1].lat, 30.2);
	assert.equal(rows[1].routeStatus, "current", "a located, measured leg is not stale");
	assert.equal(rows[2].routeStatus, "stale", "an unmeasured one is");
});

test("a sleeper survives the round trip through the editor's inverted shape", () => {
	// The editor stores a sleeper's rest START in departPrev and its END in
	// arrive, opposite to every other type. Reading it like an ordinary stop
	// put the end of the rest in the arrival column and lost the start.
	const original = gridState([
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", name: "Lot", arrive: "20:00", depart: "22:00" },
		{ type: "sleeper", arrive: "22:00", depart: "07:00" },
		{ type: "return", arrive: "12:00" },
	]);
	const rows = toEditorStops(original);

	assert.equal(rows[1].type, "stop");
	assert.equal(rows[2].type, "sleeper");
	assert.equal(rows[2].departPrev, "22:00", "rest start lives in departPrev");
	assert.equal(rows[2].arrive, "07:00", "rest end lives in arrive");
	assert.equal(rows[3].departPrev, "07:00", "the trip resumes at the rest end");

	const back = fromEditorStops(rows, "2026-07-27");
	const sleeper = back.find((stop) => stop.type === "sleeper");
	assert.equal(sleeper.arrive, "22:00", "and reading it back restores the rest start");
	assert.equal(sleeper.depart, "07:00");
});

test("mirror and pull are inverses for an ordinary trip", () => {
	// The yard rows carry the depot's name here because fromV3 fills them in
	// from Settings — a document never states the yard, so a state that has
	// been through a real load always has it.
	const original = gridState([
		{ type: "yard_origin", name: "Yard", address: YARD, depart: "04:15" },
		{ type: "pickup", name: "School", address: "101 E Hackberry", arrive: "04:45", depart: "05:00" },
		{ type: "stop", name: "Field", address: "1300 E MLK", activity: "game", arrive: "10:00", depart: "14:30" },
		{ type: "return", name: "Yard", address: YARD, arrive: "20:00" },
	]);
	const shape = (stops) => stops.map((stop) =>
		[stop.type, stop.name, stop.activity, stop.arrive, stop.depart]);

	assert.deepEqual(
		shape(fromEditorStops(toEditorStops(original), "2026-07-27")),
		shape(original.stops),
	);
});

test("the mirror produces nothing from an empty tab", () => {
	// The guard that stops an untouched Grid tab wiping an itinerary entered
	// in the other one.
	assert.deepEqual(toEditorStops(gridState([])), []);
});

/* ── Schedule risk ───────────────────────────────────────────────────── */

test("a leg with room to spare is not flagged", () => {
	// 60 minutes of driving into a 4h30m gap.
	const [stops, days] = withDays(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "09:30", drive: "1:00" },
	);
	assert.deepEqual(legRisks(stops, days), [null, null]);
});

test("a leg the schedule cannot fit is flagged with the time to leave by", () => {
	// 60 minutes of driving, plus the 15% buffer, into a 65-minute gap.
	const [stops, days] = withDays(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "06:05", drive: "1:00" },
	);
	const risk = legRisks(stops, days)[1];
	assert.ok(risk, "69 minutes of traffic-adjusted driving does not fit in 65");
	assert.equal(risk.gap, 65);
	assert.equal(risk.needed, 69);
	assert.equal(risk.leaveBy, "04:56", "to arrive at 06:05 the bus has to be rolling by 04:56");
});

test("the traffic buffer is what makes a marginal leg tight", () => {
	// 60 minutes of driving into a 66-minute gap: fine on the raw measurement,
	// tight once the buffer and the 5-minute margin are applied.
	const [stops, days] = withDays(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "06:06", drive: "1:00" },
	);
	assert.ok(legRisks(stops, days)[1], "69 + 5 minutes needed, 66 available");
});

test("an overnight leg is measured across the day boundary, not around the clock", () => {
	// Leaves 22:00, arrives 06:00 next day. Subtracting the clock strings
	// gives minus sixteen hours and flags a leg that has eight hours of room.
	const [stops, days] = withDays(
		{ type: "pickup", depart: "22:00" },
		{ type: "stop", arrive: "06:00", drive: "2:00" },
	);
	assert.equal(days[1].arriveDay, 1, "the arrival is on the next day");
	assert.equal(legRisks(stops, days)[1], null, "eight hours of room is not tight");
});

test("a sleeper is never flagged — it does not travel", () => {
	const [stops, days] = withDays(
		{ type: "stop", arrive: "20:00", depart: "22:00" },
		{ type: "sleeper", arrive: "22:00", depart: "06:00", drive: "0:00" },
	);
	assert.equal(legRisks(stops, days)[1], null);
});

test("an unrouted leg is not flagged, because nothing is known about it", () => {
	const [stops, days] = withDays(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "05:05" },
	);
	assert.equal(legRisks(stops, days)[1], null);
});

/* ── Yard plan ───────────────────────────────────────────────────────── */

test("the yard plan works backwards from the pickup's departure", () => {
	// Depart 05:00, 15 minutes of spot padding, then 45 minutes of driving
	// backed off by the same 15% and 5-minute margin legRisks judges against
	// (ceil(45 * 1.15) + 5 = 57), then 15 minutes of pre-trip.
	const plan = yardPlan([
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", depart: "05:00", drive: "0:45" }),
	]);
	assert.equal(plan.spot, "04:45");
	assert.equal(plan.roll, "03:48");
	assert.equal(plan.report, "03:33");
});

test("following the yard plan does not produce the warning it was meant to avoid", () => {
	/* The plan used to subtract the bare drive time, leaving a gap exactly
	   equal to it — which legRisks then failed. The tab suggested a departure
	   and immediately flagged the leg it had just created, and a tool that
	   warns about its own advice teaches people to ignore the warning. */
	const stops = [
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", arrive: "04:45", depart: "05:00", drive: "0:16" }),
	];
	const plan = yardPlan(stops);
	stops[0].depart = plan.roll;

	assert.equal(legRisks(stops, deriveDays(stops))[1], null, `rolling at ${plan.roll} is not tight`);
});

test("the yard plan wraps backwards past midnight", () => {
	// 00:15 spot, minus ceil(60 * 1.15) + 5 = 74 minutes, minus 15 pre-trip.
	const plan = yardPlan([
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", depart: "00:30", drive: "1:00" }),
	]);
	assert.equal(plan.spot, "00:15");
	assert.equal(plan.roll, "23:01", "the previous evening, not a negative time");
	assert.equal(plan.report, "22:46");
});

test("without a routed first leg the plan stops at the spot time", () => {
	const plan = yardPlan([
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", depart: "05:00" }),
	]);
	assert.equal(plan.spot, "04:45");
	assert.equal(plan.roll, undefined, "nothing is invented without a measured drive");
});

test("there is no plan without a pickup after the yard", () => {
	assert.equal(yardPlan([normalizeStop({ type: "pickup", depart: "05:00" })]), null);
	assert.equal(yardPlan([]), null);
});

/* ── Duty by day ─────────────────────────────────────────────────────── */

test("duty and drive are counted per day, not across the trip", () => {
	const [stops, days] = withDays(
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", arrive: "10:00", depart: "07:00", drive: "5:00" },
		{ type: "return", arrive: "12:00", drive: "5:00" },
	);
	const duty = dutyByDay(stops, days);

	assert.deepEqual(duty.map((day) => day.day), [0, 1]);
	assert.equal(duty[0].drive, 300, "day one carries the first leg");
	assert.equal(duty[0].duty, 300, "05:00 to 10:00");
	assert.equal(duty[1].drive, 300);
	assert.equal(duty[1].duty, 300, "07:00 to 12:00 on the second day");
});

test("a day with a single time has no duty span", () => {
	const [stops, days] = withDays({ type: "pickup", depart: "05:00" });
	assert.equal(dutyByDay(stops, days)[0].duty, 0);
});

/* ── Town fallback ───────────────────────────────────────────────────── */

test("the town is taken from the tail of an address, whatever precedes it", () => {
	assert.equal(localityOf("Whataburger, Falfurrias, TX"), "Falfurrias, TX");
	assert.equal(localityOf("Tex Best, George West, TX"), "George West, TX");
	assert.equal(localityOf("17000 W Interstate 10, San Antonio, TX 78257"), "San Antonio, TX 78257");
	assert.equal(localityOf("101 E Hackberry Ave, McAllen, TX 78501"), "McAllen, TX 78501");
});

test("an address with nothing to fall back to gives no town", () => {
	assert.equal(localityOf("Six Flags"), null);
	assert.equal(localityOf(""), null);
	assert.equal(localityOf(null), null);
});

test("a town-level fix survives being saved and reloaded", () => {
	/* The point of the fallback is a usable quote, so it has to persist: a
	   trip reopened tomorrow must still show its mileage AND still say that
	   one leg was measured to the town rather than to the stop. */
	const state = {
		startDate: "2027-05-20", client: "", destination: "", dataFlags: [],
		stops: [
			{ type: "pickup", address: "Audie Murphy Middle School, Weslaco, TX", depart: "05:30" },
			{ type: "stop", name: "Whataburger", address: "Whataburger, Falfurrias, TX",
				arrive: "07:30", miles: "88.4", drive: "1:22", approxFrom: "Falfurrias, Texas, United States" },
			{ type: "return", arrive: "23:10" },
		].map(normalizeStop),
	};
	const back = fromV3(toV3(state));
	assert.equal(back.stops[1].approxFrom, "Falfurrias, Texas, United States");
	assert.equal(back.stops[1].miles, "88.4");
	assert.equal(
		back.stops[1].address,
		"Whataburger, Falfurrias, TX",
		"and the typed address is untouched — a driver is never sent to the town centre",
	);
});

/* ── Geocoder substitution ───────────────────────────────────────────── */

test("an expanded spelling of the same address is not a substitution", () => {
	// The real pair, from a live Mapbox call. Comparing the strings flags this,
	// which would put a warning on every address in the list.
	assert.equal(
		sameAddress(
			"101 E Hackberry Ave, McAllen, TX 78501",
			"101 East Hackberry Avenue, McAllen, Texas 78501, United States",
		),
		true,
	);
});

test("a different place is a substitution, however plausible it looks", () => {
	// Also real: Mapbox answered nonsense with a real address 20 miles away.
	assert.equal(
		sameAddress("zzz not a real place zzz", "508 TX-107, Elsa, Texas 78543, United States"),
		true,
		"nothing identifying was typed, so nothing can be contradicted",
	);
	assert.equal(
		sameAddress("101 E Hackberry Ave, McAllen, TX 78501", "508 TX-107, Elsa, Texas 78543"),
		false,
		"both the house number and the ZIP moved",
	);
});

test("a ZIP the geocoder read as a house number is caught", () => {
	/* The real one, from a Six Flags trip. Asked for a Whataburger in
	   Falfurrias, Mapbox parsed the ZIP as a street number and answered an
	   address 592 miles away in Sherman. Reading the FIRST five-digit run
	   found 78355 on both sides and passed it. */
	assert.equal(
		sameAddress(
			"Whataburger, Falfurrias, TX 78355",
			"78355 Texas Highway 82, Sherman, Texas 75092, United States",
		),
		false,
	);
});

test("a matching number in the wrong ZIP is still a substitution", () => {
	assert.equal(sameAddress("500 Main St, Austin, TX 78701", "500 Main St, Dallas, TX 75201"), false);
});

test("with only one identifier, that one decides", () => {
	assert.equal(sameAddress("Choctaw Casino, Durant, OK 74701", "4216 S Hwy 69, Durant, OK 74701"), true);
	assert.equal(sameAddress("Choctaw Casino, Durant, OK 74701", "1 Main St, Ada, OK 74820"), false);
});

/* ── normalizeStop ───────────────────────────────────────────────────── */

test("an unknown stop type becomes a plain stop rather than breaking a row", () => {
	assert.equal(normalizeStop({ type: "ferry" }).type, "stop");
	assert.equal(normalizeStop(null).type, "stop");
});

test("stated mileage is marked manual and absent mileage estimated", () => {
	assert.equal(normalizeStop({ miles: 37.7, milesSource: "manual" }).milesSource, "manual");
	assert.equal(normalizeStop({}).milesSource, "estimated");
	assert.equal(normalizeStop({}).miles, "", "no miles reads as blank, never as zero");
});

test("every stop gets an id, and a supplied one is kept", () => {
	assert.match(normalizeStop({}).id, /^s\d+$/);
	assert.equal(normalizeStop({ id: "keep-me" }).id, "keep-me");
});
