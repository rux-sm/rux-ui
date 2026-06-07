import { supabase } from "./supabase.js";

export async function fetchDrivers() {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, driver_ref, name, short_name, email, phone, address, city, address_state, zip, hire_date, cdl_class, license_number, license_state, license_exp, med_card_expiry, endorsements, status, notes")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function saveDriver(driver) {
  const { id, ...fields } = driver;
  if (id) {
    const { data, error } = await supabase
      .from("drivers")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("drivers")
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDriver(id) {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
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
