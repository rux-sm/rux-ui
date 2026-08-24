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
const panel = await readFile(
	new URL("../rux-ui/css/base/panel.css", import.meta.url),
	"utf8",
);
const content = await readFile(
	new URL("../rux-ui/css/base/content.css", import.meta.url),
	"utf8",
);
const uiHeader = await readFile(
	new URL("../rux-ui/css/base/ui-header.css", import.meta.url),
	"utf8",
);

const VIEWS = [
	"calendar",
	"fleet",
	"drivers",
	"customers",
	"requests",
	"documents",
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
	// Since typography.md §3.5 step 64 workspace.css owns the type AND the box:
	// a workspace titles the page at heading-24, where a panel titles a surface
	// at 20 and a card at 16. Before that it shared card.css's heading-16 recipe
	// and so titled SMALLER than the panels nested inside it.
	const box = workspace.match(/\.rux-workspace__title\s*\{[^}]*\}/)[0];
	for (const role of [
		"--rux-text-heading-24-size",
		"--rux-text-heading-24-weight",
		"--rux-text-heading-24-line-height",
		"--rux-text-heading-24-tracking",
	]) {
		assert.match(box, new RegExp(role), `missing ${role}`);
	}
	// card.css imports AFTER workspace.css, so any rule left there would win and
	// silently undo the ladder. It must not type this class at all. Comments are
	// stripped first: card.css legitimately NAMES the class in the note recording
	// why it left, and matching prose would fail on the explanation itself.
	const cardRules = card.replace(/\/\*[\s\S]*?\*\//g, "");
	assert.doesNotMatch(
		cardRules,
		/\.rux-workspace__title[^{}]*\{[^}]*font-size/,
		"card.css must not re-type .rux-workspace__title — it imports later and would win",
	);
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

// typography.md §3.5 — the container ladder. Each rung is asserted against the
// rule that actually sets it, so a role swapped in one file fails here rather
// than being noticed on screen. §3.5 cited a test that enforced none of this
// until step 65; this is that citation made true.
test("the container ladder resolves each rung from its own source rule", () => {
	const rung = (css, selector, role) => {
		const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
		const m = rules.match(
			new RegExp(`(?:^|[\n,])\\s*\\${selector}\\s*(?:,[^{]*)?\\{[^}]*\\}`, "m"),
		);
		assert.ok(m, `${selector}: no rule found`);
		assert.match(
			m[0],
			new RegExp(`--rux-text-${role}-size`),
			`${selector} must read --rux-text-${role}-size (§3.5)`,
		);
		return m[0];
	};

	rung(uiHeader, ".rux-ui-header__title", "heading-16");
	rung(workspace, ".rux-workspace__title", "heading-24");
	rung(panel, ".rux-panel__title", "heading-20");
	rung(content, ".rux-section__title", "heading-16");
	rung(card, ".rux-card__title", "heading-16");
});

// The rule that made §3.5's first draft wrong: it described the workspace as
// titling "the page", which is the UI header's job and the opposite of what
// index.html had already stated beside the <h1>.
test("index.html points at §3.5 rather than restating the workspace rule", () => {
	const comment = page.match(/<!--[^>]*only <h1>[\s\S]*?-->/);
	assert.ok(comment, "the <h1> orientation comment is missing");
	assert.match(
		comment[0],
		/typography\.md/,
		"the comment must point at typography.md §3.5, not restate the rule",
	);
});
