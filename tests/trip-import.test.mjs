/* Trip JSON import — the v3 draft format and the two it supersedes.
 *
 * v3 is a superset of v2, so half of this file is regression: v2 and legacy
 * payloads must come out byte-identical to how they came out before v3
 * existed. The other half covers what v3 adds — day offsets resolving to real
 * dates, a yard_origin row folding into the pickup, activity riding in the
 * label column, and address_confidence and data_flags becoming warnings.
 *
 * Schema: docs/trip-import-schema-v3.json. Prompt: docs/itinerary-prompt.md.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeTripImport } from "../js/data/trip-import.js";

const schemaV3 = JSON.parse(
	readFileSync(new URL("../docs/trip-import-schema-v3.json", import.meta.url)),
);

const stopsOf = (result) => result.trip.allTripStops;
const byType = (result, type) => stopsOf(result).filter((row) => row.type === type);
const firstOf = (result, type) => byType(result, type)[0];

function v3(stops, legOverrides = {}, rootOverrides = {}) {
	return {
		schema_version: 3,
		...rootOverrides,
		trip: {
			type: "round_trip",
			service_type: "charter",
			destination: "Austin, TX",
			legs: {
				outbound: {
					start_date: "2026-07-27",
					stops,
					...legOverrides,
				},
			},
			...(rootOverrides.trip ?? {}),
		},
	};
}

/* ── v3: day offsets ─────────────────────────────────────────────────── */

test("v3 resolves day offsets into real dates on each stop", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", name: "School", address: "101 E Hackberry Ave, McAllen, TX", departure_time: "05:00" },
		{ type: "stop", name: "Field", address: "1300 E MLK, Austin, TX", arrival_time: "10:00", departure_time: "14:30" },
		{ type: "stop", name: "Hotel", address: "500 E 4th St, Austin, TX", arrival_time: "15:14", departure_time: "08:00", day_offset: 1, departure_day_offset: 2 },
		{ type: "return", arrival_time: "18:00", day_offset: 2 },
	]));

	const [, field, hotel, back] = stopsOf(result);
	assert.equal(field.arrive_date, "2026-07-27", "day_offset 0 is the leg start date");
	assert.equal(hotel.arrive_date, "2026-07-28", "day_offset 1 is the next day");
	assert.equal(hotel.depart_prev, "14:30", "the previous location's departure carries forward");
	assert.equal(hotel.depart_prev_date, "2026-07-27");
	assert.equal(back.arrive_date, "2026-07-29", "day_offset 2 is two days on");
	assert.equal(back.depart_prev, "08:00", "a midnight-spanning stop departs on its departure_day_offset");
	assert.equal(back.depart_prev_date, "2026-07-29");
});

test("v3 derives end_date from the furthest day offset when it is omitted", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Field", arrival_time: "10:00", departure_time: "09:00", day_offset: 1, departure_day_offset: 3 },
		{ type: "return", arrival_time: "18:00", day_offset: 3 },
	]));
	assert.equal(result.trip.end_date, "2026-07-30");
});

test("v3 prefers a stated end_date over the derived one", () => {
	const result = normalizeTripImport(v3(
		[{ type: "pickup", departure_time: "05:00" }, { type: "return", arrival_time: "18:00" }],
		{ end_date: "2026-08-02" },
	));
	assert.equal(result.trip.end_date, "2026-08-02");
});

test("v3 leaves dates null when the leg has no usable start date", () => {
	const result = normalizeTripImport(v3(
		[
			{ type: "pickup", departure_time: "05:00" },
			{ type: "stop", name: "Field", arrival_time: "10:00", day_offset: 1 },
			{ type: "return", arrival_time: "18:00" },
		],
		{ start_date: "not a date" },
	));
	const field = firstOf(result, "stop");
	assert.equal(field.arrive, "10:00", "the time still imports");
	assert.equal(field.arrive_date, null, "a missing start date produces no guessed date");
	assert.equal(result.trip.end_date, null);
});

/* ── v3: the yard ────────────────────────────────────────────────────── */

test("v3 folds a yard_origin row into the pickup rather than making it a card", () => {
	const result = normalizeTripImport(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", name: "School", spot_time: "04:45", departure_time: "05:00" },
		{ type: "return", arrival_time: "18:00" },
	]));

	assert.equal(byType(result, "yard_origin").length, 0, "yard_origin is not a stop row");
	const pickup = firstOf(result, "pickup");
	assert.notEqual(
		pickup.label,
		"origin:yard",
		'the "origin:yard" sentinel means passengers board AT the depot — a normal '
			+ "charter departs the yard empty, so importing it would assert something false "
			+ "and let autoPopulatePickupDepart overwrite the stated yard time",
	);
	assert.equal(pickup.depart_prev, "04:15", "the yard departure lands on the pickup");
	assert.equal(pickup.depart_prev_date, "2026-07-27");
	assert.equal(pickup.spot, "04:45");
	assert.equal(pickup.spot_date, "2026-07-27");
});

test("v3 lets an explicit yard_departure_time on the pickup win over yard_origin", () => {
	const result = normalizeTripImport(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", yard_departure_time: "03:50", departure_time: "05:00" },
		{ type: "return", arrival_time: "18:00" },
	]));
	assert.equal(firstOf(result, "pickup").depart_prev, "03:50");
});

test("v3 falls back to a pickup's arrival_time for the spot time", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", arrival_time: "04:40", departure_time: "05:00" },
		{ type: "return", arrival_time: "18:00" },
	]));
	assert.equal(firstOf(result, "pickup").spot, "04:40");
});

/* ── v3: activity, confidence, flags ─────────────────────────────────── */

test("v3 stores activity in the label column, except on a pickup", () => {
	const result = normalizeTripImport(v3([
		{ type: "yard_origin", departure_time: "04:15" },
		{ type: "pickup", activity: "load passengers", departure_time: "05:00" },
		{ type: "stop", name: "Choctaw", activity: "casino", arrival_time: "10:00", departure_time: "14:00" },
		{ type: "return", arrival_time: "18:00" },
	]));

	assert.equal(firstOf(result, "stop").label, "casino");
	assert.equal(
		firstOf(result, "pickup").label,
		null,
		"a pickup's label is contested — the editor writes \"origin:yard\" over it "
			+ "whenever the dispatcher sets Passengers board at → Yard, so nothing "
			+ "durable can be stored there",
	);
});

test("v3 turns a soft address confidence into a warning naming the stop", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Ballpark", address: "somewhere on Main", address_confidence: "partial", arrival_time: "10:00" },
		{ type: "stop", name: "Lunch spot", address: "the diner by the highway", address_confidence: "source_text", arrival_time: "12:00" },
		{ type: "return", arrival_time: "18:00" },
	]));

	assert.ok(result.warnings.some((w) => w.includes("Ballpark") && w.includes("partly resolvable")));
	assert.ok(result.warnings.some((w) => w.includes("Lunch spot") && w.includes("source's own wording")));
});

test("v3 stays silent about an exact address", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Ballpark", address: "1300 E MLK, Austin, TX", address_confidence: "exact", arrival_time: "10:00" },
		{ type: "return", arrival_time: "18:00" },
	]));
	assert.ok(!result.warnings.some((w) => w.includes("Ballpark")));
});

test("v3 surfaces data_flags as questions for the customer", () => {
	const result = normalizeTripImport(v3(
		[{ type: "pickup", departure_time: "05:00" }, { type: "return", arrival_time: "18:00" }],
		{},
		{ data_flags: ["No return time was given.", "  ", "Two buses or one held over?"] },
	));

	assert.deepEqual(
		result.warnings.filter((w) => w.startsWith("Ask the customer:")),
		[
			"Ask the customer: No return time was given.",
			"Ask the customer: Two buses or one held over?",
		],
		"blank flags are dropped, real ones are prefixed",
	);
});

/* ── v3: structure ───────────────────────────────────────────────────── */

test("v3 reports its own schema version", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "return", arrival_time: "18:00" },
	]));
	assert.equal(result.schemaVersion, 3);
});

test("v3 supplies a missing pickup and return, with a warning for each", () => {
	const result = normalizeTripImport(v3([
		{ type: "stop", name: "Field", arrival_time: "10:00", departure_time: "14:30" },
	]));

	assert.deepEqual(stopsOf(result).map((row) => row.type), ["pickup", "stop", "return"]);
	assert.equal(firstOf(result, "return").depart_prev, "14:30", "the added return still gets the last departure");
	assert.equal(result.warnings.filter((w) => w.includes("was added")).length, 2);
});

test("v3 maps a sleeper's rest window onto the editor's two time fields", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "sleeper", name: "Marriott", rest_start_time: "22:00", rest_end_time: "07:00", day_offset: 0, departure_day_offset: 1 },
		{ type: "return", arrival_time: "18:00", day_offset: 1 },
	]));

	const sleeper = firstOf(result, "sleeper");
	assert.equal(sleeper.depart_prev, "22:00");
	assert.equal(sleeper.depart_prev_date, "2026-07-27");
	assert.equal(sleeper.arrive, "07:00");
	assert.equal(sleeper.arrive_date, "2026-07-28", "the rest window ends on the next day");
	assert.equal(firstOf(result, "return").depart_prev, "07:00", "the trip resumes at the rest end");
});

test("v3 skips an unknown stop type with a warning instead of throwing", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "ferry", name: "Nope" },
		{ type: "return", arrival_time: "18:00" },
	]));
	assert.deepEqual(stopsOf(result).map((row) => row.type), ["pickup", "return"]);
	assert.ok(result.warnings.some((w) => w.includes('"ferry"')));
});

test("v3 carries stated mileage through as manual, and leaves the rest estimated", () => {
	const result = normalizeTripImport(v3([
		{ type: "pickup", departure_time: "05:00" },
		{ type: "stop", name: "Field", arrival_time: "10:00", distance_miles: 37.7, drive_time: "0:44" },
		{ type: "return", arrival_time: "18:00" },
	]));

	const field = firstOf(result, "stop");
	assert.equal(field.miles, 37.7);
	assert.equal(field.drive, "0:44");
	assert.equal(field.miles_source, "manual");
	assert.equal(firstOf(result, "return").miles_source, "estimated");
});

test("v3 routes a split trip's second leg against its own start date", () => {
	const result = normalizeTripImport({
		schema_version: 3,
		trip: {
			type: "dropoff_pickup",
			service_type: "charter",
			destination: "Durant, OK",
			legs: {
				outbound: {
					start_date: "2026-07-26",
					stops: [
						{ type: "pickup", departure_time: "06:00" },
						{ type: "stop", name: "Choctaw", arrival_time: "16:30" },
						{ type: "return" },
					],
				},
				return: {
					start_date: "2026-07-29",
					stops: [
						{ type: "pickup", departure_time: "09:00" },
						{ type: "stop", name: "Raymondville ISD", arrival_time: "19:30", day_offset: 1 },
						{ type: "return" },
					],
				},
			},
		},
	});

	const returnLeg = stopsOf(result).filter((row) => row.leg === "return");
	assert.equal(returnLeg.length, 3);
	assert.equal(returnLeg[1].arrive_date, "2026-07-30", "the return leg counts offsets from its own start");
	assert.equal(result.trip.return_end_date, "2026-07-30");
	assert.equal(
		stopsOf(result).map((row) => row.position).join(","),
		"0,1,2,3,4,5",
		"positions stay gapless across both legs",
	);
});

/* ── drift: the schema and the importer must agree ───────────────────── */

test("every stop type the v3 schema declares is one the importer handles", () => {
	// There is no JSON Schema validator in this repo — zero dependencies by
	// design — so this is the guard that a type added to the schema does not
	// silently become an "unknown stop type" warning at import.
	const declared = schemaV3.$defs.stop.oneOf
		.map((branch) => schemaV3.$defs[branch.$ref.replace("#/$defs/", "")])
		.map((def) => (def.allOf ? def.allOf[1] : def).properties.type.const);

	assert.deepEqual(
		declared.slice().sort(),
		["day", "pickup", "return", "sleeper", "stop", "yard_origin"],
		"the schema's stop union changed — update the importer to match",
	);

	for (const type of declared) {
		const result = normalizeTripImport(v3([
			{ type: "pickup", departure_time: "05:00" },
			{ type, name: "Somewhere", arrival_time: "10:00" },
			{ type: "return", arrival_time: "18:00" },
		]));
		assert.ok(
			!result.warnings.some((w) => w.includes(`"${type}"`)),
			`the importer rejected "${type}", which the schema declares valid`,
		);
	}
});

/* ── the prompt and the importer must stay in step ───────────────────── */

test("the worked example in docs/itinerary-prompt.md imports cleanly", () => {
	// The original failure this whole format replaced was a prompt that emitted
	// JSON nothing could read. The prompt is what a person actually pastes, so
	// its own example is the thing worth pinning.
	const prompt = readFileSync(new URL("../docs/itinerary-prompt.md", import.meta.url), "utf8");
	const example = [...prompt.matchAll(/```json\n([\s\S]*?)```/g)]
		.map(([, body]) => { try { return JSON.parse(body); } catch { return null; } })
		.filter((doc) => doc?.schema_version === 3 && doc.trip?.legs?.outbound?.stops?.length)
		.pop();
	assert.ok(example, "the prompt should carry one complete v3 example");

	const result = normalizeTripImport(example);
	assert.equal(result.schemaVersion, 3);
	assert.equal(result.trip.start_date, "2026-07-27");
	assert.equal(result.trip.end_date, "2026-07-28", "the overnight extends the trip by a day");
	assert.deepEqual(
		stopsOf(result).map((row) => row.type),
		["pickup", "stop", "stop", "return"],
		"an overnight the bus drives to is a stop, not a sleeper — a sleeper has "
			+ "no address and a zero-mile leg, which would lose the hotel round trip",
	);

	const hotel = stopsOf(result)[2];
	assert.equal(hotel.address, "500 E 4th St, Austin, TX 78701");
	assert.equal(hotel.depart_prev, "14:30", "it is reached by a real leg from the field");
	assert.equal(hotel.label, "overnight");
	assert.equal(
		firstOf(result, "return").depart_prev_date,
		"2026-07-28",
		"leaving the hotel is the next morning",
	);
});

/* ── regression: v2 and legacy are untouched ─────────────────────────── */

test("v2 still imports exactly as it did, with no dates invented", () => {
	const result = normalizeTripImport({
		schema_version: 2,
		trip: {
			type: "round_trip",
			service_type: "charter",
			client: "McAllen Memorial High School",
			destination: "Austin, TX",
			booking_contact: { name: "Pete Ramirez", phone: "956-792-0178", email: "pete@example.org" },
			trip_contacts: [{ name: "Maria Reyes", phone: "956-555-0148" }],
			requirements: ["fuelCard", "hotel"],
			legs: {
				outbound: {
					start_date: "2026-07-27",
					end_date: "2026-07-30",
					bus_count: 2,
					stops: [
						{ type: "pickup", name: "School", spot_time: "04:45", departure_time: "05:00" },
						{ type: "stop", name: "Field", arrival_time: "10:00", departure_time: "14:30" },
						{ type: "return", arrival_time: "20:00" },
					],
				},
			},
		},
	});

	assert.equal(result.schemaVersion, 2);
	assert.equal(result.trip.customer, "McAllen Memorial High School");
	assert.equal(result.trip.start_date, "2026-07-27");
	assert.equal(result.trip.end_date, "2026-07-30");
	assert.equal(result.trip.bus_count, 2);
	assert.equal(result.trip.booking_contact_name, "Pete Ramirez");
	assert.equal(result.trip.trip_contact_1_phone, "956-555-0148");
	assert.equal(result.trip.need_fuel_card, true);
	assert.equal(result.trip.need_hotel, true);

	const [pickup, field, back] = stopsOf(result);
	assert.equal(pickup.spot, "04:45");
	assert.equal(field.depart_prev, "05:00", "v2's carry-forward is unchanged");
	assert.equal(field.arrive, "10:00");
	assert.equal(back.depart_prev, "14:30");
	assert.equal(field.arrive_date, undefined, "v2 sets no dates, as before");
});

test("v2 with no end_date still yields null rather than deriving one", () => {
	const result = normalizeTripImport({
		schema_version: 2,
		trip: {
			type: "round_trip",
			service_type: "charter",
			destination: "Austin, TX",
			legs: {
				outbound: {
					start_date: "2026-07-27",
					stops: [{ type: "pickup", departure_time: "05:00" }, { type: "return" }],
				},
			},
		},
	});
	assert.equal(result.trip.end_date, null);
});

test("a legacy payload with no schema_version still imports as v1", () => {
	const result = normalizeTripImport({
		customer: "Raymondville ISD",
		destination: "Durant, OK",
		start_date: "2026-07-26",
		stops: [
			{ type: "pickup", name: "Raymondville ISD", spot: "05:45" },
			{ type: "return", arrive: "19:30" },
		],
	});
	assert.equal(result.schemaVersion, 1);
	assert.equal(result.trip.customer, "Raymondville ISD");
	assert.equal(stopsOf(result).length, 2);
});

test("an unsupported schema version is refused by number", () => {
	assert.throws(
		() => normalizeTripImport({ schema_version: 4, trip: {} }),
		/Unsupported trip JSON schema version: 4/,
	);
});

test("a draft version with no trip object is refused", () => {
	assert.throws(
		() => normalizeTripImport({ schema_version: 3 }),
		/Unsupported trip JSON schema version: 3/,
	);
});

test("a non-object payload is refused", () => {
	assert.throws(() => normalizeTripImport([]), /Expected a JSON object/);
	assert.throws(() => normalizeTripImport(null), /Expected a JSON object/);
});
