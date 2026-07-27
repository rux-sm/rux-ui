import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const envelopeSource = await readFile(
	new URL("../js/panels/trip-envelope.js", import.meta.url),
	"utf8",
);
const driverShareSource = await readFile(
	new URL("../js/pages/driver-share.js", import.meta.url),
	"utf8",
);
const pageSource = await readFile(
	new URL("../index.html", import.meta.url),
	"utf8",
);
const driverPageSource = await readFile(
	new URL("../d.html", import.meta.url),
	"utf8",
);
const envelopeStyles = await readFile(
	new URL("../css/features/trip-envelope.css", import.meta.url),
	"utf8",
);

test("trip envelopes prefer operational trip contacts over booking contacts", () => {
	assert.match(
		envelopeSource,
		/function contactFor\(trip\) \{\s*const primary = trip\.tripContact;\s*if \(primary\?\.name \|\| primary\?\.phone\) return primary;\s*const secondary = trip\.tripContact2;\s*if \(secondary\?\.name \|\| secondary\?\.phone\) return secondary;\s*return trip\.bookingContact \|\| \{\};\s*\}/s,
	);
});

test("every driver envelope entry point supplies the secondary trip contact", () => {
	assert.match(
		driverShareSource,
		/tripContact2:\s*\{\s*name: entry\.trip\.trip_contact_2_name \|\| "",\s*phone: entry\.trip\.trip_contact_2_phone \|\| "",\s*\}/s,
	);
});

test("the scheduler loads the updated envelope implementation", () => {
	assert.match(pageSource, /trip-envelope\.js\?v=13/);
});

test("standard envelope field rows share one equal-height track size", () => {
	assert.match(
		envelopeStyles,
		/--rux-trip-envelope-field-row-min-height:\s*46px/,
	);
	assert.match(
		envelopeStyles,
		/\.rux-trip-envelope--standard \.rux-trip-envelope__grid\s*\{[^}]*display:\s*grid;[^}]*grid-auto-rows:\s*minmax\(\s*var\(--rux-trip-envelope-field-row-min-height\),\s*1fr\s*\);[^}]*align-items:\s*stretch;/s,
	);
});

test("both scheduler and driver pages load the equal-height envelope styles", () => {
	assert.match(pageSource, /trip-envelope\.css\?v=11/);
	assert.match(driverPageSource, /trip-envelope\.css\?v=11/);
});
