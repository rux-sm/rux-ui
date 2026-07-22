/* ==========================================================================
   RUX UI — REQUIREMENTS PANEL
   --------------------------------------------------------------------------
   Settings UI for managing the list of configurable trip requirements.
   Reads and writes via requirements-db.js; updates window.appRequirements
   and calls window.TripPanel.refreshRequirements() so the trip editor
   reflects changes immediately.
   ========================================================================== */

(async function () {
  "use strict";

  const { loadRequirements, saveRequirements, DEFAULT_REQUIREMENTS } = await import("../data/requirements-db.js");

  /* ── Icon catalogue (curated Lucide icon names) ────────────────────────── */

  const ICON_OPTIONS = [
    "airline_seat_flat", "groups",    "accessible",    "apartment",     "credit_card",
    "wifi",          "tv",            "coffee",        "restaurant",    "luggage",
    "music_note",    "child_care",    "photo_camera",  "local_gas_station", "build",
    "shield",        "healing",       "star",          "bolt",          "ac_unit",
    "thermostat",    "volume_up",     "mic",           "monitor",       "location_on",
    "schedule",      "flag",          "key",           "work",          "inventory_2",
  ];

  /* ── DOM refs ──────────────────────────────────────────────────────────── */

  const listEl      = document.getElementById("settings-req-list");
  const addBtn      = document.getElementById("settings-req-add-btn");
  const newRow      = document.getElementById("settings-req-new-row");
  const newIconBtn  = document.getElementById("settings-req-new-icon");
  const newLabelInput = document.getElementById("settings-req-new-label");
  const newTypeSelect = document.getElementById("settings-req-new-type");
  const newSaveBtn  = document.getElementById("settings-req-save-btn");
  const newCancelBtn = document.getElementById("settings-req-cancel-btn");
  const pickerEl    = document.getElementById("req-icon-picker");

  if (!listEl) return; // requirements panel not in DOM

  let iconTargetId  = null; // req.id or "new"
  let newIcon       = "label";

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  function escHtml(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function uid() {
    return crypto.randomUUID?.() ?? (Math.random().toString(36).slice(2) + Date.now().toString(36));
  }

  function reqs() {
    return window.appRequirements ?? [...DEFAULT_REQUIREMENTS];
  }

  async function persist(next) {
    window.appRequirements = next;
    await saveRequirements(next);
    const tripPanelRoot = document.querySelector(".rux-trip-panel");
    if (tripPanelRoot) window.TripPanel?.refreshRequirements(tripPanelRoot);
  }

  /* ── Icon picker ───────────────────────────────────────────────────────── */

  // Build picker DOM once
  pickerEl.innerHTML = ICON_OPTIONS
    .map(icon =>
      `<button class="rux-button rux-button--default rux-button--icon req-icon-option" type="button" data-icon="${icon}" title="${icon}">
        <span class="rux-icon">${icon}</span>
      </button>`
    ).join("");
  

  function openPicker(triggerEl, targetId) {
    iconTargetId = targetId;
    pickerEl.removeAttribute("hidden");
    const r = triggerEl.getBoundingClientRect();
    const pickerW = 248; // matches CSS width
    const left = Math.min(r.left, window.innerWidth - pickerW - 8);
    pickerEl.style.top  = `${r.bottom + 4 + window.scrollY}px`;
    pickerEl.style.left = `${Math.max(8, left)}px`;
  }

  function closePicker() {
    pickerEl.setAttribute("hidden", "");
    iconTargetId = null;
  }

  pickerEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-icon]");
    if (!btn) return;
    const icon = btn.dataset.icon;
    const targetId = iconTargetId; // capture before closePicker nulls it
    closePicker();

    if (targetId === "new") {
      newIcon = icon;
      updateNewIconBtn(icon);
      return;
    }

    if (targetId) {
      const next = reqs().map(r => r.id === targetId ? { ...r, icon } : r);
      await persist(next);
      render();
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!pickerEl.hidden && !pickerEl.contains(e.target)) closePicker();
  }, true);

  /* ── Render list ───────────────────────────────────────────────────────── */

  function iconBtnHtml(icon, id) {
    return `<button class="rux-button rux-button--default rux-button--icon req-icon-btn" type="button" data-icon-for="${escHtml(id)}" title="Change icon">
      <span class="rux-icon">${escHtml(icon)}</span>
    </button>`;
  }

  function rowHtml(req) {
    return `<div class="settings-req-row" data-req-id="${escHtml(req.id)}">
      ${iconBtnHtml(req.icon, req.id)}
      <input class="rux-input settings-req-label-input" type="text"
             value="${escHtml(req.label)}" maxlength="32"
             data-req-label="${escHtml(req.id)}" />
      <span class="rux-badge settings-req-type-badge">${req.type === "vehicle" ? "Vehicle" : "Driver"}</span>
      <label class="rux-switch" title="${req.active ? "Active — click to disable" : "Inactive — click to enable"}">
        <input type="checkbox" ${req.active ? "checked" : ""} data-req-toggle="${escHtml(req.id)}" />
        <span class="rux-switch__track"></span>
        <span class="rux-switch__thumb"></span>
      </label>
      <button class="rux-button rux-button--default rux-button--icon rux-button--sm" type="button"
              data-req-delete="${escHtml(req.id)}" aria-label="Delete ${escHtml(req.label)}">
        <span class="rux-icon">delete</span>
      </button>
    </div>`;
  }

  function sectionHtml(label, items) {
    if (!items.length) return "";
    return `<p class="settings-req-section">${label}</p>${items.map(rowHtml).join("")}`;
  }

  function render() {
    const all = reqs();
    const vehicle = all.filter(r => r.type === "vehicle").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const driver  = all.filter(r => r.type === "driver").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    if (!all.length) {
      listEl.innerHTML = `<p class="settings-req-empty">No requirements yet. Add one below.</p>`;
    } else {
      listEl.innerHTML = sectionHtml("Vehicle", vehicle) + sectionHtml("Driver", driver);
      
    }

    // Wire icon buttons
    listEl.querySelectorAll("[data-icon-for]").forEach(btn => {
      btn.addEventListener("click", () => openPicker(btn, btn.dataset.iconFor));
    });

    // Wire label inputs (save on blur)
    listEl.querySelectorAll("[data-req-label]").forEach(input => {
      input.addEventListener("change", async () => {
        const label = input.value.trim();
        if (!label) { input.value = reqs().find(r => r.id === input.dataset.reqLabel)?.label ?? ""; return; }
        const next = reqs().map(r => r.id === input.dataset.reqLabel ? { ...r, label } : r);
        await persist(next);
      });
    });

    // Wire active toggles
    listEl.querySelectorAll("[data-req-toggle]").forEach(checkbox => {
      checkbox.addEventListener("change", async () => {
        const next = reqs().map(r => r.id === checkbox.dataset.reqToggle ? { ...r, active: checkbox.checked } : r);
        await persist(next);
      });
    });

    // Wire delete buttons
    listEl.querySelectorAll("[data-req-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.reqDelete;
        const req = reqs().find(r => r.id === id);
        if (!req) return;
        if (!confirm(`Delete "${req.label}"? Existing trips with this requirement won't be affected.`)) return;
        const next = reqs().filter(r => r.id !== id);
        await persist(next);
        render();
      });
    });
  }

  /* ── Add form ──────────────────────────────────────────────────────────── */

  function updateNewIconBtn(icon) {
    const el = newIconBtn.querySelector(".rux-icon");
    if (!el) return;
    el.textContent = icon;
  }

  addBtn?.addEventListener("click", () => {
    newRow?.removeAttribute("hidden");
    addBtn.setAttribute("hidden", "");
    newLabelInput?.focus();
  });

  newIconBtn?.addEventListener("click", () => openPicker(newIconBtn, "new"));

  newCancelBtn?.addEventListener("click", () => {
    newRow?.setAttribute("hidden", "");
    addBtn?.removeAttribute("hidden");
    if (newLabelInput) newLabelInput.value = "";
    newIcon = "tag";
    updateNewIconBtn("tag");
  });

  newSaveBtn?.addEventListener("click", async () => {
    const label = newLabelInput?.value.trim();
    if (!label) { newLabelInput?.focus(); return; }
    const type = newTypeSelect?.value || "vehicle";
    const sameType = reqs().filter(r => r.type === type);
    const sortOrder = sameType.length
      ? Math.max(...sameType.map(r => r.sortOrder ?? 0)) + 1
      : 0;
    const req = { id: uid(), label, icon: newIcon, type, active: true, sortOrder };
    const next = [...reqs(), req];
    await persist(next);
    render();
    if (newLabelInput) newLabelInput.value = "";
    newIcon = "tag";
    updateNewIconBtn("tag");
    newRow?.setAttribute("hidden", "");
    addBtn?.removeAttribute("hidden");
  });

  /* ── Init ──────────────────────────────────────────────────────────────── */

  window.appRequirements = await loadRequirements();
  render();

  window.RequirementsPanel = { reload: async () => { window.appRequirements = await loadRequirements(); render(); } };
})();
