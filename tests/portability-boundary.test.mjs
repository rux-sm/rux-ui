/* Enforces the tier boundary recorded in docs/portability-audit.md.
 *
 * The portable layer (rux-ui/) MUST NOT depend upward on the application layer
 * (scheduler/, js/, index.html). Tier 1 and 2 files may be copied into any
 * project on their own, so a name they reference that lives only in the app is
 * either dead CSS or — when it is a custom property with no fallback — a
 * functional break in every consumer.
 *
 * Known violations are listed in ACCEPTED below rather than ignored, so the
 * suite fails the moment a NEW one appears. Shrink these lists as the audit's
 * sequencing steps land; never grow them without recording the row in §4.4.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const baseDir = new URL("rux-ui/css/base/", root);
const baseFiles = readdirSync(fileURLToPath(baseDir))
	.filter((name) => name.endsWith(".css"))
	.map((name) => ({ name, css: stripComments(read(`rux-ui/css/base/${name}`)) }));

const tokensCss = read("rux-ui/css/tokens.css");

/* ── Accepted violations (docs/portability-audit.md §4.4, §4.7) ──────────────
 * Each entry is debt with a recorded resolution step. Removing an entry after
 * the corresponding step lands is part of that step. */

// §4.4 — application classes defined inside the portable layer, as shared
// typography recipes. CLEARED by audit step 3: every recipe now publishes a
// .rux-u-* utility the application opts into. Keep this empty.
const ACCEPTED_APP_SELECTORS = new Set([]);

// §4.7 — domain-named Tier 0 tokens still read by Tier 1. Resolution: rename to
// a domain-free token (audit step 5).
const ACCEPTED_DOMAIN_TOKENS = new Set(["--rux-trip-bar-head-backdrop-blur"]);

// §4.4 — .rux-* selectors in the portable layer that name a Tier 3 block, plus
// one portable utility that merely carries a domain name.
// Resolution: steps 3 (recipes) and 5 (rename .rux-u-trip-list).
const ACCEPTED_DOMAIN_SELECTORS = new Set([".rux-u-trip-list"]);

const DOMAIN_NOUNS = /trip|bus|driver|schedul|customer|fleet|manifest|itinerar/i;

/* ── Tests ─────────────────────────────────────────────────────────────────── */

test("the portable layer defines no application class selectors", () => {
	const found = new Set();
	for (const { css } of baseFiles) {
		for (const [, selector] of css.matchAll(/^\s*(\.[a-z][a-z0-9_-]*)/gim)) {
			if (!selector.startsWith(".rux-")) found.add(selector);
		}
	}
	const unexpected = [...found].filter((s) => !ACCEPTED_APP_SELECTORS.has(s)).sort();
	assert.deepEqual(
		unexpected,
		[],
		`rux-ui/css/base/ defines non-.rux-* selectors that are not accepted debt: ${unexpected.join(", ")}. ` +
			`Publish a .rux-* class the application applies instead of naming the application here.`,
	);
});

test("every --rux-* custom property the portable layer reads resolves inside it", () => {
	const defined = new Set(
		[...tokensCss.matchAll(/^\s*(--rux-[a-z0-9-]+)\s*:/gim)].map(([, t]) => t),
	);

	const dangling = [];
	for (const { name, css } of baseFiles) {
		// Properties a file declares itself are in scope for that file.
		const local = new Set(
			[...css.matchAll(/^\s*(--rux-[a-z0-9-]+)\s*:/gim)].map(([, t]) => t),
		);
		// Only fallback-less reads can break a consumer. `var(--x, 8px)` is the
		// documented escape hatch for a value the application may configure, so
		// it carries its own portable default and is allowed.
		for (const [, token] of css.matchAll(/var\(\s*(--rux-[a-z0-9-]+)\s*\)/gim)) {
			if (defined.has(token) || local.has(token)) continue;
			dangling.push(`${name} → ${token}`);
		}
	}

	assert.deepEqual(
		[...new Set(dangling)].sort(),
		[],
		`The portable layer reads custom properties defined only in the application layer. ` +
			`A consumer copying rux-ui/ alone resolves these to nothing.`,
	);
});

test("the portable layer names no application block in a selector", () => {
	const offenders = [];
	for (const { name, css } of baseFiles) {
		for (const [, selector] of css.matchAll(/^\s*(\.[a-z][a-z0-9_-]*)/gim)) {
			if (ACCEPTED_APP_SELECTORS.has(selector)) continue;
			if (ACCEPTED_DOMAIN_SELECTORS.has(selector)) continue;
			if (DOMAIN_NOUNS.test(selector)) offenders.push(`${name} → ${selector}`);
		}
	}
	assert.deepEqual(
		[...new Set(offenders)].sort(),
		[],
		`Selectors in rux-ui/css/base/ name a domain concept. The portable layer must not ` +
			`know the application's blocks exist.`,
	);
});

test("domain-named Tier 0 tokens are not read by the portable layer", () => {
	const offenders = [];
	for (const { name, css } of baseFiles) {
		for (const [, token] of css.matchAll(/var\((--rux-[a-z0-9-]+)/gim)) {
			if (ACCEPTED_DOMAIN_TOKENS.has(token)) continue;
			if (DOMAIN_NOUNS.test(token)) offenders.push(`${name} → ${token}`);
		}
	}
	assert.deepEqual(
		[...new Set(offenders)].sort(),
		[],
		`The portable layer reads a domain-named token. Rename it to describe the value, ` +
			`not the feature that first needed it.`,
	);
});

test("every page using .rux-* classes loads a design-system entrypoint", () => {
	// scheduler/css/components.css carries only scheduler features now; the base
	// layer comes from rux.css. A page that links components.css without an
	// entrypoint renders every .rux-* component unstyled — the exact regression
	// that reached driver.html, maintenance.html, and request.html when the
	// entrypoints were consolidated and only index.html was updated.
	const pages = [
		"index.html",
		"request.html",
		"maintenance.html",
		"driver.html",
		"examples/app-layout.html",
	];

	const broken = pages.filter((page) => {
		const html = read(page);
		if (!/\brux-[a-z]/.test(html)) return false; // self-contained page
		return !/css\/rux(-core)?\.css/.test(html);
	});

	assert.deepEqual(
		broken,
		[],
		`These pages use .rux-* classes but link no entrypoint, so the base layer never loads.`,
	);
});

test("every stylesheet and script a page links actually exists", () => {
	// Moving a file into rux-ui/ without removing the application's own <link>
	// leaves a 404 that is invisible in the UI, because rux.css supplies the
	// styles anyway. That slipped through twice during the audit migration.
	const pages = [
		"index.html",
		"request.html",
		"maintenance.html",
		"driver.html",
		"doc.html",
	];
	const dangling = [];

	for (const page of pages) {
		const html = read(page);
		// The query string is not optional in practice — this repo cache-busts
		// nearly every link with ?v=N, so a pattern anchored at `.css"` matches
		// almost nothing.
		for (const [, href] of html.matchAll(
			/(?:href|src)="(\.\/[^"]+?\.(?:css|js)(?:\?[^"]*)?)"/g,
		)) {
			const rel = href.replace(/^\.\//, "").split("?")[0];
			if (!existsSync(new URL(rel, root))) dangling.push(`${page} → ${rel}`);
		}
	}

	assert.deepEqual(
		dangling,
		[],
		`These pages link files that do not exist. The page still renders if another ` +
			`stylesheet covers it, so this only shows up as a 404 in the network log.`,
	);
});

test("accepted-violation lists stay honest", () => {
	// A stale entry means debt was paid but the list was not shrunk, which
	// silently weakens every test above.
	const allBase = baseFiles.map(({ css }) => css).join("\n");
	for (const selector of ACCEPTED_APP_SELECTORS) {
		assert.ok(
			allBase.includes(selector),
			`${selector} is listed as accepted debt but no longer exists in rux-ui/css/base/. Remove it from ACCEPTED_APP_SELECTORS.`,
		);
	}
	for (const token of ACCEPTED_DOMAIN_TOKENS) {
		assert.ok(
			allBase.includes(token),
			`${token} is listed as accepted debt but is no longer read in rux-ui/css/base/. Remove it from ACCEPTED_DOMAIN_TOKENS.`,
		);
	}
	for (const selector of ACCEPTED_DOMAIN_SELECTORS) {
		assert.ok(
			allBase.includes(selector),
			`${selector} is listed as accepted debt but no longer exists in rux-ui/css/base/. Remove it from ACCEPTED_DOMAIN_SELECTORS.`,
		);
	}
});
