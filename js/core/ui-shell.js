/* ==========================================================================
   RUX UI — UI SHELL
   --------------------------------------------------------------------------
   Small disclosure controller for a .rux-ui-header menu button paired with
   .rux-side-nav. Module routing remains the consuming application's job.
   ========================================================================== */

(() => {
	"use strict";

	function createSideNav({ toggle, nav, scrim = null }) {
		if (!toggle || !nav) return null;

		// Stacked Menu/Close glyphs respond to aria-expanded in CSS. Retain the
		// original direct-child icon swap for existing consumers that have not
		// adopted the animated stack yet.
		const legacyIcon = toggle.querySelector(":scope > .rux-icon");

		function isOpen() {
			return nav.classList.contains("is-open");
		}

		function setOpen(open, { restoreFocus = false, focusNav = false } = {}) {
			nav.classList.toggle("is-open", open);
			scrim?.classList.toggle("is-visible", open);
			nav.inert = !open;
			nav.setAttribute("aria-hidden", String(!open));
			toggle.setAttribute("aria-expanded", String(open));
			toggle.setAttribute("aria-label", open ? "Close Navigation" : "Open Navigation");
			if (legacyIcon) legacyIcon.textContent = open ? "close" : "menu";

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
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && isOpen()) {
				event.preventDefault();
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
		return createSideNav({ toggle, nav, scrim });
	}

	window.RuxUiShell = { createSideNav, init };
	window.RuxUiShell.sideNav = init();
})();
