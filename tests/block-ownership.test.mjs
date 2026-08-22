/* Rule 2.1 — one block per component, declared in one home.
 *
 * Enforces docs/foundations/naming.md §2 rule 2.1. That document states the
 * rule; this file is the rule made executable. Written by step 14, against the
 * definition step 2 gave and step 13 corrected.
 *
 * The rule has three clauses and every one of them is load-bearing. Two
 * earlier attempts at this test failed because they were missing one:
 *
 *   OWNERSHIP  A block belongs to the layer that declares its bare `.block`
 *              rule, and only files of that layer can split it. Without this,
 *              `.rux-card` looks split across seven scheduler/ files — but
 *              portable owns it and the application is composing with it,
 *              which is portability-audit's business, not R1's.
 *
 *   SUBJECT    A rule is read by its subject, the last compound in the
 *              selector. `.rux-text-copy-14 :is(strong, b)` is a rule about
 *              `strong`; it does not declare that block.
 *
 *   OVERRIDE   A rule scoped by a DIFFERENT block is that block's contextual
 *              override. `.rux-drawer .rux-panel > .rux-panel__footer` is the
 *              drawer's rule about panels inside it and belongs in the
 *              drawer's file. This is ownership again, applied within a layer
 *              instead of across two.
 *
 * There is no exception list, and that is the acceptance criterion rather than
 * a nice-to-have. CLAUDE.md: a rule that cannot be expressed without a growing
 * allow-list is not ready. Step 13 removed the two real splits so this could
 * ship with nothing excepted; if a future change needs an entry here, the
 * honest move is to fix the split or amend rule 2.1, not to add the entry.
 *
 * KNOWN BLIND SPOT, carried deliberately: grouped selectors are skipped, so a
 * genuine split hidden inside one is not caught. The alternative flags every
 * shared declaration in the layer — `.rux-u-section-label, .rux-menu__header`
 * is one rule serving two blocks, the opposite of a split — and that trade is
 * recorded in naming.md rather than discovered here later. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function cssFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) cssFiles(path, out);
		else if (entry.endsWith(".css")) out.push(path);
	}
	return out;
}

const FILES = [...cssFiles("rux-ui/css"), ...cssFiles("scheduler/css")];
const layerOf = (file) => (file.startsWith("rux-ui/") ? "portable" : "app");

/* `.block__element` or `.block--modifier` — the capture is the block. */
const PART = /\.((?:rux|sched)-[a-z0-9-]+?)(?:__|--)[a-z0-9-]+/g;
/* A bare `.block`. The `--` guard matters: `[a-z0-9-]+` is greedy and would
   otherwise swallow `.rux-card--solid` whole and call it a bare block. */
const BARE = /\.((?:rux|sched)-[a-z0-9-]+)(?![a-z0-9_-])/g;

const blocksIn = (text) => {
	const found = new Set();
	for (const m of text.matchAll(BARE)) if (!/__|--/.test(m[1])) found.add(m[1]);
	for (const m of text.matchAll(PART)) found.add(m[1]);
	return found;
};

const owner = new Map(); // block -> layer that declares its bare rule
const parts = new Map(); // block -> layer -> Set(files)

for (const file of FILES) {
	const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
	for (const match of css.matchAll(/([^{}]+)\{/g)) {
		const raw = match[1].trim();
		if (!raw || raw.startsWith("@") || raw.startsWith(":root")) continue;

		const group = raw.split(",").map((s) => s.trim()).filter(Boolean);
		if (group.length !== 1) continue; // grouped: shared, not split

		const compounds = group[0].split(/\s+|\s*>\s*|\s*\+\s*|\s*~\s*/).filter(Boolean);
		const subject = compounds[compounds.length - 1];
		const ancestors = compounds.slice(0, -1).join(" ");

		for (const m of subject.matchAll(BARE)) {
			const block = m[1];
			if (/__|--/.test(block)) continue;
			if (!owner.has(block)) owner.set(block, layerOf(file));
		}

		for (const m of subject.matchAll(PART)) {
			const block = m[1];
			const scoping = blocksIn(ancestors);
			scoping.delete(block);
			if (scoping.size) continue; // contextual override, owned by the scoping block

			if (!parts.has(block)) parts.set(block, new Map());
			const byLayer = parts.get(block);
			const layer = layerOf(file);
			if (!byLayer.has(layer)) byLayer.set(layer, new Set());
			byLayer.get(layer).add(file);
		}
	}
}

/* A block is owned by the layer declaring its bare rule. Failing that — some
   blocks style only their elements — by the single layer its parts live in.
   Returns null when neither settles it. */
function ownerOf(block, byLayer) {
	const bare = owner.get(block);
	if (bare) return bare;
	const layers = [...byLayer.keys()];
	return layers.length === 1 ? layers[0] : null;
}

test("a block's parts are declared in one file of its owning layer (rule 2.1)", () => {
	const splits = [];
	for (const [block, byLayer] of [...parts].sort()) {
		const own = ownerOf(block, byLayer);
		if (!own) continue; // undecidable: the test below keeps that hole shut
		const inOwn = byLayer.get(own);
		if (inOwn && inOwn.size > 1) {
			splits.push(`${block} (${own}) is declared in ${inOwn.size} files:\n    ${[...inOwn].join("\n    ")}`);
		}
	}
	assert.deepEqual(
		splits,
		[],
		`blocks split across files of their own layer — move each into one home,\n` +
			`the way naming.md step 13 did, and verify resolved values are unchanged:\n\n${splits.join("\n\n")}`,
	);
});

test("every block's owning layer is decidable, so nothing escapes the check", () => {
	/* The check above can only adjudicate a block whose owner it can determine,
	   so an undecidable block would drop out of it silently. This makes that a
	   failure here rather than a hole there.
	
	   A bare rule is NOT required: five app blocks (.sched-tasks, .sched-print
	   and peers) style only their elements and never their container, which
	   rule 2.1 permits — a container can exist in markup and need no CSS. For
	   those, ownership falls back to the single layer their parts live in,
	   which is decidable and not an assumption. Only a block whose parts span
	   both layers with no bare rule anywhere is genuinely unadjudicable. */
	const undecidable = [...parts]
		.filter(([block, byLayer]) => !ownerOf(block, byLayer))
		.map(([block]) => block)
		.sort();
	assert.deepEqual(
		undecidable,
		[],
		`blocks with no bare rule whose parts span both layers, so rule 2.1\n` +
			`cannot say which layer owns them:\n  ${undecidable.join("\n  ")}`,
	);
});
