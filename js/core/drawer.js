/* ==========================================================================
   RUX UI — DRAWER
   --------------------------------------------------------------------------
   Shared open/close/resize behavior for a .scheduler-app__drawer, used by
   the Calendar tools panel and the standalone Fleet/Driver panel drawers.
   Previously those call sites
   hand-rolled its own near-identical copy of this logic; this factory is
   the single implementation they all now share, so an animation/behavior
   fix (like the mobile scrim below) only needs to be made once.

   On mobile, open() shows a shared tap-to-dismiss scrim behind the drawer
   (see .scheduler-app__drawer-scrim in scheduler-app.css) instead of the
   drawer covering the full viewport — the workspace stays visible (dimmed)
   behind it, and tapping it closes whichever drawer is open.

   API
   ---
   RuxDrawer.create(options) → { open, close, isOpen, syncHandle }

   options
   -------
   drawer        .scheduler-app__drawer element                (required)
   panel         the .rux-*-panel element inside it             (required)
   toggleBtn     toggle button; syncs aria-expanded when present, otherwise
                 preserves the legacy aria-pressed contract (optional)
   handle        resize gutter element — omit to skip drag wiring (optional)
   direction     "left" | "right" — which way dragging grows the drawer (default "left")
   getOtherDrawer  () => drawerEl|null — a sibling drawer whose width should
                 be subtracted from this one's max; omit when no sibling
                 drawer shares the workspace
   scheduleMin   px of workspace to always leave uncovered — enables the
                 dynamic max-width calc; omit (0) to just clamp to a fixed
                 640px ceiling, which is what a standalone panel wants
   onOpen        called after the drawer's own open bookkeeping runs
   onClose       called after the drawer's own close bookkeeping runs, before
                 the close animation/transition starts
   ========================================================================== */

(() => {
	"use strict";

	const mobilePanelQuery = window.matchMedia("(max-width: 500px)");

	const DRAWER_MAX = 640;
	const HANDLE_DRAG_THRESHOLD = 5; // px of cursor movement before a click counts as a drag
	const DRAWER_KEYBOARD_STEP = 16;

	function schedulerAppDefaultWidth(drawerEl) {
		const property = drawerEl.classList.contains("scheduler-app__drawer--right")
			? "--scheduler-app-right-drawer-default-width"
			: "--scheduler-app-left-drawer-default-width";
		return parseFloat(
			getComputedStyle(document.querySelector(".scheduler-app")).getPropertyValue(property),
		);
	}

	// Shared with the --railable panel-width override in
	// css/layout/scheduler-app.css so a railable drawer's close animation
	// targets the exact width its own container-query reflow (icon-only
	// tabs, css/features/trip-panel.css) is tuned for.
	function schedulerAppRailWidth() {
		return parseFloat(
			getComputedStyle(document.querySelector(".scheduler-app")).getPropertyValue("--rux-panel-rail-width"),
		);
	}

	function moduleGutterWidth(drawerEl) {
		const moduleEl = drawerEl.closest(".scheduler-app__module");
		if (!moduleEl) return 0;
		const moduleStyle = getComputedStyle(moduleEl);
		const outerGutters = parseFloat(moduleStyle.paddingInlineStart) + parseFloat(moduleStyle.paddingInlineEnd);
		const innerGutters = [...moduleEl.querySelectorAll(":scope > .scheduler-app__gutter")]
			.reduce((total, gutter) => total + gutter.offsetWidth, 0);
		return outerGutters + innerGutters;
	}

	/* — Mobile scrim — a single overlay shared by every drawer instance,
	   since only one drawer is ever open at a time on mobile (see
	   closeOtherMobilePanel in index.html). Dims + blocks the workspace
	   behind the open drawer and closes it on tap, Gmail-nav-drawer style. */
	let scrimEl = null;
	let scrimCloseFn = null;

	function ensureScrim() {
		if (scrimEl) return scrimEl;
		scrimEl = document.createElement("div");
		scrimEl.className = "scheduler-app__drawer-scrim";
		scrimEl.addEventListener("click", () => scrimCloseFn?.());
		document.body.appendChild(scrimEl);
		return scrimEl;
	}

	function showScrim(closeFn) {
		if (!mobilePanelQuery.matches) return;
		scrimCloseFn = closeFn;
		ensureScrim().classList.add("is-visible");
	}

	function hideScrim(closeFn) {
		// A different drawer may have opened (and claimed the scrim) between
		// this one's close() starting and this running — only release it if
		// we're still the current owner, so we don't hide another drawer's scrim.
		if (scrimCloseFn !== closeFn) return;
		scrimCloseFn = null;
		scrimEl?.classList.remove("is-visible");
	}

	function create(options) {
		const {
			drawer,
			panel,
			toggleBtn = null,
			handle = null,
			direction = "left",
			getOtherDrawer = () => null,
			scheduleMin = 0,
			onOpen = null,
			onClose = null,
			// True for a drawer whose own panel collapses to an icon-only rail
			// on desktop (see the --railable CSS override) instead of
			// disappearing entirely — close() shrinks to that rail width
			// instead of 0.
			railWidth = false,
		} = options;

		const DRAWER_DEFAULT = schedulerAppDefaultWidth(drawer);
		let pendingCloseHandler = null;
		let pendingCloseTarget = null;

		// Railable panels use computed min-width: 0 so closing can reach the
		// rail. Resize clamping must read the inherited panel token instead.
		function drawerMin() {
			const panelStyle = getComputedStyle(panel);
			const tokenMin = parseFloat(panelStyle.getPropertyValue("--rux-panel-min-width"));
			const fallbackMin = parseFloat(panelStyle.minWidth);
			const min = Number.isFinite(tokenMin) ? tokenMin : fallbackMin;
			return Number.isFinite(min) ? Math.ceil(min) : 0;
		}

		function isOpen() {
			return drawer.classList.contains("is-open");
		}

		function syncToggleButton(open) {
			if (!toggleBtn) return;
			const stateAttribute = toggleBtn.hasAttribute("aria-expanded")
				? "aria-expanded"
				: "aria-pressed";
			toggleBtn.setAttribute(stateAttribute, String(open));
		}

		// Where a railable drawer rests when not open: the rail width, on
		// desktop. Non-railable drawers (Fleet/Driver/Customer) and mobile
		// (rail never applies there) both fall through to fully closed (0).
		// Shared by close() and the drag-from-closed paths below so all
		// three agree on where "closed" starts from.
		function closedTargetWidth() {
			return railWidth && !mobilePanelQuery.matches ? schedulerAppRailWidth() : 0;
		}

		function open() {
			const reopening = drawer.classList.contains("is-collapsing");
			if (pendingCloseHandler && pendingCloseTarget) {
				pendingCloseTarget.removeEventListener("transitionend", pendingCloseHandler);
				pendingCloseTarget.removeEventListener("animationend", pendingCloseHandler);
				pendingCloseHandler = null;
				pendingCloseTarget = null;
			}
			// Only force the default width when actually opening from closed —
			// open() also runs every time a different trip/record is loaded into
			// an already-open panel, and that shouldn't clobber a manual resize.
			if (!isOpen() || reopening) {
				const rememberedWidth = drawer.style.getPropertyValue("--drawer-open-width");
				const w = reopening && rememberedWidth
					? rememberedWidth
					: DRAWER_DEFAULT + "px";
				drawer.style.setProperty("--drawer-width", w);
				drawer.style.setProperty("--drawer-open-width", w);
			}
			drawer.classList.remove("is-closing", "is-collapsing");
			if (railWidth && !mobilePanelQuery.matches && (!isOpen() || reopening)) {
				drawer.classList.add("is-expanding");
				requestAnimationFrame(() =>
					requestAnimationFrame(() => drawer.classList.remove("is-expanding")),
				);
			}
			drawer.classList.add("is-open");
			panel.inert = false;
			drawer.setAttribute("aria-hidden", "false");
			syncToggleButton(true);
			showScrim(close);
			onOpen?.();
		}

		// Mobile drawers are full-screen overlays driven by a CSS @keyframes
		// animation (.is-closing → scheduler-mobile-drawer-out), not the width
		// transition — scheduler-app.css forces transition:none on them, so the
		// desktop close path's transitionend listener never fires there.
		function close() {
			if (!isOpen()) return;
			const isMobile = mobilePanelQuery.matches;
			// A railable drawer's own panel keeps rendering at rail width
			// instead of display:none (see the --railable override in
			// scheduler-app.css) — its container-query reflow (icon-only,
			// then stacked tabs) animates continuously as --drawer-width
			// shrinks toward that target, so there's no separate element to
			// hand off to. --drawer-open-width is left untouched regardless,
			// same as always, so a non-railable panel's content freezes at
			// its pre-close size and only gets clipped by the shrinking
			// drawer, instead of snapping to its min-width before the drawer
			// animates.
			// Desktop drawers keep .is-open until their width transition finishes.
			// The extra state selects the productive exit curve during that period;
			// mobile uses its separate .is-closing keyframe state below.
			if (!isMobile) {
				drawer.classList.add("is-collapsing");
			}
			drawer.style.setProperty("--drawer-width", closedTargetWidth() + "px");
			panel.inert = true;
			drawer.setAttribute("aria-hidden", "true");
			syncToggleButton(false);
			hideScrim(close);
			onClose?.();
			if (isMobile) {
				drawer.classList.replace("is-open", "is-closing");
				pendingCloseHandler = (event) => {
					if (event.target !== panel || event.animationName !== "scheduler-mobile-drawer-out") return;
					drawer.classList.remove("is-closing");
					panel.removeEventListener("animationend", pendingCloseHandler);
					pendingCloseHandler = null;
					pendingCloseTarget = null;
				};
				pendingCloseTarget = panel;
				panel.addEventListener("animationend", pendingCloseHandler);
				return;
			}
			// Removing .is-open triggers display:none on the panel content (see
			// scheduler-app.css), which is instant and unanimatable — do it only
			// once the width transition actually finishes, so the panel visibly
			// slides shut instead of vanishing the moment the class comes off.
			pendingCloseHandler = function handler(e) {
				if (e.target !== drawer || e.propertyName !== "width") return;
				drawer.classList.remove("is-open", "is-collapsing");
				drawer.removeEventListener("transitionend", handler);
				pendingCloseHandler = null;
				pendingCloseTarget = null;
			};
			pendingCloseTarget = drawer;
			drawer.addEventListener("transitionend", pendingCloseHandler);
		}

		/* — Resize handle (optional) — */

		if (!handle) return { open, close, isOpen };

		function drawerWidth() {
			const width = parseInt(getComputedStyle(drawer).getPropertyValue("--drawer-width"), 10);
			return Number.isFinite(width) ? width : drawer.offsetWidth;
		}

		// A standalone panel (Fleet/Driver) just clamps to a fixed ceiling. The
		// Drawers with a shared workspace pass scheduleMin so this instead
		// leaves room for both the workspace and any open sibling drawer.
		function maxDrawerWidth() {
			if (!scheduleMin) return DRAWER_MAX;
			const bodyW = document.querySelector(".scheduler-app__body").offsetWidth;
			const otherDrawerEl = getOtherDrawer();
			const otherW = otherDrawerEl?.classList.contains("is-open") ? otherDrawerEl.offsetWidth : 0;
			return Math.max(0, Math.min(DRAWER_MAX, bodyW - otherW - moduleGutterWidth(drawer) - scheduleMin));
		}

		function setDrawerWidth(width) {
			const max = maxDrawerWidth();
			const min = isOpen() ? Math.min(drawerMin(), max) : 0;
			const w = Math.min(max, Math.max(min, width));
			drawer.style.setProperty("--drawer-width", w + "px");
			drawer.style.setProperty("--drawer-open-width", w + "px");
			return w;
		}

		function syncHandle() {
			handle.setAttribute(
				"aria-valuemin",
				String(Math.round(isOpen() ? drawerMin() : closedTargetWidth())),
			);
			handle.setAttribute("aria-valuemax", String(Math.round(maxDrawerWidth())));
			handle.setAttribute("aria-valuenow", String(Math.round(drawerWidth())));
		}
		syncHandle();

		handle.addEventListener("keydown", (e) => {
			const growKey = direction === "left" ? "ArrowRight" : "ArrowLeft";
			const shrinkKey = direction === "left" ? "ArrowLeft" : "ArrowRight";

			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				isOpen() ? close() : open();
				requestAnimationFrame(syncHandle);
				return;
			}
			if (![growKey, shrinkKey, "Home", "End"].includes(e.key)) return;

			e.preventDefault();
			// Open first, before reading drawerMin() below — for a railable
			// drawer its min-width floor is only the "open" value once
			// .is-open is present (relaxed to the rail width while closed);
			// computing Home's target width before this would read the
			// relaxed floor instead of the intended resize-clamp one.
			if (!isOpen()) open();

			let nextW = null;
			if (e.key === growKey) nextW = drawerWidth() + DRAWER_KEYBOARD_STEP;
			if (e.key === shrinkKey) nextW = drawerWidth() - DRAWER_KEYBOARD_STEP;
			if (e.key === "Home") nextW = drawerMin();
			if (e.key === "End") nextW = maxDrawerWidth();

			setDrawerWidth(nextW);
			syncHandle();
		});

		handle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			const wasOpen = isOpen();
			const startX = e.clientX;
			// Drag can start from a railed (32px) drawer, not just a fully
			// closed (0) one — closedTargetWidth() is the same helper close()
			// itself uses, so this always starts measuring from wherever the
			// drawer actually is, not a hardcoded assumption.
			const startW = wasOpen ? drawerWidth() : closedTargetWidth();
			let lastW = startW;
			let moved = false;

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";

			const onMove = (ev) => {
				if (!moved) {
					if (Math.abs(ev.clientX - startX) < HANDLE_DRAG_THRESHOLD) return;
					moved = true;
					drawer.classList.add("is-resizing");
					handle.classList.add("is-resizing");
					if (!wasOpen) {
						drawer.classList.add("is-open");
						panel.inert = false;
						drawer.setAttribute("aria-hidden", "false");
						const w = closedTargetWidth() + "px";
						drawer.style.setProperty("--drawer-width", w);
						drawer.style.setProperty("--drawer-open-width", w);
						syncToggleButton(true);
					}
				}
				const delta = direction === "left" ? ev.clientX - startX : startX - ev.clientX;
				lastW = startW + delta;
				setDrawerWidth(lastW);
				syncHandle();
			};
			const onUp = () => {
				drawer.classList.remove("is-resizing");
				handle.classList.remove("is-resizing");
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
				if (!moved) {
					wasOpen ? close() : open();
				} else if (maxDrawerWidth() < drawerMin()) {
					close();
				} else if (lastW < drawerMin()) {
					/* The rendered panel stops at its minimum width during the
					   drag, so content never compresses past its responsive
					   floor. The pointer's unclamped width still decides the
					   release: crossing more than half of the remaining distance
					   from min-width to the closed rail commits the collapse;
					   otherwise the panel settles back against the min wall. */
					const minW = drawerMin();
					const closedW = closedTargetWidth();
					const closeThreshold = closedW + (minW - closedW) / 2;
					if (lastW < closeThreshold) {
						close();
					} else {
						const w = minW + "px";
						drawer.style.setProperty("--drawer-width", w);
						drawer.style.setProperty("--drawer-open-width", w);
					}
				}
				syncHandle();
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		});

		return { open, close, isOpen, syncHandle };
	}

	window.RuxDrawer = { create };
})();
