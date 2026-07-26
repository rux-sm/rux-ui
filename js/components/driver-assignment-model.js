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

const STATE_ABBREVIATIONS = {
	texas: "TX",
	tx: "TX",
	oklahoma: "OK",
	ok: "OK",
};

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

export function formatAssignmentHeaderDateRange(start, end, options = {}) {
	const locale = options.locale || DEFAULT_LOCALE;
	const startDate = start instanceof Date ? start : dateOnly(start);
	const parsedEnd = end instanceof Date ? end : dateOnly(end);
	if (!startDate || Number.isNaN(startDate.getTime())) {
		return { primary: "", weekdays: "" };
	}
	const endDate = parsedEnd && !Number.isNaN(parsedEnd.getTime())
		? parsedEnd
		: startDate;
	const sameDay = startDate.getTime() === endDate.getTime();
	const sameMonth = startDate.getUTCFullYear() === endDate.getUTCFullYear()
		&& startDate.getUTCMonth() === endDate.getUTCMonth();
	const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
	const format = (date, formatOptions) => new Intl.DateTimeFormat(locale, {
		timeZone: "UTC",
		...formatOptions,
	}).format(date);
	const monthDay = (date, includeYear = false) => format(date, {
		month: "short",
		day: "numeric",
		year: includeYear ? "numeric" : undefined,
	});
	const includeYear = Boolean(options.year);
	let primary;
	if (sameDay) {
		primary = monthDay(startDate, includeYear);
	} else if (!sameYear) {
		primary = `${monthDay(startDate, true)}–${monthDay(endDate, true)}`;
	} else if (sameMonth) {
		primary = `${monthDay(startDate)}–${format(endDate, { day: "numeric" })}`;
		if (includeYear) primary = `${primary}, ${format(endDate, { year: "numeric" })}`;
	} else {
		primary = `${monthDay(startDate)}–${monthDay(endDate)}`;
		if (includeYear) primary = `${primary}, ${format(endDate, { year: "numeric" })}`;
	}
	const weekdayStyle = sameDay ? "long" : "short";
	const startWeekday = format(startDate, { weekday: weekdayStyle });
	const weekdays = sameDay
		? startWeekday
		: `${startWeekday}–${format(endDate, { weekday: weekdayStyle })}`;
	return { primary, weekdays };
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

export function normalizeSpotLocation(name, address) {
	const locationName = clean(name);
	const rawAddress = clean(address);
	if (!rawAddress) return { name: locationName };
	const parts = rawAddress.split(",").map((part) => part.trim()).filter(Boolean);
	if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
	if (parts.length < 3) {
		return {
			name: locationName,
			addressLine1: parts.join(", "),
		};
	}
	const region = parts.at(-1);
	const regionMatch = region.match(/^([a-z ]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/i);
	const stateName = clean(regionMatch?.[1]).toLowerCase();
	return {
		name: locationName,
		addressLine1: parts.slice(0, -2).join(", "),
		city: parts.at(-2),
		state: STATE_ABBREVIATIONS[stateName] || clean(regionMatch?.[1]),
		postalCode: clean(regionMatch?.[2]),
	};
}

export function formatOperationalNotes(value) {
	let text = clean(value);
	if (!text) return "";
	if (text === text.toLowerCase() && /^[a-z]/.test(text)) {
		text = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
	}
	if (!text.includes("\n") && text.length <= 160 && !/[.!?]$/.test(text)) {
		text = `${text}.`;
	}
	return text;
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

export function driverDocuments(documents = []) {
	return documents.filter((document) => {
		const type = clean(document?.type || document?.label)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_|_$/g, "");
		const typeParts = type.split("_");
		return typeParts.includes("itinerary") || typeParts.includes("envelope");
	});
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
	const isReliefDriver = assignmentRoleLabel(entry.role) === "Relief Driver";
	return Boolean(
		isReliefDriver
		|| details.takeoverTime
		|| entry.takeoverTime
		|| entry.roleReportTime
		|| details.takeoverLocation
		|| entry.takeoverLocation
		|| details.relievesDriverName
		|| entry.relievesDriverName
		|| details.instructions
		|| entry.roleInstructions,
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
	const documents = driverDocuments(
		Array.isArray(entry.documents) ? entry.documents : [],
	);
	const hasTripOverview = Boolean(
		entry.trip
		|| entry.customerName
		|| entry.from
		|| entry.to
		|| entry.spotTime
		|| entry.spotLocation,
	);
	const modules = [];
	if (hasTripOverview) modules.push({ key: "trip-overview" });
	if (alerts.length) modules.push({ key: "alerts", data: alerts });
	if (showRoleModule(entry)) modules.push({ key: "role" });
	if (showCrewFleetModule(entry)) modules.push({ key: "crew-fleet" });
	if (entry.contact?.name || entry.contact?.phone) modules.push({ key: "contact" });
	if (documents.length) modules.push({ key: "documents" });
	if (clean(entry.notes || entry.instructions)) modules.push({ key: "notes" });
	return modules;
}

export function buildAssignmentViewModel(entry = {}) {
	const trip = entry.trip || {};
	const roleDetails = entry.roleDetails || {};
	const status = assignmentStatus(entry);
	const headerDate = formatAssignmentHeaderDateRange(entry.startDate, entry.endDate);
	return {
		id: clean(entry.id || `${entry.startDate || "assignment"}-${entry.busNumber || "bus"}`),
		dateRange: formatAssignmentDateRange(entry.startDate, entry.endDate),
		datePrimary: headerDate.primary,
		dateWeekdays: headerDate.weekdays,
		busLabel: entry.busNumber ? `Bus: ${entry.busNumber}` : "Bus: Unassigned",
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
			takeoverTime: formatAssignmentTime(
				roleDetails.takeoverTime || entry.takeoverTime || entry.roleReportTime,
				entry.timezone,
			),
			takeoverLocation: clean(roleDetails.takeoverLocation || entry.takeoverLocation),
			relievesDriverName: clean(
				roleDetails.relievesDriverName || entry.relievesDriverName,
			),
			instructions: clean(roleDetails.instructions || entry.roleInstructions),
		},
		contact: entry.contact || {},
		fleetAssignments: entry.fleetAssignments || [],
		alerts: sortAssignmentAlerts(entry.alerts || []),
		documents: driverDocuments(entry.documents || []),
		notes: formatOperationalNotes(entry.notes || entry.instructions),
		modules: visibleAssignmentModules(entry),
	};
}
