export function normalizeLocation(value = {}) {
	const lat = value.lat === "" || value.lat == null ? null : Number(value.lat);
	const lng = value.lng === "" || value.lng == null ? null : Number(value.lng);
	return {
		id: String(value.id || "").trim(),
		name: String(value.name || "").trim(),
		address: String(value.address || "").trim(),
		lat: Number.isFinite(lat) ? lat : null,
		lng: Number.isFinite(lng) ? lng : null,
		mapboxId: String(value.mapboxId || value.mapbox_id || "").trim() || null,
		createdAt: value.createdAt || null,
		updatedAt: value.updatedAt || null,
	};
}

export function locationIdentity(value = {}) {
	const location = normalizeLocation(value);
	return location.mapboxId
		? `mapbox:${location.mapboxId.toLowerCase()}`
		: `address:${location.address.toLowerCase().replace(/\s+/g, " ")}`;
}

export function sortLocations(locations = []) {
	return [...locations].sort(
		(a, b) =>
			(a.name || "").localeCompare(b.name || "") ||
			(a.address || "").localeCompare(b.address || ""),
	);
}

export function searchLocations(locations = [], query = "", limit = 5) {
	const terms = String(query || "")
		.toLowerCase()
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!terms.length) return [];
	return sortLocations(locations)
		.filter((value) => {
			const location = normalizeLocation(value);
			const haystack = `${location.name} ${location.address}`.toLowerCase();
			return terms.every((term) => haystack.includes(term));
		})
		.slice(0, limit);
}
