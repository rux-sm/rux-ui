import { getSetting, setSetting } from "./settings-db.js";
import {
	locationIdentity,
	normalizeLocation,
	searchLocations as filterLocations,
	sortLocations,
} from "../core/locations.js";

const KEY = "locations-v1";
let cache = null;

function newId() {
	return globalThis.crypto?.randomUUID?.()
		|| `location-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function publish(locations) {
	cache = sortLocations(locations.map(normalizeLocation).filter((item) => item.id && item.name && item.address));
	document.dispatchEvent(
		new CustomEvent("locations:changed", {
			detail: { locations: cache.map((item) => ({ ...item })) },
		}),
	);
	return cache;
}

export async function loadLocations({ refresh = false } = {}) {
	if (!refresh && cache) return cache.map((item) => ({ ...item }));
	const saved = await getSetting(KEY);
	return publish(Array.isArray(saved) ? saved : []).map((item) => ({ ...item }));
}

export async function searchLocations(query, limit = 5) {
	const locations = await loadLocations();
	return filterLocations(locations, query, limit).map((item) => ({ ...item }));
}

/* Merge one value into `current` IN PLACE and return the stored entry. Split
   out of saveLocation so a bulk write can reuse it without doing a
   read-modify-write per item. Throws on anything unverified. */
function mergeLocation(current, value, now) {
	const next = normalizeLocation(value);
	if (!next.name) throw new Error("Location name is required.");
	if (!next.address) throw new Error("Location address is required.");
	if (next.lat == null || next.lng == null) {
		throw new Error("Verify the address before saving the location.");
	}

	const identity = locationIdentity(next);
	const existingIndex = current.findIndex(
		(item) =>
			(next.id && item.id === next.id) ||
			locationIdentity(item) === identity,
	);
	const existing = existingIndex >= 0 ? current[existingIndex] : null;
	const saved = {
		...next,
		id: existing?.id || next.id || newId(),
		createdAt: existing?.createdAt || next.createdAt || now,
		updatedAt: now,
	};
	if (existingIndex >= 0) current.splice(existingIndex, 1, saved);
	else current.push(saved);
	return saved;
}

/* Every write here is a read-modify-write of ONE shared blob: the whole list
   lives in settings/locations-v1 and is upserted whole, and this client is
   anon, so it is one list for everybody. Reading the in-memory cache meant a
   write could be based on a list fetched at page load and silently drop
   additions made since. `refresh: true` does not make the write atomic --
   nothing can, while the list is a single row -- but it narrows the window
   from "stale since page load" to "stale since a moment ago". */
export async function saveLocation(value) {
	const current = await loadLocations({ refresh: true });
	const saved = mergeLocation(current, value, new Date().toISOString());
	await setSetting(KEY, sortLocations(current));
	publish(current);
	return { ...saved };
}

/* Saving a trip calls this with all of its verified stops at once. Looping
   saveLocation would do one read-modify-write of the entire shared blob per
   stop -- N round-trips and N chances to lose a concurrent write -- where this
   does one of each however many stops the trip has.

   Invalid entries are skipped rather than thrown: this runs as a side effect
   of saving a trip, and a stop whose address was never geocoded must not turn
   a successful trip save into a failed one. */
export async function saveLocations(values) {
	const current = await loadLocations({ refresh: true });
	const now = new Date().toISOString();
	const saved = [];
	for (const value of values) {
		try {
			saved.push(mergeLocation(current, value, now));
		} catch {
			/* unverified or incomplete — skip it */
		}
	}
	if (!saved.length) return [];
	await setSetting(KEY, sortLocations(current));
	publish(current);
	return saved.map((item) => ({ ...item }));
}

export async function deleteLocation(id) {
	const current = await loadLocations({ refresh: true });
	const next = current.filter((item) => item.id !== id);
	await setSetting(KEY, next);
	publish(next);
}
