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
	/* Assert document order by position. The previous version sliced from the
	   dialog to the next </aside>, which the container refactor turned into a
	   62k-character capture spanning the whole workspace. */
	const dialogAt = indexHtml.indexOf('id="trip-editor-dialog"');
	const workspaceAt = indexHtml.indexOf('<section class="rux-workspace" aria-label="Weekly schedule">');
	assert.notEqual(dialogAt, -1, "trip editor dialog is missing from index.html");
	assert.notEqual(workspaceAt, -1, "the Weekly schedule workspace is missing from index.html");
	assert.ok(dialogAt < workspaceAt, "the trip dialog must precede the calendar workspace");
});

test("trip dialog controls no longer include a calendar-header opener", () => {
	assert.match(indexHtml, /const tripEditorDialogEl\s*=/);
	assert.match(indexHtml, /RuxFloatingWindow\?\.attachDrag\([\s\S]*?tripEditorDialogEl[\s\S]*?tripEditorHeaderEl/);
	assert.doesNotMatch(indexHtml, /data-opens="trip-editor-dialog"/);
	assert.doesNotMatch(indexHtml, /aria-label="Open trip editor"/);
	assert.doesNotMatch(indexHtml, /\bleftPanelToggleBtn\b/);
	assert.doesNotMatch(indexHtml, /targetId === "trip-editor-dialog"/);
	assert.doesNotMatch(indexHtml, /targetId === "trip-panel-drawer"/);
	assert.doesNotMatch(indexHtml, /\bdrawer\.classList/);
});

test("the trip editor is a draggable and resizable nonmodal workspace window", () => {
	/* Assert the dialog's own opening tag. Slicing to a closing tag is not
	   safe here: the container carries no unique terminator, so any bounded
	   capture silently swallows the rest of the document. */
	const editorMarkup = indexHtml.match(/<div[^>]*id="trip-editor-dialog"[^>]*>/)?.[0] ?? "";
	assert.notEqual(editorMarkup, "", "trip editor dialog opening tag not found");
	assert.match(editorMarkup, /role="dialog"/);
	assert.doesNotMatch(editorMarkup, /aria-modal="true"|rux-modal-backdrop/);
	/* width is owned by --sched-trip-dialog-width; assert the token wiring here
	   and the value in tokens.css, so retokenising cannot break this test. */
	assert.match(tripDialogCss, /\.sched-trip-dialog\s*\{[^}]*width:\s*var\(--sched-trip-dialog-width\)[^}]*height:\s*min\(840px[^}]*min-width:\s*480px[^}]*min-height:\s*520px/s);
	assert.match(indexHtml, /tripEditorDialogEl\.hidden = false/);
	assert.match(indexHtml, /tripEditorDialogEl\.hidden = true/);
});
