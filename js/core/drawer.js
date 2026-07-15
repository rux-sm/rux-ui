/* ==========================================================================
   RUX UI — DRAWER
   --------------------------------------------------------------------------
   Shared open/close/resize behavior for a .scheduler-app__drawer, used by
   the Trips panel's left+right drawers (index.html) and the standalone
   Fleet/Driver panel drawers. Previously each of those three call sites
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
   toggleBtn     mobile/desktop toggle button, gets aria-pressed synced (optional)
   handle        resize gutter element — omit to skip drag wiring (optional)
   direction     "left" | "right" — which way dragging grows the drawer (default "left")
   getOtherDrawer  () => drawerEl|null — a sibling drawer whose width should
                 be subtracted from this one's max (only Trips' left+right
                 drawers have a sibling; omit otherwise)
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

	const DRAWER_SNAP_CLOSE = 200;
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
		} = options;

		const DRAWER_DEFAULT = schedulerAppDefaultWidth(drawer);
		const DRAWER_MIN = Math.ceil(parseFloat(getComputedStyle(panel).minWidth));

		function isOpen() {
			return drawer.classList.contains("is-open");
		}

		function open() {
			// Only force the default width when actually opening from closed —
			// open() also runs every time a different trip/record is loaded into
			// an already-open panel, and that shouldn't clobber a manual resize.
			if (!isOpen()) {
				const w = DRAWER_DEFAULT + "px";
				drawer.style.setProperty("--drawer-width", w);
				drawer.style.setProperty("--drawer-open-width", w);
			}
			drawer.classList.remove("is-closing");
			drawer.classList.add("is-open");
			panel.inert = false;
			drawer.setAttribute("aria-hidden", "false");
			toggleBtn?.setAttribute("aria-pressed", "true");
			showScrim(close);
			onOpen?.();
		}

		// Mobile drawers are full-screen overlays driven by a CSS @keyframes
		// animation (.is-closing → scheduler-mobile-drawer-out), not the width
		// transition — scheduler-app.css forces transition:none on them, so the
		// desktop close path's transitionend listener never fires there.
		function close() {
			// Leave --drawer-open-width untouched so the panel content freezes at
			// its pre-close size and only gets clipped by the shrinking drawer,
			// instead of snapping to its min-width before the drawer animates.
			drawer.style.setProperty("--drawer-width", "0px");
			panel.inert = true;
			drawer.setAttribute("aria-hidden", "true");
			toggleBtn?.setAttribute("aria-pressed", "false");
			hideScrim(close);
			onClose?.();
			if (mobilePanelQuery.matches) {
				drawer.classList.replace("is-open", "is-closing");
				const finishClose = (event) => {
					if (event.target !== panel || event.animationName !== "scheduler-mobile-drawer-out") return;
					drawer.classList.remove("is-closing");
					panel.removeEventListener("animationend", finishClose);
				};
				panel.addEventListener("animationend", finishClose);
				return;
			}
			// Removing .is-open triggers display:none on the panel content (see
			// scheduler-app.css), which is instant and unanimatable — do it only
			// once the width transition actually finishes, so the panel visibly
			// slides shut instead of vanishing the moment the class comes off.
			drawer.addEventListener("transitionend", function handler(e) {
				if (e.target !== drawer || e.propertyName !== "width") return;
				drawer.classList.remove("is-open");
				drawer.removeEventListener("transitionend", handler);
			});
		}

		/* — Resize handle (optional) — */

		if (!handle) return { open, close, isOpen };

		function drawerWidth() {
			const width = parseInt(getComputedStyle(drawer).getPropertyValue("--drawer-width"), 10);
			return Number.isFinite(width) ? width : drawer.offsetWidth;
		}

		// A standalone panel (Fleet/Driver) just clamps to a fixed ceiling. The
		// Trips panel's left+right drawers pass scheduleMin so this instead
		// leaves room for both the workspace and any open sibling drawer.
		function maxDrawerWidth() {
			if (!scheduleMin) return DRAWER_MAX;
			const bodyW = document.querySelector(".scheduler-app__body").offsetWidth;
			const otherDrawerEl = getOtherDrawer();
			const otherW = otherDrawerEl?.classList.contains("is-open") ? otherDrawerEl.offsetWidth : 0;
			return Math.max(0, Math.min(DRAWER_MAX, bodyW - otherW - moduleGutterWidth(drawer) - scheduleMin));
		}

		function setDrawerWidth(width) {
			const w = Math.min(maxDrawerWidth(), Math.max(0, width));
			drawer.style.setProperty("--drawer-width", w + "px");
			drawer.style.setProperty("--drawer-open-width", w + "px");
			return w;
		}

		function syncHandle() {
			handle.setAttribute("aria-valuemin", "0");
			handle.setAttribute("aria-valuemax", String(Math.round(maxDrawerWidth())));
			handle.setAttribute("aria-valuenow", String(Math.round(drawerWidth())));
		}
		syncHandle();

		handle.addEventListener("keydown", (e) => {
			const growKey = direction === "left" ? "ArrowRight" : "ArrowLeft";
			const shrinkKey = direction === "left" ? "ArrowLeft" : "ArrowRight";
			let nextW = null;

			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				isOpen() ? close() : open();
				requestAnimationFrame(syncHandle);
				return;
			}
			if (e.key === growKey) nextW = drawerWidth() + DRAWER_KEYBOARD_STEP;
			if (e.key === shrinkKey) nextW = drawerWidth() - DRAWER_KEYBOARD_STEP;
			if (e.key === "Home") nextW = DRAWER_MIN;
			if (e.key === "End") nextW = maxDrawerWidth();
			if (nextW === null) return;

			e.preventDefault();
			if (!isOpen()) open();
			const w = setDrawerWidth(nextW);
			if (w < DRAWER_SNAP_CLOSE) close();
			syncHandle();
		});

		handle.addEventListener("mousedown", (e) => {
			e.preventDefault();
			const wasOpen = isOpen();
			const startX = e.clientX;
			const startW = wasOpen ? drawerWidth() : 0;
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
						drawer.style.setProperty("--drawer-width", "0px");
						drawer.style.setProperty("--drawer-open-width", "0px");
						toggleBtn?.setAttribute("aria-pressed", "true");
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
				} else if (lastW < DRAWER_SNAP_CLOSE || maxDrawerWidth() < DRAWER_MIN) {
					close();
				} else if (lastW < DRAWER_MIN) {
					drawer.style.setProperty("--drawer-width", DRAWER_MIN + "px");
					drawer.style.setProperty("--drawer-open-width", DRAWER_MIN + "px");
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
