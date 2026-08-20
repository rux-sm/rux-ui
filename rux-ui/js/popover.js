(() => {
	"use strict";

	const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
	const tokenPx = (element, token, fallback) => {
		const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(token));
		return Number.isFinite(value) ? value : fallback;
	};

	// position() is a pure reposition: open() owns unhiding. A surface that is
	// still hidden is measured off-screen and left exactly as it was found.
	function measure(popover) {
		const wasHidden = popover.hidden;
		const priorVisibility = popover.style.visibility;
		popover.style.visibility = "hidden";
		popover.hidden = false;
		const rect = popover.getBoundingClientRect();
		if (wasHidden) {
			popover.hidden = true;
			popover.style.visibility = priorVisibility;
		}
		return rect;
	}

	function finish(popover, left, top, placement) {
		popover.style.left = `${Math.round(left)}px`;
		popover.style.top = `${Math.round(top)}px`;
		popover.dataset.placement = placement;
		if (!popover.hidden) popover.style.visibility = "";
	}

	function position(anchor, popover, options = {}) {
		if (!anchor || !popover) return;
		// Popovers are portaled to <body>, so they do not inherit the stacking
		// context of the modal that launched them. Promote anchored popovers
		// above their owning modal; otherwise menus such as Add Payment open
		// successfully but remain hidden behind the Trip Editor surface.
		window.RuxOverlay.promoteLayer(popover, anchor);
		const placement = options.placement || "bottom-end";
		const offset = options.offset ?? tokenPx(popover, "--rux-popover-offset", 4);
		const padding = options.viewportPadding ?? tokenPx(popover, "--rux-popover-viewport-padding", 8);
		const anchorRect = anchor.getBoundingClientRect();
		const popoverRect = measure(popover);
		const align = placement.endsWith("start") ? "start" : placement.endsWith("center") ? "center" : "end";

		if (placement.startsWith("left") || placement.startsWith("right")) {
			const preferLeft = placement.startsWith("left");
			let top = align === "start"
				? anchorRect.top
				: align === "center"
					? anchorRect.top + (anchorRect.height - popoverRect.height) / 2
					: anchorRect.bottom - popoverRect.height;
			top = clamp(top, padding, window.innerHeight - popoverRect.height - padding);

			const beforeLeft = anchorRect.left - popoverRect.width - offset;
			const afterLeft = anchorRect.right + offset;
			const fitsBefore = beforeLeft >= padding;
			const fitsAfter = afterLeft + popoverRect.width <= window.innerWidth - padding;
			const useLeft = preferLeft ? fitsBefore || !fitsAfter : !fitsAfter && fitsBefore;
			let left = useLeft ? beforeLeft : afterLeft;
			left = clamp(left, padding, window.innerWidth - popoverRect.width - padding);

			finish(popover, left, top, `${useLeft ? "left" : "right"}-${align}`);
			return;
		}

		const preferTop = placement.startsWith("top");

		let left = align === "start"
			? anchorRect.left
			: align === "center"
				? anchorRect.left + (anchorRect.width - popoverRect.width) / 2
				: anchorRect.right - popoverRect.width;
		left = clamp(left, padding, window.innerWidth - popoverRect.width - padding);

		const below = anchorRect.bottom + offset;
		const above = anchorRect.top - popoverRect.height - offset;
		const fitsBelow = below + popoverRect.height <= window.innerHeight - padding;
		const fitsAbove = above >= padding;
		const useTop = preferTop ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
		let top = useTop ? above : below;
		top = clamp(top, padding, window.innerHeight - popoverRect.height - padding);

		finish(popover, left, top, `${useTop ? "top" : "bottom"}-${align}`);
	}

	function positionAtPoint(popover, x, y, options = {}) {
		if (!popover) return;
		const padding = options.viewportPadding ?? tokenPx(popover, "--rux-popover-viewport-padding", 8);
		const offset = options.offset ?? 0;
		const popoverRect = measure(popover);
		const left = clamp(x + offset, padding, window.innerWidth - popoverRect.width - padding);
		const top = clamp(y + offset, padding, window.innerHeight - popoverRect.height - padding);
		finish(popover, left, top, "point");
	}

	/* Interactive non-modal popover controller. Menus keep using RuxMenu for
	   menu-specific focus movement; this controller is for richer content such
	   as Notifications and Messages, where fields and buttons retain their
	   native keyboard behavior. */
	function createDisclosure(trigger, popover, options = {}) {
		if (!trigger || !popover) return null;
		trigger.setAttribute("aria-controls", window.RuxOverlay.autoId(popover, "rux-popover"));
		trigger.setAttribute("aria-expanded", String(!popover.hidden));

		let previousFocus = null;
		let registration = null;
		const api = { open, close, toggle, isOpen, reposition };

		function isOpen() {
			return !popover.hidden;
		}

		function reposition() {
			if (!isOpen()) return;
			position(trigger, popover, {
				placement: options.placement || "bottom-end",
				offset: options.offset,
				viewportPadding: options.viewportPadding,
			});
		}

		function open() {
			if (isOpen() || options.beforeOpen?.() === false) return;
			previousFocus = document.activeElement;
			registration = window.RuxOverlay.register({
				element: popover,
				anchor: trigger,
				close,
				reposition,
			});
			trigger.setAttribute("aria-expanded", "true");
			// open() owns unhiding; position() only places the surface.
			popover.style.visibility = "hidden";
			popover.hidden = false;
			position(trigger, popover, {
				placement: options.placement || "bottom-end",
				offset: options.offset,
				viewportPadding: options.viewportPadding,
			});
			options.onOpen?.();
			const focusTarget = typeof options.initialFocus === "function"
				? options.initialFocus()
				: options.initialFocus
					? popover.querySelector(options.initialFocus)
					: null;
			focusTarget?.focus?.();
		}

		function close(closeOptions = {}) {
			if (!isOpen()) return;
			popover.hidden = true;
			popover.style.visibility = "";
			trigger.setAttribute("aria-expanded", "false");
			registration?.release();
			registration = null;
			options.onClose?.();
			if (closeOptions.restoreFocus !== false) {
				previousFocus?.focus?.({ preventScroll: true });
			}
			previousFocus = null;
		}

		function toggle() {
			if (isOpen()) close();
			else open();
		}

		trigger.addEventListener("click", toggle);
		return api;
	}

	/* Outside-click, Escape, and resize are the overlay kernel's job
	   (rux-ui/js/overlay.js) — a disclosure registers on open and releases on
	   close. Nesting, such as Chat's emoji menu inside the chat popover, falls
	   out of the kernel's stack: the menu's trigger lives inside this popover,
	   so opening it leaves this one standing. */

	window.Rux = window.Rux || {};
	window.Rux.popover = { position, positionAtPoint, createDisclosure };
	window.RuxPopover = window.Rux.popover;
})();
