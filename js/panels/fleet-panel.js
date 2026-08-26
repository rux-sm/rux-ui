(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const dialog      = document.getElementById("fleet-editor-dialog");
  const panelEl     = dialog;
  const tbody       = document.getElementById("fleet-roster-body");
  const tabBtns     = document.querySelectorAll('[data-rux-tabs][data-scope="fleet"] .rux-tab');
  const panes       = document.querySelectorAll(".sched-scope-fleet__pane");
  const tripList     = document.getElementById("fp-trip-list");
  const saveOrderBtn = document.getElementById("fleet-save-order-btn");
  const colorSwatch   = document.getElementById("fp-color-swatch");
  const colorPicker   = document.getElementById("fp-color-picker");
  const colorHex      = document.getElementById("fp-color-hex");
  const typeSelect    = document.getElementById("fp-type");
  const typeIconWrap  = document.getElementById("fp-type-icon-wrap");

  const oosRows      = document.getElementById("fp-oos-rows");
  const oosAddBtn    = document.getElementById("fp-oos-add-btn");

  let db         = null;
  let settingsDb = null;
  let busStatus  = null;   // core/bus-status.js, loaded alongside db in init()
  let selectedId = null;
  let allBuses   = [];
  let colConfig  = [];
  // Every bus's out-of-service windows, grouped by bus id. The roster's Status
  // column derives "Out of service" from today's windows rather than storing
  // it, so the list needs the whole fleet's, not just the open vehicle's.
  let oosByBus   = new Map();
  // Last-rendered trip list for the open vehicle, kept so editing a period can
  // re-flag the conflicts without another round-trip.
  let openBusTrips = [];

  // ── Floating editor window ────────────────────────────────────────────────
  // Same composition as the trip editor dialog (index.html): a
  // .rux-panel--floating window dragged by its header via RuxFloatingWindow;
  // the shared ≤580px breakpoint in rux-ui/css/base/panel.css pins it
  // near-full-screen on phones.

  const newVehicleBtn  = document.getElementById("fleet-new-vehicle-btn");
  const dialogTitleEl  = document.getElementById("fleet-editor-dialog-title");
  const mobileWindowQuery = window.matchMedia("(max-width: 580px)");

  window.RuxFloatingWindow?.attachDrag(
    dialog,
    dialog.querySelector("[data-fleet-dialog-header]"),
    { minViewportWidth: 580 },
  );

  // Snapshot of the form as last populated/cleared — closing (or switching
  // vehicles) with edits on top of it asks before discarding.
  let cleanForm = null;
  // Out-of-service periods live outside readForm() (they are their own table,
  // not columns on buses) but are edited in the same window, so they have to
  // count towards dirty or adding one and closing would discard it silently.
  function formSnapshot()  { return JSON.stringify({ bus: readForm(), oos: readOos() }); }
  function markFormClean() { cleanForm = formSnapshot(); }
  function formIsDirty()   { return cleanForm !== null && formSnapshot() !== cleanForm; }

  function openDialog(title) {
    if (dialogTitleEl && title) dialogTitleEl.textContent = title;
    if (mobileWindowQuery.matches) window.RuxFloatingWindow?.resetGeometry(dialog);
    dialog.hidden = false;
    panelEl.querySelector(".sched-scope-fleet__body")?.scrollTo({ top: 0, behavior: "instant" });
  }

  // Returns false when the user keeps their unsaved edits instead.
  function closeDialog({ discard = false } = {}) {
    if (dialog.hidden) return true;
    if (!discard && formIsDirty() && !confirm("Discard unsaved changes to this vehicle?")) return false;
    dialog.hidden = true;
    tbody.querySelectorAll(".fleet-app__row").forEach(r => r.removeAttribute("aria-current"));
    selectedId = null;
    return true;
  }

  document.getElementById("fleet-dialog-close-btn")?.addEventListener("click", () => closeDialog());

  function resetPanel() {
    closeDialog({ discard: true });
    switchTab(tabBtns[0]);
  }

  newVehicleBtn?.addEventListener("click", () => {
    if (!closeDialog()) return;
    clearPanel();
    openDialog("New Vehicle");
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

  // ── Color picker wiring ───────────────────────────────────────────────────

  function applyColorValue(hex) {
    const valid = /^#[0-9a-fA-F]{6}$/.test(hex);
    colorSwatch.style.background = valid ? hex : "";
    if (valid) colorPicker.value = hex;
  }

  const TYPE_ICONS = {
    Motorcoach: { material: "directions_bus" },
    Sprinter:  { material: "airport_shuttle" },
    Car:       { material: "directions_car" },
    Truck:     { material: "local_shipping" },
  };

  function vehicleIconHtml(type) {
    const icon = TYPE_ICONS[type] || TYPE_ICONS.Motorcoach;
    return `<span class="rux-icon">${icon.material}</span>`;
  }

  function updateTypeIcon() {
    if (!typeIconWrap) return;
    const type = typeSelect.value;
    typeIconWrap.querySelectorAll("[data-type-icon]").forEach(el => {
      el.hidden = el.dataset.typeIcon !== type;
    });
  }

  typeSelect?.addEventListener("change", updateTypeIcon);

  colorSwatch.addEventListener("click", () => colorPicker.click());
  colorPicker.addEventListener("input", () => {
    colorHex.value = colorPicker.value;
    colorSwatch.style.background = colorPicker.value;
  });
  colorHex.addEventListener("input", () => {
    const v   = colorHex.value.trim();
    const hex = v.startsWith("#") ? v : `#${v}`;
    applyColorValue(hex);
  });

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

  function serviceExpiryClass(iso) {
    if (!iso) return "fleet-app__expiry";
    const today = localIsoDate();
    if (iso < today) return "fleet-app__expiry fleet-app__expiry--expired";
    const warn = new Date();
    warn.setMonth(warn.getMonth() + 3);
    if (iso <= localIsoDate(warn))
      return "fleet-app__expiry fleet-app__expiry--warn";
    return "fleet-app__expiry";
  }

  // Status is only active/inactive now (see core/bus-status.js). "Out of
  // service" is not a status — it is derived from whether a dated window covers
  // today, so the badge and the dates can never disagree.
  function statusMeta(bus) {
    const label = busStatus
      ? busStatus.deriveBusStatusLabel(bus, oosByBus.get(bus.id), localIsoDate())
      : "Active";
    if (label === "Out of service") return { label, cls: "rux-badge--warning" };
    if (label === "Inactive")       return { label, cls: "" };
    return { label, cls: "rux-badge--success" };
  }

  // ── Trip list ─────────────────────────────────────────────────────────────

  function renderTripList(trips) {
    if (!trips.length) {
      tripList.innerHTML =
        `<li class="sched-scope-fleet__trip-item"><span class="rux-u-muted">No trips assigned.</span></li>`;
      return;
    }
    // Read from the rows currently in the form, not from what was last saved,
    // so a period being added flags its conflicts before you commit to it.
    const windows = readOos();
    tripList.innerHTML = trips.map((t) => {
      const dates = fmtTripDates(t.startDate, t.endDate);
      const meta  = [dates, t.destination, t.driverName ? `Driver: ${t.driverName}` : null]
                      .filter(Boolean).join(" · ");
      const status    = t.invoiceStatus || "pending";
      const badgeCls  = status === "paid" ? "rux-badge--success" : "";
      const badgeLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const clash = busStatus?.isOutOfServiceDuring(windows, t.startDate, t.endDate);
      const warning = clash
        ? `<span class="rux-icon sched-scope-fleet__trip-warning" title="This vehicle is out of service during this trip">warning</span>`
        : "";
      return `
        <li class="sched-scope-fleet__trip-item">
          <span class="sched-scope-fleet__trip-id">${t.tripRef}</span>
          <span class="sched-scope-fleet__trip-meta">${meta}</span>
          ${warning}
          <span class="rux-badge rux-badge--dot ${badgeCls}">${badgeLabel}</span>
        </li>
      `;
    }).join("");
  }

  // ── Column definitions ────────────────────────────────────────────────────
  // "Vehicle" is always first and locked. Everything below is toggleable/reorderable.

  const ALL_FLEET_COLS = [
    { key: "order",            label: "#",               defaultOn: true,
      head: `<th scope="col" data-col="order" class="col-order" data-sort="order">#</th>`,
      cell: b => `<td data-col="order" class="col-order fleet-app__order">${b.sort_order ?? "—"}</td>` },
    { key: "status",           label: "Status",           defaultOn: true,
      head: `<th scope="col" data-col="status" data-col-filter="status" data-sort="status">Status <span class="rux-icon rux-col-filter-icon" aria-hidden="true">filter_list</span></th>`,
      cell: b => { const s = statusMeta(b); return `<td data-col="status"><span class="rux-badge rux-badge--dot ${s.cls}">${s.label}</span></td>`; } },
    { key: "type",             label: "Type",             defaultOn: false,
      head: `<th scope="col" data-col="type" data-sort="type">Type</th>`,
      cell: b => `<td data-col="type">${b.type || "—"}</td>` },
    { key: "equipment",        label: "Equipment",        defaultOn: true,
      head: `<th scope="col" data-col="equipment">Equipment</th>`,
      cell: b => `<td data-col="equipment"><div class="fleet-app__equipment-cell">${b.sleeper ? '<span class="rux-icon fleet-app__equip-icon" title="Sleeper">airline_seat_flat</span>' : ''}${b.ada_lift ? '<span class="rux-icon fleet-app__equip-icon" title="ADA lift">accessible</span>' : ''}</div></td>` },
    { key: "capacity",         label: "Capacity",         defaultOn: true,
      head: `<th scope="col" data-col="capacity" data-sort="capacity">Capacity</th>`,
      cell: b => `<td data-col="capacity">${b.capacity ?? "—"}</td>` },
    { key: "make",             label: "Make",             defaultOn: false,
      head: `<th scope="col" data-col="make">Make</th>`,
      cell: b => `<td data-col="make">${b.make || "—"}</td>` },
    { key: "model",            label: "Model",            defaultOn: false,
      head: `<th scope="col" data-col="model">Model</th>`,
      cell: b => `<td data-col="model">${b.model || "—"}</td>` },
    { key: "year",             label: "Year",             defaultOn: false,
      head: `<th scope="col" data-col="year">Year</th>`,
      cell: b => `<td data-col="year">${b.year ?? "—"}</td>` },
    { key: "color",            label: "Color",            defaultOn: false,
      head: `<th scope="col" data-col="color">Color</th>`,
      cell: b => { const hex = b.color && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : null; return `<td data-col="color">${hex ? `<span class="fleet-app__color-dot" style="background:${hex}" title="${hex}"></span> ${hex}` : '<span class="rux-u-muted">—</span>'}</td>`; } },
    { key: "vin",              label: "VIN",              defaultOn: false,
      head: `<th scope="col" data-col="vin">VIN</th>`,
      cell: b => `<td data-col="vin" class="rux-u-mono rux-u-muted">${b.vin || "—"}</td>` },
    { key: "mileage",          label: "Mileage",          defaultOn: false,
      head: `<th scope="col" data-col="mileage">Mileage</th>`,
      cell: b => `<td data-col="mileage">${b.mileage != null ? b.mileage.toLocaleString() + " mi" : "—"}</td>` },
    { key: "last-service",     label: "Last service",     defaultOn: false,
      head: `<th scope="col" data-col="last-service">Last service</th>`,
      cell: b => `<td data-col="last-service">${fmtDate(b.last_service)}</td>` },
    { key: "service",          label: "Next service",     defaultOn: true,
      head: `<th scope="col" data-col="service" class="col-service" data-sort="service">Next service</th>`,
      cell: b => `<td data-col="service" class="${serviceExpiryClass(b.next_service)} col-service">${fmtDate(b.next_service)}</td>` },
    { key: "insurance-exp",    label: "Insurance exp",    defaultOn: false,
      head: `<th scope="col" data-col="insurance-exp">Insurance exp</th>`,
      cell: b => `<td data-col="insurance-exp">${fmtDate(b.insurance_exp)}</td>` },
    { key: "registration-exp", label: "Registration exp", defaultOn: false,
      head: `<th scope="col" data-col="registration-exp">Registration exp</th>`,
      cell: b => `<td data-col="registration-exp">${fmtDate(b.registration_exp)}</td>` },
    { key: "inspection-exp",   label: "Inspection exp",   defaultOn: false,
      head: `<th scope="col" data-col="inspection-exp">Inspection exp</th>`,
      cell: b => `<td data-col="inspection-exp">${fmtDate(b.inspection_exp)}</td>` },
    { key: "notes",            label: "Notes",            defaultOn: false,
      head: `<th scope="col" data-col="notes">Notes</th>`,
      cell: b => `<td data-col="notes">${b.notes ? `<span class="fleet-app__truncate rux-u-muted" title="${b.notes.replace(/"/g, '&quot;')}">${b.notes}</span>` : '<span class="rux-u-muted">—</span>'}</td>` },
    { key: "next-trip",        label: "Next trip",        defaultOn: true,
      head: `<th scope="col" data-col="next-trip">Next trip</th>`,
      cell: b => `<td data-col="next-trip"><span class="rux-u-muted">—</span></td>` },
  ];

  function getActiveCols() {
    return colConfig
      .filter(c => c.visible)
      .map(c => ALL_FLEET_COLS.find(d => d.key === c.key))
      .filter(Boolean);
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows(list) {
    const activeCols = getActiveCols();
    const table = tbody.closest("table");

    // The trailing spacer column retired at layout.md step 30. It existed
    // because .rux-table-wrap forced the table to width:100% and auto layout
    // spread the surplus across every column, leaving a 3-character Vehicle and
    // a 17-character VIN the full workspace apart; one empty column claiming
    // width:100% biased the distribution into itself. The frame hugs its
    // content now, so there is no surplus to absorb and no fake column — which
    // is the exit this comment used to describe as "swap the spacer out".
    const theadRow = table.querySelector("thead tr");
    theadRow.innerHTML =
      `<th scope="col" data-sort="number">Vehicle</th>` +
      activeCols.map(c => c.head).join("");

    updateFilterHeaders(table);
    updateSortHeaders(table);

    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        `<tr><td colspan="${2 + activeCols.length}" class="fleet-app__empty">No vehicles — add one to get started.</td></tr>`;
      return;
    }

    let dragSrcIdx = null;
    let didDragRow = false;

    list.forEach((b, idx) => {
      const tr = document.createElement("tr");
      tr.className      = "fleet-app__row";
      tr.tabIndex       = 0;
      tr.dataset.id     = b.id;
      tr.dataset.idx    = idx;
      // The filter matches what the badge says, so a bus out of service today
      // is findable under that label even though it is stored as active.
      tr.dataset.status = statusMeta(b).label.toLowerCase().replace(/\s+/g, "-");
      tr.draggable      = sortKey === "order";

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
        const orderedBuses = getSortedBuses();
        const [moved] = orderedBuses.splice(dragSrcIdx, 1);
        orderedBuses.splice(toIdx, 0, moved);
        allBuses = orderedBuses;
        dragSrcIdx = null;
        await saveBusOrder();
      });

      const typeTitle   = b.type || "Motorcoach";
      const hexColor    = b.color && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : null;
      const avatarStyle = hexColor
        ? `style="background:color-mix(in srgb,${hexColor} 50%,var(--sched-bg-bus));"`
        : "";

      tr.innerHTML = `
        <td>
          <div class="fleet-app__vehicle-cell">
            <div class="fleet-app__avatar" aria-hidden="true" title="${typeTitle}" ${avatarStyle}>
              ${vehicleIconHtml(b.type)}
            </div>
            <div class="fleet-app__vehicle-info">
              <span class="fleet-app__vehicle-name">${b.number || "—"}</span>
            </div>
          </div>
        </td>
      ` + activeCols.map(c => c.cell(b)).join("");

      tr.addEventListener("click", e => {
        if (didDragRow) {
          e.preventDefault();
          return;
        }
        selectRow(tr, b);
      });
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRow(tr, b); }
      });

      tbody.appendChild(tr);
    });

    
  }

  function selectRow(tr, b) {
    if (!closeDialog()) return;
    tr.setAttribute("aria-current", "true");
    selectedId = b.id;
    populatePanel(b);
    loadBusTrips(b.id);
    openDialog(b.number ? `Vehicle ${b.number}` : "Edit Vehicle");
  }

  // ── Panel population ──────────────────────────────────────────────────────

  function syncSegmented(group, value) {
    group?.querySelectorAll(".rux-button").forEach((btn) => {
      const on = btn.dataset.value === value;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // ── Out-of-service periods ────────────────────────────────────────────────
  // A list of dated windows rather than a status, so a bus in the shop for
  // three days is bookable for the other 362. Both ends are required: a bus
  // that is out indefinitely is Inactive, which is a different thing.

  function oosRowEl(period = {}) {
    const row = document.createElement("div");
    row.className = "sched-scope-fleet__oos-row";
    if (period.id) row.dataset.id = period.id;
    row.innerHTML = `
      <div class="rux-field">
        <label class="rux-field__label">From</label>
        <input class="rux-input" type="date" data-oos="start" value="${period.start_date || ""}" />
      </div>
      <div class="rux-field">
        <label class="rux-field__label">To</label>
        <input class="rux-input" type="date" data-oos="end" value="${period.end_date || ""}" />
      </div>
      <div class="rux-field">
        <label class="rux-field__label">Reason</label>
        <input class="rux-input" type="text" data-oos="reason" placeholder="Optional" value="${(period.reason || "").replace(/"/g, "&quot;")}" />
      </div>
      <button class="rux-button rux-button--ghost rux-button--icon rux-button--danger" type="button" data-oos="remove" aria-label="Remove this period">
        <span class="rux-icon" aria-hidden="true">delete</span>
      </button>`;

    const startEl = row.querySelector('[data-oos="start"]');
    const endEl   = row.querySelector('[data-oos="end"]');
    // Picking a start with no end yet gives a one-day window to widen — the
    // only default that is always valid and never invents a length.
    startEl.addEventListener("change", () => {
      if (startEl.value && (!endEl.value || endEl.value < startEl.value)) {
        endEl.value = startEl.value;
      }
      refreshTripWarnings();
    });
    endEl.addEventListener("change", refreshTripWarnings);
    row.querySelector('[data-oos="remove"]').addEventListener("click", () => {
      row.remove();
      renderOosEmptyState();
      refreshTripWarnings();
    });
    return row;
  }

  function refreshTripWarnings() {
    if (openBusTrips.length) renderTripList(openBusTrips);
  }

  function renderOosEmptyState() {
    if (!oosRows) return;
    const empty = oosRows.querySelector(".sched-scope-fleet__oos-empty");
    const hasRows = oosRows.querySelector(".sched-scope-fleet__oos-row");
    if (hasRows) { empty?.remove(); return; }
    if (empty) return;
    const el = document.createElement("p");
    el.className = "sched-scope-fleet__oos-empty rux-u-muted";
    el.textContent = "In service every day.";
    oosRows.appendChild(el);
  }

  function populateOos(windows) {
    if (!oosRows) return;
    oosRows.innerHTML = "";
    (windows ?? []).forEach((w) => oosRows.appendChild(oosRowEl(w)));
    renderOosEmptyState();
  }

  // Rows missing a start date are treated as abandoned and dropped rather than
  // blocking the save — a half-filled row is a change of mind, not an error.
  function readOos() {
    if (!oosRows) return [];
    return [...oosRows.querySelectorAll(".sched-scope-fleet__oos-row")]
      .map((row) => ({
        id:         row.dataset.id || undefined,
        start_date: row.querySelector('[data-oos="start"]').value || null,
        end_date:   row.querySelector('[data-oos="end"]').value || null,
        reason:     row.querySelector('[data-oos="reason"]').value.trim() || null,
      }))
      .filter((w) => w.start_date);
  }

  // Returns the first row the database would reject, so the message names the
  // problem before the round-trip. The CHECK constraint is the backstop.
  function invalidOosRow(windows) {
    return windows.find((w) => !busStatus?.isValidOutOfServiceWindow(w)) ?? null;
  }

  oosAddBtn?.addEventListener("click", () => {
    oosRows.querySelector(".sched-scope-fleet__oos-empty")?.remove();
    const row = oosRowEl();
    oosRows.appendChild(row);
    row.querySelector('[data-oos="start"]')?.focus();
  });

  function populatePanel(b) {
    document.getElementById("fp-sort-order").value        = b.sort_order      ?? "";
    document.getElementById("fp-number").value           = b.number          || "";
    document.getElementById("fp-make").value             = b.make            || "";
    document.getElementById("fp-model").value            = b.model           || "";
    document.getElementById("fp-year").value             = b.year            ?? "";
    document.getElementById("fp-vin").value              = b.vin             || "";
    colorHex.value = b.color || "";
    applyColorValue(b.color || "");
    document.getElementById("fp-capacity").value         = b.capacity        ?? "";
    document.getElementById("fp-mileage").value          = b.mileage         ?? "";
    document.getElementById("fp-last-service").value     = b.last_service    || "";
    document.getElementById("fp-next-service").value     = b.next_service    || "";
    document.getElementById("fp-insurance-exp").value    = b.insurance_exp   || "";
    document.getElementById("fp-registration-exp").value = b.registration_exp || "";
    document.getElementById("fp-inspection-exp").value   = b.inspection_exp  || "";
    document.getElementById("fp-notes").value            = b.notes           || "";

    typeSelect.value = b.type || "Motorcoach";
    updateTypeIcon();
    // Normalized, so a row still holding the pre-patch 'retired' selects
    // Inactive instead of leaving the control with nothing pressed.
    syncSegmented(
      document.getElementById("fp-status-group"),
      busStatus ? busStatus.normalizeBusStatus(b.status) : "active",
    );
    populateOos(oosByBus.get(b.id));

    // Equipment toggles
    const adaBtn     = document.getElementById("fp-ada-lift");
    const sleeperBtn = document.getElementById("fp-sleeper");
    if (adaBtn) {
      const on = !!b.ada_lift;
      adaBtn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (sleeperBtn) {
      const on = !!b.sleeper;
      sleeperBtn.setAttribute("aria-pressed", on ? "true" : "false");
    }

    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
    markFormClean();
  }

  // ── Form read ─────────────────────────────────────────────────────────────

  function readForm() {
    const statusBtn = document.querySelector("#fp-status-group .rux-button[aria-pressed='true']");
    const adaBtn    = document.getElementById("fp-ada-lift");

    return {
      sort_order:       parseInt(document.getElementById("fp-sort-order").value, 10) || null,
      number:           document.getElementById("fp-number").value.trim()           || null,
      make:             document.getElementById("fp-make").value.trim()             || null,
      model:            document.getElementById("fp-model").value.trim()            || null,
      year:             parseInt(document.getElementById("fp-year").value, 10)      || null,
      vin:              document.getElementById("fp-vin").value.trim()              || null,
      color:            colorHex.value.trim()                                        || null,
      capacity:         parseInt(document.getElementById("fp-capacity").value, 10)  || null,
      type:             typeSelect.value                                             || "Motorcoach",
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
    const windows = readOos();
    const bad = invalidOosRow(windows);
    if (bad) {
      window.Rux?.toast("An out-of-service period ends before it starts.");
      return;
    }
    const btn = document.getElementById("fp-btn-save");
    btn.disabled = true;
    try {
      const saved = await db.saveBus(selectedId ? { id: selectedId, ...payload } : payload);
      // Windows are keyed on the bus, so a brand-new vehicle has to exist
      // before they can be written — hence the id off the save above.
      //
      // Failing here must not fail the vehicle: the table does not exist until
      // bus-status-patch.sql has been run, and the rest of this panel is
      // supposed to keep working in the meantime. Say what was lost rather than
      // reporting a save that half-happened as a clean success.
      try {
        await db.replaceBusOutOfService(saved?.id ?? selectedId, windows);
      } catch (oosErr) {
        console.error("Could not save out-of-service periods:", oosErr);
        window.Rux?.toast("Vehicle saved, but its out-of-service periods could not be.");
      }
      await loadBuses();
      announceFleetChanged();
      resetPanel();
    } catch (err) {
      console.error("Could not save vehicle:", err);
      window.Rux?.toast("Could not save the vehicle — check your connection and try again.");
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
      announceFleetChanged();
      resetPanel();
    } catch (err) {
      console.error("Could not delete vehicle:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // ── Clear ─────────────────────────────────────────────────────────────────

  function clearPanel() {
    tbody.querySelectorAll(".fleet-app__row").forEach(r => r.removeAttribute("aria-current"));
    selectedId = null;

    panelEl.querySelectorAll(".sched-scope-fleet__pane input, .sched-scope-fleet__pane textarea")
      .forEach(f => { f.value = ""; });
    colorSwatch.style.background = "";

    typeSelect.value = "Motorcoach";
    updateTypeIcon();

    // Reset status to active
    panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
      group.querySelectorAll(".rux-button").forEach((btn, i) => {
        const on = i === 0;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });

    // Reset equipment toggles
    ["fp-ada-lift", "fp-sleeper"].forEach(id => {
      const btn = document.getElementById(id);
    });

    tripList.innerHTML = "";
    openBusTrips = [];
    populateOos([]);
    switchTab(tabBtns[0]);
    window.Rux?.syncDateInputs(panelEl);
    markFormClean();
  }

  document.getElementById("fp-btn-clear").addEventListener("click", clearPanel);

  // ── Column picker v2 — Supabase-persisted, drag-to-reorder ───────────────

  const FLEET_COLS_KEY = "fleet-cols-v2";
  const fleetViewOptionsList = document.getElementById("fleet-view-options-list");
  let   dragKey        = null;

  function defaultConfig() {
    return ALL_FLEET_COLS.map(c => ({ key: c.key, visible: c.defaultOn }));
  }

  function mergeConfig(saved) {
    if (!Array.isArray(saved) || !saved.length) return defaultConfig();
    const merged = saved
      .filter(s => ALL_FLEET_COLS.some(c => c.key === s.key))
      .map(s => ({ key: s.key, visible: !!s.visible }));
    ALL_FLEET_COLS.forEach(c => {
      if (!merged.some(m => m.key === c.key)) merged.push({ key: c.key, visible: c.defaultOn });
    });
    return merged;
  }

  async function loadColConfig() {
    if (!settingsDb) {
      try { settingsDb = await import("../data/settings-db.js"); } catch { /* offline */ }
    }
    const saved = settingsDb ? await settingsDb.getSetting(FLEET_COLS_KEY) : null;
    colConfig = mergeConfig(saved);
  }

  async function saveColConfig() {
    if (!settingsDb) return;
    try { await settingsDb.setSetting(FLEET_COLS_KEY, colConfig); } catch (err) { console.warn("saveColConfig:", err); }
  }

  // Rows render into the Table Options drawer's View Options card — same
  // recipe as the Drivers module's renderColPicker.
  function renderColPicker() {
    if (!fleetViewOptionsList) return;
    fleetViewOptionsList.innerHTML = "";
    colConfig.forEach(c => {
      const def = ALL_FLEET_COLS.find(d => d.key === c.key);
      if (!def) return;

      const row = document.createElement("div");
      row.className = "sched-col-picker__row";
      row.draggable = true;
      row.dataset.key = c.key;

      const handle = document.createElement("span");
      handle.className = "sched-col-picker__handle";
      handle.innerHTML = `<span class="rux-icon">drag_indicator</span>`;

      const cb = document.createElement("input");
      cb.type    = "checkbox";
      cb.checked = c.visible;
      cb.id      = `fcol-${c.key}`;
      cb.addEventListener("change", async () => {
        c.visible = cb.checked;
        renderRows(getSortedBuses());
        await saveColConfig();
      });

      const lbl = document.createElement("label");
      lbl.htmlFor   = cb.id;
      lbl.className = "sched-col-picker__label";
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
        fleetViewOptionsList.querySelectorAll(".is-over").forEach(el => el.classList.remove("is-over"));
      });
      row.addEventListener("dragover", e => {
        if (dragKey && dragKey !== c.key) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          fleetViewOptionsList.querySelectorAll(".is-over").forEach(el => el.classList.remove("is-over"));
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
        renderColPicker();

        renderRows(getSortedBuses());
        await saveColConfig();
      });

      fleetViewOptionsList.appendChild(row);
    });
  }

  // ── Table options drawer ──────────────────────────────────────────────────
  // Same calendar-Tools pattern as the Drivers module: right drawer with a
  // resize channel, toggled from the workspace header.
  const toolsDrawer = document.getElementById("fleet-tools-drawer");
  const toolsDrawerHandle = RuxDrawer.create({
    drawer: toolsDrawer,
    panel: toolsDrawer.querySelector(".sched-scope-right-panel"),
    toggleBtn: document.getElementById("fleet-tools-toggle-btn"),
    handle: document.getElementById("fleet-tools-resize-gutter"),
    direction: "right",
  });
  const openToolsDrawer = toolsDrawerHandle.open;
  const closeToolsDrawer = toolsDrawerHandle.close;

  document
    .querySelectorAll('[data-rux-domain-toggle][data-scope="fleet-tools"]')
    .forEach((button) => {
      button.addEventListener("click", () => {
        toolsDrawer.classList.contains("is-open")
          ? closeToolsDrawer()
          : openToolsDrawer();
      });
    });

  // ── Search & filter ───────────────────────────────────────────────────────

  let statusFilter = "all";

  const FLEET_COL_FILTERS = {
    status: {
      get: ()  => statusFilter,
      set: (v) => { statusFilter = v; },
      options: [
        { value: "all",            label: "All"            },
        { value: "active",         label: "Active"         },
        { value: "out-of-service", label: "Out of service" },
        { value: "inactive",       label: "Inactive"       },
      ],
    },
  };

  function applyFilter() {
    tbody.querySelectorAll(".fleet-app__row").forEach((row) => {
      const matchF = statusFilter === "all" || row.dataset.status === statusFilter;
      row.hidden = !matchF;
    });
    updateSaveOrderState();
  }

  function updateFilterHeaders(table) {
    table.querySelectorAll("th[data-col-filter]").forEach(th => {
      const def = FLEET_COL_FILTERS[th.dataset.colFilter];
      th.tabIndex = 0;
      th.setAttribute("aria-haspopup", "menu");
      if (!th.hasAttribute("aria-expanded")) th.setAttribute("aria-expanded", "false");
      if (def) th.classList.toggle("is-filtered", def.get() !== "all");
    });
  }

  let fleetColFilterPopover = null;
  let activeFilterTh        = null;

  function openFleetColFilter(th, filterKey) {
    const def = FLEET_COL_FILTERS[filterKey];
    if (!def) return;

    if (!fleetColFilterPopover) {
      fleetColFilterPopover = document.createElement("div");
      fleetColFilterPopover.className = "rux-menu rux-popover";
      fleetColFilterPopover.setAttribute("hidden", "");
      fleetColFilterPopover.setAttribute("role", "menu");
      fleetColFilterPopover.addEventListener("rux:menu-closed", () => { activeFilterTh = null; });
      document.body.appendChild(fleetColFilterPopover);
    }

    if (activeFilterTh === th && !fleetColFilterPopover.hidden) {
      window.RuxMenu.close(fleetColFilterPopover); return;
    }
    activeFilterTh = th;

    fleetColFilterPopover.innerHTML = "";
    def.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type      = "button";
      const selected = def.get() === opt.value;
      btn.className = "rux-menu__item";
      // aria-checked below is the only channel — state.md rule 2.1, step 8.
      btn.setAttribute("role", "menuitemradio");
      btn.setAttribute("aria-checked", String(selected));
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        def.set(opt.value);
        updateFilterHeaders(tbody.closest("table"));
        applyFilter();
        window.RuxMenu.close(fleetColFilterPopover);
      });
      fleetColFilterPopover.appendChild(btn);
    });

    window.RuxMenu.open(th, fleetColFilterPopover, { placement: "bottom-start" });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  let sortKey = "order";
  let sortDir = "asc";

  const SORT_DEFS = {
    number:   (a, b) => (a.number || "").localeCompare(b.number || "", undefined, { numeric: true }),
    order:    (a, b) => {
      if (a.sort_order == null && b.sort_order == null) return (a.number || "").localeCompare(b.number || "", undefined, { numeric: true });
      if (a.sort_order == null) return 1;
      if (b.sort_order == null) return -1;
      return a.sort_order - b.sort_order;
    },
    // Sorts by what the badge shows, not the stored column — otherwise a bus
    // out of service today would sort in among the plain active ones.
    status:   (a, b) => { const o = { Active: 0, "Out of service": 1, Inactive: 2 }; return ((o[statusMeta(a).label] ?? 9) - (o[statusMeta(b).label] ?? 9)) || (a.number || "").localeCompare(b.number || ""); },
    type:     (a, b) => (a.type || "").localeCompare(b.type || "") || (a.number || "").localeCompare(b.number || ""),
    capacity: (a, b) => ((a.capacity ?? 0) - (b.capacity ?? 0)) || (a.number || "").localeCompare(b.number || ""),
    service:  (a, b) => (a.next_service || "9999").localeCompare(b.next_service || "9999") || (a.number || "").localeCompare(b.number || ""),
  };

  function getSortedBuses() {
    const fn = SORT_DEFS[sortKey] || SORT_DEFS.order;
    const list = [...allBuses].sort(fn);
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

  async function saveBusOrder() {
    const updates = allBuses.map((b, i) => ({ id: b.id, sort_order: i + 1 }));
    allBuses.forEach((b, i) => { b.sort_order = i + 1; });
    renderRows(getSortedBuses());
    applyFilter();
    try { await db.reorderBuses(updates); } catch (err) { console.error("reorderBuses failed:", err); }
  }

  function hasActiveFleetFilter() {
    return Object.values(FLEET_COL_FILTERS).some(def => def.get() !== "all");
  }

  function updateSaveOrderState() {
    if (!saveOrderBtn) return;
    const isManualOrder = sortKey === "order";
    const blockedByFilter = hasActiveFleetFilter();
    saveOrderBtn.hidden = isManualOrder;
    saveOrderBtn.disabled = !isManualOrder && blockedByFilter;
    saveOrderBtn.title = blockedByFilter
      ? "Clear search and filters before setting manual order"
      : "Set current sort as manual order";
  }

  async function lockCurrentOrder() {
    if (sortKey === "order" || hasActiveFleetFilter()) return;
    allBuses = getSortedBuses();
    sortKey = "order";
    sortDir = "asc";
    await saveBusOrder();
  }

  saveOrderBtn?.addEventListener("click", lockCurrentOrder);

  tbody.closest("table").addEventListener("click", e => {
    const filterIcon = e.target.closest(".rux-col-filter-icon");
    if (filterIcon) {
      const th = filterIcon.closest("th[data-col-filter]");
      if (th) { openFleetColFilter(th, th.dataset.colFilter); return; }
    }

    const sortTh = e.target.closest("th[data-sort]");
    if (sortTh) {
      const key = sortTh.dataset.sort;
      if (key === sortKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      renderRows(getSortedBuses());
      applyFilter();
      return;
    }

    const filterTh = e.target.closest("th[data-col-filter]");
    if (filterTh) openFleetColFilter(filterTh, filterTh.dataset.colFilter);
  });
  tbody.closest("table").addEventListener("keydown", e => {
    const filterTh = e.target.closest("th[data-col-filter]");
    if (!filterTh || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    openFleetColFilter(filterTh, filterTh.dataset.colFilter);
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadBusTrips(busId) {
    tripList.innerHTML =
      `<li class="sched-scope-fleet__trip-item"><span class="rux-u-muted">Loading…</span></li>`;
    try {
      openBusTrips = await db.fetchBusTrips(busId);
      renderTripList(openBusTrips);
    } catch (err) {
      console.warn("Could not load bus trips:", err);
      tripList.innerHTML =
        `<li class="sched-scope-fleet__trip-item"><span class="rux-u-muted">Could not load trips.</span></li>`;
    }
  }

  // The scheduler builds its bus rows once at boot and never rebuilds them, so
  // without this a window added here would not stripe the calendar until a
  // reload — which reads as the feature not working.
  function announceFleetChanged() {
    document.dispatchEvent(new CustomEvent("rux:fleet-changed"));
  }

  async function loadBuses() {
    try {
      allBuses = await db.fetchBuses();
      try {
        oosByBus = busStatus.indexOutOfServiceByBus(await db.fetchAllBusOutOfService());
      } catch (oosErr) {
        // Additive: the roster still lists every vehicle without them, which
        // is what happens before bus-status-patch.sql has been run.
        console.warn("Could not load out-of-service periods:", oosErr);
        oosByBus = new Map();
      }
      renderRows(getSortedBuses());
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
        [db, busStatus] = await Promise.all([
          import("../data/fleet-db.js?v=1"),
          import("../core/bus-status.js"),
        ]);
      } catch (err) {
        console.warn("Could not load fleet-db:", err);
        return;
      }
    }
    await loadColConfig();
    renderColPicker();
    await loadBuses();

    // The tools drawer opens by default on desktop, same as the Calendar and
    // Drivers modules — mobile stays closed (full-screen overlay there).
    if (!window.matchMedia("(max-width: 500px)").matches) {
      openToolsDrawer();
    }
  }

  window.FleetPanel = { init, reload: loadBuses };

  // Auto-init: same defer-timing fix as driver-panel.js
  init().catch(err => {
    console.error("FleetPanel init failed:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="fleet-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
  });

  
})();
