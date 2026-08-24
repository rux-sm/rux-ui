import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* Enforces docs/foundations/state.md rules 2.7-2.10, which its D5 recorded as
   arriving unenforced: the separator ARIA lived in drawer.js and the overlay
   behaviours in the kernel, but no suite asserted any of the four, and 2.8 and
   2.10 had no reader at all.

   Every page is scanned, not index.html alone. typography.md step 66 recorded
   the reason: a rename swept the documented location list and still missed
   examples/, because the list did not name it. A test that picks its files by
   hand inherits that blind spot. */
const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const pages = readdirSync(fileURLToPath(root))
	.filter((f) => f.endsWith(".html"))
	.map((f) => [f, read(f)])
	.concat(
		readdirSync(fileURLToPath(new URL("examples/", root)))
			.filter((f) => f.endsWith(".html"))
			.map((f) => [`examples/${f}`, read(`examples/${f}`)]),
	);

const drawerJs = read("rux-ui/js/drawer.js");
const drawerCss = read("rux-ui/css/base/drawer.css");

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const idsIn = (html) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

test("2.7 — an overlay drawer is named and its trigger is wired to it", () => {
	for (const [name, html] of pages) {
		const ids = idsIn(html);
		for (const m of html.matchAll(/<nav\b[^>]*rux-side-nav--overlay[^>]*>/g)) {
			const a = attrs(m[0]);
			assert.ok(a["aria-label"] || a["aria-labelledby"], `${name}: overlay nav without an accessible name`);
			assert.ok(a.id, `${name}: overlay nav needs an id for its trigger to control`);
			assert.match(m[0], /data-rux-side-nav\b/, `${name}: overlay nav not registered with the kernel`);

			const toggle = [...html.matchAll(/<button\b[^>]*data-rux-side-nav-toggle[^>]*>/g)]
				.map((t) => attrs(t[0]))
				.find((t) => t["aria-controls"] === a.id);
			assert.ok(toggle, `${name}: no trigger controls #${a.id}`);
			assert.ok("aria-expanded" in toggle, `${name}: trigger for #${a.id} has no aria-expanded`);
		}
	}
	// Escape and focus restoration are rule 2.5's kernel, asserted by
	// overlay-kernel.test.mjs. Cited rather than re-tested: two suites
	// asserting one contract is the duplication the one-home rule forbids.
	assert.match(read("rux-ui/js/overlay.js"), /Escape/);
});

test("2.8 — a non-modal drawer does not borrow dialog semantics", () => {
	for (const [name, html] of pages) {
		for (const m of html.matchAll(/<(?:aside|div|section)\b[^>]*class="[^"]*rux-(?:drawer|panel--attached)[^"]*"[^>]*>/g)) {
			const a = attrs(m[0]);
			if (a.role !== "dialog") continue;
			// Borrowing the role is only honest with the machinery behind it.
			assert.equal(
				a["aria-modal"], "true",
				`${name}: an attached panel or drawer carries role="dialog" without aria-modal — ` +
				`state.md 2.8 and shell.md's "persistent attached panels MUST NOT use role=dialog"`,
			);
		}
	}
});

test("2.9 — a resize separator is keyboard operable and describes what it controls", () => {
	let found = 0;
	for (const [name, html] of pages) {
		const ids = idsIn(html);
		for (const m of html.matchAll(/<div\b[^>]*rux-resize-gutter[^>]*>/g)) {
			found += 1;
			const a = attrs(m[0]);
			assert.equal(a.role, "separator", `${name}: resize gutter without role="separator"`);
			assert.ok(a["aria-orientation"], `${name}: separator without aria-orientation`);
			assert.ok(a["aria-label"] || a["aria-labelledby"], `${name}: separator without an accessible name`);
			assert.ok(a["aria-controls"], `${name}: separator does not say what it controls`);
			assert.ok(ids.has(a["aria-controls"]),
				`${name}: separator controls #${a["aria-controls"]}, which does not exist`);
			assert.equal(a.tabindex, "0", `${name}: separator is not keyboard reachable`);
		}
	}
	assert.ok(found > 0, "no separators found — this test would pass vacuously");
	// The value triplet is runtime state, so it is asserted at its source.
	for (const attr of ["aria-valuemin", "aria-valuemax", "aria-valuenow"]) {
		assert.match(drawerJs, new RegExp(`"${attr}"`), `drawer.js never sets ${attr}`);
	}
});

test("2.10 — a separator exists only while its panel is open, and never discloses it", () => {
	// Visible only while open: the gutter is gated on the drawer's open state.
	assert.match(
		drawerCss.replace(/\/\*[\s\S]*?\*\//g, ""),
		/\.rux-drawer\.is-open[^{]*\.rux-resize-gutter|\.rux-resize-gutter:has\(\s*\+\s*\.rux-drawer\.is-open/,
		"drawer.css does not gate the resize gutter on its drawer being open",
	);
	// Operable only while open: the keydown handler refuses a closed drawer.
	const keydown = drawerJs.slice(drawerJs.indexOf('handle.addEventListener("keydown"'));
	const body = keydown.slice(0, keydown.indexOf("\n\t\t});"));
	assert.match(body, /if \(!isOpen\(\)\) return;/,
		"the separator's keydown handler does not refuse a closed drawer");
	// Not a disclosure control: no open-on-activate, and no expanded state.
	assert.doesNotMatch(body, /"Enter"|" "/, "the separator handles an activation key");
	assert.doesNotMatch(drawerJs, /handle\.addEventListener\("click"/, "the separator handles click");
	for (const [name, html] of pages) {
		for (const m of html.matchAll(/<div\b[^>]*rux-resize-gutter[^>]*>/g)) {
			assert.ok(!("aria-expanded" in attrs(m[0])),
				`${name}: a separator carries aria-expanded — it is doubling as a disclosure control`);
		}
	}
});
