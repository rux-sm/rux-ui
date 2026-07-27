import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
	new URL("../js/data/trip-db.js", import.meta.url),
	"utf8",
);

test("trip saves validate a persisted contact id before reusing it", () => {
	assert.match(source, /const linkedContact = await fetchContactById\(slot\.id\)/);
	assert.match(source, /contactsShareIdentity\(linkedContact, slot\)/);
	assert.match(source, /Ignoring stale \$\{slot\.idField\} link/);
});

test("a stale or absent contact link is matched or created from visible fields", () => {
	assert.match(
		source,
		/if \(!resolved\) \{\s*resolved = await matchOrCreateContact\(\{/s,
	);
	assert.match(source, /name: slot\.name/);
	assert.match(source, /phone: slot\.phone/);
	assert.match(source, /email: slot\.email/);
	assert.match(source, /contactUpdates\[slot\.idField\] = resolved\?\.id \?\? null/);
});

test("trip contact changes notify the roster and contact failures stay visible", () => {
	assert.match(
		source,
		/window\.dispatchEvent\(new CustomEvent\("rux:contacts-changed"\)\)/,
	);
	assert.match(source, /label: contactSyncWarning \? "Saved with warning" : "Saved"/);
	assert.match(
		source,
		/Trip saved, but one or more contacts could not be added\./,
	);
});
