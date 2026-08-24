(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const tripPanelRoot = document.querySelector(".sched-scope-trip");
  const manifestWindow = document.getElementById("calendar-manifest-view");
  const manifestBody = document.getElementById("tp-manifest-body");
  const passengerCard = document.getElementById("rp-passenger-card");
  const passengerScrim = document.getElementById("rpm-scrim");
  const addPassengerBtn = document.getElementById("rpm-add-btn");
  const backBtn = document.getElementById("rpm-back-btn");

  // Floating/draggable/resizable window shell (css/base/floating-window.css,
  // rux-ui/js/floating-window.js) — same recipe as the document viewer, so the
  // manifest floats over the calendar instead of replacing it. Open/close
  // state itself lives in index.html's window.TripView. The passenger editor
  // (below) is a second, independent slide-in layer nested inside this
  // window, not tied to TripView at all.
  if (manifestWindow) {
    manifestWindow.querySelector("#manifest-window-close")?.addEventListener("click", () => {
      window.TripView?.set("calendar");
    });
    const header = manifestWindow.querySelector(".rux-panel__header");
    // 580px matches the shared floating-window mobile breakpoint, where all
    // windows receive the same fixed safe-area inset — nothing to drag there.
    if (header) window.RuxFloatingWindow?.attachDrag(manifestWindow, header, { minViewportWidth: 580 });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || manifestWindow.hidden) return;
      // Innermost first — Escape backs out of the passenger editor before
      // it closes the whole manifest window.
      if (passengerCard?.classList.contains("is-open")) closePassengerPanel();
      else window.TripView?.set("calendar");
    });
  }

  function openPassengerPanel() {
    passengerCard?.classList.add("is-open");
    passengerScrim?.classList.add("is-open");
  }
  function closePassengerPanel() {
    passengerCard?.classList.remove("is-open");
    passengerScrim?.classList.remove("is-open");
  }
  addPassengerBtn?.addEventListener("click", () => {
    clearForm();
    openPassengerPanel();
  });
  backBtn?.addEventListener("click", closePassengerPanel);
  passengerScrim?.addEventListener("click", closePassengerPanel);

  // Toolbar report/print actions — not built yet, just staking out the
  // buttons. Swap the toast for the real handler as each one gets implemented.
  const TOOLBAR_PLACEHOLDERS = {
    "rpm-print-manifest-btn": "Print Manifest",
    "rpm-print-report-2-btn": "Print Report 2",
    "rpm-print-report-3-btn": "Print Report 3",
    "rpm-seating-chart-btn": "Seating Chart",
  };
  Object.entries(TOOLBAR_PLACEHOLDERS).forEach(([id, label]) => {
    document.getElementById(id)?.addEventListener("click", () => {
      window.Rux?.toast(`${label} — coming soon`);
    });
  });

  const nameInput = document.getElementById("rpm-name");
  const phoneInput = document.getElementById("rpm-phone");
  const groupInput = document.getElementById("rpm-group");
  const seatInput = document.getElementById("rpm-seat");
  const pickupInput = document.getElementById("rpm-pickup");
  const newCustomerInput = document.getElementById("rpm-new-customer");
  const emailInput = document.getElementById("rpm-email");
  const addressInput = document.getElementById("rpm-address");
  const dobInput = document.getElementById("rpm-dob");
  const notesInput = document.getElementById("rpm-notes");
  const statusSelect = document.getElementById("rpm-status");
  const ticketOptionSelect = document.getElementById("rpm-ticket-option");
  const owedInput = document.getElementById("rpm-owed");
  const balanceOutput = document.getElementById("rpm-balance");
  const paymentRows = document.getElementById("rpm-payment-rows");
  const paymentAddBtn = document.getElementById("rpm-payment-add-btn");
  const statusBadge = document.getElementById("rpm-status-badge");
  const titleEl = document.getElementById("rpm-title");
  const saveBtn = document.getElementById("rpm-btn-save");
  const clearBtn = document.getElementById("rpm-btn-clear");
  const deleteBtn = document.getElementById("rpm-btn-delete");
  const summaryPaidEl = document.getElementById("rpm-summary-paid");
  const summarySeatsEl = document.getElementById("rpm-summary-seats");

  let db = null;
  let tripDb = null;
  let allPassengers = [];
  let ticketOptions = [];
  let capacityTotal = 0;
  let selectedId = null;
  // The trip this OPEN manifest window is bound to — captured once by
  // refresh() when the window opens, then reused for every load/save/delete
  // for as long as it stays open. Deliberately NOT re-read from
  // trip-db's getCurrentTripId() on every action: that value is shared,
  // mutable, and can change out from under a still-open (non-modal) manifest
  // window if the user opens a different trip in the background — reading it
  // live at save-time would silently write a passenger to the wrong trip.
  let manifestTripId = null;

  async function ensureDb() {
    if (!db) db = await import("../data/passenger-db.js");
    return db;
  }

  async function ensureTripDb() {
    if (!tripDb) tripDb = await import("../data/trip-db.js?v=12");
    return tripDb;
  }

  // ── Money / balance helpers ──────────────────────────────────────────────

  function fmtMoney(value) {
    const n = Number(value) || 0;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function sumPayments(payments) {
    return (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
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

  const PASSENGER_STATUS_META = {
    active:   { label: "Active",   cls: "" },
    canceled: { label: "Canceled", cls: "rux-badge--danger" },
    refunded: { label: "Refunded", cls: "rux-badge--warning" },
    no_show:  { label: "No-show",  cls: "rux-badge--warning" },
  };

  // ── Payment rows (mirrors the trip-level Payments card recipe) ──────────

  const PAYMENT_METHODS = [
    { value: "Cash", label: "Cash", icon: "universal_currency_alt" },
    { value: "Check", label: "Check", icon: "checkbook" },
    { value: "Card", label: "Card", icon: "credit_card" },
    { value: "ACH", label: "ACH", icon: "account_balance" },
    { value: "Zelle", label: "Zelle", icon: "bolt" },
    { value: "Other", label: "Other", icon: "more_horiz" },
  ];
  const PAYMENT_METHOD_ICONS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.icon]));

  function escHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function localIsoDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function paymentRowCount() {
    return paymentRows?.querySelectorAll("[data-payment-row]").length || 0;
  }

  function createPaymentRow(index) {
    const row = document.createElement("div");
    row.className = "sched-scope-trip__payment-row";
    row.dataset.paymentRow = "";
    row.innerHTML = `
      <div class="sched-scope-trip__payment-content" role="group" aria-labelledby="rpm-payment-label-${index + 1}">
        <div class="rux-card__header sched-scope-trip__payment-header">
          <div class="sched-scope-trip__payment-method">
            <span class="rux-icon sched-scope-trip__payment-icon" data-payment-method-icon aria-hidden="true"></span>
            <span class="sched-scope-trip__payment-method-label" id="rpm-payment-label-${index + 1}" data-payment-method-label>Payment</span>
            <input type="hidden" data-payment-method id="rpm-payment-method-${index + 1}" />
          </div>
          <button type="button" class="sched-scope-trip__payment-select" data-payment-select aria-label="Delete payment">
            <span class="rux-icon" aria-hidden="true">delete</span>
          </button>
        </div>
        <div class="rux-card__body sched-scope-trip__payment-fields">
          <label class="rux-field sched-scope-trip__payment-date-field">
            <span class="rux-field__label">Date</span>
            <span class="rux-input sched-scope-trip__payment-date-control">
              <span class="sched-scope-trip__payment-date-label" data-payment-date-label aria-hidden="true">Date</span>
              <input class="sched-scope-trip__payment-date" id="rpm-payment-date-${index + 1}" data-payment-date type="date" />
            </span>
          </label>
          <label class="rux-field sched-scope-trip__payment-amount">
            <span class="rux-field__label">Amount</span>
            <span class="rux-input-group rux-input-group--prefix">
              <span class="rux-input-group__prefix" aria-hidden="true">$</span>
              <input class="rux-input sched-scope-trip__payment-amount-input" id="rpm-payment-amount-${index + 1}" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" />
            </span>
          </label>
          <label class="rux-field sched-scope-trip__payment-reference">
            <span class="rux-field__label">Reference</span>
            <input class="rux-input sched-scope-trip__payment-ref" id="rpm-payment-ref-${index + 1}" data-payment-ref type="text" placeholder="Optional" />
          </label>
        </div>
      </div>`;
    return row;
  }

  function setPaymentRowMethod(row, method) {
    const safeMethod = PAYMENT_METHOD_ICONS[method] ? method : "Other";
    const content = row.querySelector(".sched-scope-trip__payment-content");
    row.querySelectorAll("[data-payment-method-icon]").forEach((icon) => {
      icon.textContent = PAYMENT_METHOD_ICONS[safeMethod];
      icon.title = safeMethod;
    });
    const methodLabel = row.querySelector("[data-payment-method-label]");
    if (methodLabel) methodLabel.textContent = `${safeMethod} Payment`;
    const deleteButton = row.querySelector("[data-payment-select]");
    if (deleteButton) deleteButton.setAttribute("aria-label", `Delete ${safeMethod} payment`);
    if (content) {
      content.setAttribute("aria-labelledby", methodLabel?.id || "");
    }
    row.querySelector("[data-payment-method]").value = safeMethod;
  }

  function formatPaymentAmount(el) {
    if (!el?.value) return;
    const value = Number.parseFloat(el.value);
    el.value = (Number.isFinite(value) ? value : 0).toFixed(2);
  }

  function formatCompactPaymentDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return "Date";
    return `${match[2]}/${match[3]}/${match[1].slice(-2)}`;
  }
  function syncPaymentDateLabel(input) {
    const label = input?.closest(".sched-scope-trip__payment-date-control")?.querySelector("[data-payment-date-label]");
    if (label) label.textContent = formatCompactPaymentDate(input.value);
  }

  function syncPaymentButtons() {
    if (paymentRows) paymentRows.style.display = "flex";
  }

  function addPaymentRow(method) {
    if (!paymentRows) return;
    const row = createPaymentRow(paymentRowCount());
    setPaymentRowMethod(row, method);
    paymentRows.appendChild(row);
    const dateInput = row.querySelector("[data-payment-date]");
    if (dateInput) {
      dateInput.value = localIsoDate();
      syncPaymentDateLabel(dateInput);
    }
    syncPaymentButtons();
    syncBalance();
    row.querySelector("[data-payment-amount]")?.focus();
  }

  function renumberPaymentRows() {
    paymentRows?.querySelectorAll("[data-payment-row]").forEach((row, index) => {
      const suffix = index + 1;
      const content = row.querySelector(".sched-scope-trip__payment-content");
      const methodLabel = row.querySelector("[data-payment-method-label]");
      if (methodLabel) methodLabel.id = `rpm-payment-label-${suffix}`;
      if (content) content.setAttribute("aria-labelledby", `rpm-payment-label-${suffix}`);
      const method = row.querySelector("[data-payment-method]");
      const date = row.querySelector("[data-payment-date]");
      const ref = row.querySelector("[data-payment-ref]");
      const amount = row.querySelector("[data-payment-amount]");
      if (method) method.id = `rpm-payment-method-${suffix}`;
      if (date) date.id = `rpm-payment-date-${suffix}`;
      if (ref) ref.id = `rpm-payment-ref-${suffix}`;
      if (amount) amount.id = `rpm-payment-amount-${suffix}`;
    });
  }

  function deletePaymentRow(row) {
    if (!paymentRows || !row) return;
    const hasData = Array.from(row.querySelectorAll("input")).some((el) => el.type !== "hidden" && el.value);
    if (hasData && !confirm("Delete this payment?")) return;
    row.remove();
    renumberPaymentRows();
    syncPaymentButtons();
    syncBalance();
  }

  const paymentMenuEl = document.createElement("div");
  paymentMenuEl.className = "rux-menu rux-popover";
  paymentMenuEl.hidden = true;
  paymentMenuEl.setAttribute("role", "menu");
  paymentMenuEl.addEventListener("rux:menu-closed", () => { paymentMenuEl.innerHTML = ""; });
  document.body.appendChild(paymentMenuEl);

  function closePaymentMenu() {
    if (paymentMenuEl.hidden) return;
    window.RuxMenu.close(paymentMenuEl, { restoreFocus: false });
  }
  function openPaymentMenu() {
    paymentMenuEl.innerHTML = PAYMENT_METHODS
      .map((m) => `<button type="button" class="rux-menu__item" role="menuitem" data-payment-method-choice="${m.value}"><span class="rux-icon" aria-hidden="true">${m.icon}</span>${escHtml(m.label)}</button>`)
      .join("");
    window.RuxMenu.open(paymentAddBtn, paymentMenuEl, { placement: "bottom-end" });
    paymentAddBtn?.setAttribute("aria-expanded", "true");
  }

  paymentRows?.addEventListener("focusout", (event) => {
    if (event.target.matches("[data-payment-amount]")) formatPaymentAmount(event.target);
  });
  paymentRows?.addEventListener("input", (event) => {
    if (event.target.closest("[data-payment-row]")) syncBalance();
  });
  paymentRows?.addEventListener("change", (event) => {
    if (event.target.matches("[data-payment-date]")) syncPaymentDateLabel(event.target);
  });
  paymentRows?.addEventListener("click", (event) => {
    const selectBtn = event.target.closest("[data-payment-select]");
    if (selectBtn) deletePaymentRow(selectBtn.closest("[data-payment-row]"));
  });
  paymentAddBtn?.addEventListener("click", () => {
    if (!paymentMenuEl.hidden) { closePaymentMenu(); return; }
    openPaymentMenu();
  });
  paymentMenuEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-payment-method-choice]");
    if (!btn) return;
    closePaymentMenu();
    addPaymentRow(btn.dataset.paymentMethodChoice);
  });
  function resetPaymentRows() {
    if (!paymentRows) return;
    paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
    syncPaymentButtons();
  }

  function collectPayments() {
    const rows = paymentRows?.querySelectorAll("[data-payment-row]") || [];
    return Array.from(rows).map((row, i) => ({
      position: i,
      amount: parseFloat(row.querySelector("[data-payment-amount]")?.value) || null,
      method: row.querySelector("[data-payment-method]")?.value || null,
      date: row.querySelector("[data-payment-date]")?.value || null,
      ref: row.querySelector("[data-payment-ref]")?.value?.trim() || null,
    })).filter((p) => p.amount || p.method || p.date || p.ref);
  }

  function populatePayments(payments) {
    const sorted = [...(payments || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    sorted.forEach((payment, i) => {
      const row = createPaymentRow(i);
      setPaymentRowMethod(row, payment.method);
      paymentRows.appendChild(row);
      const amountEl = row.querySelector("[data-payment-amount]");
      if (payment.amount != null) { amountEl.value = payment.amount; formatPaymentAmount(amountEl); }
      const dateEl = row.querySelector("[data-payment-date]");
      if (payment.date) dateEl.value = payment.date;
      syncPaymentDateLabel(dateEl);
      if (payment.ref) row.querySelector("[data-payment-ref]").value = payment.ref;
    });
    syncPaymentButtons();
  }

  // ── Owed / Balance / payment-status ──────────────────────────────────────

  function syncBalance() {
    const owed = parseFloat(owedInput.value) || 0;
    const paid = sumPayments(collectPayments());
    if (balanceOutput) balanceOutput.textContent = fmtMoney(owed - paid);
    const meta = STATUS_META[statusKey(owed, paid)];
    statusBadge.className = `rux-badge ${meta.cls}`;
    statusBadge.textContent = meta.label;
  }
  owedInput?.addEventListener("input", syncBalance);

  // ── Ticket options (populates the Owed picker) ───────────────────────────

  function populateTicketOptionSelect() {
    if (!ticketOptionSelect) return;
    ticketOptionSelect.innerHTML = `<option value="">Manual amount</option>` +
      ticketOptions.map((o) => `<option value="${o.id}">${escHtml(o.label || "Option")} — ${fmtMoney(o.price)}</option>`).join("");
    window.Rux?.syncSelectPlaceholders?.(passengerCard);
  }

  ticketOptionSelect?.addEventListener("change", () => {
    const option = ticketOptions.find((o) => o.id === ticketOptionSelect.value);
    if (option) {
      owedInput.value = Number(option.price || 0).toFixed(2);
      syncBalance();
    }
  });

  async function loadTicketOptions(tripId) {
    await ensureDb();
    try {
      ticketOptions = await db.fetchTicketOptions(tripId);
    } catch (err) {
      console.error("fetchTicketOptions failed:", err);
      ticketOptions = [];
    }
    populateTicketOptionSelect();
  }

  async function loadCapacity(tripId) {
    await ensureDb();
    try {
      capacityTotal = await db.fetchTripCapacity(tripId);
    } catch (err) {
      console.error("fetchTripCapacity failed:", err);
      capacityTotal = 0;
    }
  }

  // ── Row rendering ─────────────────────────────────────────────────────────

  function renderRows() {
    manifestBody.innerHTML = "";
    if (!allPassengers.length) {
      manifestBody.innerHTML =
        `<tr><td colspan="8" class="trips-app__empty">No passengers yet — add one to get started.</td></tr>`;
      return;
    }
    allPassengers.forEach((p) => {
      const owed = Number(p.amount_owed) || 0;
      const paid = sumPayments(p.payments);
      const statusMeta = PASSENGER_STATUS_META[p.status || "active"] || PASSENGER_STATUS_META.active;
      const tr = document.createElement("tr");
      tr.className = "trips-app__row";
      tr.tabIndex = 0;
      tr.dataset.id = p.id;
      tr.innerHTML = `
        <td>${escHtml(p.name) || "—"}</td>
        <td>${escHtml(p.phone) || "—"}</td>
        <td>${escHtml(p.group_label) || "—"}</td>
        <td>${escHtml(p.seat) || "—"}</td>
        <td class="col-owed">${fmtMoney(owed)}</td>
        <td class="col-paid">${fmtMoney(paid)}</td>
        <td class="col-balance">${fmtMoney(owed - paid)}</td>
        <td><span class="rux-badge rux-badge--dot ${statusMeta.cls}">${statusMeta.label}</span></td>
      `;
      tr.addEventListener("click", () => selectRow(p));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectRow(p); }
      });
      manifestBody.appendChild(tr);
    });
  }

  // ── Manifest Status summary ("N of M paid" / "X of Y seats filled") ─────

  function renderSummary() {
    const active = allPassengers.filter((p) => (p.status || "active") === "active");
    const paidCount = active.filter((p) => statusKey(Number(p.amount_owed) || 0, sumPayments(p.payments)) === "paid").length;
    if (summaryPaidEl) summaryPaidEl.textContent = `${paidCount} of ${active.length} paid`;
    if (summarySeatsEl) {
      summarySeatsEl.textContent = capacityTotal > 0
        ? `${active.length} of ${capacityTotal} seats filled`
        : "No bus assigned";
    }
  }

  // ── Right-panel form ─────────────────────────────────────────────────────

  function populateForm(p) {
    titleEl.textContent = p.name || "Passenger";
    nameInput.value = p.name || "";
    phoneInput.value = p.phone || "";
    groupInput.value = p.group_label || "";
    seatInput.value = p.seat || "";
    pickupInput.value = p.pickup_location || "";
    newCustomerInput.checked = p.is_new_customer !== false;
    emailInput.value = p.email || "";
    addressInput.value = p.address || "";
    dobInput.value = p.dob || "";
    notesInput.value = p.notes || "";
    statusSelect.value = p.status || "active";
    ticketOptionSelect.value = p.ticket_option_id || "";
    owedInput.value = p.amount_owed ?? "";
    resetPaymentRows();
    populatePayments(p.payments);
    syncBalance();
    window.Rux?.syncDateInputs(passengerCard);
    window.Rux?.syncSelectPlaceholders?.(passengerCard);
  }

  function selectRow(p) {
    manifestBody.querySelectorAll(".trips-app__row").forEach((r) => r.removeAttribute("aria-current"));
    manifestBody.querySelector(`[data-id="${p.id}"]`)?.setAttribute("aria-current", "true");
    selectedId = p.id;
    deleteBtn.disabled = false;
    populateForm(p);
    openPassengerPanel();
  }

  function clearForm() {
    selectedId = null;
    deleteBtn.disabled = true;
    titleEl.textContent = "New passenger";
    [nameInput, phoneInput, groupInput, seatInput, pickupInput, emailInput, addressInput, dobInput, notesInput, owedInput]
      .forEach((f) => { if (f) f.value = ""; });
    newCustomerInput.checked = true;
    statusSelect.value = "active";
    ticketOptionSelect.value = "";
    resetPaymentRows();
    syncBalance();
    window.Rux?.syncSelectPlaceholders?.(passengerCard);
    manifestBody.querySelectorAll(".trips-app__row").forEach((r) => r.removeAttribute("aria-current"));
  }

  clearBtn?.addEventListener("click", clearForm);

  function readForm() {
    const payments = collectPayments();
    return {
      name: nameInput.value.trim() || null,
      phone: phoneInput.value.trim() || null,
      group_label: groupInput.value.trim() || null,
      seat: seatInput.value.trim() || null,
      pickup_location: pickupInput.value.trim() || null,
      is_new_customer: newCustomerInput.checked,
      email: emailInput.value.trim() || null,
      address: addressInput.value.trim() || null,
      dob: dobInput.value || null,
      notes: notesInput.value.trim() || null,
      status: statusSelect.value || "active",
      ticket_option_id: ticketOptionSelect.value || null,
      amount_owed: parseFloat(owedInput.value) || null,
      amount_paid: sumPayments(payments) || null,
      payments,
    };
  }

  // ── Save / Delete ─────────────────────────────────────────────────────────
  // Both use manifestTripId (captured once by refresh(), below) — never a
  // live getCurrentTripId() re-read — so a passenger always lands on the
  // trip this window is actually showing, even if the trip panel has since
  // moved on to editing something else in the background.

  saveBtn?.addEventListener("click", async () => {
    const tripId = manifestTripId;
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
      closePassengerPanel();
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
      closePassengerPanel();
    } catch (err) {
      console.error("Could not delete passenger:", err);
    } finally {
      deleteBtn.disabled = false;
    }
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadPassengers() {
    const tripId = manifestTripId;
    if (!tripId) { allPassengers = []; renderRows(); renderSummary(); return; }
    await ensureDb();
    try {
      allPassengers = await db.fetchPassengers(tripId);
      renderRows();
      renderSummary();
    } catch (err) {
      console.error("fetchPassengers failed:", err);
      manifestBody.innerHTML =
        `<tr><td colspan="8" class="trips-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
    }
  }

  // ── Drift watchdog + open ────────────────────────────────────────────────
  // watchForDrift() is passive — it runs on every trip-panel load/save/clear/
  // delete event (and Billing-type toggle) REGARDLESS of whether the
  // manifest is open, and only acts if it is: closes the window the moment
  // the panel stops matching manifestTripId (wrong billing type, OR — just
  // as important — a *different* trip entirely, even one that's also
  // ticketed). It deliberately never sets manifestTripId itself; only an
  // explicit refresh() (an actual open) binds the window to a trip, so a
  // background event can't quietly "adopt" whatever's loaded as this
  // window's new trip.
  async function watchForDrift() {
    if (window.TripView?.get() !== "manifest" || !manifestTripId) return;
    const { getCurrentTripId } = await ensureTripDb();
    const liveTripId = getCurrentTripId();
    const billingType = window.TripPanel?.getBillingType(tripPanelRoot);
    if (liveTripId !== manifestTripId || billingType !== "ticketed") {
      window.TripView.set("calendar");
    }
  }

  // explicitTrip (optional): { id, is_self_organized } straight from a trip
  // bar/trip object — lets the trip-bar shortcut open the manifest without
  // running the trip panel's full loadTrip() first (dates, contacts,
  // documents, requirements, fleet — none of which the manifest needs).
  // Omit it (the Billing tab's own manifest toggle does) to fall back to
  // whatever's actually loaded in the trip panel right now.
  async function refresh(explicitTrip) {
    let tripId;
    let billingType;
    if (explicitTrip) {
      tripId = explicitTrip.id;
      billingType = explicitTrip.is_self_organized ? "ticketed" : "charter";
    } else {
      const { getCurrentTripId } = await ensureTripDb();
      tripId = getCurrentTripId();
      billingType = window.TripPanel?.getBillingType(tripPanelRoot);
    }
    const available = !!tripId && billingType === "ticketed";
    if (!available) {
      // Nothing valid to bind to — don't leave the window open on a stale
      // or now-invalid trip.
      manifestTripId = null;
      window.TripView?.set("calendar");
      return;
    }
    manifestTripId = tripId;
    clearForm();
    closePassengerPanel();
    await Promise.all([loadPassengers(), loadTicketOptions(manifestTripId), loadCapacity(manifestTripId)]);
    renderSummary();
  }

  window.TripManifest = { refresh };

  tripPanelRoot?.addEventListener("rux:trip-loaded", watchForDrift);
  tripPanelRoot?.addEventListener("rux:trip-saved", watchForDrift);
  tripPanelRoot?.addEventListener("rux:trip-cleared", watchForDrift);
  tripPanelRoot?.addEventListener("rux:trip-cancelled", watchForDrift);
  tripPanelRoot?.addEventListener("click", (e) => {
    if (e.target.closest("#tp-billing-type-group")) {
      requestAnimationFrame(watchForDrift);
    }
  });
})();
