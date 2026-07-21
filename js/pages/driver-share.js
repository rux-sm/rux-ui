import { supabase } from "../data/supabase.js";
import { loadRequirements } from "../data/requirements-db.js";

const root = document.getElementById("driver-share-root");
const envelopeDialog = document.getElementById("driver-share-envelope");
const envelopeHost = envelopeDialog.querySelector("[data-envelope-sheet]");
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
		role: driverAssignment.role || "driver",
		roleReportTime: driverAssignment.report_time || "",
		instructions: driverAssignment.instructions || "",
		drivers: row.trip_drivers || [],
		crew,
		pickup,
		returnStop,
		pickupName: pickup.name || "",
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

function actionLink(label, icon, href, accent = false) {
	const link = document.createElement("a");
	link.className = `rux-button rux-button--${accent ? "accent" : "default"} rux-button--block`;
	link.href = href;
	if (!href.startsWith("tel:")) {
		link.target = "_blank";
		link.rel = "noopener";
	}
	link.innerHTML = `<span class="rux-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
	return link;
}

function mapsUrl(address) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function telUrl(phone) {
	return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

// Ticket-stub layout: date/bus up top, route, then one big focus number (the
// single time this driver actually needs — Spot to drop off, Swap to hand
// off to relief) so it reads at a glance instead of requiring a scan through
// a dense card. Everything below the contact line is secondary context
// (crew/requirements/notes) that stays available but doesn't compete with
// the two things a driver checks a link for: what time, and where.
function renderCard(entry) {
	const card = el("article", "driver-assignment-card");

	const header = el("header", "driver-assignment-card__header");
	const dateText = entry.startDate === entry.endDate
		? fmtDate(entry.startDate)
		: `${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate, { weekday: false })}`;
	header.append(
		el("span", "driver-assignment-card__date", dateText),
		el("span", "driver-assignment-card__bus", `Bus ${entry.busNumber}`),
	);
	card.appendChild(header);

	card.appendChild(el(
		"p",
		"driver-assignment-card__route",
		`${shortLocation(entry.from) || "Pickup"} → ${shortLocation(entry.to) || "Destination"}`,
	));

	const body = el("div", "driver-assignment-card__body");

	const relief = isReliefRole(entry.role);
	const timeLabelParts = [relief ? "Swap Time" : "Spot Time", roleLabel(entry.role)];
	if (entry.trip.trip_type === "dropoff_pickup") timeLabelParts.push(entry.leg === "return" ? "Inbound" : "Outbound");
	const timeBlock = el(
		"div",
		`driver-assignment-card__time-block${relief && !entry.roleReportTime ? " is-missing" : ""}`,
	);
	timeBlock.append(
		el("span", "driver-assignment-card__time-label", timeLabelParts.join(" · ")),
		el(
			"p",
			"driver-assignment-card__time",
			relief ? (entry.roleReportTime ? fmtTime(entry.roleReportTime) : "Not set") : fmtTime(entry.spotTime),
		),
	);
	body.appendChild(timeBlock);

	if (entry.from && entry.from !== "Pickup not provided") {
		const location = el("div", "driver-assignment-card__location");
		if (entry.pickupName) location.appendChild(el("span", "driver-assignment-card__location-name", entry.pickupName));
		const addressLink = el("a", "driver-assignment-card__link", entry.from);
		addressLink.href = mapsUrl(entry.from);
		addressLink.target = "_blank";
		addressLink.rel = "noopener";
		addressLink.prepend(el("span", "rux-icon", "location_on"));
		location.appendChild(addressLink);
		body.appendChild(location);
	}

	if (entry.contact.name || entry.contact.phone) {
		const contact = el("div", "driver-assignment-card__contact");
		if (entry.contact.name) {
			const nameLine = el("span", "driver-assignment-card__contact-name");
			nameLine.append(el("strong", "", "Contact: "), document.createTextNode(entry.contact.name));
			contact.appendChild(nameLine);
		}
		if (entry.contact.phone) {
			const callLink = el("a", "driver-assignment-card__link", entry.contact.phone);
			callLink.href = telUrl(entry.contact.phone);
			callLink.prepend(el("span", "rux-icon", "call"));
			contact.appendChild(callLink);
		}
		body.appendChild(contact);
	}

	if (entry.instructions) {
		const note = el("div", "driver-assignment-card__note");
		note.append(el("span", "rux-icon", "info"), el("span", "", entry.instructions));
		body.appendChild(note);
	}

	if (entry.crew.length) {
		const crew = el("section", "driver-assignment-card__crew");
		crew.appendChild(el("span", "driver-assignment-card__crew-label", "Also on this trip"));
		entry.crew.forEach((member) => {
			const memberRow = el("div", "driver-assignment-card__crew-member");
			const name = member.drivers?.name || "Assigned driver";
			memberRow.appendChild(el("span", "", `${name} · ${roleLabel(member.role)}`));
			if (member.drivers?.phone) {
				const call = el("a", "driver-assignment-card__crew-call", "Call");
				call.href = telUrl(member.drivers.phone);
				call.setAttribute("aria-label", `Call ${name}`);
				memberRow.appendChild(call);
			}
			crew.appendChild(memberRow);
		});
		body.appendChild(crew);
	}

	if (entry.requirements.length) {
		const requirements = el("div", "driver-assignment-card__requirements");
		entry.requirements.forEach((item) => {
			requirements.appendChild(el("span", "driver-assignment-card__requirement", item));
		});
		body.appendChild(requirements);
	}
	card.appendChild(body);

	const actions = el("footer", "driver-assignment-card__actions");
	if (entry.itineraryUrl) actions.appendChild(actionLink("View Itinerary", "description", entry.itineraryUrl));
	const envelopeButton = document.createElement("button");
	envelopeButton.type = "button";
	envelopeButton.className = "rux-button rux-button--default rux-button--block";
	envelopeButton.innerHTML = '<span class="rux-icon" aria-hidden="true">mail</span><span>View Envelope</span>';
	envelopeButton.addEventListener("click", () => openEnvelope(entry));
	actions.appendChild(envelopeButton);
	card.appendChild(actions);
	return card;
}

function envelopeField(label, value, full = false) {
	const field = el("div", `driver-envelope-sheet__field${full ? " driver-envelope-sheet__field--full" : ""}`);
	field.append(
		el("span", "driver-envelope-sheet__label", label),
		el("span", "driver-envelope-sheet__value", value || ""),
	);
	return field;
}

function openEnvelope(entry) {
	envelopeHost.innerHTML = "";
	const sheet = el("article", "driver-envelope-sheet");
	const header = el("header", "driver-envelope-sheet__header");
	header.append(
		el("h1", "driver-envelope-sheet__day", fmtDate(entry.startDate).split(",")[0]),
	);
	const logo = document.createElement("img");
	logo.className = "driver-envelope-sheet__logo";
	logo.src = "./assets/logo.png";
	logo.alt = "Scarmilla Tour Buses";
	header.append(logo, el("h2", "driver-envelope-sheet__title", "Trip Information"));
	sheet.appendChild(header);

	const selected = entry.drivers.find((item) => item.role === entry.role);
	const primary = entry.drivers.find((item) => item.role === "driver");
	const selectedName = selected?.drivers?.name || "";
	const primaryName = primary?.drivers?.name || "";
	const grid = el("div", "driver-envelope-sheet__grid");
	grid.append(
		envelopeField("Bus", String(entry.busNumber)),
		envelopeField(roleLabel(entry.role), selectedName),
		envelopeField("Trip Date", fmtDate(entry.startDate, { weekday: false, year: true })),
		envelopeField(
			entry.role === "driver" ? "Spot Time" : "Swap Time",
			entry.role === "driver" ? fmtTime(entry.spotTime) : fmtTime(entry.roleReportTime),
		),
		...(entry.role === "driver" ? [] : [envelopeField("Driver", primaryName)]),
		envelopeField("Pick Up Address", entry.from, true),
		envelopeField("Destination", entry.to, true),
		envelopeField("Contact", entry.contact.name),
		envelopeField("Phone", entry.contact.phone),
		envelopeField("Starting Odometer", ""),
		envelopeField("Ending Odometer", ""),
	);
	sheet.appendChild(grid);
	const notes = el("div", "driver-envelope-sheet__notes");
	notes.appendChild(el("span", "driver-envelope-sheet__notes-label", "Notes:"));
	if (entry.requirements.length) {
		const list = document.createElement("ul");
		entry.requirements.forEach((item) => list.appendChild(el("li", "", item)));
		notes.appendChild(list);
	}
	if (entry.instructions) {
		let list = notes.querySelector("ul");
		if (!list) {
			list = document.createElement("ul");
			notes.appendChild(list);
		}
		list.appendChild(el("li", "", entry.instructions));
	}
	sheet.appendChild(notes);
	envelopeHost.appendChild(sheet);
	envelopeDialog.showModal();
}

async function load() {
	if (!token) {
		showStatus("link_off", "Invalid schedule link", "Ask dispatch for a new driver schedule link.");
		return;
	}

	try {
		const requirements = await loadRequirements();
		requirementLabels = new Map(requirements.map((item) => [item.id, item.label]));
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
		el("p", "driver-share__eyebrow", "Current assignments"),
		el("h1", "driver-share__title", `Hi ${share.driver.shortName || share.driver.name}`),
		el("p", "driver-share__range", fmtRange(share.rangeStart, share.rangeEnd)),
	);
	const notice = el("div", "driver-share__notice");
	notice.append(
		el("span", "rux-icon", "sync"),
		el("span", "", "This page reflects the latest saved trip information. Contact dispatch if anything looks incorrect."),
	);
	intro.appendChild(notice);
	root.appendChild(intro);
	const list = el("section", "driver-share__list");
	entries.forEach((entry) => list.appendChild(renderCard(entry)));
	root.appendChild(list);
}

envelopeDialog.querySelector("[data-envelope-dismiss]").addEventListener("click", () => envelopeDialog.close());
envelopeDialog.querySelector("[data-envelope-print]").addEventListener("click", () => window.print());
envelopeDialog.addEventListener("click", (event) => {
	if (event.target === envelopeDialog) envelopeDialog.close();
});

load().catch((error) => {
	console.error("Driver schedule failed:", error);
	showStatus("error", "Something went wrong", "Please try again or contact dispatch.");
});
