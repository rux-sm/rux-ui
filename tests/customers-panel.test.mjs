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
	assert.match(source, /import\("\.\.\/data\/trip-db\.js\?v=9"\)/);
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

test("browser-restored search values cannot hide a loaded roster", () => {
	assert.match(source, /let filterQuery\s*=\s*""/);
	assert.match(source, /searchInput\.value\s*=\s*""/);
	assert.match(
		source,
		/filterQuery\s*=\s*searchInput\.value\.trim\(\)\.toLowerCase\(\)/,
	);
	assert.match(source, /filterQuery \? "No matching customers\." : "No customers yet\."/);
	assert.doesNotMatch(
		source,
		/function applyFilter\(\)[^{]*\{[^}]*searchInput\?\.value/s,
	);
	assert.match(
		page,
		/id="customer-search"[^>]*name="customer-roster-filter"[^>]*autocomplete="off"[^>]*data-1p-ignore="true"[^>]*data-lpignore="true"/s,
	);
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
