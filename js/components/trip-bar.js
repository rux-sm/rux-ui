/* ==========================================================================
   RUX UI — TRIP BAR
   --------------------------------------------------------------------------
   Creates and manages trip bar elements for the scheduler grid.
   No framework, no build step.

   API
   ---
   createTripBar(trip, callbacks)   → create and return a .sched-trip-bar element
   el.setActive(bool)               → toggle selected + expanded state
   el.setExpanded(bool)             → legacy alias for setActive
   el.tripData                      → read the trip data object for this bar
   ========================================================================== */

import { latestDocument } from "../core/trip-documents.js";

/* ── Module state ───────────────────────────────────────────────────────── */

let outsideDismissInstalled = false;
let floatingTooltipInstalled = false;
let floatingTooltip = null;
let floatingTooltipTarget = null;
const tripBars = new Set();
const SVG_NS = "http://www.w3.org/2000/svg";
let tripBarStripePatternId = 0;

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

// Same tolerance installBusDrag (index.html) uses to tell a genuine drag
// from jitter. Dismissal here used to fire on pointerdown alone, with zero
// movement or duration check — an accidental trackpad brush (the start of
// a scroll, a light unintentional tap while reaching for something else)
// closed the active bar exactly as readily as a deliberate click. Requiring
// the pointer to come back up close to where it went down filters those
// out without changing when dismissal fires relative to other elements'
// own click handlers — pointerup still runs in capture phase, still before
// any click event does.
const DISMISS_MOVE_THRESHOLD = 6;

function installOutsideDismiss() {
  if (outsideDismissInstalled) return;
  outsideDismissInstalled = true;

  let downX = 0;
  let downY = 0;
  let downTarget = null;

  document.addEventListener(
    "pointerdown",
    (event) => {
      downX = event.clientX;
      downY = event.clientY;
      downTarget = event.target;
    },
    true,
  );

  document.addEventListener(
    "pointerup",
    (event) => {
      // Anything reading the active bar's selection (Contact Info, its
      // modal) opts out of dismissal with this attribute — otherwise this
      // capture-phase listener deactivates the bar (and disables the
      // button reading it) before the button's own click handler runs.
      if (downTarget?.closest?.("[data-sched-keep-trip-selection]")) return;
      const dx = event.clientX - downX;
      const dy = event.clientY - downY;
      if (Math.hypot(dx, dy) > DISMISS_MOVE_THRESHOLD) return;
      const currentBar = downTarget?.closest?.(".sched-trip-bar") || null;
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
  "alternate-email": "alternate_email",
  "phone": "phone",
  "start": "start",
  "keyboard-tab": "keyboard_tab",
};

function icon(name, className = "rux-icon") {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = ICON_MAP[name] || name;
  return el;
}

function createStripeLayer() {
  const svg = document.createElementNS(SVG_NS, "svg");
  const patternId = `sched-trip-bar-stripes-${++tripBarStripePatternId}`;
  svg.setAttribute("class", "sched-trip-bar__stripe-layer");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const defs = document.createElementNS(SVG_NS, "defs");
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", patternId);
  pattern.setAttribute("width", "14");
  pattern.setAttribute("height", "14");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", "rotate(45)");
  const stripe = document.createElementNS(SVG_NS, "rect");
  stripe.setAttribute("class", "sched-trip-bar__stripe-mark");
  stripe.setAttribute("width", "7");
  stripe.setAttribute("height", "14");
  pattern.appendChild(stripe);
  defs.appendChild(pattern);

  const fill = document.createElementNS(SVG_NS, "rect");
  fill.setAttribute("width", "100%");
  fill.setAttribute("height", "100%");
  fill.setAttribute("fill", `url(#${patternId})`);
  svg.append(defs, fill);
  return svg;
}

function isPdfFile(file) {
  return Boolean(file) && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));
}

// Shared "view a doc" action for the trip bar's paperclip/itinerary shortcut
// — same floating panel the Files list's View button opens (js/panels/trip-panel.js),
// so a document looks the same regardless of where you opened it from. Falls
// back to a new tab if the viewer script hasn't loaded for some reason.
function openDocInViewer(doc, options = {}) {
  const url = window.RuxDocs?.url?.(doc?.file_path);
  if (!url) return;
  if (!window.RuxDocViewer) {
    window.open(url, "_blank");
    return;
  }
  window.RuxDocViewer.open({ url, fileName: doc.file_name, icon: "route", ...options });
}

// Uploads a fresh itinerary for a trip that doesn't have one yet — shared by
// the trip bar's "Upload Itinerary" button and applyItineraryDeleted's
// rebuilt button (a delete reverts a bar to this same not-uploaded state).
// Dispatches the same event the trip panel's own uploader fires, so every
// sibling bar for this trip id (multi-bus trips render one per bus track)
// stays in sync regardless of which surface the upload happened from.
function uploadItineraryDoc(tripId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,application/pdf";
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file || !tripId) return;
    if (!isPdfFile(file)) {
      window.Rux?.toast("Only PDF files are supported.");
      return;
    }
    try {
      const doc = await window.RuxDocs?.upload(tripId, "Itinerary", file);
      window.Rux?.toast("Itinerary uploaded");
      if (doc) {
        document.dispatchEvent(
          new CustomEvent("rux:itinerary-uploaded", { detail: { tripId, doc } }),
        );
      }
    } catch (err) {
      console.error("Upload failed:", err);
      window.Rux?.toast("Upload failed");
    }
  });
  input.click();
}

// Deletes the itinerary currently open in the doc viewer — wired as that
// viewer's Delete button. Dispatches rux:itinerary-deleted so every sibling
// bar for this trip, and the trip panel's own document list if this trip
// happens to be open there too, can revert in sync.
async function deleteItineraryDoc(trip, doc) {
  if (!confirm("Delete this itinerary?")) return;
  try {
    await window.RuxDocs?.delete(doc.id);
    window.RuxDocViewer?.close();
    window.Rux?.toast("Itinerary deleted");
    document.dispatchEvent(
      new CustomEvent("rux:itinerary-deleted", { detail: { tripId: trip.id, docId: doc.id } }),
    );
  } catch (err) {
    console.error("Delete failed:", err);
    window.Rux?.toast("Delete failed — try again.");
  }
}

// Replaces the itinerary currently open in the doc viewer — wired as that
// viewer's Replace button. Upload-then-delete-the-old-one, same shape as the
// trip panel's own replaceDoc. Dispatches both events (not just -uploaded) —
// a replace is a delete and an upload, and anything only watching for the
// upload half (e.g. the trip panel's own document list, if this trip happens
// to be open there too) would otherwise keep a stale row pointing at the
// file that just got deleted.
function replaceItineraryDoc(trip, doc) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,application/pdf";
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    if (!isPdfFile(file)) {
      window.Rux?.toast("Only PDF files are supported.");
      return;
    }
    try {
      const newDoc = await window.RuxDocs.upload(trip.id, "Itinerary", file);
      await window.RuxDocs.delete(doc.id);
      window.RuxDocViewer?.close();
      window.Rux?.toast("Itinerary replaced");
      document.dispatchEvent(
        new CustomEvent("rux:itinerary-deleted", { detail: { tripId: trip.id, docId: doc.id } }),
      );
      document.dispatchEvent(
        new CustomEvent("rux:itinerary-uploaded", { detail: { tripId: trip.id, doc: newDoc } }),
      );
    } catch (err) {
      console.error("Replace failed:", err);
      window.Rux?.toast("Replace failed — try again.");
    }
  });
  input.click();
}

// Opens the itinerary viewer with Delete/Replace wired up — the shared entry
// point for every "view itinerary" click, whether from a bar's own button
// (createTripBar) or one just patched after an upload (applyItineraryUploaded).
function viewItineraryDoc(trip, doc) {
  openDocInViewer(doc, {
    title: "Itinerary",
    onDelete: () => deleteItineraryDoc(trip, doc),
    onUpdate: () => replaceItineraryDoc(trip, doc),
  });
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
    suffix = /am$/i.test(clean) ? "am" : "pm";
    const core = clean.replace(/\s*[ap]m$/i, "");
    return `${core}<span class="sched-trip-bar__time-suffix"> ${suffix}</span>`;
  }
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return str.replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`);
  h = parseInt(m[1], 10);
  min = m[2];
  suffix = h < 12 ? "am" : "pm";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min}<span class="sched-trip-bar__time-suffix"> ${suffix}</span>`;
}

function timeItem(label, value, className = "") {
  const item = document.createElement("span");
  item.className = "sched-trip-bar__time-item";
  if (label) item.append(textEl("span", "sched-trip-bar__time-label", label));
  const val = document.createElement("span");
  val.className = `sched-trip-bar__time-value${className ? " " + className : ""}`;
  val.innerHTML = value ?? "";
  item.append(val);
  return item;
}

function driverStateClass(state) {
  if (state === "conf" || state === "confirmed")
    return "sched-trip-bar__driver-dot--confirmed";
  if (state === "unconf" || state === "unconfirmed")
    return "sched-trip-bar__driver-dot--unconfirmed";
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
  el.className = "sched-trip-bar__reqs";
  matched.forEach(req => {
    const i = icon(req.icon, "rux-icon sched-trip-bar__req-icon");
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
    check: (trip) => !trip.itinerary_not_needed && trip.itineraryStatus !== "received" && !(trip.trip_documents || []).some(d => d.label === "Itinerary"),
  },
  {
    key: "tripContact",
    icon: "phone_enabled",
    label: "Trip contact missing",
    check: (trip) => !trip.contact_not_needed && !trip.tripContact?.name && !trip.tripContact?.phone,
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
    key: "partial_po",
    icon: "request_quote",
    label: "Partial PO — authorization incomplete",
    tone: "warning",
    check: (trip) => trip.paymentStatus === "po_partial",
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

// Same formula as the Itinerary tab's own Trip Summary card
// (renderSummary() in itinerary.js) — "day" markers aren't real travel
// segments and sleeper stops never travel (their own miles should always be
// zero — see syncSleeperLeg in itinerary.js — excluded again here as a safety
// net), so both are excluded from the sum. A manually entered Billing-tab
// estimate is applied later as an explicit override of this calculated total.
function itineraryMiles(trip) {
  const real = sortedTripStops(trip).filter((s) => s.type !== "day" && s.type !== "sleeper");
  const total = real.reduce((n, s) => n + (parseFloat(s.miles) || 0), 0);
  return total > 0 ? total : null;
}

function formatMiles(value) {
  if (value == null) return "";
  return String(value % 1 === 0 ? value : value.toFixed(1));
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
  return latestDocument(trip.trip_documents, "Itinerary");
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

// First driver is always "D1"; every driver beyond that is a relief slot
// ("R1", "R2", ...) — matches print-schedule.js's driver-pay labeling so
// the field count always reflects how many drivers are actually assigned.
function driverPayFields(trip) {
  const drivers = trip.drivers || [];
  if (!drivers.length) return [["D1", ""]];
  return drivers.map((d, i) => [i === 0 ? "D1" : `R${i}`, d.pay || ""]);
}

// Same icon set as the Billing tab's own payment rows (PAYMENT_METHOD_ICONS
// in trip-db.js) — an icon reads faster than a text abbreviation and matches
// how method is already shown everywhere else a payment appears.
const PAYMENT_METHOD_ICONS = { Cash: "universal_currency_alt", Check: "checkbook", Card: "credit_card", ACH: "account_balance", Zelle: "bolt", Other: "more_horiz" };

// trip.trip_payments is the real, live payments list (same rows the Billing
// tab's payment rows render from) — the trip.paymentRefs/paymentMethod
// fields this replaced read from legacy payment_ref_1/2/3 columns that are
// never populated by the current save flow, so they were always empty.
// Returns a DOM element (icon + ref + amount per payment, "·"-separated)
// rather than a string, since detailFieldEl can't put an icon inside a
// plain textContent value.
function buildPaymentValueEl(trip) {
  const valueEl = document.createElement("span");
  valueEl.className = "sched-trip-bar__detail-field-value sched-trip-bar__payment-value";
  const payments = Array.isArray(trip.trip_payments) ? trip.trip_payments : [];
  const sorted = [...payments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  sorted.forEach((p) => {
    if (!p.ref && !p.amount) return;
    if (valueEl.childElementCount) valueEl.appendChild(document.createTextNode(" · "));
    const entry = document.createElement("span");
    entry.className = "sched-trip-bar__payment-entry";
    entry.appendChild(icon(PAYMENT_METHOD_ICONS[p.method] || PAYMENT_METHOD_ICONS.Other, "rux-icon sched-trip-bar__payment-icon"));
    const text = [p.ref || "", p.amount ? `$${Number(p.amount).toLocaleString()}` : ""].filter(Boolean).join(" ");
    entry.appendChild(document.createTextNode(text));
    valueEl.appendChild(entry);
  });
  return valueEl;
}

// Computes an explicit grid-row/grid-column for every field instead of
// leaning on the grid's implicit auto-flow: the driver-pay section is now
// a variable length (1 field for a single driver, 2, 3+ for relief
// drivers), and letting the browser auto-place everything after it risks
// sliding MI/QT/etc. into whatever leftover cell a short driver row left
// open, instead of starting their own row. Deterministic placement here
// removes that ambiguity entirely.
function layoutDetailFields(fields) {
  let row = 1;
  let col = 1;
  return fields.map(([label, value, options = {}]) => {
    const wide = !!options.wide;
    const wrap = !!options.wrap;
    const valueEl = options.valueEl;
    const alignItems = options.alignItems;
    if (wide) {
      if (col !== 1) { row += 1; col = 1; }
      const placed = { label, value, valueEl, alignItems, wide, wrap, gridRow: row, gridColumn: "1 / -1" };
      row += 1;
      return placed;
    }
    const placed = { label, value, valueEl, alignItems, wide, wrap, gridRow: row, gridColumn: col };
    if (col === 1) col = 2;
    else { col = 1; row += 1; }
    return placed;
  });
}

// value is used for the common case (plain text, rendered via textContent —
// never HTML-injected). valueEl is an escape hatch for the rare field (just
// payments, so far) that needs real child elements — an icon per entry —
// which a textContent string can't hold. alignItems overrides the field's
// default baseline alignment — needed for the payment field specifically,
// since an inline-flex icon+text entry doesn't have the same text baseline
// as a plain string value, so baseline-aligning it against its label
// visibly mismatches every other (plain-text) row's alignment.
function detailFieldEl({ label, value, valueEl, alignItems, wide, wrap, gridRow, gridColumn }) {
  const field = document.createElement("div");
  field.className = `sched-trip-bar__detail-field${
    wide ? " sched-trip-bar__detail-field--wide" : ""
  }${wrap ? " sched-trip-bar__detail-field--wrap" : ""}`;
  field.style.gridRow = String(gridRow);
  field.style.gridColumn = String(gridColumn);
  if (alignItems) field.style.alignItems = alignItems;
  const labelEl = textEl("span", "sched-trip-bar__detail-field-label", label);
  const resolvedValueEl = valueEl || textEl(
    "span",
    "sched-trip-bar__detail-field-value",
    detailValue(value),
  );
  field.append(labelEl, resolvedValueEl);
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
  if ([...tripBars].some((bar) => bar.classList.contains("is-active"))) {
    window.dispatchEvent(new CustomEvent("rux:trip-selection-changed", {
      detail: { trip: null },
    }));
  }
  tripBars.clear();
  hideFloatingTooltip();
}

// Patches a single already-rendered bar to reflect "itinerary now exists" —
// swaps the paperclip action button from upload to view-doc, and clears the
// pending-itinerary indicator. Trip bars don't re-render reactively from
// data changes, so a multi-bus trip (sibling bars for the same trip id on
// other tracks) needs this called on each of its bars individually after an
// upload — see the "rux:itinerary-uploaded" listener in index.html, which
// finds every sibling via activePlacements and calls this on all of them.
export function applyItineraryUploaded(bar, doc, trip) {
  const pdfBtn = bar.querySelector('[data-role="itinerary-btn"]');
  if (pdfBtn) {
    const iconEl = pdfBtn.querySelector(".rux-icon");
    if (iconEl) iconEl.textContent = ICON_MAP["paperclip"] || "attach_file";
    pdfBtn.setAttribute("aria-label", "View Itinerary");
    pdfBtn.dataset.tooltip = "View Itinerary";
    const newBtn = pdfBtn.cloneNode(true);
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      viewItineraryDoc(trip, doc);
    });
    pdfBtn.replaceWith(newBtn);
  }
  bar.querySelector('.sched-trip-bar__pending-icon[data-tooltip="Pending itinerary"]')?.remove();
}

// Inverse of applyItineraryUploaded — patches a bar back to "no itinerary"
// after a delete: button reverts to upload mode, and the pending-itinerary
// indicator reappears unless something else (itinerary_not_needed, a
// received status) says it shouldn't. Same multi-bus sibling-patching need
// as the upload path — see the "rux:itinerary-deleted" listener in index.html.
export function applyItineraryDeleted(bar, trip) {
  const pdfBtn = bar.querySelector('[data-role="itinerary-btn"]');
  if (pdfBtn) {
    const iconEl = pdfBtn.querySelector(".rux-icon");
    if (iconEl) iconEl.textContent = ICON_MAP["upload"] || "upload";
    pdfBtn.setAttribute("aria-label", "Upload Itinerary");
    pdfBtn.dataset.tooltip = "Upload Itinerary";
    const newBtn = pdfBtn.cloneNode(true);
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      uploadItineraryDoc(trip.id);
    });
    pdfBtn.replaceWith(newBtn);
  }
  const pendingItem = PENDING_INDICATORS.find((item) => item.key === "itinerary");
  const alreadyShown = bar.querySelector('.sched-trip-bar__pending-icon[data-tooltip="Pending itinerary"]');
  if (pendingItem && !alreadyShown && pendingItem.check(trip)) {
    const marker = icon(pendingItem.icon, "rux-icon sched-trip-bar__pending-icon");
    setFloatingTooltip(marker, pendingItem.label);
    bar.querySelector(".sched-trip-bar__pending")?.prepend(marker);
  }
}

/* ── Factory ────────────────────────────────────────────────────────────── */

export function createTripBar(trip, callbacks = {}) {
  installOutsideDismiss();
  installFloatingTooltip();

  const confirmed = trip.driverStatus === "confirmed";
  const singleDay = isSameTripDay(trip);
  const patterned = trip.trip_type === "one_way" || trip.trip_type === "dropoff_pickup";
  const bar = document.createElement("article");
  bar.className = [
    "sched-trip-bar",
    confirmed ? "" : "sched-trip-bar--unconfirmed",
    trip.paymentStatus === "po_partial" ? "sched-trip-bar--partial-po" : "",
    trip.paymentStatus === "contract_signed" ? "sched-trip-bar--pending-po" : "",
    singleDay ? "" : "sched-trip-bar--multi-day",
    trip.conflict ? "sched-trip-bar--has-conflict" : "",
    trip.fromPrev ? "sched-trip-bar--from-prev" : "",
    trip.toNext ? "sched-trip-bar--to-next" : "",
    trip.trip_type === "one_way" ? "sched-trip-bar--one-way" : "",
    trip.trip_type === "dropoff_pickup" && trip.leg === "outbound" ? "sched-trip-bar--dropoff-leg" : "",
    trip.trip_type === "dropoff_pickup" && trip.leg === "return" ? "sched-trip-bar--pickup-leg" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (["cyan", "green", "purple", "yellow", "orange", "pink"].includes(trip.trip_bar_color)) {
    bar.dataset.tripBarColor = trip.trip_bar_color;
  }
  bar.tabIndex = 0;
  bar.setAttribute("role", "button");
  bar.setAttribute("aria-pressed", "false");
  bar.setAttribute(
    "aria-label",
    `${trip.destination || "Trip"} ${confirmed ? "confirmed" : "unconfirmed"}`,
  );

  const actions = document.createElement("div");
  actions.className = "sched-trip-bar__actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "rux-button rux-button--ghost rux-button--icon rux-button--sm rux-button--block sched-trip-bar__action";
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
          viewItineraryDoc(trip, itineraryDoc);
        } else {
          (callbacks.onViewPdf || callbacks.onViewPDF)?.(trip);
        }
      }
    : () => uploadItineraryDoc(trip.id);

  const pdfBtn = button(
    "rux-button rux-button--ghost rux-button--icon rux-button--sm rux-button--block sched-trip-bar__action",
    pdfLabel,
    pdfIcon,
    () => onPdf(),
  );
  pdfBtn.dataset.role = "itinerary-btn";

  // Opens the customer email thread saved on the trip. Keep the action in a
  // stable slot on every bar so the row does not shift, but disable it when
  // the trip has no saved thread URL.
  const emailThreadUrl = String(
    trip.booking_contact_missive_url || trip.bookingContact?.missiveUrl || "",
  ).trim();
  const emailThreadBtn = button(
    "rux-button rux-button--ghost rux-button--icon rux-button--sm rux-button--block sched-trip-bar__action",
    emailThreadUrl ? "Open email thread" : "No email thread saved",
    "alternate-email",
    () => window.open(emailThreadUrl, "missive", "noopener,noreferrer"),
  );
  emailThreadBtn.disabled = !emailThreadUrl;
  emailThreadBtn.dataset.role = "email-thread-btn";

  actions.append(
    openBtn,
    pdfBtn,
    button(
      "rux-button rux-button--ghost rux-button--icon rux-button--sm rux-button--block sched-trip-bar__action",
      "Move bus",
      "swap_vert",
      () => callbacks.onChangeBus?.(trip),
    ),
    button(
      "rux-button rux-button--ghost rux-button--icon rux-button--sm rux-button--block sched-trip-bar__action",
      "Print trip envelope",
      "drafts",
      () => callbacks.onPrintEnvelope?.(trip),
    ),
    emailThreadBtn,
  );

  const body = document.createElement("div");
  body.className = "sched-trip-bar__body";

  const summary = document.createElement("div");
  summary.className = "sched-trip-bar__summary";
  const pendingItems = getPendingIndicators(trip);
  const summaryMarkers = trip.itinerary_confirmed
    ? [...pendingItems, { icon: "checklist", label: "Itinerary confirmed", tone: "success" }]
    : pendingItems;
  const paid = isPaidTrip(trip);
  const pending = document.createElement("span");
  pending.className = "sched-trip-bar__pending";
  const summaryMarkerLabels = summaryMarkers.map((item) => item.label);
  summaryMarkers.forEach((item) => {
    const marker = icon(
      item.icon,
      `rux-icon sched-trip-bar__pending-icon${item.tone ? ` sched-trip-bar__pending-icon--${item.tone}` : ""}`,
    );
    setFloatingTooltip(marker, item.label);
    pending.appendChild(marker);
  });
  const groupLabel = trip.groupLabel || "";
  // Sits left of the bus-label pill on the destination row — the pill is
  // a fixed identity marker anchored at the far right edge, so paid status
  // (a secondary indicator) reads better just inside it, not past it.
  let paidBadge = null;
  if (paid) {
    const datePaid = paidDate(trip);
    const isOverpaid = trip.paymentStatus === "overpaid";
    const statusLabel = textEl(
      "span",
      "sched-trip-bar__status sched-trip-bar__status--paid",
      isOverpaid ? "Overpaid" : "Paid",
    );
    const paidLabel = isOverpaid ? "Overpaid" : (datePaid ? `Paid in full ${datePaid}` : "Paid in full");
    setFloatingTooltip(statusLabel, paidLabel);
    paidBadge = document.createElement("span");
    paidBadge.className = "sched-trip-bar__paid-badge";
    paidBadge.appendChild(statusLabel);
    if (datePaid) {
      paidBadge.appendChild(textEl("span", "sched-trip-bar__status-date", datePaid));
    }
  }
  pending.setAttribute("aria-label", summaryMarkerLabels.join(", "));
  // Lives on the reqs row (left-aligned, before requirement icons), not
  // nested inside `pending` — that span has its own overriding aria-label
  // for pending-only items, which would swallow this pill's aria-label if
  // it were a descendant instead of a sibling.
  const busPill = groupLabel ? (() => {
    const el = textEl("span", "sched-trip-bar__bus-label", groupLabel);
    el.setAttribute("aria-label", `${groupLabel} buses in this customer trip`);
    return el;
  })() : null;
  summary.append(
    textEl("div", "sched-trip-bar__destination", trip.destination),
    ...(paidBadge ? [paidBadge] : []),
  );

  const time = document.createElement("div");
  time.className = "sched-trip-bar__time";
  const displayTimes = tripBarTimes(trip);
  const middleTime = displayTimes.spotTime;
  time.append(
    timeItem("", fmtTime(displayTimes.departureTime), displayTimes.departureTime ? "" : "sched-trip-bar__time-value--empty"),
    timeItem("", fmtTime(middleTime), middleTime ? "" : "sched-trip-bar__time-value--empty"),
    timeItem(
      "",
      fmtTime(displayTimes.returnTime),
      isLateReturn(displayTimes.returnTime) ? "sched-trip-bar__time-value--late" : (displayTimes.returnTime ? "" : "sched-trip-bar__time-value--empty"),
    ),
  );

  const ROLE_ICONS = {
    "driver": "person",
    "co-driver": "group",
    "relief-start": "person_add",
    "relief-end": "person_remove",
  };

  const drivers = document.createElement("div");
  drivers.className = "sched-trip-bar__drivers";
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
    "pending-assignment": "var(--rux-danger)",
    "pending-response": "var(--rux-warning)",
    "confirmed": "var(--rux-success)",
    "declined": "var(--rux-danger)",
  };

  function applyDriverStatus(iconEl, state) {
    if (!STATUS_COLORS[state]) return;
    iconEl.style.color = STATUS_COLORS[state];
    iconEl.style.setProperty("--_icon-fill", "var(--rux-icon-fill-selected)");
  }

  (trip.drivers || []).forEach((driver) => {
    const item = document.createElement("span");
    item.className = "sched-trip-bar__driver";
    const roleIcon = icon(ROLE_ICONS[driver.role] || "person", "rux-icon sched-trip-bar__driver-role-icon");
    const state = roleStateMap[driver.role];
    applyDriverStatus(roleIcon, state);
    const nameEl = document.createElement("span");
    nameEl.className = "sched-trip-bar__driver-name";
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
      item.className = "sched-trip-bar__driver sched-trip-bar__driver--unassigned";
      const roleIcon = icon(ROLE_ICONS[role] || "person", "rux-icon sched-trip-bar__driver-role-icon");
      applyDriverStatus(roleIcon, state);
      item.appendChild(roleIcon);
      drivers.appendChild(item);
    }
  });
  const spacer = document.createElement("div");
  spacer.className = "sched-trip-bar__spacer";

  const passengerCount = (trip.trip_passengers ?? []).length;
  const clientLabel = trip.is_self_organized
    ? `${passengerCount} passenger${passengerCount === 1 ? "" : "s"}`
    : trip.customer;

  body.append(
    summary,
    textEl("div", "sched-trip-bar__client", clientLabel),
    (() => {
      const el = document.createElement("div");
      el.className = "sched-trip-bar__contact";
      el.append(
        textEl("span", "sched-trip-bar__contact-name", trip.bookingContact?.name || trip.tripContact?.name),
      );
      if (trip.bookingContact?.phone)
        el.append(
          textEl(
            "span",
            "sched-trip-bar__contact-phone",
            trip.bookingContact.phone,
          ),
        );
      return el;
    })(),
    (() => {
      const el = document.createElement("div");
      el.className = "sched-trip-bar__notes";
      // text-overflow:ellipsis must land on this inner span, not the flex
      // container itself — a flex container's own (anonymous) text content
      // hard-clips on overflow:hidden but never renders the "…" glyph.
      el.append(textEl("span", "sched-trip-bar__notes-text", trip.notes));
      // Notes are the field most likely to get truncated (free text, no
      // length limit) — a hover tooltip surfaces the full text without
      // needing to expand the whole bar. Only worth wiring up when there's
      // something to show.
      if (trip.notes) setFloatingTooltip(el, trip.notes);
      return el;
    })(),
    (() => {
      const row = document.createElement("div");
      row.className = "sched-trip-bar__reqs";
      if (busPill) row.appendChild(busPill);
      // Drop-off/Pick-up trips get a leg marker alongside the requirement
      // icons — same class/tooltip convention as those, so it inherits the
      // standard trip-bar icon treatment (size/weight/color) automatically
      // instead of needing its own CSS. Reinforces (doesn't replace) the
      // background chevron pattern, which requires already knowing the
      // direction convention to read at a glance.
      if (trip.trip_type === "dropoff_pickup") {
        // start (|→, leaving a fixed point) / keyboard_tab (→|, arriving at
        // one) — true mirror images of each other, both already pointing
        // right by default, so no rotation is needed either way.
        const isOutbound = trip.leg === "outbound";
        const legIcon = icon(
          isOutbound ? "start" : "keyboard-tab",
          "rux-icon sched-trip-bar__req-icon",
        );
        setFloatingTooltip(legIcon, isOutbound ? "Drop-off leg" : "Pick-up leg");
        row.appendChild(legIcon);
      } else if (trip.trip_type === "one_way") {
        // Same icon as the Trip Type picker's own "One-way" segment
        // (arrow_forward) — reusing it here keeps one icon meaning "one-way"
        // everywhere in the app instead of introducing a second one.
        const oneWayIcon = icon("arrow-right", "rux-icon sched-trip-bar__req-icon");
        setFloatingTooltip(oneWayIcon, "One-way trip");
        row.appendChild(oneWayIcon);
      }
      const r = buildRequirementIcons(trip);
      if (r) { while (r.firstChild) row.appendChild(r.firstChild); }
      if (summaryMarkerLabels.length) { row.appendChild(pending); }
      return row;
    })(),
    time,
    drivers,
  );

  const details = document.createElement("div");
  details.className = "sched-trip-bar__details";
  const detailsInner = document.createElement("div");
  detailsInner.className = "sched-trip-bar__details-inner";

  // Driver-pay fields are laid out on their own (rows 1..driverRows,
  // packed 2-per-row — a lone last driver leaves column 2 blank on
  // purpose, same as removing "D2" for a single driver). Everything after
  // always starts fresh at driverRows+1, regardless of whether that last
  // driver row was fully packed — see layoutDetailFields's doc comment for
  // why this can't just be one continuous auto-flowing list.
  const driverFields = driverPayFields(trip);
  const driverRows = Math.ceil(driverFields.length / 2);
  const placedDriverFields = driverFields.map(([label, value], i) => ({
    label, value, wide: false,
    gridRow: Math.floor(i / 2) + 1,
    gridColumn: (i % 2) + 1,
  }));

  const restFields = [
    ["Mi", formatMiles(trip.estimatedMiles ?? itineraryMiles(trip))],
    ["Act Mi", trip.actualMiles ? String(trip.actualMiles) : ""],
    ["Qt", trip.quotedPrice ? `$${Number(trip.quotedPrice).toLocaleString()}` : ""],
    ["PO", trip.paymentRef || ""],
    ["Inv", trip.invoiceNumber || "", { wide: true }],
    ["Pmt", "", { wide: true, valueEl: buildPaymentValueEl(trip), alignItems: "center" }],
  ];
  const placedRestFields = layoutDetailFields(restFields)
    .map((placed) => ({ ...placed, gridRow: placed.gridRow + driverRows }));

  [...placedDriverFields, ...placedRestFields].forEach((placed) => {
    detailsInner.appendChild(detailFieldEl(placed));
  });
  details.appendChild(detailsInner);

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
  }

  if (!singleDay) {
    const head = document.createElement("div");
    head.className = "sched-trip-bar__head";
    if (patterned) head.appendChild(createStripeLayer());
    const headContent = document.createElement("div");
    headContent.className = "sched-trip-bar__head-content";
    headContent.append(actions, body, details);
    head.appendChild(headContent);

    const tail = document.createElement("div");
    tail.className = "sched-trip-bar__tail";
    if (patterned) tail.appendChild(createStripeLayer());

    bar.append(head, tail);

    if (trip.conflict) {
      const conflict = document.createElement("div");
      conflict.className = "sched-trip-bar__conflict";
      conflict.append(
        icon("alert-triangle", "rux-icon"),
        document.createTextNode(`Conflict: ${trip.conflict}`),
      );
      bar.appendChild(conflict);
    }
  } else {
    if (patterned) bar.appendChild(createStripeLayer());
    bar.append(actions, body);

    if (trip.conflict) {
      const conflict = document.createElement("div");
      conflict.className = "sched-trip-bar__conflict";
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
    const wasActive = bar.classList.contains("is-active");
    bar.setAttribute("aria-pressed", String(active));
    if (active) {
      deactivateTripBars(bar);
      bar.classList.add("is-active");
      setExpanded(true);
      if (!wasActive) {
        window.dispatchEvent(new CustomEvent("rux:trip-selection-changed", {
          detail: { trip },
        }));
      }
    } else {
      const wasExpanded = bar.classList.contains("is-expanded");
      setExpanded(false);
      const delay = wasExpanded ? 220 : 0;
      setTimeout(() => {
        bar.classList.remove("is-active");
      }, delay);
      if (wasActive) {
        window.dispatchEvent(new CustomEvent("rux:trip-selection-changed", {
          detail: { trip: null },
        }));
      }
    }
  };
  bar.setExpanded = (value) => bar.setActive(Boolean(value));
  bar.tripData = trip;

  tripBars.add(bar);
  bar.setActive(Boolean(trip.active || trip.expanded));
  refreshIcons();

  return bar;
}
