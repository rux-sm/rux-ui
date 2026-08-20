/* Shared rules for what a bus's status means and when it is out of service.

   Status answers one question — does this bus belong on the calendar at all:

     active    the row is always there
     inactive  the row is hidden, except on a week that has assignments on it,
               so looking back at a past week still shows what actually ran

   Being unavailable for a stretch is not a status. It is a row in
   bus_out_of_service with a start and an end, drawn over just those days, and
   the bus stays bookable across it with a warning. A bus that is out
   indefinitely is `inactive` — off the calendar — which is a different thing
   from unavailable until Friday.

   See supabase/bus-status-patch.sql for the schema this reads. */

export const BUS_STATUSES = ["active", "inactive"];

/* The database may still hold the pre-patch vocabulary, so every read goes
   through here and the UI is correct either way — before the patch runs, after
   it runs, and for a row some other tool wrote.

   'retired' and 'inactive' were always the same idea. 'maintenance' and
   'out-of-service' described a stretch of time in a column that has no dates,
   so they resolve to `active` and the dates, if any, live as windows. */
export function normalizeBusStatus(value) {
	const status = String(value ?? "").trim().toLowerCase();
	if (status === "inactive" || status === "retired") return "inactive";
	return "active";
}

export function isBusActive(bus) {
	return normalizeBusStatus(bus?.status) === "active";
}

/* Whether a bus belongs on the grid this week. An inactive bus earns its row
   back only by having something on it — an assignment the dispatcher needs to
   see, whether that is a past week being reviewed or a future one that should
   never have been booked. */
export function isBusVisibleThisWeek(bus, hasPlacements) {
	return isBusActive(bus) || Boolean(hasPlacements);
}

/* ── Out-of-service windows ─────────────────────────────────────────────── */

/* ISO date strings (YYYY-MM-DD) compare correctly as strings, which is what
   every date in this schema is. No Date objects, so no timezone to get wrong. */
function isIsoDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

export function isValidOutOfServiceWindow(window) {
	return (
		isIsoDate(window?.start_date) &&
		isIsoDate(window?.end_date) &&
		window.end_date >= window.start_date
	);
}

/* Both ends are inclusive: a window of Aug 24 – Aug 24 is one whole day out. */
export function outOfServiceOn(windows, isoDate) {
	if (!isIsoDate(isoDate)) return null;
	return (
		(windows ?? []).find(
			(window) =>
				isValidOutOfServiceWindow(window) &&
				window.start_date <= isoDate &&
				window.end_date >= isoDate,
		) ?? null
	);
}

/* Every window a date range touches — what the four assignment warnings read
   from. An end date that is missing falls back to the start, so a single-day
   trip can be passed as-is. */
export function outOfServiceOverlap(windows, startDate, endDate) {
	const from = startDate;
	const to = endDate || startDate;
	if (!isIsoDate(from) || !isIsoDate(to)) return [];
	return (windows ?? []).filter(
		(window) =>
			isValidOutOfServiceWindow(window) &&
			window.start_date <= to &&
			window.end_date >= from,
	);
}

export function isOutOfServiceDuring(windows, startDate, endDate) {
	return outOfServiceOverlap(windows, startDate, endDate).length > 0;
}

/* What the fleet list's Status column shows. "Out of service" is derived from
   today's windows and never stored, so the label and the dates cannot drift. */
export function deriveBusStatusLabel(bus, windows, today) {
	if (!isBusActive(bus)) return "Inactive";
	return outOfServiceOn(windows, today) ? "Out of service" : "Active";
}

/* Groups a flat fetch of every window into a Map keyed by bus id, which is how
   the scheduler wants them — one query, then a lookup per row. */
export function indexOutOfServiceByBus(windows) {
	const byBus = new Map();
	(windows ?? []).forEach((window) => {
		if (!window?.bus_id) return;
		if (!byBus.has(window.bus_id)) byBus.set(window.bus_id, []);
		byBus.get(window.bus_id).push(window);
	});
	return byBus;
}
