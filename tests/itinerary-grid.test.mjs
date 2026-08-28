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
	legRisks, yardPlan, dutyByDay, sameAddress,
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
	// Depart 05:00, 15 minutes of spot padding, 45 minutes from the yard,
	// 15 minutes of pre-trip before that.
	const plan = yardPlan([
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", depart: "05:00", drive: "0:45" }),
	]);
	assert.equal(plan.spot, "04:45");
	assert.equal(plan.roll, "04:00");
	assert.equal(plan.report, "03:45");
});

test("the yard plan wraps backwards past midnight", () => {
	const plan = yardPlan([
		normalizeStop({ type: "yard_origin" }),
		normalizeStop({ type: "pickup", depart: "00:30", drive: "1:00" }),
	]);
	assert.equal(plan.spot, "00:15");
	assert.equal(plan.roll, "23:15");
	assert.equal(plan.report, "23:00");
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
