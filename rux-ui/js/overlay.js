/* ==========================================================================
   RUX UI — OVERLAY KERNEL
   --------------------------------------------------------------------------
   One dismiss manager for every dismissible surface: menus, interactive
   popovers, the suggestions dropdown, and modals. Before this module each of
   those bound its own document-level outside-click and Escape listeners, and
   menu.js and popover.js each kept a private "active" singleton that stayed
   in sync through a `rux:popover-open` event. Both singletons and that
   protocol are gone: overlays register here instead.

   Overlays form a stack, bottom → top. Opening one dismisses every overlay
   above the topmost surface that contains the newcomer's anchor, so nesting
   (a menu opened from a control inside a popover) works without either
   module knowing the other exists.

   API
   ---
   RuxOverlay.register(record) → handle
     record.element        the surface itself (required)
     record.anchor         the trigger/anchor element, if any
     record.close(opts)    called to dismiss; receives { restoreFocus }
     record.reposition()   optional; called on window resize while registered
     record.dismissOn      optional { outside = true, escape = true }
   handle.release()        drop out of the stack without being closed
                           (call this from your own close())

   RuxOverlay.autoId(element, prefix)        → id, assigning one if absent
   RuxOverlay.promoteLayer(element, anchor)  → data-rux-modal-layer toggle
   RuxOverlay.trapFocus(element, opts)       → release(opts) — Tab cycling,
                                               initial focus, focus restore
   ========================================================================== */

(() => {
	"use strict";

	/* Surfaces portaled to <body> do not inherit the stacking context of the
	   modal or floating window that launched them; these are the hosts whose
	   children need promoting above their owner. */
	const MODAL_LAYER_HOSTS = ".rux-modal-scrim, .rux-panel--floating";

	const FOCUSABLE = [
		"a[href]",
		"button:not(:disabled)",
		"input:not(:disabled)",
		"select:not(:disabled)",
		"textarea:not(:disabled)",
		'[tabindex]:not([tabindex="-1"])',
	].join(", ");

	/* Bottom → top. */
	const stack = [];

	function contains(record, target) {
		if (!target) return false;
		return Boolean(
			record.element.contains(target) || record.anchor?.contains?.(target),
		);
	}

	/* The topmost record containing `target`, or null for none. */
	function topmostContaining(target) {
		for (let i = stack.length - 1; i >= 0; i--) {
			if (contains(stack[i], target)) return stack[i];
		}
		return null;
	}

	function drop(record) {
		const index = stack.indexOf(record);
		if (index !== -1) stack.splice(index, 1);
	}

	/* Dismiss every overlay above `boundary` (null = all of them), top first.
	   `guard` may veto a record, in which case it and everything below it
	   survive. The boundary is a record, not an index, because a close()
	   handler is free to dismiss overlays of its own and shift the stack under
	   us; the loop is bounded for the same reason. */
	function dismissAbove(boundary, options, guard) {
		let safety = stack.length;
		while (safety-- > 0) {
			const top = stack[stack.length - 1];
			if (!top || top === boundary) return;
			if (guard && !guard(top)) return;
			drop(top);
			top.close?.(options);
		}
	}

	function register(record) {
		if (!record?.element) return null;
		// Re-opening a surface replaces its record rather than nesting inside
		// itself; a stale record would keep the stack out of step with reality.
		const existing = stack.find((entry) => entry.element === record.element);
		if (existing) drop(existing);
		dismissAbove(topmostContaining(record.anchor), { restoreFocus: false });
		stack.push(record);
		return { release: () => drop(record) };
	}

	function autoId(element, prefix) {
		if (!element.id) element.id = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
		return element.id;
	}

	function promoteLayer(element, anchor) {
		element.toggleAttribute(
			"data-rux-modal-layer",
			Boolean(anchor?.closest?.(MODAL_LAYER_HOSTS)),
		);
	}

	function focusables(root) {
		return [...root.querySelectorAll(FOCUSABLE)].filter(
			(el) => !el.hidden && el.getAttribute("aria-hidden") !== "true",
		);
	}

	/* Keeps Tab and Shift+Tab cycling inside `element` so keyboard users
	   cannot reach the page behind a modal surface. Returns the release
	   function, which also restores focus to whatever had it before. */
	function trapFocus(element, options = {}) {
		const previousFocus = document.activeElement;
		const initial = element.querySelector("[autofocus]") || focusables(element)[0];
		initial?.focus?.();

		function onKeydown(event) {
			if (event.key !== "Tab" || element.hidden) return;
			const nodes = focusables(element);
			if (!nodes.length) return;
			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", onKeydown);
		return function release(releaseOptions = {}) {
			document.removeEventListener("keydown", onKeydown);
			const restore = releaseOptions.restoreFocus ?? options.restoreFocus ?? true;
			if (restore) previousFocus?.focus?.({ preventScroll: true });
		};
	}

	/* ── The single set of document-level dismiss listeners ────────────────── */

	// Capture phase, and pointerdown rather than mousedown, so this settles
	// before the pressed control takes focus and before the previously focused
	// input fires blur — the ordering the suggestions dropdown depends on.
	document.addEventListener("pointerdown", (event) => {
		if (!stack.length) return;
		dismissAbove(
			topmostContaining(event.target),
			{ restoreFocus: false },
			(record) => record.dismissOn?.outside !== false,
		);
	}, true);

	// One Escape policy for every overlay: it dismisses the topmost surface,
	// consumes the key, and goes no further.
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || !stack.length) return;
		const top = stack[stack.length - 1];
		if (top.dismissOn?.escape === false) return;
		event.preventDefault();
		drop(top);
		top.close?.({ restoreFocus: true });
	});

	window.addEventListener("resize", () => {
		stack.forEach((record) => record.reposition?.());
	});

	// One registration idiom: the namespaced Rux.<name> entry is canonical, and
	// the bare Rux<Name> global stays as the published alias that vendored
	// consumers already load.
	window.Rux = window.Rux || {};
	window.Rux.overlay = { register, autoId, promoteLayer, trapFocus, MODAL_LAYER_HOSTS };
	window.RuxOverlay = window.Rux.overlay;
})();
