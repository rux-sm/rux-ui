/* init(root) must be safe to call more than once over the same markup.
 *
 * createSideNav binds listeners, so before this guard existed a second init
 * over the same nav attached a second click handler to the toggle — every
 * click would then open and immediately close it. That is easy to reintroduce
 * and invisible in a static check, and Rux.boot(root) makes repeat calls the
 * normal case rather than an edge one. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(fileURLToPath(new URL("../rux-ui/js/ui-shell.js", import.meta.url)), "utf8");

function element(children = {}) {
	const classes = new Set();
	const el = {
		listeners: [],
		attrs: {},
		inert: false,
		addEventListener(type, fn) { this.listeners.push([type, fn]); },
		setAttribute(name, value) { this.attrs[name] = value; },
		querySelector: (selector) => children[selector] ?? null,
		focus() {},
		classList: {
			toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
			contains: (name) => classes.has(name),
		},
	};
	return el;
}

function load() {
	const toggle = element();
	const nav = element();
	const scrim = element();
	const root = {
		querySelector: (selector) => ({
			"[data-rux-side-nav-toggle]": toggle,
			"[data-rux-side-nav]": nav,
			"[data-rux-side-nav-scrim]": scrim,
		})[selector] ?? null,
	};
	const context = {
		window: {},
		document: { querySelector: () => null, addEventListener() {} },
	};
	vm.createContext(context);
	vm.runInContext(source, context);
	return { init: context.window.Rux.uiShell.init, toggle, nav, scrim, root };
}

test("init returns the same instance for markup it has already bound", () => {
	const { init, root } = load();
	const first = init(root);
	assert.ok(first, "the stub markup should produce an instance");
	assert.equal(init(root), first, "a second init must hand back the bound instance");
});

test("a second init does not attach a second set of listeners", () => {
	const { init, root, toggle, nav } = load();
	init(root);
	const afterFirst = { toggle: toggle.listeners.length, nav: nav.listeners.length };
	init(root);
	assert.deepEqual(
		{ toggle: toggle.listeners.length, nav: nav.listeners.length },
		afterFirst,
		"re-initialising must not double-bind — a doubled toggle handler opens and instantly closes the nav",
	);
});

test("distinct markup still gets its own instance", () => {
	// The guard keys on the nav element, not on a module-level flag, so a
	// second shell (a dialog, a second document fragment) is not swallowed.
	const { init, root } = load();
	const other = load();
	assert.notEqual(init(root), other.init(other.root));
});

test("markup with no side nav yields null and is not cached", () => {
	const { init } = load();
	const empty = { querySelector: () => null };
	assert.equal(init(empty), null);
	assert.equal(init(empty), null, "a null result must not be memoised as an instance");
});
