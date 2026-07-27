import { supabase } from "./supabase.js";
import { getCurrentProfile } from "../core/profile.js";

const HISTORY_PAGE_SIZE = 50;

const TRIP_FIELDS = [
	["trip_ref", "Trip ID"],
	["customer", "Client"],
	["destination", "Destination"],
	["start_date", "Start date"],
	["end_date", "End date"],
	["return_start_date", "Inbound start date"],
	["return_end_date", "Inbound end date"],
	["trip_type", "Trip type"],
	["is_self_organized", "Billing type", "billingType"],
	["trip_bar_color", "Trip color"],
	["booking_contact_name", "Booking contact"],
	["booking_contact_phone", "Booking phone"],
	["booking_contact_email", "Booking email"],
	["trip_contact_1_name", "Trip contact"],
	["trip_contact_1_phone", "Trip phone"],
	["trip_contact_2_name", "Alternate trip contact"],
	["trip_contact_2_phone", "Alternate trip phone"],
	["notes", "Notes"],
	["contract_status", "Contract status"],
	["contract_note", "Contract note"],
	["quoted_price", "Quoted price", "money"],
	["deposit_amount", "Payments received", "money"],
	["est_miles", "Estimated miles", "number"],
	["actual_miles", "Actual miles", "number"],
	["driving_hours", "Drive hours", "number"],
	["on_duty_hours", "On-duty hours", "number"],
	["invoice_status", "Invoice status"],
	["po_ref", "PO"],
	["invoice_number", "Invoice"],
	["date_paid", "Date paid"],
	["bus_count", "Bus count", "number"],
	["return_bus_count", "Inbound bus count", "number"],
	["confirmed", "Confirmed", "boolean"],
	["contact_not_needed", "Contact required", "inverseBoolean"],
	["itinerary_not_needed", "Itinerary required", "inverseBoolean"],
	["po_received", "PO received", "boolean"],
	["invoiced", "Invoiced", "boolean"],
	["balance_paid", "Balance paid", "boolean"],
];

const TRIP_TYPE_LABELS = {
	round_trip: "Round trip",
	one_way: "One-way",
	dropoff_pickup: "Split trip",
};

const REQUIREMENT_LABELS = {
	pax56: "56 passenger",
	oneWay: "One-way",
	sleeper: "Sleeper",
	fuelCard: "Fuel card",
	adaLift: "Wheelchair lift",
	hotel: "Hotel",
	wifi: "Wi-Fi",
};

function normalized(value) {
	if (value === undefined || value === "") return null;
	return value;
}

function stableValue(value) {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, stableValue(value[key])]),
		);
	}
	return normalized(value);
}

function sameValue(a, b) {
	return JSON.stringify(stableValue(a)) === JSON.stringify(stableValue(b));
}

function formatValue(value, kind, field) {
	const resolved = normalized(value);
	if (resolved === null) return null;
	if (field === "trip_type") return TRIP_TYPE_LABELS[resolved] || String(resolved);
	if (kind === "boolean") return resolved ? "Yes" : "No";
	if (kind === "inverseBoolean") return resolved ? "No" : "Yes";
	if (kind === "billingType") return resolved ? "Ticketed" : "Charter";
	if (kind === "money") {
		const number = Number(resolved);
		return Number.isFinite(number)
			? number.toLocaleString(undefined, { style: "currency", currency: "USD" })
			: String(resolved);
	}
	if (kind === "number") {
		const number = Number(resolved);
		return Number.isFinite(number) ? number.toLocaleString() : String(resolved);
	}
	return String(resolved);
}

function optionMap(items, valueKey, labelKey) {
	return new Map(
		(items || [])
			.filter((item) => item?.[valueKey])
			.map((item) => [String(item[valueKey]), String(item[labelKey] ?? item[valueKey])]),
	);
}

function assignmentSummary(assignments, options = {}) {
	if (!assignments?.length) return null;
	const buses = optionMap(options.buses, "id", "number");
	const drivers = optionMap(options.drivers, "id", "name");
	return assignments
		.slice()
		.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		.map((assignment) => {
			const leg = assignment.leg === "return" ? "Inbound" : "Outbound";
			const bus = assignment.bus_id
				? `Bus ${buses.get(String(assignment.bus_id)) || assignment.bus_id}`
				: "No bus";
			const crew = (assignment.drivers || assignment.trip_drivers || [])
				.filter((driver) => driver?.driver_id)
				.map((driver) => {
					const role = {
						driver: "Driver",
						coDriver: "Co-driver",
						"co-driver": "Co-driver",
						relief1: "Relief driver",
						relief2: "Relief driver",
						"relief-start": "Relief driver",
						"relief-end": "Relief driver",
					}[driver.role] || driver.role || "Driver";
					const details = [
						driver.pay ? `$${Number(driver.pay).toLocaleString()}` : null,
						driver.report_time ? `report ${driver.report_time}` : null,
					].filter(Boolean);
					return `${role}: ${drivers.get(String(driver.driver_id)) || driver.driver_id}${
						details.length ? ` (${details.join(" · ")})` : ""
					}`;
				});
			return [leg, bus, ...crew].join(" · ");
		})
		.join(" | ");
}

function significantAssignments(assignments = []) {
	return assignments
		.map((assignment) => ({
			bus_id: assignment.bus_id || null,
			position: assignment.position ?? null,
			leg: assignment.leg || "outbound",
			active_roles: assignment.active_roles || ["driver"],
			drivers: (assignment.drivers || assignment.trip_drivers || [])
				.map((driver) => ({
					driver_id: driver.driver_id || null,
					role: driver.role || "driver",
					pay: driver.pay === null || driver.pay === undefined || driver.pay === ""
						? null
						: Number(driver.pay),
					report_time: normalized(driver.report_time),
					instructions: normalized(driver.instructions),
				}))
				.sort((a, b) => `${a.role}:${a.driver_id}`.localeCompare(`${b.role}:${b.driver_id}`)),
		}))
		.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function significantStops(stops = []) {
	return stops.map((stop) => ({
		leg: stop.leg || "outbound",
		type: stop.type || null,
		label: stop.label || null,
		name: stop.name || null,
		address: stop.address || null,
		depart_prev: stop.depart_prev || stop.departPrev || null,
		arrive: stop.arrive || null,
		spot: stop.spot || null,
	}));
}

function stopSummary(stops = []) {
	if (!stops.length) return null;
	const route = stops
		.map((stop) => stop.name || stop.address || stop.label)
		.filter(Boolean)
		.join(" → ");
	return route || `${stops.length} stop${stops.length === 1 ? "" : "s"}`;
}

function paymentSummary(payments = []) {
	if (!payments.length) return null;
	const total = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
	return `${payments.length} payment${payments.length === 1 ? "" : "s"} · ${total.toLocaleString(undefined, {
		style: "currency",
		currency: "USD",
	})}`;
}

function significantPayments(payments = []) {
	return payments.map((payment) => ({
		position: payment.position ?? null,
		amount: payment.amount === null || payment.amount === undefined || payment.amount === ""
			? null
			: Number(payment.amount),
		method: normalized(payment.method),
		date: normalized(payment.date),
		ref: normalized(payment.ref),
	}));
}

function ticketSummary(options = []) {
	if (!options.length) return null;
	return options
		.map((option) => {
			const price = Number(option.price);
			return Number.isFinite(price)
				? `${option.label || "Ticket"} ${price.toLocaleString(undefined, { style: "currency", currency: "USD" })}`
				: option.label || "Ticket";
		})
		.join(" · ");
}

function significantTickets(options = []) {
	return options.map((option) => ({
		position: option.position ?? null,
		label: normalized(option.label),
		price: option.price === null || option.price === undefined || option.price === ""
			? null
			: Number(option.price),
	}));
}

function pushChange(changes, field, label, before, after) {
	if (sameValue(before, after)) return;
	changes.push({
		field,
		label,
		before: normalized(before),
		after: normalized(after),
	});
}

function requirementSummary(requirements = {}) {
	return Object.keys(requirements)
		.filter((key) => requirements[key])
		.sort()
		.map((key) => REQUIREMENT_LABELS[key] || key)
		.join(", ") || null;
}

export function buildTripHistoryChanges({
	beforeTrip,
	afterTrip,
	beforeAssignments = [],
	afterAssignments = [],
	beforeStops = [],
	afterStops = [],
	beforePayments = [],
	afterPayments = [],
	beforeTicketOptions = [],
	afterTicketOptions = [],
	options = {},
} = {}) {
	if (!beforeTrip) {
		return [{ field: "trip", label: "Trip", before: null, after: "Created" }];
	}

	const changes = [];
	TRIP_FIELDS.forEach(([field, label, kind]) => {
		if (sameValue(beforeTrip[field], afterTrip?.[field])) return;
		pushChange(
			changes,
			field,
			label,
			formatValue(beforeTrip[field], kind, field),
			formatValue(afterTrip?.[field], kind, field),
		);
	});

	if (!sameValue(beforeTrip.trip_reqs || {}, afterTrip?.trip_reqs || {})) {
		pushChange(
			changes,
			"trip_reqs",
			"Requirements",
			requirementSummary(beforeTrip.trip_reqs),
			requirementSummary(afterTrip?.trip_reqs),
		);
	}

	const oldAssignments = significantAssignments(beforeAssignments);
	const newAssignments = significantAssignments(afterAssignments);
	if (!sameValue(oldAssignments, newAssignments)) {
		pushChange(
			changes,
			"assignments",
			"Fleet assignments",
			assignmentSummary(oldAssignments, options),
			assignmentSummary(newAssignments, options),
		);
	}

	const oldStops = significantStops(beforeStops);
	const newStops = significantStops(afterStops);
	if (!sameValue(oldStops, newStops)) {
		pushChange(changes, "itinerary", "Itinerary", stopSummary(oldStops), stopSummary(newStops));
	}

	const oldPayments = significantPayments(beforePayments);
	const newPayments = significantPayments(afterPayments);
	if (!sameValue(oldPayments, newPayments)) {
		pushChange(
			changes,
			"payments",
			"Payments",
			paymentSummary(oldPayments),
			paymentSummary(newPayments),
		);
	}

	const oldTickets = significantTickets(beforeTicketOptions);
	const newTickets = significantTickets(afterTicketOptions);
	if (!sameValue(oldTickets, newTickets)) {
		pushChange(
			changes,
			"ticket_options",
			"Ticket options",
			ticketSummary(oldTickets),
			ticketSummary(newTickets),
		);
	}

	return changes;
}

export function historyActorName() {
	return getCurrentProfile()?.display_name?.trim() || "Dispatcher";
}

export async function recordTripHistory({
	tripId,
	action,
	snapshot,
	changes,
	metadata = {},
	actorName = historyActorName(),
}) {
	if (!tripId || !action || !Array.isArray(changes) || !changes.length) return null;
	const { data, error } = await supabase.rpc("record_trip_history", {
		p_trip_id: tripId,
		p_action: action,
		p_snapshot: snapshot || {},
		p_changes: changes,
		p_actor_name: actorName,
		p_metadata: metadata,
	});
	if (error) throw error;
	window.dispatchEvent(new CustomEvent("rux:trip-history-refresh", {
		detail: { tripId, action },
	}));
	return data;
}

export async function fetchTripHistory({
	limit = HISTORY_PAGE_SIZE,
	beforeCreatedAt = null,
	beforeId = null,
	tripId = null,
} = {}) {
	const { data, error } = await supabase.rpc("get_trip_history", {
		p_limit: limit,
		p_before_created_at: beforeCreatedAt,
		p_before_id: beforeId,
		p_trip_id: tripId,
	});
	if (error) throw error;
	return data || [];
}

export { HISTORY_PAGE_SIZE };
