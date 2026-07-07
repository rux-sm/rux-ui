import { supabase } from "./supabase.js";

export async function fetchPassengers(tripId) {
	const { data, error } = await supabase
		.from("trip_passengers")
		.select("*")
		.eq("trip_id", tripId)
		.order("position", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export async function savePassenger(tripId, passenger) {
	const { id, ...fields } = passenger;
	if (id) {
		const { data, error } = await supabase
			.from("trip_passengers")
			.update(fields)
			.eq("id", id)
			.select()
			.single();
		if (error) throw error;
		return data;
	}
	const { data, error } = await supabase
		.from("trip_passengers")
		.insert({ trip_id: tripId, ...fields })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deletePassenger(id) {
	const { error } = await supabase.from("trip_passengers").delete().eq("id", id);
	if (error) throw error;
}
