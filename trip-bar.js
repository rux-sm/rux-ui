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

let stylesInjected = false;
let outsideDismissInstalled = false;
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

  document.addEventListener("pointerdown", (event) => {
    const currentBar = event.target?.closest?.(".rux-trip-bar") || null;
    deactivateTripBars(currentBar);
  }, true);
}

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .rux-trip-bar {
      --rux-trip-bar-collapsed-height: 10rem;
      --rux-trip-bar-action-height: calc(var(--rux-control-height) + var(--rux-space-2) + var(--rux-border-width));
      --rux-trip-bar-expand-height: calc(var(--rux-control-height) + var(--rux-border-width));
      --rux-trip-bar-active-height: calc(var(--rux-trip-bar-collapsed-height) + var(--rux-trip-bar-action-height) + var(--rux-trip-bar-expand-height));
      --rux-trip-bar-single-day-height: 8.75rem;
      --_tone: var(--rux-accent);
      --_tone-subtle: var(--rux-accent-subtle);
      --_tone-ring: var(--rux-ring-focus);
      --_surface: color-mix(in oklch, var(--_tone) 12%, var(--rux-bg-elevated));
      --_surface-hover: color-mix(in oklch, var(--_tone) 17%, var(--rux-bg-elevated));
      --_surface-active: color-mix(in oklch, var(--_tone) 22%, var(--rux-bg-elevated));

      position: relative;
      display: flex;
      min-width: 0;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      container-type: inline-size;
      background: var(--_surface);
      border: var(--rux-border-width) solid color-mix(in oklch, var(--_tone) 34%, var(--rux-border));
      border-left-width: calc(var(--rux-border-width) * 3);
      border-radius: var(--rux-radius-md);
      box-shadow: var(--rux-shadow-sm);
      color: var(--rux-fg);
      cursor: pointer;
      user-select: none;
      transition:
        background-color var(--rux-duration-fast) var(--rux-ease-out),
        border-color var(--rux-duration-fast) var(--rux-ease-out),
        box-shadow var(--rux-duration-fast) var(--rux-ease-out),
        transform var(--rux-duration-fast) var(--rux-ease-out);
    }

    .rux-trip-bar:hover {
      background: var(--_surface-hover);
      border-color: color-mix(in oklch, var(--_tone) 48%, var(--rux-border));
    }

    .rux-trip-bar.is-active {
      background: var(--_surface-active);
      border-color: var(--_tone);
      box-shadow: var(--_tone-ring), var(--rux-shadow-sm);
      z-index: var(--rux-z-base);
    }

    .rux-trip-bar--unconfirmed {
      --_tone: var(--rux-danger);
      --_tone-subtle: var(--rux-danger-subtle);
      --_tone-ring: var(--rux-ring-danger);
    }

    .rux-trip-bar:not(.rux-trip-bar--single-day):not(.is-expanded) {
      height: var(--rux-trip-bar-collapsed-height);
    }

    .rux-trip-bar--has-conflict:not(.rux-trip-bar--single-day):not(.is-expanded) {
      height: calc(var(--rux-trip-bar-collapsed-height) + var(--rux-control-height));
    }

    .rux-trip-bar.is-active:not(.rux-trip-bar--single-day):not(.is-expanded) {
      height: var(--rux-trip-bar-active-height);
    }

    .rux-trip-bar--has-conflict.is-active:not(.rux-trip-bar--single-day):not(.is-expanded) {
      height: calc(var(--rux-trip-bar-active-height) + var(--rux-control-height));
    }

    .rux-trip-bar--single-day {
      height: var(--rux-trip-bar-single-day-height);
    }

    .rux-trip-bar--single-day.is-active {
      height: calc(var(--rux-trip-bar-single-day-height) + var(--rux-trip-bar-action-height));
    }

    .rux-trip-bar__actions {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: auto 1px repeat(4, var(--rux-control-height)) 1fr var(--rux-control-height);
      align-items: center;
      gap: var(--rux-space-1);
      max-height: 0;
      overflow: hidden;
      padding: 0 var(--rux-space-2);
      background: color-mix(in oklch, var(--rux-bg-sunken) 74%, transparent);
      border-bottom: var(--rux-border-width) solid transparent;
      opacity: 0;
      pointer-events: none;
      transform: translateY(calc(var(--rux-space-1) * -1));
      visibility: hidden;
      transition:
        max-height var(--rux-duration-base) var(--rux-ease-out),
        padding-block var(--rux-duration-base) var(--rux-ease-out),
        opacity var(--rux-duration-fast) var(--rux-ease-out),
        transform var(--rux-duration-base) var(--rux-ease-out),
        border-color var(--rux-duration-fast) var(--rux-ease-out),
        visibility 0s linear var(--rux-duration-base);
    }

    .rux-trip-bar.is-active .rux-trip-bar__actions {
      max-height: var(--rux-trip-bar-action-height);
      padding-block: var(--rux-space-1);
      border-bottom-color: color-mix(in oklch, var(--rux-fg) 8%, transparent);
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
      visibility: visible;
      transition:
        max-height var(--rux-duration-base) var(--rux-ease-out),
        padding-block var(--rux-duration-base) var(--rux-ease-out),
        opacity var(--rux-duration-fast) var(--rux-ease-out),
        transform var(--rux-duration-base) var(--rux-ease-out),
        border-color var(--rux-duration-fast) var(--rux-ease-out),
        visibility 0s;
    }

    .rux-trip-bar__action-divider {
      width: var(--rux-border-width);
      height: var(--rux-icon-lg);
      background: color-mix(in oklch, var(--rux-fg) 12%, transparent);
    }

    .rux-trip-bar__body {
      display: grid;
      gap: var(--rux-space-1);
      padding: var(--rux-space-3);
    }

    .rux-trip-bar--single-day .rux-trip-bar__body {
      grid-template-rows: auto auto auto auto 1fr auto;
      gap: 0;
      height: 100%;
      padding: var(--rux-space-2);
    }

    .rux-trip-bar__summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: var(--rux-space-2);
    }

    .rux-trip-bar__bus-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.25rem;
      height: var(--rux-icon-xl);
      padding: 0 var(--rux-space-2);
      background: color-mix(in oklch, var(--rux-fg) 10%, transparent);
      border-radius: var(--rux-radius-sm);
      color: var(--rux-fg);
      font-size: var(--rux-text-xs);
      font-weight: var(--rux-weight-bold);
      line-height: 1;
    }

    .rux-trip-bar__bus-label:empty {
      min-width: var(--rux-icon-md);
      padding: 0;
      background: transparent;
    }

    .rux-trip-bar__destination {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--rux-text-md);
      font-weight: var(--rux-weight-bold);
      letter-spacing: 0;
      line-height: var(--rux-leading-snug);
    }

    .rux-trip-bar--single-day .rux-trip-bar__summary {
      align-items: start;
      gap: var(--rux-space-1);
    }

    .rux-trip-bar--single-day .rux-trip-bar__destination {
      text-align: center;
      color: color-mix(in oklch, var(--_tone) 58%, var(--rux-fg));
      font-size: var(--rux-text-sm);
      line-height: 1.1;
    }

    .rux-trip-bar__status {
      color: var(--_tone);
    }

    .rux-trip-bar__pending {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--rux-space-1);
      color: var(--rux-danger);
    }

    .rux-trip-bar__pending-icon {
      width: var(--rux-icon-sm);
      height: var(--rux-icon-sm);
      flex: none;
      stroke-width: 2.25;
    }

    .rux-trip-bar__client,
    .rux-trip-bar__contact,
    .rux-trip-bar__notes {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: var(--rux-leading-snug);
    }

    .rux-trip-bar__client {
      color: var(--rux-fg);
      font-size: var(--rux-text-sm);
      font-weight: var(--rux-weight-medium);
    }

    .rux-trip-bar__contact,
    .rux-trip-bar__notes {
      color: var(--rux-fg-muted);
      font-size: var(--rux-text-xs);
    }

    .rux-trip-bar__notes {
      font-style: italic;
    }

    .rux-trip-bar--single-day .rux-trip-bar__client,
    .rux-trip-bar--single-day .rux-trip-bar__contact,
    .rux-trip-bar--single-day .rux-trip-bar__notes {
      text-align: center;
      line-height: 1.08;
    }

    .rux-trip-bar--single-day .rux-trip-bar__client {
      color: color-mix(in oklch, var(--_tone) 42%, var(--rux-fg));
      font-size: var(--rux-text-xs);
      font-weight: var(--rux-weight-semibold);
    }

    .rux-trip-bar--single-day .rux-trip-bar__contact,
    .rux-trip-bar--single-day .rux-trip-bar__notes {
      font-size: var(--rux-text-xs);
    }

    .rux-trip-bar__time {
      display: flex;
      min-width: 0;
      align-items: baseline;
      gap: var(--rux-space-2);
      color: var(--rux-fg);
      font-size: var(--rux-text-xs);
      line-height: var(--rux-leading-snug);
      white-space: nowrap;
    }

    .rux-trip-bar--single-day .rux-trip-bar__time {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-self: end;
      gap: var(--rux-space-1);
      min-height: var(--rux-control-height);
      margin: var(--rux-space-1) calc(var(--rux-space-2) * -1) 0;
      padding: var(--rux-space-1) var(--rux-space-2);
      background: color-mix(in oklch, var(--rux-bg-sunken) 72%, var(--_tone));
      border-radius: var(--rux-radius-sm);
      font-size: var(--rux-text-sm);
    }

    .rux-trip-bar__day,
    .rux-trip-bar__time-sep {
      color: var(--rux-fg-subtle);
    }

    .rux-trip-bar--single-day .rux-trip-bar__day,
    .rux-trip-bar--single-day .rux-trip-bar__time-sep {
      display: none;
    }

    .rux-trip-bar__time-value {
      font-weight: var(--rux-weight-semibold);
    }

    .rux-trip-bar--single-day .rux-trip-bar__time-value {
      min-width: 0;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
    }

    .rux-trip-bar__time-value--late {
      color: var(--rux-warning);
    }

    .rux-trip-bar__drivers {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--rux-space-2);
      padding-top: calc(var(--rux-space-1) / 2);
    }

    .rux-trip-bar--single-day .rux-trip-bar__drivers {
      justify-content: center;
      gap: var(--rux-space-3);
      padding-top: var(--rux-space-1);
    }

    .rux-trip-bar__driver {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: var(--rux-space-1);
      color: var(--rux-fg-muted);
      font-size: var(--rux-text-xs);
      font-weight: var(--rux-weight-semibold);
      line-height: 1;
    }

    .rux-trip-bar--single-day .rux-trip-bar__driver {
      color: var(--rux-fg);
      font-size: var(--rux-text-sm);
    }

    .rux-trip-bar__driver-dot {
      width: var(--rux-dot-sm);
      height: var(--rux-dot-sm);
      flex: none;
      border-radius: var(--rux-radius-full);
      background: var(--rux-warning);
    }

    .rux-trip-bar__driver-dot--confirmed { background: var(--rux-accent); }
    .rux-trip-bar__driver-dot--unconfirmed { background: var(--rux-danger); }

    .rux-trip-bar__conflict {
      display: flex;
      align-items: center;
      gap: var(--rux-space-2);
      padding: var(--rux-space-2) var(--rux-space-3);
      background: color-mix(in oklch, var(--rux-danger) 18%, transparent);
      border-top: var(--rux-border-width) solid color-mix(in oklch, var(--rux-danger) 38%, transparent);
      color: var(--rux-danger);
      font-size: var(--rux-text-xs);
      font-weight: var(--rux-weight-semibold);
      line-height: var(--rux-leading-snug);
    }

    .rux-trip-bar__details {
      max-height: 0;
      overflow: hidden;
      transition: max-height var(--rux-duration-base) var(--rux-ease-out);
    }

    .rux-trip-bar.is-expanded .rux-trip-bar__details {
      max-height: 13rem;
    }

    .rux-trip-bar__details-inner {
      display: grid;
      gap: var(--rux-space-2);
      padding: var(--rux-space-3);
      border-top: var(--rux-border-width) solid color-mix(in oklch, var(--rux-fg) 8%, transparent);
    }

    .rux-trip-bar__detail-row {
      display: grid;
      grid-template-columns: 5.75rem minmax(0, 1fr);
      align-items: baseline;
      gap: var(--rux-space-3);
      font-size: var(--rux-text-xs);
      line-height: var(--rux-leading-snug);
    }

    .rux-trip-bar__detail-label {
      color: var(--rux-fg-subtle);
      font-weight: var(--rux-weight-semibold);
      letter-spacing: var(--rux-tracking-wide);
      text-transform: uppercase;
    }

    .rux-trip-bar__detail-value {
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--rux-fg);
      font-weight: var(--rux-weight-medium);
    }

    .rux-trip-bar__detail-value--tone {
      color: var(--_tone);
    }

    .rux-trip-bar__expand {
      max-height: 0;
      overflow: hidden;
      border-width: var(--rux-border-width) 0 0;
      border-style: solid;
      border-color: transparent;
      border-radius: 0;
      box-shadow: none;
      background: color-mix(in oklch, var(--rux-bg-sunken) 54%, transparent);
      color: var(--rux-fg-muted);
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
      transition:
        max-height var(--rux-duration-base) var(--rux-ease-out),
        opacity var(--rux-duration-fast) var(--rux-ease-out),
        border-color var(--rux-duration-fast) var(--rux-ease-out),
        visibility 0s linear var(--rux-duration-base);
    }

    .rux-trip-bar.is-active > .rux-trip-bar__expand {
      max-height: var(--rux-trip-bar-expand-height);
      border-color: color-mix(in oklch, var(--rux-fg) 8%, transparent);
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
      transition:
        max-height var(--rux-duration-base) var(--rux-ease-out),
        opacity var(--rux-duration-fast) var(--rux-ease-out),
        border-color var(--rux-duration-fast) var(--rux-ease-out),
        visibility 0s;
    }

    .rux-trip-bar__expand:hover {
      background: color-mix(in oklch, var(--rux-fg) 6%, transparent);
      color: var(--rux-fg);
    }

    .rux-trip-bar__expand-icon {
      transition: transform var(--rux-duration-base) var(--rux-ease-out);
    }

    .rux-trip-bar.is-expanded .rux-trip-bar__expand-icon {
      transform: rotate(180deg);
    }

    .rux-trip-bar__action-spacer {
      min-width: 0;
    }

    .rux-trip-bar--single-day > .rux-trip-bar__expand {
      display: none;
    }

    @container (max-width: 24rem) {
      .rux-trip-bar__actions {
        grid-template-columns: auto repeat(3, var(--rux-control-height));
        justify-content: start;
      }

      .rux-trip-bar__action-divider,
      .rux-trip-bar__action--hide-narrow,
      .rux-trip-bar__action-spacer {
        display: none;
      }

      .rux-trip-bar:not(.rux-trip-bar--single-day) .rux-trip-bar__client,
      .rux-trip-bar:not(.rux-trip-bar--single-day) .rux-trip-bar__contact,
      .rux-trip-bar:not(.rux-trip-bar--single-day) .rux-trip-bar__notes,
      .rux-trip-bar:not(.rux-trip-bar--single-day) .rux-trip-bar__drivers {
        display: none;
      }

      .rux-trip-bar--single-day .rux-trip-bar__destination,
      .rux-trip-bar--single-day .rux-trip-bar__client,
      .rux-trip-bar--single-day .rux-trip-bar__contact,
      .rux-trip-bar--single-day .rux-trip-bar__notes,
      .rux-trip-bar--single-day .rux-trip-bar__time,
      .rux-trip-bar--single-day .rux-trip-bar__driver {
        font-size: var(--rux-text-xs);
      }

      .rux-trip-bar--single-day .rux-trip-bar__time {
        gap: 0;
        padding-inline: var(--rux-space-1);
      }

      .rux-trip-bar--single-day .rux-trip-bar__pending {
        gap: 2px;
      }
    }

    @container (max-width: 14rem) {
      .rux-trip-bar--single-day .rux-trip-bar__body {
        padding: var(--rux-space-2);
      }

      .rux-trip-bar--single-day .rux-trip-bar__bus-label {
        min-width: 1.875rem;
        padding: 0 var(--rux-space-1);
      }

      .rux-trip-bar--single-day .rux-trip-bar__destination,
      .rux-trip-bar--single-day .rux-trip-bar__time,
      .rux-trip-bar--single-day .rux-trip-bar__driver {
        font-size: var(--rux-text-xs);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .rux-trip-bar,
      .rux-trip-bar__actions,
      .rux-trip-bar__details,
      .rux-trip-bar__expand-icon {
        transition-duration: 0.001ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function icon(name, className = "rux-icon") {
  const el = document.createElement("i");
  el.setAttribute("data-lucide", name);
  el.className = className;
  return el;
}

function button(className, label, iconName, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.setAttribute("aria-label", label);
  btn.dataset.tooltip = label;
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
  el.textContent = text || "";
  return el;
}

function driverStateClass(state) {
  if (state === "conf" || state === "confirmed") return "rux-trip-bar__driver-dot--confirmed";
  if (state === "unconf" || state === "unconfirmed") return "rux-trip-bar__driver-dot--unconfirmed";
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
    icon: "phone",
    label: "Pending contact status",
    fields: ["pendingContact", "contactPending", "pendingContactStatus", "contactStatusPending"],
    aliases: ["contact", "contact-status", "contact_status", "pending-contact", "pending_contact"],
  },
  {
    key: "contract",
    icon: "file-pen",
    label: "Pending signed contract",
    fields: ["pendingContract", "contractPending", "pendingSignedContract", "signedContractPending"],
    aliases: ["contract", "signed-contract", "signed_contract", "pending-contract", "pending_contract"],
  },
  {
    key: "po",
    icon: "circle-dollar-sign",
    label: "Pending PO",
    fields: ["pendingPO", "pendingPo", "poPending", "pendingPurchaseOrder", "purchaseOrderPending"],
    aliases: ["po", "purchase-order", "purchase_order", "pending-po", "pending_po"],
  },
];

function isPendingValue(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["pending", "missing", "needed", "unreceived", "not-received", "not_received"].includes(value.toLowerCase());
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
    if (trip.pending && isPendingValue(trip.pending[item.key])) return true;
    return item.aliases.some((alias) => pendingItems.includes(alias));
  });
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
  injectStyles();
  installOutsideDismiss();

  const confirmed = Boolean(trip.confirmed);
  const singleDay = isSameTripDay(trip);
  const bar = document.createElement("article");
  bar.className = [
    "rux-trip-bar",
    confirmed ? "rux-trip-bar--confirmed" : "rux-trip-bar--unconfirmed",
    singleDay ? "rux-trip-bar--single-day" : "",
    trip.conflict ? "rux-trip-bar--has-conflict" : "",
  ].filter(Boolean).join(" ");
  bar.tabIndex = 0;
  bar.setAttribute("aria-label", `${trip.destination || "Trip"} ${confirmed ? "confirmed" : "unconfirmed"}`);

  const actions = document.createElement("div");
  actions.className = "rux-trip-bar__actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "rux-button rux-button--primary";
  openBtn.append(icon("external-link"), document.createTextNode("Open trip"));
  openBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    callbacks.onOpen?.(trip);
  });

  const divider = document.createElement("span");
  divider.className = "rux-trip-bar__action-divider";
  divider.setAttribute("aria-hidden", "true");

  const actionSpacer = document.createElement("span");
  actionSpacer.className = "rux-trip-bar__action-spacer";

  actions.append(
    openBtn,
    divider,
    button("rux-button rux-button--ghost rux-button--icon rux-trip-bar__action--hide-narrow", "Upload PDF", "upload", () => callbacks.onUpload?.(trip)),
    button("rux-button rux-button--ghost rux-button--icon rux-trip-bar__action--hide-narrow", "Duplicate", "copy", () => callbacks.onDuplicate?.(trip)),
    button("rux-button rux-button--ghost rux-button--icon", "Email", "mail", () => callbacks.onEmail?.(trip)),
    button("rux-button rux-button--ghost rux-button--icon", "Message", "message-square", () => callbacks.onMessage?.(trip)),
    actionSpacer,
    button("rux-button rux-button--ghost rux-button--icon", "More options", "more-horizontal", () => callbacks.onMore?.(trip))
  );

  const body = document.createElement("div");
  body.className = "rux-trip-bar__body";

  const summary = document.createElement("div");
  summary.className = "rux-trip-bar__summary";
  const pendingItems = getPendingIndicators(trip);
  const pending = document.createElement("span");
  pending.className = "rux-trip-bar__pending";
  pending.setAttribute("aria-label", pendingItems.map((item) => item.label).join(", "));
  pendingItems.forEach((item) => {
    const marker = icon(item.icon, "rux-icon rux-trip-bar__pending-icon");
    marker.setAttribute("title", item.label);
    marker.dataset.tooltip = item.label;
    pending.appendChild(marker);
  });
  const busLabel = trip.busLabel || (singleDay ? "" : trip.busNumber || "Trip");
  summary.append(
    textEl("span", "rux-trip-bar__bus-label", busLabel),
    textEl("div", "rux-trip-bar__destination", trip.destination),
    ...(pendingItems.length ? [pending] : []),
    icon(confirmed ? "badge-check" : "clipboard-list", "rux-icon rux-trip-bar__status")
  );

  const time = document.createElement("div");
  time.className = "rux-trip-bar__time";
  const middleTime = trip.loadTime || trip.pickupTime || trip.spotTime;
  time.append(
    textEl("span", "rux-trip-bar__day", trip.departDay),
    textEl("span", "rux-trip-bar__time-value", trip.departTime),
    textEl("span", "rux-trip-bar__time-sep", "-"),
    ...(middleTime ? [textEl("span", "rux-trip-bar__time-value", middleTime)] : []),
    textEl("span", `rux-trip-bar__time-value${trip.arriveLate ? " rux-trip-bar__time-value--late" : ""}`, trip.arriveTime)
  );

  const drivers = document.createElement("div");
  drivers.className = "rux-trip-bar__drivers";
  (trip.drivers || []).forEach((driver) => {
    const item = document.createElement("span");
    item.className = "rux-trip-bar__driver";
    const dot = document.createElement("span");
    dot.className = `rux-trip-bar__driver-dot ${driverStateClass(driver.state)}`;
    item.append(dot, document.createTextNode(driver.name));
    drivers.appendChild(item);
  });

  body.append(
    summary,
    textEl("div", "rux-trip-bar__client", trip.client),
    textEl("div", "rux-trip-bar__contact", trip.contact),
    textEl("div", "rux-trip-bar__notes", trip.notes),
    time,
    drivers
  );

  const details = document.createElement("div");
  details.className = "rux-trip-bar__details";
  const detailsInner = document.createElement("div");
  detailsInner.className = "rux-trip-bar__details-inner";

  const detailRows = [
    ["Bus #", trip.busNumber, "tone"],
    ["Miles", trip.miles],
    ["Revenue", trip.revenue],
    ["Pick up", trip.pickupAddress],
  ].filter(([, value]) => value);

  detailRows.forEach(([label, value, variant]) => {
    const row = document.createElement("div");
    row.className = "rux-trip-bar__detail-row";
    row.append(
      textEl("span", "rux-trip-bar__detail-label", label),
      textEl("span", `rux-trip-bar__detail-value${variant ? " rux-trip-bar__detail-value--" + variant : ""}`, value)
    );
    detailsInner.appendChild(row);
  });
  details.appendChild(detailsInner);

  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "rux-button rux-button--block rux-trip-bar__expand";
  const expandIcon = icon("chevron-down", "rux-icon rux-trip-bar__expand-icon");
  const expandText = document.createElement("span");
  expandBtn.append(expandIcon, expandText);

  function setExpanded(value) {
    const expanded = Boolean(value);
    if (expanded && !bar.classList.contains("is-active")) bar.setActive(true);
    bar.classList.toggle("is-expanded", expanded);
    expandBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    expandText.textContent = expanded ? "Hide details" : `${detailRows.length} more details`;
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
    conflict.append(icon("alert-triangle", "rux-icon rux-icon--sm"), document.createTextNode(`Conflict: ${trip.conflict}`));
    bar.appendChild(conflict);
  }

  bar.append(details, expandBtn);

  bar.addEventListener("click", () => {
    bar.setActive(true);
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
