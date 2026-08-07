/* ==========================================================================
   RUX UI — CONTROLS
   --------------------------------------------------------------------------
   Declarative interactivity for button groups, toggles, and tabs.
   No framework, no build step.

   API
   ---
   data-rux-toggle="#target"   → click toggles .is-open on target element
   data-rux-toggle-button      → standalone press toggle (.is-active / aria-pressed)
   data-rux-toggle-group       → legacy single-select pressed button group
   .rux-segmented-track        → robust single-select segmented control
                                  (any button count; text, icon, or mixed)
   data-rux-tabs               → .rux-tab single-select group (arrow key navigation)
   ========================================================================== */

(function () {
	"use strict";

	/* ── Helpers ────────────────────────────────────────────────────────────── */

	function setActiveItem(group, active, selector, attr) {
		group.querySelectorAll(selector).forEach((item) => {
			const isActive = item === active;
			item.classList.toggle("is-active", isActive);
			item.setAttribute(attr, isActive ? "true" : "false");
			if (attr === "aria-selected") item.tabIndex = isActive ? 0 : -1;
		});
	}

	function segmentedButtons(group) {
		return Array.from(group.children).filter((item) =>
			item.matches?.(".rux-button--segment")
		);
	}

	function segmentedValue(button) {
		return button?.dataset.value ?? button?.value ?? null;
	}

	function setActiveSegment(group, active, { emit = true } = {}) {
		const buttons = segmentedButtons(group);
		if (!buttons.includes(active) || active.disabled) return false;

		const previous = buttons.find((button) => button.getAttribute("aria-pressed") === "true" || button.classList.contains("is-active"));
		buttons.forEach((button) => {
			const isActive = button === active;
			button.classList.toggle("is-active", isActive);
			button.setAttribute("aria-pressed", isActive ? "true" : "false");
			button.tabIndex = isActive ? 0 : -1;
		});

		if (emit && previous !== active) {
			group.dispatchEvent(new CustomEvent("rux:segment-change", {
				bubbles: true,
				detail: {
					value: segmentedValue(active),
					previousValue: segmentedValue(previous),
					button: active,
				},
			}));
		}
		return previous !== active;
	}

	function initSegmentedControl(group) {
		if (group.dataset.ruxSegmentedInit === "true") return;
		group.dataset.ruxSegmentedInit = "true";
		group.setAttribute("role", group.getAttribute("role") || "group");
		normalizeSegmentedControl(group);
	}

	function normalizeSegmentedControl(group) {
		const buttons = segmentedButtons(group);
		const active = buttons.find((button) => !button.disabled && button.getAttribute("aria-pressed") === "true")
			|| buttons.find((button) => !button.disabled && button.classList.contains("is-active"))
			|| buttons.find((button) => !button.disabled);
		if (active) setActiveSegment(group, active, { emit: false });
		else buttons.forEach((button) => { button.tabIndex = -1; });
	}

	function moveActiveItem(group, selector, attr, dir) {
		const items = Array.from(group.querySelectorAll(selector)).filter((item) => !item.disabled);
		if (!items.length) return;

		const current = group.querySelector(selector + ".is-active") || items[0];
		const currentIndex = items.indexOf(current);
		const nextIndex = (currentIndex + dir + items.length) % items.length;
		const next = items[nextIndex];

		setActiveItem(group, next, selector, attr);
		next.focus();
		return next;
	}

	function initPanelScrollEdges(panel) {
		const body = panel.querySelector(".rux-panel__body");
		const nav = panel.querySelector(".rux-panel__nav, .rux-panel__tabs");
		const footer = panel.querySelector(".rux-panel__footer");
		if (!body || (!nav && !footer) || body.dataset.ruxScrollEdgesInit === "true") return;

		body.dataset.ruxScrollEdgesInit = "true";
		const sync = () => {
			nav?.classList.toggle("is-scrolled", body.scrollTop > 0);
			const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 1;
			footer?.classList.toggle("is-scrolled", !atBottom);
		};

		body.addEventListener("scroll", sync, { passive: true });
		new ResizeObserver(sync).observe(body);
		sync();
	}

	function initSegmentedIndicator(group) {
		if (group.dataset.ruxIndicatorInit === "true") return;
		group.dataset.ruxIndicatorInit = "true";

		const indicator = document.createElement("span");
		indicator.className = "rux-segmented__indicator";
		indicator.setAttribute("aria-hidden", "true");
		group.prepend(indicator);

		let frame;
		const sync = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const active = group.querySelector(
					'.rux-button.is-active, .rux-button[aria-pressed="true"], .rux-button[aria-selected="true"]'
				);
				if (!active) {
					group.dataset.ruxIndicatorReady = "false";
					return;
				}

				const groupRect = group.getBoundingClientRect();
				const activeRect = active.getBoundingClientRect();
				if (activeRect.width <= 0 || activeRect.height <= 0) {
					group.dataset.ruxIndicatorReady = "false";
					return;
				}

				const styles = getComputedStyle(group);
				const px = (property) => Number.parseFloat(styles.getPropertyValue(property)) || 0;
				const borderLeft = px("border-left-width");
				const borderTop = px("border-top-width");
				let x = activeRect.left - groupRect.left - borderLeft;
				let y = activeRect.top - groupRect.top - borderTop;
				let width = activeRect.width;
				let height = activeRect.height;

				// A segmented track reserves a real padding gutter around its buttons.
				// Preserve that gutter explicitly so fractional flex widths can never
				// place the final indicator a fraction of a pixel into the right edge.
				// Plain .rux-segmented groups intentionally use different geometry, so
				// they keep the measured button bounds without track-specific clamping.
				if (group.classList.contains("rux-segmented-track")) {
					const borderRight = px("border-right-width");
					const borderBottom = px("border-bottom-width");
					const minX = px("padding-left");
					const minY = px("padding-top");
					const maxRight = groupRect.width - borderLeft - borderRight - px("padding-right");
					const maxBottom = groupRect.height - borderTop - borderBottom - px("padding-bottom");

					x = Math.min(Math.max(x, minX), maxRight);
					y = Math.min(Math.max(y, minY), maxBottom);
					width = Math.max(0, Math.min(activeRect.width, maxRight - x));
					height = Math.max(0, Math.min(activeRect.height, maxBottom - y));
				}

				group.style.setProperty("--_rux-segment-indicator-x", `${x}px`);
				group.style.setProperty("--_rux-segment-indicator-y", `${y}px`);
				group.style.setProperty("--_rux-segment-indicator-width", `${width}px`);
				group.style.setProperty("--_rux-segment-indicator-height", `${height}px`);
				group.dataset.ruxIndicatorReady = "true";
			});
		};

		const stateObserver = new MutationObserver((records) => {
			let childrenChanged = false;
			records.forEach((record) => {
				if (record.type === "childList") childrenChanged = true;
				record.addedNodes.forEach((node) => {
					if (node.matches?.(".rux-button--segment")) sizeObserver.observe(node);
				});
			});
			if (childrenChanged && group.classList.contains("rux-segmented-track")) {
				normalizeSegmentedControl(group);
			}
			sync();
		});
		stateObserver.observe(group, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["aria-pressed", "aria-selected", "class", "disabled"],
		});

		const sizeObserver = new ResizeObserver(sync);
		sizeObserver.observe(group);
		group.querySelectorAll(":scope > .rux-button").forEach((button) => sizeObserver.observe(button));
		sync();
	}

	function initSegmentedIndicators(root) {
		root.querySelectorAll?.(".rux-segmented, .rux-segmented-track").forEach((group) => {
			if (group.classList.contains("rux-segmented-track")) initSegmentedControl(group);
			initSegmentedIndicator(group);
		});
		if (root.matches?.(".rux-segmented, .rux-segmented-track")) {
			if (root.classList.contains("rux-segmented-track")) initSegmentedControl(root);
			initSegmentedIndicator(root);
		}
	}

	/* ── Click ──────────────────────────────────────────────────────────────── */

	document.addEventListener("click", function (e) {
		// [data-rux-toggle="#target"] — toggle .is-open on a target element
		const toggle = e.target.closest("[data-rux-toggle]");
		if (toggle) {
			const sel = toggle.getAttribute("data-rux-toggle");
			const tgt = document.querySelector(sel);
			if (tgt) tgt.classList.toggle("is-open");
		}

		// [data-rux-toggle-button] — standalone pressed toggle
		const pressedToggle = e.target.closest("[data-rux-toggle-button]");
		if (pressedToggle && !pressedToggle.disabled) {
			const isActive = pressedToggle.getAttribute("aria-pressed") === "true";
			pressedToggle.classList.toggle("is-active", !isActive);
			pressedToggle.setAttribute("aria-pressed", isActive ? "false" : "true");
		}

		// .rux-segmented-track — one shared component for text, icon, or mixed
		// segments. Feature code consumes rux:segment-change instead of owning
		// selection classes or rebuilding the control.
		const segmentButton = e.target.closest(".rux-segmented-track > .rux-button--segment");
		if (segmentButton && !segmentButton.disabled) {
			setActiveSegment(segmentButton.parentElement, segmentButton);
		}

		// [data-rux-toggle-group] — legacy single-select pressed button group
		const toggleButton = e.target.closest("[data-rux-toggle-group] .rux-button");
		if (toggleButton && !toggleButton.disabled && !toggleButton.closest(".rux-segmented-track")) {
			const group = toggleButton.closest("[data-rux-toggle-group]");
			setActiveItem(group, toggleButton, ".rux-button", "aria-pressed");
		}

		// [data-rux-tabs] — single-select tab group
		const tab = e.target.closest("[data-rux-tabs] .rux-tab");
		if (tab && !tab.disabled) {
			const group = tab.closest("[data-rux-tabs]");
			setActiveItem(group, tab, ".rux-tab", "aria-selected");
			const panel = group.closest(".rux-panel");
			const targetId = tab.getAttribute("aria-controls");
			if (panel && targetId) {
				panel.querySelectorAll(".rux-panel__body > .rux-panel__pane").forEach((pane) => {
					pane.hidden = pane.id !== targetId;
				});
			}
		}

	});

	/* ── Date / time input state ───────────────────────────────────────────── */

	function syncDateInput(el) {
		el.classList.toggle("has-value", !!el.value);
	}

	function syncSelectPlaceholder(el) {
		el.classList.toggle("is-placeholder", el.value === "");
	}

	document.addEventListener("change", function (e) {
		if (e.target.matches('input[type="date"], input[type="time"], input[type="datetime-local"]')) {
			syncDateInput(e.target);
		}
		if (e.target.matches(".rux-select")) {
			syncSelectPlaceholder(e.target);
		}
	});

	window.Rux = window.Rux || {};
	window.Rux.syncDateInputs = function (root) {
		(root || document)
			.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]')
			.forEach(syncDateInput);
	};
	window.Rux.syncSelectPlaceholders = function (root) {
		(root || document).querySelectorAll(".rux-select").forEach(syncSelectPlaceholder);
	};
	window.Rux.setSegmentedValue = function (groupOrSelector, value, options = {}) {
		const group = typeof groupOrSelector === "string"
			? document.querySelector(groupOrSelector)
			: groupOrSelector;
		if (!group?.matches?.(".rux-segmented-track")) return false;
		const button = segmentedButtons(group).find((item) => segmentedValue(item) === String(value));
		return button ? setActiveSegment(group, button, options) : false;
	};
	window.Rux.getSegmentedValue = function (groupOrSelector) {
		const group = typeof groupOrSelector === "string"
			? document.querySelector(groupOrSelector)
			: groupOrSelector;
		if (!group?.matches?.(".rux-segmented-track")) return null;
		const active = segmentedButtons(group).find((button) => button.getAttribute("aria-pressed") === "true");
		return segmentedValue(active);
	};

	document.addEventListener("DOMContentLoaded", function () {
		initSegmentedIndicators(document);
		document.querySelectorAll("[data-rux-tabs]").forEach((group) => {
			const active = group.querySelector('.rux-tab[aria-selected="true"]') || group.querySelector(".rux-tab");
			if (active) setActiveItem(group, active, ".rux-tab", "aria-selected");
		});
		document.querySelectorAll(".rux-panel").forEach(initPanelScrollEdges);
		window.Rux.syncSelectPlaceholders(document);

		new MutationObserver((records) => {
			records.forEach((record) => record.addedNodes.forEach(initSegmentedIndicators));
		}).observe(document.body, { childList: true, subtree: true });
	});

	/* ── Keyboard navigation ────────────────────────────────────────────────── */

	document.addEventListener("keydown", function (e) {
		const dir = e.key === "ArrowRight" || e.key === "ArrowDown"
			? 1
			: e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;

		const segmented = e.target.closest(".rux-segmented-track");
		if (segmented && e.target.closest(".rux-button--segment")) {
			const buttons = segmentedButtons(segmented).filter((button) => !button.disabled);
			if (!buttons.length || (!dir && e.key !== "Home" && e.key !== "End")) return;
			e.preventDefault();
			const current = buttons.find((button) => button.getAttribute("aria-pressed") === "true") || buttons[0];
			const currentIndex = buttons.indexOf(current);
			const next = e.key === "Home"
				? buttons[0]
				: e.key === "End"
					? buttons.at(-1)
					: buttons[(currentIndex + dir + buttons.length) % buttons.length];
			setActiveSegment(segmented, next);
			next.focus();
			return;
		}

		if (!dir) return;

		const toggleGroup = e.target.closest("[data-rux-toggle-group]");
		if (toggleGroup && e.target.closest(".rux-button")) {
			e.preventDefault();
			moveActiveItem(toggleGroup, ".rux-button", "aria-pressed", dir);
			return;
		}

		const tabGroup = e.target.closest("[data-rux-tabs]");
		if (tabGroup && e.target.closest(".rux-tab")) {
			e.preventDefault();
			moveActiveItem(tabGroup, ".rux-tab", "aria-selected", dir)?.click();
		}
	});
})();
