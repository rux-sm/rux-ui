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
   .rux-panel--floating singleton (see ensurePanel()) instead of printing
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
		const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
		if (!match) return text;
		let hour = Number(match[1]);
		const suffix = hour < 12 ? "AM" : "PM";
		if (hour === 0) hour = 12;
		else if (hour > 12) hour -= 12;
		return `${hour}:${match[2]} ${suffix}`;
	}

	function displayAddress(address) {
		return window.RuxAddress?.display?.(address)
			?? String(address || "").trim();
	}

	function pickupStop(trip) {
		return (trip.trip_stops || []).find((s) => s.type === "pickup") || null;
	}

	function driverByRole(trip, role) {
		return (trip.drivers || []).find((d) => d.role === role) || null;
	}

	function roleLabel(role) {
		if (role === "co-driver") return "Co-Driver";
		if (role === "relief-start" || role === "relief-end")
			return "Relief Driver";
		return "Driver";
	}

	function envelopeRecipients(trip) {
		const seen = new Set();
		return (trip.drivers || []).filter((driver) => {
			const name = String(driver?.name || "").trim();
			if (!name) return false;
			const key = name.toLocaleLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	function driverFieldsForEnvelope(trip, recipient) {
		const primaryDriver = driverByRole(trip, "driver");
		if (recipient && recipient.role !== "driver") {
			return {
				middle: { label: `${roleLabel(recipient.role)}:`, name: recipient.name },
				right: { label: "Driver:", name: primaryDriver?.name },
			};
		}

		const relief =
			driverByRole(trip, "relief-start") ||
			driverByRole(trip, "relief-end");
		const secondary = relief || driverByRole(trip, "co-driver");
		return {
			middle: { label: "Driver:", name: primaryDriver?.name },
			right: {
				label: `${roleLabel(secondary?.role || "co-driver")}:`,
				name: secondary?.name,
			},
		};
	}

	function busNumberFor(trip, schedulerBuses) {
		const bus = (schedulerBuses || []).find((b) => b.id === trip.busId);
		return bus?.number != null ? String(bus.number) : "";
	}

	// The envelope travels with the driver, so its contact must come from the
	// trip's operational contact fields. Keep booking contact only as a legacy
	// fallback for older trips that do not have either trip contact populated.
	function contactFor(trip) {
		const primary = trip.tripContact;
		if (primary?.name || primary?.phone) return primary;
		const secondary = trip.tripContact2;
		if (secondary?.name || secondary?.phone) return secondary;
		return trip.bookingContact || {};
	}

	const ENVELOPE_REQUIREMENT_FALLBACKS = {
		sleeper: { label: "Sleeper", icon: "airline_seat_flat" },
		pax56: { label: "56 Pax", icon: "groups" },
		adaLift: { label: "Wheelchair Lift", icon: "accessible" },
		hotel: { label: "Hotel", icon: "apartment" },
		fuelCard: { label: "Fuel Card", icon: "credit_card", writeIn: true },
	};
	const ENVELOPE_REQUIREMENT_ICON_MAP = {
		bed: "airline_seat_flat",
		users: "groups",
		building: "apartment",
		"credit-card": "credit_card",
		accessibility: "accessible",
	};

	function activeRequirementIds(trip) {
		const tripReqs = trip.trip_reqs;
		if (tripReqs && typeof tripReqs === "object" && Object.keys(tripReqs).length) {
			return Object.entries(tripReqs)
				.filter(([, selected]) => selected)
				.map(([id]) => id);
		}
		return [
			["sleeper", trip.req_sleeper],
			["pax56", trip.req_56pax],
			["adaLift", trip.req_ada],
			["hotel", trip.need_hotel],
			["fuelCard", trip.need_fuel_card],
		]
			.filter(([, selected]) => selected)
			.map(([id]) => id);
	}

	function envelopeRequirements(trip) {
		const configured = window.appRequirements || [];
		const selected = activeRequirementIds(trip).map((id) => {
			const fallback = ENVELOPE_REQUIREMENT_FALLBACKS[id] || {};
			const requirement = configured.find((item) => item.id === id) || {};
			return {
				id,
				label: fallback.label || requirement.label || id,
				icon: ENVELOPE_REQUIREMENT_ICON_MAP[requirement.icon]
					|| requirement.icon
					|| fallback.icon
					|| "label",
				writeIn: Boolean(fallback.writeIn),
			};
		});

		const tripType = trip.trip_type || trip.tripType;
		if (tripType === "one_way" || tripType === "dropoff_pickup") {
			selected.push({
				id: "oneWay",
				label: "One-Way",
				icon: "arrow_forward",
				writeIn: false,
			});
		}
		const priority = ["pax56", "oneWay", "sleeper", "fuelCard", "adaLift", "hotel"];
		selected.sort((a, b) => {
			const aIndex = priority.indexOf(a.id);
			const bIndex = priority.indexOf(b.id);
			return (aIndex < 0 ? priority.length : aIndex)
				- (bIndex < 0 ? priority.length : bIndex);
		});
		return selected;
	}

	/* ── Field grid pieces (shared by both templates) ───────────────────── */

	function cell(label, value) {
		const node = el("div", "sched-trip-envelope__cell");
		node.appendChild(el("span", "sched-trip-envelope__label", label));
		node.appendChild(el("span", "sched-trip-envelope__value", value || ""));
		return node;
	}

	function blankCell(label) {
		return cell(label, "");
	}

	function row(className, ...cells) {
		const node = el("div", `sched-trip-envelope__row ${className}`);
		cells.forEach((c) => node.appendChild(c));
		return node;
	}

	function buildHeader(trip) {
		const header = el("header", "sched-trip-envelope__header");
		header.appendChild(
			el("h1", "sched-trip-envelope__day", fmtWeekday(trip.startDate)),
		);

		const logo = document.createElement("img");
		logo.className = "sched-trip-envelope__logo";
		logo.src = "./assets/logo.png";
		logo.alt = "";
		header.appendChild(logo);

		const yard = window.RuxSettings?.getYard?.() || {};
		const yardAddress = yard.address
			|| "2801 Zinnia Avenue, McAllen, Texas 78504, United States";
		if (yardAddress)
			header.appendChild(
				el("p", "sched-trip-envelope__company-line", displayAddress(yardAddress)),
			);
		// Settings only stores yard name/address today — these numbers are
		// static company info, not per-trip data.
		header.appendChild(
			el(
				"p",
				"sched-trip-envelope__company-line",
				"(956) 994-1169 / Fax 994-9491 / Cell 648-9691",
			),
		);

		header.appendChild(
			el("h2", "sched-trip-envelope__section-title", "Trip Information"),
		);
		return header;
	}

	// Bus plus recipient-aware driver fields, then Trip Date [/ Return] / Spot
	// Time and Pickup address — identical across Standard and MVM.
	function buildScheduleRows(trip, busNumber, recipient) {
		const frag = document.createDocumentFragment();
		const driverFields = driverFieldsForEnvelope(trip, recipient);

		frag.appendChild(
			row(
				"sched-trip-envelope__row--3",
				cell("Bus:", busNumber),
				cell(driverFields.middle.label, driverFields.middle.name),
				cell(driverFields.right.label, driverFields.right.name),
			),
		);

		const stop = pickupStop(trip);
		const isRelief = recipient
			&& (recipient.role === "relief-start" || recipient.role === "relief-end");
		const scheduleTime = isRelief
			? fmtTime(recipient.reportTime)
			: fmtTime(stop?.spot || trip.spotTime);
		const isMultiDay =
			trip.startDate && trip.endDate && trip.startDate !== trip.endDate;
		frag.appendChild(
			row(
				isMultiDay
					? "sched-trip-envelope__row--3"
					: "sched-trip-envelope__row--2",
				cell("Trip Date:", fmtDate(trip.startDate)),
				...(isMultiDay ? [cell("Return:", fmtDate(trip.endDate))] : []),
				cell(isRelief ? "Swap Time:" : "Spot Time:", scheduleTime),
			),
		);

		frag.appendChild(
			row(
				"sched-trip-envelope__row--1",
				cell("Pick Up Address:", displayAddress(stop?.address)),
			),
		);

		return frag;
	}

	// The five ELD/CC/cost lines every copy ends on — always blank, filled
	// out by hand once the trip actually happens.
	function buildFooterGrid() {
		const grid = el("div", "sched-trip-envelope__footer-grid");
		const checks = (labelText, options) => {
			const line = el("div", "sched-trip-envelope__footer-line");
			line.appendChild(
				el("span", "sched-trip-envelope__footer-label", labelText),
			);
			const boxes = el("span", "sched-trip-envelope__footer-checks");
			options.forEach((optionLabel) => {
				const opt = el("label", "sched-trip-envelope__check");
				opt.appendChild(el("span", "sched-trip-envelope__box"));
				opt.appendChild(document.createTextNode(optionLabel));
				boxes.appendChild(opt);
			});
			line.appendChild(boxes);
			return line;
		};
		const amount = (labelText) => {
			const line = el("div", "sched-trip-envelope__footer-line");
			line.appendChild(
				el("span", "sched-trip-envelope__footer-label", labelText),
			);
			line.appendChild(
				el("span", "sched-trip-envelope__footer-amount", "$"),
			);
			return line;
		};
		const blankLine = (labelText) => {
			const line = el("div", "sched-trip-envelope__footer-line");
			line.appendChild(
				el("span", "sched-trip-envelope__footer-label", labelText),
			);
			line.appendChild(el("span", "sched-trip-envelope__footer-fill"));
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

	function buildNotes(trip, recipient) {
		const notes = el("div", "sched-trip-envelope__notes");
		notes.appendChild(
			el("span", "sched-trip-envelope__notes-label", "Notes:"),
		);
		const requirements = envelopeRequirements(trip);
		const driverNote = String(recipient?.instructions || "").trim();
		if (!requirements.length && !driverNote) return notes;

		const list = el("div", "sched-trip-envelope__requirements");
		requirements.forEach((requirement) => {
			const item = el("div", "sched-trip-envelope__requirement");
			item.appendChild(
				el("span", "rux-icon sched-trip-envelope__requirement-icon", requirement.icon),
			);
			item.appendChild(
				el("span", "sched-trip-envelope__requirement-label", requirement.label),
			);
			if (requirement.writeIn) {
				item.appendChild(el("span", "sched-trip-envelope__requirement-write-in"));
			}
			list.appendChild(item);
		});
		if (driverNote) {
			const item = el(
				"div",
				"sched-trip-envelope__requirement sched-trip-envelope__driver-note",
			);
			item.appendChild(
				el("span", "rux-icon sched-trip-envelope__requirement-icon", "info"),
			);
			item.appendChild(
				el("span", "sched-trip-envelope__requirement-label", driverNote),
			);
			list.appendChild(item);
		}
		notes.appendChild(list);
		return notes;
	}

	function buildStandardEnvelope(trip, busNumber, recipient) {
		const card = el(
			"article",
			"sched-trip-envelope sched-trip-envelope--standard",
		);
		card.appendChild(buildHeader(trip));

		const grid = el("div", "sched-trip-envelope__grid");
		const scheduleFrag = buildScheduleRows(trip, busNumber, recipient);
		grid.appendChild(scheduleFrag);
		grid.appendChild(
			row(
				"sched-trip-envelope__row--1",
				cell("Destination:", trip.destination),
			),
		);
		const contact = contactFor(trip);
		grid.appendChild(
			row(
				"sched-trip-envelope__row--2",
				cell("Contact:", contact.name),
				cell("Phone:", contact.phone),
			),
		);
		grid.appendChild(
			row(
				"sched-trip-envelope__row--2",
				blankCell("Starting Odometer:"),
				blankCell("Ending Odometer:"),
			),
		);
		card.appendChild(grid);

		card.appendChild(buildFooterGrid());

		card.appendChild(buildNotes(trip, recipient));

		return card;
	}

	function buildMvmEnvelope(trip, busNumber, recipient) {
		const card = el(
			"article",
			"sched-trip-envelope sched-trip-envelope--mvm",
		);
		card.appendChild(buildHeader(trip));

		const grid = el("div", "sched-trip-envelope__grid");
		grid.appendChild(buildScheduleRows(trip, busNumber, recipient));
		grid.appendChild(
			row(
				"sched-trip-envelope__row--1",
				cell("Destination:", trip.destination),
			),
		);
		const contact = contactFor(trip);
		grid.appendChild(
			row(
				"sched-trip-envelope__row--2",
				cell("Contact Person:", contact.name),
				cell("Phone:", contact.phone),
			),
		);
		card.appendChild(grid);

		const table = document.createElement("table");
		table.className = "sched-trip-envelope__log";
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

		const notes = buildNotes(trip, recipient);
		if (notes.querySelector(".sched-trip-envelope__requirements")) {
			card.appendChild(notes);
		}
		card.appendChild(buildFooterGrid());

		return card;
	}

	/* ── Floating window (singleton, lazily created) ────────────────────── */
	// Same recipe as core/doc-viewer.js's RuxDocViewer — a draggable,
	// resizable .rux-panel--floating panel instead of a full-viewport modal,
	// so the envelope can sit alongside the calendar instead of blocking it.

	let panelEl = null;
	let current = null; // { trip, busNumber, recipients, selectedRecipientIndex }
	let activeTemplate = "standard";
	let batchPrintPending = false;

	function buildEnvelopeCard(recipient) {
		if (!current) return null;
		return activeTemplate === "mvm"
			? buildMvmEnvelope(current.trip, current.busNumber, recipient)
			: buildStandardEnvelope(current.trip, current.busNumber, recipient);
	}

	function renderCard() {
		const container = panelEl.querySelector("[data-envelope-content]");
		container.innerHTML = "";
		if (!current) return;
		container.classList.remove("is-batch-print");
		const recipient = current.recipients[current.selectedRecipientIndex] || null;
		const card = buildEnvelopeCard(recipient);
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
		const body = panelEl.querySelector(".sched-trip-envelope-window__body");
		const card = container?.querySelector(".sched-trip-envelope");
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

	function syncRecipientControl() {
		if (!panelEl || !current) return;
		const select = panelEl.querySelector("[data-envelope-driver]");
		const printAllBtn = panelEl.querySelector("[data-envelope-print-all]");
		const title = panelEl.querySelector("[data-envelope-title]");
		title.textContent = current.busNumber
			? `Trip Envelope · Bus ${current.busNumber}`
			: "Trip Envelope";
		select.innerHTML = "";
		if (!current.recipients.length) {
			const option = document.createElement("option");
			option.textContent = "No assigned drivers";
			option.value = "";
			select.appendChild(option);
			select.disabled = true;
		} else {
			current.recipients.forEach((driver, index) => {
				const option = document.createElement("option");
				option.value = String(index);
				option.textContent = `${driver.name} — ${roleLabel(driver.role)}`;
				select.appendChild(option);
			});
			select.disabled = false;
			select.value = String(current.selectedRecipientIndex);
		}
		printAllBtn.disabled = current.recipients.length <= 1;
		printAllBtn.title = current.recipients.length <= 1
			? "Only one driver is assigned to this bus"
			: `Print ${current.recipients.length} driver envelopes for bus ${current.busNumber}`;
	}

	function restorePreviewAfterPrint() {
		if (!batchPrintPending) return;
		batchPrintPending = false;
		renderCard();
		fitToHeight();
	}

	function printSelectedDriver() {
		if (!current) return;
		if (batchPrintPending) restorePreviewAfterPrint();
		window.print();
	}

	function printAllDriversForBus() {
		if (!current) return;
		if (current.recipients.length <= 1) {
			printSelectedDriver();
			return;
		}
		const container = panelEl.querySelector("[data-envelope-content]");
		container.innerHTML = "";
		container.classList.add("is-batch-print");
		current.recipients.forEach((recipient) => {
			container.appendChild(buildEnvelopeCard(recipient));
		});
		batchPrintPending = true;
		requestAnimationFrame(() => {
			try {
				window.print();
			} catch (error) {
				restorePreviewAfterPrint();
				throw error;
			}
		});
	}

	function close() {
		if (!panelEl || panelEl.hidden) return;
		if (batchPrintPending) restorePreviewAfterPrint();
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
			"rux-panel rux-panel--floating rux-panel--default-size sched-trip-envelope-window";
		panelEl.hidden = true;
		panelEl.dataset.tint = "yellow";
		panelEl.innerHTML = `
			<header class="rux-panel__header sched-trip-envelope-window__header">
				<span class="rux-panel__title" data-envelope-title>Trip Envelope</span>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--lg" data-envelope-close aria-label="Close trip envelope">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="sched-trip-envelope-window__toolbar">
				<div class="rux-segmented-track" data-rux-toggle-group data-envelope-template>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="true" data-value="standard">Standard</button>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="false" data-value="mvm">MVM</button>
				</div>
				<div class="rux-segmented-track" data-rux-toggle-group data-envelope-tint>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="true" data-value="yellow">Yellow</button>
					<button type="button" class="rux-button rux-button--segment" aria-pressed="false" data-value="white">White</button>
				</div>
			</div>
			<div class="rux-panel__body sched-trip-envelope-window__body">
				<div data-envelope-content></div>
			</div>
			<footer class="rux-panel__footer sched-trip-envelope-window__footer">
				<label class="sched-trip-envelope-window__recipient">
					<select class="rux-select" data-envelope-driver aria-label="Envelope copy for driver"></select>
				</label>
				<button type="button" class="rux-button rux-button--default" data-envelope-print>
					<span class="rux-icon" aria-hidden="true">print</span> Print Driver
				</button>
				<button type="button" class="rux-button rux-button--accent" data-envelope-print-all>
					<span class="rux-icon" aria-hidden="true">print</span> Print All
				</button>
			</footer>
		`;
		document.body.appendChild(panelEl);
		// Built after the page booted, so the scanning modules have never seen
		// this markup: .rux-panel__body would get no scroll-shadow behaviour and
		// a <select> no placeholder sync. controls' MutationObserver only covers
		// segmented indicators, so it does not close this.
		window.Rux?.boot?.(panelEl);

		panelEl
			.querySelector("[data-envelope-close]")
			.addEventListener("click", close);
		panelEl
			.querySelector("[data-envelope-print]")
			.addEventListener("click", printSelectedDriver);
		panelEl
			.querySelector("[data-envelope-print-all]")
			.addEventListener("click", printAllDriversForBus);
		panelEl
			.querySelector("[data-envelope-driver]")
			.addEventListener("change", (event) => {
				if (!current) return;
				current.selectedRecipientIndex = Number(event.target.value) || 0;
				renderCard();
				fitToHeight();
			});
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
			panelEl.querySelector(".rux-panel__header"),
		);

		// Covers native resize:both dragging and the window's own height
		// changing with the viewport (max-height is a calc(100vh - ...)),
		// so the shrink fallback stays correct either way.
		new ResizeObserver(fitToHeight).observe(
			panelEl.querySelector(".sched-trip-envelope-window__body"),
		);

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && panelEl && !panelEl.hidden) close();
		});
		window.addEventListener("afterprint", restorePreviewAfterPrint);

		return panelEl;
	}

	function open(trip, schedulerBuses, options = {}) {
		if (!trip) return;
		ensurePanel();
		panelEl.classList.toggle(
			"sched-trip-envelope-window--presentation",
			Boolean(options.presentationOnly),
		);
		panelEl.classList.toggle(
			"rux-panel--safe-viewport",
			Boolean(options.presentationOnly),
		);
		const allRecipients = envelopeRecipients(trip);
		const requestedRecipient = options.recipient
			? allRecipients.find((driver) => driver === options.recipient)
				|| allRecipients.find((driver) =>
					String(driver.name || "").toLocaleLowerCase()
						=== String(options.recipient.name || "").toLocaleLowerCase()
					&& driver.role === options.recipient.role,
				)
			: null;
		const recipients = options.recipientOnly && requestedRecipient
			? [requestedRecipient]
			: allRecipients;
		const primaryIndex = recipients.findIndex((driver) => driver.role === "driver");
		current = {
			trip,
			busNumber: options.busNumber != null
				? String(options.busNumber)
				: busNumberFor(trip, schedulerBuses),
			recipients,
			selectedRecipientIndex: requestedRecipient && !options.recipientOnly
				? Math.max(0, recipients.indexOf(requestedRecipient))
				: primaryIndex >= 0 ? primaryIndex : 0,
		};
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
		syncRecipientControl();
		renderCard();
		panelEl.hidden = false;
		fitToHeight();
	}

	window.TripEnvelope = { open };
})();
