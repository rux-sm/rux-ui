import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* Rule R2 — one modifier vocabulary.
 *
 * Enforces docs/foundations/naming.md rule 2.4. That document states the rule;
 * this file is the rule made executable. R2 was specified with a synonym
 * denylist in the 2026-08 audit and the denylist was never written — naming.md
 * §3 records the four drifts that went unnoticed in the meantime.
 *
 * A DENYLIST, NOT AN ALLOWLIST, per naming.md Q3 (answered: the eight families
 * in §1.2 are a reading aid, not a rule). An allowlist of sanctioned families
 * would be the stronger rule and the wrong one to write first: it would have to
 * be right about all 38 modifiers on the day it lands, and every miss becomes an
 * exception entry that makes it mean less. This forbids what is known to be
 * wrong and leaves the rest alone.
 *
 * Rule 2.4 has two halves and this file checks both:
 *   - one concept, one name  (a synonym is a defect)
 *   - one name, one concept  (a collision is a defect, and it is the half
 *     people forget to look for — `--solid` fills a badge and re-chromes a card)
 */

/* Answered by the owner, 2026-08-22 — naming.md Q1. Sizes are `--sm` and
   `--lg` around an UNMODIFIED middle. `--md` is forbidden rather than merely
   absent: publishing it would make every call site restate the default. */
const FORBIDDEN = new Map([
	["md", "naming.md Q1 — the middle size is an unmodified block, never --md"],
	["default-size", "naming.md D3 — a size outside the size vocabulary; use --sm/--lg or nothing"],
	["default", "naming.md Q2 — the neutral filled variant is --solid everywhere"],
]);

/* Every entry is a public rename and belongs in ../docs/portability-audit.md,
   not a drive-by. Each names the block, the target, and why it has not moved.
   This list MUST shrink; naming.md step 3 is where it empties. */
const PENDING_RENAMES = new Map([
	[".rux-panel--default-size", "→ --sm, or drop; compounds only with --floating (naming.md D3)"],
	[".rux-button--default", "→ --solid (naming.md D4)"],
]);

/* One name carrying two concepts. `--solid` fills the background on badge and
   output; on card it opts the block into the shell's chrome, which is a
   different idea wearing the same word. Recorded rather than forbidden: the
   fix is a rename, and naming.md D4 owns it. */
const KNOWN_COLLISIONS = new Map([
	[".rux-card--solid", "--solid means 'filled' on badge/output; here it means 'adopt shell chrome' (naming.md D4)"],
]);

function cssFiles(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) cssFiles(p, out);
		else if (name.endsWith(".css")) out.push(p);
	}
	return out;
}

const classes = new Set();
for (const file of cssFiles("rux-ui/css")) {
	const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
	for (const [, cls] of css.matchAll(/(\.rux-[a-z0-9-]+--[a-z0-9-]+)/g)) classes.add(cls);
}
const modifierOf = (cls) => cls.slice(cls.indexOf("--") + 2);

test("the portable layer defines modifiers at all", () => {
	assert.ok(classes.size > 20, `only found ${classes.size} modifier classes — the scan is wrong`);
});

test("no modifier uses a forbidden name (rule 2.4)", () => {
	const offenders = [];
	for (const cls of classes) {
		const why = FORBIDDEN.get(modifierOf(cls));
		if (why && !PENDING_RENAMES.has(cls)) offenders.push(`${cls} — ${why}`);
	}
	assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});

test("the pending-rename list only shrinks", () => {
	/* Each entry is debt with a recorded destination. An entry matching nothing
	   means the rename happened and the entry should have left with it. */
	const stale = [...PENDING_RENAMES.keys()].filter((cls) => !classes.has(cls));
	assert.deepEqual(stale, [], "pending renames matching no class — delete them in the same change");
	assert.ok(
		PENDING_RENAMES.size <= 2,
		`the pending-rename list must never grow — naming.md step 3 empties it`,
	);
});

test("known collisions stay recorded and do not spread (rule 2.4)", () => {
	/* The second half of 2.4: one name, one concept. This cannot detect a NEW
	   collision — that needs a human to read what a modifier does — so it does
	   the next best thing and pins the one we found, so it cannot quietly
	   acquire a third meaning while the rename waits. */
	const stale = [...KNOWN_COLLISIONS.keys()].filter((cls) => !classes.has(cls));
	assert.deepEqual(stale, [], "recorded collisions matching no class — delete them");
	assert.equal(KNOWN_COLLISIONS.size, 1, "a new collision needs a naming.md defect, not a list entry");
});

test("every size modifier comes from the size vocabulary (rule 2.4)", () => {
	/* Sizes are the family Q1 settled, so they are the one family this file can
	   check as an allowlist. --xs/--xl are absent today and stay forbidden until
	   a block needs one and says so in naming.md. */
	const SIZES = new Set(["sm", "lg"]);
	const SIZEISH = /^(xs|sm|md|lg|xl|small|medium|large|compact|tight|mini|default-size)$/;
	const offenders = [];
	for (const cls of classes) {
		const mod = modifierOf(cls);
		if (SIZEISH.test(mod) && !SIZES.has(mod) && !PENDING_RENAMES.has(cls))
			offenders.push(`${cls} — sizes are --sm/--lg around an unmodified middle`);
	}
	assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});
