(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const tbody       = document.getElementById("trips-roster-body");
  const searchInput = document.getElementById("trips-search");

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
    return !!(t.confirmed || t.contract_status === "Signed" ||
              t.po_ref || (t.deposit_amount > 0) || t.date_paid);
  }

  function invoiceLevel(t) {
    if (t.date_paid)                                    return "paid";
    if (t.invoice_number || t.invoice_status === "Invoiced") return "invoiced";
    return "pending";
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="8" class="trips-app__empty">No trips found.</td></tr>`;
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    list.forEach((t) => {
      const buses     = busNumbers(t);
      const confirmed = isConfirmed(t);
      const invLevel  = invoiceLevel(t);

      const tr = document.createElement("tr");
      tr.className           = "trips-app__row";
      tr.tabIndex            = 0;
      tr.dataset.id          = t.id;
      tr.dataset.hasBus      = buses.length > 0 ? "yes" : "no";
      tr.dataset.invoiceLevel = invLevel;
      tr.dataset.isPast      = (t.start_date && t.start_date < today) ? "yes" : "no";

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
        <td class="trips-app__dates">${fmtDates(t.start_date, t.end_date)}</td>
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

  function applyFilter() {
    const q = searchInput.value.toLowerCase();

    const dateFilter =
      document.querySelector("[data-trips-date-filter] .rux-button[aria-pressed='true']")
        ?.dataset.filter || "all";
    const busFilter =
      document.querySelector("[data-trips-bus-filter] .rux-button[aria-pressed='true']")
        ?.dataset.filter || "all";
    const invoiceFilter =
      document.querySelector("[data-trips-invoice-filter] .rux-button[aria-pressed='true']")
        ?.dataset.filter || "all";

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

      const matchInvoice =
        invoiceFilter === "all" || invoiceFilter === row.dataset.invoiceLevel;

      row.hidden = !(matchQ && matchDate && matchBus && matchInvoice);
    });
  }

  searchInput.addEventListener("input", applyFilter);

  ["[data-trips-date-filter]", "[data-trips-bus-filter]", "[data-trips-invoice-filter]"]
    .forEach((groupSel) => {
      document.querySelectorAll(`${groupSel} .rux-button`).forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(`${groupSel} .rux-button`).forEach((b) => {
            const on = b === btn;
            b.setAttribute("aria-pressed", on ? "true" : "false");
            b.classList.toggle("is-active", on);
          });
          applyFilter();
        });
      });
    });

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
        db = await import("./trip-db.js");
      } catch (err) {
        console.warn("Could not load trip-db:", err);
        return;
      }
    }
    await loadTrips();
  }

  window.TripsListPanel = { init, reload: loadTrips };

  init().catch((err) => {
    console.error("TripsListPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="trips-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });
})();
