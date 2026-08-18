(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const windowEl      = document.getElementById("trip-finder-window");
  const headerEl       = windowEl?.querySelector(".sched-scope-trip-finder__header");
  const closeBtn       = document.getElementById("trip-finder-close-btn");
  const tbody          = document.getElementById("trip-finder-body");
  const searchInput    = document.getElementById("trip-finder-search");
  const badgesEl       = document.getElementById("trip-finder-filter-badges");
  const filtersToggleBtn = document.getElementById("trip-finder-filters-toggle");
  const filtersPanel   = document.getElementById("trip-finder-filters");

  let db          = null;
  let allTrips    = [];
  let allContacts = [];
  let isOpen      = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Same field set/logic as trips-list.js — see that file's history for
  // context on each of these.

  function escapeAttr(value) {
    const node = document.createElement("span");
    node.textContent = value ?? "";
    return node.innerHTML.replaceAll('"', "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function localIsoDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function fmtDates(start, end) {
    if (!start) return "—";
    if (!end || start === end) return fmtDate(start);
    const s = new Date(start + "T00:00:00");
    const e = new Date(end   + "T00:00:00");
    const mo = { month: "short", day: "numeric" };
    const sl = s.toLocaleDateString("en-US", mo);
    return s.getMonth() === e.getMonth()
      ? `${sl}–${e.getDate()}`
      : `${sl} – ${e.toLocaleDateString("en-US", mo)}`;
  }

  function busNumbers(trip) {
    return (trip.trip_assignments ?? [])
      .map(a => a.buses?.number)
      .filter(Boolean);
  }

  function isConfirmed(t) {
    if (window.RuxBilling?.isRecordConfirmed) return window.RuxBilling.isRecordConfirmed(t);
    return !!(t.confirmed || t.contract_status === "Signed" ||
              t.po_ref || (t.deposit_amount > 0) || t.date_paid);
  }

  function tripTypeOf(t) {
    return t.trip_type === "one_way" ? "one_way" : t.trip_type === "dropoff_pickup" ? "dropoff_pickup" : "round_trip";
  }

  function billingTypeOf(t) {
    return t.is_self_organized ? "ticketed" : "charter";
  }

  // Broader than trips-list.js's ref/customer-only match — same field set the
  // old ⌘K search modal used, since this window now covers both jobs.
  function searchTextOf(t) {
    return [
      t.destination,
      t.customer,
      t.trip_ref,
      t.id,
      t.booking_contact_name,
      t.booking_contact_phone,
      t.trip_contact_1_name,
      t.trip_contact_1_phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  // The person behind the booking. Searching a contact's name or phone is a
  // first-class way into this window, so a result has to say which person it
  // matched — "Donna High School" alone does not. The booking contact is who
  // arranged the trip and is what the editor treats as primary; trip contact 1
  // is the day-of rider fallback for the trips booked without one.
  function contactNameOf(t) {
    return t.booking_contact_name || t.trip_contact_1_name || "";
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";

    // No trips is not the same as no results — customers are still searchable,
    // so this reports the empty trip list and falls through rather than
    // returning and leaving the customer rows unrendered.
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="5" class="trips-app__empty">No trips found.</td></tr>`;
    }

    const today = localIsoDate();

    list.forEach((t) => {
      const buses     = busNumbers(t);
      const confirmed = isConfirmed(t);
      const tr = document.createElement("tr");
      tr.className            = "trips-app__row";
      tr.tabIndex             = 0;
      tr.dataset.id           = t.id;
      tr.dataset.hasBus       = buses.length > 0 ? "yes" : "no";
      tr.dataset.isPast       = (t.start_date && t.start_date < today) ? "yes" : "no";
      tr.dataset.confirmed    = confirmed ? "yes" : "no";
      tr.dataset.cancelled    = t.cancelled_at ? "yes" : "no";
      tr.dataset.tripType     = tripTypeOf(t);
      tr.dataset.billingType  = billingTypeOf(t);
      tr.dataset.search       = searchTextOf(t);

      const statusBadge = t.cancelled_at
        ? `<span class="rux-badge rux-badge--danger"${t.cancellation_reason ? ` title="${escapeAttr(t.cancellation_reason)}"` : ""}>Cancelled</span>`
        : confirmed
          ? `<span class="rux-badge rux-badge--success">Confirmed</span>`
          : `<span class="rux-badge rux-badge--danger">Unconfirmed</span>`;

      const contact = contactNameOf(t);

      tr.innerHTML = `
        <td class="trips-app__dates">${fmtDates(t.start_date, t.end_date)}${t.trip_type === "dropoff_pickup" && t.return_start_date ? ` → ${fmtDates(t.return_start_date, t.return_end_date)}` : ""}</td>
		<td class="trips-app__customer">${t.customer || "—"}</td>
		<td data-col="contact">${contact ? escapeAttr(contact) : "—"}</td>
		<td>${t.destination || "—"}</td>
		<td>${statusBadge}</td>
      `;

      tr.addEventListener("click", () => openInScheduler(t));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });

    renderContactRows();
  }

  // ── Customer results ──────────────────────────────────────────────────────
  // Appended after every trip row so trips always rank first — the window is
  // primarily a trip finder, and a customer is the fallback answer when the
  // name you typed has no trip attached (or no trip yet at all). They only
  // appear once something is typed; an unfiltered dump of the whole roster
  // under the whole schedule would bury both.

  function contactSearchTextOf(c) {
    return [c.name, c.client, c.phone, c.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function renderContactRows() {
    if (!allContacts.length) return;

    const header = document.createElement("tr");
    header.className = "sched-scope-trip-finder__group";
    header.id        = "trip-finder-customers-group";
    header.hidden    = true;
    header.innerHTML = `<td colspan="5">Customers</td>`;
    tbody.appendChild(header);

    allContacts.forEach((c) => {
      const tr = document.createElement("tr");
      tr.className          = "trips-app__row sched-scope-trip-finder__contact-row";
      tr.tabIndex           = 0;
      tr.dataset.kind       = "contact";
      tr.dataset.contactId  = c.id;
      tr.dataset.search     = contactSearchTextOf(c);
      tr.hidden             = true;

      tr.innerHTML = `
        <td class="trips-app__dates">—</td>
		<td class="trips-app__customer">${escapeAttr(c.client || "—")}</td>
		<td data-col="contact">${escapeAttr(c.name || "—")}</td>
		<td>${escapeAttr(c.phone || c.email || "—")}</td>
		<td><span class="rux-badge">Customer</span></td>
      `;

      tr.addEventListener("click", () => openCustomer(c));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });
  }

  function openCustomer(contact) {
    document.dispatchEvent(
      new CustomEvent("customers:open", { detail: { contactId: contact.id } }),
    );
    close();
  }

  // ── Open in scheduler ─────────────────────────────────────────────────────

  function openInScheduler(trip) {
    document.dispatchEvent(new CustomEvent("trips:open", { detail: { trip } }));
    close();
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  let dateFilter    = "all";
  let busFilter     = "all";
  let statusFilter  = "all";
  let typeFilter    = "all";
  let billingFilter = "all";

  function setSegmentedValue(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll(".rux-button").forEach((btn) => {
      const on = btn.dataset.value === value;
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function wireSegmentedFilter(groupId, setter) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".rux-button");
      if (!btn) return;
      setter(btn.dataset.value);
      applyFilter();
    });
  }

  wireSegmentedFilter("tff-when-group",    (v) => { dateFilter    = v; });
  wireSegmentedFilter("tff-status-group",  (v) => { statusFilter  = v; });
  wireSegmentedFilter("tff-type-group",    (v) => { typeFilter    = v; });
  wireSegmentedFilter("tff-bus-group",     (v) => { busFilter     = v; });
  wireSegmentedFilter("tff-billing-group", (v) => { billingFilter = v; });

  document.getElementById("tff-clear-btn")?.addEventListener("click", () => {
    dateFilter = "all"; statusFilter = "all"; typeFilter = "all"; busFilter = "all"; billingFilter = "all";
    setSegmentedValue("tff-when-group", "all");
    setSegmentedValue("tff-status-group", "all");
    setSegmentedValue("tff-type-group", "all");
    setSegmentedValue("tff-bus-group", "all");
    setSegmentedValue("tff-billing-group", "all");
    applyFilter();
  });

  // Every filter below the search box describes a trip — a date range, a bus
  // assignment, a billing type. None of them mean anything for a customer, so
  // any active one is taken as "I am looking for trips" and drops the customer
  // results rather than showing rows the filter never actually applied to.
  function tripOnlyFilterActive() {
    return dateFilter !== "all" || busFilter !== "all" || statusFilter !== "all"
        || typeFilter !== "all" || billingFilter !== "all";
  }

  function applyFilter() {
    const q = searchInput?.value.trim().toLowerCase() ?? "";

    tbody.querySelectorAll(".trips-app__row").forEach((row) => {
      if (row.dataset.kind === "contact") {
        row.hidden = !q || tripOnlyFilterActive() || !row.dataset.search.includes(q);
        return;
      }

      const matchQ = !q || row.dataset.search.includes(q);

      const matchDate =
        dateFilter === "all" ||
        (dateFilter === "upcoming" && row.dataset.isPast !== "yes") ||
        (dateFilter === "past"     && row.dataset.isPast === "yes");

      const matchBus =
        busFilter === "all" ||
        (busFilter === "assigned"   && row.dataset.hasBus === "yes") ||
        (busFilter === "unassigned" && row.dataset.hasBus === "no");

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "confirmed"   && row.dataset.confirmed === "yes") ||
        (statusFilter === "unconfirmed" && row.dataset.confirmed === "no") ||
        (statusFilter === "cancelled"   && row.dataset.cancelled === "yes");

      const matchType = typeFilter === "all" || row.dataset.tripType === typeFilter;

      const matchBilling = billingFilter === "all" || row.dataset.billingType === billingFilter;

      row.hidden = !(matchQ && matchDate && matchBus && matchStatus && matchType && matchBilling);
    });

    // The "Customers" divider earns its row only when something sits under it.
    const group = document.getElementById("trip-finder-customers-group");
    if (group) {
      group.hidden = !tbody.querySelector(
        ".sched-scope-trip-finder__contact-row:not([hidden])",
      );
    }

    renderFilterBadges();
  }

  // ── Active-filter badges ──────────────────────────────────────────────────

  const WHEN_LABELS    = { upcoming: "Upcoming", past: "Past" };
  const STATUS_LABELS  = { unconfirmed: "Unconfirmed", confirmed: "Confirmed", cancelled: "Cancelled" };
  const TYPE_LABELS    = { round_trip: "Round Trip", one_way: "One-Way", dropoff_pickup: "Split" };
  const BUS_LABELS     = { assigned: "Assigned Bus", unassigned: "Unassigned Bus" };
  const BILLING_LABELS = { charter: "Charter", ticketed: "Ticketed" };

  function createChip(label, onClear) {
    const span = document.createElement("span");
    span.className = "rux-badge trips-filter-chip";
    span.innerHTML = `${label} <button type="button" class="trips-filter-chip__remove" aria-label="Clear ${label} filter"><span class="rux-icon" aria-hidden="true">close</span></button>`;
    span.querySelector("button").addEventListener("click", onClear);
    return span;
  }

  function renderFilterBadges() {
    if (!badgesEl) return;
    badgesEl.innerHTML = "";
    const chips = [];

    if (dateFilter !== "all") chips.push(createChip(WHEN_LABELS[dateFilter], () => {
      dateFilter = "all"; setSegmentedValue("tff-when-group", "all"); applyFilter();
    }));
    if (statusFilter !== "all") chips.push(createChip(STATUS_LABELS[statusFilter], () => {
      statusFilter = "all"; setSegmentedValue("tff-status-group", "all"); applyFilter();
    }));
    if (typeFilter !== "all") chips.push(createChip(TYPE_LABELS[typeFilter], () => {
      typeFilter = "all"; setSegmentedValue("tff-type-group", "all"); applyFilter();
    }));
    if (busFilter !== "all") chips.push(createChip(BUS_LABELS[busFilter], () => {
      busFilter = "all"; setSegmentedValue("tff-bus-group", "all"); applyFilter();
    }));
    if (billingFilter !== "all") chips.push(createChip(BILLING_LABELS[billingFilter], () => {
      billingFilter = "all"; setSegmentedValue("tff-billing-group", "all"); applyFilter();
    }));

    chips.forEach((chip) => badgesEl.appendChild(chip));
    badgesEl.hidden = chips.length === 0;
  }

  searchInput?.addEventListener("input", applyFilter);

  filtersToggleBtn?.addEventListener("click", () => {
    const nowOpen = !!filtersPanel?.hidden;
    if (filtersPanel) filtersPanel.hidden = !nowOpen;
    filtersToggleBtn.setAttribute("aria-pressed", String(nowOpen));
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function ensureDb() {
    if (!db) db = await import("../data/trip-db.js?v=11");
    return db;
  }

  async function loadTrips() {
    try {
      // Trips are what this window is for, so a failing contacts read degrades
      // to "no customer results" instead of taking the whole search down.
      const [trips, contacts] = await Promise.all([
        db.fetchTrips(),
        db.fetchContacts().catch((err) => {
          console.warn("fetchContacts failed; customer results disabled:", err);
          return [];
        }),
      ]);
      allTrips    = trips;
      allContacts = contacts;
      renderRows(allTrips);
      applyFilter();
    } catch (err) {
      console.error("fetchTrips failed:", err);
      tbody.innerHTML = `<tr><td colspan="5" class="trips-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  async function open() {
    if (!windowEl) return;
    isOpen = true;
    windowEl.hidden = false;
    if (window.innerWidth <= 580) window.RuxFloatingWindow?.resetGeometry(windowEl);
    if (searchInput) searchInput.value = "";
    try {
      await ensureDb();
      await loadTrips();
    } catch (err) {
      console.warn("Could not load trip-db:", err);
    }
    searchInput?.focus();
  }

  function close() {
    isOpen = false;
    if (windowEl) windowEl.hidden = true;
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  closeBtn?.addEventListener("click", close);
  document.getElementById("workspace-search-btn")?.addEventListener("click", open);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      isOpen ? close() : open();
    } else if (e.key === "Escape" && isOpen) {
      close();
    }
  });

  if (windowEl && headerEl) {
    window.RuxFloatingWindow?.attachDrag(windowEl, headerEl, { minViewportWidth: 580 });
  }

  window.TripFinder = { open, close };
})();
