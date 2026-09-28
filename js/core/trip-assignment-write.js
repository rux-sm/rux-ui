/* Writes a trip's buses and their drivers by row id, the way the scheduler's
   Buses tab does, so a column this editor does not edit — what a vehicle needs,
   the type it should be — stays on its row across a save here.

   `assignments` is the editor's list, one entry per bus group that has a bus
   or a row: `id` is the trip_assignments row it was loaded from or saved as,
   or null for a new one. A row still in the list is updated, a new one
   inserted, and a row the list no longer holds deleted, which takes its
   trip_drivers with it. A driver's seat is its role: the role's row is
   updated, a new role inserted, and a role no longer held, or a second row for
   one role, deleted.

   Each inserted entry gets `savedId`, so the caller can hand the new id back to
   its bus group and the next save updates the row instead of adding another. */

export async function writeTripAssignments(client, tripId, assignments, { shareFields = true } = {}) {
	const { data: heldRows, error: heldErr } = await client
		.from("trip_assignments")
		.select("id, trip_drivers(id, role)")
		.eq("trip_id", tripId);
	if (heldErr) throw heldErr;
	const held = new Map((heldRows ?? []).map((row) => [String(row.id), row]));
	const kept = new Set(
		assignments.filter((a) => a.id && held.has(String(a.id))).map((a) => String(a.id)),
	);
	const gone = [...held.keys()].filter((id) => !kept.has(id));
	if (gone.length) {
		const { error } = await client
			.from("trip_assignments")
			.delete()
			.eq("trip_id", tripId)
			.in("id", gone);
		if (error) throw error;
	}

	// A database without the relief columns takes the driver without them.
	const seatRow = (driver) => {
		if (shareFields) return driver;
		const { report_time, instructions, ...legacy } = driver;
		return legacy;
	};

	for (const assignment of assignments) {
		const { bus_id, position, drivers = [], active_roles, leg } = assignment;
		const row = { bus_id, position, active_roles, leg: leg ?? "outbound" };
		if (assignment.id && kept.has(String(assignment.id))) {
			const { error: updateErr } = await client
				.from("trip_assignments")
				.update(row)
				.eq("trip_id", tripId)
				.eq("id", assignment.id);
			if (updateErr) throw updateErr;
			const byRole = new Map();
			for (const seat of held.get(String(assignment.id)).trip_drivers ?? []) {
				if (!byRole.has(seat.role)) byRole.set(seat.role, []);
				byRole.get(seat.role).push(seat.id);
			}
			for (const driver of drivers) {
				const seatId = byRole.get(driver.role)?.shift();
				const { error: seatErr } = seatId
					? await client.from("trip_drivers").update(seatRow(driver)).eq("id", seatId)
					: await client.from("trip_drivers").insert({ ...seatRow(driver), assignment_id: assignment.id });
				if (seatErr) throw seatErr;
			}
			const vacated = [...byRole.values()].flat();
			if (vacated.length) {
				const { error: vacateErr } = await client.from("trip_drivers").delete().in("id", vacated);
				if (vacateErr) throw vacateErr;
			}
			continue;
		}
		const { data: made, error: insertErr } = await client
			.from("trip_assignments")
			.insert({ trip_id: tripId, ...row })
			.select("id")
			.single();
		if (insertErr) throw insertErr;
		assignment.savedId = made.id;
		if (drivers.length) {
			const { error: driversErr } = await client
				.from("trip_drivers")
				.insert(drivers.map((driver) => ({ ...seatRow(driver), assignment_id: made.id })));
			if (driversErr) throw driversErr;
		}
	}
}

/* A vehicle need turned on or off in this editor, which keeps one set of needs
   for the whole trip, is given to or taken from every vehicle on it; each
   vehicle's other needs, set in the scheduler, stay as they are. */
export async function applyVehicleNeedChanges(client, tripId, added = [], removed = []) {
	if (!added.length && !removed.length) return;
	const { data, error } = await client
		.from("trip_assignments")
		.select("id, needs")
		.eq("trip_id", tripId);
	if (error) throw error;
	const held = (needs) => Object.keys(needs ?? {}).filter((id) => needs[id] === true).sort().join();
	for (const row of data ?? []) {
		const needs = Object.fromEntries(Object.keys(row.needs ?? {}).filter((id) => row.needs[id] === true).map((id) => [id, true]));
		for (const id of added) needs[id] = true;
		for (const id of removed) delete needs[id];
		if (held(needs) === held(row.needs)) continue;
		const { error: updateErr } = await client.from("trip_assignments").update({ needs }).eq("id", row.id);
		if (updateErr) throw updateErr;
	}
}
