import { supabase } from "./supabase.js";

export async function fetchDrivers() {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, driver_ref, name, short_name, email, phone, address, city, address_state, zip, date_of_birth, hire_date, cdl_class, license_number, license_state, license_exp, med_card_expiry, endorsements, status, employment_type, emergency_contact_name, emergency_contact_phone, notes, sort_order, photo_path")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw error;
  return data ?? [];
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

export function getDriverPhotoUrl(photoPath) {
  if (!photoPath) return null;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath);
  return data?.publicUrl || null;
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
        trips(trip_ref, start_date, end_date, destination, invoice_status),
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
      return {
        tripRef:       trip.trip_ref,
        startDate:     trip.start_date,
        endDate:       trip.end_date,
        destination:   trip.destination,
        invoiceStatus: trip.invoice_status,
        busNumber:     ta.buses?.number,
        role:          td.role,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}
