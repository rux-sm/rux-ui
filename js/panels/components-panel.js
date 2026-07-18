/* ==========================================================================
   COMPONENTS PANEL
   --------------------------------------------------------------------------
   Switches the workspace stage to the demo matching the clicked nav item.
   ========================================================================== */

(function () {
	"use strict";

	const pageSelector = "[data-component-page]";
	const targetSelector = "[data-component-target]";

	function showComponent(name) {
		const page = document.querySelector(`${pageSelector}[data-component-page="${name}"]`);
		if (!page) return;

		document.querySelectorAll(pageSelector).forEach((el) => {
			el.hidden = el !== page;
		});
		document.querySelectorAll(targetSelector).forEach((button) => {
			button.classList.toggle("is-active", button.dataset.componentTarget === name);
		});
	}

	document.addEventListener("click", (event) => {
		const target = event.target.closest(targetSelector);
		if (target) showComponent(target.dataset.componentTarget);
	});

	const firstPage = document.querySelector(pageSelector);
	if (firstPage) showComponent(firstPage.dataset.componentPage);
})();
