(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const drawer      = document.getElementById("driver-panel-drawer");
  const panelEl     = drawer.querySelector(".rux-driver-panel");
  const tbody       = document.getElementById("driver-roster-body");
  const tabBtns     = document.querySelectorAll("[data-driver-tabs] .rux-button");
  const panes       = document.querySelectorAll(".rux-driver-panel__pane");
  const searchInput = document.getElementById("driver-search");
  const cdlGroup    = document.getElementById("dp-cdl-group");
  const tripList    = document.getElementById("dp-trip-list");

  let db         = null;
  let selectedId = null;

  // ── Drawer ────────────────────────────────────────────────────────────────

  function openDrawer()  { drawer.classList.add("is-open"); }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    tbody.querySelectorAll(".driver-app__row").forEach(r => r.classList.remove("is-selected"));
    selectedId = null;
  }

  document.getElementById("dp-btn-close").addEventListener("click", closeDrawer);
  document.getElementById("driver-menu-btn")?.addEventListener("click", () => drawer.classList.toggle("is-open"));

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

  // ── Row helpers ───────────────────────────────────────────────────────────

  function initials(name) {
    const parts = (name || "").split(" ");
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }

  function statusMeta(s) {
    if (s === "active")   return { label: "Active",   cls: "rux-badge--success" };
    if (s === "on-leave") return { label: "On Leave", cls: "rux-badge--warning" };
    return { label: "Inactive", cls: "" };
  }

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

  function renderTripList(trips) {
    if (!trips.length) {
      tripList.innerHTML =
        `<li class="rux-driver-panel__trip-item"><span class="rux-subtle">No trips assigned.</span></li>`;
      return;
    }
    tripList.innerHTML = trips.map((t) => {
      const dates = fmtTripDates(t.startDate, t.endDate);
      const meta  = [dates, t.destination].filter(Boolean).join(" · ")
                  + (t.busNumber ? ` · Bus ${t.busNumber}` : "");
      const status = t.invoiceStatus || "pending";
      const isPaid = status === "paid";
      const badgeCls = isPaid ? "rux-badge--success" : "";
      const badgeLabel = status.charAt(0).toUpperCase() + status.slice(1);
      return `
        <li class="rux-driver-panel__trip-item">
          <span class="rux-driver-panel__trip-id">${t.tripRef}</span>
          <span class="rux-driver-panel__trip-meta">${meta}</span>
          <span class="rux-badge rux-badge--dot ${badgeCls}">${badgeLabel}</span>
        </li>
      `;
    }).join("");
  }

  function licExpiryClass(iso) {
    if (!iso) return "driver-app__expiry";
    const today = new Date().toISOString().slice(0, 10);
    if (iso < today) return "driver-app__expiry driver-app__expiry--expired";
    const warn = new Date();
    warn.setMonth(warn.getMonth() + 3);
    if (iso <= warn.toISOString().slice(0, 10))
      return "driver-app__expiry driver-app__expiry--warn";
    return "driver-app__expiry";
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="6" class="driver-app__empty">No drivers — add one to get started.</td></tr>`;
      return;
    }

    list.forEach((d) => {
      const ini  = initials(d.name);
      const sm   = statusMeta(d.status);
      const licE = d.license_exp || "";

      const tr = document.createElement("tr");
      tr.className      = "driver-app__row";
      tr.tabIndex       = 0;
      tr.dataset.id     = d.id;
      tr.dataset.status = d.status || "active";

      tr.innerHTML = `
        <td>
          <div class="driver-app__driver-cell">
            <div class="driver-app__avatar${d.status === "inactive" ? " driver-app__avatar--inactive" : ""}"
                 aria-hidden="true">${ini}</div>
            <div class="driver-app__driver-info">
              <span class="driver-app__driver-name">${d.name}</span>
              ${d.driver_ref ? `<span class="driver-app__driver-ref">${d.driver_ref}</span>` : ""}
            </div>
          </div>
        </td>
        <td><span class="rux-badge rux-badge--dot ${sm.cls}">${sm.label}</span></td>
        <td class="driver-app__phone col-phone rux-mono">${d.phone || "—"}</td>
        <td>${d.cdl_class ? `<span class="rux-tag">CDL-${d.cdl_class}</span>` : `<span class="rux-subtle">—</span>`}</td>
        <td class="${licExpiryClass(licE)} col-expiry">${fmtDate(licE)}</td>
        <td><span class="rux-subtle">—</span></td>
      `;

      tr.addEventListener("click", () => selectRow(tr, d));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); }
      });

      tbody.appendChild(tr);
    });
  }

  function selectRow(tr, d) {
    tbody.querySelectorAll(".driver-app__row").forEach(r => r.classList.remove("is-selected"));
    tr.classList.add("is-selected");
    selectedId = d.id;
    populatePanel(d);
    loadDriverTrips(d.id);
    openDrawer();
  }

  // ── Panel population ──────────────────────────────────────────────────────

  function populatePanel(d) {
    const parts = (d.name || "").split(" ");
    const first = parts[0] || "";
    const last  = parts.slice(1).join(" ") || "";

    document.getElementById("dp-title").textContent     = d.name || "Driver";
    document.getElementById("dp-driver-id").textContent = d.driver_ref || "";
    document.getElementById("dp-avatar").textContent    = initials(d.name);
    document.getElementById("dp-first-name").value      = first;
    document.getElementById("dp-last-name").value       = last;
    document.getElementById("dp-short-name").value      = d.short_name || "";
    document.getElementById("dp-phone").value           = d.phone          || "";
    document.getElementById("dp-email").value           = d.email          || "";
    document.getElementById("dp-address").value         = d.address        || "";
    document.getElementById("dp-city").value            = d.city           || "";
    document.getElementById("dp-state").value           = d.address_state  || "";
    document.getElementById("dp-zip").value             = d.zip            || "";
    document.getElementById("dp-hire-date").value       = d.hire_date      || "";
    document.getElementById("dp-lic-num").value         = d.license_number || "";
    document.getElementById("dp-lic-state").value       = d.license_state  || "";
    document.getElementById("dp-lic-expiry").value      = d.license_exp    || "";
    document.getElementById("dp-med-expiry").value      = d.med_card_expiry || "";
    document.getElementById("dp-notes").value           = d.notes          || "";

    // CDL class
    const cdl = (d.cdl_class || "A").toUpperCase();
    cdlGroup?.querySelectorAll(".rux-button").forEach((btn) => {
      const on = btn.textContent.trim() === `Class ${cdl}`;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });

    // Employment status
    const statusLabels = { active: "Active", "on-leave": "On Leave", inactive: "Inactive" };
    const target = statusLabels[d.status] || "Active";
    panelEl.querySelectorAll(".rux-driver-panel__status-group .rux-button").forEach((btn) => {
      const on = btn.querySelector("span")?.textContent.trim() === target;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });

    // Endorsements
    const ends = Array.isArray(d.endorsements) ? d.endorsements : [];
    panelEl.querySelectorAll(".rux-driver-panel__endorsements .rux-button").forEach((btn) => {
      const on = ends.includes(btn.textContent.trim());
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });

    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
  }

  // ── Form read ─────────────────────────────────────────────────────────────

  function readForm() {
    const first = document.getElementById("dp-first-name").value.trim();
    const last  = document.getElementById("dp-last-name").value.trim();

    const statusBtn = panelEl.querySelector(
      ".rux-driver-panel__status-group .rux-button[aria-pressed='true']"
    );
    const statusRevMap = { Active: "active", "On Leave": "on-leave", Inactive: "inactive" };
    const statusText = statusBtn?.querySelector("span")?.textContent.trim() || "Active";

    const cdlBtn = cdlGroup?.querySelector(".rux-button[aria-pressed='true']");
    const cdlClass = cdlBtn ? cdlBtn.textContent.trim().replace("Class ", "") : "A";

    const endorsements = [...panelEl.querySelectorAll(
      ".rux-driver-panel__endorsements .rux-button[aria-pressed='true']"
    )].map(btn => btn.textContent.trim());

    return {
      name:            [first, last].filter(Boolean).join(" ") || null,
      short_name:      document.getElementById("dp-short-name").value.trim() || null,
      email:           document.getElementById("dp-email").value.trim()      || null,
      phone:           document.getElementById("dp-phone").value.trim()      || null,
      address:         document.getElementById("dp-address").value.trim()    || null,
      city:            document.getElementById("dp-city").value.trim()       || null,
      address_state:   document.getElementById("dp-state").value.trim().toUpperCase() || null,
      zip:             document.getElementById("dp-zip").value.trim()        || null,
      hire_date:       document.getElementById("dp-hire-date").value         || null,
      cdl_class:       cdlClass,
      license_number:  document.getElementById("dp-lic-num").value.trim()   || null,
      license_state:   document.getElementById("dp-lic-state").value.trim() || null,
      license_exp:     document.getElementById("dp-lic-expiry").value       || null,
      med_card_expiry: document.getElementById("dp-med-expiry").value       || null,
      endorsements:    endorsements.length ? endorsements : null,
      status:          statusRevMap[statusText] || "active",
      notes:           document.getElementById("dp-notes").value.trim()     || null,
    };
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  document.getElementById("dp-btn-save").addEventListener("click", async () => {
    if (!db) return;
    const payload = readForm();
    if (!payload.name) {
      document.getElementById("dp-first-name").focus();
      return;
    }
    const btn = document.getElementById("dp-btn-save");
    btn.disabled = true;
    try {
      await db.saveDriver(selectedId ? { id: selectedId, ...payload } : payload);
      await loadDrivers();
      closeDrawer();
    } catch (err) {
      console.error("Could not save driver:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  document.getElementById("dp-btn-delete").addEventListener("click", async () => {
    if (!db || !selectedId) return;
    if (!confirm("Delete this driver? This cannot be undone.")) return;
    const btn = document.getElementById("dp-btn-delete");
    btn.disabled = true;
    try {
      await db.deleteDriver(selectedId);
      selectedId = null;
      await loadDrivers();
      closeDrawer();
    } catch (err) {
      console.error("Could not delete driver:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearPanel() {
    tbody.querySelectorAll(".driver-app__row").forEach(r => r.classList.remove("is-selected"));
    selectedId = null;

    document.getElementById("dp-title").textContent     = "New driver";
    document.getElementById("dp-driver-id").textContent = "";
    const avatar = document.getElementById("dp-avatar");
    avatar.textContent = "";
    avatar.innerHTML   = '<i data-lucide="user" class="rux-icon"></i>';
    if (window.lucide) lucide.createIcons({ nodes: [avatar] });

    panelEl.querySelectorAll(".rux-driver-panel__pane input, .rux-driver-panel__pane textarea")
      .forEach(f => { f.value = ""; });

    panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
      group.querySelectorAll(".rux-button").forEach((btn, i) => {
        const on = i === 0;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-active", on);
      });
    });
    panelEl.querySelectorAll(".rux-driver-panel__endorsements .rux-button")
      .forEach(btn => { btn.setAttribute("aria-pressed", "false"); btn.classList.remove("is-active"); });

    tripList.innerHTML = "";
    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
  }

  document.getElementById("dp-btn-clear").addEventListener("click", clearPanel);

  // ── Add driver ────────────────────────────────────────────────────────────

  document.getElementById("dp-btn-add").addEventListener("click", () => {
    clearPanel();
    openDrawer();
  });

  // ── Search & filter ───────────────────────────────────────────────────────

  function applyFilter() {
    const q = searchInput.value.toLowerCase();
    const activeFilter =
      document.querySelector("[data-driver-filter] .rux-button[aria-pressed='true']")
        ?.dataset.filter || "all";

    tbody.querySelectorAll(".driver-app__row").forEach((row) => {
      const name  = row.querySelector(".driver-app__driver-name")?.textContent.toLowerCase() || "";
      const matchQ = !q || name.includes(q);
      const matchF = activeFilter === "all" || row.dataset.status === activeFilter;
      row.hidden = !(matchQ && matchF);
    });
  }

  searchInput.addEventListener("input", applyFilter);

  document.querySelectorAll("[data-driver-filter] .rux-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-driver-filter] .rux-button").forEach((b) => {
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

  async function loadDriverTrips(driverId) {
    tripList.innerHTML =
      `<li class="rux-driver-panel__trip-item"><span class="rux-subtle">Loading…</span></li>`;
    try {
      const trips = await db.fetchDriverTrips(driverId);
      renderTripList(trips);
    } catch (err) {
      console.warn("Could not load driver trips:", err);
      tripList.innerHTML =
        `<li class="rux-driver-panel__trip-item"><span class="rux-subtle">Could not load trips.</span></li>`;
    }
  }

  async function loadDrivers() {
    try {
      const list = await db.fetchDrivers();
      renderRows(list);
      applyFilter();
    } catch (err) {
      console.error("fetchDrivers failed:", err);
      tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function init() {
    if (!db) {
      try {
        db = await import("./driver-db.js");
      } catch (err) {
        console.warn("Could not load driver-db:", err);
        return;
      }
    }
    await loadDrivers();
  }

  window.DriverPanel = { init, reload: loadDrivers };

  // Auto-init: don't wait for nav event — defer timing means the nav click
  // fires before this script runs on direct load / refresh at #drivers.
  init().catch(err => {
    console.error("DriverPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });

  // ── Lucide ────────────────────────────────────────────────────────────────

  if (document.readyState !== "loading" && window.lucide) lucide.createIcons();
})();
