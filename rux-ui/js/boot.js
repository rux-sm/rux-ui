/* ==========================================================================
   RUX UI — BOOT
   --------------------------------------------------------------------------
   One entry point for attaching the shared behaviors to a piece of markup.

   Rux UI has two kinds of module. Most are explicit factories — you call
   drawer.create(), popover.position(), suggestions.attach() with the elements
   you mean — and a boot pass has nothing to find for those. Four are scanners:
   they walk a subtree and wire whatever they recognise. Those four each carry
   their own DOMContentLoaded listener, which covers the page as first parsed
   and nothing after it.

   That is the gap this closes. An application that renders markup later — a
   view swapped in, a panel fetched, a framework mounting a subtree — has no
   way to say "wire this up too" without knowing which four modules exist and
   in what order to call them. Rux.boot(root) is that call.

       Rux.boot();                   // the whole document
       Rux.boot(panel);              // just the subtree that changed

   Every scanner is repeat-safe (theme keeps a wired list, controls marks
   data-rux-scroll-edges-init, ui-shell remembers the nav it bound, utilities
   only writes attributes), so calling this more than once over the same markup
   is harmless.

   It deliberately does NOT take over DOMContentLoaded. Each module still boots
   itself exactly as before, in script order, so nothing about an existing page
   changes by loading this file.
   ========================================================================== */

(() => {
	"use strict";

	window.Rux = window.Rux || {};

	/* Order is deliberate. Theme first, so no component is wired before the
	   palette it will paint in is settled. Utilities next, because it
	   normalises raw form controls that controls.js then decorates. ui-shell
	   last, since the shell frames everything the others touch. */
	const SCANNERS = ["theme", "utilities", "controls", "uiShell"];

	/* Returns the names actually run, so a caller can assert what was present
	   rather than guess. A module that was not loaded is skipped, not an error:
	   a consumer vendoring a subset is a supported case. */
	function boot(root) {
		const scope = root || document;
		const started = [];
		for (const name of SCANNERS) {
			const mod = window.Rux[name];
			if (mod && typeof mod.init === "function") {
				mod.init(scope);
				started.push(name);
			}
		}
		return started;
	}

	window.Rux.boot = boot;
	window.RuxBoot = { boot, SCANNERS };
})();
