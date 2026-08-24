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

test("the workspace title class is retired (typography.md step 66)", () => {
	// Class C, 2026-08-23: the last wearer retired with the Documents records
	// table. The class must not reappear in markup, and no stylesheet may
	// re-type it — comments are stripped first, since the tombstone notes
	// legitimately NAME the class while recording where it went.
	assert.ok(!page.includes('class="rux-workspace__title"'), "index.html must not wear the retired class");
	for (const [name, css] of [["workspace.css", workspace], ["card.css", card]]) {
		const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
		assert.ok(!/\.rux-workspace__title\s*[,{]/.test(rules), `${name} must not define the retired class`);
	}
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
	// No workspace rung to assert: §3.5 keeps heading-24 published as what a
	// workspace title costs if one returns, but the class was removed at
	// step 66 and there is no source rule to hold to it.
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
