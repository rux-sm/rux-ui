import {
	openTripContactInfo,
	updateTripDriverTaskFlag,
	updateTripTaskFlags,
} from "../data/trip-db.js?v=20";
import { latestDocument } from "../core/trip-documents.js";

const pane = document.getElementById("rp-pane-tasks");
const titleEl = document.getElementById("rp-tasks-departures-title");
const body = document.getElementById("rp-tasks-departures-body");
const tabBadge = document.getElementById("rp-tasks-tab-badge");

function localIsoDate(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate, days) {
	const d = new Date(`${isoDate}T00:00:00`);
	d.setDate(d.getDate() + days);
	return localIsoDate(d);
}

function formatDayLabel(iso) {
	return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
		weekday: "long",
		month: "short",
		day: "numeric",
	});
}

function escapeHtml(value) {
	const node = document.createElement("span");
	node.textContent = value;
	return node.innerHTML;
}

function escapeAttr(value) {
	return escapeHtml(value ?? "").replaceAll('"', "&quot;");
}

const TRIP_TYPE_LABELS = {
	round_trip: "Round-Trip",
	one_way: "One-Way",
	dropoff_pickup: "Drop-off",
};

// "Return" always wins over the trip's own type label — once a leg is the
// return leg, that's more useful to see at a glance than repeating
// "Drop-off" for both halves of the same split trip.
function legLabel(trip, leg) {
	if (leg === "return") return "Return";
	return TRIP_TYPE_LABELS[trip.trip_type] || "Trip";
}

// Read-only — reflects data that's already tracked elsewhere in the trip
// record. Kept as a list (rather than one combined boolean) so the
// checklist can show each requirement individually instead of collapsing
// them into a single Ready/Pending badge.
const COMPUTED_ITEMS = [
	{
		label: "PO received / balance paid",
		checked: (trip) => !!(trip.po_received || trip.balance_paid),
	},
	{ label: "Confirmed", checked: (trip) => !!trip.confirmed },
	{
		label: "Contact on file",
		checked: (trip) => !!(trip.contact_not_needed
			|| trip.booking_contact_name?.trim()
			|| trip.trip_contact_1_name?.trim()),
	},
];

// Interactive — manual prep steps a dispatcher does, not data completeness,
// so they don't factor into the Ready/Pending badge the way COMPUTED_ITEMS
// does. Persisted directly on trips as `${suffix}_outbound`/`${suffix}_return`
// (see supabase/trip-task-flags-patch.sql, supabase/trip-itinerary-printed-
// patch.sql) — a split trip's return leg is often a different driver/bus
// dispatched much later, so it gets its own set rather than sharing the
// outbound leg's checkboxes.
const MANUAL_ITEMS = [
	{ suffix: "driver_contact_sent", label: "Driver contact sent" },
	{ suffix: "itinerary_printed", label: "Itinerary printed" },
];

const LEGACY_REQUIREMENTS = {
	sleeper: "req_sleeper",
	pax56: "req_56pax",
	adaLift: "req_ada",
	hotel: "need_hotel",
	fuelCard: "need_fuel_card",
};

function requirementEnabled(trip, id) {
	const configured = trip.trip_reqs;
	if (configured && typeof configured === "object" && Object.keys(configured).length) {
		return !!configured[id];
	}
	return !!trip[LEGACY_REQUIREMENTS[id]];
}

function assignmentsForLeg(trip, leg) {
	return (trip.trip_assignments || trip.assignments || []).filter(
		(assignment) => (assignment.leg || "outbound") === leg,
	);
}

function reminderDrivers(trip, leg) {
	return assignmentsForLeg(trip, leg).flatMap((assignment) => {
		const busNumber = assignment.buses?.number ?? assignment.bus?.number ?? "—";
		return (assignment.drivers || assignment.trip_drivers || []).map((driver) => ({
			...driver,
			source: driver,
			busNumber,
			name: driver.drivers?.name || driver.drivers?.short_name || driver.name || "Unassigned driver",
			textingUrl: driver.drivers?.texting_url || driver.texting_url || "",
		}));
	});
}

function taskActionButton(action, label, extra = "") {
	return `<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm rux-tasks__shortcut" data-task-action="${action}" ${extra} aria-label="${label}" title="${label}">
		<span class="rux-icon" aria-hidden="true">open_in_new</span>
	</button>`;
}

// Same floating doc viewer trip-bar.js's own itinerary shortcut opens
// (js/core/doc-viewer.js) — one shared itinerary PDF per trip, not per leg,
// so unlike the checkbox itself this doesn't take a leg.
function openTripItineraryDoc(trip) {
	const doc = latestDocument(trip.trip_documents, "Itinerary");
	if (!doc) {
		window.Rux?.toast?.("No itinerary uploaded yet");
		return;
	}
	const url = window.RuxDocs?.url?.(doc.file_path);
	if (!url) return;
	if (!window.RuxDocViewer) {
		window.open(url, "_blank");
		return;
	}
	window.RuxDocViewer.open({ url, fileName: doc.file_name, icon: "route" });
}

function driverReminderMessage(trip, driver, leg) {
	const isReturn = leg === "return";
	const date = isReturn ? trip.return_start_date : trip.start_date;
	const dateText = date ? formatDayLabel(date) : "[Add date]";
	const stops = (trip.trip_stops || []).filter((stop) => (stop.leg || "outbound") === leg);
	const pickup = stops.find((stop) => stop.type === "pickup");
	const spot = pickup?.spot || (isReturn ? trip.return_spot_time : trip.spot_time) || "[Add spot time]";
	return `Hi ${driver.name},\n\nDriver reminder for ${dateText}${trip.destination ? ` — ${trip.destination}` : ""}.\nBus: ${driver.busNumber}\nSpot time: ${spot}`;
}

function envelopeTrip(trip, leg) {
	const assignment = assignmentsForLeg(trip, leg)[0];
	if (!assignment) return null;
	const isReturn = leg === "return";
	return {
		...trip,
		assignmentId: assignment.id,
		busId: assignment.bus_id,
		leg,
		startDate: isReturn ? trip.return_start_date : trip.start_date,
		endDate: isReturn ? trip.return_end_date : trip.end_date,
		departureTime: isReturn ? trip.return_departure_time : trip.departure_time,
		spotTime: isReturn ? trip.return_spot_time : trip.spot_time,
		returnTime: trip.return_time,
		bookingContact: { name: trip.booking_contact_name, phone: trip.booking_contact_phone, email: trip.booking_contact_email },
		tripContact: { name: trip.trip_contact_1_name, phone: trip.trip_contact_1_phone },
		tripContact2: { name: trip.trip_contact_2_name, phone: trip.trip_contact_2_phone },
		trip_stops: (trip.trip_stops || []).filter((stop) => (stop.leg || "outbound") === leg),
		drivers: (assignment.drivers || assignment.trip_drivers || []).map((driver) => ({
			name: driver.drivers?.name || driver.name || "",
			shortName: driver.drivers?.short_name || driver.drivers?.name || driver.name || "",
			phone: driver.drivers?.phone || driver.phone || "",
			role: driver.role,
			reportTime: driver.report_time || "",
			instructions: driver.instructions || "",
		})),
	};
}

function equipmentResult(trip, leg, id) {
	const assignments = assignmentsForLeg(trip, leg);
	if (!assignments.length) return { checked: false, detail: "No bus assigned" };
	const failures = assignments.filter((assignment) => {
		const bus = assignment.buses || assignment.bus;
		if (!bus) return true;
		if (id === "sleeper") return !bus.sleeper;
		if (id === "pax56") return Number(bus.capacity || 0) < 56;
		return !bus.ada_lift;
	});
	if (!failures.length) {
		return {
			checked: true,
			detail: assignments.map((a) => `Bus ${a.buses?.number ?? a.bus?.number ?? "—"}`).join(", "),
		};
	}
	return {
		checked: false,
		detail: failures.map((a) => {
			const bus = a.buses || a.bus;
			if (!bus) return "Bus details unavailable";
			if (id === "pax56") return `Bus ${bus.number ?? "—"} seats ${bus.capacity || 0}`;
			return `Bus ${bus.number ?? "—"} does not qualify`;
		}).join(", "),
	};
}

function requirementState(trip, leg) {
	const rows = [];
	if (requirementEnabled(trip, "fuelCard")) {
		rows.push({
			kind: "manual",
			label: "Fuel Card",
			field: `fuel_card_assigned_${leg}`,
			detailField: `fuel_card_number_${leg}`,
			placeholder: "Optional card #",
		});
	}
	if (requirementEnabled(trip, "hotel")) {
		rows.push({
			kind: "manual",
			label: "Hotel",
			field: `hotel_booked_${leg}`,
			detailField: `hotel_itinerary_number_${leg}`,
			placeholder: "Optional itinerary #",
		});
	}
	[
		["sleeper", "Sleeper"],
		["pax56", "56 Passenger"],
		["adaLift", "Lift"],
	].forEach(([id, label]) => {
		if (!requirementEnabled(trip, id)) return;
		rows.push({ kind: "automatic", label, ...equipmentResult(trip, leg, id) });
	});
	return rows;
}

function isTripReady(trip) {
	return COMPUTED_ITEMS.every((item) => item.checked(trip));
}

function isPrepDone(trip, leg) {
	const prepDone = MANUAL_ITEMS.every((item) => trip[`${item.suffix}_${leg}`]);
	const drivers = reminderDrivers(trip, leg);
	const remindersDone = drivers.length > 0 && drivers.every((driver) => driver.trip_reminder_sent);
	const envelopesDone = drivers.length > 0 && drivers.every((driver) => driver.envelope_printed);
	const requirementsDone = requirementState(trip, leg).every((row) =>
		row.kind === "manual" ? !!trip[row.field] : row.checked,
	);
	return prepDone && remindersDone && envelopesDone && requirementsDone;
}

// Friday: nobody's back in the office until Monday, so surface the whole
// weekend's departures at once instead of just Saturday's.
function targetDates() {
	const today = localIsoDate();
	if (new Date(`${today}T00:00:00`).getDay() === 5) {
		return [addDays(today, 1), addDays(today, 2), addDays(today, 3)];
	}
	return [addDays(today, 1)];
}

// Which leg (if any) of this trip departs on this date — a split
// (dropoff_pickup) trip's return leg needs the exact same prep as an
// outbound departure, just tracked under its own set of checkboxes.
// start_date wins if both happen to land on the same date.
function legForDate(trip, iso) {
	if (trip.start_date === iso) return "outbound";
	if (trip.trip_type === "dropoff_pickup" && trip.return_start_date === iso) return "return";
	return null;
}

function tripsForDate(allTrips, iso) {
	return allTrips
		.map((trip) => ({ trip, leg: legForDate(trip, iso) }))
		.filter((entry) => entry.leg);
}

function renderTrip(trip, leg) {
	const ready = isTripReady(trip);
	const computedRows = COMPUTED_ITEMS
		.map(
			(item) => `
				<label class="rux-checkbox">
					<input type="checkbox" disabled ${item.checked(trip) ? "checked" : ""} />
					${item.label}
				</label>
			`,
		)
		.join("");
	const manualFields = MANUAL_ITEMS.map((item) => `${item.suffix}_${leg}`);
	const manualDone = MANUAL_ITEMS.every((item) => trip[`${item.suffix}_${leg}`]);
	const manualRows = MANUAL_ITEMS
		.map((item, i) => `
			<div class="rux-tasks__task-row">
				<label class="rux-checkbox">
					<input type="checkbox" data-task-trip="${trip.id}" data-task-field="${manualFields[i]}" ${trip[manualFields[i]] ? "checked" : ""} />
					${item.label}
				</label>
				${item.suffix === "driver_contact_sent" ? taskActionButton("contact-info", "Open contact info", `data-task-trip="${trip.id}" data-task-leg="${leg}"`) : ""}
				${item.suffix === "itinerary_printed" ? taskActionButton("itinerary", "Open itinerary", `data-task-trip="${trip.id}"`) : ""}
			</div>
		`)
		.join("");
	const drivers = reminderDrivers(trip, leg);
	const remindersDone = drivers.length > 0 && drivers.every((driver) => driver.trip_reminder_sent);
	const reminderRows = drivers.length
		? drivers.map((driver) => `
			<div class="rux-tasks__task-row">
				<label class="rux-checkbox rux-tasks__driver-reminder">
					<input type="checkbox" data-driver-reminder-id="${driver.id}" data-task-trip="${trip.id}" ${driver.trip_reminder_sent ? "checked" : ""} />
					<span>${escapeHtml(driver.name)} <span class="rux-tasks__driver-bus">· Bus ${escapeHtml(driver.busNumber)}</span></span>
				</label>
				${taskActionButton("driver-reminder", `Open reminder for ${escapeAttr(driver.name)}`, `data-task-trip="${trip.id}" data-task-leg="${leg}" data-trip-driver-id="${driver.id}"`)}
			</div>
		`).join("")
		: `<span class="rux-tasks__driver-empty">No drivers assigned</span>`;
	const envelopesDone = drivers.length > 0 && drivers.every((driver) => driver.envelope_printed);
	const envelopeRows = drivers.length
		? drivers.map((driver) => `
			<div class="rux-tasks__task-row">
				<label class="rux-checkbox rux-tasks__driver-reminder">
					<input type="checkbox" data-driver-envelope-id="${driver.id}" data-task-trip="${trip.id}" ${driver.envelope_printed ? "checked" : ""} />
					<span>${escapeHtml(driver.name)} <span class="rux-tasks__driver-bus">· Print Envelope</span></span>
				</label>
				${taskActionButton("print-envelope", `Print envelope for ${escapeAttr(driver.name)}`, `data-task-trip="${trip.id}" data-task-leg="${leg}" data-trip-driver-id="${driver.id}"`)}
			</div>
		`).join("")
		: `<span class="rux-tasks__driver-empty">No drivers assigned</span>`;
	const requirementRows = requirementState(trip, leg);
	const requirementsDone = requirementRows.every((row) =>
		row.kind === "manual" ? !!trip[row.field] : row.checked,
	);
	const requirementsHtml = requirementRows.length ? `
		<div class="rux-tasks__section rux-tasks__section--prep">
			<div class="rux-tasks__checklist">
				<div class="rux-tasks__section-header">
					<p class="rux-tasks__requirements-title">Requirements</p>
					<span class="rux-badge ${requirementsDone ? "rux-badge--success" : "rux-badge--warning"}">${requirementsDone ? "Done" : "Pending"}</span>
				</div>
				${requirementRows.map((row) => row.kind === "manual" ? `
					<div class="rux-tasks__requirement-row">
						<label class="rux-checkbox">
							<input type="checkbox" data-task-trip="${trip.id}" data-task-field="${row.field}" ${trip[row.field] ? "checked" : ""} />
							${row.label}
						</label>
						<input class="rux-input rux-tasks__requirement-input" type="text" maxlength="80"
							data-task-trip="${trip.id}" data-task-field="${row.detailField}"
							value="${escapeAttr(trip[row.detailField])}" placeholder="${row.placeholder}" aria-label="${row.placeholder}" />
					</div>
				` : `
					<div class="rux-tasks__requirement-row rux-tasks__requirement-row--automatic">
						<label class="rux-checkbox">
							<input type="checkbox" disabled ${row.checked ? "checked" : ""} />
							${row.label}
						</label>
						<span class="rux-tasks__requirement-detail ${row.checked ? "" : "rux-tasks__requirement-detail--warning"}">${escapeHtml(row.detail)}</span>
					</div>
				`).join("")}
			</div>
		</div>
	` : "";
	return `
		<div class="rux-tasks__trip">
			<div class="rux-tasks__trip-header">
				<p class="rux-tasks__trip-title">${escapeHtml(trip.destination || "—")} · ${escapeHtml(legLabel(trip, leg))}</p>
				<p class="rux-tasks__trip-customer">${escapeHtml(trip.customer || "—")}</p>
			</div>
			<div class="rux-tasks__section rux-tasks__section--readiness">
				<div class="rux-tasks__checklist">
					<div class="rux-tasks__section-header">
						<p class="rux-tasks__requirements-title">Trip Readiness</p>
						<span class="rux-badge ${ready ? "rux-badge--success" : "rux-badge--warning"}">${ready ? "Ready" : "Pending"}</span>
					</div>
					${computedRows}
				</div>
			</div>
			<div class="rux-tasks__section rux-tasks__section--prep">
				<div class="rux-tasks__checklist">
					<div class="rux-tasks__section-header">
						<p class="rux-tasks__requirements-title">To Do</p>
						<span class="rux-badge ${manualDone ? "rux-badge--success" : "rux-badge--warning"}">${manualDone ? "Done" : "Pending"}</span>
					</div>
					${manualRows}
				</div>
			</div>
			<div class="rux-tasks__section rux-tasks__section--prep">
				<div class="rux-tasks__checklist">
					<div class="rux-tasks__section-header">
						<p class="rux-tasks__requirements-title">Driver Reminder</p>
						<span class="rux-badge ${remindersDone ? "rux-badge--success" : "rux-badge--warning"}">${remindersDone ? "Done" : "Pending"}</span>
					</div>
					<div class="rux-tasks__driver-reminders-list">${reminderRows}</div>
				</div>
			</div>
			<div class="rux-tasks__section rux-tasks__section--prep">
				<div class="rux-tasks__checklist">
					<div class="rux-tasks__section-header">
						<p class="rux-tasks__requirements-title">Print Envelope</p>
						<span class="rux-badge ${envelopesDone ? "rux-badge--success" : "rux-badge--warning"}">${envelopesDone ? "Done" : "Pending"}</span>
					</div>
					<div class="rux-tasks__driver-reminders-list">${envelopeRows}</div>
				</div>
			</div>
			${requirementsHtml}
		</div>
	`;
}

function renderDayGroup(iso, entries) {
	return `
		<div class="rux-tasks__day-group">
			<h4 class="rux-tasks__day-label">${formatDayLabel(iso)}</h4>
			${entries.length
				? entries.map(({ trip, leg }) => renderTrip(trip, leg)).join("")
				: `<p class="rux-tasks__empty">Nothing scheduled</p>`}
		</div>
	`;
}

function entriesByDate() {
	const dates = targetDates();
	const allTrips = window.RuxTrips?.list() || [];
	return dates.map((iso) => ({ iso, entries: tripsForDate(allTrips, iso) }));
}

// Reflects an ongoing unresolved condition (missing PO/confirmation/contact,
// or prep steps not done) rather than an "unseen" ping, so unlike the header
// bell/chat badges this stays visible whether or not the tab is active —
// clicking into Tasks doesn't resolve a trip that's still actually missing
// its PO. Red (a real business requirement missing) outranks yellow (a
// manual prep step not done yet) when both apply to different trips.
function updateTabBadge(byDate) {
	if (!tabBadge) return;
	const allEntries = byDate.flatMap((d) => d.entries);
	const missingRequirements = allEntries.some(({ trip }) => !isTripReady(trip));
	const missingPrep = allEntries.some(({ trip, leg }) => !isPrepDone(trip, leg));
	if (!missingRequirements && !missingPrep) {
		tabBadge.hidden = true;
		return;
	}
	tabBadge.hidden = false;
	tabBadge.classList.toggle("rux-tasks__tab-badge--danger", missingRequirements);
}

function render() {
	const byDate = entriesByDate();
	updateTabBadge(byDate);
	if (!body) return;
	const isWeekendMode = byDate.length > 1;
	if (titleEl) titleEl.textContent = isWeekendMode ? "Departing This Weekend" : "Departing Tomorrow";

	if (isWeekendMode) {
		body.innerHTML = byDate.map(({ iso, entries }) => renderDayGroup(iso, entries)).join("");
		return;
	}

	const entries = byDate[0].entries;
	body.innerHTML = entries.length
		? entries.map(({ trip, leg }) => renderTrip(trip, leg)).join("")
		: `<p class="rux-tasks__empty">No trips departing</p>`;
}

// Optimistic: flips the checkbox and the in-memory trip object (the same
// object window.RuxTrips.list() returns, so it stays consistent with the
// scheduler's own view) immediately, then persists in the background.
// Reverts both on failure rather than leaving the UI showing a state that
// never actually saved.
body?.addEventListener("change", async (event) => {
	const driverReminder = event.target.closest("[data-driver-reminder-id]");
	const driverEnvelope = event.target.closest("[data-driver-envelope-id]");
	const driverToggle = driverReminder
		? { input: driverReminder, tripDriverId: driverReminder.dataset.driverReminderId, field: "trip_reminder_sent" }
		: driverEnvelope
			? { input: driverEnvelope, tripDriverId: driverEnvelope.dataset.driverEnvelopeId, field: "envelope_printed" }
			: null;
	if (driverToggle) {
		const { input, tripDriverId, field } = driverToggle;
		const tripId = input.dataset.taskTrip;
		const trip = (window.RuxTrips?.list() || []).find((t) => String(t.id) === String(tripId));
		const driver = trip && ["outbound", "return"]
			.flatMap((leg) => reminderDrivers(trip, leg))
			.find((item) => String(item.id) === String(tripDriverId));
		if (!driver) return;
		const previous = !!driver[field];
		driver.source[field] = input.checked;
		render();
		try {
			await updateTripDriverTaskFlag(tripDriverId, field, input.checked);
		} catch (err) {
			console.warn(`Could not save ${field}:`, err);
			driver.source[field] = previous;
			render();
			window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
		}
		return;
	}
	const checkbox = event.target.closest("[data-task-field]");
	if (!checkbox) return;
	const tripId = checkbox.dataset.taskTrip;
	const field = checkbox.dataset.taskField;
	const value = checkbox.type === "checkbox" ? checkbox.checked : checkbox.value.trim();
	const trip = (window.RuxTrips?.list() || []).find((t) => String(t.id) === String(tripId));
	if (!trip) return;
	const previous = trip[field];
	trip[field] = value;
	// Re-render right away, not just after the write resolves — the
	// section's Done/Pending badge is a separate element from the checkbox
	// itself and won't otherwise reflect the new state until the next poll.
	render();
	try {
		await updateTripTaskFlags(tripId, { [field]: value || (checkbox.type === "text" ? null : value) });
	} catch (err) {
		console.warn("Could not save task flag:", err);
		trip[field] = previous;
		render();
		window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
	}
});

body?.addEventListener("click", (event) => {
	const action = event.target.closest("[data-task-action]");
	if (!action) return;
	const trip = (window.RuxTrips?.list() || []).find(
		(item) => String(item.id) === String(action.dataset.taskTrip),
	);
	if (!trip) return;
	const leg = action.dataset.taskLeg || "outbound";
	if (action.dataset.taskAction === "contact-info") {
		openTripContactInfo(trip, leg);
		return;
	}
	if (action.dataset.taskAction === "driver-reminder") {
		const driver = reminderDrivers(trip, leg).find(
			(item) => String(item.id) === String(action.dataset.tripDriverId),
		);
		if (!driver) return;
		window.ContactInfoModal?.open(driverReminderMessage(trip, driver, leg), {
			title: `Driver Reminder — ${driver.name}`,
			previewLabel: `Editable reminder for ${driver.name}`,
			editable: true,
			externalUrl: driver.textingUrl,
		});
		return;
	}
	if (action.dataset.taskAction === "print-envelope") {
		const driver = reminderDrivers(trip, leg).find(
			(item) => String(item.id) === String(action.dataset.tripDriverId),
		);
		if (!driver) return;
		const prepared = envelopeTrip(trip, leg);
		if (!prepared) {
			window.Rux?.toast?.("Assign a bus before opening the envelope");
			return;
		}
		const assignment = assignmentsForLeg(trip, leg)[0];
		window.TripEnvelope?.open(prepared, [], {
			busNumber: assignment?.buses?.number ?? assignment?.bus?.number ?? "",
			recipient: { name: driver.name, role: driver.role },
		});
		return;
	}
	if (action.dataset.taskAction === "itinerary") {
		openTripItineraryDoc(trip);
	}
});

// Same polling recipe as trip-history.js — the underlying trips array is
// already kept live by the scheduler's own realtime sync, but nothing
// notifies this card specifically when it changes, so a light poll keeps
// things current without needing a new realtime channel of its own. Full
// render() (rebuilding the card body) only needs to happen while the tab is
// actually visible; the tab badge needs to stay correct even when it isn't,
// since that's the whole point of a badge — flagging that this tab is worth
// clicking into in the first place.
window.setInterval(() => {
	if (!pane?.hidden) render();
	else updateTabBadge(entriesByDate());
}, 30000);

// window.RuxTrips is set asynchronously by index.html's initSchedulerData()
// — at module-eval time here, trips almost certainly haven't loaded yet, so
// a single check-at-load would just see an empty list and hide the badge
// until the 30s poll (or a tab click) happened to catch it. Retry briefly
// instead of waiting a full 30s for the badge to ever become correct.
function primeBadge(attempt = 0) {
	updateTabBadge(entriesByDate());
	if (window.RuxTrips?.list()?.length || attempt >= 10) return;
	setTimeout(() => primeBadge(attempt + 1), 1000);
}
primeBadge();

window.RuxTasks = { activate: render };
