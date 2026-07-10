import { supabase } from "./supabase.js";

export async function fetchPassengers(tripId) {
	const { data, error } = await supabase
		.from("trip_passengers")
		.select("*, trip_passenger_payments(*)")
		.eq("trip_id", tripId)
		.order("position", { ascending: true });
	if (error) throw error;
	return (data ?? []).map((p) => ({
		...p,
		payments: (p.trip_passenger_payments ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
	}));
}

export async function savePassenger(tripId, passenger) {
	const { id, payments, ...fields } = passenger;
	let saved;
	if (id) {
		const { data, error } = await supabase
			.from("trip_passengers")
			.update(fields)
			.eq("id", id)
			.select()
			.single();
		if (error) throw error;
		saved = data;
	} else {
		const { data, error } = await supabase
			.from("trip_passengers")
			.insert({ trip_id: tripId, ...fields })
			.select()
			.single();
		if (error) throw error;
		saved = data;
	}
	if (payments) await replacePassengerPayments(saved.id, payments);
	return saved;
}

export async function deletePassenger(id) {
	const { error } = await supabase.from("trip_passengers").delete().eq("id", id);
	if (error) throw error;
}

// Passenger payments are itemized (amount, method, date, ref) and replaced
// wholesale on save — same "delete all, reinsert" recipe as trip_payments.
export async function replacePassengerPayments(passengerId, payments) {
	const { error: deleteErr } = await supabase
		.from("trip_passenger_payments")
		.delete()
		.eq("passenger_id", passengerId);
	if (deleteErr) throw deleteErr;
	if (payments.length) {
		const { error: insertErr } = await supabase
			.from("trip_passenger_payments")
			.insert(payments.map((p) => ({ passenger_id: passengerId, ...p })));
		if (insertErr) throw insertErr;
	}
}

export async function fetchTicketOptions(tripId) {
	const { data, error } = await supabase
		.from("trip_ticket_options")
		.select("*")
		.eq("trip_id", tripId)
		.order("position", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

// Seats filled for the Manifest capacity summary — only meaningful once a
// bus is assigned, so an empty result just means "no capacity to show yet".
export async function fetchTripCapacity(tripId) {
	const { data, error } = await supabase
		.from("trip_assignments")
		.select("bus_id, buses(capacity)")
		.eq("trip_id", tripId);
	if (error) throw error;
	return (data ?? []).reduce((sum, a) => sum + (a.buses?.capacity || 0), 0);
}
