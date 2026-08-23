import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	locationIdentity,
	normalizeLocation,
	searchLocations,
} from "../js/core/locations.js";

const locations = [
	{
		id: "casino",
		name: "Paragon Casino",
		address: "711 Paragon Place, Marksville, LA 71351",
		lat: 31.112,
		lng: -92.067,
	},
	{
		id: "convention",
		name: "McAllen Convention Center",
		address: "700 Convention Center Blvd, McAllen, TX 78501",
		lat: 26.198,
		lng: -98.259,
	},
];

test("saved locations match names and address terms", () => {
	assert.equal(searchLocations(locations, "paragon")[0].id, "casino");
	assert.equal(searchLocations(locations, "mcallen 700")[0].id, "convention");
});

test("saved location matching requires every search term", () => {
	assert.deepEqual(searchLocations(locations, "paragon mcallen"), []);
});

test("location coordinates normalize without accepting invalid numbers", () => {
	assert.equal(normalizeLocation({ lat: "26.1", lng: "bad" }).lat, 26.1);
	assert.equal(normalizeLocation({ lat: "26.1", lng: "bad" }).lng, null);
});

test("Mapbox ids provide a stable deduplication identity", () => {
	assert.equal(
		locationIdentity({ mapboxId: "abc", address: "Old address" }),
		locationIdentity({ mapboxId: "ABC", address: "New address" }),
	);
});

test("Configuration owns the directory and itinerary searches it before Mapbox", () => {
	const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
	const itinerary = readFileSync(
		new URL("../js/components/itinerary.js", import.meta.url),
		"utf8",
	);
	assert.match(html, /id="settings-locations-title"/);
	assert.match(html, /id="settings-locations-list"/);
	assert.ok(
		itinerary.indexOf("await savedLocationSuggestions(q)") <
			itinerary.indexOf('new URL("https:\/\/api.mapbox.com\/search\/searchbox\/v1\/suggest")'),
	);
	/* The directory is still fed from the itinerary flow, but by saving the
	   trip rather than by a per-suggestion bookmark button: that button was
	   never an independent action -- it selected the address AND remembered
	   it -- so the decision moved to the point where the trip is committed.
	   itinerary.js now only reads the directory. */
	assert.doesNotMatch(itinerary, /data-save-suggestion-idx/);
	const tripDb = readFileSync(
		new URL("../js/data/trip-db.js", import.meta.url),
		"utf8",
	);
	assert.match(tripDb, /saveLocations\(stopLocations\)/);
	/* After the stops are written, never before: it is a side effect and must
	   not be able to fail a trip save. */
	assert.ok(
		tripDb.indexOf('from("trip_stops").insert') <
			tripDb.indexOf("saveLocations(stopLocations)"),
	);
});

test("every write to the shared locations blob re-reads the server first", () => {
	/* The whole directory is one row (settings/locations-v1) upserted whole,
	   and the client is anon, so it is one list for everybody. A write built
	   on the in-memory cache silently drops additions made since page load --
	   which auto-saving on every trip save would hit routinely. */
	const db = readFileSync(
		new URL("../js/data/locations-db.js", import.meta.url),
		"utf8",
	);
	const writers = db.match(
		/export async function (?:saveLocation|saveLocations|deleteLocation)\b[\s\S]*?\n\}/g,
	) || [];
	assert.equal(writers.length, 3);
	for (const fn of writers) {
		assert.match(fn, /loadLocations\(\{ refresh: true \}\)/);
	}
});
