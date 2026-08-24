/* ==========================================================================
   DOCUMENTS PANEL
   --------------------------------------------------------------------------
   Switches the Documents module's preview iframe and workspace title to
   the clicked list entry. Every entry declares its own src/title inline
   (data-document-*), so adding a document later is a markup-only change —
   no update needed here.
   ========================================================================== */

(function () {
	"use strict";

	const targetSelector = "[data-document-target]";

	function showDocument(button) {
		if (!button) return;

		document.querySelectorAll(targetSelector).forEach((item) => {
			const active = item === button;
			item.classList.toggle("is-active", active);
			if (active) item.setAttribute("aria-current", "page");
			else item.removeAttribute("aria-current");
		});

		const src = button.dataset.documentSrc;
		const title = button.dataset.documentTitle || button.textContent.trim();

		const frame = document.querySelector("[data-document-frame]");
		if (frame && src) frame.src = src;

		const heading = document.getElementById("documents-title");
		if (heading) heading.textContent = title;

		const externalLink = document.querySelector("[data-document-open-external]");
		if (externalLink && src) externalLink.href = src;
	}

	document.addEventListener("click", (event) => {
		// A real click lands on an Element; an event dispatched at document
		// makes the target `document`, which has no .closest. rux-ui/js/controls.js
		// carries the same guard on its own document handlers.
		if (!(event.target instanceof Element)) return;
		const target = event.target.closest(targetSelector);
		if (target) showDocument(target);
	});

	document.querySelector("[data-document-print]")?.addEventListener("click", () => {
		const frame = document.querySelector("[data-document-frame]");
		const win = frame?.contentWindow;
		if (!win) return;
		win.focus();
		win.print();
	});
})();
