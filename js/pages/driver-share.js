import { supabase } from "../data/supabase.js";
import { loadRequirements } from "../data/requirements-db.js";
import { isCurrentOrUpcomingLeg } from "../core/trip-visibility.js";
import { activeAssignmentDrivers } from "../core/trip-assignment-roles.js";
import { latestDocument } from "../core/trip-documents.js";
import {
	formatAssignmentDate,
	normalizeFleetAssignments,
	normalizeSpotLocation,
	operationalTripContact,
} from "../components/driver-assignment-model.js?v=19";
import { renderDriverAssignmentCard } from "../components/driver-assignment-card.js?v=57";

const root = document.getElementById("driver-share-root");
const token = new URLSearchParams(window.location.search).get("s")?.trim().toLowerCase();
const statusAnnouncer = document.getElementById("driver-share-announcer");
const declineDialog = document.getElementById("driver-share-decline-dialog");
const DEFAULT_TRIP_TIMEZONE = "America/Chicago";

let requirementLabels = new Map();
let declineDialogResolver = null;

const driverStatusChannel = supabase
	.channel("scheduler-trips")
	.subscribe((status) => {
		if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
			console.warn(`Driver status broadcast channel: ${status}`);
		}
	});

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = text;
	return node;
}

function fmtRange(start, end) {
	if (!start) return "";
	if (!end || start === end) return formatAssignmentDate(start, { year: true });
	return `${formatAssignmentDate(start, { weekday: false })} – ${formatAssignmentDate(end, {
		weekday: false,
		year: true,
	})}`;
}

function fmtUpdatedAt(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	if (date.toDateString() === new Date().toDateString()) return `Updated Today At ${time}`;
	const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return `Updated ${day} At ${time}`;
}

function announce(message) {
	if (!statusAnnouncer) return;
	statusAnnouncer.textContent = "";
	window.requestAnimationFrame(() => {
		statusAnnouncer.textContent = message;
	});
}

function stopsForLeg(trip, leg) {
	const all = [...(trip.trip_stops || [])].sort(
		(a, b) => Number(a.position || 0) - Number(b.position || 0),
	);
	let outbound = all.filter((stop) => (stop.leg || "outbound") !== "return");
	let inbound = all.filter((stop) => stop.leg === "return");
	if (trip.trip_type === "dropoff_pickup" && !inbound.length) {
		const firstReturn = outbound.findIndex((stop) => stop.type === "return");
		const secondPickup = outbound.findIndex(
			(stop, index) => index > firstReturn && stop.type === "pickup",
		);
		if (firstReturn >= 0 && secondPickup > firstReturn) {
			inbound = outbound.slice(secondPickup);
			outbound = outbound.slice(0, secondPickup);
		}
	}
	return leg === "return" ? inbound : outbound;
}

function selectedRequirementIds(trip) {
	if (trip.trip_reqs && Object.keys(trip.trip_reqs).length) {
		return Object.entries(trip.trip_reqs)
			.filter(([, selected]) => selected)
			.map(([id]) => id);
	}
	return [
		["sleeper", trip.req_sleeper],
		["pax56", trip.req_56pax],
		["adaLift", trip.req_ada],
		["hotel", trip.need_hotel],
		["fuelCard", trip.need_fuel_card],
	]
		.filter(([, selected]) => selected)
		.map(([id]) => id);
}

function alertsFor(trip) {
	const metadata = {
		hotel: {
			severity: "warning",
			title: "Hotel Required",
			description: "Review lodging and check-in details before departure.",
		},
		adaLift: {
			severity: "warning",
			title: "Wheelchair Lift Required",
		},
		fuelCard: {
			severity: "warning",
			title: "Fuel Card Required",
		},
		sleeper: {
			severity: "warning",
			title: "Sleeper Bus Required",
		},
		pax56: {
			severity: "warning",
			title: "56-Passenger Bus Required",
		},
	};
	return selectedRequirementIds(trip).map((id) => {
		const fallbackLabel = requirementLabels.get(id) || id;
		const item = metadata[id] || { severity: "warning", title: fallbackLabel };
		return {
			id: `requirement-${id}`,
			...item,
		};
	});
}

function documentUrl(document) {
	if (!document?.file_path) return "";
	return supabase.storage.from("trip-documents").getPublicUrl(document.file_path).data?.publicUrl || "";
}

function documentType(label) {
	return String(label || "attachment")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_|_$/g, "");
}

function documentsFor(trip) {
	const rows = Array.isArray(trip.trip_documents) ? trip.trip_documents : [];
	const labels = [...new Set(rows.map((document) => document.label).filter(Boolean))]
		.filter((label) => documentType(label).split("_").includes("itinerary"));
	const documents = labels.map((label) => {
		const latest = latestDocument(rows, label);
		const hasPreviousVersion = rows.filter((document) => document.label === label).length > 1;
		return {
			id: latest?.id || documentType(label),
			type: documentType(label),
			label,
			url: documentUrl(latest),
			status: "available",
			statusLabel: hasPreviousVersion ? "Updated" : "Available",
		};
	});
	documents.sort((a, b) => {
		if (a.type === "itinerary") return -1;
		if (b.type === "itinerary") return 1;
		return a.label.localeCompare(b.label);
	});
	documents.push({
		id: "trip-envelope",
		type: "envelope",
		label: "Envelope",
		status: "available",
		statusLabel: "Available",
	});
	return documents;
}

function fetchSharedTrips(tripIds, includeReliefDetails = true) {
	const reliefFields = includeReliefDetails ? ", report_time, instructions" : "";
	return supabase.from("trips").select(`
		id, trip_ref, start_date, end_date, return_start_date, return_end_date, updated_at,
		trip_type, destination, customer, departure_time, spot_time, return_time, notes,
		booking_contact_name, booking_contact_phone,
		trip_contact_1_name, trip_contact_1_phone,
		trip_contact_2_name, trip_contact_2_phone,
		trip_reqs, req_sleeper, req_56pax, req_ada, need_hotel, need_fuel_card,
		trip_stops(*),
		trip_assignments(
			id, leg, bus_id, active_roles,
			buses(id, number),
			trip_drivers(driver_id, role${reliefFields}, drivers(id, name, short_name, phone))
		)
	`).in("id", tripIds);
}

function isMissingReliefField(error) {
	return /\b(report_time|instructions)\b/i.test(
		[error?.message, error?.details, error?.hint].filter(Boolean).join(" "),
	);
}

function isMissingRpc(error, functionName) {
	return new RegExp(`${functionName}|schema cache|function`, "i").test(
		[error?.message, error?.details, error?.hint].filter(Boolean).join(" "),
	);
}

function statusKey(tripId, leg, role) {
	return `${tripId}:${leg || "outbound"}:${role || "driver"}`;
}

function normalizeStatus(statusRow, dispatchConfirmed) {
	if (statusRow?.status === "declined") return "declined";
	if (statusRow?.status === "confirmed" || statusRow?.confirmedAt || dispatchConfirmed) {
		return "accepted";
	}
	return "pending";
}

export function normalizeAssignment(row, driverId, statusesByKey = new Map()) {
	const trip = row.trips || {};
	const leg = row.leg || "outbound";
	const activeDrivers = activeAssignmentDrivers(row);
	const driverAssignment = activeDrivers.find(
		(item) => String(item.driver_id) === String(driverId),
	) || {};
	const role = driverAssignment.role || "driver";
	const statusRow = statusesByKey.get(statusKey(trip.id, leg, role))
		|| statusesByKey.get(statusKey(trip.id, leg, "driver"))
		|| null;
	const legacyRoleEntry = (row.active_roles || []).find(
		(entry) => String(entry).split(":", 1)[0] === role,
	);
	const legacyRoleState = String(legacyRoleEntry || "").split(":", 2)[1] || "off";
	const dispatchConfirmed = ["confirmed", "success"].includes(legacyRoleState);
	const confirmedAt = statusRow?.confirmedAt
		|| statusRow?.acceptedAt
		|| (dispatchConfirmed ? trip.updated_at || "" : "");
	const confirmedSource = statusRow?.source
		|| (dispatchConfirmed ? "dispatcher" : "");
	const status = normalizeStatus(statusRow, dispatchConfirmed);
	const confirmationStale = status === "accepted"
		&& Boolean(confirmedAt && trip.updated_at && new Date(trip.updated_at) > new Date(confirmedAt));
	const inbound = leg === "return" && trip.trip_type === "dropoff_pickup";
	const stops = stopsForLeg(trip, leg);
	const pickup = stops.find((stop) => stop.type === "pickup") || {};
	const returnStop = [...stops].reverse().find((stop) => stop.type === "return") || {};
	const from = pickup.address || pickup.name || "Pickup not provided";
	const to = inbound
		? returnStop.address || returnStop.name || "Yard"
		: trip.destination || "Destination";
	const documents = documentsFor(trip);
	const itinerary = documents.find((document) => document.type === "itinerary");
	return {
		id: row.id,
		trip,
		leg,
		startDate: inbound ? trip.return_start_date : trip.start_date,
		endDate: inbound
			? trip.return_end_date || trip.return_start_date
			: trip.end_date || trip.start_date,
		timezone: trip.timezone || DEFAULT_TRIP_TIMEZONE,
		customerName: trip.customer || "",
		origin: { label: from },
		destination: { label: to },
		from,
		to,
		tripType: trip.trip_type,
		busNumber: row.buses?.number || "",
		assignedBus: {
			id: row.bus_id || row.buses?.id || "",
			number: row.buses?.number || "",
		},
		driverId,
		role,
		roleReportTime: driverAssignment.report_time || "",
		roleDetails: {
			takeoverTime: driverAssignment.report_time || "",
			instructions: driverAssignment.instructions || "",
		},
		status: confirmationStale ? "changes_requested" : status,
		spotTime: role.includes("relief")
			? driverAssignment.report_time || pickup.spot || trip.spot_time
			: pickup.spot || trip.spot_time,
		spotLocation: normalizeSpotLocation(pickup.name, pickup.address),
		reportTime: pickup.depart_prev || trip.departure_time,
		returnTime: returnStop.arrive || trip.return_time,
		contact: operationalTripContact(trip),
		fleetAssignments: normalizeFleetAssignments(trip, leg, row, driverId),
		alerts: alertsFor(trip),
		documents,
		notes: trip.notes || "",
		drivers: row.trip_drivers || [],
		pickup,
		returnStop,
		itineraryUrl: itinerary?.url || "",
		confirmedAt,
		confirmedSource,
		confirmationStale,
	};
}

function showStatus(iconName, title, message, options = {}) {
	root.innerHTML = "";
	const status = el("section", "driver-share-status");
	const wrap = el("div");
	const iconWrap = el("span", "driver-share-status__icon");
	const statusIcon = el("span", "rux-icon", iconName);
	statusIcon.setAttribute("aria-hidden", "true");
	iconWrap.appendChild(statusIcon);
	wrap.append(
		iconWrap,
		el("h1", "driver-share-status__title", title),
		el("p", "", message),
	);
	if (options.retry) {
		const retry = el("button", "rux-button rux-button--default", "Try Again");
		retry.type = "button";
		retry.addEventListener("click", options.retry);
		wrap.appendChild(retry);
	}
	status.appendChild(wrap);
	root.appendChild(status);
}

function assignmentErrorCard(message, onRetry) {
	const card = el("article", "rux-card driver-assignment-card driver-assignment-card--error");
	const section = el("section", "rux-card__section driver-share-status");
	const wrap = el("div");
	const iconWrap = el("span", "driver-share-status__icon");
	const statusIcon = el("span", "rux-icon", "error");
	statusIcon.setAttribute("aria-hidden", "true");
	iconWrap.appendChild(statusIcon);
	wrap.append(
		iconWrap,
		el("h2", "driver-share-status__title", "Assignment Unavailable"),
		el("p", "", message),
	);
	if (onRetry) {
		const retry = el("button", "rux-button rux-button--default", "Try Again");
		retry.type = "button";
		retry.addEventListener("click", onRetry);
		wrap.appendChild(retry);
	}
	section.appendChild(wrap);
	card.appendChild(section);
	return card;
}

function openItinerary(entry) {
	window.RuxDocViewer?.open({
		url: entry.itineraryUrl,
		externalUrl: entry.itineraryUrl,
		title: `Itinerary · Bus ${entry.busNumber || "Unassigned"}`,
		fileName: "Itinerary",
		icon: "route",
		presentationOnly: true,
	});
}

function openDocument(entry, document) {
	if (!document?.url) return;
	window.RuxDocViewer?.open({
		url: document.url,
		externalUrl: document.url,
		title: `${document.label} · Bus ${entry.busNumber || "Unassigned"}`,
		fileName: document.label,
		icon: "description",
		presentationOnly: true,
	});
}

function envelopeTrip(entry) {
	const drivers = entry.drivers.map((item) => ({
		id: item.driver_id,
		name: item.drivers?.name || item.drivers?.short_name || "",
		shortName: item.drivers?.short_name || item.drivers?.name || "",
		phone: item.drivers?.phone || "",
		role: item.role,
		reportTime: item.report_time || "",
		instructions: item.instructions || "",
	}));
	return {
		id: entry.trip.id,
		trip_ref: entry.trip.trip_ref,
		startDate: entry.startDate,
		endDate: entry.endDate,
		destination: entry.to,
		trip_type: entry.trip.trip_type,
		spotTime: entry.spotTime,
		trip_stops: stopsForLeg(entry.trip, entry.leg),
		bookingContact: {
			name: entry.trip.booking_contact_name || "",
			phone: entry.trip.booking_contact_phone || "",
		},
		tripContact: {
			name: entry.trip.trip_contact_1_name || "",
			phone: entry.trip.trip_contact_1_phone || "",
		},
		tripContact2: {
			name: entry.trip.trip_contact_2_name || "",
			phone: entry.trip.trip_contact_2_phone || "",
		},
		trip_reqs: entry.trip.trip_reqs || {},
		req_sleeper: entry.trip.req_sleeper,
		req_56pax: entry.trip.req_56pax,
		req_ada: entry.trip.req_ada,
		need_hotel: entry.trip.need_hotel,
		need_fuel_card: entry.trip.need_fuel_card,
		drivers,
	};
}

function openEnvelope(entry) {
	const trip = envelopeTrip(entry);
	const recipient = trip.drivers.find(
		(driver) => String(driver.id) === String(entry.driverId),
	) || trip.drivers.find((driver) => driver.role === entry.role);
	window.TripEnvelope?.open(trip, [], {
		busNumber: entry.busNumber,
		recipient,
		recipientOnly: true,
		presentationOnly: true,
	});
}

function confirmDecline() {
	if (!declineDialog?.showModal) {
		return Promise.resolve(window.confirm("Decline this assignment? Dispatch will be notified."));
	}
	if (declineDialog.open) declineDialog.close("cancel");
	declineDialog.showModal();
	declineDialog.querySelector("[data-decline-cancel]")?.focus();
	return new Promise((resolve) => {
		declineDialogResolver = resolve;
	});
}

function resolveDeclineDialog(result) {
	if (!declineDialogResolver) return;
	const resolve = declineDialogResolver;
	declineDialogResolver = null;
	resolve(result);
}

declineDialog?.addEventListener("close", () => {
	resolveDeclineDialog(declineDialog.returnValue === "decline");
});
declineDialog?.addEventListener("cancel", () => {
	resolveDeclineDialog(false);
});
declineDialog?.querySelector("[data-decline-cancel]")?.addEventListener("click", () => {
	declineDialog.close("cancel");
});
declineDialog?.querySelector("[data-decline-confirm]")?.addEventListener("click", () => {
	declineDialog.close("decline");
});

async function fetchAssignmentStatuses() {
	const current = await supabase.rpc("get_driver_assignment_statuses", { p_token: token });
	if (!current.error) return current;
	if (!isMissingRpc(current.error, "get_driver_assignment_statuses")) return current;
	const legacy = await supabase.rpc("get_driver_confirmations", { p_token: token });
	return legacy;
}

async function updateAssignmentStatus(entry, action) {
	const functionName = action === "accept"
		? "confirm_trip_assignment"
		: "decline_trip_assignment";
	const { data, error } = await supabase.rpc(functionName, {
		p_token: token,
		p_trip_id: entry.trip.id,
		p_leg: entry.leg,
	});
	if (error || !data) {
		const actionError = error || new Error(`Could not ${action} assignment`);
		actionError.userMessage = action === "accept"
			? "We couldn’t accept this assignment. Check your connection and try again."
			: "We couldn’t decline this assignment. Check your connection and try again.";
		throw actionError;
	}
	driverStatusChannel.send({
		type: "broadcast",
		event: "driver-status-changed",
		payload: {
			tripId: data.tripId || entry.trip.id,
			driverId: data.driverId || entry.driverId,
			leg: data.leg || entry.leg,
			role: data.role || entry.role,
		},
	}).catch((broadcastError) => {
		console.warn("Driver status broadcast was not delivered:", broadcastError);
	});
	return action === "accept"
		? {
			status: "accepted",
			confirmedAt: data.confirmedAt || data.acceptedAt || data.updatedAt,
			confirmedSource: data.source || "driver",
			declinedAt: "",
			confirmationStale: false,
		}
		: {
			status: "declined",
			declinedAt: data.declinedAt || data.updatedAt,
			confirmedAt: "",
			confirmedSource: "",
			confirmationStale: false,
		};
}

async function load() {
	if (!token) {
		showStatus(
			"link_off",
			"Invalid Schedule Link",
			"Ask dispatch for a new driver schedule link.",
		);
		return;
	}

	try {
		const requirements = await loadRequirements();
		requirementLabels = new Map(requirements.map((item) => [item.id, item.label]));
		window.appRequirements = requirements;
	} catch (_) {
		requirementLabels = new Map();
	}

	const { data: share, error: shareError } = await supabase.rpc(
		"get_driver_schedule_share",
		{ p_token: token },
	);
	if (shareError || !share) {
		showStatus(
			"link_off",
			"Schedule Unavailable",
			"This link is inactive. Contact dispatch if you still need access.",
			{ retry: load },
		);
		return;
	}

	const assignmentRefs = share.assignmentRefs || [];
	const tripIds = [...new Set(assignmentRefs.map((ref) => ref.tripId).filter(Boolean))];
	let [tripsResult, documentsResult, statusesResult] = await Promise.all([
		fetchSharedTrips(tripIds, true),
		supabase
			.from("trip_documents")
			.select("id, trip_id, label, file_name, file_path, created_at")
			.in("trip_id", tripIds),
		fetchAssignmentStatuses(),
	]);
	if (tripsResult.error && isMissingReliefField(tripsResult.error)) {
		tripsResult = await fetchSharedTrips(tripIds, false);
	}
	const { data: trips, error: tripsError } = tripsResult;
	const { data: documents, error: documentsError } = documentsResult;

	if (tripsError) {
		console.error("Could not load shared driver assignments:", tripsError);
		showStatus(
			"error",
			"Could Not Load Assignments",
			"Check your connection and try again.",
			{ retry: load },
		);
		return;
	}
	if (documentsError) console.warn("Could not load shared trip documents:", documentsError);
	if (statusesResult.error) console.warn("Could not load driver statuses:", statusesResult.error);

	const documentsByTrip = new Map();
	for (const document of documents || []) {
		if (!documentsByTrip.has(document.trip_id)) documentsByTrip.set(document.trip_id, []);
		documentsByTrip.get(document.trip_id).push(document);
	}
	for (const trip of trips || []) trip.trip_documents = documentsByTrip.get(trip.id) || [];

	const statusesByKey = new Map(
		(statusesResult.data || []).map((item) => [
			statusKey(item.tripId, item.leg, item.role),
			item,
		]),
	);

	const normalized = assignmentRefs.map((ref) => {
		const trip = (trips || []).find((item) => String(item.id) === String(ref.tripId));
		if (!trip) {
			return {
				error: "This assignment could not be loaded.",
				ref,
			};
		}
		const assignment = (trip.trip_assignments || []).find((item) =>
			(item.leg || "outbound") === (ref.leg || "outbound")
				&& activeAssignmentDrivers(item).some(
					(driver) => String(driver.driver_id) === String(share.driver.id),
				),
		);
		if (!assignment) {
			return {
				error: "This assignment is no longer assigned to you.",
				ref,
			};
		}
		return {
			entry: normalizeAssignment(
				{ ...assignment, trips: trip },
				share.driver.id,
				statusesByKey,
			),
		};
	});

	const activeItems = normalized
		.filter((item) => item.error || isCurrentOrUpcomingLeg(
			item.entry.endDate || item.entry.startDate,
		))
		.sort((a, b) => String(a.entry?.startDate || "").localeCompare(
			String(b.entry?.startDate || ""),
		));

	if (!activeItems.length) {
		showStatus(
			"event_busy",
			"No Current Assignments",
			"New assignments will appear here after dispatch schedules them.",
		);
		return;
	}

	root.innerHTML = "";
	const intro = el("section", "driver-share__intro");
	intro.setAttribute("aria-labelledby", "driver-share-title");
	const title = el(
		"h1",
		"driver-share__title",
		`Hello ${share.driver.shortName || share.driver.name}`,
	);
	title.id = "driver-share-title";
	intro.append(
		title,
		el("p", "driver-share__subtitle", "Here Are Your Current Assignments"),
		el("p", "driver-share__range", fmtRange(share.rangeStart, share.rangeEnd)),
	);
	const updatedText = fmtUpdatedAt(share.updatedAt);
	if (updatedText) {
		const notice = el("div", "driver-share__notice");
		const noticeIcon = el("span", "rux-icon", "sync");
		noticeIcon.setAttribute("aria-hidden", "true");
		notice.append(noticeIcon, el("span", "", updatedText));
		intro.appendChild(notice);
	}
	root.appendChild(intro);

	const list = el("section", "driver-share__list");
	list.setAttribute("aria-label", "Driver Assignments");
	const cardOptions = {
		onItinerary: openItinerary,
		onEnvelope: openEnvelope,
		onDocument: openDocument,
		onAccept: (entry) => updateAssignmentStatus(entry, "accept"),
		onDecline: (entry) => updateAssignmentStatus(entry, "decline"),
		confirmDecline,
		onStatusChange: announce,
	};
	activeItems.forEach((item) => {
		list.appendChild(item.entry
			? renderDriverAssignmentCard(item.entry, cardOptions)
			: assignmentErrorCard(item.error, load));
	});
	root.appendChild(list);
}

load().catch((error) => {
	console.error("Driver schedule failed:", error);
	showStatus(
		"error",
		"Something Went Wrong",
		"Check your connection and try again.",
		{ retry: load },
	);
});
