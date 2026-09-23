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
	/* A trip save no longer adds its stops to the directory: a place joins it
	   from Settings or from the scheduler, where someone says so. */
	const tripDb = readFileSync(
		new URL("../js/data/trip-db.js", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(tripDb, /locations-db\.js/);
});

test("saved locations are rows of the locations table, not a settings blob", () => {
	/* Each place is its own row, which the scheduler's Locations page also
	   writes, so a write changes one row and cannot drop another person's. */
	const db = readFileSync(
		new URL("../js/data/locations-db.js", import.meta.url),
		"utf8",
	);
	assert.match(db, /from\("locations"\)/);
	assert.doesNotMatch(db, /settings-db|locations-v1/);
});
