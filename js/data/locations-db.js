import { supabase } from "./supabase.js";
import {
	locationIdentity,
	normalizeLocation,
	searchLocations as filterLocations,
	sortLocations,
} from "../core/locations.js";

/* Saved locations live in the `locations` table, which the scheduler's
   Locations page also reads and writes. Each place is its own row, so a write
   changes that row alone and cannot drop a place someone else added. Trip
   saves no longer add their stops here: a place joins the list from Settings
   or from the scheduler, where someone says so. */
const COLUMNS = "id,name,address,lat,lng,mapbox_id,created_at,updated_at";

let cache = null;

const fromRow = (row) => normalizeLocation({
	id: row.id,
	name: row.name,
	address: row.address,
	lat: row.lat,
	lng: row.lng,
	mapboxId: row.mapbox_id,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

function publish(locations) {
	cache = sortLocations(locations.filter((item) => item.id && item.name && item.address));
	document.dispatchEvent(
		new CustomEvent("locations:changed", {
			detail: { locations: cache.map((item) => ({ ...item })) },
		}),
	);
	return cache;
}

export async function loadLocations({ refresh = false } = {}) {
	if (!refresh && cache) return cache.map((item) => ({ ...item }));
	const { data, error } = await supabase.from("locations").select(COLUMNS).order("name");
	if (error) throw error;
	return publish((data || []).map(fromRow)).map((item) => ({ ...item }));
}

export async function searchLocations(query, limit = 5) {
	const locations = await loadLocations();
	return filterLocations(locations, query, limit).map((item) => ({ ...item }));
}

/* One place, added or changed. A place already saved under the same Mapbox id,
   or the same address when it has none, is changed rather than added twice. */
export async function saveLocation(value) {
	const next = normalizeLocation(value);
	if (!next.name) throw new Error("Location name is required.");
	if (!next.address) throw new Error("Location address is required.");
	if (next.lat == null || next.lng == null) {
		throw new Error("Verify the address before saving the location.");
	}
	const current = await loadLocations({ refresh: true });
	const identity = locationIdentity(next);
	const existing = current.find(
		(item) => (next.id && item.id === next.id) || locationIdentity(item) === identity,
	);
	const row = {
		name: next.name,
		address: next.address,
		lat: next.lat,
		lng: next.lng,
		mapbox_id: next.mapboxId,
	};
	const query = existing
		? supabase.from("locations").update(row).eq("id", existing.id)
		: supabase.from("locations").insert(row);
	const { data, error } = await query.select(COLUMNS).single();
	if (error) throw error;
	await loadLocations({ refresh: true });
	return fromRow(data);
}

export async function deleteLocation(id) {
	const { error } = await supabase.from("locations").delete().eq("id", id);
	if (error) throw error;
	await loadLocations({ refresh: true });
}
