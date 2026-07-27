import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
	new URL("../js/panels/customers-panel.js", import.meta.url),
	"utf8",
);

test("customers panel owns a retryable database import", () => {
	assert.match(source, /import\("\.\.\/data\/trip-db\.js\?v=8"\)/);
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
