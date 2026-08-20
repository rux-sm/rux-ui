/* The portable layer's breakpoints are a closed set.
 *
 * A breakpoint is a design decision, not a local detail: every one added is a
 * width at which some consumer's layout changes without them asking for it, and
 * they multiply quietly because adding one is always the smallest fix in front
 * of you. The application layer shows where that ends — eleven distinct widths
 * (359, 420, 479, 480, 500, 560, 580, 640, 700, 720px), several a few pixels
 * apart, none of them a decision anybody remembers making.
 *
 * This is a ratchet, not a redesign. The four the portable layer already uses
 * are recorded below with what each is for. Adding a fifth means adding it here
 * on purpose, which is the whole point; reusing one of these costs nothing. */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const cssDir = new URL("rux-ui/css/", root);

const ALLOWED = new Map([
	[500, "the shared mobile breakpoint — touch-target minimums (tokens.css) and the drawer's mobile mode"],
	[580, "phones get one floating-window frame contract regardless of contents (panel.css)"],
	[620, "the header brand sheds its dividers and caps the logo (ui-header.css)"],
	[760, "the header drops nav, responsive utilities, and active profiles (ui-header.css)"],
]);

const cssFiles = [];
const walk = (dir, prefix) => {
	for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
		if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
		else if (entry.name.endsWith(".css")) cssFiles.push(`${prefix}${entry.name}`);
	}
};
walk(cssDir, "");

test("the portable layer only uses breakpoints the contract records", () => {
	const offenders = [];
	for (const name of cssFiles) {
		const css = readFileSync(new URL(name, cssDir), "utf8");
		for (const [, query] of css.matchAll(/@media([^{]*)\{/g)) {
			for (const [, px] of query.matchAll(/(?:min|max)-width:\s*(\d+)px/g)) {
				if (!ALLOWED.has(Number(px))) offenders.push(`${name} → ${px}px`);
			}
		}
	}
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
	for (const name of cssFiles) {
		const css = readFileSync(new URL(name, cssDir), "utf8");
		for (const [, query] of css.matchAll(/@media([^{]*)\{/g)) {
			for (const [, px] of query.matchAll(/(?:min|max)-width:\s*(\d+)px/g)) used.add(Number(px));
		}
	}
	assert.deepEqual(
		[...ALLOWED.keys()].filter((px) => !used.has(px)),
		[],
		"Recorded breakpoints no longer used anywhere. Remove them from ALLOWED.",
	);
});
