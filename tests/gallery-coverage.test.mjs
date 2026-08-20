/* Every base component should have a gallery specimen.
 *
 * gallery.html is how anyone — a person, or an agent asked to restyle
 * something — sees what the system actually offers. A component with no
 * specimen is one nobody knows exists, so it gets reinvented in an application
 * with a new name, which is where most of the naming drift in this repository
 * came from.
 *
 * Thirteen of twenty-two are missing today, and building those specimens is
 * design work rather than a mechanical fix, so this is a ratchet: the gaps are
 * recorded, a NEW component cannot ship without a specimen, and the list is
 * required to shrink honestly rather than sit here being decorative. */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const baseDir = new URL("rux-ui/css/base/", root);
const gallery = readFileSync(new URL("gallery.html", root), "utf8");

/* Class tokens the gallery actually puts in markup — not every rux- string in
 * the file, which would count prose and comments as coverage. */
const shown = new Set();
for (const [, value] of gallery.matchAll(/class="([^"]*)"/g)) {
	for (const token of value.split(/\s+/)) {
		if (token.startsWith("rux-")) shown.add(token.split("--")[0].split("__")[0]);
	}
}

/* The blocks a base file defines, ignoring modifiers and elements. */
const blocksOf = (css) => {
	const blocks = new Set();
	for (const [, sel] of css.matchAll(/^\.(rux-[a-z0-9-]+)/gim)) {
		blocks.add(sel.split("--")[0].split("__")[0]);
	}
	return blocks;
};

const components = readdirSync(fileURLToPath(baseDir))
	.filter((n) => n.endsWith(".css"))
	.map((name) => ({
		name: name.replace(/\.css$/, ""),
		covered: [...blocksOf(readFileSync(new URL(name, baseDir), "utf8"))].some((b) => shown.has(b)),
	}));

// Recorded gaps, not sanctioned ones. Deleting a line here is the goal.
const KNOWN_GAPS = [
	"app-shell", "drawer", "menu", "notifications", "panel", "popover",
	"preferences", "profile-picker", "side-nav", "suggestions", "table",
	"ui-header", "workspace",
];

test("a component without a gallery specimen is a recorded gap, not a new one", () => {
	const missing = components.filter((c) => !c.covered).map((c) => c.name);
	assert.deepEqual(
		missing.filter((name) => !KNOWN_GAPS.includes(name)).sort(),
		[],
		"These base components have no gallery specimen. Add one to gallery.html — a " +
			"component nobody can see is one that gets reinvented under a new name.",
	);
});

test("the recorded gallery gaps stay honest", () => {
	// A gap that has since been filled must leave the list, or the list stops
	// describing reality and starts excusing it.
	const covered = new Set(components.filter((c) => c.covered).map((c) => c.name));
	assert.deepEqual(
		KNOWN_GAPS.filter((name) => covered.has(name)),
		[],
		"These are listed as gallery gaps but now have specimens. Remove them from KNOWN_GAPS.",
	);
});

test("every recorded gap is still a real component", () => {
	const names = new Set(components.map((c) => c.name));
	assert.deepEqual(
		KNOWN_GAPS.filter((name) => !names.has(name)),
		[],
		"KNOWN_GAPS names a base component that no longer exists.",
	);
});
