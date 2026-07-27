import test from "node:test";
import assert from "node:assert/strict";

import {
	assignmentRoleLabel,
	assignmentStatus,
	buildAssignmentViewModel,
	driverDocuments,
	formatAssignmentDateRange,
	formatAssignmentHeaderDateRange,
	formatAssignmentTime,
	formatOperationalNotes,
	normalizeFleetAssignments,
	normalizeSpotLocation,
	operationalTripContact,
	showCrewFleetModule,
	showRoleModule,
	visibleAssignmentModules,
} from "../js/components/driver-assignment-model.js";

function assignment(overrides = {}) {
	return {
		id: "assignment-1",
		startDate: "2026-07-23",
		endDate: "2026-07-23",
		busNumber: "763",
		role: "driver",
		trip: {
			customer: "Donna High School",
			trip_type: "round_trip",
		},
		from: "7250 Val Verde Rd, Donna, TX",
		to: "Austin, TX",
		spotTime: "05:15",
		spotLocation: {
			addressLine1: "7250 Val Verde Rd",
			city: "Donna",
			state: "TX",
			postalCode: "78537",
		},
		...overrides,
	};
}

test("one-day trip formats one date and omits single-driver fleet", () => {
	const view = buildAssignmentViewModel(assignment());
	assert.equal(view.dateRange, "THURSDAY, JUL 23");
	assert.equal(view.datePrimary, "Jul 23");
	assert.equal(view.dateWeekdays, "Thursday");
	assert.equal(view.busLabel, "Bus 763");
	assert.equal(view.modules.some((module) => module.key === "crew-fleet"), false);
});

test("multi-day round trip formats a predictable range", () => {
	const view = buildAssignmentViewModel(assignment({ endDate: "2026-07-26" }));
	assert.equal(view.dateRange, "THURSDAY, JUL 23 – JUL 26");
	assert.equal(view.datePrimary, "Jul 23–26");
	assert.equal(view.dateWeekdays, "Thu–Sun");
	assert.equal(view.tripType, "Round-Trip");
	assert.equal(view.origin, "Donna, TX");
	assert.equal(view.destination, "Austin, TX");
	assert.equal(
		buildAssignmentViewModel(assignment({
			trip: { customer: "Donna High School", trip_type: "one_way" },
		})).tripType,
		"One-Way",
	);
});

test("date formatting handles different months", () => {
	assert.equal(
		formatAssignmentDateRange("2026-07-30", "2026-08-02"),
		"THURSDAY, JUL 30 – AUG 2",
	);
	assert.deepEqual(
		formatAssignmentHeaderDateRange("2026-07-30", "2026-08-02"),
		{ primary: "Jul 30–Aug 2", weekdays: "Thu–Sun" },
	);
});

test("compact header dates handle the reference range and different years", () => {
	assert.deepEqual(
		formatAssignmentHeaderDateRange("2026-07-26", "2026-07-29"),
		{ primary: "Jul 26–29", weekdays: "Sun–Wed" },
	);
	assert.deepEqual(
		formatAssignmentHeaderDateRange("2026-12-30", "2027-01-02"),
		{ primary: "Dec 30, 2026–Jan 2, 2027", weekdays: "Wed–Sat" },
	);
});

test("relief driver preserves full role label and handoff fields", () => {
	const view = buildAssignmentViewModel(assignment({
		role: "relief-start",
		roleDetails: {
			takeoverTime: "15:45",
			takeoverLocation: "Austin Convention Center",
			relievesDriverName: "Jose Garcia",
		},
	}));
	assert.equal(assignmentRoleLabel("relief-start"), "Relief Driver");
	assert.equal(view.roleDetails.takeoverTime, "3:45 PM");
	assert.equal(view.roleDetails.takeoverLocation, "Austin Convention Center");
	assert.equal(showRoleModule(assignment()), false);
	assert.equal(showRoleModule(assignment({ role: "relief-start" })), true);
});

test("multi-bus trips show Crew & Fleet", () => {
	const entry = assignment({
		fleetAssignments: [
			{ busNumber: "763", isCurrentBus: true, crew: [] },
			{ busNumber: "746", crew: [{ id: "2", name: "Jose", role: "driver" }] },
		],
	});
	assert.equal(showCrewFleetModule(entry), true);
});

test("one bus with driver and relief driver shows Crew & Fleet", () => {
	const entry = assignment({
		fleetAssignments: [{
			busNumber: "763",
			crew: [
				{ id: "3", name: "Maria", role: "relief-start" },
			],
		}],
	});
	assert.equal(showCrewFleetModule(entry), true);
});

test("fleet normalization excludes the current driver and preserves other buses", () => {
	const fleet = normalizeFleetAssignments({
		trip_assignments: [
			{
				id: "assignment-current",
				leg: "outbound",
				bus_id: "bus-763",
				buses: { id: "bus-763", number: "763" },
				active_roles: ["driver", "relief-start"],
				trip_drivers: [
					{ driver_id: "jorge", role: "driver", drivers: { name: "Jorge" } },
					{ driver_id: "maria", role: "relief-start", drivers: { name: "Maria", phone: "555-1" } },
				],
			},
			{
				id: "assignment-other",
				leg: "outbound",
				bus_id: "bus-746",
				buses: { id: "bus-746", number: "746" },
				trip_drivers: [
					{ driver_id: "jose", role: "driver", drivers: { name: "Jose", phone: "555-2" } },
				],
			},
		],
	}, "outbound", { id: "assignment-current" }, "jorge");
	assert.equal(fleet.length, 2);
	assert.equal(fleet[0].isCurrentBus, true);
	assert.deepEqual(fleet.flatMap((bus) => bus.crew.map((member) => member.name)), ["Maria", "Jose"]);
});

test("pending, accepted, and declined statuses normalize", () => {
	assert.equal(assignmentStatus(assignment()), "pending");
	assert.equal(assignmentStatus(assignment({ confirmedAt: "2026-07-20T12:00:00Z" })), "accepted");
	assert.equal(assignmentStatus(assignment({ status: "declined" })), "declined");
});

test("spot location and trip contact share one reporting module", () => {
	const entry = assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
		alerts: [
			{ id: "info", severity: "info", title: "Trailer Attached" },
			{ id: "critical", severity: "critical", title: "Do Not Depart" },
			{ id: "warning", severity: "warning", title: "Hotel Required" },
		],
	});
	const modules = visibleAssignmentModules(entry);
	assert.deepEqual(
		modules.slice(0, 1).map((module) => module.key),
		["spot-location"],
	);
	const keys = modules.map((module) => module.key);
	assert.equal(keys.includes("contact"), false);
	assert.equal(keys.includes("alerts"), false);
	assert.equal(keys.includes("critical-alerts"), false);
});

test("assignment cards prefer operational trip contacts over booking contacts", () => {
	const trip = {
		booking_contact_name: "Carla Dominguez",
		booking_contact_phone: "956-111-0000",
		trip_contact_1_name: "Gabriela Najera",
		trip_contact_1_phone: "956-314-9165",
		trip_contact_2_name: "Chris Hernandez",
		trip_contact_2_phone: "361-947-9207",
	};
	assert.deepEqual(
		operationalTripContact(trip),
		{ name: "Gabriela Najera", phone: "956-314-9165" },
	);
});

test("assignment contact falls back through secondary and booking contacts", () => {
	assert.deepEqual(
		operationalTripContact({
			trip_contact_2_name: "Chris Hernandez",
			trip_contact_2_phone: "361-947-9207",
			booking_contact_name: "Carla Dominguez",
		}),
		{ name: "Chris Hernandez", phone: "361-947-9207" },
	);
	assert.deepEqual(
		operationalTripContact({
			booking_contact_name: "Carla Dominguez",
			booking_contact_phone: "956-111-0000",
		}),
		{ name: "Carla Dominguez", phone: "956-111-0000" },
	);
});

test("assignments without contacts retain reporting details without a contact module", () => {
	const keys = visibleAssignmentModules(assignment({ contact: undefined }))
		.map((module) => module.key);
	assert.equal(keys.includes("spot-location"), true);
	assert.equal(keys.includes("contact"), false);
});

test("several documents produce one Documents module", () => {
	const keys = visibleAssignmentModules(assignment({
		documents: [
			{ id: "1", label: "Itinerary" },
			{ id: "2", label: "Roster" },
			{ id: "3", label: "Parking Permit" },
		],
	})).map((module) => module.key);
	assert.equal(keys.filter((key) => key === "documents").length, 1);
});

test("driver resources exclude purchase orders and unrelated attachments", () => {
	const documents = driverDocuments([
		{ id: "1", type: "itinerary", label: "Itinerary" },
		{ id: "2", type: "purchase_order", label: "PO" },
		{ id: "3", type: "envelope", label: "Envelope" },
		{ id: "4", type: "roster", label: "Roster" },
	]);
	assert.deepEqual(documents.map((document) => document.label), [
		"Itinerary",
		"Envelope",
	]);
});

test("long locations remain intact in the view model", () => {
	const customer = "The International Academy for Science, Technology, Engineering, and Mathematics";
	const destination = "Henry B. González Convention Center Campus Loading Entrance";
	const view = buildAssignmentViewModel(assignment({
		to: destination,
		trip: {
			customer,
			trip_type: "round_trip",
		},
	}));
	assert.equal(view.customerName, customer);
	assert.equal(view.destination, destination);
});

test("missing optional data produces no empty optional modules", () => {
	const keys = visibleAssignmentModules(assignment({
		contact: {},
		alerts: [],
		documents: [],
		notes: "  ",
		fleetAssignments: [],
	}));
	assert.deepEqual(
		keys.map((module) => module.key),
		["spot-location"],
	);
});

test("spot time without route or location still renders in the spot section", () => {
	const modules = visibleAssignmentModules(assignment({
		from: "",
		to: "",
		origin: null,
		destination: null,
		customerName: "",
		trip: {},
		spotLocation: null,
	}));
	assert.deepEqual(
		modules.map((module) => module.key),
		["spot-location"],
	);
});

test("timezone-aware timestamps use the trip timezone", () => {
	assert.equal(
		formatAssignmentTime("2026-07-23T10:15:00Z", "America/Chicago"),
		"5:15 AM",
	);
});

test("domestic spot locations split into scannable lines", () => {
	assert.deepEqual(
		normalizeSpotLocation(
			"Raymondville High School",
			"601 FM 3168, Raymondville, Texas 78580, United States",
		),
		{
			name: "Raymondville High School",
			addressLine1: "601 FM 3168",
			city: "Raymondville",
			state: "TX",
			postalCode: "78580",
		},
	);
});

test("short lowercase operational notes receive light presentation normalization", () => {
	assert.equal(formatOperationalNotes("relief driver needed"), "Relief driver needed.");
	assert.equal(
		formatOperationalNotes("Call dispatch before leaving Austin."),
		"Call dispatch before leaving Austin.",
	);
});
