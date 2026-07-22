(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const drawer      = document.getElementById("driver-panel-drawer");
  const panelEl     = drawer.querySelector(".rux-driver-panel");
  const tbody       = document.getElementById("driver-roster-body");
  const tabBtns     = document.querySelectorAll("[data-driver-tabs] .rux-tab");
  const panes       = document.querySelectorAll(".rux-driver-panel__pane");
  const cdlGroup     = document.getElementById("dp-cdl-group");
  const tripList     = document.getElementById("dp-trip-list");
  const scheduleStatus = document.getElementById("dp-schedule-status");
  const scheduleSummary = document.getElementById("dp-schedule-summary");
  const scheduleManageBtn = document.getElementById("dp-schedule-manage");
  const scheduleOpenBtn = document.getElementById("dp-schedule-open");
  const scheduleCopyBtn = document.getElementById("dp-schedule-copy");
  const scheduleDeactivateBtn = document.getElementById("dp-schedule-deactivate");
  const saveOrderBtn = document.getElementById("driver-save-order-btn");
  const dpAvatarBtn       = document.getElementById("dp-avatar");
  const dpAvatarMain      = document.getElementById("dp-avatar-main");
  const dpAvatarInput     = document.getElementById("dp-avatar-input");
  const dpAvatarRemoveBtn = document.getElementById("dp-avatar-remove");

  let db         = null;
  let settingsDb = null;
  let selectedId = null;
  let selectedScheduleShare = null;
  let scheduleLoadRequest = 0;
  let allDrivers = [];
  let colConfig  = [];

  const DRIVER_SHARE_ORIGIN = "https://rux-sm.github.io/rux-ui/";

  // ── Drawer ────────────────────────────────────────────────────────────────
  // Open/close/resize behavior lives in RuxDrawer (js/core/drawer.js), shared
  // with the Fleet panel and the Trips panel's left+right drawers.

  const panelToggleBtn = document.getElementById("driver-panel-toggle-btn");

  const drawerHandle = RuxDrawer.create({
    drawer,
    panel: panelEl,
    toggleBtn: panelToggleBtn,
    handle: document.getElementById("driver-panel-resize-gutter"),
    onClose: () => {
      tbody.querySelectorAll(".driver-app__row").forEach(r => r.classList.remove("is-selected"));
      selectedId = null;
      scheduleLoadRequest += 1;
      renderScheduleShare(null);
    },
  });
  const openDrawer  = drawerHandle.open;
  const closeDrawer = drawerHandle.close;

  panelToggleBtn?.addEventListener("click", () => {
    if (drawer.classList.contains("is-open")) {
      closeDrawer();
    } else {
      clearPanel();
      openDrawer();
    }
  });

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

  function driverPhotoUrl(d) {
    return d?.photo_path && db ? db.getDriverPhotoUrl(d.photo_path) : null;
  }

  // Drives both the drawer's big avatar and (via avatarCellHtml) the table
  // row thumbnails, so a photo shows up consistently everywhere.
  function renderAvatar(d) {
    const photoUrl = driverPhotoUrl(d);
    dpAvatarMain.innerHTML = photoUrl
      ? `<img src="${photoUrl}" alt="">`
      : d?.name
        ? initials(d.name)
        : '<span class="rux-icon">person</span>';
    dpAvatarRemoveBtn.hidden = !photoUrl;
  }

  function avatarCellHtml(d) {
    const photoUrl = driverPhotoUrl(d);
    return photoUrl ? `<img src="${photoUrl}" alt="">` : initials(d.name);
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

  function driverScheduleUrl(token) {
    const url = new URL("d.html", DRIVER_SHARE_ORIGIN);
    url.searchParams.set("s", token);
    return url.href;
  }

  function isScheduleShareActive(share) {
    return Boolean(share?.token);
  }

  function setScheduleStatus(label, variant = "") {
    scheduleStatus.className = `rux-badge rux-badge--dot${variant ? ` rux-badge--${variant}` : ""}`;
    scheduleStatus.textContent = label;
  }

  function renderScheduleShare(share, state = "ready") {
    selectedScheduleShare = share || null;
    scheduleManageBtn.disabled = !selectedId || state === "loading";
    scheduleOpenBtn.disabled = true;
    scheduleCopyBtn.disabled = true;
    scheduleDeactivateBtn.disabled = true;

    if (state === "loading") {
      setScheduleStatus("Loading");
      scheduleSummary.textContent = "Checking this driver’s shared schedule…";
      return;
    }
    if (state === "error") {
      setScheduleStatus("Unavailable", "danger");
      scheduleSummary.textContent = "The shared schedule status could not be loaded.";
      return;
    }
    if (!selectedId) {
      setScheduleStatus("Inactive");
      scheduleSummary.textContent = "Select a driver to view their shared schedule.";
      return;
    }
    if (!share?.token) {
      setScheduleStatus("Inactive");
      scheduleSummary.textContent = "No active link. Manage assignments to activate this driver’s permanent URL.";
      return;
    }

    scheduleDeactivateBtn.disabled = false;
    setScheduleStatus("Active", "success");
    scheduleOpenBtn.disabled = false;
    scheduleCopyBtn.disabled = false;
    const range = share.rangeStart && share.rangeEnd
      ? `${fmtDate(share.rangeStart)} – ${fmtDate(share.rangeEnd)}`
      : "Upcoming assignments";
    scheduleSummary.textContent = `Current shared schedule · ${range}`;
  }

  async function loadDriverScheduleShare(driverId) {
    const requestId = ++scheduleLoadRequest;
    renderScheduleShare(null, "loading");
    try {
      const share = await db.fetchDriverScheduleShare(driverId);
      if (requestId !== scheduleLoadRequest || String(driverId) !== String(selectedId)) return;
      renderScheduleShare(share);
    } catch (err) {
      if (requestId !== scheduleLoadRequest) return;
      console.warn("Could not load driver schedule link:", err);
      renderScheduleShare(null, "error");
    }
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
      head: `<th scope="col" data-col="status" data-col-filter="status" data-sort="status">Status <span class="rux-icon rux-col-filter-icon" aria-hidden="true">filter_list</span></th>`,
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
      head: `<th scope="col" data-col="employment-type" data-col-filter="employment-type" data-sort="employment-type">Employment <span class="rux-icon rux-col-filter-icon" aria-hidden="true">filter_list</span></th>`,
      cell: d => `<td data-col="employment-type">${d.employment_type || "—"}</td>` },
    { key: "priority",         label: "Priority",          defaultOn: true,
      head: `<th scope="col" data-col="priority" data-sort="priority">Priority</th>`,
      cell: d => `<td data-col="priority"><span class="rux-badge"><span class="rux-priority-dot" data-priority="${d.priority || 3}" aria-hidden="true"></span>${d.priority || 3}</span></td>` },
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
                 aria-hidden="true">${avatarCellHtml(d)}</div>
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
    loadDriverScheduleShare(d.id);
    loadTimeOff(d.id);
    openDrawer();
  }

  // ── Panel population ──────────────────────────────────────────────────────

  function populatePanel(d) {
    const parts = (d.name || "").split(" ");
    const first = parts[0] || "";
    const last  = parts.slice(1).join(" ") || "";

    renderAvatar(d);
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
    document.getElementById("dp-dob").value              = d.date_of_birth  || "";
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
      const on = btn.querySelector("span:not(.rux-icon)")?.textContent.trim() === target;
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

    // Priority
    const priorityTarget = String(d.priority || 3);
    panelEl.querySelectorAll("[data-priority-group] .rux-button").forEach((btn) => {
      const on = btn.querySelector(".rux-priority-dot")?.dataset.priority === priorityTarget;
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
    const statusText = statusBtn?.querySelector("span:not(.rux-icon)")?.textContent.trim() || "Active";

    const cdlBtn = cdlGroup?.querySelector(".rux-button[aria-pressed='true']");
    const cdlClass = cdlBtn ? cdlBtn.textContent.trim().replace("Class ", "") : "A";

    const empTypeBtn = panelEl.querySelector("[data-emp-type-group] .rux-button[aria-pressed='true']");
    const empTypeMap = { "Full-time": "full-time", "Part-time": "part-time", "Contract": "contract", "Seasonal": "seasonal" };
    const empType = empTypeMap[empTypeBtn?.textContent.trim()] || "full-time";

    const priorityBtn = panelEl.querySelector("[data-priority-group] .rux-button[aria-pressed='true']");
    const priority = parseInt(priorityBtn?.querySelector(".rux-priority-dot")?.dataset.priority, 10) || 3;

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
      date_of_birth:   document.getElementById("dp-dob").value              || null,
      hire_date:       document.getElementById("dp-hire-date").value         || null,
      cdl_class:       cdlClass,
      license_number:  document.getElementById("dp-lic-num").value.trim()   || null,
      license_state:   document.getElementById("dp-lic-state").value.trim() || null,
      license_exp:     document.getElementById("dp-lic-expiry").value       || null,
      med_card_expiry: document.getElementById("dp-med-expiry").value       || null,
      endorsements:              endorsements.length ? endorsements : null,
      status:                    statusRevMap[statusText] || "active",
      employment_type:           empType,
      priority:                  priority,
      emergency_contact_name:    document.getElementById("dp-ec-name").value.trim()  || null,
      emergency_contact_phone:   document.getElementById("dp-ec-phone").value.trim() || null,
      notes:                     document.getElementById("dp-notes").value.trim()     || null,
      timeOff:                   collectTimeOff(),
    };
  }

  // ── Time off ──────────────────────────────────────────────────────────────
  // Repeating date-range rows — same add/remove/select-to-delete recipe as
  // Trip Contacts/Payments in the Trip panel (reuses their CSS classes).

  const timeoffRows = document.getElementById("dp-timeoff-rows");
  const timeoffAddBtn = document.getElementById("dp-timeoff-add-btn");
  const timeoffDeleteBtn = document.getElementById("dp-timeoff-delete-btn");

  function timeOffRowCount() {
    return timeoffRows?.querySelectorAll("[data-timeoff-row]").length || 0;
  }

  function syncTimeOffButtons() {
    if (timeoffRows) timeoffRows.style.display = "flex";
    if (timeoffDeleteBtn) timeoffDeleteBtn.disabled = timeOffRowCount() === 0;
  }

  function createTimeOffRow(index) {
    const row = document.createElement("div");
    row.className = "rux-driver-panel__timeoff-row";
    row.dataset.timeoffRow = "";
    row.innerHTML = `
      <div class="rux-driver-panel__timeoff-fields">
        <div class="rux-trip-panel__contact-fields">
          <div class="rux-field"><label class="rux-field__label" for="dp-timeoff-start-${index + 1}">Start</label><input class="rux-input" id="dp-timeoff-start-${index + 1}" type="date" data-timeoff-start /></div>
          <div class="rux-field"><label class="rux-field__label" for="dp-timeoff-end-${index + 1}">End</label><input class="rux-input" id="dp-timeoff-end-${index + 1}" type="date" data-timeoff-end /></div>
        </div>
        <div class="rux-field"><label class="rux-field__label" for="dp-timeoff-reason-${index + 1}">Reason</label>
          <select class="rux-input rux-select" id="dp-timeoff-reason-${index + 1}" data-timeoff-reason>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="suspended">Suspended</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <button type="button" class="rux-trip-panel__contact-select" data-timeoff-select aria-label="Delete time off">
        <span class="rux-icon" aria-hidden="true">delete</span>
      </button>`;
    return row;
  }

  function addTimeOffRow({ focus = true } = {}) {
    if (!timeoffRows) return;
    const row = createTimeOffRow(timeOffRowCount());
    timeoffRows.appendChild(row);
    syncTimeOffButtons();
    window.Rux?.syncSelectPlaceholders?.(row);
    if (focus) row.querySelector("[data-timeoff-start]")?.focus();
  }

  let timeOffSelecting = false;
  function setTimeOffSelecting(on) {
    timeOffSelecting = on;
    timeoffRows?.classList.toggle("is-selecting", on);
    if (timeoffDeleteBtn) {
      timeoffDeleteBtn.setAttribute("aria-pressed", String(on));
      timeoffDeleteBtn.querySelector(".rux-icon").textContent = on ? "close" : "delete";
      timeoffDeleteBtn.setAttribute("aria-label", on ? "Cancel delete" : "Delete a time off entry");
    }
  }

  function deleteTimeOffRow(row) {
    if (!timeoffRows || !row) return;
    const hasData = [...row.querySelectorAll("input")].some((el) => el.value);
    if (hasData && !confirm("Delete this time off entry?")) return;
    row.remove();
    setTimeOffSelecting(false);
    syncTimeOffButtons();
  }

  function resetTimeOffRows() {
    timeoffRows?.querySelectorAll("[data-timeoff-row]").forEach((row) => row.remove());
    setTimeOffSelecting(false);
    syncTimeOffButtons();
  }

  function collectTimeOff() {
    const rows = timeoffRows?.querySelectorAll("[data-timeoff-row]") || [];
    return [...rows].map((row, i) => ({
      position: i,
      start_date: row.querySelector("[data-timeoff-start]")?.value || null,
      end_date: row.querySelector("[data-timeoff-end]")?.value || null,
      reason: row.querySelector("[data-timeoff-reason]")?.value || null,
    })).filter((e) => e.start_date && e.end_date);
  }

  function populateTimeOff(entries) {
    resetTimeOffRows();
    const sorted = [...(entries || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    sorted.forEach((entry, i) => {
      const row = createTimeOffRow(i);
      timeoffRows.appendChild(row);
      if (entry.start_date) row.querySelector("[data-timeoff-start]").value = entry.start_date;
      if (entry.end_date) row.querySelector("[data-timeoff-end]").value = entry.end_date;
      if (entry.reason) row.querySelector("[data-timeoff-reason]").value = entry.reason;
    });
    syncTimeOffButtons();
    window.Rux?.syncDateInputs(timeoffRows);
    window.Rux?.syncSelectPlaceholders?.(timeoffRows);
  }

  async function loadTimeOff(driverId) {
    if (!db) return;
    try {
      const entries = await db.fetchTimeOff(driverId);
      populateTimeOff(entries);
    } catch (err) {
      console.warn("Could not load time off:", err);
    }
  }

  timeoffAddBtn?.addEventListener("click", () => addTimeOffRow());
  timeoffDeleteBtn?.addEventListener("click", () => setTimeOffSelecting(!timeOffSelecting));
  timeoffRows?.addEventListener("click", (e) => {
    const selectBtn = e.target.closest("[data-timeoff-select]");
    if (selectBtn && timeOffSelecting) deleteTimeOffRow(selectBtn.closest("[data-timeoff-row]"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && timeOffSelecting) setTimeOffSelecting(false);
  });

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
    scheduleLoadRequest += 1;
    renderScheduleShare(null);

    renderAvatar(null);

    panelEl.querySelectorAll(".rux-driver-panel__pane input, .rux-driver-panel__pane textarea")
      .forEach(f => { f.value = ""; });

    panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
      group.querySelectorAll(".rux-button").forEach((btn, i) => {
        const on = i === 0;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-active", on);
      });
    });
    // Priority defaults to the middle tier (3), not the first button (1) —
    // matches the drivers.priority column default and populatePanel()'s
    // fallback, so a never-saved new driver reads the same as a saved one.
    panelEl.querySelectorAll("[data-priority-group] .rux-button").forEach((btn) => {
      const on = btn.querySelector(".rux-priority-dot")?.dataset.priority === "3";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
    panelEl.querySelectorAll(".rux-driver-panel__endorsements .rux-button")
      .forEach(btn => { btn.setAttribute("aria-pressed", "false"); btn.classList.remove("is-active"); });

    tripList.innerHTML = "";
    resetTimeOffRows();
    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
  }

  document.getElementById("dp-btn-clear").addEventListener("click", clearPanel);

  scheduleManageBtn?.addEventListener("click", () => {
    if (!selectedId) return;
    const driver = allDrivers.find((item) => String(item.id) === String(selectedId));
    window.dispatchEvent(new CustomEvent("rux:manage-driver-schedule", {
      detail: { driverId: selectedId, driver },
    }));
  });

  scheduleOpenBtn?.addEventListener("click", () => {
    if (!isScheduleShareActive(selectedScheduleShare)) return;
    window.open(driverScheduleUrl(selectedScheduleShare.token), "_blank", "noopener");
  });

  scheduleCopyBtn?.addEventListener("click", async () => {
    if (!isScheduleShareActive(selectedScheduleShare)) return;
    const url = driverScheduleUrl(selectedScheduleShare.token);
    let copied = false;
    try {
      copied = Boolean(await window.Rux?.copy?.(url));
      if (!copied && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch (_) {
      copied = false;
    }
    window.Rux?.toast?.(copied ? "Driver link copied" : "Could not copy the driver link");
  });

  scheduleDeactivateBtn?.addEventListener("click", async () => {
    if (!selectedScheduleShare?.token) return;
    if (!confirm("Deactivate this driver schedule link? Reactivating it later will use the same URL.")) return;
    scheduleDeactivateBtn.disabled = true;
    try {
      const deactivated = await db.deactivateDriverScheduleShare(selectedScheduleShare.token);
      if (!deactivated) throw new Error("Driver schedule link was not active");
      renderScheduleShare(null);
      window.Rux?.toast?.("Driver link deactivated");
    } catch (err) {
      console.warn("Could not deactivate driver schedule link:", err);
      scheduleDeactivateBtn.disabled = false;
      window.Rux?.toast?.("Could not deactivate the driver link");
    }
  });

  window.addEventListener("rux:driver-schedule-share-changed", (event) => {
    if (!selectedId || String(event.detail?.driverId) !== String(selectedId)) return;
    loadDriverScheduleShare(selectedId);
  });

  // ── Avatar photo upload ───────────────────────────────────────────────────

  dpAvatarBtn.addEventListener("click", () => {
    if (!selectedId) {
      window.Rux?.toast("Save the driver before adding a photo.");
      return;
    }
    dpAvatarInput.click();
  });

  dpAvatarInput.addEventListener("change", async () => {
    const file = dpAvatarInput.files[0];
    dpAvatarInput.value = "";
    if (!file || !selectedId || !db) return;

    const reader = new FileReader();
    reader.onload = (ev) => { dpAvatarMain.innerHTML = `<img src="${ev.target.result}" alt="">`; };
    reader.readAsDataURL(file);

    dpAvatarBtn.classList.add("is-uploading");
    try {
      const photoPath = await db.uploadDriverPhoto(selectedId, file);
      const driver = allDrivers.find(x => x.id === selectedId);
      if (driver) driver.photo_path = photoPath;
      dpAvatarRemoveBtn.hidden = false;
      renderRows(getSortedDrivers());
      applyFilter();
    } catch (err) {
      console.error("Photo upload failed:", err);
      window.Rux?.toast("Photo upload failed — try again.");
      renderAvatar(allDrivers.find(x => x.id === selectedId));
    } finally {
      dpAvatarBtn.classList.remove("is-uploading");
    }
  });

  dpAvatarRemoveBtn.addEventListener("click", async () => {
    if (!selectedId || !db) return;
    if (!confirm("Remove this driver's photo?")) return;
    dpAvatarRemoveBtn.disabled = true;
    try {
      await db.removeDriverPhoto(selectedId);
      const driver = allDrivers.find(x => x.id === selectedId);
      if (driver) driver.photo_path = null;
      renderAvatar(driver);
      renderRows(getSortedDrivers());
      applyFilter();
    } catch (err) {
      console.error("Remove photo failed:", err);
      window.Rux?.toast("Could not remove photo — try again.");
    } finally {
      dpAvatarRemoveBtn.disabled = false;
    }
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
        handle.innerHTML = `<span class="rux-icon">drag_indicator</span>`;

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
    tbody.querySelectorAll(".driver-app__row").forEach((row) => {
      const matchF = statusFilter === "all" || row.dataset.status === statusFilter;
      const matchE = employmentFilter === "all" || row.dataset.employmentType === employmentFilter;
      row.hidden = !(matchF && matchE);
    });
    updateSaveOrderState();
  }

  function updateFilterHeaders(table) {
    table.querySelectorAll("th[data-col-filter]").forEach(th => {
      const def = DRIVER_COL_FILTERS[th.dataset.colFilter];
      th.tabIndex = 0;
      th.setAttribute("aria-haspopup", "menu");
      if (!th.hasAttribute("aria-expanded")) th.setAttribute("aria-expanded", "false");
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
      driverColFilterPopover.className = "rux-menu rux-popover";
      driverColFilterPopover.setAttribute("hidden", "");
      driverColFilterPopover.setAttribute("role", "menu");
      driverColFilterPopover.addEventListener("rux:menu-close", () => { activeFilterTh = null; });
      document.body.appendChild(driverColFilterPopover);
    }

    if (activeFilterTh === th && !driverColFilterPopover.hidden) {
      window.RuxMenu.close(driverColFilterPopover); return;
    }
    activeFilterTh = th;

    driverColFilterPopover.innerHTML = "";
    def.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type      = "button";
      const selected = def.get() === opt.value;
      btn.className = "rux-menu__item" + (selected ? " is-active" : "");
      btn.setAttribute("role", "menuitemradio");
      btn.setAttribute("aria-checked", String(selected));
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        def.set(opt.value);
        updateFilterHeaders(tbody.closest("table"));
        applyFilter();
        window.RuxMenu.close(driverColFilterPopover);
      });
      driverColFilterPopover.appendChild(btn);
    });

    window.RuxMenu.open(th, driverColFilterPopover, { placement: "bottom-start" });
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
    priority: (a, b) => {
      const o = { "full-time": 0, "part-time": 1, contract: 2, seasonal: 3 };
      return ((o[a.employment_type] ?? 9) - (o[b.employment_type] ?? 9))
        || ((a.priority || 3) - (b.priority || 3))
        || (a.name || "").localeCompare(b.name || "");
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
    return Object.values(DRIVER_COL_FILTERS).some(def => def.get() !== "all");
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
  tbody.closest("table").addEventListener("keydown", e => {
    const filterTh = e.target.closest("th[data-col-filter]");
    if (!filterTh || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    openDriverColFilter(filterTh, filterTh.dataset.colFilter);
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
        db = await import("../data/driver-db.js?v=2");
      } catch (err) {
        console.warn("Could not load driver-db:", err);
        return;
      }
    }
    await loadColConfig();
    await loadDrivers();
  }

  // Called from the Trips module's right-panel Drivers grid ("Add Time Off"
  // footer button) — jumps straight to a specific driver's Time Off tab
  // instead of just opening the panel on whatever tab it last showed.
  async function openTimeOff(driverId) {
    if (!db) await init();
    const driver = allDrivers.find((d) => d.id === driverId);
    const tr = tbody.querySelector(`[data-id="${driverId}"]`);
    if (!driver || !tr) return;
    selectRow(tr, driver);
    document.querySelector('[data-driver-tabs] .rux-tab[aria-controls="pane-timeoff"]')?.click();
  }

  window.DriverPanel = { init, reload: loadDrivers, openTimeOff };

  // Auto-init: don't wait for nav event — defer timing means the nav click
  // fires before this script runs on direct load / refresh at #drivers.
  init().catch(err => {
    console.error("DriverPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });

  // ── Lucide ────────────────────────────────────────────────────────────────

  
})();
