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

export async function fetchBusTrips(busId) {
  const { data, error } = await supabase
    .from("trip_assignments")
    .select(`
      trips(trip_ref, start_date, end_date, destination, invoice_status),
      trip_drivers(role, drivers(name))
    `)
    .eq("bus_id", busId);
  if (error) throw error;

  return (data ?? [])
    .map(ta => {
      const trip = ta.trips;
      if (!trip?.trip_ref) return null;
      const driver = ta.trip_drivers?.[0]?.drivers?.name || null;
      return {
        tripRef:       trip.trip_ref,
        startDate:     trip.start_date,
        endDate:       trip.end_date,
        destination:   trip.destination,
        invoiceStatus: trip.invoice_status,
        driverName:    driver,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}
