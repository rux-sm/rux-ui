/* ==========================================================================
   RUX UI — UI SHELL
   --------------------------------------------------------------------------
   Small disclosure controller for a .rux-ui-header menu button paired with
   .rux-side-nav. View routing lives in rux-ui/js/view-router.js; the set of
   views and what happens when one opens remain the application's job.
   ========================================================================== */

(() => {
	"use strict";

	/* createSideNav binds listeners, so calling init twice over the same markup
	   would fire every handler twice per click. Remembering the instance already
	   bound to a nav makes init(root) repeat-safe, which the other scanners
	   (theme's wired list, controls' data-rux-scroll-edges-init) already are —
	   and which Rux.boot(root) depends on. */
	const bound = new WeakMap();

	function createSideNav({ toggle, nav, scrim = null }) {
		if (!toggle || !nav) return null;

		// Stacked default/Close glyphs respond to aria-expanded in CSS. Retain the
		// original direct-child icon swap for existing consumers that have not
		// adopted the animated stack yet.
		const legacyIcon = toggle.querySelector(":scope > .rux-icon");

		function isOpen() {
			return nav.classList.contains("is-open");
		}

		let registration = null;

		function setOpen(open, { restoreFocus = false, focusNav = false } = {}) {
			nav.classList.toggle("is-open", open);
			scrim?.classList.toggle("is-visible", open);
			// inert alone hides the nav from the accessibility tree and
			// prevents focus; aria-hidden was redundant with it.
			nav.inert = !open;
			toggle.setAttribute("aria-expanded", String(open));
			toggle.setAttribute("aria-label", open ? "Close Navigation" : "Open Navigation");
			if (legacyIcon) legacyIcon.textContent = open ? "close" : "menu";

			// Escape comes from the overlay kernel, which owns the one Escape
			// policy for every dismissible surface. Outside-press stays opted
			// out: the scrim below is this nav's own dismiss affordance, and on
			// wide layouts the nav sits beside the workspace with no scrim at
			// all, where a stray click should not collapse navigation.
			if (open) {
				registration = window.RuxOverlay?.register({
					element: nav,
					anchor: toggle,
					close: (options) => close(options),
					dismissOn: { outside: false },
				}) ?? null;
			} else {
				registration?.release();
				registration = null;
			}

			if (open && focusNav) {
				requestAnimationFrame(() => nav.querySelector(".rux-side-nav__link")?.focus());
			}
			if (!open && restoreFocus) toggle.focus();
		}

		function open() {
			setOpen(true, { focusNav: true });
		}

		function close(options = {}) {
			setOpen(false, options);
		}

		toggle.addEventListener("click", () => {
			isOpen() ? close({ restoreFocus: true }) : open();
		});
		scrim?.addEventListener("click", () => close({ restoreFocus: true }));
		nav.addEventListener("click", (event) => {
			if (event.target.closest(".rux-side-nav__link")) {
				close({ restoreFocus: true });
			}
		});
		setOpen(false);
		return { open, close, isOpen };
	}

	function init(root = document) {
		const toggle = root.querySelector("[data-rux-side-nav-toggle]");
		const nav = root.querySelector("[data-rux-side-nav]");
		const scrim = root.querySelector("[data-rux-side-nav-scrim]");
		if (nav && bound.has(nav)) return bound.get(nav);
		const instance = createSideNav({ toggle, nav, scrim });
		if (nav && instance) bound.set(nav, instance);
		return instance;
	}

	window.Rux = window.Rux || {};
	window.Rux.uiShell = { createSideNav, init };
	window.RuxUiShell = window.Rux.uiShell;

	// Wired at parse time, because consumers read RuxUiShell.sideNav straight
	// after the script tag. If the shell markup has not been parsed yet, retry
	// once the document is ready rather than leaving sideNav silently null.
	window.RuxUiShell.sideNav = init();
	if (!window.RuxUiShell.sideNav) {
		document.addEventListener("DOMContentLoaded", () => {
			window.RuxUiShell.sideNav = window.RuxUiShell.sideNav || init();
		});
	}
})();
