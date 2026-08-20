/* ==========================================================================
   RUX UI — THEME
   --------------------------------------------------------------------------
   Owns the data-theme attribute css/tokens.css reads. The attribute itself is
   already applied synchronously in <head> (index.html) to avoid a flash of
   the wrong theme — this module keeps any theme switches in sync, handles
   their clicks, and follows the OS while no manual choice is saved.

   API
   ---
   Rux.theme.get()          → "light" | "dark"
   Rux.theme.set(theme)     → apply and persist a theme
   Rux.theme.toggle()       → flip between light and dark
   Rux.theme.init(root)     → wire every theme switch found under root
   rux:theme-changed        → dispatched on <html> with { detail: { theme } }

   Markup contract: [data-rux-theme-toggle] containing a checkbox
   (css/base/form.css .rux-switch--theme). Any number of switches may be
   wired; they stay in sync with one another.
   ========================================================================== */

(function () {
	"use strict";

	var STORAGE_KEY = "rux-theme";
	var root = document.documentElement;
	var media = window.matchMedia("(prefers-color-scheme: light)");
	var wired = [];

	function get() {
		return root.getAttribute("data-theme") === "light" ? "light" : "dark";
	}

	function set(theme) {
		theme = theme === "light" ? "light" : "dark";
		root.setAttribute("data-theme", theme);
		try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
		sync();
		root.dispatchEvent(new CustomEvent("rux:theme-changed", { detail: { theme: theme } }));
		return theme;
	}

	function toggle() {
		return set(get() === "dark" ? "light" : "dark");
	}

	/* Switches read "on" as dark, matching the moon-side glyph. */
	function sync() {
		var dark = get() === "dark";
		wired.forEach(function (input) { input.checked = dark; });
	}

	function init(scope) {
		scope = scope || document;
		var hosts = [].slice.call(scope.querySelectorAll("[data-rux-theme-toggle]"));

		hosts.forEach(function (host) {
			var input = host.matches && host.matches("input") ? host : host.querySelector("input");
			if (!input || wired.indexOf(input) !== -1) return;
			wired.push(input);
			input.addEventListener("change", function () {
				set(input.checked ? "dark" : "light");
			});
		});
		sync();
		return wired.length;
	}

	// Continue following the OS only while there is no saved manual choice.
	media.addEventListener("change", function () {
		var stored = null;
		try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
		if (stored === "light" || stored === "dark") return;
		root.setAttribute("data-theme", media.matches ? "light" : "dark");
		sync();
		root.dispatchEvent(new CustomEvent("rux:theme-changed", { detail: { theme: get() } }));
	});

	document.addEventListener("DOMContentLoaded", function () { init(document); });

	window.Rux = window.Rux || {};
	window.Rux.theme = { get: get, set: set, toggle: toggle, init: init };
	window.RuxTheme = window.Rux.theme;
})();
