(() => {
	"use strict";

	let active = null;

	const items = (menu) => [...menu.querySelectorAll('[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])')];

	function close(menu = active?.menu, options = {}) {
		if (!menu || menu.hidden) return;
		const trigger = menu === active?.menu ? active.trigger : null;
		menu.hidden = true;
		menu.style.visibility = "";
		trigger?.setAttribute("aria-expanded", "false");
		// Past tense, and bubbling so a listener anywhere above the menu can
		// observe it.
		menu.dispatchEvent(new CustomEvent("rux:menu-closed", { bubbles: true }));
		if (menu === active?.menu) {
			active.registration?.release();
			active = null;
		}
		if (options.restoreFocus !== false) trigger?.focus();
	}

	// Shared by both entry points: join the overlay stack, then unhide. open()
	// owns unhiding — RuxPopover.position() only places an already-shown
	// surface — so the surface is revealed invisibly and positioned before it
	// can paint at a stale location.
	function show(trigger, menu, place) {
		const registration = window.RuxOverlay.register({
			element: menu,
			anchor: trigger,
			close: (closeOptions) => close(menu, closeOptions),
		});
		active = { trigger, menu, registration };
		menu.style.visibility = "hidden";
		menu.hidden = false;
		place();
	}

	function open(trigger, menu, options = {}) {
		if (!trigger || !menu) return;
		if (!window.RuxPopover) return; // popover.js must load before menu.js
		trigger.setAttribute("aria-haspopup", "menu");
		trigger.setAttribute("aria-controls", window.RuxOverlay.autoId(menu, "rux-menu"));
		trigger.setAttribute("aria-expanded", "true");
		show(trigger, menu, () => window.RuxPopover.position(trigger, menu, {
			placement: options.placement || "bottom-end",
			offset: options.offset,
			viewportPadding: options.viewportPadding,
		}));
		if (options.focus !== false) queueMicrotask(() => items(menu)[0]?.focus());
	}

	function openAtPoint(menu, x, y, options = {}) {
		if (!menu) return;
		if (!window.RuxPopover) return; // popover.js must load before menu.js
		show(options.trigger || null, menu, () => window.RuxPopover.positionAtPoint(menu, x, y, options));
		if (options.focus !== false) queueMicrotask(() => items(menu)[0]?.focus());
	}

	/* Outside-click and Escape belong to the overlay kernel
	   (rux-ui/js/overlay.js). What stays here is menu-specific: the roving
	   arrow-key pattern, Home/End, and Tab-closes. */
	document.addEventListener("keydown", (event) => {
		if (!active) return;
		const menuItems = items(active.menu);
		const current = menuItems.indexOf(document.activeElement);
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			menuItems[(current + step + menuItems.length) % menuItems.length]?.focus();
		} else if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			menuItems[event.key === "Home" ? 0 : menuItems.length - 1]?.focus();
		} else if (event.key === "Tab") {
			close(active.menu, { restoreFocus: false });
		}
	});

	document.addEventListener("click", (event) => {
		const menuItem = event.target.closest('[role^="menuitem"]');
		if (menuItem && active?.menu.contains(menuItem)) {
			close(active.menu, { restoreFocus: true });
		}
	});

	window.Rux = window.Rux || {};
	window.Rux.menu = { open, openAtPoint, close };
	window.RuxMenu = window.Rux.menu;
})();
