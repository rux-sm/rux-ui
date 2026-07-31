import { updateTripTaskFlags } from "../data/trip-db.js";

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
// (see supabase/trip-task-flags-patch.sql) — a split trip's return leg is
// often a different driver/bus dispatched much later, so it gets its own
// set rather than sharing the outbound leg's checkboxes.
const MANUAL_ITEMS = [
	{ suffix: "driver_contact_sent", label: "Driver contact sent" },
	{ suffix: "trip_reminder_sent", label: "Trip reminder sent" },
	{ suffix: "envelope_printed", label: "Envelope printed" },
];

function isTripReady(trip) {
	return COMPUTED_ITEMS.every((item) => item.checked(trip));
}

function isPrepDone(trip, leg) {
	return MANUAL_ITEMS.every((item) => trip[`${item.suffix}_${leg}`]);
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
	const prepDone = isPrepDone(trip, leg);
	const manualRows = MANUAL_ITEMS
		.map((item, i) => `
			<label class="rux-checkbox">
				<input type="checkbox" data-task-trip="${trip.id}" data-task-field="${manualFields[i]}" ${trip[manualFields[i]] ? "checked" : ""} />
				${item.label}
			</label>
		`)
		.join("");
	return `
		<div class="rux-tasks__trip">
			<div class="rux-tasks__trip-header">
				<p class="rux-tasks__trip-title">${escapeHtml(trip.destination || "—")} · ${escapeHtml(legLabel(trip, leg))}</p>
				<p class="rux-tasks__trip-customer">${escapeHtml(trip.customer || "—")}</p>
			</div>
			<div class="rux-tasks__section">
				<div class="rux-tasks__checklist">${computedRows}</div>
				<span class="rux-badge ${ready ? "rux-badge--success" : "rux-badge--warning"}">${ready ? "Ready" : "Pending"}</span>
			</div>
			<div class="rux-tasks__section rux-tasks__section--prep">
				<div class="rux-tasks__checklist">${manualRows}</div>
				<span class="rux-badge ${prepDone ? "rux-badge--success" : "rux-badge--warning"}">${prepDone ? "Done" : "Pending"}</span>
			</div>
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
	const checkbox = event.target.closest("[data-task-field]");
	if (!checkbox) return;
	const tripId = checkbox.dataset.taskTrip;
	const field = checkbox.dataset.taskField;
	const checked = checkbox.checked;
	const trip = (window.RuxTrips?.list() || []).find((t) => String(t.id) === String(tripId));
	if (!trip) return;
	const previous = trip[field];
	trip[field] = checked;
	// Re-render right away, not just after the write resolves — the
	// section's Done/Pending badge is a separate element from the checkbox
	// itself and won't otherwise reflect the new state until the next poll.
	render();
	try {
		await updateTripTaskFlags(tripId, { [field]: checked });
	} catch (err) {
		console.warn("Could not save task flag:", err);
		trip[field] = previous;
		render();
		window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
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
