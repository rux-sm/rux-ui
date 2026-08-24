/* Enforces docs/foundations/forms.md, which its D4 recorded as arriving with
   no test at all — the one foundation document whose rules were stated and
   checked by nothing.
 *
 * Two surfaces, because the rules do not care which one renders a control:
 * the HTML entrypoints, and the modules under js/ that build markup in
 * template literals. Step 7 covered only the first and said so; D1's three
 * panels were the reason step 8 added the second.
 *
 * What this suite does NOT cover, said once here rather than per test:
 *
 *  - §2.1 (a control is composed as a field). Most controls with no
 *    .rux-field ancestor are correct — a .rux-switch or .rux-checkbox inside
 *    its own <label>, a colour-swatch radio, a hidden file input behind a
 *    button, a number stepper, a slider, a toolbar search. §2.1 publishes no
 *    exemption vocabulary, so a test cannot tell those from the real gaps.
 *    That is forms.md Q4, and it blocks the rule rather than this file.
 *  - §2.2's "noun" half. Reading Passengers board at as a verb phrase (D3)
 *    needs part-of-speech knowledge; only the casing half is mechanical, and
 *    only on the HTML surface — a JS label is often an interpolation whose
 *    text is data, not copy.
 *  - §2.5 (validate on blur). Behavioural, and nothing static can see it.
 *
 * Pages are discovered, never listed — see tests/pages.mjs for what a
 * hand-maintained list cost this repository twice. The js/ walk is the same
 * principle: a new module is covered by construction. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { htmlPages } from "./pages.mjs";

const root = new URL("../", import.meta.url);
const CONTROLS = new Set(["input", "select", "textarea"]);
const VOID = new Set([
	"area", "base", "br", "col", "embed", "hr", "img",
	"input", "link", "meta", "source", "track", "wbr",
]);

const attr = (attrs, name) =>
	(attrs.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

/* Text a screen reader would announce: an aria-hidden subtree is not it. The
   theme toggle is why this exists — its <label> holds two Material Symbols
   ligature spans, both aria-hidden, so the label is text-free and its input's
   aria-label is the only name it has. Counting the ligatures as label text
   made it read as a §2.6 violation when it is the opposite. */
function accessibleText(html) {
	const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
	let out = "", cursor = 0, hidden = 0, m;
	const stack = [];
	while ((m = tagRe.exec(html))) {
		if (!hidden) out += html.slice(cursor, m.index);
		cursor = m.index + m[0].length;
		const name = m[2].toLowerCase();
		if (m[1]) {
			for (let i = stack.length - 1; i >= 0; i--) {
				if (stack[i].name === name) {
					if (stack[i].hidden) hidden -= 1;
					stack.length = i;
					break;
				}
			}
			continue;
		}
		const isHidden = attr(m[3], "aria-hidden") === "true";
		if (VOID.has(name) || m[4]) continue;
		if (isHidden) hidden += 1;
		stack.push({ name, hidden: isHidden });
	}
	if (!hidden) out += html.slice(cursor);
	/* A JS template's ${...} is data, not text — but a label that holds only an
	   interpolation still has a name at runtime, so it counts as text. */
	return out.replace(/\s+/g, " ").trim();
}

/* One walk per surface: every control with the <label> elements enclosing it,
   and every label with its own content. Label nodes are shared by reference,
   so a control's enclosing label carries its inner HTML once the walk closes
   it. */
function scan(html) {
	const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
	const stack = [], controls = [], labels = [];
	let m;
	while ((m = tagRe.exec(html))) {
		const [full, close, raw, attrs, self] = m;
		const name = raw.toLowerCase();
		if (close) {
			for (let i = stack.length - 1; i >= 0; i--) {
				if (stack[i].name === name) {
					stack[i].inner = html.slice(stack[i].contentStart, m.index);
					stack.length = i;
					break;
				}
			}
			continue;
		}
		const node = { name, attrs, start: m.index, contentStart: m.index + full.length, inner: "" };
		if (name === "label") labels.push(node);
		if (CONTROLS.has(name)) {
			controls.push({ ...node, labels: stack.filter((n) => n.name === "label") });
		}
		if (!VOID.has(name) && !self) stack.push(node);
	}
	return { controls, labels };
}

const lineOf = (html, index) => html.slice(0, index).split("\n").length;

const jsModules = () => {
	const found = [];
	const walk = (dir) => {
		for (const entry of readdirSync(fileURLToPath(new URL(dir, root)), { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith(".js")) found.push(path);
		}
	};
	walk("js");
	return found.sort();
};

/* A JS comment is prose, and prose mentions tags: doc-viewer.js and
   trip-envelope.js both explain that "a <select>" needs boot(), and the walk
   read those two sentences as two unnamed selects. Comments are blanked rather
   than deleted so every line number still points where it did. Only comments
   opening a line are touched — a // inside a string is usually a URL, and
   blanking from there would swallow real markup after it. */
const blank = (match) => match.replace(/[^\n]/g, " ");
const withoutComments = (source) =>
	source
		.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)
		.replace(/^[ \t]*\/\/.*$/gm, blank);

const surfaces = [...htmlPages(), ...jsModules()].map((name) => {
	const raw = readFileSync(new URL(name, root), "utf8");
	const html = name.endsWith(".html") ? raw : withoutComments(raw);
	return {
		name,
		html,
		markup: name.endsWith(".html"),
		...scan(html),
		ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
	};
});

/* A control is named by a <label for>, by an enclosing <label> that has text,
   or by ARIA. The placeholder is deliberately not on this list — that is the
   rule.
 *
 * In a JS template both the label's for= and the control's id= are the same
 * unevaluated string ("post-trip-note-${trip.id}"), so matching them as text
 * resolves the pair without evaluating anything. */
const namedBy = (surface, control) => {
	const id = attr(control.attrs, "id");
	const forLabel = id !== undefined && surface.labels.some((l) => {
		const target = attr(l.attrs, "for");
		/* Exact first: a JS id interpolates as "tp-ticket-label-${index + 1}",
		   whose spaces are inside the expression, not between two targets.
		   Splitting first read that as three ids and matched none of them. */
		return target === id || target?.split(/\s+/).includes(id);
	});
	const wrapping = control.labels.some((l) => accessibleText(l.inner) !== "");
	return {
		real: Boolean(forLabel || wrapping),
		aria: Boolean(attr(control.attrs, "aria-label") ?? attr(control.attrs, "aria-labelledby")),
	};
};

const at = (surface, control) => `${surface.name}:${lineOf(surface.html, control.start)} ${attr(control.attrs, "id") ?? attr(control.attrs, "class") ?? "(anonymous)"}`;

test("a placeholder never substitutes for a label (§2.3)", () => {
	const bare = [];
	for (const surface of surfaces) {
		for (const control of surface.controls) {
			if (attr(control.attrs, "type") === "hidden") continue;
			if (attr(control.attrs, "placeholder") === undefined) continue;
			const name = namedBy(surface, control);
			if (!name.real && !name.aria) bare.push(at(surface, control));
		}
	}
	assert.deepEqual(bare, [],
		"These controls are named only by their placeholder, which is gone the moment " +
		"the field is filled. Give each a label — forms.md §2.3.");
});

/* The same rule, one step further in. An aria-label equal to the placeholder
   is the placeholder acting as the label with a second copy for ARIA — the
   accessible name is still the placeholder string. §2.3 is what forbids it;
   naming it separately is only so the failure message can say which shape it
   found. tasks-panel's requirement detail input was written this way. */
test("an aria-label is not a copy of the placeholder (§2.3)", () => {
	const laundered = [];
	for (const surface of surfaces) {
		for (const control of surface.controls) {
			const placeholder = attr(control.attrs, "placeholder");
			if (placeholder === undefined) continue;
			if (attr(control.attrs, "aria-label") === placeholder) laundered.push(at(surface, control));
		}
	}
	assert.deepEqual(laundered, [],
		"aria-label repeats the placeholder verbatim, so the placeholder is still the " +
		"label. Name the control for what it holds — forms.md §2.3.");
});

/* Recorded gaps, not sanctioned ones — the gallery-coverage idiom. These
   three put a SECOND name on a control that has a real label, and each does it
   for a reason §2.6 does not cover: two disambiguate a field repeated once per
   driver row ("Meet / swap time" is the same label three times over), and one
   carries state rather than identity (the resting address either shows or
   inherits). The composed-name answer — aria-labelledby naming the row title
   AND the field label — needs ids on markup that has none, so it is forms.md
   Q5 rather than a fix smuggled in here. Deleting a line is the goal; adding
   one needs Q5 answered first. */
const KNOWN_DOUBLE_NAMED = [
	"js/components/itinerary.js:1059",
	"js/panels/trip-panel.js:174",
	"js/panels/trip-panel.js:178",
];

test("no second accessible name beside a real label (§2.6)", () => {
	const doubled = [];
	for (const surface of surfaces) {
		for (const control of surface.controls) {
			const name = namedBy(surface, control);
			if (!name.real || !name.aria) continue;
			const where = `${surface.name}:${lineOf(surface.html, control.start)}`;
			if (!KNOWN_DOUBLE_NAMED.includes(where)) doubled.push(at(surface, control));
		}
	}
	assert.deepEqual(doubled, [],
		"These controls carry aria-label AND a real label, so the accessible name comes " +
		"from two places that can disagree — tp-est-mi read \"Est. Miles\" and " +
		"\"Estimated miles\" at once. Drop the aria-label — forms.md §2.6.");
});

test("every <label for> resolves to a control (§2.6)", () => {
	const dangling = [];
	for (const surface of surfaces.filter((s) => s.markup)) {
		for (const label of surface.labels) {
			for (const id of (attr(label.attrs, "for") ?? "").split(/\s+/).filter(Boolean)) {
				if (!surface.ids.has(id)) dangling.push(`${surface.name}:${lineOf(surface.html, label.start)} for="${id}"`);
			}
		}
	}
	assert.deepEqual(dangling, [],
		"A label pointing at nothing does not move focus and names no control — forms.md §2.6.");
});

test("help text a control points at exists (§2.4)", () => {
	const dangling = [];
	for (const surface of surfaces.filter((s) => s.markup)) {
		for (const control of surface.controls) {
			for (const id of (attr(control.attrs, "aria-describedby") ?? "").split(/\s+/).filter(Boolean)) {
				if (!surface.ids.has(id)) dangling.push(`${surface.name}:${lineOf(surface.html, control.start)} aria-describedby="${id}"`);
			}
		}
	}
	assert.deepEqual(dangling, [],
		"aria-describedby pointing at nothing announces no help text — forms.md §2.4.");
});

test("a control wears its own block class (§1, §2.8)", () => {
	const wrong = [];
	for (const surface of surfaces) {
		for (const control of surface.controls) {
			const expected = { select: "rux-select", textarea: "rux-textarea" }[control.name];
			if (!expected) continue;
			const cls = attr(control.attrs, "class") ?? "";
			if (!cls.split(/\s+/).includes(expected)) {
				wrong.push(`${surface.name}:${lineOf(surface.html, control.start)} <${control.name} class="${cls}">`);
			}
		}
	}
	assert.deepEqual(wrong, [],
		"A textarea wearing .rux-input takes the input's flat padding and single-line " +
		"leading. §2.8 picks the control; §1 names its class.");
});

/* Enforces content.md rule 2.3, not forms.md §2.2 — §2.2 keeps the noun and
   defers the casing, which is why this cites the document that owns it. An
   all-caps word is an acronym and passes; the rule is about Title Casing an
   ordinary word. forms.md step 5 recased the app by hand and its live-DOM
   sweep still missed "Est. Miles" and "Pick-up Location", which is the case
   for a test rather than a census. */
const CASING_EXCEPTIONS = new Set([
	"Google Messages URL", // proper noun + acronym; step 5's recorded leave
]);

test("a field label is sentence case (content.md rule 2.3)", () => {
	const titled = [];
	for (const surface of surfaces.filter((s) => s.markup)) {
		for (const m of surface.html.matchAll(/class="[^"]*rux-field__label[^"]*"[^>]*>\s*([^<]{1,80})</g)) {
			const text = m[1].trim().replace(/\s+/g, " ");
			if (!text || CASING_EXCEPTIONS.has(text)) continue;
			const capitalised = text.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]/.test(w));
			if (capitalised.length) titled.push(`${surface.name}:${lineOf(surface.html, m.index)} "${text}"`);
		}
	}
	assert.deepEqual(titled, [],
		"Field labels are sentence case — content.md rule 2.3, decided 2026-08-18.");
});

test("a recorded double-name is still there, or its line comes off the list (§2.6)", () => {
	const live = new Set();
	for (const surface of surfaces) {
		for (const control of surface.controls) {
			const name = namedBy(surface, control);
			if (name.real && name.aria) live.add(`${surface.name}:${lineOf(surface.html, control.start)}`);
		}
	}
	assert.deepEqual(
		KNOWN_DOUBLE_NAMED.filter((where) => !live.has(where)),
		[],
		"This line no longer double-names a control — either it was fixed, in which case " +
		"delete it from KNOWN_DOUBLE_NAMED, or it moved, in which case the entry is now " +
		"pinning the wrong line and hiding a real one.");
});
