(function () {
  "use strict";

  const PAPER_SIZES = {
    letter: { w: "8.5in", h: "11in" },
    legal: { w: "8.5in", h: "14in" },
    a4: { w: "210mm", h: "297mm" },
  };
  const PAGE_MARGIN = "0.2in";
  const MIN_FIT_SCALE = 0.55;
  const ICON_MAP = {
    bed: "airline_seat_flat",
    users: "tatami_seat",
    building: "apartment",
    accessibility: "accessible",
    "credit-card": "credit_card",
    paperclip: "attach_file",
    phone_enabled: "phone",
    "file-pen": "edit_document",
    request_quote: "request_quote",
    receipt: "receipt",
    paid: "paid",
    warning: "warning",
    person: "person",
    group: "group",
    "person_add": "person_add",
    "person_remove": "person_remove",
  };
  const LEGACY_REQ_MAP = {
    req_sleeper: "sleeper",
    req_56pax: "pax56",
    req_ada: "adaLift",
    need_hotel: "hotel",
    need_fuel_card: "fuelCard",
  };
  const PENDING_INDICATORS = [
    {
      icon: "paperclip",
      label: "Pending itinerary",
      check: (trip) => trip.itineraryStatus !== "received" && !(trip.trip_documents || []).some(d => d.label === "Itinerary"),
    },
    {
      icon: "phone_enabled",
      label: "Trip contact missing",
      check: (trip) => !trip.tripContact?.name && !trip.tripContact?.phone,
    },
    {
      icon: "file-pen",
      label: "Pending contract",
      check: (trip) => trip.paymentStatus === "pending",
    },
    {
      icon: "request_quote",
      label: "Pending PO",
      check: (trip) => trip.paymentStatus === "contract_signed",
    },
    {
      icon: "receipt",
      label: "Pending invoice",
      check: (trip) => trip.invoiceStatus === "pending",
    },
  ];

  function trackIdForBusNumber(number) {
    return `track-${String(number ?? "").replace(/[^A-Za-z0-9_-]/g, "_")}`;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function fmtDayHead(date) {
    return {
      name: date.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase(),
      day: String(date.getDate()),
    };
  }

  // "June 29-July 5, 2026" (crosses a month) / "July 6-12, 2026" (single
  // month) / with a repeated year only when the range crosses one too.
  function fmtWeekRange(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    const startMonth = weekStart.toLocaleDateString(undefined, { month: "long" });
    const endMonth = weekEnd.toLocaleDateString(undefined, { month: "long" });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startYear = weekStart.getFullYear();
    const endYear = weekEnd.getFullYear();
    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear}-${endMonth} ${endDay}, ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(name, className = "rux-icon rux-print-trip__icon") {
    return el("span", className, ICON_MAP[name] || name);
  }

  function fmtTime(value) {
    if (!value) return "--:--";
    const text = String(value).trim();
    if (/[ap]m$/i.test(text)) return text.replace(/\s*am$/i, " am").replace(/\s*pm$/i, " pm");
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return text;
    let hour = Number(match[1]);
    const suffix = hour < 12 ? "am" : "pm";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${match[2]} ${suffix}`;
  }

  function parseIsoDate(value) {
    if (value instanceof Date) return new Date(value);
    const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function sortedTripStops(trip) {
    return Array.isArray(trip.trip_stops)
      ? [...trip.trip_stops].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : [];
  }

  function tripTimes(trip) {
    const stops = sortedTripStops(trip);
    const pickup = stops.find((stop) => stop.type === "pickup");
    const returnStop = [...stops].reverse().find((stop) => stop.type === "return");
    return {
      departureTime: pickup?.depart_prev || trip.departureTime || trip._depTime,
      spotTime: pickup?.spot || trip.spotTime,
      returnTime: returnStop?.arrive || trip.returnTime || trip._retTime,
    };
  }

  function activeRequirementIds(trip) {
    const ids = [];
    if (trip.trip_reqs && typeof trip.trip_reqs === "object" && Object.keys(trip.trip_reqs).length) {
      Object.entries(trip.trip_reqs).forEach(([id, value]) => { if (value) ids.push(id); });
    } else {
      Object.entries(LEGACY_REQ_MAP).forEach(([key, id]) => { if (trip[key]) ids.push(id); });
    }
    return ids;
  }

  function requirementMeta(id, demo) {
    const allReqs = window.appRequirements || demo?.TRIP_REQUIREMENTS || [];
    return allReqs.find((req) => req.id === id || req.key === id);
  }

  function compactDate(value) {
    if (!value) return "";
    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return `${Number(iso[2])}/${Number(iso[3])}`;
    const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
    if (slash) return `${Number(slash[1])}/${Number(slash[2])}`;
    return text;
  }

  function detailValue(value) {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    if (!text || normalized.includes("pending") || ["draft", "hold", "working on approval", "check in mail"].includes(normalized)) {
      return "";
    }
    return text;
  }

  function paymentDetail(trip) {
    if (trip.paymentRefs?.length) return trip.paymentRefs.join(" · ");
    return trip.paymentMethod || "";
  }

  function detailField(label, value) {
    const normalized = detailValue(value);
    const field = el("span", "rux-print-trip__detail");
    const valueEl = el("span", "rux-print-trip__detail-value", normalized || "");
    if (!normalized) valueEl.classList.add("rux-print-trip__detail-value--empty");
    field.append(
      el("span", "rux-print-trip__detail-label", `${label}:`),
      valueEl,
    );
    return field;
  }

  function appendDetailRow(card, fields, className = "") {
    const row = el("div", `rux-print-trip__row rux-print-trip__detail-row${className ? " " + className : ""}`);
    row.style.gridTemplateColumns = `repeat(${fields.length}, minmax(0, 1fr))`;
    fields.forEach(([label, value]) => row.appendChild(detailField(label, value)));
    card.appendChild(row);
  }

  function createPrintTripCard(entry, demo) {
    const trip = entry.trip || {};
    const card = el("article", "rux-print-trip");
    if (!trip.driverStatus || trip.driverStatus !== "confirmed") card.classList.add("rux-print-trip--unconfirmed");
    if (entry.span > 1) card.classList.add("rux-print-trip--multi-day");
    if (entry.fromPrev) card.classList.add("rux-print-trip--from-prev");
    if (entry.toNext) card.classList.add("rux-print-trip--to-next");
    card.style.gridColumn = `${entry.start + 1} / span ${entry.span}`;
    card.style.gridRow = String((entry.printLane || 0) + 1);
    card.style.setProperty(
      "--rux-print-trip-content-width",
      entry.span > 1
        ? `calc((100% - ${Math.max(0, entry.span - 1) * 4}px) / ${entry.span})`
        : "100%",
    );

    const content = el("div", "rux-print-trip__content");

    const destinationRow = el("div", "rux-print-trip__row rux-print-trip__destination-row");
    destinationRow.appendChild(el("span", "rux-print-trip__destination", trip.destination || "Trip"));
    if (["paid_full", "overpaid"].includes(trip.paymentStatus)) {
      const paidBadge = el("span", "rux-print-trip__paid-badge");
      paidBadge.appendChild(el("span", "rux-print-trip__paid-label", trip.paymentStatus === "overpaid" ? "OVERPAID" : "PAID"));
      const datePaid = compactDate(trip.datePaid);
      if (datePaid) paidBadge.appendChild(el("span", "rux-print-trip__paid-date", datePaid));
      destinationRow.appendChild(paidBadge);
    }
    destinationRow.appendChild(el("span", "rux-print-trip__group", trip.groupLabel || "\u00a0"));
    content.appendChild(destinationRow);

    const passengerCount = (trip.trip_passengers || []).length;
    const customer = trip.is_self_organized
      ? `${passengerCount} passenger${passengerCount === 1 ? "" : "s"}`
      : trip.customer;
    content.appendChild(el("div", "rux-print-trip__row rux-print-trip__line", customer || "\u00a0"));

    const contact = trip.bookingContact || trip.tripContact || {};
    const contactText = [contact.name, contact.phone].filter(Boolean).join("  ");
    content.appendChild(el("div", "rux-print-trip__row rux-print-trip__line", contactText || "\u00a0"));

    const meta = el("div", "rux-print-trip__row rux-print-trip__meta");
    activeRequirementIds(trip).forEach((id) => {
      const req = requirementMeta(id, demo);
      if (req?.icon) meta.appendChild(icon(req.icon));
    });
    PENDING_INDICATORS.filter((item) => item.check(trip)).forEach((item) => meta.appendChild(icon(item.icon, "rux-icon rux-print-trip__icon rux-print-trip__icon--pending")));
    if (!meta.children.length) meta.appendChild(el("span", "", "\u00a0"));
    content.appendChild(meta);

    const times = tripTimes(trip);
    const timeRow = el("div", "rux-print-trip__row rux-print-trip__times");
    timeRow.append(el("span", "", fmtTime(times.departureTime)), el("span", "", fmtTime(times.spotTime)), el("span", "", fmtTime(times.returnTime)));
    content.appendChild(timeRow);

    const drivers = el("div", "rux-print-trip__row rux-print-trip__drivers");
    const roleIcons = {
      "driver": "person",
      "co-driver": "group",
      "relief-start": "person_add",
      "relief-end": "person_remove",
    };
    (trip.drivers || []).forEach((driver) => {
      const item = el("span", "rux-print-trip__driver");
      item.append(icon(roleIcons[driver.role] || "person", "rux-icon rux-print-trip__driver-icon"), el("span", "rux-print-trip__driver-name", driver.shortName || driver.name || ""));
      drivers.appendChild(item);
    });
    if (!drivers.children.length) drivers.appendChild(el("span", "rux-print-trip__driver", "\u00a0"));
    content.appendChild(drivers);

    // First driver is always "D1"; every driver beyond that is a relief
    // slot ("R1", "R2", ...) — the row's column count matches however many
    // drivers are actually assigned, not a fixed D1/D2 pair. Row is never
    // omitted (falls back to a single empty "D1" slot) so every card
    // reserves the same rows regardless of driver count.
    const driverPayFields = (trip.drivers || []).length
      ? trip.drivers.map((driver, i) => [i === 0 ? "D1" : `R${i}`, driver.pay || ""])
      : [["D1", ""]];
    appendDetailRow(content, driverPayFields, "rux-print-trip__detail-row--after-drivers");
    appendDetailRow(content, [["Mi", trip.estimatedMiles ? String(trip.estimatedMiles) : ""], ["Act", trip.actualMiles ? String(trip.actualMiles) : ""]]);
    appendDetailRow(content, [["Qt", trip.quotedPrice ? `$${Number(trip.quotedPrice).toLocaleString()}` : ""], ["PO", trip.paymentRef || ""]]);
    appendDetailRow(content, [["Inv", trip.invoiceNumber || ""]], "rux-print-trip__detail-row--single");
    appendDetailRow(content, [["Pmt", paymentDetail(trip)]], "rux-print-trip__detail-row--single");
    card.appendChild(content);
    return card;
  }

  // Day-span-only overlap check. Print deliberately ignores the live Time
  // Align state and always uses the scheduler's default day-block model.
  function rangesOverlapByDay(a, b) {
    return a.start <= b.start + b.span - 1 && b.start <= a.start + a.span - 1;
  }

  function assignPrintLanes(placements) {
    const lanes = [];
    placements
      .slice()
      .sort((a, b) => a.start - b.start)
      .forEach((p) => {
        let lane = 0;
        while (lanes[lane]?.some((other) => rangesOverlapByDay(other, p))) lane += 1;
        lanes[lane] = [...(lanes[lane] || []), p];
        p.printLane = lane;
      });
    return placements;
  }

  function printPlacementFor(entry, weekStart) {
    const trip = entry.trip || {};
    if (!trip.startDate) return null;
    const weekEnd = addDays(weekStart, 6);
    const tripStart = parseIsoDate(trip.startDate);
    const tripEnd = parseIsoDate(trip.endDate || trip.startDate);
    if (tripEnd < weekStart || tripStart > weekEnd) return null;

    const visibleStart = tripStart < weekStart ? weekStart : tripStart;
    const visibleEnd = tripEnd > weekEnd ? weekEnd : tripEnd;
    const start = Math.round((visibleStart - weekStart) / 864e5) + 1;
    const span = Math.round((visibleEnd - visibleStart) / 864e5) + 1;
    const fromPrev = tripStart < weekStart;
    const toNext = tripEnd > weekEnd;

    return {
      ...entry,
      trip: { ...trip, fromPrev, toNext },
      start,
      span,
      fromPrev,
      toNext,
    };
  }

  function ensurePageStyleEl() {
    let el = document.getElementById("rux-print-page-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "rux-print-page-style";
      document.head.appendChild(el);
    }
    return el;
  }

  function buildPrintDom({ paperSize, orientation, rowsPerPage }) {
    const demo = window.schedulerDemo;
    if (!demo) return null;

    const buses = demo.buses || [];
    const weekStart = demo.weekStart;
    const placements = demo.placements || [];

    let { w, h } = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
    if (orientation === "landscape") { const t = w; w = h; h = t; }

    ensurePageStyleEl().textContent = `@page { size: ${w} ${h}; margin: ${PAGE_MARGIN}; }`;

    const contentWidth = `calc(${w} - (2 * ${PAGE_MARGIN}))`;
    const contentHeight = `calc(${h} - (2 * ${PAGE_MARGIN}))`;

    // Group placements per bus track, clipped to the plain 7-day work week
    // (activePlacements may span 14 days if the live two-week toggle is on —
    // print always ignores that and shows only days 1-7 of the current week),
    // assigning day-overlap-only lanes.
    const byTrack = new Map();
    placements.forEach((p) => {
      const printPlacement = printPlacementFor(p, weekStart);
      if (!printPlacement || printPlacement.start > 7) return;
      const span = Math.min(printPlacement.span, 7 - printPlacement.start + 1);
      const list = byTrack.get(p.trackId) || [];
      list.push({ ...printPlacement, span });
      byTrack.set(p.trackId, list);
    });
    byTrack.forEach((list) => assignPrintLanes(list));

    const dayLabels = Array.from({ length: 7 }, (_, i) => fmtDayHead(addDays(weekStart, i)));

    const root = document.createElement("div");
    root.className = "rux-print-root";

    const busChunks = [];
    for (let i = 0; i < buses.length; i += rowsPerPage) {
      busChunks.push(buses.slice(i, i + rowsPerPage));
    }
    if (!busChunks.length) busChunks.push([]);

    busChunks.forEach((chunk, pageIndex) => {
      const page = document.createElement("div");
      page.className = "rux-print-page";
      page.style.width = contentWidth;
      page.style.height = contentHeight;

      const title = document.createElement("div");
      title.className = "rux-print__page-title";
      const logo = document.createElement("img");
      logo.className = "rux-print__page-logo";
      logo.src = "assets/logo.png";
      logo.alt = "";
      title.appendChild(logo);
      const titleText = el("span", "rux-print__page-title-text",
        fmtWeekRange(weekStart) +
        (busChunks.length > 1 ? ` — Page ${pageIndex + 1} of ${busChunks.length}` : ""));
      title.appendChild(titleText);
      page.appendChild(title);

      // Header + rows share one bordered frame (.rux-print__table) — a
      // border around the title alone wouldn't read as "the schedule."
      const table = document.createElement("div");
      table.className = "rux-print__table";
      page.appendChild(table);

      const header = document.createElement("div");
      header.className = "rux-print__header";
      const cornerCell = document.createElement("div");
      cornerCell.className = "rux-print__corner";
      header.appendChild(cornerCell);
      dayLabels.forEach((label) => {
        const cell = document.createElement("div");
        cell.className = "rux-print__day-head";
        cell.appendChild(el("span", "rux-print__day-head-name", label.name));
        cell.appendChild(el("span", "rux-print__day-head-number", label.day));
        header.appendChild(cell);
      });
      table.appendChild(header);

      // rowsPerPage is a fixed slot count, not just a chunk size: every
      // row (this page's real buses AND blank filler slots on a partial
      // last page) gets an equal-height placeholder up front, sized in
      // layoutRowHeights() below. Content is fit into each slot after —
      // never the other way around.
      for (let i = 0; i < rowsPerPage; i++) {
        const bus = chunk[i];
        const row = document.createElement("div");
        row.className = "rux-print__row";

        // Background day-column divider lines — a plain overlay behind the
        // row's content (same idea as the live scheduler's track-grid),
        // present on every row (including blank filler slots) so the day
        // columns read as a consistent grid down the whole page. Includes
        // a leading label-column placeholder so this grid's columns land
        // in the exact same place as .rux-print__row-inner's (same
        // template + gap), not just an approximation of it.
        const dayGrid = document.createElement("div");
        dayGrid.className = "rux-print__row-daygrid";
        dayGrid.setAttribute("aria-hidden", "true");
        dayGrid.appendChild(el("span", "rux-print__row-daygrid-label"));
        for (let d = 0; d < 7; d++) {
          dayGrid.appendChild(el("span", "rux-print__row-dayline"));
        }
        row.appendChild(dayGrid);

        const inner = document.createElement("div");
        inner.className = "rux-print__row-inner";
        row.appendChild(inner);

        if (!bus) {
          table.appendChild(row);
          continue;
        }

        const rowHead = document.createElement("div");
        rowHead.className = "rux-print__row-head";
        rowHead.textContent = String(bus.number ?? "").trim();
        inner.appendChild(rowHead);

        const trackId = trackIdForBusNumber(bus.number);
        const entries = byTrack.get(trackId) || [];
        entries.forEach((entry) => {
          inner.appendChild(createPrintTripCard(entry, demo));
        });

        table.appendChild(row);
      }

      root.appendChild(page);
    });

    return root;
  }

  // Rows-per-page is a fixed slot count, and every slot — real bus row or
  // blank filler on a partial last page — must be the same height. Rather
  // than pre-compute a pixel height in JS (page budget − title − header,
  // divided by rowsPerPage) and hope it sums to exactly what the page
  // actually renders, .rux-print__table/.rux-print__row are laid out with
  // CSS flex (flex: 1 1 0 on every row) so the browser itself divides
  // whatever vertical space is actually left after the title/header evenly
  // among all rows — that's correct by construction, with no gap or
  // overflow possible from a measurement mismatch between two independent
  // height calculations.
  //
  // `transform: scaleY()` (not `zoom`, which some print/PDF pipelines —
  // notably Safari's — silently ignore) shrinks an oversized row's inner
  // content vertically without moving the day columns horizontally. Transforms
  // never change how much space an element reserves in normal flow, so the
  // row's flex-allocated height + `overflow: hidden` on the outer
  // .rux-print__row (not the transformed .rux-print__row-inner) is what the
  // print pagination engine actually measures against.
  function layoutRowHeights(root) {
    root.querySelectorAll(".rux-print__row").forEach((row) => {
      const rowSlotHeight = row.getBoundingClientRect().height;
      const inner = row.querySelector(".rux-print__row-inner");
      if (!inner) return;
      const naturalHeight = inner.scrollHeight;
      if (naturalHeight > rowSlotHeight) {
        const scale = Math.max(MIN_FIT_SCALE, rowSlotHeight / naturalHeight);
        inner.style.transformOrigin = "top left";
        inner.style.transform = `scaleY(${scale})`;
      }
    });
  }

  // The logo <img>'s src fetch is async — window.print() firing before it
  // finishes loading renders as blank space, since browsers don't reliably
  // wait for late-arriving images before rasterizing print output.
  function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    return Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  function printSchedule(options) {
    const existing = document.querySelector(".rux-print-root");
    if (existing) existing.remove();

    const root = buildPrintDom(options);
    if (!root) return;
    document.body.appendChild(root);

    waitForImages(root).then(() => requestAnimationFrame(() => {
      layoutRowHeights(root);
      window.addEventListener("afterprint", () => {
        root.remove();
      }, { once: true });
      window.print();
    }));
  }

  function init() {
    const btn = document.getElementById("print-schedule-btn");
    const modal = document.getElementById("print-schedule-modal");
    const paperSizeSelect = document.getElementById("ps-paper-size");
    const orientationGroup = document.getElementById("ps-orientation-group");
    const rowsPerPageInput = document.getElementById("ps-rows-per-page");
    const confirmBtn = document.getElementById("ps-print-confirm");
    if (!btn || !modal || !paperSizeSelect || !orientationGroup || !rowsPerPageInput || !confirmBtn) return;

    try {
      const savedPaper = localStorage.getItem("rux:print-paper-size");
      if (savedPaper && PAPER_SIZES[savedPaper]) paperSizeSelect.value = savedPaper;

      const savedOrientation = localStorage.getItem("rux:print-orientation");
      if (savedOrientation === "portrait" || savedOrientation === "landscape") {
        orientationGroup.querySelectorAll(".rux-button").forEach((b) => {
          const active = b.dataset.value === savedOrientation;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
      }

      const savedRows = Number.parseInt(localStorage.getItem("rux:print-rows-per-page"), 10);
      if (Number.isFinite(savedRows) && savedRows > 0) rowsPerPageInput.value = String(savedRows);
    } catch (_) { /* localStorage unavailable */ }

    btn.addEventListener("click", () => window.Rux.openModal(modal));

    confirmBtn.addEventListener("click", () => {
      const paperSize = paperSizeSelect.value;
      const orientation = orientationGroup.querySelector('.rux-button[aria-pressed="true"]')?.dataset.value || "landscape";
      const rowsPerPage = Math.min(20, Math.max(1, Number.parseInt(rowsPerPageInput.value, 10) || 4));

      try {
        localStorage.setItem("rux:print-paper-size", paperSize);
        localStorage.setItem("rux:print-orientation", orientation);
        localStorage.setItem("rux:print-rows-per-page", String(rowsPerPage));
      } catch (_) { /* localStorage unavailable */ }

      window.Rux.closeModal(modal);
      printSchedule({ paperSize, orientation, rowsPerPage });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.PrintSchedulePanel = { init };
})();
