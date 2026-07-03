/* ==========================================================================
   COMPONENTS PANEL
   --------------------------------------------------------------------------
   Resolves token specimens from the current computed custom properties so
   the documentation stays synchronized with tokens.css.
   ========================================================================== */

(function () {
	"use strict";

	const selector = "[data-token-value]";
	const pageSelector = "[data-component-page]";
	const targetSelector = "[data-component-target]";
	let queued = false;

	function showComponentPage(name, updateHash) {
		const page = document.querySelector(`${pageSelector}[data-component-page="${name}"]`);
		if (!page) return;

		document.querySelectorAll(pageSelector).forEach((item) => {
			item.hidden = item !== page;
		});
		document.querySelectorAll(targetSelector).forEach((button) => {
			if (button.dataset.componentTarget === name) button.setAttribute("aria-current", "page");
			else button.removeAttribute("aria-current");
		});

		document.querySelector(".components-app__content")?.scrollTo({ top: 0 });
		if (updateHash) history.replaceState(null, "", `#components/${name}`);
		queueRefresh();
	}

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
		const componentTarget = event.target.closest(targetSelector);
		if (componentTarget) {
			showComponentPage(componentTarget.dataset.componentTarget, true);
			return;
		}
		if (event.target.closest('[data-module="components"]')) queueRefresh();
	});

	const initialPage = location.hash.startsWith("#components/")
		? location.hash.slice("#components/".length)
		: "buttons";
	showComponentPage(initialPage, false);

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
