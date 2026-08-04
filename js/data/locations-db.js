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

export async function saveLocation(value) {
	const current = await loadLocations();
	const now = new Date().toISOString();
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
	await setSetting(KEY, sortLocations(current));
	publish(current);
	return { ...saved };
}

export async function deleteLocation(id) {
	const current = await loadLocations();
	const next = current.filter((item) => item.id !== id);
	await setSetting(KEY, next);
	publish(next);
}
