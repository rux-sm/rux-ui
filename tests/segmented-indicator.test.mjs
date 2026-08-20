import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const controlsSource = await readFile(
	new URL("../rux-ui/js/controls.js", import.meta.url),
	"utf8",
);

test("segmented indicators preserve fractional geometry and the track gutter", () => {
	assert.match(controlsSource, /group\.getBoundingClientRect\(\)/);
	assert.match(controlsSource, /active\.getBoundingClientRect\(\)/);
	/* Assert the class is the selection contract, not the API used to test it
	   — controls.js identifies groups with matches()/querySelectorAll now. */
	assert.match(controlsSource, /["'.]rux-segmented-track["']/);
	assert.match(controlsSource, /maxRight - x/);
	assert.doesNotMatch(controlsSource, /active\.offset(?:Left|Top|Width|Height)/);
});

test("segmented tracks own selection, accessibility, and one change event", () => {
	assert.match(controlsSource, /function setActiveSegment\(/);
	assert.match(controlsSource, /new CustomEvent\("rux:segment-changed"/);
	assert.match(controlsSource, /previousValue: segmentedValue\(previous\)/);
	assert.match(controlsSource, /button\.tabIndex = isActive \? 0 : -1/);
	assert.match(controlsSource, /e\.key === "Home"/);
	assert.match(controlsSource, /e\.key === "End"/);
	assert.match(controlsSource, /window\.Rux\.setSegmentedValue/);
	assert.match(controlsSource, /window\.Rux\.getSegmentedValue/);
	assert.match(controlsSource, /childrenChanged.*normalizeSegmentedControl\(group\)/s);
});
