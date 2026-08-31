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

/* The inbox columns arrive in a second patch (trip_itineraries_inbox.sql), so
   the table can exist while they do not. Tracked separately from the table:
   a trip's own itinerary keeps working either way, and only the inbox has to
   stand down. */
function isMissingColumn(error) {
	if (!error) return false;
	if (String(error.code || "") === "42703") return true;
	return /column .* does not exist|could not find the .* column/i.test(error.message || "");
}

// Latched rather than re-probed. Neither can appear or vanish inside a session
// — running a patch means reloading the page — and re-checking on every save
// would turn one missing-table error into one per keystroke in the console.
let available = null;
let inboxAvailable = null;

export function isAvailable() {
	return available;
}

export function isInboxAvailable() {
	return inboxAvailable;
}

function inboxStoodDown(error, what) {
	if (isMissingTable(error)) available = false;
	inboxAvailable = false;
	console.info(
		`The itinerary inbox is not set up — ${what} is unavailable. `
		+ "Run supabase/trip_itineraries_inbox.sql.",
	);
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

	/* Read, then insert or update — not upsert.

	   It was upsert(onConflict: "trip_id") while trip_id was the primary key.
	   The inbox patch moves the key to `id` and enforces one-itinerary-per-trip
	   with a PARTIAL unique index instead, and a partial index cannot be an
	   ON CONFLICT target through PostgREST: the conflict clause would have to
	   repeat the index's WHERE, which the client cannot express. Two round
	   trips is the honest price of that. */
	const { data: existing, error: readError } = await supabase
		.from(TABLE)
		.select("id")
		.eq("trip_id", tripId)
		.maybeSingle();

	if (readError) {
		if (isMissingTable(readError)) {
			available = false;
			console.info(
				"trip_itineraries is not set up — the Grid tab's itinerary was not persisted. "
				+ "Run supabase/trip_itineraries.sql.",
			);
			return false;
		}
		console.warn("The Grid itinerary document could not be read back:", readError);
		return false;
	}

	const { error } = existing
		? await supabase.from(TABLE).update({ document }).eq("id", existing.id)
		: await supabase.from(TABLE).insert({ trip_id: tripId, document });

	if (error) {
		console.warn("The Grid itinerary document could not be saved:", error);
		return false;
	}
	available = true;
	return true;
}

/* ── The inbox ───────────────────────────────────────────────────────────
   A processed itinerary with no trip yet. Same table, same document, trip_id
   NULL — attaching to the calendar is an UPDATE rather than a copy, so there
   is never a second version to drift.

   Everything here degrades when the inbox patch has not been run: the caller
   gets an empty list or false, and one console line says which file to run. */

const INBOX_COLUMNS = "id, document, label, status, created_at, updated_at";

export async function listItineraryDrafts() {
	if (available === false || inboxAvailable === false) return [];
	const { data, error } = await supabase
		.from(TABLE)
		.select(INBOX_COLUMNS)
		.is("trip_id", null)
		.order("created_at", { ascending: false });

	if (error) {
		if (isMissingTable(error) || isMissingColumn(error)) {
			inboxStoodDown(error, "the list");
			return [];
		}
		console.warn("The itinerary inbox could not be listed:", error);
		return [];
	}
	available = true;
	inboxAvailable = true;
	return data ?? [];
}

export async function saveItineraryDraft(document, label) {
	if (!document || available === false || inboxAvailable === false) return null;
	const { data, error } = await supabase
		.from(TABLE)
		.insert({ trip_id: null, document, label: label || null })
		.select(INBOX_COLUMNS)
		.single();

	if (error) {
		if (isMissingTable(error) || isMissingColumn(error)) {
			inboxStoodDown(error, "adding a draft");
			return null;
		}
		console.warn("The itinerary draft could not be saved:", error);
		return null;
	}
	available = true;
	inboxAvailable = true;
	return data;
}

export async function updateItineraryDraft(id, patch) {
	if (!id || inboxAvailable === false) return false;
	const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
	if (error) {
		if (isMissingTable(error) || isMissingColumn(error)) {
			inboxStoodDown(error, "editing a draft");
			return false;
		}
		console.warn("The itinerary draft could not be updated:", error);
		return false;
	}
	return true;
}

/* Attach a draft to a trip: the row stops being in the inbox and becomes that
   trip's itinerary. One UPDATE, so there is no window where the document
   exists twice and no chance of the two diverging.

   A trip already holding an itinerary is refused rather than silently
   overwritten — the partial unique index would reject it anyway, and saying
   so is better than surfacing a constraint violation. */
export async function attachDraftToTrip(id, tripId) {
	if (!id || !tripId || inboxAvailable === false) return { ok: false, reason: "unavailable" };

	const { data: taken, error: readError } = await supabase
		.from(TABLE)
		.select("id")
		.eq("trip_id", tripId)
		.maybeSingle();
	if (readError && !isMissingTable(readError) && !isMissingColumn(readError)) {
		console.warn("Could not check whether that trip already has an itinerary:", readError);
		return { ok: false, reason: "error" };
	}
	if (taken) return { ok: false, reason: "occupied" };

	const { error } = await supabase.from(TABLE).update({ trip_id: tripId }).eq("id", id);
	if (error) {
		console.warn("The itinerary could not be attached to the trip:", error);
		return { ok: false, reason: "error" };
	}
	return { ok: true };
}

export async function deleteItineraryDraft(id) {
	if (!id || inboxAvailable === false) return false;
	const { error } = await supabase.from(TABLE).delete().eq("id", id);
	if (error) {
		console.warn("The itinerary draft could not be deleted:", error);
		return false;
	}
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
