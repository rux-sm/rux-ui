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
	// The nav item routes like every other destination now.
	assert.match(page, /id="request-inbox-btn"\s*\n\s*data-view="requests"/);
	assert.match(page, /id="requests-badge"/);
	assert.match(page, /rux-side-nav__badge/);
});

test("Requests is a module view, not a floating window", () => {
	assert.match(page, /class="rux-app-view"\s*\n\s*data-view="requests"/);
	assert.match(page, /id="request-inbox-view"/);
	// The list surface is a workspace like every other module. A floating
	// frame here would put a list where this app puts single-record editors.
	assert.match(page, /rux-workspace sched-scope-request/);
	// The list is a table like every other list module; the single-record
	// detail is the floating window, which is this app's split.
	assert.match(page, /rux-table sched-scope-request__table/);
	assert.match(page, /id="request-detail-window"/);
	// Turning a request into a trip reuses the editor's own import path
	// rather than a second write path of its own.
	assert.match(page, /id="request-detail-draft-btn"/);
	assert.match(page, /window\.TripEditor\s*=\s*\{/);
	assert.match(page, /openFromDraft\(draft, title\)/);
	assert.match(page, /id="request-inbox-list"/);
	assert.match(page, /id="request-inbox-new-btn"/);
	assert.match(page, /id="request-inbox-dialog"/);
	assert.match(page, /scheduler\/css\/features\/request-inbox\.css/);
	assert.match(page, /js\/panels\/request-inbox\.js/);
});

test("the panel exposes a RequestInbox API and lazy-loads", () => {
	assert.match(panel, /window\.RequestInbox\s*=\s*\{\s*init,\s*refresh/);
	// The router owns the module view, so only the detail window is dragged.
	assert.match(panel, /attachDrag\(detailEl, detailHeader/);
	assert.doesNotMatch(panel, /attachDrag\(viewEl/);
	// Version-agnostic: the ?v= suffix is a cache-buster and moves on its own.
	assert.match(panel, /import\("\.\.\/data\/trip-request-db\.js(\?v=\d+)?"\)/);
	assert.match(panel, /loadPromise\s*=\s*null/);
});

test("inbox persistence goes through secured RPCs only", () => {
	// No direct table access — every read/write wraps a security definer
	// function, matching the share-page access model (anon never reads rows).
	for (const rpc of [
		"get_trip_request",
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
	assert.match(publicForm, /data-field="passengerCount"/);
	assert.match(publicForm, /data-switch="contact\.sameAsBooker"/);
	assert.match(publicForm, /js\/pages\/trip-request\.js/);
});
