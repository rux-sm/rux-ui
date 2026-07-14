(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const tbody       = document.getElementById("trips-roster-body");
  const searchInput = document.getElementById("trips-search");
  const badgesEl    = document.getElementById("trips-filter-badges");

  let db       = null;
  let allTrips = [];

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  function invoiceLevel(t) {
    if (t.date_paid)                                    return "paid";
    if (t.invoice_number || t.invoice_status === "Invoiced") return "invoiced";
    return "pending";
  }

  function tripTypeOf(t) {
    return t.trip_type === "one_way" ? "one_way" : t.trip_type === "dropoff_pickup" ? "dropoff_pickup" : "round_trip";
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="8" class="trips-app__empty">No trips found.</td></tr>`;
      return;
    }

    const today = localIsoDate();

    list.forEach((t) => {
      const buses     = busNumbers(t);
      const confirmed = isConfirmed(t);
      const invLevel  = invoiceLevel(t);

      const tr = document.createElement("tr");
      tr.className            = "trips-app__row";
      tr.tabIndex             = 0;
      tr.dataset.id           = t.id;
      tr.dataset.hasBus       = buses.length > 0 ? "yes" : "no";
      tr.dataset.invoiceLevel = invLevel;
      tr.dataset.isPast       = (t.start_date && t.start_date < today) ? "yes" : "no";
      tr.dataset.confirmed    = confirmed ? "yes" : "no";
      tr.dataset.tripType     = tripTypeOf(t);

      const busCell = buses.length
        ? buses.map(n => `<span class="rux-tag">Bus ${n}</span>`).join(" ")
        : `<span class="trips-app__unassigned">Unassigned</span>`;

      const confirmedBadge = confirmed
        ? `<span class="rux-badge rux-badge--dot rux-badge--success">Confirmed</span>`
        : `<span class="rux-badge rux-badge--dot">Unconfirmed</span>`;

      const invoiceBadge = t.invoice_number
        ? `<span class="rux-badge rux-badge--dot rux-badge--success">Invoiced</span>`
        : `<span class="rux-badge rux-badge--dot">Pending</span>`;

      const paymentBadge = t.date_paid
        ? `<span class="rux-badge rux-badge--dot rux-badge--success">Paid ${fmtDate(t.date_paid)}</span>`
        : `<span class="rux-subtle">—</span>`;

      const quoted = t.quoted_price
        ? `$${Number(t.quoted_price).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
        : "—";

      tr.innerHTML = `
        <td>
          <div class="trips-app__trip-cell">
            <span class="trips-app__trip-ref">${t.trip_ref || "—"}</span>
            <span class="trips-app__customer">${t.customer || "—"}</span>
          </div>
        </td>
        <td>${t.destination || "—"}</td>
        <td class="trips-app__dates">${fmtDates(t.start_date, t.end_date)}${t.trip_type === "dropoff_pickup" && t.return_start_date ? ` → ${fmtDates(t.return_start_date, t.return_end_date)}` : ""}</td>
        <td class="trips-app__bus-cell">${busCell}</td>
        <td>${confirmedBadge}</td>
        <td>${invoiceBadge}</td>
        <td class="col-payment">${paymentBadge}</td>
        <td class="col-quoted">${quoted}</td>
      `;

      tr.addEventListener("click", () => openInScheduler(t));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });
  }

  // ── Open in scheduler ─────────────────────────────────────────────────────

  function openInScheduler(trip) {
    document.dispatchEvent(new CustomEvent("trips:open", { detail: { trip } }));
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  // The segmented groups (When/Status/Trip Type/Bus) live in the right
  // panel's "Filter By" card (index.html) — this module owns the filter
  // state and just reads whichever button is active there.

  let dateFilter   = "all";
  let busFilter    = "all";
  let statusFilter = "all";
  let typeFilter   = "all";

  function setSegmentedValue(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll(".rux-button").forEach((btn) => {
      const on = btn.dataset.value === value;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-active", on);
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

  wireSegmentedFilter("tf-when-group",   (v) => { dateFilter   = v; });
  wireSegmentedFilter("tf-status-group", (v) => { statusFilter = v; });
  wireSegmentedFilter("tf-type-group",   (v) => { typeFilter   = v; });
  wireSegmentedFilter("tf-bus-group",    (v) => { busFilter    = v; });

  document.getElementById("tf-clear-btn")?.addEventListener("click", () => {
    dateFilter = "all"; statusFilter = "all"; typeFilter = "all"; busFilter = "all";
    setSegmentedValue("tf-when-group", "all");
    setSegmentedValue("tf-status-group", "all");
    setSegmentedValue("tf-type-group", "all");
    setSegmentedValue("tf-bus-group", "all");
    applyFilter();
  });

  function applyFilter() {
    const q = searchInput?.value.toLowerCase() ?? "";

    tbody.querySelectorAll(".trips-app__row").forEach((row) => {
      const ref  = row.querySelector(".trips-app__trip-ref")?.textContent.toLowerCase()  || "";
      const cust = row.querySelector(".trips-app__customer")?.textContent.toLowerCase() || "";
      const matchQ = !q || ref.includes(q) || cust.includes(q);

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
        (statusFilter === "unconfirmed" && row.dataset.confirmed === "no");

      const matchType = typeFilter === "all" || row.dataset.tripType === typeFilter;

      row.hidden = !(matchQ && matchDate && matchBus && matchStatus && matchType);
    });

    renderFilterBadges();
    updateListTitle();
  }

  // ── Dynamic title ("All Trips" / "Upcoming Trips" / "Unconfirmed Trips"...) ─

  const WHEN_TITLE   = { upcoming: "Upcoming", past: "Past" };
  const STATUS_TITLE = { unconfirmed: "Unconfirmed", confirmed: "Confirmed" };

  function updateListTitle() {
    const listViewEl = document.getElementById("calendar-list-view");
    const weekLabelEl = document.getElementById("week-label");
    if (!listViewEl || listViewEl.hidden || !weekLabelEl) return;
    const parts = [WHEN_TITLE[dateFilter], STATUS_TITLE[statusFilter]].filter(Boolean);
    weekLabelEl.textContent = parts.length ? `${parts.join(" ")} Trips` : "All Trips";
  }

  // ── Active-filter badges (right-aligned in the List view header) ─────────

  const WHEN_LABELS   = { upcoming: "Upcoming", past: "Past" };
  const STATUS_LABELS = { unconfirmed: "Unconfirmed", confirmed: "Confirmed" };
  const TYPE_LABELS   = { round_trip: "Round Trip", one_way: "One-Way", dropoff_pickup: "Split" };
  const BUS_LABELS    = { assigned: "Assigned Bus", unassigned: "Unassigned Bus" };

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
      dateFilter = "all"; setSegmentedValue("tf-when-group", "all"); applyFilter();
    }));
    if (statusFilter !== "all") chips.push(createChip(STATUS_LABELS[statusFilter], () => {
      statusFilter = "all"; setSegmentedValue("tf-status-group", "all"); applyFilter();
    }));
    if (typeFilter !== "all") chips.push(createChip(TYPE_LABELS[typeFilter], () => {
      typeFilter = "all"; setSegmentedValue("tf-type-group", "all"); applyFilter();
    }));
    if (busFilter !== "all") chips.push(createChip(BUS_LABELS[busFilter], () => {
      busFilter = "all"; setSegmentedValue("tf-bus-group", "all"); applyFilter();
    }));

    chips.forEach((chip) => badgesEl.appendChild(chip));
    badgesEl.hidden = chips.length === 0;
  }

  searchInput?.addEventListener("input", applyFilter);

  // ── Add trip button ───────────────────────────────────────────────────────

  document.getElementById("trips-btn-add")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("trips:new"));
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadTrips() {
    try {
      allTrips = await db.fetchTrips();
      renderRows(allTrips);
      applyFilter();
    } catch (err) {
      console.error("fetchTrips failed:", err);
      tbody.innerHTML = `<tr><td colspan="8" class="trips-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function init() {
    if (!db) {
      try {
        db = await import("../data/trip-db.js");
      } catch (err) {
        console.warn("Could not load trip-db:", err);
        return;
      }
    }
    await loadTrips();
  }

  window.TripsListPanel = { init, reload: loadTrips, updateTitle: updateListTitle };
  document.addEventListener("trips:refresh", () => {
    if (db) loadTrips();
  });
  document.addEventListener("rux:trip-saved", () => {
    if (db) loadTrips();
  });
  document.addEventListener("rux:trip-deleted", () => {
    if (db) loadTrips();
  });
  document.addEventListener("settings:billing", () => {
    if (allTrips.length) {
      renderRows(allTrips);
      applyFilter();
    }
  });

  init().catch((err) => {
    console.error("TripsListPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="trips-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });
})();
