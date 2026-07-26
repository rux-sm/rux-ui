import { activeAssignmentDrivers } from "../core/trip-assignment-roles.js";

const DEFAULT_LOCALE = "en-US";

export const ASSIGNMENT_STATUSES = [
	"pending",
	"accepted",
	"declined",
	"changes_requested",
	"cancelled",
];

export const ALERT_SEVERITY_ORDER = {
	critical: 0,
	warning: 1,
	info: 2,
};

function clean(value) {
	return String(value ?? "").trim();
}

function dateOnly(value) {
	const match = clean(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (!match) return null;
	return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatAssignmentDate(value, options = {}) {
	const date = value instanceof Date ? value : dateOnly(value);
	if (!date || Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
		timeZone: "UTC",
		weekday: options.weekday === false ? undefined : "short",
		month: "short",
		day: "numeric",
		year: options.year ? "numeric" : undefined,
	}).format(date).toUpperCase();
}

export function formatAssignmentDateRange(start, end, options = {}) {
	if (!start) return "";
	if (!end || clean(start) === clean(end)) {
		return formatAssignmentDate(start, options);
	}
	const startYear = clean(start).slice(0, 4);
	const endYear = clean(end).slice(0, 4);
	const includeYear = options.year || (startYear && endYear && startYear !== endYear);
	const rangeOptions = { ...options, year: includeYear };
	return `${formatAssignmentDate(start, rangeOptions)} – ${formatAssignmentDate(end, rangeOptions)}`;
}

export function formatAssignmentTime(value, timezone, locale = DEFAULT_LOCALE) {
	if (!value) return "";
	const text = clean(value);
	const clock = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
	if (clock) {
		let hour = Number(clock[1]);
		const suffix = hour < 12 ? "AM" : "PM";
		if (hour === 0) hour = 12;
		else if (hour > 12) hour -= 12;
		return `${hour}:${clock[2]} ${suffix}`;
	}
	if (/^\d{1,2}:\d{2}\s*[ap]m$/i.test(text)) {
		return text.replace(/\s+/g, " ").toUpperCase();
	}
	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return text;
	return new Intl.DateTimeFormat(locale, {
		timeZone: timezone || undefined,
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

export function assignmentRoleLabel(role) {
	if (role === "relief_driver" || role === "relief-start" || role === "relief-end") {
		return "Relief Driver";
	}
	if (role === "co-driver") return "Co-Driver";
	return "Driver";
}

export function assignmentTripTypeLabel(type, leg) {
	if (type === "one_way") return "One Way";
	if (type === "dropoff_pickup") {
		return leg === "return" ? "One Way · Inbound" : "One Way · Outbound";
	}
	if (type === "shuttle") return "Shuttle";
	if (type === "local") return "Local";
	if (type === "multi_day") return "Multi-Day";
	return "Round Trip";
}

export function assignmentStatus(entry = {}) {
	const explicit = clean(entry.status);
	if (ASSIGNMENT_STATUSES.includes(explicit)) return explicit;
	if (entry.declinedAt) return "declined";
	if (entry.confirmedAt) return "accepted";
	return "pending";
}

export function shortAssignmentLocation(value) {
	const text = clean(value);
	if (!text) return "";
	const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
	if (parts.length < 2) return text;
	if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
	if (/^(texas|tx|oklahoma|ok)(\s+\d{5}(?:-\d{4})?)?$/i.test(parts.at(-1))) {
		parts.pop();
	}
	return parts.at(-1) || text;
}

export function sortAssignmentAlerts(alerts = []) {
	return [...alerts].sort((a, b) =>
		(ALERT_SEVERITY_ORDER[a.severity] ?? ALERT_SEVERITY_ORDER.info)
		- (ALERT_SEVERITY_ORDER[b.severity] ?? ALERT_SEVERITY_ORDER.info));
}

export function totalExternalCrew(fleetAssignments = []) {
	return fleetAssignments.reduce(
		(total, fleet) => total + (Array.isArray(fleet.crew) ? fleet.crew.length : 0),
		0,
	);
}

export function normalizeFleetAssignments(
	trip,
	leg,
	currentAssignment,
	currentDriverId,
) {
	return (trip?.trip_assignments || [])
		.filter((assignment) => (assignment.leg || "outbound") === leg)
		.map((assignment) => {
			const crew = activeAssignmentDrivers(assignment)
				.filter((member) => String(member.driver_id) !== String(currentDriverId))
				.map((member) => ({
					id: member.driver_id,
					name: member.drivers?.name || member.drivers?.short_name || member.name || "",
					role: member.role,
					phone: member.drivers?.phone || member.phone || "",
					canMessage: Boolean(member.drivers?.phone || member.phone),
					canCall: Boolean(member.drivers?.phone || member.phone),
				}));
			return {
				busId: assignment.bus_id || assignment.buses?.id || assignment.id,
				busNumber: assignment.buses?.number || "Unassigned",
				isCurrentBus: String(assignment.id) === String(currentAssignment?.id),
				crew,
			};
		})
		.sort((a, b) => Number(b.isCurrentBus) - Number(a.isCurrentBus)
			|| String(a.busNumber).localeCompare(String(b.busNumber), undefined, { numeric: true }));
}

export function showRoleModule(entry = {}) {
	const details = entry.roleDetails || {};
	return Boolean(
		entry.role
		|| entry.busNumber
		|| details.takeoverTime
		|| details.takeoverLocation
		|| details.relievesDriverName
		|| details.instructions,
	);
}

export function showCrewFleetModule(entry = {}) {
	const fleet = Array.isArray(entry.fleetAssignments) ? entry.fleetAssignments : [];
	// The current driver is intentionally excluded from crew rows, so one
	// external member still represents a two-person assignment.
	return fleet.length > 1 || totalExternalCrew(fleet) > 0;
}

export function visibleAssignmentModules(entry = {}) {
	const alerts = sortAssignmentAlerts(entry.alerts || []);
	const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
	const standardAlerts = alerts.filter((alert) => alert.severity !== "critical");
	const modules = [];
	if (criticalAlerts.length) modules.push({ key: "critical-alerts", data: criticalAlerts });
	if (entry.trip || entry.customerName || entry.from || entry.to) modules.push({ key: "trip" });
	if (showRoleModule(entry)) modules.push({ key: "role" });
	if (entry.spotTime || entry.spotLocation || entry.from) modules.push({ key: "spot-time" });
	if (showCrewFleetModule(entry)) modules.push({ key: "crew-fleet" });
	if (entry.contact?.name || entry.contact?.phone) modules.push({ key: "contact" });
	if (standardAlerts.length) modules.push({ key: "alerts", data: standardAlerts });
	if (Array.isArray(entry.documents) && entry.documents.length) modules.push({ key: "documents" });
	if (clean(entry.notes || entry.instructions)) modules.push({ key: "notes" });
	return modules;
}

export function buildAssignmentViewModel(entry = {}) {
	const trip = entry.trip || {};
	const roleDetails = entry.roleDetails || {};
	const status = assignmentStatus(entry);
	return {
		id: clean(entry.id || `${entry.startDate || "assignment"}-${entry.busNumber || "bus"}`),
		dateRange: formatAssignmentDateRange(entry.startDate, entry.endDate),
		busLabel: entry.busNumber ? `Bus ${entry.busNumber}` : "Bus Unassigned",
		roleLabel: assignmentRoleLabel(entry.role),
		status,
		customerName: clean(entry.customerName || trip.customer),
		origin: shortAssignmentLocation(entry.origin?.label || entry.from) || "Pickup",
		destination: shortAssignmentLocation(entry.destination?.label || entry.to) || "Destination",
		tripType: assignmentTripTypeLabel(entry.tripType || trip.trip_type, entry.leg),
		spotTime: formatAssignmentTime(entry.spotTime, entry.timezone),
		spotLocation: entry.spotLocation || {
			addressLine1: clean(entry.from),
		},
		roleDetails: {
			assignedBus: entry.assignedBus?.number || entry.busNumber || "",
			takeoverTime: formatAssignmentTime(roleDetails.takeoverTime || entry.roleReportTime, entry.timezone),
			takeoverLocation: clean(roleDetails.takeoverLocation),
			relievesDriverName: clean(roleDetails.relievesDriverName),
			instructions: clean(roleDetails.instructions),
		},
		contact: entry.contact || {},
		fleetAssignments: entry.fleetAssignments || [],
		alerts: sortAssignmentAlerts(entry.alerts || []),
		documents: entry.documents || [],
		notes: clean(entry.notes || entry.instructions),
		modules: visibleAssignmentModules(entry),
	};
}
