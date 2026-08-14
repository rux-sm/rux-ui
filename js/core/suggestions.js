/* ==========================================================================
   RUX UI — SUGGESTIONS DROPDOWN
   --------------------------------------------------------------------------
   Shared search-as-you-type dropdown mechanics — positioning under an
   input, debounced fetch, click-to-select, sequence-guarding against stale
   async responses. Singleton floating panel, reused across every attached
   input (only one dropdown can realistically be open at a time, since only
   one input can be focused). First consumer is the trip panel's
   booking/trip-contact autofill (js/panels/trip-panel.js).

   Not yet used by js/components/itinerary.js's own Mapbox address search,
   which predates this and has its own copy of the same positioning/render/
   select mechanics — left alone on purpose. That flow is tangled with
   session-token and geocode-on-select concerns specific to Mapbox, and
   isn't worth the regression risk of refactoring a working, business-
   critical flow just for the sake of sharing this code sooner.

   API
   ---
   RuxSuggestions.attach(input, {
     fetch: async (query) => [{ label, sublabel, ...anything }],
     onSelect: (item) => {},
     minChars = 2,       // below this, the dropdown just stays closed
     debounceMs = 200,
   }) → { detach() }
   ========================================================================== */

(() => {
	"use strict";

	let panelEl = null;
	let activeInput = null;
	let activeItems = [];
	let activeOnSelect = null;

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (c) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[c]));
	}

	function hide() {
		if (panelEl) {
			panelEl.hidden = true;
			panelEl.innerHTML = "";
		}
		activeItems = [];
	}

	function select(item) {
		const onSelect = activeOnSelect;
		hide();
		onSelect?.(item);
	}

	function position(input) {
		const rect = input.getBoundingClientRect();
		const margin = 8;
		const width = Math.max(rect.width, 240);
		panelEl.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
		panelEl.style.top = `${rect.bottom + 4}px`;
		panelEl.style.width = `${Math.min(width, window.innerWidth - margin * 2)}px`;
	}

	function ensurePanel() {
		if (panelEl) return panelEl;
		panelEl = document.createElement("div");
		panelEl.className = "rux-suggestions";
		panelEl.hidden = true;
		panelEl.setAttribute("role", "listbox");
		document.body.appendChild(panelEl);

		panelEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-suggestion-idx]");
			if (!btn) return;
			const item = activeItems[parseInt(btn.dataset.suggestionIdx, 10)];
			if (item) select(item);
		});
		// mousedown (not click) so this fires before the input's own blur —
		// same reasoning as itinerary.js's address suggestions.
		document.addEventListener("mousedown", (e) => {
			if (!panelEl || panelEl.hidden) return;
			if (panelEl.contains(e.target)) return;
			if (e.target === activeInput) return;
			hide();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") hide();
		});

		return panelEl;
	}

	function render(input, items, onSelect) {
		ensurePanel();
		activeInput = input;
		activeItems = items;
		activeOnSelect = onSelect;
		if (!items.length) {
			hide();
			return;
		}
		panelEl.toggleAttribute(
			"data-rux-modal-layer",
			Boolean(input.closest(".rux-modal-backdrop, .rux-surface--floating")),
		);
		position(input);
		panelEl.innerHTML = items
			.map(
				(item, i) => `
			<button class="rux-suggestions__item" type="button" role="option" data-suggestion-idx="${i}">
				<span class="rux-suggestions__label">${escHtml(item.label ?? "")}</span>
				${item.sublabel ? `<span class="rux-suggestions__sublabel">${escHtml(item.sublabel)}</span>` : ""}
			</button>`,
			)
			.join("");
		panelEl.hidden = false;
	}

	function attach(input, { fetch: fetchItems, onSelect, minChars = 2, debounceMs = 200 } = {}) {
		let timer = null;
		let seq = 0;

		async function run() {
			const query = input.value.trim();
			if (query.length < minChars) {
				hide();
				return;
			}
			const mySeq = ++seq;
			try {
				const items = await fetchItems(query);
				// Stale response (a newer keystroke already superseded this one)
				// or the input lost focus while the request was in flight.
				if (mySeq !== seq || document.activeElement !== input) return;
				render(input, items, onSelect);
			} catch (err) {
				console.warn("Suggestions fetch failed:", err);
				hide();
			}
		}

		function onInput() {
			clearTimeout(timer);
			timer = setTimeout(run, debounceMs);
		}

		function onFocus() {
			if (input.value.trim().length >= minChars) run();
		}

		input.addEventListener("input", onInput);
		input.addEventListener("focus", onFocus);

		return {
			detach() {
				input.removeEventListener("input", onInput);
				input.removeEventListener("focus", onFocus);
				clearTimeout(timer);
				if (activeInput === input) hide();
			},
		};
	}

	window.RuxSuggestions = { attach };
})();
