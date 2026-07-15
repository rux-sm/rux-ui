/* ==========================================================================
   RUX UI — DOCUMENT VIEWER
   --------------------------------------------------------------------------
   Floating, draggable, resizable panel for previewing a trip document
   in-place (no new tab, no losing the trip panel's form state). Singleton,
   same recipe as core/menu.js — one DOM instance, created lazily, reused
   across opens.

   API
   ---
   window.RuxDocViewer.open({
     url, fileName, title, icon,
     onDelete, onUpdate,   // omit to hide that footer button
   })
   window.RuxDocViewer.close()
   ========================================================================== */

(() => {
	"use strict";

	let panelEl = null;
	let current = null;

	function ensurePanel() {
		if (panelEl) return panelEl;

		panelEl = document.createElement("div");
		panelEl.className = "rux-floating-window rux-doc-viewer rux-card rux-card--elevated";
		panelEl.hidden = true;
		panelEl.innerHTML = `
			<header class="rux-floating-window__header rux-doc-viewer__header rux-card__header">
				<div class="rux-doc-viewer__title-group">
					<span class="rux-icon" aria-hidden="true" data-doc-viewer-icon>description</span>
					<p class="rux-card__title rux-doc-viewer__title" data-doc-viewer-title></p>
				</div>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-doc-viewer-close aria-label="Close document viewer">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="rux-floating-window__body rux-doc-viewer__body rux-card__body">
				<iframe class="rux-doc-viewer__frame" title="Document preview"></iframe>
			</div>
			<footer class="rux-doc-viewer__footer rux-card__footer">
				<button type="button" class="rux-button rux-button--ghost rux-button--danger" data-doc-viewer-delete>
					<span class="rux-icon" aria-hidden="true">delete</span> Delete
				</button>
				<button type="button" class="rux-button rux-button--ghost" data-doc-viewer-update>
					<span class="rux-icon" aria-hidden="true">upload_file</span> Replace
				</button>
				<span class="rux-doc-viewer__footer-spacer"></span>
				<button type="button" class="rux-button rux-button--default" data-doc-viewer-print>
					<span class="rux-icon" aria-hidden="true">print</span> Print
				</button>
				<button type="button" class="rux-button rux-button--default" data-doc-viewer-download>
					<span class="rux-icon" aria-hidden="true">download</span> Download
				</button>
			</footer>
		`;
		document.body.appendChild(panelEl);

		panelEl.querySelector("[data-doc-viewer-close]").addEventListener("click", close);
		panelEl.querySelector("[data-doc-viewer-print]").addEventListener("click", handlePrint);
		panelEl.querySelector("[data-doc-viewer-download]").addEventListener("click", handleDownload);
		panelEl.querySelector("[data-doc-viewer-delete]").addEventListener("click", () => current?.onDelete?.());
		panelEl.querySelector("[data-doc-viewer-update]").addEventListener("click", () => current?.onUpdate?.());
		window.RuxFloatingWindow.attachDrag(panelEl, panelEl.querySelector(".rux-floating-window__header"));

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && panelEl && !panelEl.hidden) close();
		});

		return panelEl;
	}

	function handlePrint() {
		const frame = panelEl.querySelector(".rux-doc-viewer__frame");
		try {
			// Same-origin previews (blob:/local) can drive the frame's own
			// print dialog directly. Cross-origin storage URLs throw here —
			// fall back to the browser's native viewer, which has its own
			// print control.
			frame.contentWindow.focus();
			frame.contentWindow.print();
		} catch {
			window.open(current?.url, "_blank");
		}
	}

	function handleDownload() {
		if (!current?.url) return;
		const a = document.createElement("a");
		a.href = current.url;
		a.download = current.fileName || "";
		a.rel = "noopener";
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	function close() {
		if (!panelEl || panelEl.hidden) return;
		panelEl.hidden = true;
		panelEl.querySelector(".rux-doc-viewer__frame").src = "about:blank";
		current = null;
	}

	function open(options = {}) {
		const panel = ensurePanel();
		current = options;
		panel.querySelector("[data-doc-viewer-title]").textContent = options.title || options.fileName || "Document";
		panel.querySelector("[data-doc-viewer-icon]").textContent = options.icon || "description";
		panel.querySelector(".rux-doc-viewer__frame").src = options.url || "about:blank";
		panel.querySelector("[data-doc-viewer-delete]").hidden = !options.onDelete;
		panel.querySelector("[data-doc-viewer-update]").hidden = !options.onUpdate;
		panel.hidden = false;
	}

	window.RuxDocViewer = { open, close };
})();
