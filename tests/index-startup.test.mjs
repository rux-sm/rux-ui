import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexHtml = readFileSync(
	new URL("../index.html", import.meta.url),
	"utf8",
);
const tripDialogCss = readFileSync(
	new URL("../scheduler/css/features/trip-dialog.css", import.meta.url),
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
		/class="rux-floating-window rux-trip-dialog"[\s\S]*?id="trip-editor-dialog"[\s\S]*?<\/aside>[\s\S]*?class="rux-workspace"[\s\S]*?aria-label="Weekly schedule"/,
	);
});

test("trip dialog controls no longer reference the removed left drawer", () => {
	assert.match(indexHtml, /const tripEditorDialogEl\s*=/);
	assert.match(indexHtml, /RuxFloatingWindow\?\.attachDrag\([\s\S]*?tripEditorDialogEl[\s\S]*?tripEditorHeaderEl/);
	assert.match(indexHtml, /targetId === "trip-editor-dialog"/);
	assert.doesNotMatch(indexHtml, /targetId === "trip-panel-drawer"/);
	assert.doesNotMatch(indexHtml, /\bdrawer\.classList/);
});

test("the trip editor is a draggable and resizable nonmodal workspace window", () => {
	const editorMarkup = indexHtml.match(
		/<div\s+class="rux-floating-window rux-trip-dialog"[\s\S]*?<\/aside>\s*<\/div>/,
	)?.[0] ?? "";
	assert.match(editorMarkup, /role="dialog"/);
	assert.doesNotMatch(editorMarkup, /aria-modal="true"|rux-modal-backdrop/);
	assert.match(tripDialogCss, /\.rux-trip-dialog\s*\{[^}]*width:\s*min\(640px[^}]*height:\s*min\(840px[^}]*min-width:\s*480px[^}]*min-height:\s*520px/s);
	assert.match(indexHtml, /tripEditorDialogEl\.hidden = false/);
	assert.match(indexHtml, /tripEditorDialogEl\.hidden = true/);
});
