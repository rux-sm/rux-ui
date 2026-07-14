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
