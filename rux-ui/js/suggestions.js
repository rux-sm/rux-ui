/* ==========================================================================
   RUX UI — SUGGESTIONS DROPDOWN
   --------------------------------------------------------------------------
   Shared search-as-you-type dropdown mechanics — positioning under an
   input, debounced fetch, click-to-select, sequence-guarding against stale
   async responses. Singleton floating panel, reused across every attached
   input (only one dropdown can realistically be open at a time, since only
   one input can be focused). First consumer is the trip panel's
   booking/trip-contact autofill (js/panels/trip-panel.js).

   Second consumer is js/components/itinerary.js's Mapbox address search.
   It predated this component and carried its own copy of the same
   positioning/render/select mechanics; that copy was retired 2026-08-22.

   This note used to say that flow was left alone on purpose — "tangled with
   session-token and geocode-on-select concerns ... not worth the regression
   risk". Two things changed. The concerns turned out to separate cleanly:
   the Mapbox session token lives in the consumer's `fetch`, geocode-on-select
   in its `onSelect`, and this component sees neither. And the reason to move
   was never code sharing — the hand-rolled copy had no arrow keys and never
   set aria-selected, so its list was reachable by mouse only.

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

	/* The panel matches its input's width, but never gets so narrow that
	   labels wrap; CSS owns the upper cap (.rux-suggestions max-width). */
	const MIN_PANEL_WIDTH = 240;

	let panelEl = null;
	let activeInput = null;
	let activeItems = [];
	let activeOnSelect = null;
	let highlightedIdx = -1;
	let registration = null;

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (c) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[c]));
	}

	function hide() {
		if (panelEl) {
			panelEl.hidden = true;
			panelEl.style.visibility = "";
			panelEl.innerHTML = "";
		}
		if (activeInput) {
			activeInput.removeAttribute("aria-activedescendant");
			activeInput.setAttribute("aria-expanded", "false");
		}
		registration?.release();
		registration = null;
		activeItems = [];
		highlightedIdx = -1;
	}

	function select(item) {
		const onSelect = activeOnSelect;
		hide();
		onSelect?.(item);
	}

	/* Width is this component's own policy; placement, the offset and
	   viewport-padding tokens, and the flip-when-it-does-not-fit logic all
	   come from the shared popover engine, so a suggestions list sits under
	   its field exactly the way a menu sits under its trigger. */
	function position(input) {
		if (!panelEl) return;
		panelEl.style.width = `${Math.max(input.getBoundingClientRect().width, MIN_PANEL_WIDTH)}px`;
		window.RuxPopover.position(input, panelEl, { placement: "bottom-start" });
	}

	function ensurePanel() {
		if (panelEl) return panelEl;
		panelEl = document.createElement("div");
		panelEl.className = "rux-suggestions";
		panelEl.id = "rux-suggestions-panel";
		panelEl.hidden = true;
		panelEl.setAttribute("role", "listbox");
		document.body.appendChild(panelEl);

		panelEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-suggestion-idx]");
			if (!btn) return;
			const item = activeItems[parseInt(btn.dataset.suggestionIdx, 10)];
			if (item) select(item);
		});
		// Outside-press and Escape are the overlay kernel's
		// (rux-ui/js/overlay.js); it listens on capture-phase pointerdown,
		// which still lands before the input's own blur — the ordering this
		// dropdown and itinerary.js's address list both depend on.

		return panelEl;
	}

	function setHighlight(idx) {
		if (!panelEl || panelEl.hidden) return;
		const items = panelEl.querySelectorAll("[role='option']");
		items.forEach((el) => el.setAttribute("aria-selected", "false"));
		if (idx >= 0 && idx < items.length) {
			highlightedIdx = idx;
			items[idx].setAttribute("aria-selected", "true");
			items[idx].scrollIntoView({ block: "nearest" });
			if (activeInput) activeInput.setAttribute("aria-activedescendant", items[idx].id);
		} else {
			highlightedIdx = -1;
			if (activeInput) activeInput.removeAttribute("aria-activedescendant");
		}
	}

	function render(input, items, onSelect) {
		ensurePanel();
		// Moving the singleton to a new field: retire the old field's combobox
		// state before it is forgotten, or it keeps claiming an open listbox.
		if (activeInput && activeInput !== input) {
			activeInput.removeAttribute("aria-activedescendant");
			activeInput.setAttribute("aria-expanded", "false");
		}
		activeInput = input;
		activeItems = items;
		activeOnSelect = onSelect;
		if (!items.length) {
			hide();
			return;
		}
		window.RuxOverlay.promoteLayer(panelEl, input);
		panelEl.innerHTML = items
			.map(
				(item, i) => `
			<button class="rux-suggestions__item" type="button" role="option" id="rux-suggestion-${i}" data-suggestion-idx="${i}">
				<span class="rux-suggestions__label">${escHtml(item.label ?? "")}</span>
				${item.sublabel ? `<span class="rux-suggestions__sublabel">${escHtml(item.sublabel)}</span>` : ""}
			</button>`,
			)
			.join("");
		registration = window.RuxOverlay.register({
			element: panelEl,
			anchor: input,
			close: hide,
			reposition: () => position(input),
		});
		// Reveal before positioning — the engine measures the rendered list to
		// decide whether it fits below the field — but reveal invisibly so it
		// never paints where the previous input left it.
		panelEl.style.visibility = "hidden";
		panelEl.hidden = false;
		position(input);
		input.setAttribute("aria-expanded", "true");
		input.setAttribute("aria-controls", panelEl.id);
		highlightedIdx = -1;
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

		function onKeydown(e) {
			if (!panelEl || panelEl.hidden || activeInput !== input) return;
			const count = activeItems.length;
			if (!count) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlight(highlightedIdx < count - 1 ? highlightedIdx + 1 : 0);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlight(highlightedIdx > 0 ? highlightedIdx - 1 : count - 1);
			} else if (e.key === "Enter" && highlightedIdx >= 0) {
				e.preventDefault();
				select(activeItems[highlightedIdx]);
			}
		}

		input.addEventListener("input", onInput);
		input.addEventListener("focus", onFocus);
		input.addEventListener("keydown", onKeydown);

		return {
			detach() {
				input.removeEventListener("input", onInput);
				input.removeEventListener("focus", onFocus);
				input.removeEventListener("keydown", onKeydown);
				clearTimeout(timer);
				if (activeInput === input) hide();
			},
		};
	}

	window.Rux = window.Rux || {};
	window.Rux.suggestions = { attach };
	window.RuxSuggestions = window.Rux.suggestions;
})();
