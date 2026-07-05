/* ==========================================================================
   RUX UI — CONTROLS
   --------------------------------------------------------------------------
   Declarative interactivity for button groups, toggles, and tabs.
   No framework, no build step.

   API
   ---
   data-rux-toggle="#target"   → click toggles .is-open on target element
   data-rux-toggle-button      → standalone press toggle (.is-active / aria-pressed)
   data-rux-toggle-group       → single-select pressed button group
   data-rux-tabs               → .rux-tab single-select group (arrow key navigation)
   data-rux-stepper            → [−] count [+] stepper; reads min/max from hidden input
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
		const tabs = panel.querySelector(".rux-panel__tabs");
		const footer = panel.querySelector(".rux-panel__footer");
		if (!body || (!tabs && !footer) || body.dataset.ruxScrollEdgesInit === "true") return;

		body.dataset.ruxScrollEdgesInit = "true";
		const sync = () => {
			tabs?.classList.toggle("is-scrolled", body.scrollTop > 0);
			const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 1;
			footer?.classList.toggle("is-scrolled", !atBottom);
		};

		body.addEventListener("scroll", sync, { passive: true });
		new ResizeObserver(sync).observe(body);
		sync();
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

		// [data-rux-toggle-group] — single-select pressed button group
		const toggleButton = e.target.closest("[data-rux-toggle-group] .rux-button");
		if (toggleButton && !toggleButton.disabled) {
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

		// [data-rux-stepper] — [−] count [+]
		const stepBtn = e.target.closest("[data-rux-stepper] [data-stepper-dec], [data-rux-stepper] [data-stepper-inc]");
		if (stepBtn && !stepBtn.disabled) {
			const stepper = stepBtn.closest("[data-rux-stepper]");
			const input = stepper.querySelector("input[type='hidden']");
			const display = stepper.querySelector(".rux-stepper__count");
			if (!input) return;
			const min = parseInt(input.min, 10) || 1;
			const max = parseInt(input.max, 10) || Infinity;
			const step = parseInt(input.step, 10) || 1;
			const inc = stepBtn.hasAttribute("data-stepper-inc");
			const val = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + (inc ? step : -step)));
			input.value = val;
			if (display) display.textContent = val;
			stepper.querySelector("[data-stepper-dec]").disabled = val <= min;
			stepper.querySelector("[data-stepper-inc]").disabled = val >= max;
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

	/* ── Date / time input state ───────────────────────────────────────────── */

	function syncDateInput(el) {
		el.classList.toggle("has-value", !!el.value);
	}

	document.addEventListener("change", function (e) {
		if (e.target.matches('input[type="date"], input[type="time"], input[type="datetime-local"]')) {
			syncDateInput(e.target);
		}
	});

	window.Rux = window.Rux || {};
	window.Rux.syncDateInputs = function (root) {
		(root || document)
			.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]')
			.forEach(syncDateInput);
	};

	document.addEventListener("DOMContentLoaded", function () {
		document.querySelectorAll("[data-rux-tabs]").forEach((group) => {
			const active = group.querySelector('.rux-tab[aria-selected="true"]') || group.querySelector(".rux-tab");
			if (active) setActiveItem(group, active, ".rux-tab", "aria-selected");
		});
		document.querySelectorAll(".rux-panel").forEach(initPanelScrollEdges);
	});

	/* ── Keyboard navigation ────────────────────────────────────────────────── */

	document.addEventListener("keydown", function (e) {
		const dir =
			e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
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
