/* ==========================================================================
   COMPONENTS PANEL
   --------------------------------------------------------------------------
   Resolves token specimens from the current computed custom properties so
   the documentation stays synchronized with tokens.css.
   ========================================================================== */

(function () {
	"use strict";

	const selector = "[data-token-value]";
	let queued = false;

	function refreshTokenValues() {
		queued = false;
		const styles = getComputedStyle(document.documentElement);

		document.querySelectorAll(selector).forEach((output) => {
			const token = output.dataset.tokenValue;
			const value = styles.getPropertyValue(token).trim();
			output.value = value || "Not defined";
			output.textContent = value || "Not defined";
		});
	}

	function queueRefresh() {
		if (queued) return;
		queued = true;
		requestAnimationFrame(refreshTokenValues);
	}

	document.addEventListener("DOMContentLoaded", refreshTokenValues);
	window.addEventListener("pageshow", queueRefresh);
	window.addEventListener("focus", queueRefresh);
	document.head.addEventListener("load", queueRefresh, true);

	document.addEventListener("click", (event) => {
		if (event.target.closest('[data-module="components"]')) queueRefresh();
	});

	new MutationObserver(queueRefresh).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "style"]
	});

	new MutationObserver(queueRefresh).observe(document.head, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: ["href", "media", "disabled"]
	});
})();
