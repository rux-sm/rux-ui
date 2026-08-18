import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
	new URL("../js/panels/customers-panel.js", import.meta.url),
	"utf8",
);
const page = await readFile(
	new URL("../index.html", import.meta.url),
	"utf8",
);

test("customers panel owns a retryable database import", () => {
	assert.match(source, /import\("\.\.\/data\/trip-db\.js\?v=\d+"\)/);
	assert.match(source, /contactsDbPromise\s*=\s*null/);
	assert.match(source, /contactsDbPromise\s*=\s*import\([^)]*\)\.catch/);
	assert.doesNotMatch(source, /for\s*\(let i = 0; i < 20/);
	assert.doesNotMatch(source, /window\.RuxContacts\.(?:fetch|upsert|delete)/);
});

test("customer loading is deduplicated and only succeeds after fetch", () => {
	assert.match(source, /if \(loadPromise\) return loadPromise/);
	assert.match(source, /allContacts\s*=\s*await db\.fetchContacts\(\);\s*loaded\s*=\s*true/s);
	assert.match(source, /catch \(err\) \{\s*loaded\s*=\s*false/s);
	assert.match(source, /loadPromise\s*=\s*null/);
});

test("customer loading exposes complete loading and retry states", () => {
	assert.match(source, /renderRosterState\("Loading customers…"\)/);
	assert.match(source, /cell\.colSpan\s*=\s*4/);
	assert.match(source, /Customers could not be loaded\./);
	assert.match(source, /retryButton\.textContent\s*=\s*"Retry"/);
	assert.match(source, /loadCustomers\(\{ force: true \}\)/);
});

test("direct customer routes initialize without waiting for scheduler startup", () => {
	assert.match(
		source,
		/location\.hash\.slice\(1\)\.split\("\/"\)\[0\]\s*===\s*"customers"/,
	);
	assert.match(source, /void init\(\)/);
});

// Replaces "browser-restored search values cannot hide a loaded roster". That
// test guarded a module-local search field against password managers
// autofilling it and filtering the roster down to nothing. The field is gone —
// finding a customer is the global search's job — so the invariant it was
// protecting now holds structurally: there is no filter left to hide behind.
test("the roster renders every customer, with no filter to hide behind", () => {
	assert.doesNotMatch(page, /id="customer-search"/);
	assert.doesNotMatch(page, /name="customer-roster-filter"/);
	assert.doesNotMatch(source, /searchInput/);
	assert.doesNotMatch(source, /filterQuery/);
	assert.match(source, /function renderRoster\(\)\s*\{\s*renderRows\(allContacts\);\s*\}/s);
});

test("the global search can open one customer record", () => {
	// The finder knows which record was picked but not how to navigate, so it
	// fires an event that index.html — which owns showModule — routes.
	assert.match(source, /async function openContact\(contactId\)/);
	assert.match(source, /window\.CustomersPanel\s*=\s*\{[^}]*\bopenContact\b/s);
	// A stale id, a failed roster load, or a declined unsaved-changes prompt
	// must all back out rather than open a half-populated editor.
	assert.match(source, /if \(!\(await loadCustomers\(\)\)\) return false/);
	assert.match(source, /if \(!contact\) return false/);
	assert.match(source, /if \(!closeDialog\(\)\) return false/);
	assert.match(page, /document\.addEventListener\("customers:open"/);
	assert.match(page, /showModule\("customers"\)/);
	assert.match(page, /window\.CustomersPanel\?\.openContact\(contactId\)/);
});

test("save and delete distinguish persistence from list refresh", () => {
	assert.match(source, /const refreshed\s*=\s*await loadCustomers\(\{ force: true \}\)/);
	assert.match(source, /"Customer saved"/);
	assert.match(source, /"Customer saved\. Retry the list refresh to see it\."/);
	assert.match(source, /"Customer deleted"/);
});

test("trip-created contacts invalidate and refresh the mounted roster", () => {
	assert.match(
		source,
		/window\.addEventListener\("rux:contacts-changed",\s*\(\)\s*=>\s*\{/,
	);
	assert.match(
		source,
		/const pendingLoad\s*=\s*loadPromise/,
	);
	assert.match(
		source,
		/pendingLoad\.finally\(\(\) => \{\s*loaded\s*=\s*false;\s*void loadCustomers\(\{ force: true \}\)/s,
	);
	assert.match(
		source,
		/return;\s*\}\s*void loadCustomers\(\{ force: true \}\)/s,
	);
});
