import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Enforces docs/foundations/composition.md §2 — the view archetypes — via the
// data-archetype declaration its step 4 added (Q3). A view that composes its
// own anatomy fails here instead of shipping; D5 recorded that nothing did.
const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

const ARCHETYPES = new Set(["records", "document-column", "canvas", "viewer"]);

// Each view runs from its opening tag to the next view's (or the file end for
// the last). Static slicing is enough: the views are siblings in one file.
const openings = [...page.matchAll(/<div\s+class="rux-app-view"[^>]*>|class="rux-app-view"[\s\S]{0,200}?>/g)];
const starts = [...page.matchAll(/class="rux-app-view"/g)].map((m) => m.index);
// The views live inside <main>; the surfaces after it — the floating manifest,
// doc viewer, modals — belong to no view. Without this bound the LAST view's
// segment ran to end-of-file and flagged Settings for windows it does not
// contain; the live-DOM census had it right and the static slice was wrong.
const viewsEnd = page.indexOf("</main>", starts[starts.length - 1]);
assert.ok(viewsEnd > 0, "views container must close with </main>");
const views = starts.map((s, i) => {
	const seg = page.slice(s, starts[i + 1] ?? viewsEnd);
	return {
		view: seg.match(/data-view="([a-z-]+)"/)?.[1],
		archetype: seg.match(/data-archetype="([a-z-]+)"/)?.[1],
		seg,
	};
});

test("every view declares a valid archetype (§2.1)", () => {
	assert.equal(views.length, 8, "eight views expected");
	for (const v of views) {
		assert.ok(v.view, "view without data-view");
		assert.ok(v.archetype, `${v.view}: no data-archetype`);
		assert.ok(ARCHETYPES.has(v.archetype), `${v.view}: unknown archetype ${v.archetype}`);
	}
});

test("only a viewer titles its workspace (§2.2, typography.md §3.5)", () => {
	for (const v of views) {
		const titled = v.seg.includes("rux-workspace__title");
		if (v.archetype === "viewer") {
			assert.ok(titled, `${v.view}: a viewer names the record it renders`);
		} else {
			assert.ok(!titled, `${v.view}: a ${v.archetype} view must not carry a workspace title`);
		}
	}
});

test("records views hold a table and a floating editor (§2.3)", () => {
	for (const v of views.filter((x) => x.archetype === "records")) {
		assert.ok(/<table/.test(v.seg), `${v.view}: records without a table`);
		assert.ok(v.seg.includes("rux-panel--floating"), `${v.view}: records without a floating editor`);
	}
});

test("a document column has no header band, no floating window, no attached panel (§2.4)", () => {
	// The attached-panel half waited for D7: while the game's main surface wore
	// .rux-panel--attached, asserting it needed an exception list. Step 5's
	// re-dress removed the last false positive, so the check is now whole.
	for (const v of views.filter((x) => x.archetype === "document-column")) {
		assert.ok(!v.seg.includes("rux-workspace__header"), `${v.view}: document column with a header band`);
		assert.ok(!v.seg.includes("rux-panel--floating"), `${v.view}: document column with a floating window`);
		assert.ok(!v.seg.includes("rux-panel--attached"), `${v.view}: document column with an attached panel`);
	}
});
