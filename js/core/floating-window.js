/* ==========================================================================
   RUX UI — FLOATING WINDOW
   --------------------------------------------------------------------------
   Shared drag mechanics for a .rux-panel--floating panel (see
   css/base/panel.css). Resizing is native CSS (resize: both), so this is
   just the pointer-drag half — used by every floating window (trip editor,
   manifest, request inbox, trip finder, doc viewer, trip envelope).

   API
   ---
   window.RuxFloatingWindow.attachDrag(panelEl, handleEl, {
     minViewportWidth,   // optional — below this width, dragging is a no-op
                          // (for windows that go full-screen on mobile via
                          // their own CSS breakpoint; doc-viewer doesn't
                          // pass this and drags at any width)
   })
   window.RuxFloatingWindow.resetGeometry(panelEl)
   ========================================================================== */

(() => {
	"use strict";

	function attachDrag(panelEl, handleEl, options = {}) {
		let dragState = null;
		const minViewportWidth = options.minViewportWidth || 0;

		function startDrag(event) {
			if (window.innerWidth <= minViewportWidth) return;
			if (window.matchMedia("(max-width: 580px)").matches) return;
			if (panelEl.classList.contains("rux-panel--safe-viewport")) return;
			// Header may contain its own controls (close button, etc.) —
			// any of those should act normally, not start a drag.
			if (event.target.closest("button")) return;
			const rect = panelEl.getBoundingClientRect();
			// Cancel any centering transform on first drag — from here on,
			// left/top (set below, in viewport px) are the panel's real position.
			panelEl.style.transform = "none";
			panelEl.style.left = `${rect.left}px`;
			panelEl.style.top = `${rect.top}px`;
			dragState = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
			panelEl.classList.add("is-dragging");
			handleEl.setPointerCapture(event.pointerId);
			document.addEventListener("pointermove", onDrag);
			document.addEventListener("pointerup", stopDrag);
		}

		function onDrag(event) {
			if (!dragState) return;
			const margin = 24;
			const left = Math.max(
				margin - panelEl.offsetWidth,
				Math.min(event.clientX - dragState.offsetX, window.innerWidth - margin),
			);
			const top = Math.max(0, Math.min(event.clientY - dragState.offsetY, window.innerHeight - margin));
			panelEl.style.left = `${left}px`;
			panelEl.style.top = `${top}px`;
		}

		function stopDrag() {
			dragState = null;
			panelEl.classList.remove("is-dragging");
			document.removeEventListener("pointermove", onDrag);
			document.removeEventListener("pointerup", stopDrag);
		}

		handleEl.addEventListener("pointerdown", startDrag);
		const mobileWindowQuery = window.matchMedia("(max-width: 580px)");
		mobileWindowQuery.addEventListener("change", (event) => {
			if (event.matches) resetGeometry(panelEl);
		});
	}

	// Drag sets left/top/transform inline, and native resize:both sets
	// width/height inline — both always outrank stylesheet rules, including
	// a mobile @media breakpoint trying to force the window full-screen.
	// Clearing them lets CSS (whatever regime the current viewport is in)
	// take back over.
	function resetGeometry(panelEl) {
		panelEl.style.left = "";
		panelEl.style.top = "";
		panelEl.style.width = "";
		panelEl.style.height = "";
		panelEl.style.transform = "";
	}

	window.RuxFloatingWindow = { attachDrag, resetGeometry };
})();
