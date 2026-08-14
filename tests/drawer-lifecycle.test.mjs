import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const drawerSource = readFileSync(
	new URL("../js/core/drawer.js", import.meta.url),
	"utf8",
);

class MockClassList {
	constructor(...names) {
		this.names = new Set(names);
	}

	add(...names) {
		names.forEach((name) => this.names.add(name));
	}

	remove(...names) {
		names.forEach((name) => this.names.delete(name));
	}

	contains(name) {
		return this.names.has(name);
	}

	replace(previous, next) {
		if (!this.names.delete(previous)) return false;
		this.names.add(next);
		return true;
	}
}

class MockElement {
	constructor(...classNames) {
		this.classList = new MockClassList(...classNames);
		this.attributes = new Map();
		this.listeners = new Map();
		this.inert = false;
		this.animationDuration = "1ms";
		this.transitionDuration = "1ms";
		this.style = {
			values: new Map(),
			getPropertyValue: (name) => this.style.values.get(name) ?? "",
			setProperty: (name, value) => this.style.values.set(name, value),
		};
	}

	addEventListener(type, listener) {
		if (!this.listeners.has(type)) this.listeners.set(type, new Set());
		this.listeners.get(type).add(listener);
	}

	removeEventListener(type, listener) {
		this.listeners.get(type)?.delete(listener);
	}

	dispatch(type, properties = {}) {
		const event = { target: this, type, ...properties };
		for (const listener of this.listeners.get(type) ?? []) listener(event);
	}

	setAttribute(name, value) {
		this.attributes.set(name, value);
	}

	getAttribute(name) {
		return this.attributes.get(name);
	}

	closest() {
		return null;
	}
}

function createHarness({ mobile = true } = {}) {
	const app = new MockElement("scheduler-app");
	const body = new MockElement();
	body.appendChild = () => {};

	const document = {
		body,
		createElement: () => new MockElement(),
		querySelector: (selector) => selector === ".scheduler-app" ? app : null,
	};
	const window = {
		clearTimeout,
		matchMedia: () => ({ matches: mobile }),
		setTimeout,
	};
	const getComputedStyle = (element) => ({
		animationDelay: "0s",
		animationDuration: element.animationDuration,
		animationIterationCount: "1",
		animationName: "scheduler-mobile-drawer-out",
		getPropertyValue: (name) => {
			if (name === "--scheduler-app-left-drawer-default-width") return "320px";
			if (name === "--scheduler-app-right-drawer-default-width") return "320px";
			if (name === "--rux-panel-rail-width") return "44px";
			return "";
		},
		minWidth: "0px",
		transitionDelay: "0s",
		transitionDuration: element.transitionDuration,
		transitionProperty: "width",
	});
	const context = vm.createContext({
		console,
		document,
		getComputedStyle,
		parseFloat,
		queueMicrotask,
		window,
	});
	vm.runInContext(drawerSource, context);

	function createDrawer() {
		const drawer = new MockElement("scheduler-app__drawer", "is-open");
		const panel = new MockElement("rux-panel");
		const controller = window.RuxDrawer.create({ drawer, panel });
		return { controller, drawer, panel };
	}

	return { createDrawer };
}

test("mobile close settles when its animation is cancelled", () => {
	const { controller, drawer, panel } = createHarness().createDrawer();

	controller.close();
	assert.equal(drawer.classList.contains("is-open"), false);
	assert.equal(drawer.classList.contains("is-closing"), true);
	assert.equal(drawer.getAttribute("aria-hidden"), "true");
	assert.equal(panel.inert, true);

	panel.dispatch("animationcancel", {
		animationName: "scheduler-mobile-drawer-out",
	});
	assert.equal(drawer.classList.contains("is-closing"), false);
});

test("desktop close uses the same cancellation-safe completion path", () => {
	const { controller, drawer, panel } = createHarness({ mobile: false }).createDrawer();

	controller.close();
	assert.equal(drawer.classList.contains("is-open"), true);
	assert.equal(drawer.classList.contains("is-collapsing"), true);
	assert.equal(panel.inert, true);

	drawer.dispatch("transitioncancel", { propertyName: "width" });
	assert.equal(drawer.classList.contains("is-open"), false);
	assert.equal(drawer.classList.contains("is-collapsing"), false);
});

test("mobile close has a fallback when completion events are dropped", async () => {
	const { controller, drawer } = createHarness().createDrawer();

	controller.close();
	assert.equal(drawer.classList.contains("is-closing"), true);
	await new Promise((resolve) => setTimeout(resolve, 70));
	assert.equal(drawer.classList.contains("is-closing"), false);
});

test("reopening cancels stale close completion", async () => {
	const { controller, drawer, panel } = createHarness().createDrawer();

	controller.close();
	controller.open();
	panel.dispatch("animationend", {
		animationName: "scheduler-mobile-drawer-out",
	});
	await new Promise((resolve) => setTimeout(resolve, 70));

	assert.equal(drawer.classList.contains("is-open"), true);
	assert.equal(drawer.classList.contains("is-closing"), false);
	assert.equal(drawer.getAttribute("aria-hidden"), "false");
	assert.equal(panel.inert, false);
});
