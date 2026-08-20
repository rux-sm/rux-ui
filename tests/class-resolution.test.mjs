/* Every .rux-* class that ships in markup or is written by JS must resolve to a
 * rule in some stylesheet.
 *
 * This closes the blind spot CLAUDE.md names: "the test suite does not cover
 * HTML class attributes or JS selectors, so a class with no CSS left can still
 * be a live query hook." Nothing else in the suite reads a class attribute
 * systematically, so a rename that misses one page fails silently — the class
 * simply stops matching and the element renders unstyled. That is exactly what
 * happened to request.html during the audit's Phase 3 rename program, and this
 * test is what caught it.
 *
 * Deliberately one-directional: it flags used-but-undefined, never
 * defined-but-unused. A design system ships components before consumers adopt
 * them, and docs/portability-audit.md step 16 already adjudicates orphan
 * removal against the vendored consumers' inventory.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/* Classes that intentionally have no rule and are not markup either — a JS
 * query hook, or a name a consumer applies. Each needs a reason. Empty is the
 * goal: prefer declaring an empty-on-purpose rule (see .rux-button__label in
 * base/controls.css) so the contract is visible in the stylesheet. */
const ACCEPTED_UNRESOLVED = new Map([]);

/* ── Census: every .rux-* class a stylesheet defines ─────────────────────── */

const cssFiles = [];
const walkCss = (dir, prefix) => {
	for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
		if (entry.isDirectory()) walkCss(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
		else if (entry.name.endsWith(".css")) cssFiles.push(`${prefix}${entry.name}`);
	}
};
walkCss(new URL("rux-ui/css/", root), "rux-ui/css/");
walkCss(new URL("scheduler/css/", root), "scheduler/css/");

const defined = new Set();
for (const path of cssFiles) {
	// Blank out declaration bodies first, so a var(--rux-…) read or a content
	// string can never be mistaken for a selector.
	const selectors = stripComments(read(path)).replace(/\{[^{}]*\}/g, "{}");
	for (const [, cls] of selectors.matchAll(/\.(rux-[A-Za-z0-9_-]+)/g)) defined.add(cls);
}

/* ── Census: every .rux-* class that ships ───────────────────────────────── */

const used = new Map();
const note = (cls, where) => {
	if (!used.has(cls)) used.set(cls, new Set());
	used.get(cls).add(where);
};
const noteAttr = (value, where) => {
	for (const token of value.split(/\s+/)) {
		if (token.startsWith("rux-")) note(token, where);
	}
};

const pages = [
	"index.html", "driver.html", "gallery.html", "request.html",
	"maintenance.html", "doc.html", "examples/app-layout.html",
].filter((page) => existsSync(new URL(page, root)));

for (const page of pages) {
	for (const [, value] of read(page).matchAll(/class="([^"]*)"/g)) noteAttr(value, page);
}

const jsFiles = [];
const walkJs = (dir, prefix) => {
	for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
		if (entry.isDirectory()) walkJs(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
		else if (entry.name.endsWith(".js")) jsFiles.push(`${prefix}${entry.name}`);
	}
};
walkJs(new URL("js/", root), "js/");
walkJs(new URL("rux-ui/js/", root), "rux-ui/js/");

for (const path of jsFiles) {
	const source = read(path);
	// Markup built in template literals. Values containing an interpolation are
	// skipped: the class list is not statically knowable, and a partial match
	// would report a fragment rather than a class.
	for (const [, value] of source.matchAll(/class="([^"$`]*)"/g)) noteAttr(value, path);
	for (const [, value] of source.matchAll(/className\s*=\s*["']([^"'`]*)["']/g)) noteAttr(value, path);
	for (const [, cls] of source.matchAll(
		/classList\.(?:add|remove|toggle|contains)\(\s*["']([^"']+)["']/g,
	)) {
		if (cls.startsWith("rux-")) note(cls, path);
	}
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

test("the censuses are large enough to be meaningful", () => {
	// A regex that silently stops matching would make every test below pass
	// vacuously, which is the failure mode this whole file exists to prevent.
	assert.ok(defined.size > 200, `only ${defined.size} .rux-* classes found in CSS`);
	assert.ok(used.size > 200, `only ${used.size} .rux-* classes found in markup and JS`);
});

test("every .rux-* class in markup or JS resolves to a rule", () => {
	const unresolved = [...used.keys()]
		.filter((cls) => !defined.has(cls) && !ACCEPTED_UNRESOLVED.has(cls))
		.sort()
		.map((cls) => `${cls}  (${[...used.get(cls)].sort().join(", ")})`);

	assert.deepEqual(
		unresolved,
		[],
		`These .rux-* classes ship but no stylesheet defines them. Either the name is ` +
			`stale — a rename that missed a file — or the class is a deliberate contract, ` +
			`in which case declare an empty-on-purpose rule for it the way ` +
			`base/controls.css declares .rux-button__label.`,
	);
});

test("accepted-unresolved entries stay honest", () => {
	for (const [cls, reason] of ACCEPTED_UNRESOLVED) {
		assert.ok(used.has(cls), `${cls} is accepted as unresolved but nothing uses it. Remove the entry.`);
		assert.ok(!defined.has(cls), `${cls} now has a rule. Remove it from ACCEPTED_UNRESOLVED (${reason}).`);
	}
});
