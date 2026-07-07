(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const tbody = document.getElementById("my-trips-roster-body");

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
    if (window.RuxBilling?.isRecordConfirmed) return window.RuxBilling.isRecordConfirmed(t);
    return !!(t.confirmed || t.contract_status === "Signed" ||
              t.po_ref || (t.deposit_amount > 0) || t.date_paid);
  }

  function passengerTotals(t) {
    const passengers = t.trip_passengers ?? [];
    const owed = passengers.reduce((sum, p) => sum + (Number(p.amount_owed) || 0), 0);
    const paid = passengers.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
    return { count: passengers.length, owed, paid, balance: owed - paid };
  }

  function fmtMoney(value) {
    return value
      ? `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 0 })}`
      : "—";
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="8" class="trips-app__empty">No ETB trips found.</td></tr>`;
      return;
    }

    list.forEach((t) => {
      const buses     = busNumbers(t);
      const confirmed = isConfirmed(t);
      const totals    = passengerTotals(t);

      const tr = document.createElement("tr");
      tr.className  = "trips-app__row";
      tr.tabIndex   = 0;
      tr.dataset.id = t.id;

      const busCell = buses.length
        ? buses.map(n => `<span class="rux-tag">Bus ${n}</span>`).join(" ")
        : `<span class="trips-app__unassigned">Unassigned</span>`;

      const confirmedBadge = confirmed
        ? `<span class="rux-badge rux-badge--dot rux-badge--success">Confirmed</span>`
        : `<span class="rux-badge rux-badge--dot">Unconfirmed</span>`;

      tr.innerHTML = `
        <td>
          <div class="trips-app__trip-cell">
            <span class="trips-app__trip-ref">${t.trip_ref || "—"}</span>
            <span class="trips-app__customer">${t.destination || "—"}</span>
          </div>
        </td>
        <td class="trips-app__dates">${fmtDates(t.start_date, t.end_date)}</td>
        <td class="trips-app__bus-cell">${busCell}</td>
        <td>${totals.count}</td>
        <td class="col-owed">${fmtMoney(totals.owed)}</td>
        <td class="col-paid">${fmtMoney(totals.paid)}</td>
        <td class="col-balance">${fmtMoney(totals.balance)}</td>
        <td>${confirmedBadge}</td>
      `;

      tr.addEventListener("click", () => openPassengerRoster(t));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });
  }

  // ── Open passenger roster ────────────────────────────────────────────────

  function openPassengerRoster(trip) {
    document.dispatchEvent(new CustomEvent("passenger-roster:open", { detail: { trip } }));
  }

  // ── Add trip button ───────────────────────────────────────────────────────

  document.getElementById("my-trips-btn-add")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("trips:new", { detail: { selfOrganized: true } }));
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadTrips() {
    try {
      allTrips = (await db.fetchTrips()).filter((t) => t.is_self_organized);
      renderRows(allTrips);
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

  window.MyTripsPanel = { init, reload: loadTrips };
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
    if (allTrips.length) renderRows(allTrips);
  });

  init().catch((err) => {
    console.error("MyTripsPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="trips-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });
})();
