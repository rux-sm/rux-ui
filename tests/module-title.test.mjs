import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const router = await readFile(
	new URL("../rux-ui/js/view-router.js", import.meta.url),
	"utf8",
);
const workspace = await readFile(
	new URL("../rux-ui/css/base/workspace.css", import.meta.url),
	"utf8",
);
const card = await readFile(
	new URL("../rux-ui/css/base/card.css", import.meta.url),
	"utf8",
);

const VIEWS = [
	"calendar",
	"fleet",
	"drivers",
	"customers",
	"requests",
	"documents",
	"components",
	"game",
	"settings",
];

// Comments discuss markup; only real elements count.
const markup = page.replace(/<!--[\s\S]*?-->/g, "");

test("the shell has exactly one h1, and it is the module title", () => {
	// The side nav is an overlay, so with it closed — which is most of the
	// time — nothing else on screen names the current module.
	const headings = markup.match(/<h1[\s>]/g) ?? [];
	assert.equal(headings.length, 1, "expected a single <h1> in the shell");
	assert.match(
		markup,
		/<h1\s+class="rux-ui-header__title"\s+id="app-module-title"\s*><\/h1>/s,
	);
});

test("no workspace title claims to be the page heading", () => {
	// A workspace heading names what is being viewed — a week, a document, a
	// sub-view — never the module, which the shell header now carries.
	for (const match of page.matchAll(/<(h\d)[^>]*class="rux-workspace__title"/g)) {
		assert.notEqual(
			match[1],
			"h1",
			"a workspace title must sit below the shell's h1",
		);
	}
});

test("the workspace title does not depend on its tag for size", () => {
	// It was an h1 and is now an h2, so its type cannot come from the element.
	// It doesn't: card.css types it with the shared panel-heading role,
	// alongside .rux-card__title and .rux-panel__title. workspace.css owns the
	// box only — a second type declaration there would be dead anyway, since
	// card.css imports later.
	const shared = card.match(
		/(?:^|\n)([^{}]*\.rux-workspace__title\s*\{[^}]*\})/,
	)[1];
	for (const role of [
		"--rux-text-heading-16-size",
		"--rux-text-heading-16-weight",
		"--rux-text-heading-16-line-height",
		"--rux-text-heading-16-tracking",
	]) {
		assert.match(shared, new RegExp(role), `missing ${role}`);
	}
	const box = workspace.match(/\.rux-workspace__title\s*\{[^}]*\}/)[0];
	assert.doesNotMatch(box, /font-size|font-weight|line-height/);
});

test("every view resolves a name for the header", () => {
	for (const view of VIEWS) {
		const control = page.match(
			new RegExp(`<button[^>]*data-view="${view}"([\\s\\S]*?)</button>`),
		);
		const labelled = control && /data-view-label/.test(control[1]);
		const named = new RegExp(`data-view="${view}"[^>]*data-view-title`).test(
			page,
		);
		assert.ok(
			labelled || named,
			`${view} has neither a marked nav label nor a data-view-title`,
		);
	}
});

test("the header title is driven by the nav, not a second copy of the name", () => {
	assert.match(page, /title:\s*"#app-module-title"/);
	assert.match(router, /control\?\.querySelector\("\[data-view-label\]"\)/);
	// Reading the nav's own label is what keeps the two from drifting; a
	// hardcoded name map in the app would not.
	assert.doesNotMatch(page, /app-module-title"\)\.textContent\s*=/);
});

test("a view with no name clears the heading rather than inheriting one", () => {
	// Assignment must be unconditional — an early return would leave the
	// previous module's name standing over an unnamed view.
	const block = router.match(/if \(titleEl\) \{[\s\S]*?\n\t\t\t\}/)[0];
	assert.match(block, /titleEl\.textContent\s*=/);
	assert.doesNotMatch(block, /if \(label\)/);
	assert.match(block, /""/, "expected an empty-string fallback");
});
