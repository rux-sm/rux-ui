/* Rule R4 — namespace everything portable.
 *
 * data-rux-* for attributes, --rux-* for public custom properties, --_* for
 * private ones (ONE private convention, not two), rux: for events, rux- for
 * keyframes — all only inside rux-ui/.
 *
 * The audit found the data-* prefix split roughly 50/50 in the portable layer,
 * three private-property conventions where there should be one, and an
 * application keyframe wearing the rux- prefix. An unprefixed public name in a
 * layer meant to be copied into other projects is a collision waiting to
 * happen: the consuming application has no way to know the name is taken.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const collect = (dir, prefix, ext, out) => {
	for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
		if (entry.isDirectory()) collect(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`, ext, out);
		else if (entry.name.endsWith(ext)) out.push(`${prefix}${entry.name}`);
	}
	return out;
};

const portableCssPaths = collect(new URL("rux-ui/css/", root), "rux-ui/css/", ".css", []);
const portableCss = portableCssPaths.map((path) => ({ name: path, css: stripComments(read(path)) }));
const portableJs = collect(new URL("rux-ui/js/", root), "rux-ui/js/", ".js", [])
	.map((path) => ({ name: path, source: read(path) }));
const appCssPaths = collect(new URL("scheduler/css/", root), "scheduler/css/", ".css", []);

/* Unprefixed attributes the portable layer selects on. Each is a public name
 * the layer has claimed without namespacing it. This list must shrink; see
 * audit finding B7. data-theme is deliberately absent from it — see below. */
const ACCEPTED_BARE_ATTRIBUTES = new Map([
	["data-placement", "written by popover.js, matched by menu.css and popover.css — audit B7"],
	["data-tooltip", "public authoring attribute, paired with data-rux-tooltip — audit B7"],
	["data-sort", "table.css CSS-only contract; no behavior module owns it yet — audit A2"],
	["data-col", "table.css column hook — audit A2"],
	["data-col-filter", "table.css CSS-only contract — audit A2"],
	["data-dismiss", "notifications.css; cannot simply become data-rux-dismiss, which already means 'close the nearest modal' in utilities.js"],
	["data-priority", "badges.css priority-dot hook — audit B7"],
]);

/* Unprefixed custom properties declared in the portable layer. */
const ACCEPTED_BARE_PROPERTIES = new Map([
	["--drawer-width", "drawer.css/drawer.js geometry channel — audit B7"],
	["--drawer-open-width", "drawer.css/drawer.js geometry channel — audit B7"],
	["--mobile-drawer-translate-x", "drawer.css mobile transform — audit B7"],
]);

/* ── Tests ───────────────────────────────────────────────────────────────── */

test("data-theme is the one intentionally bare attribute", () => {
	// It is the de-facto cross-project name for a colour-scheme switch, it sits
	// on <html> rather than on any component, and tokens.css is built around
	// [data-theme="light"]. Namespacing it would be a rename with no upside, so
	// it is excluded by design rather than by an accepted-debt entry.
	const tokens = read("rux-ui/css/tokens.css");
	assert.match(tokens, /\[data-theme="light"\]/);
});

test("the portable layer selects only on namespaced data attributes", () => {
	const bare = new Set();
	for (const { css } of portableCss) {
		for (const [, attr] of css.matchAll(/\[(data-[a-z][a-z0-9-]*)/g)) {
			if (attr.startsWith("data-rux-") || attr === "data-theme") continue;
			bare.add(attr);
		}
	}
	const unexpected = [...bare].filter((a) => !ACCEPTED_BARE_ATTRIBUTES.has(a)).sort();
	assert.deepEqual(
		unexpected,
		[],
		`The portable layer selects on unprefixed data attributes. A consuming ` +
			`application cannot know these names are taken. Use data-rux-*.`,
	);
});

test("the portable layer declares only namespaced custom properties", () => {
	const bare = new Set();
	for (const { css } of portableCss) {
		for (const [, prop] of css.matchAll(/(?:^|[;{]\s*)(--[a-z][a-z0-9-]*)\s*:/gim)) {
			if (prop.startsWith("--rux-") || prop.startsWith("--_")) continue;
			bare.add(prop);
		}
	}
	const unexpected = [...bare].filter((p) => !ACCEPTED_BARE_PROPERTIES.has(p)).sort();
	assert.deepEqual(
		unexpected,
		[],
		`The portable layer declares unprefixed custom properties. Public ones are ` +
			`--rux-*; internal ones are --_*.`,
	);
});

test("private custom properties use one convention", () => {
	// --_rux-* and --_* both mean "private to this file". Two spellings of one
	// idea is the same defect as two names for one modifier: the next author
	// has to guess, and every guess compounds.
	const offenders = new Set();
	for (const { name, css } of portableCss) {
		for (const [, prop] of css.matchAll(/(--_rux-[a-z0-9-]+)/g)) offenders.add(`${name} → ${prop}`);
	}
	for (const { name, source } of portableJs) {
		for (const [, prop] of source.matchAll(/(--_rux-[a-z0-9-]+)/g)) offenders.add(`${name} → ${prop}`);
	}
	assert.deepEqual(
		[...offenders].sort(),
		[],
		`These use the --_rux-* private convention. The layer already uses --_* for ` +
			`the same purpose; the "rux" adds nothing to a name that never escapes its file.`,
	);
});

test("every custom event is namespaced and past tense", () => {
	const offenders = [];
	for (const { name, source } of portableJs) {
		for (const [, event] of source.matchAll(/new CustomEvent\(\s*["']([^"']+)["']/g)) {
			if (!event.startsWith("rux:")) {
				offenders.push(`${name} → ${event} (missing rux: prefix)`);
				continue;
			}
			const verb = event.split("-").pop();
			if (!verb.endsWith("ed")) offenders.push(`${name} → ${event} (not past tense)`);
		}
	}
	assert.deepEqual(
		offenders.sort(),
		[],
		`Events are rux:<noun>-<verb>ed — namespaced, and past tense because a ` +
			`listener is told what happened, not what is about to.`,
	);
});

test("keyframes are namespaced by the layer that owns them", () => {
	const offenders = [];
	for (const { name, css } of portableCss) {
		for (const [, frames] of css.matchAll(/@keyframes\s+([A-Za-z][\w-]*)/g)) {
			if (!frames.startsWith("rux-")) offenders.push(`${name} → @keyframes ${frames}`);
		}
	}
	for (const path of appCssPaths) {
		for (const [, frames] of stripComments(read(path)).matchAll(/@keyframes\s+([A-Za-z][\w-]*)/g)) {
			if (frames.startsWith("rux-")) offenders.push(`${path} → @keyframes ${frames}`);
		}
	}
	assert.deepEqual(
		offenders.sort(),
		[],
		`A keyframe name is global to the document. The portable layer's are rux-*; ` +
			`the application's must not be, or a consumer's animation can be silently ` +
			`overridden by the app it was vendored into.`,
	);
});

test("accepted-bare lists stay honest", () => {
	const allCss = portableCss.map(({ css }) => css).join("\n")
		+ portableJs.map(({ source }) => source).join("\n");
	for (const [attr, reason] of ACCEPTED_BARE_ATTRIBUTES) {
		assert.ok(allCss.includes(`[${attr}`), `[${attr}] is accepted debt but is no longer selected on. Remove the entry (${reason}).`);
	}
	for (const [prop, reason] of ACCEPTED_BARE_PROPERTIES) {
		assert.ok(allCss.includes(prop), `${prop} is accepted debt but is no longer declared. Remove the entry (${reason}).`);
	}
});
