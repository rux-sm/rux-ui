/* Rule R3 — aria is the state of record.
 *
 * Enforces docs/foundations/state.md rules 2.1, 2.3 and 2.4 (audit R3). That
 * document states the rules; this file is the rule made executable. It was the
 * rules' ONLY statement until state.md step 1 gave them a home to be canonical
 * in — the inversion that document was founded to fix.
 *
 * Where an aria attribute expresses a state (aria-expanded, aria-pressed,
 * aria-selected, aria-current, [hidden]), CSS selects on it and JS writes only
 * it. `.is-*` is reserved for states with no aria equivalent — is-dragging,
 * is-scrolled, is-resizing. BEM `--state` modifiers are prohibited, and JS must
 * never write a class no stylesheet reads.
 *
 * The audit found four competing state mechanisms and two states written at
 * runtime that nothing read. Double selectors of the form
 * `.rux-tab.is-active, .rux-tab[aria-selected="true"]` are the visible symptom:
 * each one is a place where CSS stopped trusting JS.
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

const jsFiles = readdirSync(fileURLToPath(new URL("rux-ui/js/", root)))
	.filter((name) => name.endsWith(".js"))
	.map((name) => ({ name, source: read(`rux-ui/js/${name}`) }));

const allBaseCss = baseFiles.map(({ css }) => css).join("\n");
// tokens.css carries the theme and accent attribute selectors, so an
// attribute read only there is still read.
const allPortableCss = allBaseCss + "\n" + stripComments(read("rux-ui/css/tokens.css"));

/* BEM modifiers that express state rather than variant. Each entry is debt
 * with a recorded resolution: renaming one is a public rename and belongs in
 * docs/portability-audit.md, not in a drive-by. This list must shrink. */
const ACCEPTED_STATE_MODIFIERS = new Map([
	[".rux-button--loading", "audit B2 — pending a rename step; would become [aria-busy]"],
	[".rux-splash--hidden", "audit B2 — pending a rename step; would become [hidden]"],
]);

/* Attributes JS writes that no stylesheet reads yet. Only recorded, deliberate
 * gaps belong here — an entry is a promise that the CSS side is coming. */
const ACCEPTED_UNREAD_ATTRIBUTES = new Map([
	/* [data-rux-accent] lived here from step 19 until color.md §5 step 6, which
	   published the palette rules the entry was holding the place for. It was
	   never really a CSS gap: an accent cannot be switched while it is a
	   hand-tuned recipe, because there is no second palette to switch to. The
	   scales (color.md steps 2-3) are what made four lines per accent possible,
	   and the entry came out the moment they were read. */
]);

const STATE_WORDS = "open|active|hidden|visible|selected|current|loading|disabled|expanded|pressed";

/* ── Tests ───────────────────────────────────────────────────────────────── */

test("no BEM modifier expresses a state", () => {
	const found = new Set();
	for (const { css } of baseFiles) {
		const selectors = css.replace(/\{[^{}]*\}/g, "{}");
		for (const [, selector] of selectors.matchAll(
			new RegExp(`(\\.rux-[a-z0-9-]+--(?:${STATE_WORDS}))(?![a-z0-9-])`, "gi"),
		)) {
			found.add(selector);
		}
	}
	const unexpected = [...found].filter((s) => !ACCEPTED_STATE_MODIFIERS.has(s)).sort();
	assert.deepEqual(
		unexpected,
		[],
		`These BEM modifiers express state, which aria or [hidden] already expresses. ` +
			`A variant describes what a thing IS; a state describes what it is DOING.`,
	);
});

test("every .is-* class rux-ui/js writes is read by a stylesheet", () => {
	// The failure this prevents: JS toggling a class nothing styles, which
	// teaches the next reader a contract that does not exist. The audit found
	// two — controls.js writing .is-active where controls.css had no .is-
	// selector at all, and utilities.js setting a data-rux-open no rule read.
	const orphans = [];
	for (const { name, source } of jsFiles) {
		const written = new Set();
		for (const [, cls] of source.matchAll(/classList\.(?:add|remove|toggle|replace)\(\s*["'](is-[a-z-]+)["']/g)) {
			written.add(cls);
		}
		for (const [, cls] of source.matchAll(/["'](is-[a-z-]+)["']/g)) written.add(cls);
		for (const cls of written) {
			if (!new RegExp(`\\.${cls}(?![a-z0-9-])`).test(allBaseCss)) orphans.push(`${name} → .${cls}`);
		}
	}
	assert.deepEqual(
		[...new Set(orphans)].sort(),
		[],
		`rux-ui/js writes these .is-* classes but no base stylesheet reads them. ` +
			`Either style the state or stop writing it.`,
	);
});

test("no data-rux-* attribute is written by JS and read by nothing", () => {
	// Same failure in the attribute dimension. data-rux-open="1" survived this
	// way until the audit; the CSS never mentioned it.
	const orphans = [];
	for (const { name, source } of jsFiles) {
		const written = new Set();
		for (const [, attr] of source.matchAll(/setAttribute\(\s*["'](data-rux-[a-z-]+)["']/g)) written.add(attr);
		for (const [, prop] of source.matchAll(/dataset\.(rux[A-Z][A-Za-z0-9]*)\s*=/g)) {
			written.add("data-" + prop.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()));
		}
		for (const attr of written) {
			// An attribute counts as read if a stylesheet selects on it, if the
			// module queries for it, or if the module reads it back as a dataset
			// property — the idiom used for one-shot init guards, which are real
			// contracts even though no rule ever styles them.
			if (allPortableCss.includes(`[${attr}`)) continue;
			if (new RegExp(`querySelector[All]*\\([^)]*${attr}`).test(source)) continue;
			const prop = attr.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
			if (new RegExp(`dataset\\.${prop}\\s*(?:===|!==|==|!=|\\))`).test(source)) continue;
			if (ACCEPTED_UNREAD_ATTRIBUTES.has(attr)) continue;
			orphans.push(`${name} → [${attr}]`);
		}
	}
	assert.deepEqual(
		[...new Set(orphans)].sort(),
		[],
		`rux-ui/js writes these data-rux-* attributes but nothing reads them.`,
	);
});

test("accepted entries stay honest", () => {
	for (const [selector, reason] of ACCEPTED_STATE_MODIFIERS) {
		assert.ok(
			allBaseCss.includes(selector),
			`${selector} is accepted debt but no longer exists. Remove the entry (${reason}).`,
		);
	}
	for (const [attr, reason] of ACCEPTED_UNREAD_ATTRIBUTES) {
		assert.ok(
			!allPortableCss.includes(`[${attr}`),
			`[${attr}] is now read by a stylesheet — the gap is closed. Remove the entry (${reason}).`,
		);
	}
});
