import { supabase } from "../data/supabase.js";
import { loadRequirements } from "../data/requirements-db.js";
import { isCurrentOrUpcomingLeg } from "../core/trip-visibility.js";
import { activeAssignmentDrivers } from "../core/trip-assignment-roles.js";
import { renderDriverAssignmentCard } from "../components/driver-assignment-card.js?v=6";

const root = document.getElementById("driver-share-root");
const token = new URLSearchParams(window.location.search).get("s")?.trim().toLowerCase();
let requirementLabels = new Map();
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

function parseIsoDate(value) {
	if (!value) return null;
	const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fmtDate(value, options = {}) {
	const date = value instanceof Date ? value : parseIsoDate(value);
	if (!date) return "";
	return date.toLocaleDateString("en-US", {
		weekday: options.weekday === false ? undefined : "long",
		month: "short",
		day: "numeric",
		year: options.year ? "numeric" : undefined,
	});
}

function fmtRange(start, end) {
	if (start === end) return fmtDate(start, { year: true });
	return `${fmtDate(start, { weekday: false })} – ${fmtDate(end, {
		weekday: false,
		year: true,
	})}`;
}

// share.updatedAt is an ISO timestamp (driver_schedule_shares.updated_at) —
// when dispatch last confirmed this schedule's trip selection, via the
// Driver Link panel's Create/Update action. Not a guarantee every field on
// every included trip is untouched since, just the best available signal.
function fmtUpdatedAt(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	if (date.toDateString() === new Date().toDateString()) return `Updated today at ${time}`;
	const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return `Updated ${day} at ${time}`;
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

function requirementsFor(trip) {
	const fallbacks = {
		sleeper: "Sleeper",
		pax56: "56 Pax",
		adaLift: "Wheelchair Lift",
		hotel: "Hotel",
		fuelCard: "Fuel Card",
	};
	let ids;
	if (trip.trip_reqs && Object.keys(trip.trip_reqs).length) {
		ids = Object.entries(trip.trip_reqs)
			.filter(([, selected]) => selected)
			.map(([id]) => id);
	} else {
		ids = [
			["sleeper", trip.req_sleeper],
			["pax56", trip.req_56pax],
			["adaLift", trip.req_ada],
			["hotel", trip.need_hotel],
			["fuelCard", trip.need_fuel_card],
		]
			.filter(([, selected]) => selected)
			.map(([id]) => id);
	}
	const result = ids.map((id) => fallbacks[id] || requirementLabels.get(id) || id);
	if (trip.trip_type === "one_way" || trip.trip_type === "dropoff_pickup") {
		result.push("One-Way");
	}
	return result;
}

function contactFor(trip) {
	if (trip.booking_contact_name || trip.booking_contact_phone) {
		return { name: trip.booking_contact_name || "", phone: trip.booking_contact_phone || "" };
	}
	return { name: trip.trip_contact_1_name || "", phone: trip.trip_contact_1_phone || "" };
}

function publicDocumentUrl(trip) {
	const doc = (trip.trip_documents || []).find(
		(item) => String(item.label || "").toLowerCase() === "itinerary",
	);
	if (!doc?.file_path) return "";
	return supabase.storage.from("trip-documents").getPublicUrl(doc.file_path).data?.publicUrl || "";
}

function fetchSharedTrips(tripIds, includeReliefDetails = true) {
	const reliefFields = includeReliefDetails ? ", report_time, instructions" : "";
	return supabase.from("trips").select(`
		id, trip_ref, start_date, end_date, return_start_date, return_end_date, updated_at,
		trip_type, destination, customer, departure_time, spot_time, return_time,
		booking_contact_name, booking_contact_phone,
		trip_contact_1_name, trip_contact_1_phone,
		trip_reqs, req_sleeper, req_56pax, req_ada, need_hotel, need_fuel_card,
		trip_stops(*),
		trip_assignments(
			id, leg, bus_id, active_roles,
			buses(number),
			trip_drivers(driver_id, role${reliefFields}, drivers(id, name, short_name, phone))
		)
	`).in("id", tripIds);
}

function isMissingReliefField(error) {
	return /\b(report_time|instructions)\b/i.test(
		[error?.message, error?.details, error?.hint].filter(Boolean).join(" "),
	);
}

function normalizeAssignment(row, driverId, confirmationsByKey = new Map()) {
	const trip = row.trips || {};
	const leg = row.leg || "outbound";
	const activeDrivers = activeAssignmentDrivers(row);
	const driverAssignment = activeDrivers.find(
		(item) => String(item.driver_id) === String(driverId),
	) || {};
	const role = driverAssignment.role || "driver";
	const confirmation = confirmationsByKey.get(
		`${trip.id}:${leg}:${role}`,
	) || confirmationsByKey.get(`${trip.id}:${leg}`) || null;
	const legacyRoleEntry = (row.active_roles || []).find(
		(entry) => String(entry).split(":", 1)[0] === role,
	);
	const legacyRoleState = String(legacyRoleEntry || "").split(":", 2)[1] || "off";
	const dispatchConfirmed = ["confirmed", "success"].includes(legacyRoleState);
	const confirmedAt = confirmation?.confirmedAt
		|| (dispatchConfirmed ? trip.updated_at || "" : "");
	const confirmedSource = confirmation?.source
		|| (dispatchConfirmed ? "dispatcher" : "");
	// trips.updated_at is bumped by a DB trigger on every save() (see
	// trip-driver-confirmation-patch.sql) — if the trip's own save happened
	// after this confirmation, something about it may have changed since the
	// driver last saw it. Confirmation itself stays either way; this only
	// flags it.
	const confirmationStale = !!(confirmedAt && trip.updated_at && new Date(trip.updated_at) > new Date(confirmedAt));
	const inbound = leg === "return" && trip.trip_type === "dropoff_pickup";
	const stops = stopsForLeg(trip, leg);
	const pickup = stops.find((stop) => stop.type === "pickup") || {};
	const returnStop = [...stops].reverse().find((stop) => stop.type === "return") || {};
	const crew = activeDrivers
		.filter((item) => String(item.driver_id) !== String(driverId))
		.sort((a, b) => {
			if (driverAssignment.role !== "driver") {
				if (a.role === "driver") return -1;
				if (b.role === "driver") return 1;
			}
			return String(a.role || "").localeCompare(String(b.role || ""));
		});
	return {
		id: row.id,
		trip,
		leg,
		startDate: inbound ? trip.return_start_date : trip.start_date,
		endDate: inbound
			? trip.return_end_date || trip.return_start_date
			: trip.end_date || trip.start_date,
		busNumber: row.buses?.number ?? "Unassigned",
		driverId,
		role,
		roleReportTime: driverAssignment.report_time || "",
		instructions: driverAssignment.instructions || "",
		drivers: row.trip_drivers || [],
		crew,
		pickup,
		returnStop,
		from: pickup.address || pickup.name || "Pickup not provided",
		to: inbound ? returnStop.address || returnStop.name || "Yard" : trip.destination || "Destination",
		reportTime: pickup.depart_prev || trip.departure_time,
		spotTime: pickup.spot || trip.spot_time,
		returnTime: returnStop.arrive || trip.return_time,
		requirements: requirementsFor(trip),
		contact: contactFor(trip),
		itineraryUrl: publicDocumentUrl(trip),
		confirmedAt,
		confirmedSource,
		confirmationStale,
	};
}

function showStatus(icon, title, message) {
	root.innerHTML = "";
	const status = el("section", "driver-share-status");
	const wrap = el("div");
	wrap.appendChild(el("span", "rux-icon", icon));
	wrap.appendChild(el("h1", "driver-share-status__title", title));
	wrap.appendChild(el("p", "", message));
	status.appendChild(wrap);
	root.appendChild(status);
}

function openItinerary(entry) {
	window.RuxDocViewer?.open({
		url: entry.itineraryUrl,
		externalUrl: entry.itineraryUrl,
		title: `Itinerary · Bus ${entry.busNumber}`,
		fileName: "Itinerary",
		icon: "route",
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

async function load() {
	if (!token) {
		showStatus("link_off", "Invalid schedule link", "Ask dispatch for a new driver schedule link.");
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
		showStatus("link_off", "Schedule unavailable", "This link is inactive. Contact dispatch if you still need access.");
		return;
	}

	const assignmentRefs = share.assignmentRefs || [];
	const tripIds = [...new Set(assignmentRefs.map((ref) => ref.tripId).filter(Boolean))];
	let [tripsResult, documentsResult, confirmationsResult] = await Promise.all([
		fetchSharedTrips(tripIds, true),
		supabase
			.from("trip_documents")
			.select("id, trip_id, label, file_name, file_path")
			.in("trip_id", tripIds),
		supabase.rpc("get_driver_confirmations", { p_token: token }),
	]);
	if (tripsResult.error && isMissingReliefField(tripsResult.error)) {
		tripsResult = await fetchSharedTrips(tripIds, false);
	}
	const { data: trips, error: tripsError } = tripsResult;
	const { data: documents, error: documentsError } = documentsResult;

	if (tripsError) {
		console.error("Could not load shared driver assignments:", tripsError);
		showStatus("error", "Could not load assignments", "Please try the link again or contact dispatch.");
		return;
	}
	if (documentsError) console.warn("Could not load shared itineraries:", documentsError);
	if (confirmationsResult.error) console.warn("Could not load trip confirmations:", confirmationsResult.error);
	const documentsByTrip = new Map();
	for (const document of documents || []) {
		if (!documentsByTrip.has(document.trip_id)) documentsByTrip.set(document.trip_id, []);
		documentsByTrip.get(document.trip_id).push(document);
	}
	for (const trip of trips || []) trip.trip_documents = documentsByTrip.get(trip.id) || [];
	const confirmationsByKey = new Map(
		(confirmationsResult.data || []).map((item) => [
			`${item.tripId}:${item.leg || "outbound"}:${item.role || "driver"}`,
			item,
		]),
	);

	const entries = assignmentRefs
		.map((ref) => {
			const trip = (trips || []).find((item) => String(item.id) === String(ref.tripId));
			if (!trip) return null;
			const assignment = (trip.trip_assignments || []).find((item) =>
				(item.leg || "outbound") === (ref.leg || "outbound")
				&& activeAssignmentDrivers(item).some(
					(driver) => String(driver.driver_id) === String(share.driver.id),
				),
			);
			return assignment
				? normalizeAssignment({ ...assignment, trips: trip }, share.driver.id, confirmationsByKey)
				: null;
		})
		.filter(Boolean)
		.filter((entry) => isCurrentOrUpcomingLeg(entry.endDate || entry.startDate))
		.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
	if (!entries.length) {
		showStatus("event_busy", "No assignments", "There are no active trips on this shared schedule.");
		return;
	}

	root.innerHTML = "";
	const intro = el("section", "driver-share__intro");
	intro.append(
		el("h1", "driver-share__title", `Hello ${share.driver.shortName || share.driver.name}`),
		el("p", "driver-share__range", `Here are the current assignments for ${fmtRange(share.rangeStart, share.rangeEnd)}`),
	);
	const updatedText = fmtUpdatedAt(share.updatedAt);
	if (updatedText) {
		const notice = el("div", "driver-share__notice");
		notice.append(el("span", "rux-icon", "sync"), el("span", "", updatedText));
		intro.appendChild(notice);
	}
	root.appendChild(intro);
	const list = el("section", "driver-share__list");
	const cardOptions = {
		onItinerary: openItinerary,
		onEnvelope: openEnvelope,
		onConfirm: async (entry, triggerEl) => {
			const cardEl = triggerEl.closest(".driver-assignment-card");
			triggerEl.disabled = true;
			try {
				const { data, error } = await supabase.rpc("confirm_trip_assignment", {
					p_token: token,
					p_trip_id: entry.trip.id,
					p_leg: entry.leg,
				});
				if (error || !data) throw error || new Error("Could not confirm trip");
				entry.confirmedAt = data.confirmedAt;
				entry.confirmedSource = data.source || "driver";
				entry.confirmationStale = false;
				cardEl?.replaceWith(renderDriverAssignmentCard(entry, cardOptions));
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
					// Acceptance is already durable in Postgres. Realtime is an
					// acceleration only; the scheduler's polling fallback still
					// reconciles the status.
					console.warn("Driver status broadcast was not delivered:", broadcastError);
				});
			} catch (err) {
				console.error("Could not confirm trip:", err);
				triggerEl.disabled = false;
				alert("Could not confirm this trip. Please try again.");
			}
		},
	};
	entries.forEach((entry) => list.appendChild(renderDriverAssignmentCard(entry, cardOptions)));
	root.appendChild(list);
}

load().catch((error) => {
	console.error("Driver schedule failed:", error);
	showStatus("error", "Something went wrong", "Please try again or contact dispatch.");
});
