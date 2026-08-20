/* Rule R8 — focus is visible everywhere.
 *
 * Every base file that gives an interactive element a :hover treatment must
 * also give it a :focus-visible treatment keyed to --rux-accent-ring.
 *
 * :hover is the tell. A file that bothers to style hover has an element a
 * pointer user can act on, which means a keyboard user can act on it too — and
 * because this layer restyles controls with custom borders and backgrounds, the
 * UA's default outline frequently reads wrong or invisibly against them. The
 * audit found :focus-visible in 3 of 22 base files while form.css restyled every
 * control in the system with zero focus rules at all.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const baseDir = new URL("rux-ui/css/base/", root);
const baseFiles = readdirSync(fileURLToPath(baseDir))
	.filter((name) => name.endsWith(".css"))
	.map((name) => ({ name, css: stripComments(read(`rux-ui/css/base/${name}`)) }));

/* Files that style :hover on something that is genuinely not focusable — a
 * row highlight driven by the pointer alone, with the real control nested
 * inside it. Each entry must name the element, so the claim can be checked. */
const ACCEPTED_HOVER_WITHOUT_FOCUS = new Map([]);

/* Every :focus-visible rule in the layer, flattened. A component often
 * suppresses the UA outline on the host and draws its ring on a pseudo-element
 * (.rux-slider:focus-visible::-webkit-slider-thumb), so the two halves have to
 * be judged together or the honest pattern reads as a violation. */
const focusRules = [];
for (const { name, css } of baseFiles) {
	for (const [, selector, block] of css.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^}]*)\}/g)) {
		focusRules.push({ name, selector: selector.trim(), block });
	}
}

const DRAWS = /box-shadow:|border(?:-[a-z]+)?:|background:|(?<![-\w])color:|outline:\s*(?!none|0)/;
const label = (rule) => `${rule.name} → ${rule.selector.split("\n")[0].trim()}`;

/* Does this rule, or a companion rule extending its selector, draw anything? */
const drawsSomewhere = (rule, predicate) =>
	focusRules.some(
		(other) =>
			other.name === rule.name &&
			other.selector.startsWith(rule.selector) &&
			predicate(other.block),
	);

/* ── Tests ───────────────────────────────────────────────────────────────── */

test("every base file that styles :hover also styles :focus-visible", () => {
	const gaps = baseFiles
		.filter(({ name, css }) => {
			if (ACCEPTED_HOVER_WITHOUT_FOCUS.has(name)) return false;
			return css.includes(":hover") && !css.includes(":focus-visible");
		})
		.map(({ name }) => name)
		.sort();

	assert.deepEqual(
		gaps,
		[],
		`These base files style :hover but never :focus-visible, so the interaction ` +
			`they design for a pointer has no keyboard equivalent. Add a rule keyed to ` +
			`--rux-accent-ring.`,
	);
});

test("focus rings are built from tokens, not literals", () => {
	// Indirection through a component token (--rux-button-focus-ring) is fine,
	// and so is a relative colour derived from one — the invalid-input ring is
	// deliberately danger-coloured. A raw literal is not: it can follow neither
	// the accent nor the theme.
	const offenders = focusRules
		.filter((rule) => DRAWS.test(rule.block))
		.filter((rule) => !drawsSomewhere(rule, (block) => block.includes("var(--rux-")))
		.map(label);

	assert.deepEqual(
		[...new Set(offenders)].sort(),
		[],
		`These :focus-visible rules draw with no --rux-* token, so the ring cannot ` +
			`follow the accent or the theme.`,
	);
});

test("no :focus-visible rule suppresses the ring without drawing one", () => {
	// `outline: none` with nothing in its place is the single most common way a
	// design system becomes unusable by keyboard.
	const offenders = focusRules
		.filter((rule) => /outline:\s*(none|0)\b/.test(rule.block))
		.filter((rule) => !drawsSomewhere(rule, (block) => DRAWS.test(block)))
		.map(label);

	assert.deepEqual(
		[...new Set(offenders)].sort(),
		[],
		`These rules remove the focus outline without drawing a replacement ring, ` +
			`on the element itself or on a pseudo-element of it.`,
	);
});

test("accepted hover-without-focus entries stay honest", () => {
	for (const [name, reason] of ACCEPTED_HOVER_WITHOUT_FOCUS) {
		const file = baseFiles.find((entry) => entry.name === name);
		assert.ok(file, `${name} is accepted debt but no longer exists. Remove the entry (${reason}).`);
		assert.ok(
			!file.css.includes(":focus-visible"),
			`${name} now styles :focus-visible. Remove it from ACCEPTED_HOVER_WITHOUT_FOCUS (${reason}).`,
		);
	}
});
