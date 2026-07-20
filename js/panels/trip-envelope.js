/* ==========================================================================
   RUX UI — TRIP ENVELOPE
   --------------------------------------------------------------------------
   Printable single-trip driver paperwork: auto-fills the schedule fields a
   dispatcher already knows (bus, driver, pickup, destination, contact) and
   leaves the day-of fields (odometer, ELD, costs) blank for the driver to
   fill in by hand after the trip. Two content layouts — Standard and MVM (a
   customer variant with a multi-stop location log instead of a single
   destination) — picked manually in the preview toolbar, not auto-detected.

   Content is built the same way as print-schedule.js (a plain-paper DOM
   tree from trip data, then window.print()), but presented the way
   core/doc-viewer.js presents a document: a draggable/resizable
   .rux-floating-window singleton (see ensurePanel()) instead of printing
   immediately or blocking the page behind a modal backdrop.

   API
   ---
   window.TripEnvelope.open(trip, schedulerBuses)
   ========================================================================== */

(() => {
	"use strict";

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined && text !== null) node.textContent = text;
		return node;
	}

	function parseIsoDate(value) {
		if (!value) return null;
		const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
		if (!match) return null;
		return new Date(
			Number(match[1]),
			Number(match[2]) - 1,
			Number(match[3]),
		);
	}

	function fmtDate(value) {
		const d = parseIsoDate(value);
		if (!d) return "";
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `${mm}/${dd}/${d.getFullYear()}`;
	}

	function fmtWeekday(value) {
		const d = parseIsoDate(value);
		return d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "";
	}

	// Trip times are stored "HH:MM" 24h — reference envelope shows "9:15 AM".
	function fmtTime(value) {
		if (!value) return "";
		const text = String(value).trim();
		if (/[ap]m$/i.test(text)) return text.toUpperCase();
		const match = text.match(/^(\d{1,2}):(\d{2})$/);
		if (!match) return text;
		let hour = Number(match[1]);
		const suffix = hour < 12 ? "AM" : "PM";
		if (hour === 0) hour = 12;
		else if (hour > 12) hour -= 12;
		return `${hour}:${match[2]} ${suffix}`;
	}

	function pickupStop(trip) {
		return (trip.trip_stops || []).find((s) => s.type === "pickup") || null;
	}

	function driverByRole(trip, role) {
		return (trip.drivers || []).find((d) => d.role === role) || null;
	}

	function busNumberFor(trip, schedulerBuses) {
		const bus = (schedulerBuses || []).find((b) => b.id === trip.busId);
		return bus?.number != null ? String(bus.number) : "";
	}

	// Same precedence the rest of the app already uses (trip-bar.js,
	// print-schedule.js) — booking contact first, trip contact 1 as fallback.
	function contactFor(trip) {
		const booking = trip.bookingContact;
		if (booking?.name || booking?.phone) return booking;
		return trip.tripContact || {};
	}

	/* ── Field grid pieces (shared by both templates) ───────────────────── */

	function cell(label, value) {
		const node = el("div", "rux-trip-envelope__cell");
		node.appendChild(el("span", "rux-trip-envelope__label", label));
		node.appendChild(el("span", "rux-trip-envelope__value", value || ""));
		return node;
	}

	function blankCell(label) {
		return cell(label, "");
	}

	function row(className, ...cells) {
		const node = el("div", `rux-trip-envelope__row ${className}`);
		cells.forEach((c) => node.appendChild(c));
		return node;
	}

	function buildHeader(trip) {
		const header = el("header", "rux-trip-envelope__header");
		header.appendChild(
			el("h1", "rux-trip-envelope__day", fmtWeekday(trip.startDate)),
		);

		const logo = document.createElement("img");
		logo.className = "rux-trip-envelope__logo";
		logo.src = "./assets/logo.png";
		logo.alt = "";
		header.appendChild(logo);

		const yard = window.RuxSettings?.getYard?.() || {};
		if (yard.address)
			header.appendChild(
				el("p", "rux-trip-envelope__company-line", yard.address),
			);
		// Settings only stores yard name/address today — these numbers are
		// static company info, not per-trip data.
		header.appendChild(
			el(
				"p",
				"rux-trip-envelope__company-line",
				"(956) 994-1169 / Fax 994-9491 / Cell 648-9691",
			),
		);

		header.appendChild(
			el("h2", "rux-trip-envelope__section-title", "Trip Information"),
		);
		return header;
	}

	// Bus / Driver / Co-Driver, then Trip Date [/ Return] / Spot Time, then
	// Pickup address — identical across Standard and MVM.
	function buildScheduleRows(trip, busNumber) {
		const frag = document.createDocumentFragment();

		frag.appendChild(
			row(
				"rux-trip-envelope__row--3",
				cell("Bus:", busNumber),
				cell("Driver:", driverByRole(trip, "driver")?.name),
				cell("Co-Driver:", driverByRole(trip, "co-driver")?.name),
			),
		);

		const stop = pickupStop(trip);
		const spotTime = fmtTime(stop?.spot || trip.spotTime);
		const isMultiDay =
			trip.startDate && trip.endDate && trip.startDate !== trip.endDate;
		frag.appendChild(
			row(
				isMultiDay
					? "rux-trip-envelope__row--3"
					: "rux-trip-envelope__row--2",
				cell("Trip Date:", fmtDate(trip.startDate)),
				...(isMultiDay ? [cell("Return:", fmtDate(trip.endDate))] : []),
				cell("Spot Time:", spotTime),
			),
		);

		frag.appendChild(
			row(
				"rux-trip-envelope__row--1",
				cell("Pick Up Address:", stop?.address),
			),
		);

		return frag;
	}

	// The five ELD/CC/cost lines every copy ends on — always blank, filled
	// out by hand once the trip actually happens.
	function buildFooterGrid() {
		const grid = el("div", "rux-trip-envelope__footer-grid");
		const checks = (labelText, options) => {
			const line = el("div", "rux-trip-envelope__footer-line");
			line.appendChild(
				el("span", "rux-trip-envelope__footer-label", labelText),
			);
			const boxes = el("span", "rux-trip-envelope__footer-checks");
			options.forEach((optionLabel) => {
				const opt = el("label", "rux-trip-envelope__check");
				opt.appendChild(el("span", "rux-trip-envelope__box"));
				opt.appendChild(document.createTextNode(optionLabel));
				boxes.appendChild(opt);
			});
			line.appendChild(boxes);
			return line;
		};
		const amount = (labelText) => {
			const line = el("div", "rux-trip-envelope__footer-line");
			line.appendChild(
				el("span", "rux-trip-envelope__footer-label", labelText),
			);
			line.appendChild(
				el("span", "rux-trip-envelope__footer-amount", "$"),
			);
			return line;
		};
		const blankLine = (labelText) => {
			const line = el("div", "rux-trip-envelope__footer-line");
			line.appendChild(
				el("span", "rux-trip-envelope__footer-label", labelText),
			);
			line.appendChild(el("span", "rux-trip-envelope__footer-fill"));
			return line;
		};

		grid.appendChild(checks("ELD Verified", ["DRV", "OFC"]));
		grid.appendChild(amount("Hotel"));
		grid.appendChild(checks("ELD Backup Used", ["Yes", "No"]));
		grid.appendChild(amount("Diesel/Blue Def"));
		grid.appendChild(checks("CC for Trip", ["Yes", "No"]));
		grid.appendChild(amount("Repairs"));
		grid.appendChild(blankLine("CC Received By"));
		grid.appendChild(amount("Miscellaneous"));
		grid.appendChild(blankLine("Total Trip Miles"));
		grid.appendChild(amount("Total"));

		return grid;
	}

	function buildStandardEnvelope(trip, busNumber) {
		const card = el(
			"article",
			"rux-trip-envelope rux-trip-envelope--standard",
		);
		card.appendChild(buildHeader(trip));

		const grid = el("div", "rux-trip-envelope__grid");
		const scheduleFrag = buildScheduleRows(trip, busNumber);
		grid.appendChild(scheduleFrag);
		grid.appendChild(
			row(
				"rux-trip-envelope__row--1",
				cell("Destination:", trip.destination),
			),
		);
		const contact = contactFor(trip);
		grid.appendChild(
			row(
				"rux-trip-envelope__row--2",
				cell("Contact:", contact.name),
				cell("Phone:", contact.phone),
			),
		);
		grid.appendChild(
			row(
				"rux-trip-envelope__row--2",
				blankCell("Starting Odometer:"),
				blankCell("Ending Odometer:"),
			),
		);
		card.appendChild(grid);

		card.appendChild(buildFooterGrid());

		const notes = el("div", "rux-trip-envelope__notes");
		notes.appendChild(
			el("span", "rux-trip-envelope__footer-label", "Notes:"),
		);
		card.appendChild(notes);

		return card;
	}

	function buildMvmEnvelope(trip, busNumber) {
		const card = el(
			"article",
			"rux-trip-envelope rux-trip-envelope--mvm",
		);
		card.appendChild(buildHeader(trip));

		const grid = el("div", "rux-trip-envelope__grid");
		grid.appendChild(buildScheduleRows(trip, busNumber));
		grid.appendChild(
			row(
				"rux-trip-envelope__row--1",
				cell("Destination:", trip.destination),
			),
		);
		const contact = contactFor(trip);
		grid.appendChild(
			row(
				"rux-trip-envelope__row--2",
				cell("Contact Person:", contact.name),
				cell("Phone:", contact.phone),
			),
		);
		card.appendChild(grid);

		const table = document.createElement("table");
		table.className = "rux-trip-envelope__log";
		const thead = document.createElement("thead");
		const headRow = document.createElement("tr");
		["Location", "Time In", "Time Out", "Odometer"].forEach((label) => {
			headRow.appendChild(el("th", "", label));
		});
		thead.appendChild(headRow);
		table.appendChild(thead);
		const tbody = document.createElement("tbody");
		for (let i = 0; i < 8; i++) {
			const bodyRow = document.createElement("tr");
			for (let c = 0; c < 4; c++) bodyRow.appendChild(el("td"));
			tbody.appendChild(bodyRow);
		}
		table.appendChild(tbody);
		card.appendChild(table);

		card.appendChild(buildFooterGrid());

		return card;
	}

	/* ── Floating window (singleton, lazily created) ────────────────────── */
	// Same recipe as core/doc-viewer.js's RuxDocViewer — a draggable,
	// resizable .rux-floating-window panel instead of a full-viewport modal,
	// so the envelope can sit alongside the calendar instead of blocking it.

	let panelEl = null;
	let current = null; // { trip, busNumber }
	let activeTemplate = "standard";

	function renderCard() {
		const container = panelEl.querySelector("[data-envelope-content]");
		container.innerHTML = "";
		if (!current) return;
		const card =
			activeTemplate === "mvm"
				? buildMvmEnvelope(current.trip, current.busNumber)
				: buildStandardEnvelope(current.trip, current.busNumber);
		container.appendChild(card);
	}

	// The one and only sizing mechanism for the on-screen preview (the
	// window itself is a fixed size in trip-envelope.css) — scales the
	// whole card up or down, uncapped, to exactly fill whatever space the
	// window body has, keeping its natural proportions. Constrained by both
	// width and height so scaling up on a short trip can't push the card
	// wider than the window (the window's width doesn't grow, only its
	// visual scale does).
	function fitToHeight() {
		if (!panelEl || panelEl.hidden) return;
		const container = panelEl.querySelector("[data-envelope-content]");
		const body = panelEl.querySelector(".rux-trip-envelope-window__body");
		const card = container?.querySelector(".rux-trip-envelope");
		if (!container || !body || !card) return;

		card.style.transform = "";
		container.style.height = "";
		const naturalHeight = card.offsetHeight;
		const naturalWidth = card.offsetWidth;
		if (!naturalHeight || !naturalWidth) return;

		const bodyStyles = getComputedStyle(body);
		const availableHeight = body.clientHeight
			- parseFloat(bodyStyles.paddingTop)
			- parseFloat(bodyStyles.paddingBottom);
		const availableWidth = body.clientWidth
			- parseFloat(bodyStyles.paddingLeft)
			- parseFloat(bodyStyles.paddingRight);
		const scale = Math.min(availableHeight / naturalHeight, availableWidth / naturalWidth);

		// Default transform-origin is center — scaling around the middle
		// would leave an empty gap above equal to half the size change,
		// since the card's own layout box (unaffected by transform) still
		// occupies its natural, unscaled height. Anchoring to the top keeps
		// the top edge flush instead, both shrinking and growing.
		card.style.transformOrigin = "top center";
		card.style.transform = `scale(${scale})`;
		container.style.height = `${naturalHeight * scale}px`;
	}

	function setTemplate(value) {
		activeTemplate = value === "mvm" ? "mvm" : "standard";
		renderCard();
		fitToHeight();
	}

	// Cosmetic only — mimics the two paper stock colors so the preview reads
	// like the physical form; print output always stays plain (the real
	// paper already has the color), enforced by trip-envelope.css's
	// @media print rule rather than by anything here.
	function setTint(value) {
		panelEl.dataset.tint = value === "yellow" ? "yellow" : "white";
	}

	function close() {
		if (!panelEl || panelEl.hidden) return;
		panelEl.hidden = true;
		current = null;
		// Drag/resize set inline left/top/width/height that would otherwise
		// persist on this singleton panel across trips — clear them here so
		// the next open() always starts from the CSS defaults, not wherever
		// this session last left the window.
		window.RuxFloatingWindow.resetGeometry(panelEl);
	}

	function ensurePanel() {
		if (panelEl) return panelEl;

		panelEl = document.createElement("div");
		panelEl.className =
			"rux-floating-window rux-floating-window--default-size rux-trip-envelope-window rux-card rux-card--elevated";
		panelEl.hidden = true;
		panelEl.dataset.tint = "yellow";
		panelEl.innerHTML = `
			<header class="rux-floating-window__header rux-trip-envelope-window__header rux-card__header">
				<span class="rux-card__title">Trip Envelope</span>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-envelope-close aria-label="Close trip envelope">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="rux-floating-window__body rux-trip-envelope-window__body rux-card__body">
				<div data-envelope-content></div>
			</div>
			<footer class="rux-floating-window__footer rux-trip-envelope-window__footer rux-card__footer">
				<div class="rux-segmented-track" data-rux-toggle-group data-envelope-template>
					<button type="button" class="rux-button rux-button--segment is-active" aria-pressed="true" data-value="standard">Standard</button>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="false" data-value="mvm">MVM</button>
				</div>
				<div class="rux-segmented-track" data-rux-toggle-group data-envelope-tint>
					<button type="button" class="rux-button rux-button--segment is-active" aria-pressed="true" data-value="yellow">Yellow</button>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="false" data-value="white">White</button>
				</div>
				<span class="rux-floating-window__spacer"></span>
				<button type="button" class="rux-button rux-button--accent" data-envelope-print>
					<span class="rux-icon" aria-hidden="true">print</span> Print
				</button>
			</footer>
		`;
		document.body.appendChild(panelEl);

		panelEl
			.querySelector("[data-envelope-close]")
			.addEventListener("click", close);
		panelEl
			.querySelector("[data-envelope-print]")
			.addEventListener("click", () => window.print());
		panelEl
			.querySelector("[data-envelope-template]")
			.addEventListener("click", (e) => {
				const btn = e.target.closest(".rux-button");
				if (btn) setTemplate(btn.dataset.value);
			});
		panelEl
			.querySelector("[data-envelope-tint]")
			.addEventListener("click", (e) => {
				const btn = e.target.closest(".rux-button");
				if (btn) setTint(btn.dataset.value);
			});
		window.RuxFloatingWindow.attachDrag(
			panelEl,
			panelEl.querySelector(".rux-floating-window__header"),
		);

		// Covers native resize:both dragging and the window's own height
		// changing with the viewport (max-height is a calc(100vh - ...)),
		// so the shrink fallback stays correct either way.
		new ResizeObserver(fitToHeight).observe(
			panelEl.querySelector(".rux-trip-envelope-window__body"),
		);

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && panelEl && !panelEl.hidden) close();
		});

		return panelEl;
	}

	function open(trip, schedulerBuses) {
		if (!trip) return;
		ensurePanel();
		current = { trip, busNumber: busNumberFor(trip, schedulerBuses) };
		activeTemplate = "standard";
		panelEl.dataset.tint = "yellow";
		panelEl
			.querySelectorAll("[data-envelope-template] .rux-button")
			.forEach((b) => {
				const active = b.dataset.value === "standard";
				b.classList.toggle("is-active", active);
				b.setAttribute("aria-pressed", String(active));
			});
		panelEl
			.querySelectorAll("[data-envelope-tint] .rux-button")
			.forEach((b) => {
				const active = b.dataset.value === "yellow";
				b.classList.toggle("is-active", active);
				b.setAttribute("aria-pressed", String(active));
			});
		renderCard();
		panelEl.hidden = false;
		fitToHeight();
	}

	window.TripEnvelope = { open };
})();
