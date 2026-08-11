import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexHtml = readFileSync(
	new URL("../index.html", import.meta.url),
	"utf8",
);

test("the inline application module parses before splash removal", () => {
	const inlineModule = indexHtml.match(
		/<script type="module">\s*([\s\S]*?)\s*<\/script>/,
	)?.[1];
	assert.ok(inlineModule, "expected an inline application module");

	const result = spawnSync(
		process.execPath,
		["--input-type=module", "--check"],
		{
			input: inlineModule,
			encoding: "utf8",
		},
	);

	assert.equal(result.status, 0, result.stderr);
});

test("the calendar retains its workspace after the trip dialog", () => {
	assert.match(
		indexHtml,
		/id="trip-editor-dialog"[\s\S]*?<\/aside>[\s\S]*?class="rux-workspace"[\s\S]*?aria-label="Weekly schedule"/,
	);
});

test("trip dialog controls no longer reference the removed left drawer", () => {
	assert.match(indexHtml, /const tripEditorDialogEl\s*=/);
	assert.match(indexHtml, /targetId === "trip-editor-dialog"/);
	assert.doesNotMatch(indexHtml, /targetId === "trip-panel-drawer"/);
	assert.doesNotMatch(indexHtml, /\bdrawer\.classList/);
});
