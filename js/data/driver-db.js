import { supabase } from "./supabase.js";
import { isAssignmentRoleActive } from "../core/trip-assignment-roles.js";

export async function fetchDrivers() {
  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("id, driver_ref, name, short_name, email, phone, texting_url, address, city, address_state, zip, date_of_birth, hire_date, cdl_class, license_number, license_state, license_exp, med_card_expiry, endorsements, status, employment_type, priority, emergency_contact_name, emergency_contact_phone, notes, sort_order, photo_path")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw error;
  // Signed before the list is handed back, so the first render has its photos.
  await signDriverPhotos((drivers ?? []).map((d) => d.photo_path), { fresh: true });
  return drivers ?? [];
}

export async function reorderDrivers(updates) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("drivers").update({ sort_order }).eq("id", id)
    )
  );
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
}

export async function saveDriver(driver) {
  const { id, timeOff, ...fields } = driver;
  let saved;
  if (id) {
    const { data, error } = await supabase
      .from("drivers")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("drivers")
      .insert(fields)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  }
  if (timeOff) await replaceTimeOff(saved.id, timeOff);
  return saved;
}

export async function deleteDriver(id) {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

/* ── Time off ───────────────────────────────────────────────────────────── */

export async function fetchTimeOff(driverId) {
  const { data, error } = await supabase
    .from("driver_time_off")
    .select("*")
    .eq("driver_id", driverId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Bulk fetch for the driver assignment grid — one query for every driver's
// time off instead of one per driver, same reasoning as trip payments/
// passengers being bulk-fetched for the calendar instead of per-trip.
export async function fetchAllTimeOff() {
  const { data, error } = await supabase
    .from("driver_time_off")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Replaced wholesale on save — same "delete all, reinsert" recipe as
// trip_payments / trip_ticket_options.
export async function replaceTimeOff(driverId, entries) {
  const { error: deleteErr } = await supabase
    .from("driver_time_off")
    .delete()
    .eq("driver_id", driverId);
  if (deleteErr) throw deleteErr;
  if (entries.length) {
    const { error: insertErr } = await supabase
      .from("driver_time_off")
      .insert(entries.map((e) => ({ driver_id: driverId, ...e })));
    if (insertErr) throw insertErr;
  }
}

/* ── Photos ─────────────────────────────────────────────────────────────── */

const PHOTO_BUCKET = "driver-photos";

/* The bucket is closed to everyone but staff, so a photo is shown through a
   link signed for ten minutes. The links are signed in one request when the
   drivers are fetched, so getDriverPhotoUrl stays synchronous for the views
   that build their markup as strings. Once the links near their end, or a path
   has none yet, they are signed again in the background and
   "rux:driver-photos-signed" tells the views to draw their avatars again. */
const PHOTO_LINK_SECONDS = 600;
const photoLinks = new Map();
// Paths asked for since the last full signing, so a path that cannot be
// signed is not asked for on every render.
const photoAsked = new Set();
let photoLinksAt = 0;
let photoSigning = null;

async function signDriverPhotos(paths, { fresh = false } = {}) {
  const wanted = [...new Set(paths.filter(Boolean))];
  if (fresh) {
    photoAsked.clear();
    photoLinksAt = Date.now();
  }
  wanted.forEach((path) => photoAsked.add(path));
  if (!wanted.length) return;
  try {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(wanted, PHOTO_LINK_SECONDS);
    if (error) return;
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) photoLinks.set(row.path, row.signedUrl);
    }
  } catch {
    // Unsigned photos show their initials.
  }
}

export function getDriverPhotoUrl(photoPath) {
  if (!photoPath) return null;
  const stale = Date.now() - photoLinksAt > (PHOTO_LINK_SECONDS - 60) * 1000;
  if (!photoSigning && (stale || !photoAsked.has(photoPath))) {
    const paths = stale ? [...photoLinks.keys(), photoPath] : [photoPath];
    photoSigning = signDriverPhotos(paths, { fresh: stale }).finally(() => {
      photoSigning = null;
      document.dispatchEvent(new CustomEvent("rux:driver-photos-signed"));
    });
  }
  return photoLinks.get(photoPath) || null;
}

export async function uploadDriverPhoto(driverId, file) {
  const ext = file.name.split(".").pop() || "jpg";
  const photoPath = `${driverId}/photo-${Date.now()}.${ext}`;

  const { data: existing } = await supabase
    .from("drivers")
    .select("photo_path")
    .eq("id", driverId)
    .single();
  if (existing?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
  }

  const { error: uploadErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(photoPath, file);
  if (uploadErr) throw uploadErr;

  const { error: updateErr } = await supabase
    .from("drivers")
    .update({ photo_path: photoPath })
    .eq("id", driverId);
  if (updateErr) throw updateErr;

  await signDriverPhotos([photoPath]);
  return photoPath;
}

export async function removeDriverPhoto(driverId) {
  const { data: existing } = await supabase
    .from("drivers")
    .select("photo_path")
    .eq("id", driverId)
    .single();
  if (existing?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
  }
  const { error } = await supabase
    .from("drivers")
    .update({ photo_path: null })
    .eq("id", driverId);
  if (error) throw error;
}

export async function fetchDriverTrips(driverId) {
  const { data, error } = await supabase
    .from("trip_drivers")
    .select(`
      role,
      trip_assignments(
        leg, active_roles,
        trips(trip_ref, start_date, end_date, return_start_date, return_end_date, trip_type, destination, invoice_status, cancelled_at),
        buses(number)
      )
    `)
    .eq("driver_id", driverId);
  if (error) throw error;

  return (data ?? [])
    .map(td => {
      const ta   = td.trip_assignments;
      const trip = ta?.trips;
      if (!trip?.trip_ref) return null;
      // Cancelling a trip deletes its trip_drivers rows, but trips cancelled
      // before that behavior existed can still carry them — a cancelled trip
      // is not part of a driver's schedule either way.
      if (trip.cancelled_at) return null;
      if (!isAssignmentRoleActive(ta, td.role)) return null;
      // Return-leg assignments run on the trip's separate return date range,
      // not its outbound start/end — only meaningful for dropoff_pickup trips.
      const isReturnLeg = ta.leg === "return" && trip.trip_type === "dropoff_pickup";
      return {
        tripRef:       trip.trip_ref,
        startDate:     isReturnLeg ? trip.return_start_date : trip.start_date,
        endDate:       isReturnLeg ? trip.return_end_date : trip.end_date,
        destination:   trip.destination,
        invoiceStatus: trip.invoice_status,
        busNumber:     ta.buses?.number,
        role:          td.role,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

/* ── Workload reporting ───────────────────────────────────────────────── */

// Fetch once for the comparison table, then apply the user's start-date
// range in the client. A driver receives the full trip mileage for every
// trip they are assigned to; the aggregator de-duplicates that trip-level
// value while still summing each individual driver-pay field.
export async function fetchDriverWorkloadAssignments() {
  const { data, error } = await supabase
    .from("trip_drivers")
    .select(`
      id, driver_id, role, pay,
      trip_assignments!inner(
        id, leg, active_roles,
        trips!inner(
          id, trip_ref, trip_type,
          start_date, end_date,
          return_start_date, return_end_date,
          est_miles, actual_miles
        )
      )
    `)
    // A cancelled trip was never driven, so it earns no pay or mileage.
    // Server-side because legacy cancelled trips may still carry driver rows.
    .is("trip_assignments.trips.cancelled_at", null);
  if (error) throw error;

  return (data ?? [])
    .map((tripDriver) => {
      const assignment = tripDriver.trip_assignments;
      const trip = assignment?.trips;
      if (!trip?.id || !isAssignmentRoleActive(assignment, tripDriver.role)) {
        return null;
      }
      const isReturnLeg = assignment.leg === "return"
        && trip.trip_type === "dropoff_pickup";
      const actualMiles = trip.actual_miles;
      const estimatedMiles = trip.est_miles;
      const hasActualMiles = actualMiles !== null
        && actualMiles !== undefined
        && actualMiles !== "";
      const hasEstimatedMiles = estimatedMiles !== null
        && estimatedMiles !== undefined
        && estimatedMiles !== "";

      return {
        assignmentId: assignment.id,
        tripDriverId: tripDriver.id,
        driverId: tripDriver.driver_id,
        tripId: trip.id,
        tripRef: trip.trip_ref,
        role: tripDriver.role,
        pay: tripDriver.pay,
        startDate: isReturnLeg ? trip.return_start_date : trip.start_date,
        endDate: isReturnLeg ? trip.return_end_date : trip.end_date,
        miles: hasActualMiles
          ? actualMiles
          : hasEstimatedMiles
            ? estimatedMiles
            : null,
        milesSource: hasActualMiles
          ? "actual"
          : hasEstimatedMiles
            ? "estimated"
            : "missing",
      };
    })
    .filter(Boolean);
}

/* ── Shared driver schedule ─────────────────────────────────────────────── */

export async function fetchDriverScheduleShare(driverId) {
  const { data, error } = await supabase.rpc(
    "get_driver_schedule_share_for_driver",
    { p_driver_id: driverId },
  );
  if (error) throw error;
  return data || null;
}

export async function deactivateDriverScheduleShare(token) {
  const { data, error } = await supabase.rpc("revoke_driver_schedule_share", {
    p_token: token,
  });
  if (error) throw error;
  return Boolean(data);
}
