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
	{ id: "sleeper",  label: "Sleeper",   icon: "airline_seat_flat", type: "vehicle", active: true },
	{ id: "pax56",    label: "56 pax",    icon: "tatami_seat",    type: "vehicle", active: true },
	{ id: "adaLift",  label: "ADA lift",  icon: "accessible",    type: "vehicle", active: true },
	{ id: "hotel",    label: "Hotel",     icon: "apartment",     type: "driver",  active: true },
	{ id: "fuelCard", label: "Fuel card", icon: "local_gas_station", type: "driver",  active: true },
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

const ICON_MAP = {
	"bed": "airline_seat_flat", "users": "tatami_seat", "accessibility": "accessible",
	"building": "apartment", "credit-card": "credit_card", "fuel": "local_gas_station",
	"wifi": "wifi", "zap": "power", "hotel": "apartment", "wrench": "build",
	"tag": "label", "star": "star", "key": "key", "briefcase": "work",
	"user-plus": "person_add", "user": "person",
};
function mapIcon(name) { return ICON_MAP[name] || name; }

function renderRequirements(container, items, { block = true } = {}) {
	container.innerHTML = items
		.map(
			(req) =>
				`<button class="rux-button rux-button--toggle${block ? " rux-button--block" : ""}" data-rux-toggle-button aria-pressed="false" data-req="${escHtml(req.id ?? req.key)}" title="${escHtml(req.label)}">
					<span class="rux-icon">${escHtml(mapIcon(req.icon))}</span><span class="rux-btn-label"> ${escHtml(req.label)}</span>
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
		{ role: "coDriver", icon: "person_add", title: "Co-driver" },
		{ role: "relief1", icon: "last_page", title: "Relief 1 — start" },
		{ role: "relief2", icon: "first_page", title: "Relief 2 — end" },
	]
		.map(
			(r) => `
    <div class="rux-trip-panel__driver-row" data-role-row="${escHtml(r.role)}" hidden>
      <button type="button" class="rux-button rux-button--icon rux-trip-panel__role-label" data-role-key="buses[${idx}].${escHtml(r.role)}.status" title="${escHtml(r.title)}" aria-label="${escHtml(r.title)} status">
        <span class="rux-icon">${escHtml(mapIcon(r.icon))}</span>
      </button>
      <select class="rux-select" name="buses[${idx}].${escHtml(r.role)}.name" aria-label="${escHtml(r.title)}">${driverOpts}</select>
      <div class="rux-input-group rux-input-group--prefix">
        <span class="rux-input-group__prefix">$</span>
        <input class="rux-input" name="buses[${idx}].${escHtml(r.role)}.pay" type="number" min="0" placeholder="0" aria-label="${escHtml(r.title)} pay" />
      </div>
    </div>`,
		)
		.join("");

	const el = document.createElement("div");
	el.className = "rux-trip-panel__bus-group";
	el.innerHTML = `
    <div class="rux-trip-panel__section-head">
      <p class="rux-trip-panel__section-label">Bus ${idx + 1}</p>
    </div>
    <div class="rux-trip-panel__bus-head">
      <select class="rux-select" name="buses[${idx}].busId" aria-label="Bus ${idx + 1}">
        <option value="" disabled selected>Select bus…</option>
        ${busOpts}
      </select>
    </div>
    <div class="rux-trip-panel__bus-roles">
      <button class="rux-button rux-button--toggle" aria-pressed="false" data-role="coDriver" title="Co-driver" aria-label="Co-driver">
        <span class="rux-icon">person_add</span><span class="rux-btn-label">Co-driver</span>
      </button>
      <button class="rux-button rux-button--toggle" aria-pressed="false" data-role="relief1" title="Relief 1 — start" aria-label="Relief 1 — start">
        <span class="rux-icon">last_page</span><span class="rux-btn-label">Relief 1</span>
      </button>
      <button class="rux-button rux-button--toggle" aria-pressed="false" data-role="relief2" title="Relief 2 — end" aria-label="Relief 2 — end">
        <span class="rux-icon">first_page</span><span class="rux-btn-label">Relief 2</span>
      </button>
    </div>
    <div class="rux-trip-panel__driver-rows">
      <div class="rux-trip-panel__driver-row">
        <button type="button" class="rux-button rux-button--icon rux-trip-panel__role-label" data-role-key="buses[${idx}].driver.status" title="Driver" aria-label="Driver status">
          <span class="rux-icon">person</span>
        </button>
        <select class="rux-select" name="buses[${idx}].driver.name" aria-label="Driver">${driverOpts}</select>
        <div class="rux-input-group rux-input-group--prefix">
          <span class="rux-input-group__prefix">$</span>
          <input class="rux-input" name="buses[${idx}].driver.pay" type="number" min="0" placeholder="0" aria-label="Driver pay" />
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

	if (!toggles.length && !balanceDue && !paymentRows) return;
	window.RuxBilling?.applyToTripPanel?.(root);

	const readMoney = (el) => {
		const value = Number.parseFloat(el?.value);
		return Number.isFinite(value) ? value : 0;
	};
	const formatPaymentAmount = (el) => {
		if (!el?.value) return;
		el.value = readMoney(el).toFixed(2);
	};
	const formatCompactPaymentDate = (value) => {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
		if (!match) return "Date";
		return `${match[2]}/${match[3]}/${match[1].slice(-2)}`;
	};
	const syncPaymentDateLabel = (input) => {
		const label = input?.closest(".rux-trip-panel__payment-date-control")?.querySelector("[data-payment-date-label]");
		if (label) label.textContent = formatCompactPaymentDate(input.value);
	};
	const PAYMENT_METHODS = [
		{ value: "Cash", label: "Cash", icon: "universal_currency_alt" },
		{ value: "Check", label: "Check", icon: "checkbook" },
		{ value: "Card", label: "Card", icon: "credit_card" },
		{ value: "ACH", label: "ACH", icon: "account_balance" },
		{ value: "Zelle", label: "Zelle", icon: "bolt" },
		{ value: "Other", label: "Other", icon: "more_horiz" },
	];
	const PAYMENT_METHOD_ICONS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.icon]));
	const paymentRowCount = () => paymentRows?.querySelectorAll("[data-payment-row]").length || 0;
	// Single-line pill: type icon as Reference prefix · date · amount. Method is
	// fixed at creation — picked from the header "+" menu and shown as the
	// icon, not an editable field, consistent with Files (delete + re-add
	// to change the type). Amount reuses the standard .rux-input-group
	// prefix pattern (same as Quoted Price) instead of a bare borderless
	// number — a real bordered field, not a stepper.
	const createPaymentRow = (index) => {
		const row = document.createElement("div");
		row.className = "rux-trip-panel__payment-row";
		row.dataset.paymentRow = "";
		row.innerHTML = `
			<div class="rux-trip-panel__payment-content">
				<div class="rux-trip-panel__payment-reference">
					<span class="rux-icon rux-trip-panel__payment-icon" data-payment-method-icon aria-hidden="true"></span>
					<input type="hidden" data-payment-method id="tp-payment-method-${index + 1}" name="payments[${index}].method" />
					<input class="rux-trip-panel__payment-field rux-trip-panel__payment-input rux-trip-panel__payment-ref" id="tp-payment-ref-${index + 1}" name="payments[${index}].ref" data-payment-ref type="text" placeholder="Reference" aria-label="Reference number" />
				</div>
				<div class="rux-trip-panel__payment-date-control">
					<span class="rux-trip-panel__payment-date-label" data-payment-date-label aria-hidden="true">Date</span>
					<input class="rux-input rux-trip-panel__payment-field rux-trip-panel__payment-input rux-trip-panel__payment-date" id="tp-payment-date-${index + 1}" name="payments[${index}].date" data-payment-date type="date" aria-label="Payment date" />
				</div>
				<div class="rux-input-group rux-input-group--prefix rux-trip-panel__payment-amount">
					<span class="rux-input-group__prefix">$</span>
					<input class="rux-input rux-trip-panel__payment-field" id="tp-payment-amount-${index + 1}" name="payments[${index}].amount" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" aria-label="Amount" />
				</div>
			</div>
			<button type="button" class="rux-trip-panel__payment-select" data-payment-select aria-label="Delete payment">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		return row;
	};
	const setPaymentRowMethod = (row, method) => {
		const safeMethod = PAYMENT_METHOD_ICONS[method] ? method : "Other";
		const content = row.querySelector(".rux-trip-panel__payment-content");
		const methodInput = row.querySelector("[data-payment-method]");
		row.querySelectorAll("[data-payment-method-icon]").forEach((icon) => {
			icon.textContent = PAYMENT_METHOD_ICONS[safeMethod];
			icon.title = safeMethod;
		});
		if (content) {
			content.setAttribute("role", "group");
			content.setAttribute("aria-label", `${safeMethod} payment`);
		}
		if (methodInput) methodInput.value = safeMethod;
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

		if (totalPaid) totalPaid.textContent = formatMoney(paid);
		if (balanceDue) {
			balanceDue.textContent = formatMoney(balance);
			balanceDue.classList.toggle("is-negative", balance < 0);
		}
if (balancePaidEl) balancePaidEl.checked = fullyPaid;
		if (datePaidEl) datePaidEl.value = fullyPaid ? latestPaymentDate : "";

		toggles.forEach((toggle) => {
			const enabled = toggle.checked;
			const step = toggle.closest("[data-billing-step]");
			step?.classList.toggle("is-enabled", enabled);

			(toggle.dataset.billingControls || "")
				.split(/\s+/)
				.filter(Boolean)
				.forEach((id) => {
					const control = root.querySelector(`#${id}`);
					if (!control) return;
					control.disabled = !enabled;
					// Placeholder carries the state instead of a separate status
					// label — "Pending"/"Not received" when off, a task-specific
					// prompt ("Enter PO number") once the toggle switches it on.
					const placeholder = enabled ? control.dataset.onPlaceholder : control.dataset.offPlaceholder;
					if (placeholder) control.placeholder = placeholder;
				});
		});

		window.Rux?.syncDateInputs(root);
	};

	const paymentAddBtn = root.querySelector("#tp-payment-add-btn");
	const paymentDeleteBtn = root.querySelector("#tp-payment-delete-btn");

	// Hidden by default (no more mandatory first row) — same convention as
	// Files/Trip Contacts above.
	const syncPaymentButtons = () => {
		const count = paymentRowCount();
		if (paymentRows) paymentRows.style.display = count ? "flex" : "none";
		if (paymentDeleteBtn) paymentDeleteBtn.disabled = count === 0;
	};
	const addPaymentRow = (method) => {
		if (!paymentRows) return;
		const row = createPaymentRow(paymentRowCount());
		setPaymentRowMethod(row, method);
		paymentRows.appendChild(row);
		const dateInput = row.querySelector("[data-payment-date]");
		if (dateInput) {
			dateInput.value = localIsoDate();
			syncPaymentDateLabel(dateInput);
		}
		paymentRows.dataset.paymentsTouched = "true";
		syncPaymentButtons();
		row.querySelector("[data-payment-amount]")?.focus();
	};
	const deletePaymentRow = (row) => {
		if (!paymentRows || !row) return;
		const hasData = Array.from(row.querySelectorAll("input")).some((el) => el.type !== "hidden" && el.value);
		if (hasData && !confirm("Delete this payment?")) return;
		row.remove();
		paymentRows.dataset.paymentsTouched = "true";
		renumberPaymentRows();
		setPaymentSelecting(false);
		syncPaymentButtons();
		sync();
	};

	// Delete arms "select which one" mode instead of guessing — rows reveal
	// a trash icon (see .rux-trip-panel__payment-select in trip-panel.css);
	// clicking one deletes that specific payment and disarms. Clicking
	// Delete again while armed cancels. Same recipe as Files/Trip Contacts.
	let paymentSelecting = false;
	const setPaymentSelecting = (on) => {
		paymentSelecting = on;
		paymentRows?.classList.toggle("is-selecting", on);
		if (paymentDeleteBtn) {
			paymentDeleteBtn.setAttribute("aria-pressed", String(on));
			paymentDeleteBtn.querySelector(".rux-icon").textContent = on ? "close" : "delete";
			paymentDeleteBtn.setAttribute("aria-label", on ? "Cancel delete" : "Delete a payment");
		}
	};

	/* — Add-type menu — .rux-menu popover listing payment methods; picking
	   one creates a new payment row with that method's icon. Same
	   singleton-popover recipe as the Files add-type menu above. */
	const paymentMenuEl = document.createElement("div");
	paymentMenuEl.className = "rux-menu rux-trip-panel__payment-menu";
	paymentMenuEl.hidden = true;
	paymentMenuEl.setAttribute("role", "menu");
	document.body.appendChild(paymentMenuEl);

	const closePaymentMenu = () => {
		if (paymentMenuEl.hidden) return;
		paymentMenuEl.hidden = true;
		paymentMenuEl.innerHTML = "";
		paymentAddBtn?.setAttribute("aria-expanded", "false");
	};
	const positionPaymentMenu = () => {
		paymentMenuEl.style.visibility = "hidden";
		paymentMenuEl.hidden = false;
		const triggerRect = paymentAddBtn.getBoundingClientRect();
		const menuRect = paymentMenuEl.getBoundingClientRect();
		const left = Math.max(8, Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - 8));
		const top = Math.min(triggerRect.bottom + 4, window.innerHeight - menuRect.height - 8);
		paymentMenuEl.style.left = `${left}px`;
		paymentMenuEl.style.top = `${top}px`;
		paymentMenuEl.style.visibility = "";
	};
	const openPaymentMenu = () => {
		paymentMenuEl.innerHTML = PAYMENT_METHODS
			.map((m) => `<button type="button" class="rux-menu__item" role="menuitem" data-payment-method-choice="${m.value}"><span class="rux-icon" aria-hidden="true">${m.icon}</span>${escHtml(m.label)}</button>`)
			.join("");
		positionPaymentMenu();
		paymentAddBtn?.setAttribute("aria-expanded", "true");
	};

	toggles.forEach((toggle) => toggle.addEventListener("change", sync));
	priceEl?.addEventListener("input", sync);
	paymentRows?.addEventListener("input", (event) => {
		if (event.target.closest("[data-payment-row]")) paymentRows.dataset.paymentsTouched = "true";
		sync();
	});
	paymentRows?.addEventListener("change", (event) => {
		if (event.target.closest("[data-payment-row]")) paymentRows.dataset.paymentsTouched = "true";
		if (event.target.matches("[data-payment-date]")) syncPaymentDateLabel(event.target);
		sync();
	});
	paymentRows?.addEventListener("focusout", (event) => {
		if (event.target.matches("[data-payment-amount]")) formatPaymentAmount(event.target);
	});
	paymentRows?.addEventListener("click", (event) => {
		const selectBtn = event.target.closest("[data-payment-select]");
		if (selectBtn) {
			if (paymentSelecting) deletePaymentRow(selectBtn.closest("[data-payment-row]"));
		}
	});
	paymentAddBtn?.addEventListener("click", () => {
		if (!paymentMenuEl.hidden) {
			closePaymentMenu();
			return;
		}
		openPaymentMenu();
	});
	paymentMenuEl.addEventListener("click", (event) => {
		const btn = event.target.closest("[data-payment-method-choice]");
		if (!btn) return;
		closePaymentMenu();
		addPaymentRow(btn.dataset.paymentMethodChoice);
	});
	paymentDeleteBtn?.addEventListener("click", () => setPaymentSelecting(!paymentSelecting));
	document.addEventListener("mousedown", (event) => {
		if (paymentMenuEl.hidden) return;
		if (paymentMenuEl.contains(event.target)) return;
		if (event.target === paymentAddBtn) return;
		closePaymentMenu();
	});
	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		if (!paymentMenuEl.hidden) closePaymentMenu();
		if (paymentSelecting) setPaymentSelecting(false);
	});
	root.addEventListener("rux:payments-loaded", (event) => {
		if (!paymentRows) return;
		const payments = (event.detail?.payments || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
		payments.forEach((payment) => {
			const row = createPaymentRow(paymentRowCount());
			setPaymentRowMethod(row, payment.method);
			paymentRows.appendChild(row);
			const amountEl = row.querySelector("[data-payment-amount]");
			const dateEl = row.querySelector("[data-payment-date]");
			const refEl = row.querySelector("[data-payment-ref]");
			if (amountEl && payment.amount) {
				amountEl.value = payment.amount;
				formatPaymentAmount(amountEl);
			}
			if (dateEl && payment.date) dateEl.value = payment.date;
			syncPaymentDateLabel(dateEl);
			if (refEl && payment.ref) refEl.value = payment.ref;
		});
		syncPaymentButtons();
		sync();
	});
	root.addEventListener("rux:trip-cleared", () => {
		if (paymentRows) {
			paymentRows.dataset.paymentsTouched = "true";
			paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
			paymentRows.classList.remove("is-selecting");
			syncPaymentButtons();
			sync();
		}
		if (paymentDeleteBtn) {
			paymentDeleteBtn.setAttribute("aria-pressed", "false");
			paymentDeleteBtn.querySelector(".rux-icon").textContent = "delete";
			paymentDeleteBtn.setAttribute("aria-label", "Delete a payment");
		}
	});
	document.addEventListener("settings:billing", () => {
		window.RuxBilling?.applyToTripPanel?.(root);
		sync();
	});
	syncPaymentButtons();
	sync();
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

function initTripTabs(root) {
	const tabs = root.querySelector("[data-trip-tabs]");
	if (tabs?.dataset.ruxTripTabsInit === "true") return;
	if (tabs) tabs.dataset.ruxTripTabsInit = "true";

	const allPanes = root.querySelectorAll(".rux-trip-panel__pane");
	const allTabBtns = root.querySelectorAll(".rux-trip-panel__tabs .rux-button[aria-controls]");
	const scrollBody = root.querySelector(".rux-trip-panel__body");
	const tabsEl = root.querySelector(".rux-trip-panel__tabs");
	const footerEl = root.querySelector(".rux-trip-panel__footer");
	if (scrollBody) {
		const syncScrollShadows = () => {
			if (tabsEl) tabsEl.classList.toggle("is-scrolled", scrollBody.scrollTop > 0);
			if (footerEl) {
				const atBottom = scrollBody.scrollHeight - scrollBody.scrollTop - scrollBody.clientHeight < 1;
				footerEl.classList.toggle("is-scrolled", !atBottom);
			}
		};
		scrollBody.addEventListener("scroll", syncScrollShadows);
		new ResizeObserver(syncScrollShadows).observe(scrollBody);
	}
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
			if (scrollBody) scrollBody.scrollTop = 0;
			document.activeElement?.blur();
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
		
	}

	/* ── Trip Contacts ─────────────────────────────────────────────────── */

	const contactList = root.querySelector("#tp-contacts-list");
	const contactAddBtn = root.querySelector("#tp-contact-add-btn");
	const contactDeleteBtn = root.querySelector("#tp-contact-delete-btn");
	const MAX_CONTACTS = 2;
	if (contactList) {
		const contactCount = () => contactList.querySelectorAll("[data-trip-contact]").length;
		// Same as Files: hidden by default, header Add/Delete drive
		// everything — no per-row menu, no mandatory first row.
		const syncContactButtons = () => {
			const count = contactCount();
			contactList.style.display = count ? "flex" : "none";
			if (contactAddBtn) contactAddBtn.disabled = count >= MAX_CONTACTS;
			if (contactDeleteBtn) contactDeleteBtn.disabled = count === 0;
		};
		const addContactRow = ({ focus = true } = {}) => {
			if (contactCount() >= MAX_CONTACTS) return;
			const idx = [1, 2].find(i => !root.querySelector(`#tp-trip${i}-name`));
			const label = idx === 1 ? "Primary" : "Secondary";
			const row = document.createElement("div");
			row.className = "rux-trip-panel__contact-row";
			row.dataset.tripContact = "";
			row.innerHTML =
				`<div class="rux-trip-panel__contact-fields">
					<div class="rux-field"><label class="rux-field__label" for="tp-trip${idx}-name">${label}</label><input class="rux-input" id="tp-trip${idx}-name" name="tripContact${idx}.name" type="text" /></div>
					<div class="rux-field"><label class="rux-field__label" for="tp-trip${idx}-phone">Phone</label><input class="rux-input" id="tp-trip${idx}-phone" name="tripContact${idx}.phone" type="tel" /></div>
				</div>
				<button type="button" class="rux-trip-panel__contact-select" data-contact-select aria-label="Delete ${label} contact">
					<span class="rux-icon" aria-hidden="true">delete</span>
				</button>`;
			contactList.appendChild(row);
			syncContactButtons();
			if (focus) row.querySelector(`#tp-trip${idx}-name`)?.focus();
		};

		// Delete arms "select which one" mode instead of guessing — rows
		// reveal a circle (see .rux-trip-panel__contact-select in
		// trip-panel.css); clicking one deletes that specific contact and
		// disarms. Clicking Delete again while armed cancels.
		let selecting = false;
		const setSelecting = (on) => {
			selecting = on;
			contactList.classList.toggle("is-selecting", on);
			if (contactDeleteBtn) {
				contactDeleteBtn.setAttribute("aria-pressed", String(on));
				contactDeleteBtn.querySelector(".rux-icon").textContent = on ? "close" : "delete";
				contactDeleteBtn.setAttribute("aria-label", on ? "Cancel delete" : "Delete a contact");
			}
		};
		const deleteContact = (row) => {
			const hasData = Array.from(row.querySelectorAll("input")).some((el) => el.value);
			if (hasData && !confirm("Delete this contact?")) return;
			row.remove();
			setSelecting(false);
			syncContactButtons();
		};

		contactAddBtn?.addEventListener("click", () => addContactRow());
		contactDeleteBtn?.addEventListener("click", () => setSelecting(!selecting));
		contactList.addEventListener("click", (e) => {
			const selectBtn = e.target.closest("[data-contact-select]");
			if (selectBtn && selecting) deleteContact(selectBtn.closest(".rux-trip-panel__contact-row"));
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && selecting) setSelecting(false);
		});
		// trip-db.js's populateTrip fires this per saved contact slot to
		// create the row a loaded trip's data needs.
		root.addEventListener("rux:contact-row-needed", () => addContactRow({ focus: false }));

		syncContactButtons();
	}

	/* ── Documents ────────────────────────────────────────────────────────── */

	const docNewBtn = root.querySelector("#tp-doc-new-btn");
	const docDeleteBtn = root.querySelector("#tp-doc-delete-btn");
	const docFileInput = root.querySelector("#tp-doc-file-input");
	const docLabelPick = root.querySelector("#tp-doc-label-pick");
	const docAddBtn = root.querySelector("#tp-doc-add-btn");
	const docCancelBtn = root.querySelector("#tp-doc-cancel-btn");
	const docList = root.querySelector("#tp-doc-list");
	const DOC_TYPES = [
		{ value: "Itinerary", label: "Itinerary" },
		{ value: "Contract", label: "Contract" },
		{ value: "PO", label: "Purchase Order" },
	];
	const DOC_TYPE_LABELS = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label]));

	// Click opens the file (or Enter, for keyboard). The header Delete button
	// arms "select which one" mode — same recipe as Trip Contacts above —
	// which reveals this row's trash icon; clicking it deletes that specific
	// document and disarms. Icon+label live in their own inner flex group
	// (.rux-trip-panel__doc-content) so the trash icon's width/margin can
	// collapse to true zero when hidden, instead of leaving a stray gap.
	function createDocRow(doc) {
		const displayLabel = DOC_TYPE_LABELS[doc.label] || doc.label;
		const li = document.createElement("li");
		li.className = "rux-trip-panel__doc-row";
		li.dataset.docId = doc.id;
		li.dataset.docPath = doc.file_path;
		li.title = doc.file_name;
		li.tabIndex = 0;
		li.innerHTML = `
			<span class="rux-trip-panel__doc-content">
				<span class="rux-icon" aria-hidden="true">description</span>
				<span class="rux-trip-panel__doc-name">${escHtml(displayLabel)}</span>
			</span>
			<button type="button" class="rux-trip-panel__doc-select" data-doc-select aria-label="Delete ${escHtml(displayLabel)}">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		return li;
	}

	if (docNewBtn && docFileInput) {
		let pendingUploadLabel = null;
		let docSelecting = false;

		const syncDocButtons = () => {
			if (docDeleteBtn) docDeleteBtn.disabled = !docList?.children.length;
		};
		const setDocSelecting = (on) => {
			docSelecting = on;
			docList?.classList.toggle("is-selecting", on);
			if (docDeleteBtn) {
				docDeleteBtn.setAttribute("aria-pressed", String(on));
				docDeleteBtn.querySelector(".rux-icon").textContent = on ? "close" : "delete";
				docDeleteBtn.setAttribute("aria-label", on ? "Cancel delete" : "Delete a document");
			}
		};
		const deleteDoc = async (row) => {
			const docId = row.dataset.docId;
			if (!confirm("Delete this document?")) return;
			try {
				await window.RuxDocs.delete(docId);
				row.remove();
				setDocSelecting(false);
				syncDocButtons();
				window.Rux?.toast("Document deleted");
			} catch (err) {
				console.error("Delete failed:", err);
				window.Rux?.toast("Delete failed — try again.");
			}
		};
		const openDocRow = (row) => {
			const url = window.RuxDocs?.url?.(row.dataset.docPath);
			if (url) window.open(url, "_blank");
		};

		const uploadDoc = async (file, label) => {
			const tripId = window.RuxDocs?.tripId?.();
			if (!file || !label || !tripId) {
				if (!tripId) window.Rux?.toast("Save the trip first before uploading documents.");
				docFileInput.value = "";
				return;
			}
			docNewBtn.disabled = true;
			try {
				const doc = await window.RuxDocs.upload(tripId, label, file);
				docList?.appendChild(createDocRow(doc));
				syncDocButtons();
				if (label === "PO") {
					const poToggle = root.querySelector("#tp-po-received");
					if (poToggle && !poToggle.checked) {
						poToggle.checked = true;
						poToggle.dispatchEvent(new Event("change", { bubbles: true }));
					}
				}
				window.Rux?.toast(`${label} uploaded`);
			} catch (err) {
				console.error("Upload failed:", err);
				window.Rux?.toast("Upload failed — try again.");
			}
			docNewBtn.disabled = false;
			docFileInput.value = "";
		};

		docFileInput.addEventListener("change", () => uploadDoc(docFileInput.files[0], pendingUploadLabel));

		/* — Add-type menu — .rux-menu popover listing the 3 document types;
		   picking one immediately opens the file dialog for that type. Same
		   singleton-popover recipe as the payment/contact menus above. */
		const docMenuEl = document.createElement("div");
		docMenuEl.className = "rux-menu rux-trip-panel__doc-menu";
		docMenuEl.hidden = true;
		docMenuEl.setAttribute("role", "menu");
		document.body.appendChild(docMenuEl);

		const closeDocMenu = () => {
			if (docMenuEl.hidden) return;
			docMenuEl.hidden = true;
			docMenuEl.innerHTML = "";
			docNewBtn.setAttribute("aria-expanded", "false");
		};
		const positionDocMenu = () => {
			docMenuEl.style.visibility = "hidden";
			docMenuEl.hidden = false;
			const triggerRect = docNewBtn.getBoundingClientRect();
			const menuRect = docMenuEl.getBoundingClientRect();
			const left = Math.max(8, Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - 8));
			const top = Math.min(triggerRect.bottom + 4, window.innerHeight - menuRect.height - 8);
			docMenuEl.style.left = `${left}px`;
			docMenuEl.style.top = `${top}px`;
			docMenuEl.style.visibility = "";
		};
		const openDocMenu = () => {
			docMenuEl.innerHTML = DOC_TYPES
				.map((t) => `<button type="button" class="rux-menu__item" role="menuitem" data-doc-type="${t.value}">${escHtml(t.label)}</button>`)
				.join("");
			positionDocMenu();
			docNewBtn.setAttribute("aria-expanded", "true");
		};

		docNewBtn.addEventListener("click", () => {
			if (!docMenuEl.hidden) {
				closeDocMenu();
				return;
			}
			openDocMenu();
		});
		docMenuEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-doc-type]");
			if (!btn) return;
			pendingUploadLabel = btn.dataset.docType;
			closeDocMenu();
			docFileInput.click();
		});
		document.addEventListener("mousedown", (e) => {
			if (docMenuEl.hidden) return;
			if (docMenuEl.contains(e.target)) return;
			if (e.target === docNewBtn) return;
			closeDocMenu();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key !== "Escape" || docMenuEl.hidden) return;
			closeDocMenu();
		});

		docList?.addEventListener("click", (e) => {
			const selectBtn = e.target.closest("[data-doc-select]");
			if (selectBtn) {
				if (docSelecting) deleteDoc(selectBtn.closest(".rux-trip-panel__doc-row"));
				return;
			}
			const row = e.target.closest(".rux-trip-panel__doc-row");
			if (row) openDocRow(row);
		});
		docList?.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			const row = e.target.closest(".rux-trip-panel__doc-row");
			if (row) openDocRow(row);
		});

		docDeleteBtn?.addEventListener("click", () => setDocSelecting(!docSelecting));
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && docSelecting) setDocSelecting(false);
		});
	}

	root.addEventListener("rux:trip-cleared", () => {
		if (docList) {
			docList.innerHTML = "";
			docList.classList.remove("is-selecting");
		}
		if (docDeleteBtn) {
			docDeleteBtn.disabled = true;
			docDeleteBtn.setAttribute("aria-pressed", "false");
			docDeleteBtn.querySelector(".rux-icon").textContent = "delete";
			docDeleteBtn.setAttribute("aria-label", "Delete a document");
		}
		if (contactList) {
			contactList.querySelectorAll("[data-trip-contact]").forEach(r => r.remove());
			contactList.style.display = "none";
			contactList.classList.remove("is-selecting");
			if (contactAddBtn) contactAddBtn.disabled = false;
			if (contactDeleteBtn) {
				contactDeleteBtn.disabled = true;
				contactDeleteBtn.setAttribute("aria-pressed", "false");
				contactDeleteBtn.querySelector(".rux-icon").textContent = "delete";
				contactDeleteBtn.setAttribute("aria-label", "Delete a contact");
			}
		}
	});

	root.addEventListener("rux:documents-loaded", (event) => {
		if (!docList) return;
		docList.innerHTML = "";
		docList.classList.remove("is-selecting");
		(event.detail?.documents || []).forEach((doc) => {
			docList.appendChild(createDocRow(doc));
		});
		if (docDeleteBtn) {
			docDeleteBtn.disabled = !docList.children.length;
			docDeleteBtn.setAttribute("aria-pressed", "false");
			docDeleteBtn.querySelector(".rux-icon").textContent = "delete";
			docDeleteBtn.setAttribute("aria-label", "Delete a document");
		}
	});

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

		// Role label icons — cycle status: default → danger → warning → success → default
		const ROLE_STATES = ["default", "danger", "warning", "success"];
		busGroupsEl.addEventListener("click", (e) => {
			const label = e.target.closest(".rux-trip-panel__role-label");
			if (!label) return;
			const current = label.dataset.roleState || "default";
			const nextIndex = (ROLE_STATES.indexOf(current) + 1) % ROLE_STATES.length;
			const next = ROLE_STATES[nextIndex];
			label.dataset.roleState = next;
			label.classList.remove("rux-role--danger", "rux-role--warning", "rux-role--success");
			if (next !== "default") label.classList.add(`rux-role--${next}`);
		});
	}
}

function refreshRequirements(root) {
	const vEl = root.querySelector("#tp-vehicle-reqs");
	const dEl = root.querySelector("#tp-driver-needs");
	if (vEl) renderRequirements(vEl, activeReqsByType("vehicle"));
	if (dEl) renderRequirements(dEl, activeReqsByType("driver"), { block: false });
	
}

window.TripPanel = { init: initTripPanel, initTabs: initTripTabs, updateOptions: updateTripOptions, refreshRequirements };
