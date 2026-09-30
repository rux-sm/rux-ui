/* The trip's updates in `trip_updates`, the table the scheduler keeps them in;
   see core/trip-update-change.js. Staff only: the database grants the public
   link pages' key nothing on it. */

import { supabase } from "./supabase.js";
import { getCurrentProfile } from "../core/profile.js";

const COLUMNS = "id,created_at,actor_id,actor_name,body,kind,edited_at";

// A trip's updates, newest first.
export async function fetchTripUpdates(tripId) {
	const { data, error } = await supabase.from("trip_updates")
		.select(COLUMNS).eq("trip_id", tripId).order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}

/* One update, credited to the signed-in profile as the scheduler credits it.
   `changes` is not null in the table, so an update that names no change
   leaves it out and takes the column's default. */
export async function addTripUpdate(tripId, { kind = "update", body, keys = null }) {
	const row = { trip_id: tripId, body, kind, actor_name: getCurrentProfile()?.display_name?.trim() || null };
	if (Array.isArray(keys)) row.changes = keys;
	const { error } = await supabase.from("trip_updates").insert(row);
	if (error) throw error;
}
