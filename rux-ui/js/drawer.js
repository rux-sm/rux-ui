/* ==========================================================================
   RUX UI — DRAWER
   --------------------------------------------------------------------------
   Shared open/close/resize behavior for a docked, resizable drawer beside a
   workspace. Call sites used to hand-roll near-identical copies of this
   logic; this factory is the single implementation, so an animation or
   behavior fix only needs to be made once.

   On mobile, open() shows a shared tap-to-dismiss scrim behind the drawer
   instead of the drawer covering the full viewport — the workspace stays
   visible (dimmed) behind it, and tapping it closes whichever drawer is open.

   Application layout seam
   -----------------------
   A drawer's usable width depends on the application's own layout: which
   ancestor bounds it, which gutters sit inside that ancestor, and which
   custom properties hold the default widths. Rather than hardcode one
   application's class names, this module reads them from a single
   configuration object with portable .rux-* defaults:

   RuxDrawer.configure({ … })   — call once at startup to declare the names

     container        selector for the element bounding available width
     gutter           selector for inner gutters within that container
     scrimClass       class applied to the shared mobile scrim
     closeAnimation   animation-name awaited when closing on mobile
     widthHost        element carrying the default-width custom properties
     leftWidthVar     custom property holding the left drawer's default width
     rightWidthVar    …and the right drawer's
     rightModifier    class marking a drawer as the right-hand one
     railWidthVar     custom property holding the collapsed rail width
     fallbackWidth    selector used when `container` is absent

   API
   ---
   RuxDrawer.create(options) → { open, close, isOpen, syncHandle }

   options
   -------
   drawer        the drawer element                             (required)
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

	/* Portable defaults. An application with different layout class names
	   overrides these once via RuxDrawer.configure() instead of this file
	   naming the application. */
	const env = {
		container: ".rux-app-view",
		gutter: ":scope > .rux-drawer-gutter",
		scrimClass: "rux-drawer-scrim",
		closeAnimation: "rux-drawer-out",
		widthHost: ".rux-app-shell",
		leftWidthVar: "--rux-drawer-left-default-width",
		rightWidthVar: "--rux-drawer-right-default-width",
		rightModifier: "rux-drawer--right",
		railWidthVar: "--rux-panel-rail-width",
		fallbackWidth: ".rux-app-shell",
	};

	function configure(overrides = {}) {
		Object.assign(env, overrides);
		return { ...env };
	}

	const DRAWER_MAX = 640;
	const DRAWER_KEYBOARD_STEP = 16;
	const MOTION_COMPLETION_BUFFER_MS = 50;

	function cssList(value) {
		return value.split(",").map((item) => item.trim());
	}

	function cssTimeMs(value) {
		const amount = parseFloat(value);
		if (!Number.isFinite(amount)) return 0;
		return value.trim().endsWith("ms") ? amount : amount * 1000;
	}

	function listValue(values, index) {
		return values[index % values.length];
	}

	// Read the browser's resolved timeline instead of duplicating the motion
	// token in JavaScript. This fallback guarantees state cleanup when an
	// end/cancel event is dropped (for example, after a viewport or tab-state
	// interruption), while still allowing the event to finish the close early.
	function motionCompletionMs(target, type, expectedName) {
		const style = getComputedStyle(target);
		const isAnimation = type === "animation";
		const names = cssList(
			isAnimation ? style.animationName : style.transitionProperty,
		);
		const durations = cssList(
			isAnimation ? style.animationDuration : style.transitionDuration,
		).map(cssTimeMs);
		const delays = cssList(
			isAnimation ? style.animationDelay : style.transitionDelay,
		).map(cssTimeMs);
		const iterations = isAnimation
			? cssList(style.animationIterationCount).map((value) => {
				const count = parseFloat(value);
				return Number.isFinite(count) ? count : 1;
			})
			: [1];

		return names.reduce((longest, name, index) => {
			if (name !== expectedName && name !== "all") return longest;
			const duration = listValue(durations, index) ?? 0;
			const delay = listValue(delays, index) ?? 0;
			const iterationCount = listValue(iterations, index) ?? 1;
			return Math.max(longest, Math.max(0, delay + duration * iterationCount));
		}, 0);
	}

	function hostValue(property) {
		const host = document.querySelector(env.widthHost);
		if (!host) return NaN;
		return parseFloat(getComputedStyle(host).getPropertyValue(property));
	}

	function configuredDefaultWidth(drawerEl) {
		return hostValue(
			drawerEl.classList.contains(env.rightModifier)
				? env.rightWidthVar
				: env.leftWidthVar,
		);
	}

	// Shared with the --railable panel-width override in the application's
	// layout CSS so a railable drawer's close animation targets the exact
	// width its own container-query reflow is tuned for.
	function configuredRailWidth() {
		return hostValue(env.railWidthVar);
	}

	function containerGutterWidth(drawerEl) {
		const containerEl = drawerEl.closest(env.container);
		if (!containerEl) return 0;
		const containerStyle = getComputedStyle(containerEl);
		const outerGutters = parseFloat(containerStyle.paddingInlineStart) + parseFloat(containerStyle.paddingInlineEnd);
		const innerGutters = [...containerEl.querySelectorAll(env.gutter)]
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
		scrimEl.className = env.scrimClass;
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

		const DRAWER_DEFAULT = configuredDefaultWidth(drawer);
		let cancelPendingClose = null;

		function completeAfterMotion(target, type, expectedName, complete) {
			cancelPendingClose?.();

			const endEvent = type + "end";
			const cancelEvent = type + "cancel";
			let active = true;
			let timeoutId = null;

			function release() {
				if (!active) return;
				active = false;
				target.removeEventListener(endEvent, handleCompletionEvent);
				target.removeEventListener(cancelEvent, handleCompletionEvent);
				if (timeoutId !== null) window.clearTimeout(timeoutId);
				if (cancelPendingClose === release) cancelPendingClose = null;
			}

			function finish() {
				if (!active) return;
				release();
				complete();
			}

			function handleCompletionEvent(event) {
				if (event.target !== target) return;
				const completedName = type === "animation"
					? event.animationName
					: event.propertyName;
				if (completedName !== expectedName) return;
				finish();
			}

			target.addEventListener(endEvent, handleCompletionEvent);
			target.addEventListener(cancelEvent, handleCompletionEvent);
			cancelPendingClose = release;

			const completionMs = motionCompletionMs(target, type, expectedName);
			if (completionMs > 0) {
				timeoutId = window.setTimeout(
					finish,
					Math.ceil(completionMs) + MOTION_COMPLETION_BUFFER_MS,
				);
			} else {
				queueMicrotask(finish);
			}
		}

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
			return railWidth && !mobilePanelQuery.matches ? configuredRailWidth() : 0;
		}

		function open() {
			const reopening = drawer.classList.contains("is-collapsing");
			cancelPendingClose?.();
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
		// animation (.is-closing → env.closeAnimation), not the width
		// transition — the application's layout CSS forces transition:none on
		// them, so the
		// desktop close path's transitionend listener never fires there.
		function close() {
			if (!isOpen()) return;
			const isMobile = mobilePanelQuery.matches;
			// A railable drawer's own panel keeps rendering at rail width
			// instead of display:none (see the --railable override in
			// the application's layout CSS) — its container-query reflow (icon-only,
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
				completeAfterMotion(
					panel,
					"animation",
					env.closeAnimation,
					() => drawer.classList.remove("is-closing"),
				);
				return;
			}
			// Removing .is-open triggers display:none on the panel content (see
			// the application's layout CSS), which is instant and unanimatable — do it only
			// once the width transition actually finishes, so the panel visibly
			// slides shut instead of vanishing the moment the class comes off.
			completeAfterMotion(
				drawer,
				"transition",
				"width",
				() => drawer.classList.remove("is-open", "is-collapsing"),
			);
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
			/* Measure the drawer's owning module rather than the full app body.
			   A module may live inside an inset frame (Calendar does), so body width
			   overstates the usable split-workspace width and lets the drawer push
			   its opposite edge past the workspace minimum before snapping back. */
			const containerEl = drawer.closest(env.container);
			const availableW = containerEl?.clientWidth
				?? document.querySelector(env.fallbackWidth)?.clientWidth
				?? 0;
			const otherDrawerEl = getOtherDrawer();
			const otherW = otherDrawerEl?.classList.contains("is-open") ? otherDrawerEl.offsetWidth : 0;
			return Math.max(
				0,
				Math.min(
					DRAWER_MAX,
					availableW - otherW - containerGutterWidth(drawer) - scheduleMin,
				),
			);
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

		function beginResize() {
			drawer.classList.add("is-resizing");
			handle.classList.add("is-resizing");
		}

		function endResize() {
			drawer.classList.remove("is-resizing");
			handle.classList.remove("is-resizing");
			syncHandle();
		}

		handle.addEventListener("keydown", (e) => {
			const growKey = direction === "left" ? "ArrowRight" : "ArrowLeft";
			const shrinkKey = direction === "left" ? "ArrowLeft" : "ArrowRight";

			if (![growKey, shrinkKey, "Home", "End"].includes(e.key)) return;

			e.preventDefault();
			// The splitter resizes an open panel; disclosure belongs to the
			// panel's toggle button rather than Enter/Space or a separator click.
			if (!isOpen()) return;
			beginResize();

			let nextW = null;
			const renderedWidth = drawer.getBoundingClientRect().width;
			if (e.key === growKey) nextW = renderedWidth + DRAWER_KEYBOARD_STEP;
			if (e.key === shrinkKey) nextW = renderedWidth - DRAWER_KEYBOARD_STEP;
			if (e.key === "Home") nextW = drawerMin();
			if (e.key === "End") nextW = maxDrawerWidth();

			setDrawerWidth(nextW);
			// Force this keyboard step to resolve while the zero-duration state is
			// active, then restore the normal discrete open/close transition.
			drawer.getBoundingClientRect();
			endResize();
		});

		handle.addEventListener("pointerdown", (e) => {
			if (e.button !== 0 || !isOpen()) return;
			e.preventDefault();
			// Capture the currently rendered edge before cancelling a possibly
			// unfinished open transition, then make that exact width the direct-
			// manipulation starting point.
			const startW = drawer.getBoundingClientRect().width;
			beginResize();
			setDrawerWidth(startW);
			handle.setPointerCapture(e.pointerId);

			const startX = e.clientX;

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";

			const onMove = (ev) => {
				if (ev.pointerId !== e.pointerId) return;
				const delta = direction === "left" ? ev.clientX - startX : startX - ev.clientX;
				setDrawerWidth(startW + delta);
				syncHandle();
			};
			const onEnd = (ev) => {
				if (ev.pointerId !== e.pointerId) return;
				if (handle.hasPointerCapture(e.pointerId)) {
					handle.releasePointerCapture(e.pointerId);
				}
				endResize();
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
				handle.removeEventListener("pointermove", onMove);
				handle.removeEventListener("pointerup", onEnd);
				handle.removeEventListener("pointercancel", onEnd);
			};
			handle.addEventListener("pointermove", onMove);
			handle.addEventListener("pointerup", onEnd);
			handle.addEventListener("pointercancel", onEnd);
		});

		return { open, close, isOpen, syncHandle };
	}

	window.RuxDrawer = { create, configure };
})();
