import test from "node:test";
import assert from "node:assert/strict";

import {
	assignmentRoleLabel,
	assignmentStatus,
	buildAssignmentViewModel,
	formatAssignmentDateRange,
	formatAssignmentTime,
	formatOperationalNotes,
	normalizeFleetAssignments,
	normalizeSpotLocation,
	showCrewFleetModule,
	showRoleModule,
	sortAssignmentAlerts,
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
	assert.equal(view.dateRange, "THU, JUL 23");
	assert.equal(view.busLabel, "Bus 763");
	assert.equal(view.modules.some((module) => module.key === "crew-fleet"), false);
});

test("multi-day round trip formats a predictable range", () => {
	const view = buildAssignmentViewModel(assignment({ endDate: "2026-07-26" }));
	assert.equal(view.dateRange, "THU, JUL 23 – SUN, JUL 26");
	assert.equal(view.tripType, "Round Trip");
});

test("date formatting handles different months", () => {
	assert.equal(
		formatAssignmentDateRange("2026-07-30", "2026-08-02"),
		"THU, JUL 30 – SUN, AUG 2",
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

test("critical alerts sort first directly after Trip Overview", () => {
	const entry = assignment({
		alerts: [
			{ id: "info", severity: "info", title: "Trailer Attached" },
			{ id: "critical", severity: "critical", title: "Do Not Depart" },
			{ id: "warning", severity: "warning", title: "Hotel Required" },
		],
	});
	assert.equal(sortAssignmentAlerts(entry.alerts)[0].id, "critical");
	const modules = visibleAssignmentModules(entry);
	assert.equal(modules[0].key, "trip-overview");
	assert.equal(modules[1].key, "alerts");
	assert.equal(modules[1].data[0].id, "critical");
});

test("assignments without alerts do not render an Alerts module", () => {
	const keys = visibleAssignmentModules(assignment()).map((module) => module.key);
	assert.equal(keys.includes("alerts"), false);
	assert.equal(keys.includes("critical-alerts"), false);
});

test("assignments without contacts do not render Trip Contact", () => {
	const keys = visibleAssignmentModules(assignment({ contact: undefined }))
		.map((module) => module.key);
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
	assert.deepEqual(keys.map((module) => module.key), ["trip-overview"]);
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
