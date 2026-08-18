import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
	new URL("../js/panels/trip-finder.js", import.meta.url),
	"utf8",
);
const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(
	new URL("../scheduler/css/features/trip-finder.css", import.meta.url),
	"utf8",
);

test("results name the contact behind the trip, not just the customer", () => {
	// Contact name and phone have always been searchable here, so a result has
	// to show which person matched — "Donna High School" alone does not.
	assert.match(page, /<th scope="col" data-col="contact">Contact<\/th>/);
	assert.match(source, /function contactNameOf\(t\)/);
	assert.match(
		source,
		/t\.booking_contact_name \|\| t\.trip_contact_1_name \|\| ""/,
	);
	assert.match(source, /<td data-col="contact">/);
});

test("every searchable contact field is indexed", () => {
	const block = source.match(/function searchTextOf\(t\)[\s\S]*?\n  \}/)[0];
	for (const field of [
		"booking_contact_name",
		"booking_contact_phone",
		"trip_contact_1_name",
		"trip_contact_1_phone",
	]) {
		assert.match(block, new RegExp(`t\\.${field}\\b`));
	}
});

test("the five columns stay a whole table", () => {
	// A column added to the header without the matching colspan leaves the
	// empty and error states short a cell.
	// Scoped to this table — Fleet and Drivers use data-col headers too.
	const table = page.match(
		/<table[^>]*sched-scope-trip-finder__table[\s\S]*?<\/table>/,
	)[0];
	const headers = table.match(/<th scope="col" data-col="[a-z]+">/g) ?? [];
	assert.deepEqual(
		headers.map((h) => h.match(/data-col="([a-z]+)"/)[1]),
		["date", "customer", "contact", "destination", "status"],
	);
	assert.doesNotMatch(source, /colspan="4"/);
	assert.equal((source.match(/colspan="5"/g) ?? []).length, 3);
});

test("customers rank after every trip and only once something is typed", () => {
	// Trips first: this is a trip finder, and a customer is the fallback answer
	// when the name typed has no trip attached.
	assert.match(source, /renderContactRows\(\);\s*\}/s);
	assert.match(source, /tr\.dataset\.kind\s*=\s*"contact"/);
	assert.match(
		source,
		/row\.hidden = !q \|\| tripOnlyFilterActive\(\) \|\| !row\.dataset\.search\.includes\(q\)/,
	);
	assert.match(source, /function tripOnlyFilterActive\(\)/);
});

test("the customers divider appears only when a customer is under it", () => {
	assert.match(
		source,
		/group\.hidden = !tbody\.querySelector\(\s*"\.sched-scope-trip-finder__contact-row:not\(\[hidden\]\)",\s*\)/s,
	);
	// It is a label, not a pickable row, and base/table.css styles every tbody
	// row as clickable — so the opt-out must carry enough specificity to win.
	assert.match(
		css,
		/\.sched-scope-trip-finder__table tbody tr\.sched-scope-trip-finder__group:hover/,
	);
});

test("a failing contacts read does not take the trip search down", () => {
	assert.match(source, /db\.fetchContacts\(\)\.catch\(/);
	assert.match(source, /customer results disabled/);
});

test("picking a customer routes through the same event bridge as a trip", () => {
	assert.match(
		source,
		/new CustomEvent\("customers:open", \{ detail: \{ contactId: contact\.id \} \}\)/,
	);
	assert.match(source, /function openCustomer\(contact\)/);
});
