(() => {
	"use strict";

	let active = null;

	const items = (menu) => [...menu.querySelectorAll('[role^="menuitem"]:not(:disabled)')];

	function close(menu = active?.menu, options = {}) {
		if (!menu || menu.hidden) return;
		const trigger = menu === active?.menu ? active.trigger : null;
		menu.hidden = true;
		menu.style.visibility = "";
		trigger?.setAttribute("aria-expanded", "false");
		menu.dispatchEvent(new CustomEvent("rux:menu-close"));
		if (menu === active?.menu) active = null;
		if (options.restoreFocus !== false) trigger?.focus();
	}

	function open(trigger, menu, options = {}) {
		if (!trigger || !menu) return;
		if (active?.menu && active.menu !== menu) close(active.menu, { restoreFocus: false });
		document.dispatchEvent(new CustomEvent("rux:popover-open", {
			detail: { popover: menu, trigger },
		}));
		if (!menu.id) menu.id = `rux-menu-${Math.random().toString(36).slice(2, 9)}`;
		trigger.setAttribute("aria-haspopup", "menu");
		trigger.setAttribute("aria-controls", menu.id);
		trigger.setAttribute("aria-expanded", "true");
		active = { trigger, menu };
		window.RuxPopover.position(trigger, menu, {
			placement: options.placement || "bottom-end",
			offset: options.offset,
			viewportPadding: options.viewportPadding,
		});
		if (options.focus !== false) queueMicrotask(() => items(menu)[0]?.focus());
	}

	function openAtPoint(menu, x, y, options = {}) {
		if (!menu) return;
		if (active?.menu && active.menu !== menu) close(active.menu, { restoreFocus: false });
		active = { trigger: options.trigger || null, menu };
		window.RuxPopover.positionAtPoint(menu, x, y, options);
		if (options.focus !== false) queueMicrotask(() => items(menu)[0]?.focus());
	}

	document.addEventListener("pointerdown", (event) => {
		if (!active || active.menu.contains(event.target) || active.trigger?.contains(event.target)) return;
		close(active.menu, { restoreFocus: false });
	}, true);

	document.addEventListener("keydown", (event) => {
		if (!active) return;
		const menuItems = items(active.menu);
		const current = menuItems.indexOf(document.activeElement);
		if (event.key === "Escape") {
			event.preventDefault();
			close();
		} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
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

	document.addEventListener("rux:popover-open", (event) => {
		if (!active || event.detail?.popover === active.menu) return;
		close(active.menu, { restoreFocus: false });
	});

	window.RuxMenu = { open, openAtPoint, close };
})();
