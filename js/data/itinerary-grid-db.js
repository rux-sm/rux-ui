/* ==========================================================================
   TRIP ITINERARIES  ·  storage for the Grid tab
   --------------------------------------------------------------------------
   One Trip Draft v3 document per trip, in the trip_itineraries table created
   by supabase/trip_itineraries.sql.

   That patch is run by hand — this repository has no migration runner — so
   this module ships BEFORE the table exists and has to behave when it does
   not. A missing relation is treated as "not set up yet", not as an error:
   isAvailable() goes false, load() returns null, save() reports that it did
   nothing, and the Grid tab keeps working in memory. Nothing else in the app
   changes either way, because trip_stops is still written on every save by
   the path that always wrote it.

   The document is never the only copy of the itinerary. It carries the four
   things trip_stops cannot hold — day offsets, activity, address confidence,
   and what the geocoder actually matched — while the stops themselves are
   mirrored into trip_stops so print schedules, the trip envelope, driver
   share and trip-bar mileage keep reading what they always read.
   ========================================================================== */

import { supabase } from "./supabase.js";

const TABLE = "trip_itineraries";

// Postgres 42P01 is undefined_table. PostgREST also answers a request for an
// unknown relation with PGRST205 and a "schema cache" message, depending on
// whether the cache has been reloaded — all three mean the same thing here.
function isMissingTable(error) {
	if (!error) return false;
	const code = String(error.code || "");
	if (code === "42P01" || code === "PGRST205" || code === "PGRST106") return true;
	return /schema cache|does not exist|could not find the table/i.test(error.message || "");
}

// Latched rather than re-probed. The table cannot appear or vanish inside a
// session — running the patch means reloading the page — and re-checking on
// every save would turn one missing-table error into one per keystroke in the
// console.
let available = null;

export function isAvailable() {
	return available;
}

export async function loadItineraryDocument(tripId) {
	if (!tripId || available === false) return null;
	const { data, error } = await supabase
		.from(TABLE)
		.select("document, updated_at")
		.eq("trip_id", tripId)
		.maybeSingle();

	if (error) {
		if (isMissingTable(error)) {
			available = false;
			console.info(
				"trip_itineraries is not set up — the Grid tab will hold its itinerary in memory only. "
				+ "Run supabase/trip_itineraries.sql to persist it.",
			);
			return null;
		}
		throw error;
	}
	available = true;
	return data?.document ?? null;
}

/* Write the document for a trip.

   Upsert on the primary key, so a trip has exactly one document and saving
   twice does not accumulate rows. Returns whether it was actually stored, so
   the caller can tell "saved" from "there is nowhere to save it yet" and say
   the right thing rather than claiming success.

   A failure here must never fail the trip save. The stops are already in
   trip_stops by the time this runs; losing the document costs the four extra
   fields, and turning that into a failed save would cost the whole trip. */
export async function saveItineraryDocument(tripId, document) {
	if (!tripId || !document || available === false) return false;
	const { error } = await supabase
		.from(TABLE)
		.upsert({ trip_id: tripId, document }, { onConflict: "trip_id" });

	if (error) {
		if (isMissingTable(error)) {
			available = false;
			console.info(
				"trip_itineraries is not set up — the Grid tab's itinerary was not persisted. "
				+ "Run supabase/trip_itineraries.sql.",
			);
			return false;
		}
		console.warn("The Grid itinerary document could not be saved:", error);
		return false;
	}
	available = true;
	return true;
}

export async function deleteItineraryDocument(tripId) {
	if (!tripId || available === false) return false;
	const { error } = await supabase.from(TABLE).delete().eq("trip_id", tripId);
	if (error) {
		if (isMissingTable(error)) {
			available = false;
			return false;
		}
		console.warn("The Grid itinerary document could not be deleted:", error);
		return false;
	}
	return true;
}
