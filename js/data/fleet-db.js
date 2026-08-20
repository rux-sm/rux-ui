import { supabase } from "./supabase.js";

export async function fetchBuses() {
  const { data, error } = await supabase
    .from("buses")
    .select("id, bus_ref, number, sort_order, make, model, year, vin, color, capacity, type, ada_lift, sleeper, status, mileage, last_service, next_service, insurance_exp, registration_exp, inspection_exp, notes")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("number");
  if (error) throw error;
  return data ?? [];
}

export async function saveBus(bus) {
  const { id, ...fields } = bus;
  if (id) {
    const { data, error } = await supabase
      .from("buses")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("buses")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBus(id) {
  const { error } = await supabase.from("buses").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderBuses(updates) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("buses").update({ sort_order }).eq("id", id)
    )
  );
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
}

/* ── Out-of-service windows ───────────────────────────────────────────────
   A bus is unavailable for stretches, not forever — see
   supabase/bus-status-patch.sql. Both ends are required and inclusive; a bus
   that is out indefinitely is `inactive` instead. */

export async function fetchBusOutOfService(busId) {
  const { data, error } = await supabase
    .from("bus_out_of_service")
    .select("id, bus_id, start_date, end_date, reason")
    .eq("bus_id", busId)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// One query for the whole fleet — the scheduler needs every bus's windows at
// once and then looks them up per row (indexOutOfServiceByBus).
export async function fetchAllBusOutOfService() {
  const { data, error } = await supabase
    .from("bus_out_of_service")
    .select("id, bus_id, start_date, end_date, reason")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveBusOutOfService(period) {
  const { id, ...fields } = period;
  if (id) {
    const { data, error } = await supabase
      .from("bus_out_of_service")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("bus_out_of_service")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBusOutOfService(id) {
  const { error } = await supabase.from("bus_out_of_service").delete().eq("id", id);
  if (error) throw error;
}

// Replaces a bus's windows with exactly the set passed in — the vehicle form
// edits them as a list, so a save has to add, update, and remove in one go.
// Deletes first by id rather than clearing the table for this bus, so a window
// another dispatcher added while the form was open is not silently dropped.
export async function replaceBusOutOfService(busId, windows) {
  const existing = await fetchBusOutOfService(busId);
  const keptIds = new Set(windows.map((w) => w.id).filter(Boolean));
  const removed = existing.filter((w) => !keptIds.has(w.id));
  await Promise.all(removed.map((w) => deleteBusOutOfService(w.id)));
  const saved = [];
  for (const period of windows) {
    saved.push(await saveBusOutOfService({ ...period, bus_id: busId }));
  }
  return saved;
}

export async function fetchBusTrips(busId) {
  const { data, error } = await supabase
    .from("trip_assignments")
    .select(`
      leg,
      trips(trip_ref, start_date, end_date, return_start_date, return_end_date, trip_type, destination, invoice_status),
      trip_drivers(role, drivers(name))
    `)
    .eq("bus_id", busId);
  if (error) throw error;

  return (data ?? [])
    .map(ta => {
      const trip = ta.trips;
      if (!trip?.trip_ref) return null;
      const driver = ta.trip_drivers?.[0]?.drivers?.name || null;
      // Return-leg assignments run on the trip's separate return date range,
      // not its outbound start/end — only meaningful for dropoff_pickup trips.
      const isReturnLeg = ta.leg === "return" && trip.trip_type === "dropoff_pickup";
      return {
        tripRef:       trip.trip_ref,
        startDate:     isReturnLeg ? trip.return_start_date : trip.start_date,
        endDate:       isReturnLeg ? trip.return_end_date : trip.end_date,
        destination:   trip.destination,
        invoiceStatus: trip.invoice_status,
        driverName:    driver,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}
