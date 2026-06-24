(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const drawer      = document.getElementById("driver-panel-drawer");
  const panelEl     = drawer.querySelector(".rux-driver-panel");
  const tbody       = document.getElementById("driver-roster-body");
  const tabBtns     = document.querySelectorAll("[data-driver-tabs] .rux-button");
  const panes       = document.querySelectorAll(".rux-driver-panel__pane");
  const searchInput  = document.getElementById("driver-search");
  const cdlGroup     = document.getElementById("dp-cdl-group");
  const tripList     = document.getElementById("dp-trip-list");
  const saveOrderBtn = document.getElementById("driver-save-order-btn");

  let db         = null;
  let settingsDb = null;
  let selectedId = null;
  let allDrivers = [];
  let colConfig  = [];

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

  function localIsoDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    const today = localIsoDate();
    if (iso < today) return "driver-app__expiry driver-app__expiry--expired";
    const warn = new Date();
    warn.setMonth(warn.getMonth() + 3);
    if (iso <= localIsoDate(warn))
      return "driver-app__expiry driver-app__expiry--warn";
    return "driver-app__expiry";
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const ALL_DRIVER_COLS = [
    { key: "order",            label: "#",                 defaultOn: true,
      head: `<th scope="col" data-col="order" class="col-order" data-sort="order">#</th>`,
      cell: d => `<td data-col="order" class="col-order driver-app__order">${d.sort_order ?? "—"}</td>` },
    { key: "status",           label: "Status",            defaultOn: true,
      head: `<th scope="col" data-col="status" data-col-filter="status" data-sort="status">Status <span class="rux-icon rux-icon--xs rux-col-filter-icon" aria-hidden="true">filter_list</span></th>`,
      cell: d => { const s = statusMeta(d.status); return `<td data-col="status"><span class="rux-badge rux-badge--dot ${s.cls}">${s.label}</span></td>`; } },
    { key: "phone",            label: "Phone",             defaultOn: true,
      head: `<th scope="col" data-col="phone">Phone</th>`,
      cell: d => `<td class="driver-app__phone col-phone rux-mono" data-col="phone">${d.phone || "—"}</td>` },
    { key: "cdl",              label: "CDL",               defaultOn: true,
      head: `<th scope="col" data-col="cdl" data-sort="cdl">CDL</th>`,
      cell: d => `<td data-col="cdl">${d.cdl_class ? `<span class="rux-tag">CDL-${d.cdl_class}</span>` : `<span class="rux-subtle">—</span>`}</td>` },
    { key: "expiry",           label: "Lic. expiry",       defaultOn: true,
      head: `<th scope="col" data-col="expiry" data-sort="expiry">Lic. expiry</th>`,
      cell: d => { const e = d.license_exp || ""; return `<td class="${licExpiryClass(e)} col-expiry" data-col="expiry">${fmtDate(e)}</td>`; } },
    { key: "short-name",       label: "Short name",        defaultOn: false,
      head: `<th scope="col" data-col="short-name">Short name</th>`,
      cell: d => `<td data-col="short-name" class="rux-mono">${d.short_name || "—"}</td>` },
    { key: "email",            label: "Email",             defaultOn: false,
      head: `<th scope="col" data-col="email">Email</th>`,
      cell: d => `<td data-col="email">${d.email || "—"}</td>` },
    { key: "city",             label: "City",              defaultOn: false,
      head: `<th scope="col" data-col="city">City</th>`,
      cell: d => `<td data-col="city">${d.city || "—"}</td>` },
    { key: "hire-date",        label: "Hire date",         defaultOn: false,
      head: `<th scope="col" data-col="hire-date" data-sort="hire-date">Hire date</th>`,
      cell: d => `<td data-col="hire-date">${fmtDate(d.hire_date)}</td>` },
    { key: "med-card-exp",     label: "Med card exp",      defaultOn: false,
      head: `<th scope="col" data-col="med-card-exp" data-sort="med-card-exp">Med card exp</th>`,
      cell: d => { const e = d.med_card_expiry || ""; return `<td class="${licExpiryClass(e)}" data-col="med-card-exp">${fmtDate(e)}</td>`; } },
    { key: "endorsements",     label: "Endorsements",      defaultOn: false,
      head: `<th scope="col" data-col="endorsements">Endorsements</th>`,
      cell: d => `<td data-col="endorsements">${d.endorsements || "—"}</td>` },
    { key: "employment-type",  label: "Employment",        defaultOn: false,
      head: `<th scope="col" data-col="employment-type" data-col-filter="employment-type" data-sort="employment-type">Employment <span class="rux-icon rux-icon--xs rux-col-filter-icon" aria-hidden="true">filter_list</span></th>`,
      cell: d => `<td data-col="employment-type">${d.employment_type || "—"}</td>` },
    { key: "license-number",   label: "License #",         defaultOn: false,
      head: `<th scope="col" data-col="license-number">License #</th>`,
      cell: d => `<td data-col="license-number" class="rux-mono">${d.license_number || "—"}</td>` },
    { key: "license-state",    label: "License state",     defaultOn: false,
      head: `<th scope="col" data-col="license-state">License state</th>`,
      cell: d => `<td data-col="license-state">${d.license_state || "—"}</td>` },
    { key: "emergency-contact", label: "Emergency contact", defaultOn: false,
      head: `<th scope="col" data-col="emergency-contact">Emergency contact</th>`,
      cell: d => `<td data-col="emergency-contact">${d.emergency_contact_name || "—"}</td>` },
    { key: "notes",            label: "Notes",             defaultOn: false,
      head: `<th scope="col" data-col="notes">Notes</th>`,
      cell: d => `<td data-col="notes">${d.notes ? `<span class="fleet-app__truncate rux-subtle" title="${d.notes.replace(/"/g, '&quot;')}">${d.notes}</span>` : '<span class="rux-subtle">—</span>'}</td>` },
    { key: "next-trip",        label: "Next trip",         defaultOn: true,
      head: `<th scope="col" data-col="next-trip">Next trip</th>`,
      cell: d => `<td data-col="next-trip"><span class="rux-subtle">—</span></td>` },
  ];

  function getActiveCols() {
    return colConfig
      .filter(c => c.visible)
      .map(c => ALL_DRIVER_COLS.find(d => d.key === c.key))
      .filter(Boolean);
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    const activeCols = getActiveCols();
    const table = tbody.closest("table");

    // Rebuild thead
    const theadRow = table.querySelector("thead tr");
    theadRow.innerHTML =
      `<th scope="col" data-sort="driver">Driver</th>` +
      activeCols.map(c => c.head).join("");
    
    updateFilterHeaders(table);
    updateSortHeaders(table);

    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="${1 + activeCols.length}" class="driver-app__empty">No drivers — add one to get started.</td></tr>`;
      return;
    }

    let dragSrcIdx = null;
    let didDragRow = false;

    list.forEach((d, idx) => {
      const ini = initials(d.name);

      const tr = document.createElement("tr");
      tr.className              = "driver-app__row";
      tr.tabIndex               = 0;
      tr.dataset.id             = d.id;
      tr.dataset.idx            = idx;
      tr.dataset.status         = d.status || "active";
      tr.dataset.employmentType = d.employment_type || "";
      tr.draggable              = sortKey === "order";

      tr.addEventListener("dragstart", e => {
        if (sortKey !== "order") {
          e.preventDefault();
          return;
        }
        dragSrcIdx = idx;
        didDragRow = true;
        tr.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      tr.addEventListener("dragend", () => {
        tr.classList.remove("is-dragging");
        tbody.querySelectorAll(".is-drag-target").forEach(el => el.classList.remove("is-drag-target"));
        setTimeout(() => { didDragRow = false; }, 0);
      });
      tr.addEventListener("dragover", e => {
        if (dragSrcIdx !== null && dragSrcIdx !== idx) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          tbody.querySelectorAll(".is-drag-target").forEach(el => el.classList.remove("is-drag-target"));
          tr.classList.add("is-drag-target");
        }
      });
      tr.addEventListener("drop", async e => {
        e.preventDefault();
        if (dragSrcIdx === null || dragSrcIdx === idx) return;
        const toIdx = idx;
        const orderedDrivers = getSortedDrivers();
        const [moved] = orderedDrivers.splice(dragSrcIdx, 1);
        orderedDrivers.splice(toIdx, 0, moved);
        allDrivers = orderedDrivers;
        dragSrcIdx = null;
        await saveDriverOrder();
      });

      tr.innerHTML = `
        <td>
          <div class="driver-app__driver-cell">
            <div class="driver-app__avatar${d.status === "inactive" ? " driver-app__avatar--inactive" : ""}"
                 aria-hidden="true">${ini}</div>
            <div class="driver-app__driver-info">
              <span class="driver-app__driver-name">${d.name}</span>
            </div>
          </div>
        </td>
      ` + activeCols.map(c => c.cell(d)).join("");

      tr.addEventListener("click", e => {
        if (didDragRow) {
          e.preventDefault();
          return;
        }
        selectRow(tr, d);
      });
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRow(tr, d); }
      });

      tbody.appendChild(tr);
    });
  }

  async function saveDriverOrder() {
    const updates = allDrivers.map((d, i) => ({ id: d.id, sort_order: i + 1 }));
    allDrivers.forEach((d, i) => { d.sort_order = i + 1; });
    renderRows(getSortedDrivers());
    applyFilter();
    try { await db.reorderDrivers(updates); } catch (err) { console.error("reorderDrivers failed:", err); }
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
    document.getElementById("dp-sort-order").value      = d.sort_order ?? "";
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
    document.getElementById("dp-ec-name").value          = d.emergency_contact_name  || "";
    document.getElementById("dp-ec-phone").value         = d.emergency_contact_phone || "";

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

    // Employment type
    const empTypeLabels = { "full-time": "Full-time", "part-time": "Part-time", "contract": "Contract", "seasonal": "Seasonal" };
    const empTarget = empTypeLabels[d.employment_type || "full-time"] || "Full-time";
    panelEl.querySelectorAll("[data-emp-type-group] .rux-button").forEach((btn) => {
      const on = btn.textContent.trim() === empTarget;
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

    const empTypeBtn = panelEl.querySelector("[data-emp-type-group] .rux-button[aria-pressed='true']");
    const empTypeMap = { "Full-time": "full-time", "Part-time": "part-time", "Contract": "contract", "Seasonal": "seasonal" };
    const empType = empTypeMap[empTypeBtn?.textContent.trim()] || "full-time";

    const endorsements = [...panelEl.querySelectorAll(
      ".rux-driver-panel__endorsements .rux-button[aria-pressed='true']"
    )].map(btn => btn.textContent.trim());

    const sortOrderRaw = document.getElementById("dp-sort-order").value;

    return {
      sort_order:      sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null,
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
      endorsements:              endorsements.length ? endorsements : null,
      status:                    statusRevMap[statusText] || "active",
      employment_type:           empType,
      emergency_contact_name:    document.getElementById("dp-ec-name").value.trim()  || null,
      emergency_contact_phone:   document.getElementById("dp-ec-phone").value.trim() || null,
      notes:                     document.getElementById("dp-notes").value.trim()     || null,
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
    avatar.innerHTML   = '<span class="rux-icon">person</span>';
    

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

  // ── Column picker v2 — Supabase-persisted, drag-to-reorder ───────────────

  const DRIVER_COLS_KEY = "driver-cols-v2";
  const driverColsBtn   = document.getElementById("driver-cols-btn");
  let   driverColPicker = null;
  let   dragKey         = null;

  function defaultConfig() {
    return ALL_DRIVER_COLS.map(c => ({ key: c.key, visible: c.defaultOn }));
  }

  function mergeConfig(saved) {
    if (!Array.isArray(saved) || !saved.length) return defaultConfig();
    const merged = saved
      .filter(s => ALL_DRIVER_COLS.some(c => c.key === s.key))
      .map(s => ({ key: s.key, visible: !!s.visible }));
    ALL_DRIVER_COLS.forEach(c => {
      if (!merged.some(m => m.key === c.key)) merged.push({ key: c.key, visible: c.defaultOn });
    });
    return merged;
  }

  async function loadColConfig() {
    if (!settingsDb) {
      try { settingsDb = await import("../data/settings-db.js"); } catch { /* offline */ }
    }
    const saved = settingsDb ? await settingsDb.getSetting(DRIVER_COLS_KEY) : null;
    colConfig = mergeConfig(saved);
  }

  async function saveColConfig() {
    if (!settingsDb) return;
    try { await settingsDb.setSetting(DRIVER_COLS_KEY, colConfig); } catch (err) { console.warn("saveColConfig:", err); }
  }

  function buildDriverColPicker() {
    driverColPicker = document.createElement("div");
    driverColPicker.className = "rux-col-picker";
    driverColPicker.setAttribute("hidden", "");
    driverColPicker.setAttribute("role", "dialog");
    driverColPicker.setAttribute("aria-label", "Column visibility");

    const heading = document.createElement("p");
    heading.className = "rux-col-picker__heading";
    heading.textContent = "Columns";
    driverColPicker.appendChild(heading);

    const list = document.createElement("div");
    list.className = "rux-col-picker__list";
    driverColPicker.appendChild(list);

    function renderPickerRows() {
      list.innerHTML = "";
      colConfig.forEach(c => {
        const def = ALL_DRIVER_COLS.find(d => d.key === c.key);
        if (!def) return;

        const row = document.createElement("div");
        row.className = "rux-col-picker__row";
        row.draggable = true;
        row.dataset.key = c.key;

        const handle = document.createElement("span");
        handle.className = "rux-col-picker__handle";
        handle.innerHTML = `<span class="rux-icon rux-icon--sm">drag_indicator</span>`;

        const cb = document.createElement("input");
        cb.type    = "checkbox";
        cb.checked = c.visible;
        cb.id      = `dcol-${c.key}`;
        cb.addEventListener("change", async () => {
          c.visible = cb.checked;
          renderRows(getSortedDrivers());
          await saveColConfig();
        });

        const lbl = document.createElement("label");
        lbl.htmlFor   = cb.id;
        lbl.className = "rux-col-picker__label";
        lbl.textContent = def.label;

        row.append(handle, cb, lbl);

        row.addEventListener("dragstart", e => {
          dragKey = c.key;
          row.classList.add("is-dragging");
          e.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragend", () => {
          dragKey = null;
          row.classList.remove("is-dragging");
          list.querySelectorAll(".is-over").forEach(el => el.classList.remove("is-over"));
        });
        row.addEventListener("dragover", e => {
          if (dragKey && dragKey !== c.key) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            list.querySelectorAll(".is-over").forEach(el => el.classList.remove("is-over"));
            row.classList.add("is-over");
          }
        });
        row.addEventListener("drop", async e => {
          e.preventDefault();
          if (!dragKey || dragKey === c.key) return;
          const fromIdx = colConfig.findIndex(x => x.key === dragKey);
          const toIdx   = colConfig.findIndex(x => x.key === c.key);
          const [item]  = colConfig.splice(fromIdx, 1);
          colConfig.splice(toIdx, 0, item);
          renderPickerRows();
          
          renderRows(getSortedDrivers());
          await saveColConfig();
        });

        list.appendChild(row);
      });
      
    }

    renderPickerRows();
    document.body.appendChild(driverColPicker);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !driverColPicker.hidden) driverColPicker.setAttribute("hidden", "");
    });
    document.addEventListener("mousedown", e => {
      if (!driverColPicker.hidden && !driverColPicker.contains(e.target) && e.target !== driverColsBtn)
        driverColPicker.setAttribute("hidden", "");
    });
  }

  driverColsBtn.addEventListener("click", () => {
    if (!driverColPicker) buildDriverColPicker();
    if (!driverColPicker.hidden) { driverColPicker.setAttribute("hidden", ""); return; }
    driverColPicker.style.visibility = "hidden";
    driverColPicker.removeAttribute("hidden");
    const ar = driverColsBtn.getBoundingClientRect();
    const pr = driverColPicker.getBoundingClientRect();
    const m  = 8;
    driverColPicker.style.left = `${Math.max(m, Math.min(ar.right - pr.width, window.innerWidth - pr.width - m))}px`;
    driverColPicker.style.top  = `${ar.bottom + 6}px`;
    driverColPicker.style.visibility = "";
  });

  // ── Search & filter ───────────────────────────────────────────────────────

  let statusFilter     = "all";
  let employmentFilter = "all";

  const DRIVER_COL_FILTERS = {
    status: {
      get: ()  => statusFilter,
      set: (v) => { statusFilter = v; },
      options: [
        { value: "all",      label: "All"      },
        { value: "active",   label: "Active"   },
        { value: "on-leave", label: "On leave" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    "employment-type": {
      get: ()  => employmentFilter,
      set: (v) => { employmentFilter = v; },
      options: [
        { value: "all",       label: "All"       },
        { value: "full-time", label: "Full-time" },
        { value: "part-time", label: "Part-time" },
        { value: "contract",  label: "Contract"  },
        { value: "seasonal",  label: "Seasonal"  },
      ],
    },
  };

  function applyFilter() {
    const q = searchInput.value.toLowerCase();
    tbody.querySelectorAll(".driver-app__row").forEach((row) => {
      const name   = row.querySelector(".driver-app__driver-name")?.textContent.toLowerCase() || "";
      const matchQ = !q || name.includes(q);
      const matchF = statusFilter === "all" || row.dataset.status === statusFilter;
      const matchE = employmentFilter === "all" || row.dataset.employmentType === employmentFilter;
      row.hidden = !(matchQ && matchF && matchE);
    });
    updateSaveOrderState();
  }

  function updateFilterHeaders(table) {
    table.querySelectorAll("th[data-col-filter]").forEach(th => {
      const def = DRIVER_COL_FILTERS[th.dataset.colFilter];
      if (def) th.classList.toggle("is-filtered", def.get() !== "all");
    });
  }

  let driverColFilterPopover = null;
  let activeFilterTh         = null;

  function openDriverColFilter(th, filterKey) {
    const def = DRIVER_COL_FILTERS[filterKey];
    if (!def) return;

    if (!driverColFilterPopover) {
      driverColFilterPopover = document.createElement("div");
      driverColFilterPopover.className = "rux-col-filter-popover";
      driverColFilterPopover.setAttribute("hidden", "");
      document.body.appendChild(driverColFilterPopover);
      document.addEventListener("keydown", e => {
        if (e.key === "Escape") { driverColFilterPopover.setAttribute("hidden", ""); activeFilterTh = null; }
      });
      document.addEventListener("mousedown", e => {
        if (!driverColFilterPopover.hidden && !driverColFilterPopover.contains(e.target) && e.target !== activeFilterTh)
          { driverColFilterPopover.setAttribute("hidden", ""); activeFilterTh = null; }
      });
    }

    if (activeFilterTh === th && !driverColFilterPopover.hidden) {
      driverColFilterPopover.setAttribute("hidden", ""); activeFilterTh = null; return;
    }
    activeFilterTh = th;

    driverColFilterPopover.innerHTML = "";
    def.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "rux-col-filter-popover__option" + (def.get() === opt.value ? " is-active" : "");
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        def.set(opt.value);
        updateFilterHeaders(tbody.closest("table"));
        applyFilter();
        driverColFilterPopover.setAttribute("hidden", ""); activeFilterTh = null;
      });
      driverColFilterPopover.appendChild(btn);
    });

    driverColFilterPopover.style.visibility = "hidden";
    driverColFilterPopover.removeAttribute("hidden");
    const ar = th.getBoundingClientRect();
    const pr = driverColFilterPopover.getBoundingClientRect();
    const m  = 8;
    driverColFilterPopover.style.left = `${Math.max(m, Math.min(ar.left, window.innerWidth - pr.width - m))}px`;
    driverColFilterPopover.style.top  = `${ar.bottom + 4}px`;
    driverColFilterPopover.style.visibility = "";
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  let sortKey = "order";
  let sortDir = "asc";

  const SORT_DEFS = {
    driver:            (a, b) => (a.name || "").localeCompare(b.name || ""),
    order:             (a, b) => {
      if (a.sort_order == null && b.sort_order == null) return (a.name || "").localeCompare(b.name || "");
      if (a.sort_order == null) return 1;
      if (b.sort_order == null) return -1;
      return a.sort_order - b.sort_order;
    },
    status:            (a, b) => {
      const o = { active: 0, "on-leave": 1, inactive: 2 };
      return ((o[a.status] ?? 9) - (o[b.status] ?? 9)) || (a.name || "").localeCompare(b.name || "");
    },
    "employment-type": (a, b) => {
      const o = { "full-time": 0, "part-time": 1, contract: 2, seasonal: 3 };
      return ((o[a.employment_type] ?? 9) - (o[b.employment_type] ?? 9)) || (a.name || "").localeCompare(b.name || "");
    },
    cdl:             (a, b) => (a.cdl_class || "").localeCompare(b.cdl_class || "") || (a.name || "").localeCompare(b.name || ""),
    expiry:          (a, b) => (a.license_exp || "9999").localeCompare(b.license_exp || "9999") || (a.name || "").localeCompare(b.name || ""),
    "hire-date":     (a, b) => (a.hire_date || "").localeCompare(b.hire_date || "") || (a.name || "").localeCompare(b.name || ""),
    "med-card-exp":  (a, b) => (a.med_card_expiry || "9999").localeCompare(b.med_card_expiry || "9999") || (a.name || "").localeCompare(b.name || ""),
  };

  function getSortedDrivers() {
    const fn = SORT_DEFS[sortKey] || SORT_DEFS.order;
    const list = [...allDrivers].sort(fn);
    return sortDir === "desc" ? list.reverse() : list;
  }

  function updateSortHeaders(table) {
    table.querySelectorAll("th[data-sort]").forEach(th => {
      const key = th.dataset.sort;
      th.classList.toggle("is-sort-asc",  key === sortKey && sortDir === "asc");
      th.classList.toggle("is-sort-desc", key === sortKey && sortDir === "desc");
    });
    table.classList.toggle("is-manual-order", sortKey === "order");
    updateSaveOrderState();
  }

  function hasActiveDriverFilter() {
    return !!searchInput.value.trim() ||
      Object.values(DRIVER_COL_FILTERS).some(def => def.get() !== "all");
  }

  function updateSaveOrderState() {
    if (!saveOrderBtn) return;
    const isManualOrder = sortKey === "order";
    const blockedByFilter = hasActiveDriverFilter();
    saveOrderBtn.hidden = isManualOrder;
    saveOrderBtn.disabled = !isManualOrder && blockedByFilter;
    saveOrderBtn.title = blockedByFilter
      ? "Clear search and filters before setting manual order"
      : "Set current sort as manual order";
  }

  async function lockCurrentOrder() {
    if (sortKey === "order" || hasActiveDriverFilter()) return;
    allDrivers = getSortedDrivers();
    sortKey = "order";
    sortDir = "asc";
    await saveDriverOrder();
  }

  saveOrderBtn?.addEventListener("click", lockCurrentOrder);

  tbody.closest("table").addEventListener("click", e => {
    // Filter icon → open filter (takes priority)
    const filterIcon = e.target.closest(".rux-col-filter-icon");
    if (filterIcon) {
      const th = filterIcon.closest("th[data-col-filter]");
      if (th) { openDriverColFilter(th, th.dataset.colFilter); return; }
    }

    // Sort header
    const sortTh = e.target.closest("th[data-sort]");
    if (sortTh) {
      const key = sortTh.dataset.sort;
      if (key === sortKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      renderRows(getSortedDrivers());
      applyFilter();
      return;
    }

    // Filter header (no sort on this th)
    const filterTh = e.target.closest("th[data-col-filter]");
    if (filterTh) openDriverColFilter(filterTh, filterTh.dataset.colFilter);
  });

  searchInput.addEventListener("input", applyFilter);

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
      allDrivers = await db.fetchDrivers();
      renderRows(getSortedDrivers());
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
        db = await import("../data/driver-db.js");
      } catch (err) {
        console.warn("Could not load driver-db:", err);
        return;
      }
    }
    await loadColConfig();
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

  
})();
