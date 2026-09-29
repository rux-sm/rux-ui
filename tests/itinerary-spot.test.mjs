/* The itinerary's spot: the bus arrives the office's `route-times-v1` spot
 * minutes before the group departs, as Settings publishes them, and a trip's
 * opening copy built with `stopsFor` matches what the form gives, so trip-db
 * can take it again when the minutes arrive after the trip opened. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../js/components/itinerary.js", import.meta.url), "utf8");

// Just enough of a page for the tab: each element keeps its markup and value.
function element(id = "") {
	return {
		id, value: "", innerHTML: "", hidden: false, parentNode: { insertBefore() {} },
		querySelector: () => null, querySelectorAll: () => [],
		addEventListener() {}, setAttribute() {}, classList: { toggle() {} },
	};
}

function load(spotMins) {
	const listeners = {};
	const els = Object.fromEntries(["tp-itin-summary", "tp-itin-stops", "tp-start", "tp-end", "tp-destination"]
		.map((id) => [id, element(id)]));
	els["tp-start"].value = "2026-10-02";
	els["tp-end"].value = "2026-10-02";
	const root = { querySelector: (sel) => els[sel.replace(/^#/, "")] || null };
	const window = {
		RuxSettings: { getSpotPadding: () => spotMins.value },
		TripPanel: { getTripType: () => "round_trip" },
	};
	const document = {
		addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
		dispatch: (type) => (listeners[type] || []).forEach((fn) => fn()),
	};
	vm.runInNewContext(source, { window, document, crypto: { randomUUID: () => "id" }, console, URL });
	const api = window.Itinerary.init(root);
	return { api, document, times: els["tp-itin-summary"] };
}

const stored = [
	{ type: "pickup", name: "School", address: "1 Main St", drive: "0:30", miles: "12", spot: "07:45", departPrev: "07:15" },
	{ type: "stop", name: "Museum", address: "", departPrev: "08:00" },
	{ type: "return", name: "Yard", address: "2801 Zinnia Ave", drive: "0:30", departPrev: "15:00", arrive: "15:30" },
];

test("the spot is the group's departure less the office's spot minutes", () => {
	const spot = { value: 20 };
	const { api } = load(spot);
	api.setStops(stored, "outbound");
	const pickup = api.getStops("outbound")[0];
	assert.equal(pickup.spot, "07:40");
	assert.equal(pickup.departPrev, "07:10", "the yard departure follows the spot");
});

test("minutes arriving late redraw Bus arrives", () => {
	const spot = { value: 15 };
	const { api, document, times } = load(spot);
	api.setStops(stored, "outbound");
	assert.match(times.innerHTML, /15 min before the group leaves/);
	spot.value = 25;
	document.dispatch("settings:spot-padding");
	assert.match(times.innerHTML, /25 min before the group leaves/);
});

test("stopsFor gives the rows the form gives for the same stored stops", () => {
	const spot = { value: 25 };
	const { api } = load(spot);
	api.setStops(stored, "outbound");
	assert.deepEqual(api.stopsFor(stored, "outbound"), api.getStops("outbound"));
});
