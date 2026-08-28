import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* Enforcement for docs/foundations/typography.md rules 2.1 and 2.2, and
 * docs/foundations/color.md rule 2.1 — the negative space none of the other
 * suites cover.
 *
 * Every other test here checks that something IS what it should be: a token
 * resolves, a scale has ten steps, a pair clears AA. None of them can see a
 * declaration that never reached for a token at all. That is why six unitless
 * leadings survived 54 typography steps and 18 colour steps untouched — each
 * step verified what it named, and no step had named them.
 *
 * typography.md §5 steps 56 and 57 · color.md §5 step 19.
 */

/* Tier 0 is where values live; everything above it must reach for a token. */
const EXEMPT_ALL = new Map([
	["rux-ui/css/tokens.css", "Tier 0 — the one place a literal is the point"],
	["scheduler/css/tokens.css", "the application's Tier 0 overlay"],
]);

/* Print is no longer exempt wholesale. Step 61 tokenised every weight on paper
   — the catalog already published 500, 700 and 800, so it cost nothing and
   changed no rendered value — which means a literal `font-weight` in a print
   file now fails here exactly as it would on screen.

   Two axes stay open, and they are open on the merits rather than by default:
   `font-size`, because rule 2.1's stated reason for `rem` is that a reader can
   raise their browser's default, and paper has no such control — so `pt` in
   trip-envelope.css may be more correct than `rem`, not less; and
   `line-height`, which print sets to 1 in 19 places that have never been
   sorted into marks and words the way screen's twenty-two were. Both are
   recorded as open steps, and colour likewise: the --print- and --env- palettes
   are a coherent two-stop ink system that has to be remapped deliberately, not
   swept. */
const PRINT = new Map([
	["scheduler/css/features/print-schedule.css", "print surface — typography.md §7.3 S2"],
	["scheduler/css/features/trip-envelope.css", "print surface — typography.md §7.3 S2"],
	["scheduler/css/features/driver-sheet.css", "print surface — typography.md §7.3 S2"],
]);
const PRINT_STILL_LITERAL = new Set(["font-size", "line-height"]);

/* rule 2.2, "One exception: a glyph box is not a type role" — the closed list
 * that paragraph refers to. Every entry is a MARK, not a word: an icon, an
 * emoji, a count badge, a ::after marker. `line-height: 1` collapses the line
 * box onto the glyph box so the mark centres in a fixed circle or square.
 *
 * A selector joins this list by rendering a mark. Nothing that renders as
 * language qualifies, however short — that is what PENDING_TEXT_RESET is for,
 * and the two lists are separate so the second cannot hide inside the first.
 * It did once: step 56 described all of these as "badges, emoji and icons" when
 * ten of the twenty-two were real text. */
const GLYPH_BOX = new Set([
	".rux-icon",
	".rux-ui-header__badge-count",
	".rux-side-nav__badge",
	".sched-driver-grid__cell--conflict::after",
	".sched-scheduler__now-line::after",
	".sched-trip-itinerary__marker-pin",
	".sched-team-chat__reaction-emoji",
	".sched-team-chat__message-emoji",
	".sched-team-chat__emoji-option",
	".sched-tasks__segment-status",
	".sched-tasks__tab-badge",
	".sched-tasks__nav-alert",
]);

/* Real text that was still running at `line-height: 1` — rule 2.2 defects,
 * not exceptions. Steps 58, 59 and 60 cleared all ten: six whose boxes were
 * pinned by a fixed height, three that reflowed onto label-12, and one that
 * had no matching role and adapted to copy-24 under README.md §2.6.
 *
 * EMPTY IS THE POINT. The list stays so a regression has somewhere to be
 * argued rather than quietly added to GLYPH_BOX — every `line-height: 1` on
 * screen is now a mark, not a word. */
const PENDING_TEXT_RESET = new Map([]);

/* Literals that are not role values on any selector.
 *   letter-spacing: 0  is --rux-tracking-normal by another name — it resolves to
 *                      the identical computed value, so it carries no drift. */
const ALLOWED = new Map([
	["letter-spacing", new Set(["0", "normal", "inherit", "unset", "initial"])],
	["line-height", new Set(["inherit", "normal", "unset", "initial"])],
	["font-size", new Set(["inherit", "unset", "initial"])],
	["font-weight", new Set(["inherit", "unset", "initial"])],
	["font", new Set(["inherit", "unset", "initial"])],
]);

/* Sizing a glyph off the TYPE scale is the wrong axis — an icon is a box, not
 * a role — so these two are not fixed by pointing them at --rux-size-*. They
 * want an icon token, and neither value is on the icon scale that exists:
 * --rux-icon-sm/md/lg are 18/20/22px, so 14px sits below the floor and 40px far
 * above the ceiling. Publishing an --rux-icon-xs and a display size is
 * layout.md's call, since that document still has the scale open. Listed so the
 * count cannot grow quietly while it is. */
const PENDING_ICON_SIZING = new Map([
	["scheduler/css/features/trip-list.css", new Set(["14px"])],
	["scheduler/css/features/trip-request.css", new Set(["40px"])],
]);

const TYPE_PROPS = /^(font-size|line-height|font-weight|letter-spacing|font)$/;
const COLOR_FN = /(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\()/;
const COLOR_PROP = /(^|-)(color|background|border|outline|fill|stroke|shadow)/;
const NAMED = new Set([
	"white", "black", "red", "green", "blue", "yellow", "orange", "purple",
	"pink", "gray", "grey", "teal", "cyan", "magenta", "silver", "navy", "lime",
]);

function cssFiles(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) cssFiles(p, out);
		else if (name.endsWith(".css")) out.push(p);
	}
	return out;
}

/* Comments carry prose about white labels and 14px measurements; they are
 * rationale, not rules, and must not trip either check. Each declaration is
 * returned with the selector that opened its block, so an exception can be
 * keyed to a site rather than granted to a value everywhere. */
function declarations(css) {
	const out = [];
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
	let selector = "";
	let line = 0;
	for (const raw of stripped.split("\n")) {
		line++;
		const open = /^\s*([^{}]+?)\s*\{/.exec(raw);
		if (open && !/^\s*(@|--)/.test(raw)) selector = open[1].replace(/\s+/g, " ").trim();
		const m = /^\s*([a-zA-Z-]+)\s*:\s*([^;{]+);/.exec(raw);
		if (m) out.push({ line, selector, prop: m[1].toLowerCase(), value: m[2].trim() });
	}
	return out;
}

const FILES = [...cssFiles("rux-ui/css"), ...cssFiles("scheduler/css")]
	.filter((f) => !EXEMPT_ALL.has(f));

test("every exempt file still exists and is still exempt for a stated reason", () => {
	/* An exemption that outlives its file is a hole nobody notices. */
	for (const [f, why] of [...EXEMPT_ALL, ...PRINT]) {
		assert.ok(readFileSync(f, "utf8").length > 0, `${f} is exempt for "${why}" but is empty or gone`);
	}
	assert.ok(FILES.length > 40, `expected the whole CSS tree, walked only ${FILES.length} files`);
});

test("no type axis states a literal outside Tier 0 (typography rules 2.1, 2.2)", () => {
	const offenders = [];
	for (const file of FILES) {
		for (const { line, selector, prop, value } of declarations(readFileSync(file, "utf8"))) {
			if (!TYPE_PROPS.test(prop)) continue;
			if (value.startsWith("var(")) continue;
			if (PRINT.has(file) && PRINT_STILL_LITERAL.has(prop)) continue;
			if (ALLOWED.get(prop)?.has(value)) continue;
			/* `line-height: 1` and the Material Symbols ligature reset
			   (`font-weight: normal`, paired with `font-style: normal` while the
			   real weight rides font-variation-settings' wght axis) are legal
			   ONLY on a selector that renders a mark. */
			const marked = GLYPH_BOX.has(selector) || PENDING_TEXT_RESET.has(selector);
			if (prop === "line-height" && value === "1" && marked) continue;
			if (prop === "font-weight" && value === "normal" && GLYPH_BOX.has(selector)) continue;
			if (prop === "font" && !/[^v]/.test(value.replace(/var\([^)]*\)|[\s/]/g, ""))) continue;
			if (PENDING_ICON_SIZING.get(file)?.has(value)) continue;
			offenders.push(`${file}:${line}  ${selector} { ${prop}: ${value} }`);
		}
	}
	assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});

test("the glyph-box list stays closed, and the text-reset list only shrinks", () => {
	/* Both lists are claims about the tree, so the tree gets to refute them.
	   An entry that no longer matches anything is a stale exception; a real
	   defect could move in behind it. */
	const seen = new Set();
	for (const file of FILES) {
		if (PRINT.has(file)) continue;
		for (const { selector, prop, value } of declarations(readFileSync(file, "utf8"))) {
			if (prop === "line-height" && value === "1") seen.add(selector);
		}
	}
	const staleGlyph = [...GLYPH_BOX].filter((s) => !seen.has(s));
	const stalePending = [...PENDING_TEXT_RESET.keys()].filter((s) => !seen.has(s));
	assert.deepEqual(staleGlyph, [], "glyph-box entries matching nothing — remove them");
	assert.deepEqual(
		stalePending,
		[],
		"text-reset entries matching nothing: if step 58b fixed them, delete the entries in the same change",
	);
	assert.equal(PENDING_TEXT_RESET.size, 0, "steps 58-60 took this from 10 to 0. It must never grow.");
});

test("no colour is stated as a literal outside Tier 0 (color.md rule 2.1)", () => {
	/* Derived colour is not a literal: oklch(from var(--rux-white) ...) and
	   color-mix(in oklab, var(--rux-accent) ...) both resolve THROUGH a token,
	   so they move when the token moves — which is the whole point of the rule.
	   A colour function with no var() behind it is the thing that cannot. */
	const offenders = [];
	for (const file of FILES) {
		if (PRINT.has(file)) continue;
		for (const { line, prop, value } of declarations(readFileSync(file, "utf8"))) {
			if (COLOR_FN.test(value) && !/var\(--/.test(value) && !/currentColor/i.test(value)) {
				offenders.push(`${file}:${line}  ${prop}: ${value}`);
				continue;
			}
			if (!COLOR_PROP.test(prop)) continue;
			for (const word of value.split(/[\s,()/]+/)) {
				if (NAMED.has(word.toLowerCase())) offenders.push(`${file}:${line}  ${prop}: ${value}`);
			}
		}
	}
	assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});
