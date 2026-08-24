/* Enforces docs/foundations/forms.md, which its D4 recorded as arriving with
   no test at all — the one foundation document whose rules were stated and
   checked by nothing.
 *
 * What this suite does NOT cover, said once here rather than per test:
 *
 *  - §2.1 (a control is composed as a field). 47 of index.html's 135 controls
 *    have no .rux-field ancestor and most of them are correct — a .rux-switch
 *    inside its own <label>, a colour-swatch radio, a hidden file input behind
 *    a button, a number stepper, a slider, a toolbar search. §2.1 publishes no
 *    exemption vocabulary, so a test cannot tell those from the real gaps.
 *    That is forms.md Q4, and it blocks the rule rather than this file.
 *  - §2.2's "noun" half. Reading Passengers board at as a verb phrase (D3)
 *    needs part-of-speech knowledge; only the casing half is mechanical.
 *  - §2.5 (validate on blur). Behavioural, and nothing static can see it.
 *  - The 73 controls rendered from template literals under js/. A page scan
 *    cannot reach them, which is exactly where D1's three panels sit.
 *
 * Pages are discovered, never listed — see tests/pages.mjs for what a
 * hand-maintained list cost this repository twice. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
	return out.replace(/\s+/g, " ").trim();
}

/* One walk per page: every control with the <label> elements enclosing it, and
   every label with its own content. Label nodes are shared by reference, so a
   control's enclosing label carries its inner HTML once the walk closes it. */
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

const pages = htmlPages().map((name) => {
	const html = readFileSync(new URL(name, root), "utf8");
	return { name, html, ...scan(html), ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) };
});

/* A control is named by a <label for>, by an enclosing <label> that has text,
   or by ARIA. The placeholder is deliberately not on this list — that is the
   rule. */
const namedBy = (page, control) => {
	const id = attr(control.attrs, "id");
	const forLabel = id && page.labels.some((l) => attr(l.attrs, "for")?.split(/\s+/).includes(id));
	const wrapping = control.labels.some((l) => accessibleText(l.inner) !== "");
	return {
		real: Boolean(forLabel || wrapping),
		aria: Boolean(attr(control.attrs, "aria-label") ?? attr(control.attrs, "aria-labelledby")),
	};
};

test("a placeholder never substitutes for a label (§2.3)", () => {
	const bare = [];
	for (const page of pages) {
		for (const control of page.controls) {
			if (attr(control.attrs, "type") === "hidden") continue;
			if (attr(control.attrs, "placeholder") === undefined) continue;
			const name = namedBy(page, control);
			if (!name.real && !name.aria) {
				bare.push(`${page.name}:${lineOf(page.html, control.start)} ${attr(control.attrs, "id") ?? "(no id)"}`);
			}
		}
	}
	assert.deepEqual(bare, [],
		"These controls are named only by their placeholder, which is gone the moment " +
		"the field is filled. Give each a label — forms.md §2.3.");
});

test("no second accessible name beside a real label (§2.6)", () => {
	const doubled = [];
	for (const page of pages) {
		for (const control of page.controls) {
			const name = namedBy(page, control);
			if (name.real && name.aria) {
				doubled.push(`${page.name}:${lineOf(page.html, control.start)} ${attr(control.attrs, "id") ?? "(no id)"}`);
			}
		}
	}
	assert.deepEqual(doubled, [],
		"These controls carry aria-label AND a real label, so the accessible name comes " +
		"from two places that can disagree — tp-est-mi read \"Est. Miles\" and " +
		"\"Estimated miles\" at once. Drop the aria-label — forms.md §2.6.");
});

test("every <label for> resolves to a control (§2.6)", () => {
	const dangling = [];
	for (const page of pages) {
		for (const label of page.labels) {
			for (const id of (attr(label.attrs, "for") ?? "").split(/\s+/).filter(Boolean)) {
				if (!page.ids.has(id)) dangling.push(`${page.name}:${lineOf(page.html, label.start)} for="${id}"`);
			}
		}
	}
	assert.deepEqual(dangling, [],
		"A label pointing at nothing does not move focus and names no control — forms.md §2.6.");
});

test("help text a control points at exists (§2.4)", () => {
	const dangling = [];
	for (const page of pages) {
		for (const control of page.controls) {
			for (const id of (attr(control.attrs, "aria-describedby") ?? "").split(/\s+/).filter(Boolean)) {
				if (!page.ids.has(id)) dangling.push(`${page.name}:${lineOf(page.html, control.start)} aria-describedby="${id}"`);
			}
		}
	}
	assert.deepEqual(dangling, [],
		"aria-describedby pointing at nothing announces no help text — forms.md §2.4.");
});

test("a control wears its own block class (§1, §2.8)", () => {
	const wrong = [];
	for (const page of pages) {
		for (const control of page.controls) {
			const expected = { select: "rux-select", textarea: "rux-textarea" }[control.name];
			if (!expected) continue;
			const cls = attr(control.attrs, "class") ?? "";
			if (!cls.split(/\s+/).includes(expected)) {
				wrong.push(`${page.name}:${lineOf(page.html, control.start)} <${control.name} class="${cls}">`);
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
	for (const page of pages) {
		for (const m of page.html.matchAll(/class="[^"]*rux-field__label[^"]*"[^>]*>\s*([^<]{1,80})</g)) {
			const text = m[1].trim().replace(/\s+/g, " ");
			if (!text || CASING_EXCEPTIONS.has(text)) continue;
			const capitalised = text.split(/\s+/).slice(1).filter((w) => /^[A-Z][a-z]/.test(w));
			if (capitalised.length) titled.push(`${page.name}:${lineOf(page.html, m.index)} "${text}"`);
		}
	}
	assert.deepEqual(titled, [],
		"Field labels are sentence case — content.md rule 2.3, decided 2026-08-18.");
});
