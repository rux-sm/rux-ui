import { supabase } from "../data/supabase.js";
import { loadRequirements } from "../data/requirements-db.js";

const root = document.getElementById("driver-share-root");
const token = new URLSearchParams(window.location.search).get("s")?.trim().toLowerCase();
let requirementLabels = new Map();

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

function fmtTime(value) {
	if (!value) return "—";
	const text = String(value).trim();
	if (/[ap]m$/i.test(text)) return text.toUpperCase();
	const match = text.match(/^(\d{1,2}):(\d{2})/);
	if (!match) return text;
	let hour = Number(match[1]);
	const suffix = hour < 12 ? "AM" : "PM";
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${match[2]} ${suffix}`;
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

function roleLabel(role) {
	if (role === "co-driver") return "Co-Driver";
	if (role === "relief-start" || role === "relief-end") return "Relief Driver";
	return "Driver";
}

function shortLocation(value) {
	const text = String(value || "").trim();
	if (!text) return "";
	const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
	if (parts.length < 2) return text;
	if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
	if (parts.length > 1 && /^(texas|tx|oklahoma|ok)(\s+\d{5}(?:-\d{4})?)?$/i.test(parts.at(-1))) {
		parts.pop();
	}
	return parts.at(-1) || text;
}

function isReliefRole(role) {
	return role === "relief-start" || role === "relief-end";
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
		id, trip_ref, start_date, end_date, return_start_date, return_end_date,
		trip_type, destination, customer, departure_time, spot_time, return_time,
		booking_contact_name, booking_contact_phone,
		trip_contact_1_name, trip_contact_1_phone,
		trip_reqs, req_sleeper, req_56pax, req_ada, need_hotel, need_fuel_card,
		trip_stops(*),
		trip_assignments(
			id, leg, bus_id,
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

function normalizeAssignment(row, driverId) {
	const trip = row.trips || {};
	const leg = row.leg || "outbound";
	const inbound = leg === "return" && trip.trip_type === "dropoff_pickup";
	const stops = stopsForLeg(trip, leg);
	const pickup = stops.find((stop) => stop.type === "pickup") || {};
	const returnStop = [...stops].reverse().find((stop) => stop.type === "return") || {};
	const driverAssignment = (row.trip_drivers || []).find(
		(item) => String(item.driver_id) === String(driverId),
	) || {};
	const crew = (row.trip_drivers || [])
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
		role: driverAssignment.role || "driver",
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

function mapsUrl(address) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function telUrl(phone) {
	return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

// Circular action button — the tappable half of a section (call a contact,
// open an address in Maps). variant just picks the tint (call = green,
// maps = accent blue), same convention as a phone app's own call button.
function iconButton(icon, href, ariaLabel, variant) {
	const link = document.createElement("a");
	link.className = `driver-assignment-card__icon-btn driver-assignment-card__icon-btn--${variant}`;
	link.href = href;
	link.setAttribute("aria-label", ariaLabel);
	if (!href.startsWith("tel:")) {
		link.target = "_blank";
		link.rel = "noopener";
	}
	link.appendChild(el("span", "rux-icon", icon));
	return link;
}

// Shared shape for Trip Contact and each crew member (co-driver, relief
// driver) — an eyebrow label, name, phone, and a call button. Returns null
// if there's neither a name nor a phone to show (e.g. a crew slot whose
// driver record has no phone on file), so the caller can skip appending an
// empty section entirely.
function contactSection(label, name, phone) {
	if (!name && !phone) return null;
	const section = el("div", "rux-card__section driver-assignment-card__contact-section");
	section.appendChild(el("span", "driver-assignment-card__section-label", label));
	const row = el("div", "driver-assignment-card__contact-row");
	const text = el("div", "driver-assignment-card__contact-text");
	if (name) text.appendChild(el("p", "driver-assignment-card__contact-name", name));
	if (phone) text.appendChild(el("p", "driver-assignment-card__contact-phone", phone));
	row.appendChild(text);
	if (phone) row.appendChild(iconButton("call", telUrl(phone), `Call ${name || label}`, "call"));
	section.appendChild(row);
	return section;
}

// Modular ticket layout — each .rux-card__section below is an independent
// band (dividers come free from .rux-card__section + .rux-card__section in
// card.css), so sections can be added/removed per trip without any of this
// needing to know what else is present. Route/Time/Actions are always
// there; Contact/Crew/Requirements/Notes only render when that trip
// actually has the data for them.
function renderCard(entry) {
	const card = el("article", "rux-card driver-assignment-card");

	const header = el("header", "rux-card__header driver-assignment-card__header");
	const dateText = entry.startDate === entry.endDate
		? fmtDate(entry.startDate)
		: `${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate, { weekday: false })}`;
	header.append(
		el("span", "driver-assignment-card__date", dateText),
		el("span", "driver-assignment-card__bus", `Bus ${entry.busNumber}`),
	);
	card.appendChild(header);

	// Trip contact rides along in this same section (right after client/pickup)
	// rather than getting its own divided band — it's part of "who/where this
	// trip is for," not a separate concern. Crew below still gets one full
	// section per person; there can be more than one of them, and they're not
	// what identifies whose trip this is the way the trip contact is.
	const routeSection = el("div", "rux-card__section driver-assignment-card__route-section");
	routeSection.appendChild(el(
		"p",
		"driver-assignment-card__route",
		`${shortLocation(entry.from) || "Pickup"} → ${shortLocation(entry.to) || "Destination"}`,
	));
	// Just Client, not the pickup stop's own "name" field too — that second
	// value was the actual source of the duplicate-looking text (sometimes
	// identical to Client, sometimes just a copy of the stop's own street
	// address), and the Spot section below already shows the full address,
	// so there's nothing this line was adding that isn't said somewhere else.
	if (entry.trip.customer) routeSection.appendChild(el("p", "driver-assignment-card__client", entry.trip.customer));
	if (entry.contact.name || entry.contact.phone) {
		const row = el("div", "driver-assignment-card__contact-row driver-assignment-card__contact-row--inline");
		const text = el("div", "driver-assignment-card__contact-text");
		if (entry.contact.name) text.appendChild(el("p", "driver-assignment-card__contact-name", entry.contact.name));
		if (entry.contact.phone) text.appendChild(el("p", "driver-assignment-card__contact-phone", entry.contact.phone));
		row.appendChild(text);
		if (entry.contact.phone) {
			row.appendChild(iconButton("call", telUrl(entry.contact.phone), `Call ${entry.contact.name || "trip contact"}`, "call"));
		}
		routeSection.appendChild(row);
	}
	card.appendChild(routeSection);

	const relief = isReliefRole(entry.role);
	const timeLabelParts = [relief ? "Swap Time" : "Spot Time", roleLabel(entry.role)];
	if (entry.trip.trip_type === "dropoff_pickup") timeLabelParts.push(entry.leg === "return" ? "Inbound" : "Outbound");
	const hasAddress = entry.from && entry.from !== "Pickup not provided";
	const timeSection = el(
		"div",
		`rux-card__section driver-assignment-card__time-section${relief && !entry.roleReportTime ? " is-missing" : ""}`,
	);
	const timeRow = el("div", "driver-assignment-card__time-row");
	const timeText = el("div", "driver-assignment-card__contact-text");
	timeText.append(
		el("span", "driver-assignment-card__section-label", timeLabelParts.join(" · ")),
		el(
			"p",
			"driver-assignment-card__time",
			relief ? (entry.roleReportTime ? fmtTime(entry.roleReportTime) : "Not set") : fmtTime(entry.spotTime),
		),
	);
	if (hasAddress) timeText.appendChild(el("p", "driver-assignment-card__address", entry.from));
	timeRow.appendChild(timeText);
	if (hasAddress) timeRow.appendChild(iconButton("navigation", mapsUrl(entry.from), "Open in Maps", "maps"));
	timeSection.appendChild(timeRow);
	card.appendChild(timeSection);

	entry.crew.forEach((member) => {
		const crewSection = contactSection(roleLabel(member.role), member.drivers?.name, member.drivers?.phone);
		if (crewSection) card.appendChild(crewSection);
	});

	if (entry.instructions) {
		const note = el("div", "rux-card__section driver-assignment-card__note-section");
		note.appendChild(el("span", "driver-assignment-card__section-label", "Notes"));
		const noteBody = el("p", "driver-assignment-card__note");
		noteBody.append(el("span", "rux-icon", "info"), document.createTextNode(entry.instructions));
		note.appendChild(noteBody);
		card.appendChild(note);
	}

	const actions = el("footer", "rux-card__footer driver-assignment-card__actions");
	if (entry.itineraryUrl) {
		const itineraryButton = document.createElement("button");
		itineraryButton.type = "button";
		itineraryButton.className = "rux-button rux-button--accent rux-button--block";
		itineraryButton.innerHTML = '<span class="rux-icon" aria-hidden="true">description</span><span>View Itinerary</span>';
		itineraryButton.addEventListener("click", () => openItinerary(entry));
		actions.appendChild(itineraryButton);
	}
	const envelopeButton = document.createElement("button");
	envelopeButton.type = "button";
	envelopeButton.className = "rux-button rux-button--accent rux-button--block";
	envelopeButton.innerHTML = '<span class="rux-icon" aria-hidden="true">mail</span><span>View Envelope</span>';
	envelopeButton.addEventListener("click", () => openEnvelope(entry));
	actions.appendChild(envelopeButton);
	card.appendChild(actions);
	return card;
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
		showStatus("link_off", "Schedule unavailable", "This link has expired or was revoked. Ask dispatch for a new link.");
		return;
	}

	const assignmentRefs = share.assignmentRefs || [];
	const tripIds = [...new Set(assignmentRefs.map((ref) => ref.tripId).filter(Boolean))];
	let [tripsResult, documentsResult] = await Promise.all([
		fetchSharedTrips(tripIds, true),
		supabase
			.from("trip_documents")
			.select("id, trip_id, label, file_name, file_path")
			.in("trip_id", tripIds),
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
	const documentsByTrip = new Map();
	for (const document of documents || []) {
		if (!documentsByTrip.has(document.trip_id)) documentsByTrip.set(document.trip_id, []);
		documentsByTrip.get(document.trip_id).push(document);
	}
	for (const trip of trips || []) trip.trip_documents = documentsByTrip.get(trip.id) || [];

	const entries = assignmentRefs
		.map((ref) => {
			const trip = (trips || []).find((item) => String(item.id) === String(ref.tripId));
			if (!trip) return null;
			const assignment = (trip.trip_assignments || []).find((item) =>
				(item.leg || "outbound") === (ref.leg || "outbound")
				&& (item.trip_drivers || []).some(
					(driver) => String(driver.driver_id) === String(share.driver.id),
				),
			);
			return assignment ? normalizeAssignment({ ...assignment, trips: trip }, share.driver.id) : null;
		})
		.filter(Boolean)
		.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
	if (!entries.length) {
		showStatus("event_busy", "No assignments", "There are no active trips on this shared schedule.");
		return;
	}

	root.innerHTML = "";
	const intro = el("section", "driver-share__intro");
	intro.append(
		el("h1", "driver-share__title", `Hello ${share.driver.shortName || share.driver.name}`),
		el("p", "driver-share__range", `Here are the current assignments for week of ${fmtRange(share.rangeStart, share.rangeEnd)}`),
	);
	const updatedText = fmtUpdatedAt(share.updatedAt);
	if (updatedText) {
		const notice = el("div", "driver-share__notice");
		notice.append(el("span", "rux-icon", "sync"), el("span", "", updatedText));
		intro.appendChild(notice);
	}
	root.appendChild(intro);
	const list = el("section", "driver-share__list");
	entries.forEach((entry) => list.appendChild(renderCard(entry)));
	root.appendChild(list);
}

load().catch((error) => {
	console.error("Driver schedule failed:", error);
	showStatus("error", "Something went wrong", "Please try again or contact dispatch.");
});
