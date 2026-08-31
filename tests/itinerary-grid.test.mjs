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
	needsReview, suspectLocations, sameTown, candidateScore,
} = host.ItineraryGrid;

// legRisks and dutyByDay both take the derived days alongside the stops, so
// every case here builds both from one list.
function withDays(...raw) {
	const stops = raw.map(normalizeStop);
	return [stops, deriveDays(stops)];
}

const YARD = "2801 Zinnia Ave, McAllen, TX 78504";

/* The stops the DOCUMENT stated.
 *
 * fromV3 supplies the yard row that docs/itinerary-prompt.md tells a draft to
 * omit — without it the run out to the first pickup is measured by nothing and
 * counted in no total (docs/todo.md T10). So a loaded leg has one row the
 * document did not. Tests about what the document said index through this;
 * tests about the trip as the app models it use leg.stops directly. */
const stated = (leg) => leg.stops.filter((stop) => stop.type !== "yard_origin");
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

	assert.equal(state.legs.outbound.startDate, "2026-07-27");
	assert.deepEqual(
		state.legs.outbound.stops.map((stop) => [stop.type, stop.arrive, stop.depart]),
		[
			["yard_origin", "", "04:15"],
			["pickup", "", "05:00"],
			["stop", "10:00", "14:30"],
			["return", "20:00", ""],
		],
		"each stop keeps its own two times — the field's 14:30 does not move to the return",
	);
	assert.equal(state.legs.outbound.stops[2].activity, "game");
});

test("the yard bookends are filled from settings, not from the draft", () => {
	// The prompt deliberately never writes the yard out; the app owns it.
	const state = fromV3(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", departure_time: "05:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	assert.equal(state.legs.outbound.stops[0].address, YARD);
	assert.equal(state.legs.outbound.stops[2].address, YARD);
});

test("a sleeper's rest window becomes its arrive and depart", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "sleeper", name: "Lot", rest_start_time: "22:00", rest_end_time: "07:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	assert.equal(stated(state.legs.outbound)[1].arrive, "22:00");
	assert.equal(stated(state.legs.outbound)[1].depart, "07:00");
});

/* ── The yard the document never mentions — docs/todo.md T10 ─────────── */

test("a draft that omits the yard still gets one, so the run out is measured", () => {
	/* docs/itinerary-prompt.md tells a model to omit yard_origin unless the
	   source states a depot departure, promising "the app calculates it
	   backwards from the pickup once the route is measured". Nothing did. The
	   leg from the yard to the first pickup is measured from the row BEFORE
	   the pickup, so with no such row there is no leg, no mileage, no drive
	   time and no duty — the trip reads as though it starts at the pickup. */
	const state = fromV3(v3([
		{ type: "pickup", name: "School", address: "1 Main St", departure_time: "05:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const stops = state.legs.outbound.stops;

	assert.equal(stops[0].type, "yard_origin", "the yard leads the leg");
	assert.equal(stops[0].address, YARD, "and carries the yard's address, not the document's");
	assert.equal(stops[1].type, "pickup", "the document's own first stop follows it");
});

test("a draft that states its own yard departure is not given a second one", () => {
	const state = fromV3(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", departure_time: "05:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const yards = state.legs.outbound.stops.filter((stop) => stop.type === "yard_origin");
	assert.equal(yards.length, 1);
	assert.equal(yards[0].depart, "04:15", "and the stated time is kept");
});

test("yardPlan answers on a draft that never mentioned the yard", () => {
	/* The promise the prompt makes, made true. yardPlan needs a row before the
	   pickup AND that row's measured drive; this is the whole reason the row
	   has to be supplied on load rather than at render time. */
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "04:30" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const stops = state.legs.outbound.stops;
	assert.equal(
		yardPlan(stops).roll,
		undefined,
		"a spot time needs only the pickup; a roll time needs the leg measured",
	);

	// What a Resolve pass writes: the leg INTO the pickup, three hours of it.
	stops[1].drive = "3:07";
	const plan = yardPlan(stops);
	assert.equal(plan.spot, "04:15", "staged fifteen minutes before departure");
	assert.equal(plan.roll, "00:34", "rolling from the yard three and a half hours earlier");
	assert.equal(plan.report, "00:19", "and reporting fifteen minutes before that");
});

test("the yard row does not slide the annex onto the wrong legs", () => {
	/* The row is inserted AFTER the annex is applied, because the annex is
	   keyed by position in the document's own stops. Inserting first would put
	   every measured mile one leg late — the failure this ordering prevents. */
	// gridState builds the stops directly, so this document has no yard row and
	// an annex matching its own two stops — the shape a model's draft has.
	const doc = toV3(gridState([
			{ type: "pickup", name: "School", depart: "05:00" },
			{ type: "stop", name: "Field", arrive: "10:00", miles: "312.4", drive: "4:48" },
		], "2026-07-27"));
	assert.equal(doc.rux_route.outbound.length, 2, "two entries for two stops");

	const back = stated(fromV3(doc).legs.outbound);
	assert.equal(back[0].miles, "", "the pickup has no leg into it yet");
	assert.equal(back[1].miles, "312.4", "and the measured leg stayed on the stop it measured");
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
	assert.equal(stated(state.legs.outbound)[0].arrive, "05:00");
	assert.equal(stated(state.legs.outbound)[0].depart, "05:30");

	const emitted = toV3(state).trip.legs.outbound.stops.find((stop) => stop.type === "pickup");
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
	assert.equal(stated(state.legs.outbound)[0].arrive, "04:40");
});

test("day markers in a draft are dropped — this tab derives them", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "day", date: "2026-07-28", label: "End of Day 1" },
		{ type: "return", arrival_time: "20:00", day_offset: 1 },
	]));
	assert.deepEqual(stated(state.legs.outbound).map((stop) => stop.type), ["pickup", "return"]);
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
	const home = stated(state.legs.outbound)[2];
	assert.equal(home.extraDays, 3);
	assert.equal(
		deriveDays(state.legs.outbound.stops)[state.legs.outbound.stops.indexOf(home)].arriveDay,
		3,
		"the derived day matches what the draft said",
	);
});

test("a held day is not invented when the clock already explains the gap", () => {
	// Same shape, but the times roll over on their own: 07:00 is earlier than
	// the 22:00 before it, so day 1 is derived rather than held.
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "06:00" },
		{ type: "stop", name: "Casino", arrival_time: "16:30", departure_time: "22:00" },
		{ type: "stop", name: "Home", arrival_time: "07:00", day_offset: 1 },
	]));
	const home = stated(state.legs.outbound)[2];
	assert.equal(home.extraDays, 0);
	assert.equal(
		deriveDays(state.legs.outbound.stops)[state.legs.outbound.stops.indexOf(home)].arriveDay,
		1,
	);
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
	assert.equal(state.legs.outbound.startDate, "2026-07-27");
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
	const shape = (state) => state.legs.outbound.stops.map((stop) =>
		[stop.type, stop.name, stop.address, stop.activity, stop.arrive, stop.depart, stop.extraDays]);

	assert.deepEqual(shape(fromV3(toV3(original))), shape(original));
});

test("the emitted draft states the day offsets it derived", () => {
	const state = fromV3(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Hotel", arrival_time: "15:30", departure_time: "07:00" },
		{ type: "return", arrival_time: "20:00" },
	]));
	const stops = toV3(state).trip.legs.outbound.stops.filter((stop) => stop.type !== "yard_origin");

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
	const routed = gridState([
			{ type: "pickup", name: "School", address: "101 E Hackberry", arrive: "04:45", depart: "05:00" },
			{ type: "stop", name: "Field", address: "1300 E MLK", arrive: "10:00", depart: "14:30",
				miles: "312.4", drive: "4:48", lat: 30.2, lng: -97.7, mapboxId: "abc" },
			{ type: "stop", name: "Detour", address: "Somewhere", arrive: "16:00",
				miles: "40.0", drive: "1:05", milesSource: "manual", driveSource: "manual" },
			{ type: "return", arrive: "20:00", miles: "315.0", drive: "4:55" },
		], "2026-07-27");

	const doc = toV3(routed);
	assert.ok(Array.isArray(doc.rux_route?.outbound), "the annex is emitted, keyed by leg");
	const emitted = doc.trip.legs.outbound.stops.filter((stop) => stop.type !== "yard_origin");
	assert.equal(
		emitted[1].distance_miles,
		undefined,
		"a MEASURED leg is not laundered into a customer-stated distance_miles",
	);
	assert.equal(
		emitted[2].distance_miles,
		40,
		"a TYPED override is a stated value and does belong in the draft",
	);

	const back = fromV3(doc);
	assert.deepEqual(
		stated(back.legs.outbound).map((stop) => [stop.miles, stop.drive, stop.milesSource]),
		[
			["", "", "estimated"],
			["312.4", "4:48", "estimated"],
			["40.0", "1:05", "manual"],
			["315.0", "4:55", "estimated"],
		],
		"every measured number survives, and stays refreshable by the next Resolve",
	);
	assert.equal(stated(back.legs.outbound)[1].lat, 30.2, "and so do the coordinates it was measured between");
	assert.equal(stated(back.legs.outbound)[1].mapboxId, "abc");
});

test("the annex is ignored when it cannot be trusted to line up", () => {
	// A draft edited by hand since it was saved would otherwise put one stop's
	// mileage on another's leg, which is worse than having none.
	const doc = toV3(gridState([{ type: "pickup", depart: "05:00", miles: "5.2", drive: "0:16" }], "2026-07-27"));
	doc.trip.legs.outbound.stops.push({ type: "return", arrival_time: "20:00" });

	const back = fromV3(doc);
	assert.equal(stated(back.legs.outbound).length, 2);
	assert.equal(stated(back.legs.outbound)[0].miles, "", "a mismatched annex is dropped whole, not applied partly");
});

test("a document with no annex still loads, as a model's own draft does", () => {
	const plain = v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Field", arrival_time: "10:00", distance_miles: 37.7, drive_time: "0:44" },
		{ type: "return", arrival_time: "20:00" },
	]);
	assert.equal(plain.rux_route, undefined);
	const back = fromV3(plain);
	assert.equal(stated(back.legs.outbound)[1].miles, "37.7");
	assert.equal(stated(back.legs.outbound)[1].milesSource, "manual", "a model stating mileage means the source did");
});

test("what a person copies is schema-clean; what is persisted carries the annex", () => {
	/* The stored document and the exported one are not the same thing. v3's
	   root is additionalProperties: false, so the annex would fail validation
	   for anyone who checked a copied draft against the published schema — and
	   it means nothing outside this tab anyway. */
	const state = gridState([
			{ type: "pickup", depart: "05:00" },
			{ type: "stop", name: "Field", arrive: "10:00", miles: "312.4", drive: "4:48" },
		], "2026-07-27");
	assert.ok(toV3(state).rux_route?.outbound, "persisted");
	assert.equal(toCleanV3(state).rux_route, undefined, "copied");
	assert.deepEqual(
		Object.keys(toCleanV3(state)).sort(),
		["schema_version", "trip"],
		"nothing else leaks into the public draft either",
	);
});

test("a draft with no stops yields no stops rather than throwing", () => {
	assert.deepEqual(fromV3({}).legs.outbound.stops, []);
	assert.deepEqual(fromV3(null).legs.outbound.stops, []);
	assert.deepEqual(fromV3(v3([])).legs.outbound.stops, []);
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

// One leg, for the functions that take a leg (toEditorStops, emitLeg).
const gridLeg = (stops, startDate = "2026-07-27") => ({
	startDate, busCount: 1, stops: stops.map(normalizeStop),
});

// A whole state, for the ones that take the trip (toV3, renderSummary).
const gridState = (stops, startDate = "2026-07-27", extra = {}) => ({
	client: "", destination: "", notes: "",
	bookingName: "", bookingPhone: "", bookingEmail: "",
	dataFlags: [], tripType: "", serviceType: "",
	activeLeg: "outbound",
	legs: { outbound: gridLeg(stops, startDate), return: null },
	...extra,
});

test("the mirror pushes each departure forward onto the next card", () => {
	const rows = toEditorStops(gridLeg([
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
	const rows = toEditorStops(gridLeg([
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
	const rows = toEditorStops(gridLeg([
		{ type: "yard_origin", depart: "04:15" },
		{ type: "pickup", activity: "load passengers", depart: "05:00" },
		{ type: "return", arrive: "20:00" },
	]));
	assert.notEqual(rows[0].label, "origin:yard");
	assert.equal(rows[0].label, undefined, "and a pickup carries no activity either");
});

test("the mirror carries activity across in the label column", () => {
	const rows = toEditorStops(gridLeg([
		{ type: "pickup", depart: "05:00" },
		{ type: "stop", name: "Choctaw", activity: "casino", arrive: "16:00", depart: "17:00" },
		{ type: "return", arrive: "20:00" },
	]));
	assert.equal(rows[1].label, "casino");
});

test("the mirror carries the measured route and its coordinates", () => {
	const rows = toEditorStops(gridLeg([
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
	const rows = toEditorStops(original.legs.outbound);

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
		shape(fromEditorStops(toEditorStops(original.legs.outbound), "2026-07-27")),
		shape(original.legs.outbound.stops),
	);
});

test("the mirror produces nothing from an empty tab", () => {
	// The guard that stops an untouched Grid tab wiping an itinerary entered
	// in the other one.
	assert.deepEqual(toEditorStops(gridLeg([])), []);
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

/* ── A stop in the wrong place ───────────────────────────────────────── */

test("a stop nowhere near its neighbours is flagged, whatever its address says", () => {
	/* The real failure, from an IDEA Mission quote. Asked for "NorthPark
	   Center, Dallas, TX" while proximity was biased to the operator's own
	   McAllen address, Mapbox matched "615 W Dallas Ave, McAllen" — Dallas as
	   a STREET, 500 miles from the trip. sameAddress passed it, because a
	   query with no house number and no ZIP gives it nothing to contradict.

	   Geometry is what sees it: going SMU → NorthPark → hotel this way is
	   hundreds of miles when the direct hop is three. */
	const stops = [
		{ type: "stop", name: "SMU", lat: 32.8437, lng: -96.7860 },
		{ type: "stop", name: "NorthPark (mis-resolved to McAllen)", lat: 26.1985, lng: -98.2267 },
		{ type: "stop", name: "Hotel, Dallas", lat: 32.8000, lng: -96.8000 },
	].map(normalizeStop);

	const flags = suspectLocations(stops);
	assert.ok(flags[1], "the middle stop is flagged");
	assert.ok(flags[1] > 900, `the detour is ~1000 miles, got ${flags[1]}`);
	assert.equal(flags[0], false, "the ends are never flagged — they have only one neighbour");
	assert.equal(flags[2], false);
});

test("an ordinary on-route stop is not flagged", () => {
	// George West sits between Mission and New Braunfels. A real trip is full
	// of these, and flagging them would make the warning worthless.
	const stops = [
		{ type: "pickup", name: "Mission", lat: 26.2159, lng: -98.3253 },
		{ type: "stop", name: "George West", lat: 28.3325, lng: -98.1181 },
		{ type: "stop", name: "New Braunfels", lat: 29.7030, lng: -98.1245 },
	].map(normalizeStop);
	assert.deepEqual(suspectLocations(stops), [false, false, false]);
});

test("a short hop with a big ratio is not flagged", () => {
	/* Two stops a few hundred yards apart with a third beside them can produce
	   an enormous RATIO over a trivial distance. The absolute floor is what
	   stops that reading as an error. */
	const stops = [
		{ type: "stop", lat: 32.8000, lng: -96.8000 },
		{ type: "stop", lat: 32.8100, lng: -96.8000 },
		{ type: "stop", lat: 32.8001, lng: -96.8000 },
	].map(normalizeStop);
	assert.deepEqual(suspectLocations(stops), [false, false, false]);
});

test("an unresolved stop is not judged", () => {
	// No coordinates is a different problem, reported a different way.
	const stops = [
		{ type: "stop", lat: 32.8, lng: -96.8 },
		{ type: "stop" },
		{ type: "stop", lat: 32.9, lng: -96.9 },
	].map(normalizeStop);
	assert.deepEqual(suspectLocations(stops), [false, false, false]);
});

/* ── Split trips ─────────────────────────────────────────────────────── */

test("both legs are parsed, and each keeps its own start date", () => {
	const state = fromV3(splitV3());
	assert.ok(state.legs.outbound.stops.length);
	assert.ok(state.legs.return.stops.length);
	assert.notEqual(
		state.legs.outbound.startDate,
		state.legs.return.startDate,
		"a split trip's legs are days apart — one start date for both would be the bug",
	);
	assert.equal(state.activeLeg, "outbound", "and it opens on the outbound one");
});

test("a single-leg trip has no return leg at all", () => {
	// Not an empty one: renderLegToggle keys off its absence, and an empty leg
	// would put a picker on every round trip.
	const state = fromV3(v3([{ type: "pickup", departure_time: "05:00" }]));
	assert.equal(state.legs.return, null);
});

test("the annex is keyed by leg, and each leg gets its own", () => {
	/* It was a flat array when only one leg existed. Two legs sharing one
	   array would put the inbound leg's mileage on the outbound leg's stops
	   the moment the counts happened to match. */
	const state = fromV3(splitV3());
	stated(state.legs.outbound)[0].miles = "312.4";
	stated(state.legs.outbound)[0].drive = "4:48";
	stated(state.legs.return)[1].miles = "310.5";
	stated(state.legs.return)[1].drive = "4:55";

	const doc = toV3(state);
	// One entry per stop as the APP holds them, which includes the yard row
	// fromV3 supplies — so the annex is one longer than the document's own
	// stops were. What matters is that each leg's entries line up with its own
	// stops and never with the other leg's.
	assert.equal(doc.rux_route.outbound.at(-1).miles, "312.4");
	assert.equal(doc.rux_route.return.at(-1).miles, "310.5");
	assert.equal(doc.rux_route.outbound.length, state.legs.outbound.stops.length);
	assert.equal(doc.rux_route.return.length, state.legs.return.stops.length);

	const back = fromV3(doc);
	assert.equal(stated(back.legs.outbound)[0].miles, "312.4");
	assert.equal(stated(back.legs.return)[1].miles, "310.5");
	assert.equal(stated(back.legs.return)[0].miles, "", "and no leakage between them");
});

test("a flat annex from before two legs still reads as the outbound one", () => {
	// Documents saved in the old shape are in the database already.
	const doc = v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Field", arrival_time: "10:00" },
		{ type: "return", arrival_time: "20:00" },
	]);
	doc.rux_route = [{}, { miles: "312.4", drive: "4:48" }, {}];

	const state = fromV3(doc);
	assert.equal(stated(state.legs.outbound)[1].miles, "312.4");
	assert.equal(stated(state.legs.outbound)[1].milesSource, "estimated");
});

test("a split trip round-trips both legs through save and reload", () => {
	const original = fromV3(splitV3());
	const shape = (leg) => leg.stops.map((stop) =>
		[stop.type, stop.name, stop.arrive, stop.depart]);

	const back = fromV3(toV3(original));
	assert.deepEqual(shape(back.legs.outbound), shape(original.legs.outbound));
	assert.deepEqual(shape(back.legs.return), shape(original.legs.return));
	assert.equal(back.legs.return.startDate, original.legs.return.startDate);
});

/* ── Which addresses need a look ─────────────────────────────────────── */

test("only real doubt counts as needing review", () => {
	const flag = (over) => needsReview(normalizeStop({ type: "stop", address: "somewhere", ...over }));

	assert.equal(flag({ addressConfidence: "partial" }), true);
	assert.equal(flag({ addressConfidence: "source_text" }), true);
	assert.equal(flag({ matchedAddress: "somewhere else" }), true);
	assert.equal(flag({ approxFrom: "Falfurrias, TX" }), true);

	// "exact" is the extraction saying the source gave a full address. Counting
	// it promised three addresses to check while only two rows had anything to
	// show, which teaches people the number is decorative.
	assert.equal(flag({ addressConfidence: "exact" }), false);
	assert.equal(flag({}), false);
});

test("the yard bookends are never up for review", () => {
	// Their address comes from Settings, not from the document.
	assert.equal(needsReview(normalizeStop({ type: "return", addressConfidence: "partial" })), false);
	assert.equal(needsReview(normalizeStop({ type: "yard_origin", approxFrom: "somewhere" })), false);
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
	const state = gridState([
			{ type: "pickup", address: "Audie Murphy Middle School, Weslaco, TX", depart: "05:30" },
			{ type: "stop", name: "Whataburger", address: "Whataburger, Falfurrias, TX",
				arrive: "07:30", miles: "88.4", drive: "1:22", approxFrom: "Falfurrias, Texas, United States" },
			{ type: "return", arrive: "23:10" },
		], "2027-05-20");
	const back = fromV3(toV3(state));
	assert.equal(stated(back.legs.outbound)[1].approxFrom, "Falfurrias, Texas, United States");
	assert.equal(stated(back.legs.outbound)[1].miles, "88.4");
	assert.equal(
		stated(back.legs.outbound)[1].address,
		"Whataburger, Falfurrias, TX",
		"and the typed address is untouched — a driver is never sent to the town centre",
	);
});

/* ── Choosing among the geocoder's candidates ────────────────────────── */

/* Every list below is what Mapbox actually returned on 2026-08-31, in its own
   order. The bug was taking [0] on faith: in four of these five the right
   answer was already on the list, two or three places down. `best` is what the
   scoring picks. */
const best = (typed, candidates) =>
	candidates.reduce((winner, candidate) =>
		candidateScore(typed, candidate) > candidateScore(typed, winner) ? candidate : winner);

test("a correct ZIP and town beat an exact street-name match elsewhere", () => {
	/* The one that started it. Edinburg's street really is named SOUTH Alamo
	   Road while Alamo's is plain Alamo Road, so Mapbox ranks Edinburg first
	   and the right answer fourth. Two PSJA trips were measured from the wrong
	   school before anyone noticed. */
	assert.equal(
		best("800 S Alamo Rd, Alamo, TX 78516", [
			"800 South Alamo Road, Edinburg, Texas 78542, United States",
			"5010 S Alamo Rd, Edinburg, Texas 78542, United States",
			"439 Medina Ln, Alamo, Texas 78516, United States",
			"800 Alamo Road, Alamo, Texas 78516, United States",
		]),
		"800 Alamo Road, Alamo, Texas 78516, United States",
	);
});

test("a wrong ZIP loses to the town and the street rather than vetoing them", () => {
	/* PSJA's own document gives UT Austin's ZIP as 78705; the campus is 78712.
	   No candidate carries the typed ZIP, so the decision falls to town plus
	   street — and 21ST is what separates the right answer from West Saint
	   Elmo Road, which shares the house number and the city. */
	assert.equal(
		best("201 W 21st St, Austin, TX 78705", [
			"201 West Saint Elmo Road, Austin, Texas 78745, United States",
			"201 West Avenue, Austin, Texas 78701, United States",
			"310 W Austin St, Weslaco, Texas 78599, United States",
			"201 West 21st Street, Austin, Texas 78712, United States",
		]),
		"201 West 21st Street, Austin, Texas 78712, United States",
	);
});

test("a school name with only a town still finds the right town", () => {
	// No number and no ZIP to go on, and the name is shared across states.
	assert.equal(
		best("Veterans Memorial High School, Corpus Christi, TX", [
			"700 E Mile 2 Rd, Mission, Texas 78574, United States",
			"301 1st St, Old Forge, Pennsylvania 18518, United States",
			"4550 US-281, Brownsville, Texas 78520, United States",
			"3750 Cimarron Blvd, Corpus Christi, Texas 78414, United States",
			"7618 E Evans Rd, San Antonio, Texas 78266, United States",
		]),
		"3750 Cimarron Blvd, Corpus Christi, Texas 78414, United States",
	);
});

test("the right town beats a matching house number in the wrong one", () => {
	/* Both of these are imperfect — the customer wrote "1419 US-281,
	   Falfurrias" and US-281 through Falfurrias is St Mary's Street. Landing in
	   Falfurrias is still the answer; landing in Brownsville is 150 miles of
	   error in a quote. */
	assert.equal(
		best("1419 US-281, Falfurrias, TX 78355", [
			"1419 Boca Chica Boulevard, Brownsville, Texas 78520, United States",
			"1419 South Saint Mary's Street, Falfurrias, Texas 78355, United States",
			"281 North Saint Mary's Street, Falfurrias, Texas 78355, United States",
		]),
		"1419 South Saint Mary's Street, Falfurrias, Texas 78355, United States",
	);
});

test("Mapbox's order still decides when nothing else does", () => {
	// A strictly greater score wins, so an equal one leaves the earlier
	// candidate in front and the old behaviour is what remains.
	const tie = ["A Street, Alamo, Texas 78516, United States", "B Street, Alamo, Texas 78516, United States"];
	assert.equal(best("Somewhere, Alamo, TX 78516", tie), tie[0]);
});

/* ── The saved directory, and the towns it must not cross ────────────── */

test("a school name saved in one town does not answer for another", () => {
	/* The directory is checked BEFORE Mapbox and a hit skips geocoding
	   entirely, so a name-only match does not merely pick the wrong place — it
	   stops anything else from looking. A Corpus Christi band trip resolved to
	   "Veterans Memorial High School" in the Valley, 150 miles away and 5.7
	   miles from the yard, because the operator had the local one saved. */
	assert.equal(
		sameTown("Veterans Memorial High School, Corpus Christi, TX", "1200 Bryce Dr, Mission, TX 78572"),
		false,
	);
});

test("the same school in the same town still matches", () => {
	// The whole value of the directory is that a correction sticks. The check
	// must not reject the hits it exists to make.
	assert.equal(
		sameTown("Audie Murphy Middle School, Pharr, TX", "1400 N Cage Blvd, Pharr, TX 78577"),
		true,
	);
});

test("a customer's loose wording still matches a verified address", () => {
	// "Laredo Texas" with no comma is the customer's; the saved one is a real
	// street address. Containment either way is what accepts this.
	assert.equal(sameTown("Shirley Field, Laredo Texas", "2001 San Bernardo Ave, Laredo, TX 78040"), true);
});

test("an address with no town to read is not treated as a mismatch", () => {
	/* A saved entry predating this check is the operator's own record. Refusing
	   it would silently stop honouring corrections they already made. */
	assert.equal(sameTown("Somewhere", "1400 N Cage Blvd, Pharr, TX 78577"), true);
	assert.equal(sameTown("Audie Murphy Middle School, Pharr, TX", "The yard"), true);
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

test("a venue-and-town address is checked against the town it was handed", () => {
	/* The hole this closes: with no house number and no ZIP there was nothing
	   to compare, so sameAddress returned true and any answer at all passed.
	   Asked for a school name common to many states, the geocoder returned one
	   1,890 miles from the previous stop and it went straight into the mileage.
	   Naming a town and being handed a different one is a contradiction even
	   when no street number was given. */
	assert.equal(
		sameAddress("Veterans Memorial High School, Corpus Christi, TX", "700 E Mile 2 Rd, Mission, Texas 78574, United States"),
		false,
	);
	assert.equal(
		sameAddress("Shirley Field, Laredo, TX", "2001 San Bernardo Ave, Laredo, Texas 78040, United States"),
		true,
		"the same town still passes — this must not flag every venue lookup",
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

/* ── what the Grid does not model, it must not delete ─────────────────── */

/* The Grid is a single-leg editor: fromV3 reads legs.outbound and nothing
   else. That is a scope decision and it is fine. What was NOT fine is that
   toV3 hard-coded `type: "round_trip"` and wrote only legs.outbound, so
   loading a Drop-off / Pick-up draft and saving it returned a DIFFERENT trip
   — one leg gone, type silently rewritten — with nothing reported. These
   cases pin the carry-through. See docs/itinerary-workflow.md § Not built. */

function splitV3() {
	return {
		schema_version: 3,
		trip: {
			type: "dropoff_pickup",
			service_type: "ticketed",
			destination: "Austin, TX",
			legs: {
				outbound: {
					start_date: "2026-07-27",
					stops: [{ type: "pickup", name: "School", address: "1 Main St", arrival_time: "7:00 am" }],
				},
				return: {
					start_date: "2026-07-31",
					stops: [
						{ type: "pickup", name: "Hotel", address: "9 River Rd", arrival_time: "9:00 am" },
						{ type: "stop", name: "Campus", address: "4 Oak Ave", arrival_time: "1:00 pm" },
					],
				},
			},
		},
	};
}

test("a split trip's return leg survives a load-and-save round trip", () => {
	const out = toCleanV3(fromV3(splitV3()));
	assert.ok(out.trip.legs.return, "the return leg was dropped on save");
	assert.equal(out.trip.legs.return.start_date, "2026-07-31");
	const returning = out.trip.legs.return.stops.filter((stop) => stop.type !== "yard_origin");
	assert.equal(returning.length, 2);
	assert.equal(returning[1].name, "Campus");
});

test("the return leg is parsed and editable, not carried verbatim", () => {
	/* This replaces "carried byte-for-byte". That rule existed because the
	   Grid could not render the leg, so repacking it could only lose fields.
	   It can render it now, so couriering would be the workaround outliving
	   its reason — and would make the second leg the only part of the trip
	   nobody could fix. Byte-equality is deliberately NOT asserted: a parsed
	   leg re-emits in this editor's own normal form. */
	const state = fromV3(splitV3());
	const leg = state.legs.return;

	assert.ok(leg, "the return leg is a leg, not an opaque blob");
	assert.ok(leg.stops.length, "with real stops");
	assert.ok(leg.stops.every((stop) => typeof stop.id === "string"), "each normalized like any other");
	assert.equal(leg.startDate, splitV3().trip.legs.return.start_date);
});

test("editing the return leg changes only the return leg", () => {
	const state = fromV3(splitV3());
	const outboundBefore = JSON.stringify(state.legs.outbound.stops);

	state.activeLeg = "return";
	stated(state.legs.return)[0].name = "Edited on the inbound";

	const out = toCleanV3(state);
	assert.equal(
		out.trip.legs.return.stops.find((stop) => stop.type === "pickup").name,
		"Edited on the inbound",
	);
	assert.equal(
		JSON.stringify(state.legs.outbound.stops),
		outboundBefore,
		"the outbound leg is untouched by an edit on the other one",
	);
	assert.equal(out.trip.type, "dropoff_pickup", "and the trip is still a split trip");
});

test("trip type and service type survive instead of resetting to the defaults", () => {
	const out = toCleanV3(fromV3(splitV3()));
	assert.equal(out.trip.type, "dropoff_pickup", "type was rewritten to round_trip");
	assert.equal(out.trip.service_type, "ticketed");
});

test("a hand-entered grid still defaults to a charter round trip", () => {
	// The defaults only apply when the document did not state one, so an
	// empty grid is unchanged by the carry-through.
	const out = toCleanV3(fromV3(v3([
		{ type: "pickup", name: "School", address: "1 Main St", arrival_time: "7:00 am" },
	])));
	assert.equal(out.trip.type, "round_trip");
	assert.equal(out.trip.service_type, "charter");
	assert.equal(out.trip.legs.return, undefined, "a one-leg trip grew a return leg");
});

test("an unrecognised trip type falls back rather than being echoed", () => {
	/* A value outside v3's enum must not reach a document that has to
	   validate. What it falls back TO now depends on the legs: a document
	   carrying legs.return is a split trip whatever its type field says, and
	   answering "round_trip" would emit a document contradicting itself. */
	const bad = splitV3();
	bad.trip.type = "teleport";
	bad.trip.service_type = "barter";
	const out = toCleanV3(fromV3(bad));
	assert.equal(out.trip.type, "dropoff_pickup", "the return leg settles it");
	assert.equal(out.trip.service_type, "charter");

	const single = v3([{ type: "pickup", departure_time: "05:00" }]);
	single.trip.type = "teleport";
	assert.equal(toCleanV3(fromV3(single)).trip.type, "round_trip", "with one leg, round trip");
});
