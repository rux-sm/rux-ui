import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile(
	new URL("../js/panels/request-inbox.js", import.meta.url),
	"utf8",
);
const db = await readFile(
	new URL("../js/data/trip-request-db.js", import.meta.url),
	"utf8",
);
const page = await readFile(
	new URL("../index.html", import.meta.url),
	"utf8",
);
const publicForm = await readFile(
	new URL("../request.html", import.meta.url),
	"utf8",
);

test("the Requests nav item is wired and badge-aware", () => {
	assert.match(page, /id="request-inbox-btn"/);
	assert.match(page, /data-module/); // nav still uses the module bus
	assert.match(page, /id="requests-badge"/);
	assert.match(page, /rux-side-nav__badge/);
});

test("the floating window + dialog + script/css are present", () => {
	assert.match(page, /id="request-inbox-window"/);
	assert.match(page, /id="request-inbox-list"/);
	assert.match(page, /id="request-inbox-new-btn"/);
	assert.match(page, /id="request-inbox-dialog"/);
	assert.match(page, /scheduler\/css\/features\/request-inbox\.css/);
	assert.match(page, /js\/panels\/request-inbox\.js/);
});

test("the panel exposes a RequestInbox API and lazy-loads", () => {
	assert.match(panel, /window\.RequestInbox\s*=\s*\{\s*open,\s*close,\s*refresh/);
	assert.match(panel, /import\("\.\.\/data\/trip-request-db\.js\?v=1"\)/);
	assert.match(panel, /loadPromise\s*=\s*null/);
});

test("inbox persistence goes through secured RPCs only", () => {
	// No direct table access — every read/write wraps a security definer
	// function, matching the share-page access model (anon never reads rows).
	for (const rpc of [
		"create_trip_request",
		"submit_trip_request",
		"list_trip_requests",
		"update_trip_request_status",
		"link_trip_request",
	]) {
		assert.match(db, new RegExp(`rpc\\("${rpc}"`));
	}
	assert.doesNotMatch(db, /\.from\("trip_requests"\./);
});

test("the public form page collects the trip fields and submits a draft", () => {
	assert.match(publicForm, /id="trip-request-form"/);
	assert.match(publicForm, /data-field="destination"/);
	assert.match(publicForm, /data-field="pickup\.date"/);
	assert.match(publicForm, /data-req="adaLift"/);
	assert.match(publicForm, /data-switch="contact\.sameAsBooker"/);
	assert.match(publicForm, /js\/pages\/trip-request\.js/);
});
