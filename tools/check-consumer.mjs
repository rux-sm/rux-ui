#!/usr/bin/env node
/* Verify a consuming application against the Rux UI copy it ships with.
 *
 *   tools/check-consumer.mjs --app <dir> [--design-system <dir>]
 *                            [--exclude <path>]... [--json]
 *
 * This is gate 2 of docs/design-system-distribution.md §4, and it lives here
 * rather than in each consumer on purpose. Every consumer needs the identical
 * check, a consumer that skips it fails silently, and the failure it catches is
 * the one that has actually happened twice:
 *
 *   v0.1.0 renamed .rux-card--boxed, .rux-cluster and .rux-button--header. The
 *   consumer using them kept building green and the elements silently lost
 *   their styling. A renamed class is not a build error, not a type error, and
 *   not a test failure.
 *
 *   v0.1.5 removed 81 tokens. portal/app/globals.css referenced ten of them.
 *
 * Neither would be caught by a bundler, a type checker, or npm. This check is
 * required under the vendored model AND under the npm model §7 proposes, which
 * is why it is worth building before that question is settled.
 *
 * It enforces both of §4's rules:
 *   1. every rux- name a consumer uses is defined by the copy it ships
 *   2. a consumer neither invents nor interpolates into the rux- namespace
 *
 * Exit 0 clean, 1 findings, 2 usage error.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/* Files that actually render. Markdown is deliberately absent: a consumer's
   changelog naming a class it removed years ago is not a use, and scanning
   prose is how a check earns a reputation for crying wolf. */
const SCANNED = [".html", ".htm", ".css", ".js", ".mjs", ".jsx", ".ts", ".tsx", ".svelte", ".vue"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo"]);

function parseArgs(argv) {
	const args = { app: "", ds: "", exclude: [], json: false };
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--app") args.app = argv[++i] ?? "";
		else if (a === "--design-system") args.ds = argv[++i] ?? "";
		else if (a === "--exclude") args.exclude.push(argv[++i] ?? "");
		else if (a === "--json") args.json = true;
		else die(`unknown argument: ${a}`);
	}
	if (!args.app) die("--app <dir> is required");
	return args;
}
function die(msg) {
	process.stderr.write(`ERROR: ${msg}\n\nUsage: tools/check-consumer.mjs --app <dir> [--design-system <dir>] [--exclude <path>]... [--json]\n`);
	process.exit(2);
}

/* Any directory holding css/rux.css is a Rux UI copy. Found by walking rather
   than by a fixed list, because a copy that moved is exactly what a hardcoded
   path misses.
 *
 * ALL copies inside the application are excluded from the consumer scan, not
 * just the one being compared against. Checking a consumer against an
 * out-of-tree checkout — which is what a pre-sync dry run does — otherwise
 * reads its own vendored copy as application code and reports every retired
 * name in it. The first run of this tool did exactly that: 88 findings, every
 * one inside portal/design-system/. */
function findCopies(dir, out = [], depth = 0) {
	if (depth > 4) return out;
	let entries;
	try { entries = readdirSync(dir); } catch { return out; }
	if (existsSync(join(dir, "css", "rux.css"))) { out.push(dir); return out; }
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry) && entry !== "node_modules") continue;
		const path = join(dir, entry);
		try { if (!statSync(path).isDirectory()) continue; } catch { continue; }
		if (entry === "node_modules") {
			const pkg = join(path, "rux-ui");
			if (existsSync(join(pkg, "css", "rux.css"))) out.push(pkg);
			continue;
		}
		findCopies(path, out, depth + 1);
	}
	return out;
}

function findDesignSystem(app, explicit, copies) {
	if (explicit) {
		if (!existsSync(join(explicit, "css", "rux.css"))) die(`--design-system has no css/rux.css: ${explicit}`);
		return explicit;
	}
	if (copies.length === 1) return copies[0];
	if (copies.length > 1) die(`several Rux UI copies found; pass --design-system <dir>:\n  ${copies.join("\n  ")}`);
	die(`no Rux UI copy found under ${app}. Pass --design-system <dir>.`);
}

function walk(dir, excludes, out = []) {
	let entries;
	try { entries = readdirSync(dir); } catch { return out; }
	for (const entry of entries) {
		const path = join(dir, entry);
		if (excludes.some((e) => path === e || path.startsWith(e + "/"))) continue;
		let st;
		try { st = statSync(path); } catch { continue; }
		if (st.isDirectory()) {
			if (SKIP_DIRS.has(entry)) continue;
			walk(path, excludes, out);
		} else if (SCANNED.some((ext) => entry.endsWith(ext))) out.push(path);
	}
	return out;
}

/* Comments are stripped before scanning: a commented-out class is not a use,
   and a comment explaining why a class was removed would otherwise report it
   as still in use. */
const stripComments = (text) =>
	text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/^\s*\/\/.*$/gm, " ");

/* The lookbehind keeps a class match from starting inside a token name:
   `--rux-size-3xl` contains `rux-size-3xl`, so without it every undefined token
   is also reported as an undefined class and the same fault is listed twice
   under two headings. */
const CLASS = /(?<![-\w])rux-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?\b/g;
const TOKEN = /--rux-[a-z0-9]+(?:-[a-z0-9]+)*/g;
/* `rux-badge--${priority}` fabricates names nothing defines, and no gate can
   catch the result — §4 forbids it, so the shape itself is the finding.
 *
 * The separator immediately before `${` is what makes this precise. Appending a
 * conditional class is idiomatic and legal:
 *
 *   `rux-side-nav--overlay${open ? " is-open" : ""}`   ← fine, a whole class follows
 *   `rux-badge--${priority}`                            ← builds a name, forbidden
 *
 * Requiring `-` or `_` directly before the interpolation separates them. A
 * first pass matched any `rux-…${` and reported both React files in the live
 * consumer, which is how a check earns a reputation for crying wolf. */
const INTERPOLATION = /\brux-[a-z0-9-]*[-_]\$\{/g;

function collectDefined(dsDir) {
	const classes = new Set(), tokens = new Set();
	for (const file of walk(dsDir, [])) {
		if (!file.endsWith(".css")) continue;
		const css = stripComments(readFileSync(file, "utf8"));
		for (const m of css.matchAll(CLASS)) classes.add(m[0]);
		/* Only DECLARATIONS define a token. `var(--rux-x)` inside the system is
		   a use, and counting it would let a token the system merely reads
		   vouch for itself. */
		for (const m of css.matchAll(/(--rux-[a-z0-9-]+)\s*:/g)) tokens.add(m[1]);
	}
	return { classes, tokens };
}

function collectUsed(appDir, excludes) {
	const classes = new Map(), tokens = new Map(), interpolations = [], invented = new Map();
	const files = walk(appDir, excludes);
	for (const file of files) {
		const raw = readFileSync(file, "utf8");
		const text = stripComments(raw);
		const add = (map, key) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(file); };
		for (const m of text.matchAll(CLASS)) add(classes, m[0]);
		for (const m of text.matchAll(TOKEN)) add(tokens, m[0]);
		/* A --rux-* the consumer DECLARES is §4's other rule: application
		   styling belongs under the application's own prefix. */
		if (file.endsWith(".css")) {
			for (const m of text.matchAll(/(--rux-[a-z0-9-]+)\s*:/g)) add(invented, m[1]);
		}
		for (const line of text.split("\n")) {
			if (/rux-/.test(line) && INTERPOLATION.test(line)) {
				interpolations.push({ file, line: line.trim().slice(0, 120) });
			}
			INTERPOLATION.lastIndex = 0;
		}
	}
	return { classes, tokens, interpolations, invented, fileCount: files.length };
}

const args = parseArgs(process.argv);
const app = resolve(args.app);
if (!existsSync(app)) die(`--app not found: ${app}`);
const copies = findCopies(app).map((c) => resolve(c));
const ds = resolve(findDesignSystem(app, args.ds, copies));
/* every in-app copy, plus the compared one if it happens to be inside */
const excludes = [...new Set([...copies, ds, ...args.exclude.map((e) => resolve(app, e))])];

const defined = collectDefined(ds);
const used = collectUsed(app, excludes);

const rel = (f) => relative(app, f);
const undefinedClasses = [...used.classes].filter(([n]) => !defined.classes.has(n)).sort();
const undefinedTokens = [...used.tokens].filter(([n]) => !defined.tokens.has(n)).sort();
const inventedTokens = [...used.invented].sort();

const findings =
	undefinedClasses.length + undefinedTokens.length + used.interpolations.length + inventedTokens.length;

if (args.json) {
	process.stdout.write(JSON.stringify({
		app, designSystem: ds, filesScanned: used.fileCount,
		definedClasses: defined.classes.size, definedTokens: defined.tokens.size,
		undefinedClasses: undefinedClasses.map(([n, f]) => ({ name: n, files: [...f].map(rel) })),
		undefinedTokens: undefinedTokens.map(([n, f]) => ({ name: n, files: [...f].map(rel) })),
		inventedTokens: inventedTokens.map(([n, f]) => ({ name: n, files: [...f].map(rel) })),
		interpolations: used.interpolations.map((i) => ({ file: rel(i.file), line: i.line })),
		findings,
	}, null, 2) + "\n");
	process.exit(findings ? 1 : 0);
}

const out = (s = "") => process.stdout.write(s + "\n");
out(`Rux UI consumer check`);
out(`  application:   ${app}`);
out(`  design system: ${rel(ds) || ds}`);
out(`  scanned:       ${used.fileCount} files against ${defined.classes.size} classes and ${defined.tokens.size} tokens`);
out();

const report = (title, rows, note) => {
	if (!rows.length) return;
	out(`✗ ${title} (${rows.length})`);
	if (note) out(`  ${note}`);
	for (const [name, files] of rows) {
		out(`    ${name}`);
		for (const f of [...files].slice(0, 4)) out(`      ${rel(f)}`);
		if (files.size > 4) out(`      … ${files.size - 4} more`);
	}
	out();
};

report("rux- classes the shipped copy does not define", undefinedClasses,
	"Either the design system renamed or removed them, or this application invented them.\nBoth are §4 violations, and neither is a build error.");
report("--rux-* tokens the shipped copy does not define", undefinedTokens,
	"These resolve to nothing at runtime, silently.");
report("--rux-* tokens this application declares", inventedTokens,
	"§4: application styling belongs under the application's own prefix.");

if (used.interpolations.length) {
	out(`✗ interpolation into the rux- namespace (${used.interpolations.length})`);
	out(`  §4: builds names this system never defined, and no gate can catch the result.`);
	for (const i of used.interpolations.slice(0, 10)) out(`    ${rel(i.file)}\n      ${i.line}`);
	if (used.interpolations.length > 10) out(`    … ${used.interpolations.length - 10} more`);
	out();
}

if (!findings) {
	out("✓ every rux- name this application uses is defined by the copy it ships.");
	process.exit(0);
}
out(`${findings} finding(s). See docs/design-system-distribution.md §4.`);
process.exit(1);
