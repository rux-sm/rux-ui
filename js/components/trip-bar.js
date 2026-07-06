/* ==========================================================================
   RUX UI — TRIP BAR
   --------------------------------------------------------------------------
   Creates and manages trip bar elements for the scheduler grid.
   No framework, no build step.

   API
   ---
   createTripBar(trip, callbacks)   → create and return a .rux-trip-bar element
   el.setActive(bool)               → toggle selected state on the bar
   el.setExpanded(bool)             → toggle expanded/collapsed state
   el.tripData                      → read the trip data object for this bar
   ========================================================================== */

/* ── Module state ───────────────────────────────────────────────────────── */

let outsideDismissInstalled = false;
let floatingTooltipInstalled = false;
let floatingTooltip = null;
let floatingTooltipTarget = null;
const tripBars = new Set();

/* ── Selection ──────────────────────────────────────────────────────────── */

function deactivateTripBars(except = null) {
  tripBars.forEach((bar) => {
    if (bar === except) return;
    if (typeof bar.setActive === "function") {
      bar.setActive(false);
    } else {
      bar.classList.remove("is-active", "is-expanded");
    }
  });
}

function installOutsideDismiss() {
  if (outsideDismissInstalled) return;
  outsideDismissInstalled = true;

  document.addEventListener(
    "pointerdown",
    (event) => {
      const currentBar = event.target?.closest?.(".rux-trip-bar") || null;
      deactivateTripBars(currentBar);
    },
    true,
  );
}

/* ── DOM helpers ────────────────────────────────────────────────────────── */

const ICON_MAP = {
  "map": "map", "map-pin": "location_on", "map-pin-check": "where_to_vote",
  "user": "person", "user-plus": "person_add", "search": "search",
  "info": "info", "receipt": "receipt_long", "files": "folder_open",
  "x": "close", "plus": "add", "minus": "remove",
  "arrow-right": "arrow_forward", "arrow-left-right": "swap_horiz",
  "trash-2": "delete", "upload": "upload", "route": "route",
  "eraser": "backspace", "save": "save", "file-up": "upload_file",
  "panel-right-open": "dock_to_right",
  "calendar-days": "calendar_month", "calendar-search": "event_note", "calendar-x": "event_busy",
  "list": "list", "list-filter": "filter_list",
  "chevron-left": "chevron_left", "chevron-right": "chevron_right",
  "chevrons-left": "first_page", "chevrons-right": "last_page",
  "wrench": "build", "accessibility": "accessible", "bed": "airline_seat_flat",
  "car": "directions_car", "truck": "local_shipping",
  "circle-check": "check_circle", "circle-pause": "pause_circle",
  "circle-x": "cancel", "circle-alert": "error", "ban": "block",
  "id-card": "badge", "activity": "monitoring", "columns-3": "view_column",
  "tag": "label", "rotate-ccw": "undo", "grip-vertical": "drag_indicator",
  "file-pen": "edit_document", "send": "send",
  "alert-triangle": "warning",
  "paperclip": "attach_file",
  "chevron-down": "keyboard_arrow_down",
  "hotel": "apartment",
  "building": "apartment",
  "credit-card": "credit_card",
  "users": "tatami_seat",
  "zap": "power", "bolt": "power",
  "groups": "tatami_seat",
  "external-link": "open_in_new",
  "phone": "phone",
};

function icon(name, className = "rux-icon") {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = ICON_MAP[name] || name;
  return el;
}

function containsNode(el, node) {
  return node instanceof Node && el.contains(node);
}

function button(className, label, iconName, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.setAttribute("aria-label", label);
  setFloatingTooltip(btn, label);
  btn.appendChild(icon(iconName));
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick?.();
  });
  return btn;
}

function textEl(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text ?? "";
  return el;
}

/* ── Tooltip ────────────────────────────────────────────────────────────── */

function setFloatingTooltip(el, label) {
  el.dataset.tooltip = label;
  el.dataset.ruxTooltip = "floating";
}

function ensureFloatingTooltip() {
  if (floatingTooltip) return floatingTooltip;
  floatingTooltip = document.createElement("div");
  floatingTooltip.id = "rux-floating-tooltip";
  floatingTooltip.className = "rux-tooltip";
  floatingTooltip.setAttribute("role", "tooltip");
  floatingTooltip.hidden = true;
  document.body.appendChild(floatingTooltip);
  return floatingTooltip;
}

function tooltipGapPx() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--rux-status-dot-size")
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 4;
}

function updateFloatingTooltipPosition() {
  if (!floatingTooltipTarget || !floatingTooltip || floatingTooltip.hidden) {
    return;
  }

  const rect = floatingTooltipTarget.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    hideFloatingTooltip();
    return;
  }

  const margin = 8;
  const gap = tooltipGapPx();
  const tooltipRect = floatingTooltip.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  let top = rect.top - tooltipRect.height - gap;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

  if (top < margin) {
    top = Math.min(
      rect.bottom + gap,
      viewportHeight - tooltipRect.height - margin,
    );
  }

  left = Math.max(
    margin,
    Math.min(left, viewportWidth - tooltipRect.width - margin),
  );

  floatingTooltip.style.left = `${left}px`;
  floatingTooltip.style.top = `${Math.max(margin, top)}px`;
}

function showFloatingTooltip(target) {
  const label = target.dataset.tooltip;
  if (!label) return;

  const tooltip = ensureFloatingTooltip();
  floatingTooltipTarget?.removeAttribute("aria-describedby");
  floatingTooltipTarget = target;
  tooltip.textContent = label;
  tooltip.hidden = false;
  tooltip.style.left = "0";
  tooltip.style.top = "0";
  target.setAttribute("aria-describedby", tooltip.id);
  updateFloatingTooltipPosition();
}

function hideFloatingTooltip() {
  floatingTooltipTarget?.removeAttribute("aria-describedby");
  floatingTooltipTarget = null;
  if (floatingTooltip) floatingTooltip.hidden = true;
}

function installFloatingTooltip() {
  if (floatingTooltipInstalled) return;
  floatingTooltipInstalled = true;

  document.addEventListener("pointerover", (event) => {
    const target = event.target?.closest?.(
      '[data-rux-tooltip="floating"][data-tooltip]',
    );
    if (!target || containsNode(target, event.relatedTarget)) return;
    showFloatingTooltip(target);
  });

  document.addEventListener("pointerout", (event) => {
    if (!floatingTooltipTarget) return;
    if (!containsNode(floatingTooltipTarget, event.target)) return;
    if (containsNode(floatingTooltipTarget, event.relatedTarget)) return;
    hideFloatingTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const target = event.target?.closest?.(
      '[data-rux-tooltip="floating"][data-tooltip]',
    );
    if (target) showFloatingTooltip(target);
  });

  document.addEventListener("focusout", (event) => {
    if (floatingTooltipTarget?.contains(event.target)) hideFloatingTooltip();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideFloatingTooltip();
  });

  window.addEventListener("resize", updateFloatingTooltipPosition);
  document.addEventListener("scroll", updateFloatingTooltipPosition, true);
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

function fmtTime(str) {
  if (!str) return "--:--";
  let h, min, suffix;
  if (/[ap]m$/i.test(str.trim())) {
    const clean = str.trim();
    suffix = /am$/i.test(clean) ? "a" : "p";
    const core = clean.replace(/\s*[ap]m$/i, "");
    return `${core}<span class="rux-trip-bar__time-suffix"> ${suffix}</span>`;
  }
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return str.replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`);
  h = parseInt(m[1], 10);
  min = m[2];
  suffix = h < 12 ? "a" : "p";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min}<span class="rux-trip-bar__time-suffix"> ${suffix}</span>`;
}

function timeItem(label, value, className = "") {
  const item = document.createElement("span");
  item.className = "rux-trip-bar__time-item";
  if (label) item.append(textEl("span", "rux-trip-bar__time-label", label));
  const val = document.createElement("span");
  val.className = `rux-trip-bar__time-value${className ? " " + className : ""}`;
  val.innerHTML = value ?? "";
  item.append(val);
  return item;
}

function driverStateClass(state) {
  if (state === "conf" || state === "confirmed")
    return "rux-trip-bar__driver-dot--confirmed";
  if (state === "unconf" || state === "unconfirmed")
    return "rux-trip-bar__driver-dot--unconfirmed";
  return "";
}

/* ── Requirement icons ──────────────────────────────────────────────────── */

const LEGACY_REQ_MAP = {
  req_sleeper:    "sleeper",
  req_56pax:      "pax56",
  req_ada:        "adaLift",
  need_hotel:     "hotel",
  need_fuel_card: "fuelCard",
};

function buildRequirementIcons(trip) {
  const activeIds = [];
  const tripReqs = trip.trip_reqs;
  if (tripReqs && typeof tripReqs === "object" && Object.keys(tripReqs).length) {
    Object.entries(tripReqs).forEach(([id, val]) => { if (val) activeIds.push(id); });
  } else {
    Object.entries(LEGACY_REQ_MAP).forEach(([col, id]) => {
      if (trip[col]) activeIds.push(id);
    });
  }
  if (!activeIds.length) return null;

  const allReqs = window.appRequirements;
  if (!allReqs?.length) return null;

  const matched = activeIds.map(id => allReqs.find(r => r.id === id)).filter(Boolean);
  if (!matched.length) return null;

  const el = document.createElement("div");
  el.className = "rux-trip-bar__reqs";
  matched.forEach(req => {
    const i = icon(req.icon, "rux-icon rux-trip-bar__req-icon");
    setFloatingTooltip(i, req.label);
    el.appendChild(i);
  });
  return el;
}

/* ── Trip data helpers ──────────────────────────────────────────────────── */

const PENDING_INDICATORS = [
  {
    key: "itinerary",
    icon: "paperclip",
    label: "Pending itinerary",
    check: (trip) => trip.itineraryStatus !== "received" && !(trip.trip_documents || []).some(d => d.label === "Itinerary"),
  },
  {
    key: "tripContact",
    icon: "phone_enabled",
    label: "Trip contact missing",
    check: (trip) => !trip.tripContact?.name && !trip.tripContact?.phone,
  },
  {
    key: "needs_contract",
    get icon() { return window.RuxBilling?.STATUS_META?.contract_signed?.icon || "file-pen"; },
    label: "Pending contract",
    check: (trip) => trip.paymentStatus === "pending",
  },
  {
    key: "needs_po",
    icon: "request_quote",
    label: "Pending PO",
    check: (trip) => trip.paymentStatus === "contract_signed",
  },
  {
    key: "invoice",
    icon: "receipt",
    label: "Pending invoice",
    check: (trip) => trip.invoiceStatus === "pending",
  },
];

function isPendingValue(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return [
    "pending",
    "missing",
    "needed",
    "unreceived",
    "not-received",
    "not_received",
  ].includes(value.toLowerCase());
}

function isLateReturn(returnTime) {
  if (!returnTime) return false;
  const hour = parseInt(returnTime.split(":")[0], 10);
  return hour < 5; // 00:xx–04:xx = crossed midnight
}

function sortedTripStops(trip) {
  return Array.isArray(trip.trip_stops)
    ? [...trip.trip_stops].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];
}

function tripBarTimes(trip) {
  const stops = sortedTripStops(trip);
  const pickup = stops.find((stop) => stop.type === "pickup");
  const returnStop = [...stops].reverse().find((stop) => stop.type === "return");

  return {
    departureTime: pickup?.depart_prev,
    spotTime: pickup?.spot,
    returnTime: returnStop?.arrive,
  };
}

function isPaidTrip(trip) {
  return ["paid_full", "overpaid"].includes(trip.paymentStatus);
}

function compactDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getMonth() + 1}/${value.getDate()}`;
  }

  const text = String(value).trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${Number(iso[2])}/${Number(iso[3])}`;

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
  if (slash) return `${Number(slash[1])}/${Number(slash[2])}`;

  return text;
}

function paidDate(trip) {
  return compactDate(trip.datePaid);
}

function normalizePendingKey(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "-");
}

function getPendingIndicators(trip) {
  return PENDING_INDICATORS.filter((item) => item.check(trip));
}

function getItineraryDoc(trip) {
  return (trip.trip_documents || []).find(d => d.label === "Itinerary") || null;
}

function hasTripPdf(trip) {
  return Boolean(getItineraryDoc(trip) || trip.itineraryPdfUrl || trip.pdfUrl || trip.pdfUploaded);
}

function firstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

function stripKnownPrefix(value, prefixes) {
  if (value === undefined || value === null) return value;
  const text = String(value);
  const match = prefixes.find((prefix) =>
    text.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  return match ? text.slice(match.length) : text;
}

function detailValue(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  if (
    !text ||
    normalized.includes("pending") ||
    ["draft", "hold", "working on approval", "check in mail"].includes(
      normalized,
    )
  ) {
    return "";
  }
  return value;
}

function driverPayValues(trip) {
  return (trip.drivers || []).map((d) => d.pay || "");
}

function paymentDetail(trip) {
  if (trip.paymentRefs?.length) return trip.paymentRefs.join(" · ");
  const method = trip.paymentMethod || "";
  return method;
}

function detailFieldEl(label, value, { wide = false } = {}) {
  const field = document.createElement("div");
  field.className = `rux-trip-bar__detail-field${
    wide ? " rux-trip-bar__detail-field--wide" : ""
  }`;
  const labelEl = textEl("span", "rux-trip-bar__detail-field-label", label);
  const valueEl = textEl(
    "span",
    "rux-trip-bar__detail-field-value",
    detailValue(value),
  );
  field.append(labelEl, valueEl);
  return field;
}

function isSameTripDay(trip) {
  if (trip.singleDay || trip.layout === "single-day") return true;
  if (!trip.startDate || !trip.endDate) return false;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  return start.toDateString() === end.toDateString();
}

/* ── Utilities ──────────────────────────────────────────────────────────── */

function refreshIcons() {}

export function clearTripBars() {
  tripBars.clear();
  hideFloatingTooltip();
}

/* ── Factory ────────────────────────────────────────────────────────────── */

export function createTripBar(trip, callbacks = {}) {
  installOutsideDismiss();
  installFloatingTooltip();

  const confirmed = trip.driverStatus === "confirmed";
  const singleDay = isSameTripDay(trip);
  const bar = document.createElement("article");
  bar.className = [
    "rux-trip-bar",
    confirmed ? "" : "rux-trip-bar--unconfirmed",
    singleDay ? "" : "rux-trip-bar--multi-day",
    trip.conflict ? "rux-trip-bar--has-conflict" : "",
    trip.fromPrev ? "rux-trip-bar--from-prev" : "",
    trip.toNext ? "rux-trip-bar--to-next" : "",
  ]
    .filter(Boolean)
    .join(" ");
  bar.tabIndex = 0;
  bar.setAttribute(
    "aria-label",
    `${trip.destination || "Trip"} ${confirmed ? "confirmed" : "unconfirmed"}`,
  );

  const actions = document.createElement("div");
  actions.className = "rux-trip-bar__actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "rux-button rux-button--default rux-button--icon rux-button--block";
  openBtn.setAttribute("aria-label", "Open trip");
  setFloatingTooltip(openBtn, "Open trip");
  openBtn.appendChild(icon("add"));
  openBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    (callbacks.onOpenTrip || callbacks.onOpen)?.(trip);
  });

  const itineraryDoc = getItineraryDoc(trip);
  const pdfUploaded = Boolean(itineraryDoc) || hasTripPdf(trip);
  const pdfLabel = pdfUploaded ? "View Itinerary" : "Upload Itinerary";
  const pdfIcon = pdfUploaded ? "attach_file" : "upload";
  const onPdf = pdfUploaded
    ? () => {
        if (itineraryDoc) {
          const url = window.RuxDocs?.url?.(itineraryDoc.file_path);
          if (url) window.open(url, "_blank");
        } else {
          (callbacks.onViewPdf || callbacks.onViewPDF)?.(trip);
        }
      }
    : () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "*/*";
        input.addEventListener("change", async () => {
          const file = input.files[0];
          const tripId = trip.id;
          if (!file || !tripId) return;
          try {
            const doc = await window.RuxDocs?.upload(tripId, "Itinerary", file);
            window.Rux?.toast("Itinerary uploaded");
            if (doc && pdfBtn) {
              const iconEl = pdfBtn.querySelector(".rux-icon");
              if (iconEl) iconEl.textContent = ICON_MAP["paperclip"] || "attach_file";
              pdfBtn.setAttribute("aria-label", "View Itinerary");
              pdfBtn.dataset.tooltip = "View Itinerary";
              const newBtn = pdfBtn.cloneNode(true);
              newBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const url = window.RuxDocs?.url?.(doc.file_path);
                if (url) window.open(url, "_blank");
              });
              pdfBtn.replaceWith(newBtn);
              bar.querySelector('.rux-trip-bar__pending-icon[data-tooltip="Pending itinerary"]')?.remove();
            }
          } catch (err) {
            console.error("Upload failed:", err);
            window.Rux?.toast("Upload failed");
          }
        });
        input.click();
      };

  const pdfBtn = button(
    "rux-button rux-button--default rux-button--icon rux-button--block",
    pdfLabel,
    pdfIcon,
    () => onPdf(),
  );

  actions.append(
    openBtn,
    button(
      "rux-button rux-button--default rux-button--icon rux-button--block",
      "Change bus",
      "swap_vert",
      () => callbacks.onChangeBus?.(trip),
    ),
    pdfBtn,
    button(
      "rux-button rux-button--default rux-button--icon rux-button--block",
      "Trip envelope",
      "mail",
      () => (callbacks.onTripEnvelope || callbacks.onEmail)?.(trip),
    ),
  );

  const body = document.createElement("div");
  body.className = "rux-trip-bar__body";

  const summary = document.createElement("div");
  summary.className = "rux-trip-bar__summary";
  const pendingItems = getPendingIndicators(trip);
  const paid = isPaidTrip(trip);
  const pending = document.createElement("span");
  pending.className = "rux-trip-bar__pending";
  const summaryMarkerLabels = [...pendingItems.map((item) => item.label)];
  pendingItems.forEach((item) => {
    const marker = icon(item.icon, "rux-icon rux-trip-bar__pending-icon");
    setFloatingTooltip(marker, item.label);
    pending.appendChild(marker);
  });
  const groupLabel = trip.groupLabel || "";
  let statusIcon = null;
  if (paid) {
    const datePaid = paidDate(trip);
    const isOverpaid = trip.paymentStatus === "overpaid";
    const paidIconName = window.RuxBilling?.STATUS_META?.[trip.paymentStatus]?.icon
      || (isOverpaid ? "alert-triangle" : "paid");
    statusIcon = icon(
      paidIconName,
      `rux-icon rux-trip-bar__status rux-trip-bar__status--${isOverpaid ? "overpaid" : "paid"}`,
    );
    const paidLabel = isOverpaid ? "Overpaid" : (datePaid ? `Paid in full ${datePaid}` : "Paid in full");
    setFloatingTooltip(statusIcon, paidLabel);
    summaryMarkerLabels.push(paidLabel);
    pending.appendChild(statusIcon);
    if (datePaid && !isOverpaid) {
      pending.appendChild(
        textEl("span", "rux-trip-bar__status-date", datePaid),
      );
    }
  }
  pending.setAttribute("aria-label", summaryMarkerLabels.join(", "));
  const busPill = groupLabel ? (() => {
    const el = textEl("span", "rux-trip-bar__bus-label", groupLabel);
    el.setAttribute("aria-label", `${groupLabel} buses in this customer trip`);
    return el;
  })() : null;
  summary.append(
    textEl("div", "rux-trip-bar__destination", trip.destination),
    ...(busPill ? [busPill] : []),
  );

  const time = document.createElement("div");
  time.className = "rux-trip-bar__time";
  const displayTimes = tripBarTimes(trip);
  const middleTime = displayTimes.spotTime;
  time.append(
    timeItem("", fmtTime(displayTimes.departureTime), displayTimes.departureTime ? "" : "rux-trip-bar__time-value--empty"),
    timeItem("", fmtTime(middleTime), middleTime ? "" : "rux-trip-bar__time-value--empty"),
    timeItem(
      "",
      fmtTime(displayTimes.returnTime),
      isLateReturn(displayTimes.returnTime) ? "rux-trip-bar__time-value--late" : (displayTimes.returnTime ? "" : "rux-trip-bar__time-value--empty"),
    ),
  );

  const ROLE_ICONS = {
    "driver": "person",
    "co-driver": "group",
    "relief-start": "person_add",
    "relief-end": "person_remove",
  };

  const drivers = document.createElement("div");
  drivers.className = "rux-trip-bar__drivers";
  const assignedRoles = new Set((trip.drivers || []).map(d => d.role));

  const roleStateMap = {};
  (trip.activeRoles || ["driver"]).forEach((entry) => {
    const [role, savedState] = entry.includes(":") ? entry.split(":") : [entry, "off"];
    const legacyState = {
      default: "off",
      danger: "pending-assignment",
      warning: "pending-response",
      success: "confirmed",
    };
    roleStateMap[role] = legacyState[savedState] || savedState || "off";
  });

  const STATUS_COLORS = {
    "pending-assignment": "var(--rux-danger-bright)",
    "pending-response": "var(--rux-warning-bright)",
    "confirmed": "var(--rux-success-bright)",
  };

  function applyDriverStatus(iconEl, state) {
    if (!STATUS_COLORS[state]) return;
    iconEl.style.color = STATUS_COLORS[state];
    iconEl.style.setProperty("--_icon-fill", "var(--rux-icon-fill-selected)");
  }

  (trip.drivers || []).forEach((driver) => {
    const item = document.createElement("span");
    item.className = "rux-trip-bar__driver";
    const roleIcon = icon(ROLE_ICONS[driver.role] || "person", "rux-icon rux-trip-bar__driver-role-icon");
    const state = roleStateMap[driver.role];
    applyDriverStatus(roleIcon, state);
    const nameEl = document.createElement("span");
    nameEl.className = "rux-trip-bar__driver-name";
    nameEl.textContent = driver.shortName || driver.name;
    item.append(roleIcon, nameEl);
    drivers.appendChild(item);
  });

  const activeRoles = trip.activeRoles || ["driver"];
  activeRoles.forEach((entry) => {
    const [role] = entry.includes(":") ? entry.split(":") : [entry];
    const state = roleStateMap[role] || "off";
    if (!assignedRoles.has(role)) {
      const item = document.createElement("span");
      item.className = "rux-trip-bar__driver rux-trip-bar__driver--unassigned";
      const roleIcon = icon(ROLE_ICONS[role] || "person", "rux-icon rux-trip-bar__driver-role-icon");
      applyDriverStatus(roleIcon, state);
      item.appendChild(roleIcon);
      drivers.appendChild(item);
    }
  });
  const meta = document.createElement("div");
  meta.className = "rux-trip-bar__drivers-meta";
  drivers.appendChild(meta);

  const spacer = document.createElement("div");
  spacer.className = "rux-trip-bar__spacer";

  body.append(
    summary,
    textEl("div", "rux-trip-bar__client", trip.customer),
    (() => {
      const el = document.createElement("div");
      el.className = "rux-trip-bar__contact";
      el.append(
        textEl("span", "rux-trip-bar__contact-name", trip.bookingContact?.name || trip.tripContact?.name),
      );
      if (trip.bookingContact?.phone)
        el.append(
          textEl(
            "span",
            "rux-trip-bar__contact-phone",
            trip.bookingContact.phone,
          ),
        );
      return el;
    })(),
    textEl("div", "rux-trip-bar__notes", trip.notes),
    (() => {
      const row = document.createElement("div");
      row.className = "rux-trip-bar__reqs";
      const r = buildRequirementIcons(trip);
      if (r) { while (r.firstChild) row.appendChild(r.firstChild); }
      if (summaryMarkerLabels.length) { row.appendChild(pending); }
      return row;
    })(),
    time,
    drivers,
  );

  const details = document.createElement("div");
  details.className = "rux-trip-bar__details";
  const detailsInner = document.createElement("div");
  detailsInner.className = "rux-trip-bar__details-inner";

  const driverPay = driverPayValues(trip);
  const detailFields = [
    ["D1", driverPay[0]],
    ["D2", driverPay[1]],
    ["MI", trip.estimatedMiles ? String(trip.estimatedMiles) : ""],
    [
      "QT",
      trip.quotedPrice ? `$${Number(trip.quotedPrice).toLocaleString()}` : "",
    ],
    ["PO", trip.paymentRef || "", { wide: true }],
    ["ACT", trip.actualMiles ? String(trip.actualMiles) : ""],
    ["INV", trip.invoiceNumber || ""],
    ["PMT", paymentDetail(trip), { wide: true }],
  ];

  detailFields.forEach(([label, value, options]) => {
    detailsInner.appendChild(detailFieldEl(label, value, options));
  });
  details.appendChild(detailsInner);

  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className =
    "rux-button rux-button--ghost rux-button--icon rux-trip-bar__expand";
  const expandIcon = icon("keyboard_arrow_down", "rux-icon rux-button__disclosure-icon");
  expandBtn.append(expandIcon);
  meta.appendChild(expandBtn);

  function setDetailsHeight() {
    bar.style.setProperty(
      "--_details-height",
      `${detailsInner.scrollHeight}px`,
    );
  }

  function refreshDetailsHeight() {
    setDetailsHeight();
    window.requestAnimationFrame(setDetailsHeight);
  }

  function setExpanded(value) {
    const expanded = Boolean(value);
    if (expanded && !bar.classList.contains("is-active")) bar.setActive(true);
    if (expanded) {
      refreshDetailsHeight();
    } else if (bar.classList.contains("is-expanded")) {
      setDetailsHeight();
    }
    bar.classList.toggle("is-expanded", expanded);
    expandBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  expandBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    bar.setActive(true);
    setExpanded(!bar.classList.contains("is-expanded"));
  });

  if (!singleDay) {
    const head = document.createElement("div");
    head.className = "rux-trip-bar__head";
    head.append(actions, body, details);

    const tail = document.createElement("div");
    tail.className = "rux-trip-bar__tail";

    const tailDest = document.createElement("span");
    tailDest.className = "rux-trip-bar__tail-destination";
    tailDest.textContent = trip.destination || "";
    tail.appendChild(tailDest);


    bar.append(head, tail);

    if (trip.conflict) {
      const conflict = document.createElement("div");
      conflict.className = "rux-trip-bar__conflict";
      conflict.append(
        icon("alert-triangle", "rux-icon"),
        document.createTextNode(`Conflict: ${trip.conflict}`),
      );
      bar.appendChild(conflict);
    }
  } else {
    bar.append(actions, body);

    if (trip.conflict) {
      const conflict = document.createElement("div");
      conflict.className = "rux-trip-bar__conflict";
      conflict.append(
        icon("alert-triangle", "rux-icon"),
        document.createTextNode(`Conflict: ${trip.conflict}`),
      );
      bar.appendChild(conflict);
    }

    bar.appendChild(details);
  }

  bar.addEventListener("click", () => {
    bar.setActive(!bar.classList.contains("is-active"));
  });

  bar.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      bar.click();
    }
  });

  bar.setActive = (value) => {
    const active = Boolean(value);
    if (active) {
      deactivateTripBars(bar);
      bar.classList.add("is-active");
    } else {
      const wasExpanded = bar.classList.contains("is-expanded");
      setExpanded(false);
      const delay = wasExpanded ? 220 : 0;
      setTimeout(() => {
        bar.classList.remove("is-active");
      }, delay);
    }
  };
  bar.setExpanded = setExpanded;
  bar.tripData = trip;

  tripBars.add(bar);
  bar.setActive(Boolean(trip.active || trip.expanded));
  setExpanded(Boolean(trip.expanded));
  refreshIcons();

  return bar;
}
