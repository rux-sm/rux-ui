import {
	openTripContactInfo,
	updateTripDriverTaskFlag,
	updateTripTaskFlags,
} from "../data/trip-db.js?v=21";
import { latestDocument } from "../core/trip-documents.js";
import { supabase } from "../data/supabase.js";

const pane = document.getElementById("rp-pane-tasks");
const body = document.getElementById("rp-tasks-departures-body");
const tabBadge = document.getElementById("rp-tasks-tab-badge");
const navGroup = document.getElementById("rp-tasks-nav");
const navTodayBtn = document.getElementById("rp-tasks-nav-today");

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

// "Departing Sunday, August 3" — each day-group's own heading (see
// renderDayGroup), month spelled out in full. formatDayLabel above stays
// abbreviated for its own use (the driver reminder message text).
function formatDepartingTitle(iso) {
	const dateText = new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
	return `Departing ${dateText}`;
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
// them into a single Ready/Pending badge. `detail` surfaces *why* an item
// is checked (which billing status, whose name) instead of just a bare
// checkbox, so the dispatcher doesn't have to reopen the trip to find out.
const COMPUTED_ITEMS = [
	{
		// Whether the itinerary document has been received/uploaded — not
		// to be confused with "Itinerary printed" in To Do, which is about
		// physically printing it for the driver envelope afterward.
		label: "Itinerary",
		checked: (trip) => !!(trip.itinerary_not_needed || latestDocument(trip.trip_documents, "Itinerary")),
		detail: (trip) => {
			if (trip.itinerary_not_needed) return "Not Required";
			return latestDocument(trip.trip_documents, "Itinerary") ? "Received" : "Not Received";
		},
	},
	{
		label: "Trip Contact",
		checked: (trip) => !!(trip.contact_not_needed
			|| trip.booking_contact_name?.trim()
			|| trip.trip_contact_1_name?.trim()),
		// Same Received/Not Received/Not Required vocabulary as Itinerary
		// above, instead of naming the actual contact.
		detail: (trip) => {
			if (trip.contact_not_needed) return "Not Required";
			return (trip.booking_contact_name?.trim() || trip.trip_contact_1_name?.trim())
				? "Received"
				: "Not Received";
		},
	},
	{
		// Labeled "Payment" — what this actually checks is trip.confirmed,
		// via the same status pipeline the trip editor's own billing badge
		// uses (js/core/billing-config.js) — reused here instead of
		// re-deriving "signed vs. PO vs. deposit" from scratch.
		label: "Payment",
		checked: (trip) => !!trip.confirmed,
		detail: (trip) => {
			const status = window.RuxBilling?.deriveRecordStatus?.(trip) || "pending";
			if (status === "pending") return "Not confirmed";
			return window.RuxBilling?.statusMeta?.(status)?.label || status;
		},
	},
];

// Interactive — manual prep steps a dispatcher does, not data completeness,
// so they don't factor into the Ready/Pending badge the way COMPUTED_ITEMS
// does. Persisted directly on trips as `${suffix}_outbound`/`${suffix}_return`
// (see supabase/trip-task-flags-patch.sql, supabase/trip-itinerary-printed-
// patch.sql, supabase/trip-hos-form-patch.sql) — a split trip's return leg
// is often a different driver/bus dispatched much later, so it gets its own
// set rather than sharing the outbound leg's checkboxes. `visible` hides an
// item entirely rather than just leaving it unchecked — hos_form_printed
// only means anything once a part-time driver is actually assigned.
const MANUAL_ITEMS = [
	{ suffix: "driver_contact_sent", label: "Driver Contact Info Sent" },
	{ suffix: "itinerary_printed", label: "Print Itinerary" },
	{ suffix: "hos_form_printed", label: "HOS Form", visible: hasPartTimeDriver },
];

function visibleManualItems(trip, leg) {
	return MANUAL_ITEMS.filter((item) => !item.visible || item.visible(trip, leg));
}

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
			shortName: driver.drivers?.short_name || driver.drivers?.name || driver.name || "Unassigned driver",
			textingUrl: driver.drivers?.texting_url || driver.texting_url || "",
			employmentType: driver.drivers?.employment_type || driver.employment_type || "",
		}));
	});
}

function hasPartTimeDriver(trip, leg) {
	return reminderDrivers(trip, leg).some((driver) => driver.employmentType === "part-time");
}

function taskActionButton(action, label, extra = "") {
	return `<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm rux-tasks__shortcut" data-task-action="${action}" ${extra} aria-label="${label}" title="${label}">
		<span class="rux-icon" aria-hidden="true">open_in_new</span>
	</button>`;
}

// Replaces the section header's old "Ready/Done" vs. "Pending" text badge —
// a checkmark reads as complete on its own (the section title next to it
// already says what "complete" means here), and the incomplete state stays
// a small warning-colored marker rather than disappearing, so an
// unfinished section still catches the eye when scanning down the card.
function statusIndicator(done, doneLabel = "Complete", pendingLabel = "Pending") {
	const icon = done ? "check_circle" : "schedule";
	const modifier = done ? "complete" : "pending";
	const label = done ? doneLabel : pendingLabel;
	return `<span class="rux-tasks__status rux-tasks__status--${modifier}" role="img" aria-label="${escapeAttr(label)}"><span class="rux-icon" aria-hidden="true">${icon}</span></span>`;
}

// Same floating doc viewer trip-bar.js's own itinerary shortcut opens
// (js/core/doc-viewer.js) — one shared itinerary PDF per trip, not per leg,
// so unlike the checkbox itself this doesn't take a leg.
function openTripItineraryDoc(trip) {
	const doc = latestDocument(trip.trip_documents, "Itinerary");
	if (!doc) {
		window.Rux?.toast?.("No itinerary uploaded yet");
		return false;
	}
	const url = window.RuxDocs?.url?.(doc.file_path);
	if (!url) return false;
	if (!window.RuxDocViewer) {
		window.open(url, "_blank");
		return true;
	}
	window.RuxDocViewer.open({ url, fileName: doc.file_name, icon: "route" });
	return true;
}

function driverReminderMessage(trip, driver, leg, assignmentsUrl = "") {
	const isReturn = leg === "return";
	const date = isReturn ? trip.return_start_date : trip.start_date;
	const dateText = date ? formatDayLabel(date) : "[Add date]";
	const stops = (trip.trip_stops || []).filter((stop) => (stop.leg || "outbound") === leg);
	const pickup = stops.find((stop) => stop.type === "pickup");
	const spot = pickup?.spot || (isReturn ? trip.return_spot_time : trip.spot_time) || "[Add spot time]";
	const firstName = String(driver.name || "Driver").trim().split(/\s+/)[0] || "Driver";
	const assignments = assignmentsUrl ? `\n\nYour assignments:\n${assignmentsUrl}` : "";
	return `Hi ${firstName}\n\nTrip reminder for ${dateText}${trip.destination ? ` to ${trip.destination}` : ""}.\nBus: ${driver.busNumber}\nSpot time: ${spot}${assignments}`;
}

async function driverAssignmentsUrl(driverId) {
	if (!driverId) return "";
	const { data, error } = await supabase.rpc("get_driver_schedule_share_for_driver", {
		p_driver_id: driverId,
	});
	if (error || !data?.token) return "";
	const url = new URL("d.html", "https://rux-sm.github.io/rux-ui/");
	url.searchParams.set("s", data.token);
	return url.href;
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

// Same icon set/style as the Fleet tab's own Equipment column
// (js/panels/fleet-panel.js's fleet-app__equipment-cell) — reused here so a
// bus's equipment reads the same way everywhere it shows up. Capacity has
// no natural icon, so it gets a plain number badge instead.
function busEquipmentBadges(bus) {
	if (!bus) return "";
	const badges = [];
	if (bus.sleeper) badges.push('<span class="rux-icon rux-tasks__equip-icon" title="Sleeper">airline_seat_flat</span>');
	if (Number(bus.capacity || 0) >= 56) {
		badges.push(`<span class="rux-tasks__equip-badge" title="${escapeAttr(bus.capacity)} passengers">${escapeHtml(bus.capacity)}</span>`);
	}
	if (bus.ada_lift) badges.push('<span class="rux-icon rux-tasks__equip-icon" title="ADA lift">accessible</span>');
	return badges.join("");
}

function busDetailLine(bus) {
	if (!bus) return "Bus details unavailable";
	return `${busEquipmentBadges(bus)}<span>Bus ${escapeHtml(bus.number ?? "—")}</span>`;
}

// `severity` splits "not checked" into two distinct problems: no bus
// assigned yet is a normal, still-in-progress state (warning/yellow, same
// as any other not-done-yet item); a bus that IS assigned but doesn't meet
// the requirement is an active conflict someone needs to fix (danger/red),
// not just an outstanding task.
function equipmentResult(trip, leg, id) {
	const assignments = assignmentsForLeg(trip, leg);
	if (!assignments.length) return { checked: false, severity: "missing", detail: "No bus assigned" };
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
			detail: assignments.map((a) => busDetailLine(a.buses || a.bus)).join(", "),
		};
	}
	return {
		checked: false,
		severity: "conflict",
		detail: failures.map((a) => busDetailLine(a.buses || a.bus)).join(", "),
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
	const prepDone = visibleManualItems(trip, leg).every((item) => trip[`${item.suffix}_${leg}`]);
	const drivers = reminderDrivers(trip, leg);
	const remindersDone = drivers.length > 0 && drivers.every((driver) => driver.trip_reminder_sent);
	const envelopesDone = drivers.length > 0 && drivers.every((driver) => driver.envelope_printed);
	const requirementsDone = requirementState(trip, leg).every((row) =>
		row.kind === "manual" ? !!trip[row.field] : row.checked,
	);
	return prepDone && remindersDone && envelopesDone && requirementsDone;
}

// null = the default view (tomorrow, or the Fri→Mon weekend cluster below)
// — set by the Prev/Next/Today controls (see the navGroup click listener
// below) to page through a single specific day instead, for marking things
// ahead of time or reviewing a day that's already passed.
let navigatedDate = null;

// Friday: nobody's back in the office until Monday, so surface the whole
// weekend's departures at once instead of just Saturday's.
function defaultTargetDates() {
	const today = localIsoDate();
	if (new Date(`${today}T00:00:00`).getDay() === 5) {
		return [addDays(today, 1), addDays(today, 2), addDays(today, 3)];
	}
	return [addDays(today, 1)];
}

// Only for the default view; once someone's paged to a specific day, it's
// just that one day regardless of which weekday it lands on.
function targetDates() {
	return navigatedDate ? [navigatedDate] : defaultTargetDates();
}

// The tab badge always reflects the true upcoming default (tomorrow/
// weekend), never whatever day someone's currently paged to — otherwise
// reviewing a past day (nothing left to do) or a far-future one could
// clear a badge that's actually still flagging tomorrow's real gap.
function defaultEntriesByDate() {
	const allTrips = window.RuxTrips?.list() || [];
	return defaultTargetDates().map((iso) => ({ iso, entries: tripsForDate(allTrips, iso) }));
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
		.map((item) => {
			const detail = item.detail?.(trip) || "";
			const checked = item.checked(trip);
			return `
				<div class="rux-tasks__requirement-row">
					<label class="rux-checkbox rux-tasks__automatic-check ${checked ? "rux-tasks__automatic-check--complete" : ""}">
						<input type="checkbox" disabled ${checked ? "checked" : ""} />
						${item.label}
					</label>
					<input class="rux-input rux-tasks__requirement-input" type="text" disabled value="${escapeAttr(detail)}" aria-label="${escapeAttr(item.label)} status" />
				</div>
			`;
		})
		.join("");
	const manualItems = visibleManualItems(trip, leg);
	const manualFields = manualItems.map((item) => `${item.suffix}_${leg}`);
	const manualDone = manualItems.every((item) => trip[`${item.suffix}_${leg}`]);
	const manualRows = manualItems
		.map((item, i) => `
			<div class="rux-tasks__task-row">
				<label class="rux-checkbox">
					<input type="checkbox" data-task-trip="${trip.id}" data-task-field="${manualFields[i]}" ${trip[manualFields[i]] ? "checked" : ""} />
					${item.label}
				</label>
				${item.suffix === "driver_contact_sent" ? taskActionButton("contact-info", "Open contact info", `data-task-trip="${trip.id}" data-task-leg="${leg}"`) : ""}
				${item.suffix === "itinerary_printed" ? taskActionButton("itinerary", "Open itinerary", `data-task-trip="${trip.id}" data-task-leg="${leg}"`) : ""}
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
					Trip Reminder <span class="rux-tasks__driver-name">${escapeHtml(driver.shortName)} · ${escapeHtml(driver.busNumber)}</span>
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
					Print Envelope <span class="rux-tasks__driver-name">${escapeHtml(driver.shortName)} · ${escapeHtml(driver.busNumber)}</span>
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
				<p class="rux-tasks__requirements-title">Requirements</p>
				${requirementRows.map((row) => row.kind === "manual" ? `
					<div class="rux-tasks__requirement-row">
						<label class="rux-checkbox rux-tasks__automatic-check ${row.checked ? "rux-tasks__automatic-check--complete" : ""}">
							<input type="checkbox" data-task-trip="${trip.id}" data-task-field="${row.field}" ${trip[row.field] ? "checked" : ""} />
							${row.label}
						</label>
						<input class="rux-input rux-tasks__requirement-input" type="text" maxlength="80"
							data-task-trip="${trip.id}" data-task-field="${row.detailField}"
							value="${escapeAttr(trip[row.detailField])}" placeholder="${row.placeholder}" aria-label="${row.placeholder}" />
					</div>
				` : `
					<div class="rux-tasks__requirement-row rux-tasks__requirement-row--automatic">
						<label class="rux-checkbox rux-tasks__automatic-check ${row.checked ? "rux-tasks__automatic-check--complete" : ""}">
							<input type="checkbox" disabled ${row.checked ? "checked" : ""} />
							${row.label}
						</label>
						<div class="rux-input rux-tasks__requirement-input rux-tasks__requirement-input--readonly ${row.severity === "conflict" ? "rux-tasks__requirement-input--danger" : row.checked ? "" : "rux-tasks__requirement-input--warning"}" role="status">${row.detail}</div>
					</div>
				`).join("")}
			</div>
		</div>
	` : "";
	const overallDone = ready && manualDone && envelopesDone && remindersDone && requirementsDone;
	return `
		<div class="rux-card-section rux-tasks__trip">
			<header class="rux-card-section__header rux-tasks__trip-header">
				<div>
					<p class="rux-tasks__trip-title">${escapeHtml(trip.destination || "—")} · ${escapeHtml(legLabel(trip, leg))}</p>
					<p class="rux-tasks__trip-customer">${escapeHtml(trip.customer || "—")}</p>
				</div>
				${statusIndicator(overallDone, "All done", "Still needs attention")}
			</header>
			<div class="rux-card-section__body rux-tasks__trip-body">
				<div class="rux-tasks__section rux-tasks__section--readiness">
					<div class="rux-tasks__checklist">
						<p class="rux-tasks__requirements-title">Trip Status</p>
						${computedRows}
					</div>
				</div>
				${requirementsHtml}
				<div class="rux-tasks__section rux-tasks__section--prep">
					<div class="rux-tasks__checklist">
						<p class="rux-tasks__requirements-title">To Do</p>
						${manualRows}
						${envelopeRows}
						${reminderRows}
					</div>
				</div>
			</div>
		</div>
	`;
}

// Keeps an empty day the same card shape as a day with trips, rather than
// a lone line of text that breaks the rhythm of cards scrolling down the
// panel — reused for both the weekend view's per-day empty state and the
// single-day view's whole-panel empty state below.
function emptyTripCard(text = "No Trips") {
	return `
		<div class="rux-card-section rux-tasks__trip rux-tasks__trip--empty">
			<div class="rux-card-section__body">
				<p class="rux-tasks__empty">${escapeHtml(text)}</p>
			</div>
		</div>
	`;
}

// Each day gets its own full card (header + body) — the same
// .rux-card__header/__title the old single top-level header used, just
// repeated once per day instead of describing only the first of however
// many days are showing.
function renderDayGroup(iso, entries) {
	return `
		<article class="rux-card rux-tasks__day-group">
			<header class="rux-card__header">
				<h4 class="rux-card__title">${formatDepartingTitle(iso)}</h4>
			</header>
			<div class="rux-card__body">
				${entries.length
					? entries.map(({ trip, leg }) => renderTrip(trip, leg)).join("")
					: emptyTripCard()}
			</div>
		</article>
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

// Prev/Next page one day at a time from whichever end of the currently
// shown range (a single day, or the Fri→Mon default cluster) is being
// moved away from. Today jumps back to the default view rather than the
// literal calendar date — there's nothing to prep "today", only tomorrow
// onward, so it means "back to the normal view" the same way it would on
// a calendar app. The buttons themselves are static markup in the shared
// #rp-panel-footer (index.html, data-rp-footer-for="rp-pane-tasks") now,
// not re-rendered here — this just syncs the one bit of dynamic state.
function syncNav() {
	if (navTodayBtn) navTodayBtn.disabled = !navigatedDate;
}

// No card header anymore — each day-group below carries its own
// "Departing [Day], [Month] [Day]" heading (see renderDayGroup) instead of
// a single date-specific line up top that only ever described the first
// of however many days are showing.
function render() {
	const byDate = entriesByDate();
	updateTabBadge(defaultEntriesByDate());
	syncNav();
	if (!body) return;
	body.innerHTML = byDate.map(({ iso, entries }) => renderDayGroup(iso, entries)).join("");
}

// Auto-checks the matching box when its shortcut is actually opened —
// clicking "Open contact info"/"Print envelope"/etc. only happens when
// someone's about to do that step, so there's no real "opened but didn't
// do it" case worth a confirm() prompt for. No-op if already checked, so
// re-opening something already marked done doesn't re-fire a write.
async function markTripFieldDone(trip, field) {
	if (trip[field]) return;
	trip[field] = true;
	render();
	try {
		await updateTripTaskFlags(trip.id, { [field]: true });
	} catch (err) {
		console.warn(`Could not save ${field}:`, err);
		trip[field] = false;
		render();
		window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
	}
}

async function markDriverFieldDone(driver, field) {
	if (driver[field]) return;
	driver.source[field] = true;
	render();
	try {
		await updateTripDriverTaskFlag(driver.id, field, true);
	} catch (err) {
		console.warn(`Could not save ${field}:`, err);
		driver.source[field] = false;
		render();
		window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
	}
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

// Shared "Open" / "Open & Mark as Complete" popover for every task
// shortcut — one instance, content is static so it's built once instead of
// per-open like the menus elsewhere in this app that rebuild per click.
let taskActionMenu = null;
let pendingTaskAction = null;

function ensureTaskActionMenu() {
	if (taskActionMenu) return taskActionMenu;
	taskActionMenu = document.createElement("div");
	taskActionMenu.className = "rux-menu rux-popover";
	taskActionMenu.hidden = true;
	taskActionMenu.setAttribute("role", "menu");
	taskActionMenu.innerHTML = `
		<button type="button" class="rux-menu__item" role="menuitem" data-task-menu-choice="open">Open</button>
		<button type="button" class="rux-menu__item" role="menuitem" data-task-menu-choice="open-complete">Open &amp; Mark as Complete</button>
	`;
	document.body.appendChild(taskActionMenu);
	taskActionMenu.addEventListener("click", (event) => {
		const choice = event.target.closest("[data-task-menu-choice]");
		if (!choice || !pendingTaskAction) return;
		const { open, markDone } = pendingTaskAction;
		const opened = open();
		if (choice.dataset.taskMenuChoice === "open-complete" && opened !== false) markDone();
	});
	taskActionMenu.addEventListener("rux:menu-close", () => {
		pendingTaskAction = null;
	});
	return taskActionMenu;
}

navGroup?.addEventListener("click", (event) => {
	const navBtn = event.target.closest("[data-tasks-nav]");
	if (!navBtn) return;
	const dates = targetDates();
	if (navBtn.dataset.tasksNav === "prev") navigatedDate = addDays(dates[0], -1);
	else if (navBtn.dataset.tasksNav === "next") navigatedDate = addDays(dates[dates.length - 1], 1);
	else if (navBtn.dataset.tasksNav === "today") navigatedDate = null;
	render();
});

body?.addEventListener("click", (event) => {
	const action = event.target.closest("[data-task-action]");
	if (!action) return;
	const trip = (window.RuxTrips?.list() || []).find(
		(item) => String(item.id) === String(action.dataset.taskTrip),
	);
	if (!trip) return;
	const leg = action.dataset.taskLeg || "outbound";

	let open = null;
	let markDone = null;

	if (action.dataset.taskAction === "contact-info") {
		open = () => openTripContactInfo(trip, leg);
		markDone = () => markTripFieldDone(trip, `driver_contact_sent_${leg}`);
	} else if (action.dataset.taskAction === "driver-reminder") {
		const driver = reminderDrivers(trip, leg).find(
			(item) => String(item.id) === String(action.dataset.tripDriverId),
		);
		if (!driver) return;
		const assignmentsUrlPromise = driverAssignmentsUrl(driver.driver_id);
		open = () => {
			void assignmentsUrlPromise.then((assignmentsUrl) => {
				if (!assignmentsUrl) window.Rux?.toast?.("No active assignment link for this driver");
				window.ContactInfoModal?.open(driverReminderMessage(trip, driver, leg, assignmentsUrl), {
					title: `Driver Reminder — ${driver.name}`,
					previewLabel: `Editable reminder for ${driver.name}`,
					editable: true,
					externalUrl: driver.textingUrl,
				});
			});
			return true;
		};
		markDone = () => markDriverFieldDone(driver, "trip_reminder_sent");
	} else if (action.dataset.taskAction === "print-envelope") {
		const driver = reminderDrivers(trip, leg).find(
			(item) => String(item.id) === String(action.dataset.tripDriverId),
		);
		if (!driver) return;
		open = () => {
			const prepared = envelopeTrip(trip, leg);
			if (!prepared) {
				window.Rux?.toast?.("Assign a bus before opening the envelope");
				return false;
			}
			const assignment = assignmentsForLeg(trip, leg)[0];
			window.TripEnvelope?.open(prepared, [], {
				busNumber: assignment?.buses?.number ?? assignment?.bus?.number ?? "",
				recipient: { name: driver.name, role: driver.role },
			});
			return true;
		};
		markDone = () => markDriverFieldDone(driver, "envelope_printed");
	} else if (action.dataset.taskAction === "itinerary") {
		open = () => openTripItineraryDoc(trip);
		markDone = () => markTripFieldDone(trip, `itinerary_printed_${leg}`);
	}

	if (!open) return;
	pendingTaskAction = { open, markDone };
	window.RuxMenu?.open(action, ensureTaskActionMenu(), { placement: "bottom-end" });
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
	else updateTabBadge(defaultEntriesByDate());
}, 30000);

// window.RuxTrips is set asynchronously by index.html's initSchedulerData()
// — at module-eval time here, trips almost certainly haven't loaded yet, so
// a single check-at-load would just see an empty list and hide the badge
// until the 30s poll (or a tab click) happened to catch it. Retry briefly
// instead of waiting a full 30s for the badge to ever become correct.
function primeBadge(attempt = 0) {
	updateTabBadge(defaultEntriesByDate());
	if (window.RuxTrips?.list()?.length || attempt >= 10) return;
	setTimeout(() => primeBadge(attempt + 1), 1000);
}
primeBadge();

window.RuxTasks = { activate: render };
