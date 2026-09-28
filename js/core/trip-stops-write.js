/* Plans what a save writes to `trip_stops`, by id, as the scheduler's Route
   tab writes it, instead of deleting every stop and inserting them again.

   The itinerary tab edits each leg's two ends and the group's two times, and
   copies the stops in between as they were, so its rows line up with the
   stored ones by place in the leg: the leg's pickup, its stops in order, and
   its last return. Day and sleeper rows, which it does not read, and any
   other row are left as they are.

   A column is written only where this form changed it: where the form's row
   now differs from the same row as the form built it when the trip opened,
   and from what is stored. So a spot typed in the scheduler, its yard times
   and a drop-off's own arrival stand until the time they follow is changed
   here.

   A row the form has and the table lacks, such as a leg's missing return, is
   inserted. Positions run across both legs, outbound first, as both apps
   order them; they are renumbered only when a row is inserted or deleted. A
   leg in `dropLegs`, the return of a trip that stopped being a split, loses
   its rows.

   `loaded` is the trip's rows as stored, each with `id`, `leg`, `position`
   and `type`; `baseline` and `current` are the form's rows, in the shape
   trip-db's `stopRow` writes, when the trip opened and now. */

export const STOP_COLUMNS = [
	"type", "label", "name", "address", "miles", "drive", "lat", "lng", "mapbox_id",
	"miles_source", "drive_source", "route_status", "depart_prev", "depart_prev_date",
	"arrive", "arrive_date", "spot", "spot_date", "dwell_status", "dwell_reset",
];
const TIMES = new Set(["depart_prev", "arrive", "spot"]);
const NUMBERS = new Set(["miles", "lat", "lng"]);

const blank = (v) => v === undefined || v === null || v === "";

export function sameStopValue(column, a, b) {
	if (blank(a) && blank(b)) return true;
	if (blank(a) || blank(b)) return false;
	if (TIMES.has(column)) return String(a).slice(0, 5) === String(b).slice(0, 5);
	if (NUMBERS.has(column)) return Number(a) === Number(b);
	return String(a) === String(b);
}

const legOf = (row) => (row.leg === "return" ? "return" : "outbound");
const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);

// A leg's rows as the form's parts: its pickup, its stops, its last return.
function partsOf(rows) {
	const pickup = rows.find((r) => r.type === "pickup") || null;
	const back = [...rows].reverse().find((r) => r.type === "return") || null;
	const stops = rows.filter((r) => r.type === "stop");
	return { pickup, stops, back };
}
function formParts(rows) {
	if (!rows.length) return { pickup: null, stops: [], back: null };
	const pickup = rows[0]?.type === "pickup" ? rows[0] : null;
	const back = rows[rows.length - 1]?.type === "return" ? rows[rows.length - 1] : null;
	const stops = rows.slice(pickup ? 1 : 0, back ? rows.length - 1 : rows.length);
	return { pickup, stops, back };
}

const valuesOf = (row) => Object.fromEntries(STOP_COLUMNS.filter((c) => c in row).map((c) => [c, blank(row[c]) ? null : row[c]]));

export function planStops({ loaded = [], baseline = [], current = [], dropLegs = [] }) {
	const updates = [];
	const inserts = [];
	const deletes = [];
	// Each leg's rows in their final order: stored rows by id, new ones as values.
	const order = { outbound: [], return: [] };

	for (const leg of ["outbound", "return"]) {
		const stored = loaded.filter((r) => legOf(r) === leg).sort(byPosition);
		if (dropLegs.includes(leg)) {
			deletes.push(...stored.map((r) => String(r.id)));
			continue;
		}
		const now = formParts(current.filter((r) => legOf(r) === leg));
		const then = formParts(baseline.filter((r) => legOf(r) === leg));
		const rows = partsOf(stored);
		// The leg's final order: a stored row by id, a new one by its values.
		// A pickup or stop is an anchor a new stop is placed after.
		const legOrder = stored.map((r) => ({ id: String(r.id), anchor: r.type === "stop" || r.type === "pickup" }));
		const lastAnchor = () => {
			for (let i = legOrder.length - 1; i >= 0; i--) if (legOrder[i].anchor) return i;
			return -1;
		};

		const pair = (next, before, row, where) => {
			if (!next) return;
			if (!row) {
				const entry = { values: { ...valuesOf(next), leg }, anchor: where !== "end" };
				if (where === "start") legOrder.unshift(entry);
				else if (where === "end") legOrder.push(entry);
				else legOrder.splice(lastAnchor() + 1, 0, entry);
				inserts.push(entry);
				return;
			}
			const patch = {};
			for (const c of STOP_COLUMNS) {
				if (!(c in next)) continue;
				const changedHere = before ? !sameStopValue(c, next[c], before[c]) : true;
				if (changedHere && !sameStopValue(c, next[c], row[c])) patch[c] = blank(next[c]) ? null : next[c];
			}
			if (Object.keys(patch).length) updates.push({ id: String(row.id), values: patch });
		};

		pair(now.pickup, then.pickup, rows.pickup, "start");
		now.stops.forEach((st, i) => pair(st, then.stops[i], rows.stops[i], "middle"));
		// Stops the form no longer has, as after an import of fewer.
		if (now.stops.length && rows.stops.length > now.stops.length) {
			for (const r of rows.stops.slice(now.stops.length)) {
				deletes.push(String(r.id));
				const at = legOrder.findIndex((e) => e.id === String(r.id));
				if (at >= 0) legOrder.splice(at, 1);
			}
		}
		pair(now.back, then.back, rows.back, "end");
		order[leg] = legOrder;
	}

	// Positions, only when a row came or went: outbound then return, 0 up.
	const positions = [];
	if (inserts.length || deletes.length) {
		let n = 0;
		for (const leg of ["outbound", "return"]) {
			for (const e of order[leg]) {
				if (e.values) e.values.position = n;
				else {
					const row = loaded.find((r) => String(r.id) === e.id);
					if (row && row.position !== n) positions.push({ id: e.id, position: n });
				}
				n += 1;
			}
		}
	}
	return {
		updates,
		inserts: inserts.map((e) => e.values),
		deletes,
		positions,
	};
}

/* The trip's rows as stored once a plan is written, for the next save to
   start from: the deleted ones gone, each update and new position applied,
   and each inserted row with the id the table gave it, in `insertedIds`'
   order. Sorted by position. */
export function applyStopPlan(loaded, plan, insertedIds = []) {
	const gone = new Set(plan.deletes.map(String));
	const rows = loaded.filter((r) => !gone.has(String(r.id))).map((r) => ({ ...r }));
	const byId = new Map(rows.map((r) => [String(r.id), r]));
	for (const { id, values } of plan.updates) Object.assign(byId.get(String(id)) ?? {}, values);
	for (const { id, position } of plan.positions) if (byId.has(String(id))) byId.get(String(id)).position = position;
	plan.inserts.forEach((values, i) => rows.push({ ...values, id: insertedIds[i] ?? null }));
	return rows.sort(byPosition);
}
