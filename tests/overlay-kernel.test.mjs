import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

/* Rule R7 — one overlay kernel.
 *
 * Enforces docs/foundations/state.md rule 2.5. That document states the rule;
 * this file is the rule made executable. Until state.md step 2 it was the only
 * one of R3/R7/R8 with no test at all — stated nowhere and checked by nothing.
 *
 * SCOPE, per state.md Q2 (answered: narrow). The kernel does not own every path
 * that closes a surface; it owns the two POLICIES THAT MUST BE SINGULAR:
 *
 *   - outside-pointerdown, because two modules both deciding what counts as
 *     "outside" is how a click lands on nothing, and
 *   - Escape, because two handlers both consuming it is how one keypress closes
 *     two surfaces.
 *
 * A menu closing itself on Tab, or on its own item being activated, is neither.
 * Those are the surface's own business and stay with the surface.
 *
 * The narrow reading is not a concession — it is what the codebase already
 * said. Six modules carry a comment deferring outside-click and Escape to the
 * kernel: menu.js, drawer.js, popover.js, suggestions.js, ui-shell.js and
 * utilities.js. R7's sentence ("no module binds its own document-level dismiss
 * listeners") was broader than its own implementation, and rule 2.5 is worded
 * to match what was built rather than the other way round.
 */

const KERNEL = "overlay.js";
const dir = new URL("../rux-ui/js/", import.meta.url);
const modules = readdirSync(dir)
	.filter((n) => n.endsWith(".js"))
	.map((name) => ({ name, src: readFileSync(new URL(name, dir), "utf8") }));

/* Comments describe the rule constantly in this layer — "Escape comes from the
   overlay kernel" is a comment in three files. Stripping them is what keeps the
   test measuring bindings rather than prose about bindings. */
const stripComments = (js) =>
	js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Every `document.addEventListener("<type>", …)` binding, with its handler body. */
function documentListeners(src, type) {
	const out = [];
	const re = new RegExp(`document\\.addEventListener\\(\\s*["']${type}["']\\s*,`, "g");
	for (const m of src.matchAll(re)) {
		/* Take a generous slice rather than brace-matching: the handler only
		   needs to be searchable for "Escape", not parsed. */
		out.push(src.slice(m.index, m.index + 600));
	}
	return out;
}

test("only the kernel binds a document-level outside-pointerdown", () => {
	const offenders = [];
	for (const { name, src } of modules) {
		if (name === KERNEL) continue;
		if (documentListeners(stripComments(src), "pointerdown").length)
			offenders.push(name);
	}
	assert.deepEqual(
		offenders,
		[],
		"A second outside-press listener means two modules deciding what counts " +
			"as outside. Register with RuxOverlay instead — state.md rule 2.5.",
	);
});

test("only the kernel consumes Escape at the document level", () => {
	/* Element-level keydown is fine and common — a roving arrow-key pattern
	   lives on the menu. What must be singular is Escape ON DOCUMENT, because
	   two handlers consuming one keypress closes two surfaces. */
	const offenders = [];
	for (const { name, src } of modules) {
		if (name === KERNEL) continue;
		for (const handler of documentListeners(stripComments(src), "keydown"))
			if (/["']Escape["']/.test(handler)) offenders.push(name);
	}
	assert.deepEqual(
		offenders,
		[],
		"A second Escape handler means one keypress closing two surfaces — " +
			"state.md rule 2.5.",
	);
});

test("the kernel actually binds both policies", () => {
	/* The two tests above pass trivially if the kernel stops binding them at
	   all. This is what makes them mean "exactly one" rather than "at most one". */
	const kernel = stripComments(modules.find((m) => m.name === KERNEL).src);
	assert.equal(
		documentListeners(kernel, "pointerdown").length,
		1,
		"the kernel must bind exactly one document-level outside-pointerdown",
	);
	const escape = documentListeners(kernel, "keydown").filter((h) =>
		/["']Escape["']/.test(h),
	);
	assert.equal(escape.length, 1, "the kernel must bind exactly one Escape policy");
});

test("the kernel still publishes the helpers rule 2.5 names", () => {
	/* 2.5 promises one focus trap/restore helper and one layer-promotion helper
	   alongside the two policies. A kernel that lost them would leave every
	   surface to reimplement them, which is the state the rule exists to prevent. */
	const kernel = modules.find((m) => m.name === KERNEL).src;
	for (const helper of ["register", "trapFocus", "promoteLayer"])
		assert.match(
			kernel,
			new RegExp(`function ${helper}\\b`),
			`overlay.js must publish ${helper}() — state.md rule 2.5`,
		);
});
