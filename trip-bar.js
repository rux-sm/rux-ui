/**
 * Trip Bar
 * Usage:
 *   import { createTripBar } from './trip-bar.js';
 *   const el = createTripBar(trip, callbacks);
 *
 * Public API on returned element:
 *   el.setActive(bool)
 *   el.setExpanded(bool)
 *   el.tripData
 */

let outsideDismissInstalled = false;
let floatingTooltipInstalled = false;
let floatingTooltip = null;
let floatingTooltipTarget = null;
const tripBars = new Set();

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

function icon(name, className = "rux-icon") {
  const el = document.createElement("i");
  el.setAttribute("data-lucide", name);
  el.className = className;
  return el;
}

function containsNode(el, node) {
  return node instanceof Node && el.contains(node);
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
    .getPropertyValue("--rux-dot-sm")
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

function setFloatingTooltip(el, label) {
  el.dataset.tooltip = label;
  el.dataset.ruxTooltip = "floating";
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

function fmtTime(str) {
  if (!str) return str;
  return str.replace(/\s*AM$/i, "a").replace(/\s*PM$/i, "p");
}

function timeItem(label, value, className = "") {
  const item = document.createElement("span");
  item.className = "rux-trip-bar__time-item";
  if (label) item.append(textEl("span", "rux-trip-bar__time-label", label));
  item.append(
    textEl(
      "span",
      `rux-trip-bar__time-value${className ? " " + className : ""}`,
      value,
    ),
  );
  return item;
}

function driverStateClass(state) {
  if (state === "conf" || state === "confirmed")
    return "rux-trip-bar__driver-dot--confirmed";
  if (state === "unconf" || state === "unconfirmed")
    return "rux-trip-bar__driver-dot--unconfirmed";
  return "";
}

const PENDING_INDICATORS = [
  {
    key: "itinerary",
    icon: "paperclip",
    label: "Pending itinerary",
    fields: ["pendingItinerary", "itineraryPending"],
    aliases: ["itinerary", "pending-itinerary", "pending_itinerary"],
  },
  {
    key: "contact",
    icon: "user",
    label: "Pending contact status",
    fields: [
      "pendingContact",
      "contactPending",
      "pendingContactStatus",
      "contactStatusPending",
    ],
    aliases: [
      "contact",
      "contact-status",
      "contact_status",
      "pending-contact",
      "pending_contact",
    ],
  },
  {
    key: "contactPhone",
    icon: "phone",
    label: "Contact phone missing",
    requiredField: "contactPhone",
    fields: ["pendingContactPhone", "contactPhonePending"],
    aliases: ["contact-phone", "contact_phone", "phone"],
  },
  {
    key: "contract",
    icon: "file-pen",
    label: "Pending signed contract",
    fields: [
      "pendingContract",
      "contractPending",
      "pendingSignedContract",
      "signedContractPending",
    ],
    aliases: [
      "contract",
      "signed-contract",
      "signed_contract",
      "pending-contract",
      "pending_contract",
    ],
  },
  {
    key: "po",
    icon: "receipt",
    label: "Pending PO",
    fields: [
      "pendingPO",
      "pendingPo",
      "poPending",
      "pendingPurchaseOrder",
      "purchaseOrderPending",
    ],
    aliases: [
      "po",
      "purchase-order",
      "purchase_order",
      "pending-po",
      "pending_po",
    ],
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

function isPaidTrip(trip) {
  const paymentFields = [
    trip.paid,
    trip.fullyPaid,
    trip.isPaid,
    trip.paymentStatus,
    trip.paidStatus,
  ];
  if (paymentFields.some((value) => value === true)) return true;
  if (
    paymentFields.some(
      (value) =>
        typeof value === "string" &&
        [
          "paid",
          "paid-in-full",
          "paid_in_full",
          "fully-paid",
          "fully_paid",
          "complete",
          "completed",
        ].includes(value.trim().toLowerCase()),
    )
  )
    return true;
  return /\bpaid\b/i.test(trip.notes || "");
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
  return compactDate(
    firstValue(
      trip.paidDate,
      trip.paymentDate,
      trip.paymentReceivedDate,
      trip.paidOn,
      trip.paymentReceivedOn,
      trip.checkDate,
    ),
  );
}

function normalizePendingKey(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "-");
}

function getPendingIndicators(trip) {
  const pendingItems = Array.isArray(trip.pendingItems)
    ? trip.pendingItems.map(normalizePendingKey)
    : [];
  return PENDING_INDICATORS.filter((item) => {
    if (item.fields.some((field) => isPendingValue(trip[field]))) return true;
    if (item.requiredField && !trip[item.requiredField]) return true;
    if (trip.pending && isPendingValue(trip.pending[item.key])) return true;
    return item.aliases.some((alias) => pendingItems.includes(alias));
  });
}

function hasTripPdf(trip) {
  const pdfFields = [
    trip.pdfUploaded,
    trip.hasPdf,
    trip.hasPDF,
    trip.pdfReady,
    trip.pdfUrl,
    trip.pdfURL,
    trip.pdf,
    trip.uploadedPdf,
    trip.uploadedPDF,
    trip.uploadedPdfUrl,
    trip.uploadedPDFUrl,
    trip.documentUrl,
    trip.documentURL,
  ];
  return pdfFields.some((value) => Boolean(value));
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
  const drivers = trip.drivers || [];
  if (Array.isArray(trip.driverPay)) {
    return trip.driverPay.map((item) =>
      typeof item === "string"
        ? item
        : firstValue(item.pay, item.amount, item.rate),
    );
  }
  if (trip.driverPay && typeof trip.driverPay === "object") {
    return Object.values(trip.driverPay);
  }
  return drivers.map((driver) =>
    firstValue(driver.pay, driver.driverPay, driver.payAmount),
  );
}

function paymentDetail(trip) {
  const check = firstValue(trip.checkNumber, trip.checkNumbers, trip.checkNo);
  if (check) {
    return `Ck# ${stripKnownPrefix(check, ["ck#", "check #", "check"])}`;
  }

  const ref = firstValue(trip.refNumber, trip.referenceNumber, trip.ref);
  if (ref) return `Ref# ${stripKnownPrefix(ref, ["ref#", "ref"])}`;

  const method = firstValue(trip.paymentMethod, trip.paidBy, trip.paymentType);
  const note = firstValue(trip.paymentNote, trip.billingNote);
  return [method, note].filter(Boolean).join(" · ");
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

function refreshIcons() {
  window.requestAnimationFrame(() => {
    window.lucide?.createIcons?.();
  });
}

export function createTripBar(trip, callbacks = {}) {
  installOutsideDismiss();
  installFloatingTooltip();

  const confirmed = Boolean(trip.confirmed);
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
  openBtn.className = "rux-button rux-button--primary rux-button--icon";
  openBtn.setAttribute("aria-label", "Open trip");
  setFloatingTooltip(openBtn, "Open trip");
  openBtn.appendChild(icon("external-link"));
  openBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    (callbacks.onOpenTrip || callbacks.onOpen)?.(trip);
  });

  const pdfUploaded = hasTripPdf(trip);
  const pdfLabel = pdfUploaded ? "View PDF" : "Upload PDF";
  const pdfIcon = pdfUploaded ? "paperclip" : "upload";
  const onPdf = pdfUploaded
    ? callbacks.onViewPdf || callbacks.onViewPDF
    : callbacks.onUploadPdf || callbacks.onUploadPDF || callbacks.onUpload;

  actions.append(
    openBtn,
    button(
      "rux-button rux-button--ghost rux-button--icon",
      "Change bus",
      "arrow-down-up",
      () => callbacks.onChangeBus?.(trip),
    ),
    button(
      "rux-button rux-button--ghost rux-button--icon",
      pdfLabel,
      pdfIcon,
      () => onPdf?.(trip),
    ),
    button(
      "rux-button rux-button--ghost rux-button--icon",
      "Send info",
      "message-square-more",
      () => callbacks.onSendInfo?.(trip),
    ),
    button(
      "rux-button rux-button--ghost rux-button--icon",
      "Trip envelope",
      "mail",
      () => (callbacks.onTripEnvelope || callbacks.onEmail)?.(trip),
    ),
    button(
      "rux-button rux-button--ghost rux-button--icon",
      "Other",
      "more-horizontal",
      () => (callbacks.onOther || callbacks.onMore)?.(trip),
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
  const busLabel = trip.busLabel || "";
  let statusIcon = null;
  if (paid) {
    const datePaid = paidDate(trip);
    statusIcon = icon(
      "dollar-sign",
      "rux-icon rux-trip-bar__status rux-trip-bar__status--paid",
    );
    const paidLabel = datePaid ? `Paid in full ${datePaid}` : "Paid in full";
    setFloatingTooltip(statusIcon, paidLabel);
    summaryMarkerLabels.push(paidLabel);
    pending.appendChild(statusIcon);
    if (datePaid) {
      pending.appendChild(
        textEl("span", "rux-trip-bar__status-date", datePaid),
      );
    }
  }
  pending.setAttribute("aria-label", summaryMarkerLabels.join(", "));
  summary.append(
    textEl("div", "rux-trip-bar__destination", trip.destination),
    ...(summaryMarkerLabels.length ? [pending] : []),
  );

  const time = document.createElement("div");
  time.className = "rux-trip-bar__time";
  const middleTime = trip.loadTime || trip.pickupTime || trip.spotTime;
  time.append(
    timeItem("Dep", fmtTime(trip.departTime)),
    timeItem(
      "Spt",
      middleTime ? fmtTime(middleTime) : "—",
      middleTime ? "" : "rux-trip-bar__time-value--empty",
    ),
    timeItem(
      "Arr",
      fmtTime(trip.arriveTime),
      trip.arriveLate ? "rux-trip-bar__time-value--late" : "",
    ),
  );

  const drivers = document.createElement("div");
  drivers.className = "rux-trip-bar__drivers";
  if (busLabel) {
    const busGroup = textEl("span", "rux-trip-bar__bus-label", busLabel);
    busGroup.setAttribute(
      "aria-label",
      `${busLabel} buses in this customer trip`,
    );
    drivers.appendChild(busGroup);
  }
  (trip.drivers || []).forEach((driver) => {
    const item = document.createElement("span");
    item.className = "rux-trip-bar__driver";
    const dot = document.createElement("span");
    dot.className = `rux-trip-bar__driver-dot ${driverStateClass(driver.state)}`;
    item.append(dot, document.createTextNode(driver.name));
    drivers.appendChild(item);
  });
  const meta = document.createElement("div");
  meta.className = "rux-trip-bar__drivers-meta";
  drivers.appendChild(meta);

  body.append(
    summary,
    textEl("div", "rux-trip-bar__client", trip.client),
    (() => {
      const el = document.createElement("div");
      el.className = "rux-trip-bar__contact";
      el.append(textEl("span", "rux-trip-bar__contact-name", trip.contact));
      if (trip.contactPhone)
        el.append(textEl("span", "rux-trip-bar__contact-phone", trip.contactPhone));
      return el;
    })(),
    textEl("div", "rux-trip-bar__notes", trip.notes),
    time,
    drivers,
  );

  const details = document.createElement("div");
  details.className = "rux-trip-bar__details";
  const detailsInner = document.createElement("div");
  detailsInner.className = "rux-trip-bar__details-inner";

  const driverPay = driverPayValues(trip);
  const detailFields = [
    ["D1 PAY", driverPay[0]],
    ["D2 PAY", driverPay[1]],
    [
      "EST MI",
      firstValue(trip.estimatedMileage, trip.estimatedMiles, trip.miles),
    ],
    ["QUOTE", firstValue(trip.quotedPrice, trip.quote, trip.revenue)],
    [
      "PO",
      stripKnownPrefix(firstValue(trip.poNumber, trip.po, trip.purchaseOrder), [
        "po-",
        "po #",
        "po",
      ]),
      { wide: true },
    ],
    [
      "END MI",
      firstValue(
        trip.postTripMileage,
        trip.postTripMiles,
        trip.actualMileage,
        trip.actualMiles,
      ),
    ],
    [
      "INV",
      stripKnownPrefix(firstValue(trip.invoiceNumber, trip.invoice), [
        "inv-",
        "inv #",
        "invoice #",
        "invoice",
      ]),
    ],
    ["PMT", paymentDetail(trip), { wide: true }],
  ];

  detailFields.forEach(([label, value, options]) => {
    detailsInner.appendChild(detailFieldEl(label, value, options));
  });
  details.appendChild(detailsInner);

  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "rux-button rux-button--ghost rux-button--icon rux-trip-bar__expand";
  const expandIcon = icon("chevron-down", "rux-icon rux-trip-bar__expand-icon");
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

  bar.append(actions, body);

  if (trip.conflict) {
    const conflict = document.createElement("div");
    conflict.className = "rux-trip-bar__conflict";
    conflict.append(
      icon("alert-triangle", "rux-icon rux-icon--sm"),
      document.createTextNode(`Conflict: ${trip.conflict}`),
    );
    bar.appendChild(conflict);
  }

  bar.appendChild(details);

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
    if (active) deactivateTripBars(bar);
    bar.classList.toggle("is-active", active);
    if (!active) setExpanded(false);
  };
  bar.setExpanded = setExpanded;
  bar.tripData = trip;

  tripBars.add(bar);
  bar.setActive(Boolean(trip.active || trip.expanded));
  setExpanded(Boolean(trip.expanded));
  refreshIcons();

  return bar;
}
