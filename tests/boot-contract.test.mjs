/* Contract for rux-ui/js/boot.js.
 *
 * boot() is the one part of the behavior layer with no DOM dependency of its
 * own — it reads window.Rux[name].init and calls it — so its contract can be
 * exercised directly rather than asserted about as text. What matters is the
 * order it runs scanners in, that a module a consumer did not vendor is
 * skipped rather than thrown on, and that the caller's root is passed through
 * unchanged. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(fileURLToPath(new URL("../rux-ui/js/boot.js", import.meta.url)), "utf8");

/* Run boot.js against a stand-in window. No DOM is needed: the module touches
 * `document` only as the default root, and never dereferences it. */
/* boot() builds its result array inside the vm realm, so its prototype is that
 * realm's Array.prototype and deepStrictEqual rejects it despite identical
 * contents. Copy it into this realm before comparing — the alternative is
 * loose equality, which would weaken every assertion here. */
const ran = (result) => Array.from(result);

function load({ modules = {}, document = { NAME: "document" } } = {}) {
	const calls = [];
	const Rux = {};
	for (const [name, present] of Object.entries(modules)) {
		if (!present) continue;
		Rux[name] = { init: (scope) => calls.push([name, scope]) };
	}
	const context = { window: { Rux }, document };
	vm.createContext(context);
	vm.runInContext(source, context);
	return { boot: context.window.Rux.boot, calls, context };
}

const ALL = { theme: true, utilities: true, controls: true, uiShell: true };

test("boot runs the scanners in the documented order", () => {
	const { boot, calls } = load({ modules: ALL });
	boot();
	assert.deepEqual(
		calls.map(([name]) => name),
		["theme", "utilities", "controls", "uiShell"],
		"theme must settle the palette before anything is wired, and ui-shell frames the rest",
	);
});

test("boot reports which scanners actually ran", () => {
	const { boot } = load({ modules: ALL });
	assert.deepEqual(ran(boot()), ["theme", "utilities", "controls", "uiShell"]);
});

test("a module the consumer did not vendor is skipped, not an error", () => {
	// The css-only and partial profiles are supported, so an absent module is
	// an ordinary case rather than a misconfiguration.
	const { boot, calls } = load({ modules: { theme: true, uiShell: true } });
	assert.deepEqual(ran(boot()), ["theme", "uiShell"]);
	assert.equal(calls.length, 2);
});

test("boot with no modules loaded is a no-op rather than a throw", () => {
	const { boot } = load({ modules: {} });
	assert.deepEqual(ran(boot()), []);
});

test("the caller's root is passed to every scanner untouched", () => {
	const { boot, calls } = load({ modules: ALL });
	const panel = { NAME: "panel-subtree" };
	boot(panel);
	assert.ok(calls.length > 0);
	for (const [name, scope] of calls) {
		assert.equal(scope, panel, `${name} must scan the subtree it was given`);
	}
});

test("boot defaults to the document when called with no root", () => {
	const document = { NAME: "document" };
	const { boot, calls } = load({ modules: ALL, document });
	boot();
	for (const [, scope] of calls) assert.equal(scope, document);
});

test("boot does not claim DOMContentLoaded", () => {
	// Each module still boots itself in script order. If boot ever registered
	// its own listener, loading it would change how an existing page starts up,
	// which is exactly what it promises not to do.
	assert.equal(
		/addEventListener\(\s*["']DOMContentLoaded/.test(source),
		false,
		"boot.js must not register a DOMContentLoaded listener",
	);
});

test("a module without an init is skipped rather than called", () => {
	const context = { window: { Rux: { theme: {}, controls: { init: () => {} } } }, document: {} };
	vm.createContext(context);
	vm.runInContext(source, context);
	assert.deepEqual(ran(context.window.Rux.boot()), ["controls"]);
});
