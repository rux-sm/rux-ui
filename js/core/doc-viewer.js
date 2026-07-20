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
		panelEl.className =
			"rux-floating-window rux-floating-window--default-size rux-doc-viewer rux-card rux-card--elevated";
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
			<footer class="rux-floating-window__footer rux-doc-viewer__footer rux-card__footer">
				<button type="button" class="rux-button rux-button--ghost rux-button--danger" data-doc-viewer-delete>
					<span class="rux-icon" aria-hidden="true">delete</span> Delete
				</button>
				<button type="button" class="rux-button rux-button--ghost" data-doc-viewer-update>
					<span class="rux-icon" aria-hidden="true">upload_file</span> Replace
				</button>
				<span class="rux-floating-window__spacer"></span>
			</footer>
		`;
		document.body.appendChild(panelEl);

		panelEl.querySelector("[data-doc-viewer-close]").addEventListener("click", close);
		panelEl.querySelector("[data-doc-viewer-delete]").addEventListener("click", () => current?.onDelete?.());
		panelEl.querySelector("[data-doc-viewer-update]").addEventListener("click", () => current?.onUpdate?.());
		window.RuxFloatingWindow.attachDrag(panelEl, panelEl.querySelector(".rux-floating-window__header"));

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && panelEl && !panelEl.hidden) close();
		});

		return panelEl;
	}

	function close() {
		if (!panelEl || panelEl.hidden) return;
		panelEl.hidden = true;
		panelEl.querySelector(".rux-doc-viewer__frame").src = "about:blank";
		current = null;
		// Drag/resize set inline left/top/width/height that would otherwise
		// persist on this singleton panel across documents — clear them here
		// so the next open() always starts from the CSS defaults, not
		// whatever size/position a previous document was left at. Same
		// cleanup trip-envelope.js's close() already does for the same reason.
		window.RuxFloatingWindow.resetGeometry(panelEl);
	}

	function open(options = {}) {
		const panel = ensurePanel();
		current = options;
		panel.querySelector("[data-doc-viewer-title]").textContent = options.title || options.fileName || "Document";
		panel.querySelector("[data-doc-viewer-icon]").textContent = options.icon || "description";
		// #view=Fit is a PDF open parameter Chromium's built-in PDF viewer
		// honors — it forces "fit whole page" zoom on load instead of its own
		// default (fit width), which can leave a tall page's bottom edge
		// scrolled out of view even when the window has room to shrink it in.
		const url = options.url
			? `${options.url}${options.url.includes("#") ? "" : "#view=Fit"}`
			: "about:blank";
		panel.querySelector(".rux-doc-viewer__frame").src = url;
		panel.querySelector("[data-doc-viewer-delete]").hidden = !options.onDelete;
		panel.querySelector("[data-doc-viewer-update]").hidden = !options.onUpdate;
		panel.hidden = false;
	}

	window.RuxDocViewer = { open, close };
})();
