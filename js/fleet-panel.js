(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const drawer      = document.getElementById("fleet-panel-drawer");
  const panelEl     = drawer.querySelector(".rux-fleet-panel");
  const tbody       = document.getElementById("fleet-roster-body");
  const tabBtns     = document.querySelectorAll("[data-fleet-tabs] .rux-button");
  const panes       = document.querySelectorAll(".rux-fleet-panel__pane");
  const searchInput = document.getElementById("fleet-search");
  const tripList    = document.getElementById("fp-trip-list");

  let db         = null;
  let selectedId = null;
  let allBuses   = [];

  // ── Drawer ────────────────────────────────────────────────────────────────

  function openDrawer()  { drawer.classList.add("is-open"); }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    tbody.querySelectorAll(".fleet-app__row").forEach(r => r.classList.remove("is-selected"));
    selectedId = null;
  }

  document.getElementById("fp-btn-close").addEventListener("click", closeDrawer);
  document.getElementById("fleet-menu-btn")?.addEventListener("click", () => drawer.classList.toggle("is-open"));

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function switchTab(activeBtn) {
    tabBtns.forEach(btn =>
      btn.setAttribute("aria-selected", btn === activeBtn ? "true" : "false")
    );
    const targetId = activeBtn.getAttribute("aria-controls");
    panes.forEach(pane => { pane.hidden = pane.id !== targetId; });
  }

  tabBtns.forEach(btn => btn.addEventListener("click", () => switchTab(btn)));

  // ── Toggle groups inside panel (single-select) ────────────────────────────

  panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
    group.querySelectorAll(".rux-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".rux-button").forEach((b) => {
          const on = b === btn;
          b.setAttribute("aria-pressed", on ? "true" : "false");
          b.classList.toggle("is-active", on);
        });
      });
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function fmtTripDates(start, end) {
    if (!start) return "";
    const s  = new Date(start + "T00:00:00");
    const e  = end ? new Date(end + "T00:00:00") : null;
    const mo = { month: "short", day: "numeric" };
    const sl = s.toLocaleDateString("en-US", mo);
    if (!e || start === end) return sl;
    return s.getMonth() === e.getMonth()
      ? `${sl}–${e.getDate()}`
      : `${sl} – ${e.toLocaleDateString("en-US", mo)}`;
  }

  function serviceExpiryClass(iso) {
    if (!iso) return "fleet-app__expiry";
    const today = new Date().toISOString().slice(0, 10);
    if (iso < today) return "fleet-app__expiry fleet-app__expiry--expired";
    const warn = new Date();
    warn.setMonth(warn.getMonth() + 3);
    if (iso <= warn.toISOString().slice(0, 10))
      return "fleet-app__expiry fleet-app__expiry--warn";
    return "fleet-app__expiry";
  }

  function statusMeta(s) {
    if (s === "active")      return { label: "Active",      cls: "rux-badge--success" };
    if (s === "maintenance") return { label: "Maintenance", cls: "rux-badge--warning" };
    return { label: "Retired", cls: "" };
  }

  // ── Trip list ─────────────────────────────────────────────────────────────

  function renderTripList(trips) {
    if (!trips.length) {
      tripList.innerHTML =
        `<li class="rux-fleet-panel__trip-item"><span class="rux-subtle">No trips assigned.</span></li>`;
      return;
    }
    tripList.innerHTML = trips.map((t) => {
      const dates = fmtTripDates(t.startDate, t.endDate);
      const meta  = [dates, t.destination, t.driverName ? `Driver: ${t.driverName}` : null]
                      .filter(Boolean).join(" · ");
      const status    = t.invoiceStatus || "pending";
      const badgeCls  = status === "paid" ? "rux-badge--success" : "";
      const badgeLabel = status.charAt(0).toUpperCase() + status.slice(1);
      return `
        <li class="rux-fleet-panel__trip-item">
          <span class="rux-fleet-panel__trip-id">${t.tripRef}</span>
          <span class="rux-fleet-panel__trip-meta">${meta}</span>
          <span class="rux-badge rux-badge--dot ${badgeCls}">${badgeLabel}</span>
        </li>
      `;
    }).join("");
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="7" class="fleet-app__empty">No vehicles — add one to get started.</td></tr>`;
      return;
    }

    list.forEach((b) => {
      const sm    = statusMeta(b.status);
      const label = [b.make, b.model, b.year].filter(Boolean).join(" ");

      const tr = document.createElement("tr");
      tr.className      = "fleet-app__row";
      tr.tabIndex       = 0;
      tr.dataset.id     = b.id;
      tr.dataset.status = b.status || "active";

      tr.innerHTML = `
        <td class="col-order fleet-app__order">${b.sort_order ?? "—"}</td>
        <td>
          <div class="fleet-app__vehicle-cell">
            <div class="fleet-app__avatar" aria-hidden="true">
              <i data-lucide="bus-front" class="rux-icon"></i>
            </div>
            <div class="fleet-app__vehicle-info">
              <span class="fleet-app__vehicle-name">Unit ${b.number || "—"}</span>
              ${b.bus_ref ? `<span class="fleet-app__vehicle-ref">${b.bus_ref}</span>` : ""}
            </div>
          </div>
        </td>
        <td>${b.type ? `<span class="rux-tag">${b.type}</span>` : `<span class="rux-subtle">—</span>`}</td>
        <td><span class="rux-badge rux-badge--dot ${sm.cls}">${sm.label}</span></td>
        <td>${b.capacity ?? "—"}</td>
        <td class="${serviceExpiryClass(b.next_service)} col-service">${fmtDate(b.next_service)}</td>
        <td><span class="rux-subtle">—</span></td>
      `;

      tr.addEventListener("click", () => selectRow(tr, b));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons({ nodes: [...tbody.querySelectorAll(".fleet-app__avatar")] });
  }

  function selectRow(tr, b) {
    tbody.querySelectorAll(".fleet-app__row").forEach(r => r.classList.remove("is-selected"));
    tr.classList.add("is-selected");
    selectedId = b.id;
    populatePanel(b);
    loadBusTrips(b.id);
    openDrawer();
  }

  // ── Panel population ──────────────────────────────────────────────────────

  function syncSegmented(group, value) {
    group?.querySelectorAll(".rux-button").forEach((btn) => {
      const on = btn.dataset.value === value;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
  }

  function populatePanel(b) {
    document.getElementById("fp-title").textContent      = b.number ? `Unit ${b.number}` : "Vehicle";
    document.getElementById("fp-fleet-id").textContent   = b.bus_ref || "";
    document.getElementById("fp-sort-order").value        = b.sort_order      ?? "";
    document.getElementById("fp-number").value           = b.number          || "";
    document.getElementById("fp-make").value             = b.make            || "";
    document.getElementById("fp-model").value            = b.model           || "";
    document.getElementById("fp-year").value             = b.year            ?? "";
    document.getElementById("fp-vin").value              = b.vin             || "";
    document.getElementById("fp-color").value            = b.color           || "";
    document.getElementById("fp-capacity").value         = b.capacity        ?? "";
    document.getElementById("fp-mileage").value          = b.mileage         ?? "";
    document.getElementById("fp-last-service").value     = b.last_service    || "";
    document.getElementById("fp-next-service").value     = b.next_service    || "";
    document.getElementById("fp-insurance-exp").value    = b.insurance_exp   || "";
    document.getElementById("fp-registration-exp").value = b.registration_exp || "";
    document.getElementById("fp-inspection-exp").value   = b.inspection_exp  || "";
    document.getElementById("fp-notes").value            = b.notes           || "";

    syncSegmented(document.getElementById("fp-type-group"), b.type || "Charter");
    syncSegmented(document.getElementById("fp-status-group"), b.status || "active");

    // Equipment toggles
    const adaBtn     = document.getElementById("fp-ada-lift");
    const sleeperBtn = document.getElementById("fp-sleeper");
    if (adaBtn) {
      const on = !!b.ada_lift;
      adaBtn.setAttribute("aria-pressed", on ? "true" : "false");
      adaBtn.classList.toggle("is-active", on);
    }
    if (sleeperBtn) {
      const on = !!b.sleeper;
      sleeperBtn.setAttribute("aria-pressed", on ? "true" : "false");
      sleeperBtn.classList.toggle("is-active", on);
    }

    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
  }

  // ── Form read ─────────────────────────────────────────────────────────────

  function readForm() {
    const typeBtn   = document.querySelector("#fp-type-group .rux-button[aria-pressed='true']");
    const statusBtn = document.querySelector("#fp-status-group .rux-button[aria-pressed='true']");
    const adaBtn    = document.getElementById("fp-ada-lift");

    return {
      sort_order:       parseInt(document.getElementById("fp-sort-order").value, 10) || null,
      number:           document.getElementById("fp-number").value.trim()           || null,
      make:             document.getElementById("fp-make").value.trim()             || null,
      model:            document.getElementById("fp-model").value.trim()            || null,
      year:             parseInt(document.getElementById("fp-year").value, 10)      || null,
      vin:              document.getElementById("fp-vin").value.trim()              || null,
      color:            document.getElementById("fp-color").value.trim()            || null,
      capacity:         parseInt(document.getElementById("fp-capacity").value, 10)  || null,
      type:             typeBtn?.dataset.value                                      || "Motorcoach",
      ada_lift:         adaBtn?.getAttribute("aria-pressed") === "true",
      sleeper:          document.getElementById("fp-sleeper")?.getAttribute("aria-pressed") === "true",
      status:           statusBtn?.dataset.value                                    || "active",
      mileage:          parseInt(document.getElementById("fp-mileage").value, 10)   || null,
      last_service:     document.getElementById("fp-last-service").value            || null,
      next_service:     document.getElementById("fp-next-service").value            || null,
      insurance_exp:    document.getElementById("fp-insurance-exp").value           || null,
      registration_exp: document.getElementById("fp-registration-exp").value        || null,
      inspection_exp:   document.getElementById("fp-inspection-exp").value          || null,
      notes:            document.getElementById("fp-notes").value.trim()            || null,
    };
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  document.getElementById("fp-btn-save").addEventListener("click", async () => {
    if (!db) return;
    const payload = readForm();
    if (!payload.number) {
      document.getElementById("fp-number").focus();
      return;
    }
    const btn = document.getElementById("fp-btn-save");
    btn.disabled = true;
    try {
      await db.saveBus(selectedId ? { id: selectedId, ...payload } : payload);
      await loadBuses();
      closeDrawer();
    } catch (err) {
      console.error("Could not save vehicle:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  document.getElementById("fp-btn-delete").addEventListener("click", async () => {
    if (!db || !selectedId) return;
    if (!confirm("Delete this vehicle? This cannot be undone.")) return;
    const btn = document.getElementById("fp-btn-delete");
    btn.disabled = true;
    try {
      await db.deleteBus(selectedId);
      selectedId = null;
      await loadBuses();
      closeDrawer();
    } catch (err) {
      console.error("Could not delete vehicle:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearPanel() {
    tbody.querySelectorAll(".fleet-app__row").forEach(r => r.classList.remove("is-selected"));
    selectedId = null;

    document.getElementById("fp-title").textContent    = "New vehicle";
    document.getElementById("fp-fleet-id").textContent = "";

    panelEl.querySelectorAll(".rux-fleet-panel__pane input, .rux-fleet-panel__pane textarea")
      .forEach(f => { f.value = ""; });

    // Reset type to Charter, status to active
    panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
      group.querySelectorAll(".rux-button").forEach((btn, i) => {
        const on = i === 0;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-active", on);
      });
    });

    // Reset equipment toggles
    ["fp-ada-lift", "fp-sleeper"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.setAttribute("aria-pressed", "false"); btn.classList.remove("is-active"); }
    });

    tripList.innerHTML = "";
    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
  }

  document.getElementById("fp-btn-clear").addEventListener("click", clearPanel);

  document.getElementById("fp-btn-add").addEventListener("click", () => {
    clearPanel();
    openDrawer();
  });

  // ── Search & filter ───────────────────────────────────────────────────────

  function applyFilter() {
    const q = searchInput.value.toLowerCase();
    const activeFilter =
      document.querySelector("[data-fleet-filter] .rux-button[aria-pressed='true']")
        ?.dataset.filter || "all";

    tbody.querySelectorAll(".fleet-app__row").forEach((row) => {
      const name   = row.querySelector(".fleet-app__vehicle-name")?.textContent.toLowerCase() || "";
      const ref    = row.querySelector(".fleet-app__vehicle-ref")?.textContent.toLowerCase()  || "";
      const matchQ = !q || name.includes(q) || ref.includes(q);
      const matchF = activeFilter === "all" || row.dataset.status === activeFilter;
      row.hidden = !(matchQ && matchF);
    });
  }

  searchInput.addEventListener("input", applyFilter);

  document.querySelectorAll("[data-fleet-filter] .rux-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-fleet-filter] .rux-button").forEach((b) => {
        const on = b === btn;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("is-active", on);
      });
      applyFilter();
    });
  });

  // ── Resize handle ─────────────────────────────────────────────────────────

  const handle = drawer.querySelector(".scheduler-app__drawer-handle");
  let resizing = false, startX = 0, startW = 0;

  handle.addEventListener("pointerdown", (e) => {
    resizing = true; startX = e.clientX; startW = drawer.offsetWidth;
    drawer.classList.add("is-resizing");
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    drawer.style.setProperty("--drawer-width",
      `${Math.max(280, Math.min(600, startW + e.clientX - startX))}px`);
  });
  document.addEventListener("pointerup", () => {
    if (!resizing) return;
    resizing = false;
    drawer.classList.remove("is-resizing");
    document.body.style.cursor = "";
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadBusTrips(busId) {
    tripList.innerHTML =
      `<li class="rux-fleet-panel__trip-item"><span class="rux-subtle">Loading…</span></li>`;
    try {
      const trips = await db.fetchBusTrips(busId);
      renderTripList(trips);
    } catch (err) {
      console.warn("Could not load bus trips:", err);
      tripList.innerHTML =
        `<li class="rux-fleet-panel__trip-item"><span class="rux-subtle">Could not load trips.</span></li>`;
    }
  }

  async function loadBuses() {
    try {
      allBuses = await db.fetchBuses();
      renderRows(allBuses);
      applyFilter();
    } catch (err) {
      console.error("fetchBuses failed:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="fleet-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function init() {
    if (!db) {
      try {
        db = await import("./fleet-db.js");
      } catch (err) {
        console.warn("Could not load fleet-db:", err);
        return;
      }
    }
    await loadBuses();
  }

  window.FleetPanel = { init, reload: loadBuses };

  // Auto-init: same defer-timing fix as driver-panel.js
  init().catch(err => {
    console.error("FleetPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="fleet-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });

  if (document.readyState !== "loading" && window.lucide) lucide.createIcons();
})();
