import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const itinerarySource = await readFile(
	new URL("../js/components/itinerary.js", import.meta.url),
	"utf8",
);

test("itinerary segmented controls use the shared component contract", () => {
	assert.match(itinerarySource, /data-rux-segmented data-itinerary-segment="origin-mode"/);
	assert.match(itinerarySource, /data-rux-segmented data-itinerary-segment="dwell-status"/);
	assert.match(itinerarySource, /addEventListener\("rux:segment-changed"/);
	assert.match(itinerarySource, /e\.detail\.value/);
	assert.doesNotMatch(itinerarySource, /data-dwell-status=/);
	assert.doesNotMatch(itinerarySource, /data-origin-mode=/);
});

test("segment changes patch dependent itinerary regions without rebuilding the stop list", () => {
	const handler = itinerarySource.match(
		/stopsEl\.addEventListener\("rux:segment-changed",[\s\S]*?\n\t\t\}\);/,
	)?.[0] || "";
	assert.ok(handler, "expected the itinerary segment-change handler");
	assert.match(handler, /syncDwellSummaryCard/);
	assert.match(handler, /syncOriginModeUi/);
	assert.match(handler, /syncDaySummaryCards/);
	assert.doesNotMatch(handler, /renderStopList\(\)/);
});
