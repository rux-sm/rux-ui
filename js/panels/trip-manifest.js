(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const tripPanelRoot = document.querySelector(".rux-trip-panel");
  const manifestBody = document.getElementById("tp-manifest-body");
  const passengerCard = document.getElementById("rp-passenger-card");

  const nameInput = document.getElementById("rpm-name");
  const phoneInput = document.getElementById("rpm-phone");
  const emailInput = document.getElementById("rpm-email");
  const addressInput = document.getElementById("rpm-address");
  const dobInput = document.getElementById("rpm-dob");
  const notesInput = document.getElementById("rpm-notes");
  const owedInput = document.getElementById("rpm-owed");
  const paidInput = document.getElementById("rpm-paid");
  const statusBadge = document.getElementById("rpm-status-badge");
  const titleEl = document.getElementById("rpm-title");
  const saveBtn = document.getElementById("rpm-btn-save");
  const clearBtn = document.getElementById("rpm-btn-clear");
  const deleteBtn = document.getElementById("rpm-btn-delete");

  let db = null;
  let tripDb = null;
  let allPassengers = [];
  let selectedId = null;

  async function ensureDb() {
    if (!db) db = await import("../data/passenger-db.js");
    return db;
  }

  async function ensureTripDb() {
    if (!tripDb) tripDb = await import("../data/trip-db.js");
    return tripDb;
  }

  // ── Balance status ───────────────────────────────────────────────────────

  function fmtMoney(value) {
    const n = Number(value) || 0;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const STATUS_META = {
    unpaid:  { label: "Unpaid",  cls: "rux-badge--danger" },
    partial: { label: "Partial", cls: "rux-badge--warning" },
    paid:    { label: "Paid",    cls: "rux-badge--success" },
  };
  function statusKey(owed, paid) {
    if (owed > 0 && paid >= owed) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
  }
  function syncStatusBadge() {
    const owed = parseFloat(owedInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const meta = STATUS_META[statusKey(owed, paid)];
    statusBadge.className = `rux-badge ${meta.cls}`;
    statusBadge.textContent = meta.label;
  }
  owedInput?.addEventListener("input", syncStatusBadge);
  paidInput?.addEventListener("input", syncStatusBadge);

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows() {
    manifestBody.innerHTML = "";
    if (!allPassengers.length) {
      manifestBody.innerHTML =
        `<tr><td colspan="7" class="trips-app__empty">No passengers yet — add one to get started.</td></tr>`;
      return;
    }
    allPassengers.forEach((p) => {
      const owed = Number(p.amount_owed) || 0;
      const paid = Number(p.amount_paid) || 0;
      const meta = STATUS_META[statusKey(owed, paid)];
      const tr = document.createElement("tr");
      tr.className = "trips-app__row";
      tr.tabIndex = 0;
      tr.dataset.id = p.id;
      tr.innerHTML = `
        <td>${p.name || "—"}</td>
        <td>${p.phone || "—"}</td>
        <td>${p.email || "—"}</td>
        <td class="col-owed">${fmtMoney(owed)}</td>
        <td class="col-paid">${fmtMoney(paid)}</td>
        <td class="col-balance">${fmtMoney(owed - paid)}</td>
        <td><span class="rux-badge rux-badge--dot ${meta.cls}">${meta.label}</span></td>
      `;
      tr.addEventListener("click", () => selectRow(p));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRow(p); }
      });
      manifestBody.appendChild(tr);
    });
  }

  // ── Right-panel form ─────────────────────────────────────────────────────

  function populateForm(p) {
    titleEl.textContent = p.name || "Passenger";
    nameInput.value = p.name || "";
    phoneInput.value = p.phone || "";
    emailInput.value = p.email || "";
    addressInput.value = p.address || "";
    dobInput.value = p.dob || "";
    notesInput.value = p.notes || "";
    owedInput.value = p.amount_owed ?? "";
    paidInput.value = p.amount_paid ?? "";
    syncStatusBadge();
    window.Rux?.syncDateInputs(passengerCard);
  }

  function selectRow(p) {
    manifestBody.querySelectorAll(".trips-app__row").forEach((r) => r.classList.remove("is-selected"));
    manifestBody.querySelector(`[data-id="${p.id}"]`)?.classList.add("is-selected");
    selectedId = p.id;
    deleteBtn.disabled = false;
    populateForm(p);
  }

  function clearForm() {
    selectedId = null;
    deleteBtn.disabled = true;
    titleEl.textContent = "New passenger";
    [nameInput, phoneInput, emailInput, addressInput, dobInput, notesInput, owedInput, paidInput]
      .forEach((f) => { if (f) f.value = ""; });
    syncStatusBadge();
    manifestBody.querySelectorAll(".trips-app__row").forEach((r) => r.classList.remove("is-selected"));
  }

  clearBtn?.addEventListener("click", clearForm);

  function readForm() {
    return {
      name: nameInput.value.trim() || null,
      phone: phoneInput.value.trim() || null,
      email: emailInput.value.trim() || null,
      address: addressInput.value.trim() || null,
      dob: dobInput.value || null,
      notes: notesInput.value.trim() || null,
      amount_owed: parseFloat(owedInput.value) || null,
      amount_paid: parseFloat(paidInput.value) || null,
    };
  }

  // ── Save / Delete ─────────────────────────────────────────────────────────

  saveBtn?.addEventListener("click", async () => {
    const { getCurrentTripId } = await ensureTripDb();
    const tripId = getCurrentTripId();
    if (!tripId) return;
    const payload = readForm();
    if (!payload.name) { nameInput.focus(); return; }
    await ensureDb();
    saveBtn.disabled = true;
    try {
      if (selectedId) {
        await db.savePassenger(tripId, { id: selectedId, ...payload });
      } else {
        await db.savePassenger(tripId, { position: allPassengers.length, ...payload });
      }
      await loadPassengers();
      clearForm();
    } catch (err) {
      console.error("Could not save passenger:", err);
    } finally {
      saveBtn.disabled = false;
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    if (!selectedId) return;
    if (!confirm("Delete this passenger? This cannot be undone.")) return;
    await ensureDb();
    deleteBtn.disabled = true;
    try {
      await db.deletePassenger(selectedId);
      await loadPassengers();
      clearForm();
    } catch (err) {
      console.error("Could not delete passenger:", err);
    } finally {
      deleteBtn.disabled = false;
    }
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadPassengers() {
    const { getCurrentTripId } = await ensureTripDb();
    const tripId = getCurrentTripId();
    if (!tripId) { allPassengers = []; renderRows(); return; }
    await ensureDb();
    try {
      allPassengers = await db.fetchPassengers(tripId);
      renderRows();
    } catch (err) {
      console.error("fetchPassengers failed:", err);
      manifestBody.innerHTML =
        `<tr><td colspan="7" class="trips-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Availability (ticketed + saved trip only) ───────────────────────────

  async function syncAvailability() {
    const { getCurrentTripId } = await ensureTripDb();
    const tripId = getCurrentTripId();
    const billingType = window.TripPanel?.getBillingType(tripPanelRoot);
    const available = !!tripId && billingType === "ticketed";
    // A trip switch, clear, or Charter toggle can pull the rug out from under
    // an open Manifest view — bounce back to Calendar rather than leave an
    // empty/stale roster on screen with no way to tell why.
    if (!available && window.TripView?.get() === "manifest") {
      window.TripView.set("calendar");
    }
    return available;
  }

  async function refresh() {
    const available = await syncAvailability();
    if (!available) return;
    document.querySelector('[data-right-tabs] .rux-tab[aria-controls="rp-pane-navigate"]')?.click();
    clearForm();
    await loadPassengers();
  }

  window.TripManifest = { refresh };

  tripPanelRoot?.addEventListener("rux:trip-loaded", syncAvailability);
  tripPanelRoot?.addEventListener("rux:trip-saved", syncAvailability);
  tripPanelRoot?.addEventListener("rux:trip-cleared", syncAvailability);
  tripPanelRoot?.addEventListener("rux:trip-deleted", syncAvailability);
  tripPanelRoot?.addEventListener("click", (e) => {
    if (e.target.closest("#tp-billing-type-group")) {
      requestAnimationFrame(syncAvailability);
    }
  });

  syncAvailability();
})();
