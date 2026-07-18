/* ==========================================================================
   COMPONENTS PANEL
   --------------------------------------------------------------------------
   Switches the workspace stage to the demo matching the clicked nav item,
   and resolves anatomy-card token values from the live computed styles so
   they can never drift from what tokens.css actually defines.
   ========================================================================== */

(function () {
	"use strict";

	const pageSelector = "[data-component-page]";
	const targetSelector = "[data-component-target]";
	const tokenSelector = "[data-token-value]";

	function showComponent(name) {
		const page = document.querySelector(`${pageSelector}[data-component-page="${name}"]`);
		if (!page) return;

		document.querySelectorAll(pageSelector).forEach((el) => {
			el.hidden = el !== page;
		});
		document.querySelectorAll(targetSelector).forEach((button) => {
			button.classList.toggle("is-active", button.dataset.componentTarget === name);
		});

		const title = document.getElementById("components-title");
		if (title && page.dataset.componentTitle) title.textContent = page.dataset.componentTitle;
	}

	function withPx(value, rootFontSize) {
		const remMatch = value.match(/^(-?[\d.]+)rem$/);
		if (!remMatch) return value;
		const px = parseFloat(remMatch[1]) * rootFontSize;
		return `${value} (${px}px)`;
	}

	function refreshTokenValues() {
		const styles = getComputedStyle(document.documentElement);
		const rootFontSize = parseFloat(styles.fontSize);
		document.querySelectorAll(tokenSelector).forEach((output) => {
			const raw = styles.getPropertyValue(output.dataset.tokenValue).trim();
			const value = raw ? withPx(raw, rootFontSize) : "Not defined";
			output.value = value;
			output.textContent = value;
		});
	}

	document.addEventListener("click", (event) => {
		const target = event.target.closest(targetSelector);
		if (target) showComponent(target.dataset.componentTarget);
	});

	const firstPage = document.querySelector(pageSelector);
	if (firstPage) showComponent(firstPage.dataset.componentPage);

	refreshTokenValues();
})();
