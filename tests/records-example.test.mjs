/* examples/records-view.html demonstrates the records archetype, and this test
 * is what stops it demonstrating something else.
 *
 * An example that is not checked drifts, and a drifted example is worse than no
 * example: it teaches the wrong thing with the authority of a reference. The
 * same failure gallery-coverage.test.mjs exists to prevent one tier down.
 *
 * Every assertion below cites the section it enforces. This file states no
 * rules of its own — where a value appears, it is read from tokens.css rather
 * than pinned here, so moving a rung moves the test with it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const page = read("../examples/records-view.html");
const tokens = read("../rux-ui/css/tokens.css");
const workspace = read("../rux-ui/css/base/workspace.css");

/* Structural assertions run against comment-stripped markup and CSS: prose
 * about a rule must not be able to satisfy the test for that rule. This file's
 * own commentary quotes several of the selectors it checks. */
const markup = page.replace(/<!--[\s\S]*?-->/g, "");
const styles = (page.match(/<style>([\s\S]*?)<\/style>/) || ["", ""])[1]
	.replace(/\/\*[\s\S]*?\*\//g, "");

/* ── composition.md §2.3 — the records anatomy ───────────────────────────── */

test("the band holds controls and no title (§2.2, §2.3)", () => {
	assert.match(markup, /class="[^"]*rux-workspace__header--table/,
		"a records band is .rux-workspace__header--table");
	assert.ok(!markup.includes("rux-workspace__title"),
		"a records band must not title its workspace");
});

test("the body is a table, and the band carries what a rail would have (§2.3, §2.3.2)", () => {
	assert.match(markup, /<table[^>]*class="[^"]*rux-table/, "the body holds a .rux-table");
	assert.ok(!markup.includes("rux-panel--attached"),
		"§2.3.2: a records view with no rail is the expected case, and this is the reference for it");
	const band = markup.slice(
		markup.indexOf("rux-workspace__header--table"),
		markup.indexOf("</header>"),
	);
	assert.match(band, /type="search"/, "search belongs in the band, not a rail");
	assert.match(band, /rux-segmented-track/, "the scope control belongs in the band");
});

/* ── composition.md §2.3.1 — below 720px ─────────────────────────────────── */

test("roles are declared rather than inherited (§2.3.1)", () => {
	// display: block drops the implicit table/row/cell roles in every engine.
	assert.match(markup, /<table[^>]*role="table"/);
	// (?=[\s>]) or <th also matches <thead>, and <td also matches nothing else
	// but the symmetry is worth keeping — the first draft of this test failed on
	// <thead> and the example was correct.
	assert.ok(!/<tr(?=[\s>])(?![^>]*role="row")/.test(markup), "every <tr> declares role=row");
	assert.ok(!/<td(?=[\s>])(?![^>]*role="cell")/.test(markup), "every <td> declares role=cell");
	assert.ok(!/<th(?=[\s>])(?![^>]*role="columnheader")/.test(markup),
		"every <th> declares role=columnheader");
});

test("a hidden column hides as a header/cell pair (§2.3.1)", () => {
	// The defect this guards is measured in the plan as B1: the shipped Drivers
	// table hid <td>s by one class and <th>s by another, so every column right
	// of Phone rendered one place left of its own header.
	const narrow = styles.slice(styles.indexOf("@media (max-width: 720px)"));
	const hides = [...narrow.matchAll(/\[data-col="([a-z-]+)"\][^{]*\{\s*display:\s*none/g)]
		.map((m) => m[1]);
	assert.ok(hides.length > 0, "the example must demonstrate at least one hidden column");
	for (const col of hides) {
		// A pair rule keys off [data-col] alone, so it matches th and td both.
		const rule = new RegExp(`\\[data-col="${col}"\\][^{]*\\{[^}]*display:\\s*none`);
		assert.match(narrow, rule);
		assert.ok(!new RegExp(`td\\[data-col="${col}"\\][^{]*\\{[^}]*display:\\s*none`).test(narrow),
			`${col} must not hide by a td-only selector — that is what unpairs it from its <th>`);
	}
});

test("the header row goes whole, and the four cell properties are given back (§2.3.1)", () => {
	const narrow = styles.slice(styles.indexOf("@media (max-width: 720px)"));
	assert.match(narrow, /thead\s*\{\s*display:\s*none/,
		"the header row goes whole, never column by column");
	for (const prop of ["height", "white-space", "overflow", "text-overflow"]) {
		assert.match(narrow, new RegExp(`${prop}:`),
			`§2.3.1: .rux-table td publishes ${prop}, which becomes a hard constraint under display: block`);
	}
});

test("the band wraps rather than crushing its controls (§2.3.1)", () => {
	const narrow = styles.slice(styles.indexOf("@media (max-width: 720px)"));
	assert.match(narrow, /flex-wrap:\s*wrap/);
});

/* ── layout.md §9.4 / §9.5 — density and columns ─────────────────────────── */

test("the table opts into a rung, and the rung is a published token (§9.4)", () => {
	const opt = styles.match(/--rux-table-row-height:\s*var\((--rux-row-height-[a-z]+)\)/);
	assert.ok(opt, "the example must show how a table takes a rung other than the default");
	assert.match(tokens, new RegExp(`${opt[1]}:\\s*\\d+px`),
		`${opt[1]} must be a published rung, not an invented name`);
	// §9.4: two-line content takes lg or higher. This example's identity cell
	// stacks a name over a secondary line, so anything below lg is wrong.
	const rung = opt[1].split("-").pop();
	assert.ok(["lg", "xl"].includes(rung),
		`the identity cell is two lines, so §9.4 requires lg or xl, not ${rung}`);
});

test("the band is paired to the rung by the shared layer, not by the view (§9.4)", () => {
	assert.match(workspace, /\.rux-workspace__header--table\s*\{[^}]*min-height:\s*var\(--rux-band-height-lg\)/,
		"pairing is workspace.css's job");
	assert.ok(!/records-example__band[^{]*\{[^}]*min-height/.test(styles),
		"the example must not restate the band height — that would be a second home for the rule");
});

test("data columns size to content and identity absorbs the slack (§9.5)", () => {
	// Selectors group, so collect every [data-col] named in the selector list of
	// a rule that sets width: 1% — matching the rule once and reading only its
	// first name under-counts a grouped list.
	const sized = [...styles.matchAll(/([^{}]*?)\{([^}]*)\}/g)]
		.filter(([, , body]) => /width:\s*1%/.test(body))
		.flatMap(([, selector]) => [...selector.matchAll(/th\[data-col="([a-z-]+)"\]/g)].map((m) => m[1]));
	assert.ok(sized.length >= 2, "§9.5: data columns size to content rather than sharing width");
	assert.ok(!sized.includes("driver"),
		"§9.5: the identity column absorbs the remainder, so it is not content-sized");
	// §9.5: three or more columns.
	const headers = (markup.match(/<th[^>]*data-col=/g) || []).length;
	assert.ok(headers >= 3, `§9.5 requires three or more columns, found ${headers}`);
});

test("a severity class on a cell out-specifies .rux-table td (tables.md T5)", () => {
	// .rux-table td sets `color` at (0,1,1). A bare class is (0,1,0) and loses
	// SILENTLY — the text just renders default-coloured. This shipped in
	// 68b58a9 and no screenshot caught it; a computed-style read did.
	const colourRules = [...styles.matchAll(/([^{}]*?)\{([^}]*)\}/g)]
		.filter(([, sel, body]) => /(^|[^-])color:/.test(body) && /__(due|severity|compliance)--/.test(sel));
	assert.ok(colourRules.length > 0, "the example must demonstrate a severity cell");
	for (const [, sel] of colourRules) {
		assert.match(sel, /\btd\./,
			`"${sel.trim()}" must qualify with td, or .rux-table td wins and the severity never paints`);
	}
});

/* ── the example's own hygiene ───────────────────────────────────────────── */

test("the example invents no shared vocabulary", () => {
	// Its own block is app-tier; everything .rux-* it uses must already exist.
	// class-resolution.test.mjs proves the .rux-* half across every page, so this
	// asserts the other direction: no new --rux-* custom property is DECLARED here.
	const declared = [...styles.matchAll(/(--rux-[a-z0-9-]+):/g)].map((m) => m[1]);
	for (const name of declared) {
		assert.ok(
			tokens.includes(`${name}:`),
			`${name} is declared in the example but published nowhere — propose it, do not add it`,
		);
	}
});

test("the example states its data is synthetic", () => {
	// It is in a public repository and it mimics a real roster whose columns are
	// anon-readable. The claim is load-bearing, so it is asserted.
	assert.match(page, /synthetic/i);
	assert.ok(!/\b\d{3}-\d{2}-\d{4}\b/.test(page), "no identity-shaped numbers in a public example");
});
