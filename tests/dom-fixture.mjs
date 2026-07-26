class TestClassList {
	constructor(node) {
		this.node = node;
	}

	values() {
		return this.node.className.split(/\s+/).filter(Boolean);
	}

	commit(values) {
		this.node.className = [...new Set(values)].join(" ");
	}

	add(...tokens) {
		this.commit([...this.values(), ...tokens]);
	}

	remove(...tokens) {
		this.commit(this.values().filter((token) => !tokens.includes(token)));
	}

	contains(token) {
		return this.values().includes(token);
	}

	toggle(token, force) {
		const present = this.contains(token);
		const next = force === undefined ? !present : Boolean(force);
		if (next && !present) this.add(token);
		if (!next && present) this.remove(token);
		return next;
	}
}

function selectorMatch(node, selector) {
	if (!(node instanceof TestElement)) return false;
	if (selector.startsWith(".")) return node.classList.contains(selector.slice(1));
	const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
	if (attribute) {
		const value = node.getAttribute(attribute[1]);
		return attribute[2] === undefined ? value !== null : value === attribute[2];
	}
	const tagAndClass = selector.match(/^([a-z0-9-]+)(?:\.([a-z0-9_-]+))?$/i);
	if (tagAndClass) {
		return node.tagName === tagAndClass[1].toUpperCase()
			&& (!tagAndClass[2] || node.classList.contains(tagAndClass[2]));
	}
	return false;
}

class TestNode {
	constructor() {
		this.parentNode = null;
		this.childNodes = [];
		this._text = "";
	}

	appendChild(child) {
		const node = typeof child === "string" ? new TestText(child) : child;
		if (node.parentNode) {
			node.parentNode.childNodes = node.parentNode.childNodes.filter((item) => item !== node);
		}
		node.parentNode = this;
		this.childNodes.push(node);
		return node;
	}

	append(...children) {
		children.forEach((child) => this.appendChild(child));
	}

	replaceChildren(...children) {
		this.childNodes.forEach((child) => { child.parentNode = null; });
		this.childNodes = [];
		this._text = "";
		this.append(...children);
	}

	replaceWith(replacement) {
		if (!this.parentNode) return;
		const index = this.parentNode.childNodes.indexOf(this);
		if (index < 0) return;
		this.parentNode.childNodes[index] = replacement;
		replacement.parentNode = this.parentNode;
		this.parentNode = null;
	}

	get textContent() {
		return this._text + this.childNodes.map((child) => child.textContent).join("");
	}

	set textContent(value) {
		this._text = String(value ?? "");
		this.childNodes = [];
	}
}

class TestText extends TestNode {
	constructor(text) {
		super();
		this._text = String(text);
	}
}

export class TestElement extends TestNode {
	constructor(tagName) {
		super();
		this.tagName = tagName.toUpperCase();
		this.className = "";
		this.classList = new TestClassList(this);
		this.dataset = {};
		this.attributes = new Map();
		this.listeners = new Map();
		this.hidden = false;
		this.disabled = false;
		this.style = {
			setProperty() {},
		};
	}

	set id(value) {
		this.setAttribute("id", value);
	}

	get id() {
		return this.getAttribute("id") || "";
	}

	set tabIndex(value) {
		this.setAttribute("tabindex", String(value));
	}

	get childElementCount() {
		return this.childNodes.filter((node) => node instanceof TestElement).length;
	}

	setAttribute(name, value) {
		this.attributes.set(name, String(value));
	}

	getAttribute(name) {
		return this.attributes.has(name) ? this.attributes.get(name) : null;
	}

	addEventListener(type, listener) {
		if (!this.listeners.has(type)) this.listeners.set(type, []);
		this.listeners.get(type).push(listener);
	}

	async dispatch(type, event = {}) {
		const listeners = this.listeners.get(type) || [];
		await Promise.all(listeners.map((listener) => listener({
			target: this,
			currentTarget: this,
			preventDefault() {},
			...event,
		})));
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] || null;
	}

	querySelectorAll(selector) {
		if (selector === ":scope > li") {
			return this.childNodes.filter((node) => node instanceof TestElement && node.tagName === "LI");
		}
		const matches = [];
		const visit = (node) => {
			node.childNodes.forEach((child) => {
				if (selectorMatch(child, selector)) matches.push(child);
				visit(child);
			});
		};
		visit(this);
		return matches;
	}

	focus() {
		this.ownerDocument.activeElement = this;
	}
}

export function installDom() {
	const testDocument = {
		activeElement: null,
		createElement(tagName) {
			const node = new TestElement(tagName);
			node.ownerDocument = testDocument;
			return node;
		},
		createTextNode(text) {
			return new TestText(text);
		},
	};
	globalThis.document = testDocument;
	return testDocument;
}

export function findByText(root, text, tagName) {
	const candidates = tagName ? root.querySelectorAll(tagName) : allElements(root);
	return candidates.find((node) => node.textContent.trim() === text) || null;
}

export function allElements(root) {
	const output = [];
	const visit = (node) => {
		node.childNodes.forEach((child) => {
			if (child instanceof TestElement) output.push(child);
			visit(child);
		});
	};
	visit(root);
	return output;
}
