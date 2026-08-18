import test from "node:test";
import assert from "node:assert/strict";
import {
	buildDraft,
	validateDraft,
	normalizePassengerCount,
	recommendedBusCount,
	SEATS_PER_BUS,
	documentError,
	formatFileSize,
	MAX_DOCUMENT_BYTES,
} from "../js/core/trip-request-model.js";

const baseValues = {
	type: "round_trip",
	client: "Raymondville ISD",
	destination: "Austin, TX",
	bookingContact: { name: "Meredith Gonzalez", phone: "956-689-8184", email: "mg@isd.net" },
	pickup: { date: "2026-07-26", time: "05:00", address: "101 E Hackberry Ave, McAllen, TX" },
	returnDate: "2026-07-29",
	passengerCount: "45",
	requirements: ["sleeper", "fuelCard", "sleeper"],
	tripContact: { name: "Ricky", phone: "956-555-0100" },
	contactNotNeeded: false,
	notes: "Bring water.",
};

test("buildDraft emits schema_version 2 with a round trip", () => {
	const draft = buildDraft(baseValues);
	assert.equal(draft.schema_version, 2);
	assert.equal(draft.trip.type, "round_trip");
	assert.equal(draft.trip.service_type, "charter");
	assert.equal(draft.trip.destination, "Austin, TX");
	assert.equal(draft.trip.client, "Raymondville ISD");
	assert.equal(draft.trip.booking_contact.email, "mg@isd.net");
	// Round trip: outbound end_date is the return date.
	assert.equal(draft.trip.legs.outbound.start_date, "2026-07-26");
	assert.equal(draft.trip.legs.outbound.end_date, "2026-07-29");
	// Only one continuous leg for a round trip — no return leg.
	assert.equal(draft.trip.legs.return, undefined);
});

test("buildDraft keeps selected pickup as the scheduling anchor stop", () => {
	const [stop] = buildDraft(baseValues).trip.legs.outbound.stops;
	assert.equal(stop.type, "pickup");
	assert.equal(stop.address, "101 E Hackberry Ave, McAllen, TX");
	assert.equal(stop.spot_time, "05:00");
});

test("buildDraft dedupes and validates requirements to known ids", () => {
	const draft = buildDraft({ ...baseValues, requirements: ["sleeper", "sleeper", "nonsense"] });
	assert.deepEqual(draft.trip.requirements, ["sleeper"]);
});

test("buildDraft maps day-of contact and skips it when not needed", () => {
	const withContact = buildDraft(baseValues);
	assert.deepEqual(withContact.trip.trip_contacts, [{ name: "Ricky", phone: "956-555-0100" }]);

	const noContact = buildDraft({ ...baseValues, contactNotNeeded: true });
	assert.equal(noContact.trip.contact_not_needed, true);
	assert.equal(noContact.trip.trip_contacts, undefined);
});

test("buildDraft produces two legs for a split trip", () => {
	const draft = buildDraft({
		...baseValues,
		type: "dropoff_pickup",
		split: { date: "2026-07-30", name: "Choctaw Casino", address: "4216 S Hwy 69/75" },
	});
	assert.equal(draft.trip.legs.outbound.start_date, "2026-07-26");
	assert.equal(draft.trip.legs.return.start_date, "2026-07-30");
	assert.equal(draft.trip.legs.return.stops[0].name, "Choctaw Casino");
});

test("buildDraft emits one-way outbound only", () => {
	const draft = buildDraft({ ...baseValues, type: "one_way" });
	assert.equal(draft.trip.type, "one_way");
	assert.equal(draft.trip.legs.outbound.end_date, "2026-07-26");
	assert.equal(draft.trip.legs.return, undefined);
});

test("recommendedBusCount fills coaches at the advertised seat count", () => {
	// 52 is the advertised capacity, deliberately below the 56-seat coaches
	// dispatch assigns itself. Changing this to 56 would quote customers
	// fewer buses than a trip needs — see SEATS_PER_BUS.
	assert.equal(SEATS_PER_BUS, 52);
	assert.equal(recommendedBusCount(""), 1, "no count yet still means one bus");
	assert.equal(recommendedBusCount("1"), 1);
	assert.equal(recommendedBusCount("52"), 1, "a full coach is still one bus");
	assert.equal(recommendedBusCount("53"), 2, "one over rolls to a second");
	assert.equal(recommendedBusCount("104"), 2);
	// normalizePassengerCount caps at 200, so this can never reach the
	// schema's bus_count maximum of 20 — but the clamp is there regardless.
	assert.equal(recommendedBusCount("999"), 4);
});

test("buildDraft carries the recommended bus count onto every leg", () => {
	const draft = buildDraft({ ...baseValues, passengerCount: "104" });
	assert.equal(draft.trip.legs.outbound.bus_count, 2);

	const split = buildDraft({
		...baseValues,
		type: "dropoff_pickup",
		passengerCount: "104",
		split: { date: "2026-07-29" },
	});
	assert.equal(split.trip.legs.outbound.bus_count, 2);
	assert.equal(split.trip.legs.return.bus_count, 2);
});

test("documentError accepts the formats customers actually send", () => {
	// The three the request form exists to receive.
	assert.equal(documentError({ name: "itinerary.pdf", size: 2048 }), "");
	assert.equal(documentError({ name: "Trip Plan.docx", size: 2048 }), "");
	assert.equal(documentError({ name: "roster.xlsx", size: 2048 }), "");
	// A phone photo of a printed itinerary is the same request.
	assert.equal(documentError({ name: "IMG_0042.HEIC", size: 2048 }), "");
	assert.equal(documentError({ name: "scan.JPG", size: 2048 }), "");
});

test("documentError rejects what storage would reject anyway", () => {
	assert.match(documentError({ name: "payload.zip", size: 10 }), /PDF, Word/);
	assert.match(documentError({ name: "run.exe", size: 10 }), /PDF, Word/);
	assert.match(documentError({ name: "noextension", size: 10 }), /PDF, Word/);
	assert.equal(documentError({ name: "", size: 10 }), "That file could not be read");
	// The bucket's own file_size_limit is the same 10 MB — see
	// supabase/trip_request_documents.sql. This just says so in English first.
	assert.match(
		documentError({ name: "big.pdf", size: MAX_DOCUMENT_BYTES + 1 }),
		/under 10 MB/,
	);
	assert.equal(documentError({ name: "edge.pdf", size: MAX_DOCUMENT_BYTES }), "");
});

test("formatFileSize stays readable at each magnitude", () => {
	assert.equal(formatFileSize(0), "");
	assert.equal(formatFileSize(512), "512 B");
	assert.equal(formatFileSize(2048), "2 KB");
	assert.equal(formatFileSize(5 * 1024 * 1024), "5.0 MB");
});

test("normalizers clamp passenger counts", () => {
	assert.equal(normalizePassengerCount(""), null);
	assert.equal(normalizePassengerCount("45"), 45);
	assert.equal(normalizePassengerCount("999"), 200);
test("validateDraft returns no errors for a complete round trip", () => {
	assert.deepEqual(validateDraft(baseValues), {});
});

test("validateDraft flags missing booking name and email", () => {
	const errors = validateDraft({ ...baseValues, bookingContact: { name: "", email: "" } });
	assert.equal(errors["booking.name"], "Enter a name we can reach you at");
	assert.equal(errors["booking.email"], "Enter an email for your quote");
});

test("validateDraft rejects a bad email", () => {
	const errors = validateDraft({ ...baseValues, bookingContact: { name: "A", email: "not-an-email" } });
	assert.equal(errors["booking.email"], "Enter a valid email");
});

test("validateDraft requires a destination and pickup info", () => {
	const errors = validateDraft({
		...baseValues,
		destination: "",
		pickup: { date: "", address: "" },
	});
	assert.equal(errors.destination, "Enter the destination");
	assert.equal(errors["pickup.date"], "Choose a pickup date");
	assert.equal(errors["pickup.address"], "Enter the pickup address or venue");
});

test("validateDraft accepts a valid pickup address", () => {
	const errors = validateDraft({
		...baseValues,
		pickup: { date: "2026-07-26", address: "101 E Hackberry Ave" },
	});
	assert.equal(errors["pickup.address"], undefined);
});

test("validateDraft rejects a return date before the pickup date", () => {
	const errors = validateDraft({ ...baseValues, returnDate: "2026-07-20" });
	assert.equal(errors.returnDate, "Return date can't be before pickup date");
});

test("validateDraft requires a return pickup date for split trips", () => {
	const errors = validateDraft({ ...baseValues, type: "dropoff_pickup", split: { date: "" } });
	assert.equal(errors["split.date"], "Enter the return pickup date");
});

});