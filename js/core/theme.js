/* ==========================================================================
   RUX UI — THEME TOGGLE
   --------------------------------------------------------------------------
   Wires the #theme-toggle switch (css/base/form.css .rux-switch--theme) to
   the data-theme attribute css/tokens.css reads. The attribute itself is
   already applied synchronously in <head> (index.html) to avoid a flash of
   the wrong theme — this just keeps the switch in sync and handles clicks.
   ========================================================================== */

(function () {
	var STORAGE_KEY = "rux-theme";
	var root = document.documentElement;
	var media = window.matchMedia("(prefers-color-scheme: light)");

	function effectiveTheme() {
		return root.getAttribute("data-theme") === "light" ? "light" : "dark";
	}

	function syncCheckbox(input) {
		input.checked = effectiveTheme() === "dark";
	}

	document.addEventListener("DOMContentLoaded", function () {
		var toggle = document.getElementById("theme-toggle");
		var input = toggle && toggle.querySelector("input");
		if (!input) return;

		syncCheckbox(input);

		input.addEventListener("change", function () {
			var theme = input.checked ? "dark" : "light";
			root.setAttribute("data-theme", theme);
			localStorage.setItem(STORAGE_KEY, theme);
		});

		// Continue following the OS only while there is no saved manual choice.
		media.addEventListener("change", function () {
			var stored = localStorage.getItem(STORAGE_KEY);
			if (stored === "light" || stored === "dark") return;

			root.setAttribute("data-theme", media.matches ? "light" : "dark");
			syncCheckbox(input);
		});
	});
})();
