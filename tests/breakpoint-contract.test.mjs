/* The portable layer's breakpoints are a closed set.
 *
 * Enforces docs/foundations/layout.md §1.1 (the set) and §1.2 (the ratchet).
 * That document states the rule; this file is the rule made executable. The map
 * below is the check, not the canonical list — read layout.md for what each
 * width is for and what it takes to add one.
 *
 * A breakpoint is a design decision, not a local detail: every one added is a
 * width at which some consumer's layout changes without them asking for it, and
 * they multiply quietly because adding one is always the smallest fix in front
 * of you. The application layer used to show where that ends — eleven distinct
 * widths (359, 420, 479, 480, 500, 501, 560, 580, 640, 700, 720px) expressing
 * nine boundaries, seven of them off the set, several a few pixels apart. Step 3
 * reconciled them; this file now covers BOTH layers, which is what stops it
 * happening again.
 *
 * This is a ratchet, not a redesign. Adding a width means adding it here on
 * purpose AND as a numbered step in layout.md §5; reusing one costs nothing.
 *
 * Only `@media` counts. A `@container` rule depends on a component's own width,
 * not the viewport's, and layout.md §1.3 puts it outside this set deliberately —
 * the application layer has twelve of them and none is a breakpoint. */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const LAYERS = [
	["rux-ui/css/", "rux-ui/css/"],
	["scheduler/css/", "scheduler/css/"],
];

const ALLOWED = new Map([
	[420, "the narrow-phone tier below the mobile breakpoint — compact page gutters and logo, and grids that drop to one column (driver-share.css, flip-seven.css, tasks-panel.css)"],
	[500, "the shared mobile breakpoint — touch-target minimums (tokens.css) and the drawer's mobile mode"],
	[580, "phones get one floating-window frame contract regardless of contents (panel.css)"],
	[620, "the header brand sheds its dividers and caps the logo (ui-header.css)"],
	[720, "the workspace stops fitting two columns — side-by-side bodies stack and wide tables shed their money columns (driver-week-info.css, flip-seven.css, comp-*.css)"],
	[760, "the header drops nav, responsive utilities, and active profiles (ui-header.css)"],
]);

/* Either side of a boundary is the same decision: `max-width: 500px` and
   `min-width: 501px` describe one width, so N+1 resolves to N. layout.md §1.1.
   Step 2 records the omission that made this worth stating — a review counted
   the widths correctly and then listed one fewer, because 501 did not look like
   a boundary on its own. */
const boundaryOf = (px) => (ALLOWED.has(px) ? px : ALLOWED.has(px - 1) ? px - 1 : null);

const cssFiles = [];
const walk = (dir, prefix) => {
	for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
		if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
		else if (entry.name.endsWith(".css")) cssFiles.push(`${prefix}${entry.name}`);
	}
};
for (const [sub, prefix] of LAYERS) walk(new URL(sub, root), prefix);

const widthsIn = (name) => {
	const out = [];
	const css = readFileSync(new URL(name, root), "utf8");
	for (const [, query] of css.matchAll(/@media([^{]*)\{/g))
		for (const [, px] of query.matchAll(/(?:min|max)-width:\s*(\d+)px/g)) out.push(Number(px));
	return out;
};

test("both layers only use breakpoints the contract records", () => {
	const offenders = [];
	for (const name of cssFiles)
		for (const px of widthsIn(name))
			if (boundaryOf(px) === null) offenders.push(`${name} → ${px}px`);
	assert.deepEqual(
		[...new Set(offenders)].sort(),
		[],
		`Unrecorded breakpoints in the portable layer. Reuse one of ` +
			`${[...ALLOWED.keys()].join("/")}px, or add the new one to ALLOWED in this ` +
			`file with a note on what it is for — deliberately, not as a side effect.`,
	);
});

test("every recorded breakpoint is still in use", () => {
	// The list is only meaningful if it describes reality. A breakpoint that
	// stops being used should leave, or the next person reads it as sanctioned.
	const used = new Set();
	for (const name of cssFiles) for (const px of widthsIn(name)) used.add(boundaryOf(px));
	assert.deepEqual(
		[...ALLOWED.keys()].filter((px) => !used.has(px)),
		[],
		"Recorded breakpoints no longer used anywhere. Remove them from ALLOWED.",
	);
});
