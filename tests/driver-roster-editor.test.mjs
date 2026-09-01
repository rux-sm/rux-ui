import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, legacyPanel, rosterPanel] = await Promise.all([
	readFile(new URL("../index.html", import.meta.url), "utf8"),
	readFile(new URL("../js/panels/driver-panel.js", import.meta.url), "utf8"),
	readFile(new URL("../js/panels/driver-roster-panel.js", import.meta.url), "utf8"),
]);

test("the rebuilt roster declares and uses the shared driver editor", () => {
	const opening = page.match(/<div class="rux-app-view" data-view="driver-roster"[^>]*>/)?.[0] || "";
	assert.match(opening, /data-editor="shared"/);
	assert.doesNotMatch(page, /id="droster-detail"/);
	assert.match(rosterPanel, /DriverPanel\?\.openEditor\?\.\(d\.id\)/);
	assert.match(rosterPanel, /DriverPanel\?\.newEditor\?\.\(\)/);
});

test("the shared editor remains a complete mutation surface", () => {
	assert.match(legacyPanel, /document\.body\.appendChild\(dialog\)/);
	assert.match(legacyPanel, /window\.DriverPanel = \{[^}]*openEditor[^}]*newEditor[^}]*\}/);
	assert.match(legacyPanel, /db\.saveDriver\(/);
	assert.match(legacyPanel, /db\.deleteDriver\(/);
	assert.match(legacyPanel, /rux:drivers-changed/);
	assert.match(legacyPanel, /Could not save the driver\. Check your connection and try again\./);
	assert.match(legacyPanel, /Could not delete the driver\. Check your connection and try again\./);
});
