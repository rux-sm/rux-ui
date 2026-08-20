/* Shared answer to "how many buses does this leg of the trip need, and how many
   of those slots are actually filled?"

   The trip editor and the scheduler grid both have to agree on this or a bus
   goes missing: the editor decides how many bus groups to draw, the grid
   decides how many bars to place. The rule lived only in loadTrip, so the grid
   had no way to know a trip was short of its bus_count and simply rendered
   whatever rows existed. Both now read it from here. */

const RETURN_LEG = "return";
const OUTBOUND_LEG = "outbound";

/* Any leg value that isn't the return leg is the outbound one — matches how
   both callers already read the column, where a null leg means outbound. */
export function legOf(assignment) {
	return assignment?.leg === RETURN_LEG ? RETURN_LEG : OUTBOUND_LEG;
}

/* The legs this trip actually runs, each gated on its own start date. Only a
   Drop-off / Pick-up trip has a second leg: it returns on separate dates and
   needs its own bus there. */
export function legsForTrip(trip) {
	const legs = [];
	if (trip?.start_date) legs.push(OUTBOUND_LEG);
	if (trip?.trip_type === "dropoff_pickup" && trip?.return_start_date) {
		legs.push(RETURN_LEG);
	}
	return legs;
}

export function assignmentsOnLeg(rows, leg) {
	const wanted = leg === RETURN_LEG ? RETURN_LEG : OUTBOUND_LEG;
	return (rows ?? []).filter((row) => legOf(row) === wanted);
}

/* Floored at the rows that already exist, so a stale or wrong bus_count can
   only ever under-report the need — never hide a bus that is already assigned. */
export function busSlotCount(trip, leg, rows = []) {
	const declared = leg === RETURN_LEG
		? trip?.return_bus_count
		: trip?.bus_count;
	return Math.max(1, Number(declared) || 0, assignmentsOnLeg(rows, leg).length);
}

/* Slots on this leg with no trip_assignments row behind them. Never negative:
   busSlotCount is floored at the row count above. */
export function missingBusSlots(trip, leg, rows = []) {
	return busSlotCount(trip, leg, rows) - assignmentsOnLeg(rows, leg).length;
}
