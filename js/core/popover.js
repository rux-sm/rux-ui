(() => {
	"use strict";

	const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
	const tokenPx = (element, token, fallback) => {
		const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(token));
		return Number.isFinite(value) ? value : fallback;
	};

	function measure(popover) {
		popover.style.visibility = "hidden";
		popover.hidden = false;
		return popover.getBoundingClientRect();
	}

	function finish(popover, left, top, placement) {
		popover.style.left = `${Math.round(left)}px`;
		popover.style.top = `${Math.round(top)}px`;
		popover.dataset.placement = placement;
		popover.style.visibility = "";
	}

	function position(anchor, popover, options = {}) {
		if (!anchor || !popover) return;
		const placement = options.placement || "bottom-end";
		const offset = options.offset ?? tokenPx(popover, "--rux-popover-offset", 4);
		const padding = options.viewportPadding ?? tokenPx(popover, "--rux-popover-viewport-padding", 8);
		const anchorRect = anchor.getBoundingClientRect();
		const popoverRect = measure(popover);
		const align = placement.endsWith("start") ? "start" : placement.endsWith("center") ? "center" : "end";
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

	window.RuxPopover = { position, positionAtPoint };
})();
