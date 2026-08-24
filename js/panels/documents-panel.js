/* ==========================================================================
   DOCUMENTS PANEL
   --------------------------------------------------------------------------
   Opens a document row in the shared RuxDocViewer floating window (the same
   window the trip panel's Files card and Tasks use). Every row declares its
   own src/title inline (data-document-*), so adding a document later is a
   markup-only change — no update needed here. Print and Open-in-new live in
   the viewer window, beside the document they act on.
   ========================================================================== */

(function () {
	"use strict";

	document.addEventListener("click", (event) => {
		// A real click lands on an Element; an event dispatched at document
		// makes the target `document`, which has no .closest. rux-ui/js/controls.js
		// carries the same guard on its own document handlers.
		if (!(event.target instanceof Element)) return;
		const row = event.target.closest("tr[data-document-src]");
		if (!row) return;
		const src = row.dataset.documentSrc;
		window.RuxDocViewer?.open({
			url: src,
			title: row.dataset.documentTitle || row.textContent.trim(),
			icon: "description",
			externalUrl: src,
		});
	});
})();
