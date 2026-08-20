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
	let previousFocus = null;

	function ensurePanel() {
		if (panelEl) return panelEl;

		panelEl = document.createElement("div");
		panelEl.className =
			"rux-panel rux-panel--floating rux-panel--default-size sched-doc-viewer";
		panelEl.hidden = true;
		panelEl.innerHTML = `
			<header class="rux-panel__header sched-doc-viewer__header">
				<div class="sched-doc-viewer__title-group">
					<span class="rux-icon" aria-hidden="true" data-doc-viewer-icon>description</span>
					<p class="rux-card__title sched-doc-viewer__title" data-doc-viewer-title></p>
				</div>
				<a class="rux-button rux-button--default rux-button--icon" data-doc-viewer-external target="_blank" rel="noopener" aria-label="Open document externally" title="Open externally">
					<span class="rux-icon" aria-hidden="true">open_in_new</span>
				</a>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--lg" data-doc-viewer-close aria-label="Close document viewer">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="rux-panel__body sched-doc-viewer__body">
				<iframe class="sched-doc-viewer__frame" title="Document preview"></iframe>
			</div>
			<footer class="rux-panel__footer sched-doc-viewer__footer">
				<button type="button" class="rux-button rux-button--ghost rux-button--danger" data-doc-viewer-delete>
					<span class="rux-icon" aria-hidden="true">delete</span> Delete
				</button>
				<button type="button" class="rux-button rux-button--default" data-doc-viewer-update>
					<span class="rux-icon" aria-hidden="true">upload_file</span> Replace
				</button>
				<span class="rux-panel__spacer"></span>
			</footer>
		`;
		document.body.appendChild(panelEl);
		// Built after the page booted, so the scanning modules have never seen
		// this markup: .rux-panel__body would get no scroll-shadow behaviour and
		// a <select> no placeholder sync. controls' MutationObserver only covers
		// segmented indicators, so it does not close this.
		window.Rux?.boot?.(panelEl);

		panelEl.querySelector("[data-doc-viewer-close]").addEventListener("click", close);
		panelEl.querySelector("[data-doc-viewer-external]").addEventListener("pointerdown", (event) => event.stopPropagation());
		panelEl.querySelector("[data-doc-viewer-delete]").addEventListener("click", () => current?.onDelete?.());
		panelEl.querySelector("[data-doc-viewer-update]").addEventListener("click", () => current?.onUpdate?.());
		window.RuxFloatingWindow.attachDrag(panelEl, panelEl.querySelector(".rux-panel__header"));

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && panelEl && !panelEl.hidden) close();
		});

		return panelEl;
	}

	function close() {
		if (!panelEl || panelEl.hidden) return;
		panelEl.hidden = true;
		panelEl.querySelector(".sched-doc-viewer__frame").src = "about:blank";
		current = null;
		// Drag/resize set inline left/top/width/height that would otherwise
		// persist on this singleton panel across documents — clear them here
		// so the next open() always starts from the CSS defaults, not
		// whatever size/position a previous document was left at. Same
		// cleanup trip-envelope.js's close() already does for the same reason.
		window.RuxFloatingWindow.resetGeometry(panelEl);
		previousFocus?.focus?.({ preventScroll: true });
		previousFocus = null;
	}

	function open(options = {}) {
		const panel = ensurePanel();
		previousFocus = document.activeElement;
		current = options;
		panel.classList.toggle("sched-doc-viewer--presentation", Boolean(options.presentationOnly));
		panel.classList.toggle("rux-panel--safe-viewport", Boolean(options.presentationOnly));
		panel.querySelector("[data-doc-viewer-title]").textContent = options.title || options.fileName || "Document";
		panel.querySelector("[data-doc-viewer-icon]").textContent = options.icon || "description";
		// Native PDF viewers do not all recognize the same open parameter.
		// `view=Fit` covers Chromium/Acrobat-style viewers while
		// `zoom=page-fit` covers PDF.js-style viewers. Browsers that ignore
		// either parameter simply fall back to their native zoom behavior.
		const url = options.url
			? `${options.url}${options.url.includes("#") ? "&" : "#"}page=1&view=Fit&zoom=page-fit`
			: "about:blank";
		panel.querySelector(".sched-doc-viewer__frame").src = url;
		panel.querySelector("[data-doc-viewer-delete]").hidden = !options.onDelete;
		panel.querySelector("[data-doc-viewer-update]").hidden = !options.onUpdate;
		panel.querySelector(".sched-doc-viewer__footer").hidden = !options.onDelete && !options.onUpdate;
		const externalLink = panel.querySelector("[data-doc-viewer-external]");
		externalLink.hidden = !options.externalUrl;
		externalLink.href = options.externalUrl || "#";
		panel.hidden = false;
		panel.querySelector("[data-doc-viewer-close]").focus({ preventScroll: true });
	}

	window.RuxDocViewer = { open, close };
})();
