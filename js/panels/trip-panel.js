/* ==========================================================================
   RUX UI — TRIP PANEL
   --------------------------------------------------------------------------
   Initializes the trip editor panel: tabs, color picker, requirements,
   bus groups, driver role toggles, and document upload.

   API
   ---
   initTripPanel(root)   → wire up a .trip-panel element
   renderRequirements()  → render toggle chips into a container
   renderBusGroups()     → render bus assignment cards into #tp-bus-groups
   buildBusGroup(idx)    → build and return a single bus group card element

   Dependencies: lucide, utilities.js
   ========================================================================== */

/* ── Config ─────────────────────────────────────────────────────────────── */

/* Static fallback used before window.appRequirements loads. */
const DEFAULT_REQUIREMENTS = [
	{ id: "sleeper",  label: "Sleeper",   icon: "bed",           type: "vehicle", active: true },
	{ id: "pax56",    label: "56 pax",    icon: "users",         type: "vehicle", active: true },
	{ id: "adaLift",  label: "ADA lift",  icon: "accessibility", type: "vehicle", active: true },
	{ id: "hotel",    label: "Hotel",     icon: "building",      type: "driver",  active: true },
	{ id: "fuelCard", label: "Fuel card", icon: "credit-card",   type: "driver",  active: true },
];

function activeReqsByType(type) {
	return (window.appRequirements ?? DEFAULT_REQUIREMENTS)
		.filter(r => r.type === type && r.active)
		.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function escHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/* ── Renderers ──────────────────────────────────────────────────────────── */

function renderRequirements(container, items, { block = true } = {}) {
	container.innerHTML = items
		.map(
			(req) =>
				`<button class="rux-button rux-button--toggle${block ? " rux-button--block" : ""}" data-rux-toggle-button aria-pressed="false" data-req="${escHtml(req.id ?? req.key)}" title="${escHtml(req.label)}">
					<i data-lucide="${escHtml(req.icon)}" class="rux-icon"></i><span class="rux-btn-label"> ${escHtml(req.label)}</span>
				</button>`,
		)
		.join("");
}

function busOptsHtml(buses) {
	return buses.map((b) => `<option value="${escHtml(b.id)}">${escHtml(b.number)}</option>`).join("");
}

function driverOptsHtml(drivers) {
	return `<option value="" disabled selected>Assign driver…</option>` +
		drivers.map((d) => `<option value="${escHtml(d.id)}">${escHtml(d.name)}</option>`).join("");
}

function refreshGroupOptions(group, buses, drivers) {
	const busOpts   = busOptsHtml(buses);
	const driverOpts = driverOptsHtml(drivers);
	group.querySelectorAll("select[name]").forEach(select => {
		const prev = select.value;
		select.innerHTML = select.name.endsWith(".busId")
			? `<option value="" disabled selected>Select bus…</option>${busOpts}`
			: driverOpts;
		select.value = prev;
	});
}

function buildBusGroup(idx, buses, drivers) {
	const busOpts    = busOptsHtml(buses);
	const driverOpts = driverOptsHtml(drivers);

	const roleRows = [
		{ role: "coDriver", icon: "user-plus", title: "Co-driver" },
		{ role: "relief1", icon: "refresh-ccw", title: "Relief 1 — start" },
		{ role: "relief2", icon: "refresh-cw", title: "Relief 2 — end" },
	]
		.map(
			(r) => `
    <div class="rux-trip-panel__driver-row" data-role-row="${escHtml(r.role)}" hidden>
      <span class="rux-trip-panel__role-label" title="${escHtml(r.title)}">
        <i data-lucide="${escHtml(r.icon)}" class="rux-icon"></i>
      </span>
      <select class="rux-select" name="buses[${idx}].${escHtml(r.role)}.name">${driverOpts}</select>
      <div class="rux-input-group rux-input-group--prefix">
        <span class="rux-input-group__prefix">$</span>
        <input class="rux-input" name="buses[${idx}].${escHtml(r.role)}.pay" type="number" min="0" placeholder="0" />
      </div>
    </div>`,
		)
		.join("");

	const el = document.createElement("div");
	el.className = "rux-trip-panel__bus-group";
	el.innerHTML = `
    <div class="rux-trip-panel__bus-head">
      <span class="rux-trip-panel__bus-badge">${idx + 1}</span>
      <select class="rux-select" name="buses[${idx}].busId" style="flex:1;">
        <option value="" disabled selected>Select bus…</option>
        ${busOpts}
      </select>
      <button class="rux-button rux-button--toggle rux-button--icon" aria-pressed="false" data-role="coDriver" title="Co-driver">
        <i data-lucide="user-plus" class="rux-icon"></i>
      </button>
      <button class="rux-button rux-button--toggle rux-button--icon" aria-pressed="false" data-role="relief1" title="Relief 1 — start">
        <i data-lucide="chevrons-right" class="rux-icon"></i>
      </button>
      <button class="rux-button rux-button--toggle rux-button--icon" aria-pressed="false" data-role="relief2" title="Relief 2 — end">
        <i data-lucide="chevrons-left" class="rux-icon"></i>
      </button>
    </div>
    <div class="rux-trip-panel__driver-rows">
      <div class="rux-trip-panel__driver-row">
        <span class="rux-trip-panel__role-label" title="Driver">
          <i data-lucide="user" class="rux-icon"></i>
        </span>
        <select class="rux-select" name="buses[${idx}].driver.name">${driverOpts}</select>
        <div class="rux-input-group rux-input-group--prefix">
          <span class="rux-input-group__prefix">$</span>
          <input class="rux-input" name="buses[${idx}].driver.pay" type="number" min="0" placeholder="0" />
        </div>
      </div>
      ${roleRows}
    </div>`;
	return el;
}

function renderBusGroups(container, n, buses, drivers) {
	const current = container.querySelectorAll(".rux-trip-panel__bus-group").length;
	if (n > current) {
		// Add new groups at the end — never touch existing ones
		for (let i = current; i < n; i++) {
			container.appendChild(buildBusGroup(i, buses, drivers));
		}
		if (window.lucide) lucide.createIcons();
	} else if (n < current) {
		// Remove from the end
		const groups = container.querySelectorAll(".rux-trip-panel__bus-group");
		for (let i = current - 1; i >= n; i--) {
			groups[i].remove();
		}
	}
}

function setTripOptions(root, { buses = [], drivers = [] } = {}) {
	root.__ruxTripPanelOptions = { buses, drivers };
}

function getTripOptions(root) {
	return root.__ruxTripPanelOptions || { buses: [], drivers: [] };
}

function updateTripOptions(root, options = {}) {
	setTripOptions(root, options);

	const busGroupsEl = root.querySelector("#tp-bus-groups");
	const busesInput = root.querySelector("#tp-buses");
	if (!busGroupsEl || !busesInput) return;

	const { buses, drivers } = getTripOptions(root);

	// Refresh option lists in existing groups without disturbing selected values
	busGroupsEl.querySelectorAll(".rux-trip-panel__bus-group").forEach(group => {
		refreshGroupOptions(group, buses, drivers);
	});

	// Add or remove groups to match the current count
	const n = Math.max(1, Math.min(20, parseInt(busesInput.value, 10) || 1));
	renderBusGroups(busGroupsEl, n, buses, drivers);
}

function formatMoney(value) {
	const number = Number.parseFloat(value);
	const amount = Number.isFinite(number) ? number : 0;
	const sign = amount < 0 ? "-" : "";
	return `${sign}$${Math.abs(amount).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function localIsoDate(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(value) {
	if (!value) return "—";
	const [year, month, day] = value.split("-");
	return year && month && day ? `${month}/${day}/${year}` : value;
}

function initBillingWorkflow(root) {
	const toggles = root.querySelectorAll("[data-billing-toggle]");
	const priceEl = root.querySelector("#tp-price");
	const totalPaid = root.querySelector("#tp-total-paid");
	const balanceDue = root.querySelector("#tp-balance-due");
	const balancePaidEl = root.querySelector("#tp-balance-paid");
	const datePaidEl = root.querySelector("#tp-date-paid");
	const paymentRows = root.querySelector("#tp-payment-rows");
	const addPaymentBtn = root.querySelector("[data-payment-add]");

	if (!toggles.length && !balanceDue && !paymentRows) return;
	window.RuxBilling?.applyToTripPanel?.(root);

	const readMoney = (el) => {
		const value = Number.parseFloat(el?.value);
		return Number.isFinite(value) ? value : 0;
	};
	const paymentMethodOptions = () => `
		<option value="">Method</option>
		<option value="Cash">Cash</option>
		<option value="Check">Check</option>
		<option value="Card">Card</option>
		<option value="ACH">ACH</option>
		<option value="Zelle">Zelle</option>
		<option value="Other">Other</option>`;
	const paymentRowCount = () => paymentRows?.querySelectorAll("[data-payment-row]").length || 0;
	const createPaymentRow = (index) => {
		const row = document.createElement("div");
		row.className = "rux-trip-panel__payment-row";
		row.dataset.paymentRow = "";
		row.innerHTML = `
			<div class="rux-input-group rux-input-group--prefix rux-input-group--suffix rux-input-group--action">
				<span class="rux-input-group__prefix">$</span>
				<input class="rux-input" id="tp-payment-amount-${index + 1}" name="payments[${index}].amount" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" />
				<span class="rux-input-group__suffix"><button class="rux-trip-panel__payment-fill" type="button" data-payment-fill title="Fill remaining balance"><i data-lucide="circle-check" class="rux-icon"></i></button></span>
			</div>
			<input class="rux-input" id="tp-payment-date-${index + 1}" name="payments[${index}].date" data-payment-date type="date" aria-label="Payment date" />
			<select class="rux-select" id="tp-payment-method-${index + 1}" name="payments[${index}].method" data-payment-method aria-label="Payment method">${paymentMethodOptions()}</select>
			<input class="rux-input" id="tp-payment-ref-${index + 1}" name="payments[${index}].ref" data-payment-ref type="text" placeholder="Ref / note" />`;
		return row;
	};
	const ensurePaymentRows = (count) => {
		if (!paymentRows) return;
		while (paymentRowCount() < count) {
			paymentRows.appendChild(createPaymentRow(paymentRowCount()));
		}
	};
	const renumberPaymentRows = () => {
		paymentRows?.querySelectorAll("[data-payment-row]").forEach((row, index) => {
			const amount = row.querySelector("[data-payment-amount]");
			const method = row.querySelector("[data-payment-method]");
			const date = row.querySelector("[data-payment-date]");
			const ref = row.querySelector("[data-payment-ref]");
			if (amount) {
				amount.id = `tp-payment-amount-${index + 1}`;
				amount.name = `payments[${index}].amount`;
			}
			if (method) {
				method.id = `tp-payment-method-${index + 1}`;
				method.name = `payments[${index}].method`;
			}
			if (date) {
				date.id = `tp-payment-date-${index + 1}`;
				date.name = `payments[${index}].date`;
			}
			if (ref) {
				ref.id = `tp-payment-ref-${index + 1}`;
				ref.name = `payments[${index}].ref`;
			}
		});
	};
	const removePaymentBtn = root.querySelector("[data-payment-remove]");
	const updatePaymentButtons = () => {
		if (removePaymentBtn) removePaymentBtn.disabled = paymentRowCount() === 0;
		if (addPaymentBtn) addPaymentBtn.disabled = Array.from(paymentRows?.querySelectorAll("[data-payment-row]") || []).some((row) => !row.querySelector("[data-payment-amount]")?.value);
	};
	const readPayments = () =>
		Array.from(paymentRows?.querySelectorAll("[data-payment-row]") || []).map((row) => ({
			amount: readMoney(row.querySelector("[data-payment-amount]")),
			method: row.querySelector("[data-payment-method]")?.value.trim() || "",
			date: row.querySelector("[data-payment-date]")?.value.trim() || "",
			ref: row.querySelector("[data-payment-ref]")?.value.trim() || "",
		}));
	const sync = () => {
		const price = readMoney(priceEl);
		const payments = readPayments();
		const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
		const balance = price - paid;
		const latestPaymentDate = payments
			.filter((payment) => payment.amount > 0 && payment.date)
			.map((payment) => payment.date)
			.sort()
			.pop() || "";
		const fullyPaid = price > 0 && balance <= 0;
		updatePaymentButtons();

		if (totalPaid) totalPaid.textContent = formatMoney(paid);
		if (balanceDue) {
			balanceDue.textContent = formatMoney(balance);
			balanceDue.classList.toggle("is-negative", balance < 0);
		}
if (balancePaidEl) balancePaidEl.checked = fullyPaid;
		if (datePaidEl) datePaidEl.value = fullyPaid ? latestPaymentDate : "";
		paymentRows?.querySelectorAll("[data-payment-fill]").forEach((btn) => { btn.disabled = price <= 0; });

		toggles.forEach((toggle) => {
			const enabled = toggle.checked;
			const step = toggle.closest("[data-billing-step]");
			step?.classList.toggle("is-enabled", enabled);

			(toggle.dataset.billingControls || "")
				.split(/\s+/)
				.filter(Boolean)
				.forEach((id) => {
					const control = root.querySelector(`#${id}`);
					if (control) control.disabled = !enabled;
				});
		});

		window.Rux?.syncDateInputs(root);
	};

	toggles.forEach((toggle) => toggle.addEventListener("change", sync));
	priceEl?.addEventListener("input", sync);
	paymentRows?.addEventListener("input", (event) => {
		if (event.target.closest("[data-payment-row]")) paymentRows.dataset.paymentsTouched = "true";
		sync();
	});
	paymentRows?.addEventListener("change", (event) => {
		if (event.target.closest("[data-payment-row]")) paymentRows.dataset.paymentsTouched = "true";
		sync();
	});
	removePaymentBtn?.addEventListener("click", () => {
		if (!paymentRows || removePaymentBtn.disabled) return;
		const rows = paymentRows.querySelectorAll("[data-payment-row]");
		const lastRow = rows[rows.length - 1];
		if (!lastRow) return;
		const hasData = Array.from(lastRow.querySelectorAll("input, select")).some((el) => el.value);
		if (hasData && !confirm("Delete this payment?")) return;
		lastRow.remove();
		paymentRows.dataset.paymentsTouched = "true";
		renumberPaymentRows();
		updatePaymentButtons();
		sync();
	});
	paymentRows?.addEventListener("click", (event) => {
		const fillBtn = event.target.closest("[data-payment-fill]");
		if (fillBtn) {
			const price = readMoney(priceEl);
			if (!price) return;
			const payments = readPayments();
			const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
			const remaining = Math.max(0, price - paid);
			if (remaining > 0) {
				const row = fillBtn.closest("[data-payment-row]");
				row.querySelector("[data-payment-amount]").value = remaining;
				const dateInput = row.querySelector("[data-payment-date]");
				if (dateInput && !dateInput.value) dateInput.value = localIsoDate();
			}
			paymentRows.dataset.paymentsTouched = "true";
			sync();
		}
	});
	addPaymentBtn?.addEventListener("click", () => {
		const emptyRow = Array.from(paymentRows?.querySelectorAll("[data-payment-row]") || []).find((row) => !row.querySelector("[data-payment-amount]")?.value);
		if (emptyRow) {
			emptyRow.querySelector("[data-payment-amount]")?.focus();
			return;
		}
		ensurePaymentRows(paymentRowCount() + 1);
		const newRow = paymentRows?.querySelector("[data-payment-row]:last-child");
		const dateInput = newRow?.querySelector("[data-payment-date]");
		if (dateInput) dateInput.value = localIsoDate();
		paymentRows.dataset.paymentsTouched = "true";
		updatePaymentButtons();
		if (window.lucide) lucide.createIcons();
		newRow?.querySelector("[data-payment-amount]")?.focus();
	});
	root.addEventListener("rux:payments-loaded", (event) => {
		if (!paymentRows) return;
		const payments = (event.detail?.payments || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
		for (const payment of payments) {
			ensurePaymentRows(paymentRowCount() + 1);
			const row = paymentRows.querySelector("[data-payment-row]:last-child");
			const amountEl = row.querySelector("[data-payment-amount]");
			const dateEl = row.querySelector("[data-payment-date]");
			const methodEl = row.querySelector("[data-payment-method]");
			const refEl = row.querySelector("[data-payment-ref]");
			if (amountEl && payment.amount) amountEl.value = payment.amount;
			if (dateEl && payment.date) dateEl.value = payment.date;
			if (methodEl && payment.method) methodEl.value = payment.method;
			if (refEl && payment.ref) refEl.value = payment.ref;
		}
		if (window.lucide) lucide.createIcons();
		updatePaymentButtons();
		sync();
	});
	root.addEventListener("rux:trip-cleared", () => {
		if (!paymentRows) return;
		paymentRows.dataset.paymentsTouched = "true";
		paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
		sync();
	});
	document.addEventListener("settings:billing", () => {
		window.RuxBilling?.applyToTripPanel?.(root);
		sync();
	});
	sync();
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

function initTripTabs(root) {
	const tabs = root.querySelector("[data-trip-tabs]");
	if (tabs?.dataset.ruxTripTabsInit === "true") return;
	if (tabs) tabs.dataset.ruxTripTabsInit = "true";

	const allPanes = root.querySelectorAll(".rux-trip-panel__pane");
	const allTabBtns = root.querySelectorAll(".rux-trip-panel__tabs .rux-button[aria-controls]");
	allTabBtns.forEach((btn) => {
		btn.addEventListener("click", () => {
			const panelId = btn.getAttribute("aria-controls");
			if (!panelId) return;
			allTabBtns.forEach((b) => {
				b.classList.remove("is-active");
				b.setAttribute("aria-selected", "false");
			});
			btn.classList.add("is-active");
			btn.setAttribute("aria-selected", "true");
			allPanes.forEach((p) => {
				p.hidden = p.id !== panelId;
			});
		});
	});

	const activeTab =
		root.querySelector(".rux-trip-panel__tabs .rux-button[aria-controls][aria-selected='true']") ||
		allTabBtns[0];

	if (activeTab) {
		allTabBtns.forEach((btn) => {
			const isActive = btn === activeTab;
			btn.classList.toggle("is-active", isActive);
			btn.setAttribute("aria-selected", String(isActive));
		});

		const activePaneId = activeTab.getAttribute("aria-controls");
		allPanes.forEach((p) => {
			p.hidden = p.id !== activePaneId;
		});
	}
}

/* ── Init ───────────────────────────────────────────────────────────────── */

function initTripPanel(root, { buses = [], drivers = [] } = {}) {
	initTripTabs(root);
	setTripOptions(root, { buses, drivers });
	if (root.dataset.ruxTripPanelInit === "true") {
		updateTripOptions(root, { buses, drivers });
		return;
	}
	root.dataset.ruxTripPanelInit = "true";

	/* ── Segmented toggle groups (Billing) ─────────────────────────────── */

	root.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
		group.addEventListener("click", (e) => {
			const btn = e.target.closest(".rux-button");
			if (!btn || !group.contains(btn)) return;
			group.querySelectorAll(".rux-button").forEach((b) => {
				b.setAttribute("aria-pressed", "false");
				b.classList.remove("is-active");
			});
			btn.setAttribute("aria-pressed", "true");
			btn.classList.add("is-active");
		});
	});

	initBillingWorkflow(root);

	/* ── Requirements ───────────────────────────────────────────────────── */

	const vehicleReqContainer = root.querySelector("#tp-vehicle-reqs");
	const driverNeedsContainer = root.querySelector("#tp-driver-needs");
	if (vehicleReqContainer || driverNeedsContainer) {
		if (vehicleReqContainer) renderRequirements(vehicleReqContainer, activeReqsByType("vehicle"));
		if (driverNeedsContainer) renderRequirements(driverNeedsContainer, activeReqsByType("driver"), { block: false });
		if (window.lucide) lucide.createIcons();
	}

	/* ── Documents ────────────────────────────────────────────────────────── */

	const docUploadBtn = root.querySelector("#tp-doc-upload-btn");
	const docFileInput = root.querySelector("#tp-doc-file-input");
	const docLabelPick = root.querySelector("#tp-doc-label-pick");
	const docLabelSel = root.querySelector("#tp-doc-label-select");
	const docAddBtn = root.querySelector("#tp-doc-add-btn");
	const docCancelBtn = root.querySelector("#tp-doc-cancel-btn");
	const docList = root.querySelector("#tp-doc-list");

	if (docUploadBtn && docFileInput) {
		docUploadBtn.addEventListener("click", () => docFileInput.click());

		docFileInput.addEventListener("change", () => {
			if (!docFileInput.files.length) return;
			docLabelSel.value = "";
			docLabelPick.hidden = false;
		});

		docCancelBtn?.addEventListener("click", () => {
			docLabelPick.hidden = true;
			docFileInput.value = "";
		});

		docAddBtn?.addEventListener("click", () => {
			const file = docFileInput.files[0];
			const label = docLabelSel.value;
			if (!file || !label) return;

			const li = document.createElement("li");
			li.className = "rux-trip-panel__doc-row";
			li.innerHTML = `
        <span class="rux-trip-panel__doc-chip">${escHtml(label)}</span>
        <span class="rux-trip-panel__doc-name">${escHtml(file.name)}</span>
        <button class="rux-button rux-button--ghost rux-button--sm" type="button">Open</button>
        <button class="rux-button rux-button--ghost rux-button--sm rux-button--icon" type="button" aria-label="Delete">
          <i data-lucide="trash-2" class="rux-icon"></i>
        </button>`;
			li.querySelector('[aria-label="Delete"]').addEventListener("click", () => li.remove());
			docList?.appendChild(li);
			if (window.lucide) lucide.createIcons();

			docLabelPick.hidden = true;
			docFileInput.value = "";
		});

		docList?.addEventListener("click", (e) => {
			const del = e.target.closest('[aria-label="Delete"]');
			if (del) del.closest(".rux-trip-panel__doc-row")?.remove();
		});
	}

	/* ── Bus groups ───────────────────────────────────────────────────────── */

	const busGroupsEl = root.querySelector("#tp-bus-groups");
	const busesInput = root.querySelector("#tp-buses");

	if (busGroupsEl && busesInput) {
		const busCountDecBtn = root.querySelector("[data-bus-count-dec]");
		const busCountIncBtn = root.querySelector("[data-bus-count-inc]");
		const minBusCount = parseInt(busesInput.min, 10) || 1;
		const maxBusCount = parseInt(busesInput.max, 10) || 20;
		const clampBusCount = (value) => Math.max(minBusCount, Math.min(maxBusCount, parseInt(value, 10) || minBusCount));
		const syncBusCountButtons = (value = busesInput.value) => {
			const n = clampBusCount(value);
			if (busCountDecBtn) busCountDecBtn.disabled = n <= minBusCount;
			if (busCountIncBtn) busCountIncBtn.disabled = n >= maxBusCount;
		};

		updateTripOptions(root);
		syncBusCountButtons();

		root.querySelectorAll("[data-bus-count-dec], [data-bus-count-inc]").forEach((btn) => {
			btn.addEventListener("click", () => {
				const direction = btn.hasAttribute("data-bus-count-inc") ? 1 : -1;
				busesInput.value = String(clampBusCount((parseInt(busesInput.value, 10) || minBusCount) + direction));
				busesInput.dispatchEvent(new Event("input", { bubbles: true }));
			});
		});

		busesInput.addEventListener("input", () => {
			if (busesInput.value === "") {
				syncBusCountButtons();
				return;
			}
			const n = clampBusCount(busesInput.value);
			if (busesInput.value !== String(n)) busesInput.value = String(n);
			const { buses, drivers } = getTripOptions(root);
			renderBusGroups(busGroupsEl, n, buses, drivers);
			syncBusCountButtons(n);
		});

		busesInput.addEventListener("change", () => {
			const n = clampBusCount(busesInput.value);
			busesInput.value = String(n);
			busesInput.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// Role toggles — show/hide co-driver, relief 1/2 rows within the same bus group
		busGroupsEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-role]");
			if (!btn) return;
			const group = btn.closest(".rux-trip-panel__bus-group");
			const role = btn.dataset.role;
			const nowActive = btn.getAttribute("aria-pressed") !== "true";
			btn.setAttribute("aria-pressed", String(nowActive));
			btn.classList.toggle("is-active", nowActive);
			const row = group.querySelector(`[data-role-row="${role}"]`);
			if (row) row.hidden = !nowActive;
		});
	}
}

function refreshRequirements(root) {
	const vEl = root.querySelector("#tp-vehicle-reqs");
	const dEl = root.querySelector("#tp-driver-needs");
	if (vEl) renderRequirements(vEl, activeReqsByType("vehicle"));
	if (dEl) renderRequirements(dEl, activeReqsByType("driver"), { block: false });
	if (window.lucide) lucide.createIcons();
}

window.TripPanel = { init: initTripPanel, initTabs: initTripTabs, updateOptions: updateTripOptions, refreshRequirements };
