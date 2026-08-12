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

const ROLE_STATUS_STATES = [
	{ value: "off", label: "Off" },
	{ value: "pending-assignment", label: "Pending assignment" },
	{ value: "pending-response", label: "Pending response" },
	{ value: "confirmed", label: "Confirmed" },
	{ value: "declined", label: "Declined" },
];
const LEGACY_ROLE_STATUS = {
	default: "off",
	danger: "pending-assignment",
	warning: "pending-response",
	success: "confirmed",
};

function normalizeRoleStatus(value) {
	const normalized = LEGACY_ROLE_STATUS[value] || value || "off";
	return ROLE_STATUS_STATES.some((status) => status.value === normalized) ? normalized : "off";
}

function formatRoleStatusTime(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function setRoleStatus(button, value, metadata = {}) {
	if (!button) return;
	const state = normalizeRoleStatus(value);
	const status = ROLE_STATUS_STATES.find((item) => item.value === state);
	const role = button.dataset.roleLabel || "Driver";
	const dirty = metadata.dirty ?? true;
	const source = dirty ? "dispatcher" : (metadata.source || "dispatcher");
	const updatedAt = dirty ? "" : (metadata.updatedAt || "");
	const acceptedAt = dirty ? "" : (metadata.acceptedAt || "");
	button.dataset.roleState = state;
	button.dataset.statusDirty = String(dirty);
	button.dataset.statusSource = source;
	button.dataset.statusUpdatedAt = updatedAt;
	button.dataset.acceptedAt = acceptedAt;
	button.dataset.declinedAt = dirty ? "" : (metadata.declinedAt || "");
	button.classList.remove(
		"rux-role--pending-assignment",
		"rux-role--pending-response",
		"rux-role--confirmed",
		"rux-role--declined",
		"rux-role--danger",
		"rux-role--warning",
		"rux-role--success",
	);
	if (state !== "off") button.classList.add(`rux-role--${state}`);
	let detail = "";
	if (dirty) {
		detail = " · pending save by dispatch";
	} else if (source === "driver" && state === "confirmed") {
		const accepted = formatRoleStatusTime(acceptedAt || updatedAt);
		detail = ` · accepted by driver${accepted ? ` ${accepted}` : ""}`;
	} else if (source === "driver" && state === "declined") {
		const declined = formatRoleStatusTime(metadata.declinedAt || updatedAt);
		detail = ` · declined by driver${declined ? ` ${declined}` : ""}`;
	} else if (updatedAt) {
		const updated = formatRoleStatusTime(updatedAt);
		detail = ` · set by dispatch${updated ? ` ${updated}` : ""}`;
	}
	button.title = `${role} status: ${status.label}${detail}`;
	button.setAttribute("aria-label", `${role} status: ${status.label}${detail}`);
}

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
				`<button class="rux-button rux-button--default rux-button--toggle${block ? " rux-button--block" : ""}" data-rux-toggle-button aria-pressed="false" data-req="${escHtml(req.id ?? req.key)}" title="${escHtml(req.label)}">
					<span class="rux-icon" aria-hidden="true">${escHtml(mapIcon(req.icon))}</span><span class="rux-btn-label"> ${escHtml(req.label)}</span>
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
	window.Rux?.syncSelectPlaceholders?.(group);
}

function buildBusGroup(idx, buses, drivers, fieldPrefix = "buses") {
	const busOpts    = busOptsHtml(buses);
	const driverOpts = driverOptsHtml(drivers);

	const roleRows = [
		{ role: "coDriver", icon: "group", title: "Co-driver" },
		{ role: "relief1", icon: "person_add", title: "Relief 1 — start" },
		{ role: "relief2", icon: "person_remove", title: "Relief 2 — end" },
	]
		.map(
			(r) => {
				const reliefDetails = r.role.startsWith("relief")
					? `<div class="rux-card-section rux-trip-panel__relief-details">
						<div class="rux-field">
							<label class="rux-field__label" for="${escHtml(fieldPrefix)}-${idx}-${escHtml(r.role)}-report-time">Meet / swap time</label>
							<input class="rux-input" id="${escHtml(fieldPrefix)}-${idx}-${escHtml(r.role)}-report-time" name="${escHtml(fieldPrefix)}[${idx}].${escHtml(r.role)}.reportTime" type="time" aria-label="${escHtml(r.title)} meet or swap time" />
						</div>
						<div class="rux-field">
							<label class="rux-field__label" for="${escHtml(fieldPrefix)}-${idx}-${escHtml(r.role)}-instructions">Driver note</label>
							<input class="rux-input" id="${escHtml(fieldPrefix)}-${idx}-${escHtml(r.role)}-instructions" name="${escHtml(fieldPrefix)}[${idx}].${escHtml(r.role)}.instructions" type="text" maxlength="160" placeholder="Meet at hotel bus entrance…" aria-label="${escHtml(r.title)} instructions" />
						</div>
					</div>`
					: "";
				return `
    <div class="rux-trip-panel__driver-row" data-role-row="${escHtml(r.role)}" hidden>
      <div class="rux-input-group rux-input-group--prefix rux-input-group--action rux-trip-panel__driver-select">
        <span class="rux-input-group__prefix">
          <button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm rux-trip-panel__role-label" data-role-key="${escHtml(fieldPrefix)}[${idx}].${escHtml(r.role)}.status" data-role-label="${escHtml(r.title)}" data-role-state="off" title="${escHtml(r.title)} status: Off" aria-label="${escHtml(r.title)} status: Off">
            <span class="rux-icon" aria-hidden="true">${escHtml(mapIcon(r.icon))}</span>
          </button>
        </span>
        <select class="rux-select is-placeholder" name="${escHtml(fieldPrefix)}[${idx}].${escHtml(r.role)}.name" aria-label="${escHtml(r.title)}">${driverOpts}</select>
      </div>
      <div class="rux-input-group rux-input-group--prefix">
        <span class="rux-input-group__prefix">$</span>
        <input class="rux-input" name="${escHtml(fieldPrefix)}[${idx}].${escHtml(r.role)}.pay" type="number" min="0" placeholder="0" aria-label="${escHtml(r.title)} pay" />
      </div>
	  ${reliefDetails}
	</div>`;
			},
		)
		.join("");

	const el = document.createElement("div");
	el.className = "rux-card rux-trip-panel__bus-group";
	el.innerHTML = `
    <header class="rux-card__header">
      <p class="rux-card__title">Bus ${idx + 1}</p>
      <div class="rux-cluster">
        <button class="rux-button rux-button--ghost rux-button--toggle rux-button--icon" type="button" aria-pressed="false" data-role="coDriver" title="Co-driver" aria-label="Co-driver">
          <span class="rux-icon" aria-hidden="true">group</span>
        </button>
        <button class="rux-button rux-button--ghost rux-button--toggle rux-button--icon" type="button" aria-pressed="false" data-role="relief1" title="Relief 1 — start" aria-label="Relief 1 — start">
          <span class="rux-icon" aria-hidden="true">person_add</span>
        </button>
        <button class="rux-button rux-button--ghost rux-button--toggle rux-button--icon" type="button" aria-pressed="false" data-role="relief2" title="Relief 2 — end" aria-label="Relief 2 — end">
          <span class="rux-icon" aria-hidden="true">person_remove</span>
        </button>
      </div>
    </header>
    <div class="rux-card__body rux-card__body--stack">
    <div class="rux-trip-panel__bus-head">
      <select class="rux-select is-placeholder" name="${escHtml(fieldPrefix)}[${idx}].busId" aria-label="Bus ${idx + 1}">
        <option value="" disabled selected>Select bus…</option>
        ${busOpts}
      </select>
    </div>
    <div class="rux-trip-panel__driver-rows">
      <div class="rux-trip-panel__driver-row">
        <div class="rux-input-group rux-input-group--prefix rux-input-group--action rux-trip-panel__driver-select">
          <span class="rux-input-group__prefix">
            <button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm rux-trip-panel__role-label" data-role-key="${escHtml(fieldPrefix)}[${idx}].driver.status" data-role-label="Driver" data-role-state="off" title="Driver status: Off" aria-label="Driver status: Off">
              <span class="rux-icon" aria-hidden="true">person</span>
            </button>
          </span>
          <select class="rux-select is-placeholder" name="${escHtml(fieldPrefix)}[${idx}].driver.name" aria-label="Driver">${driverOpts}</select>
        </div>
        <div class="rux-input-group rux-input-group--prefix">
          <span class="rux-input-group__prefix">$</span>
          <input class="rux-input" name="${escHtml(fieldPrefix)}[${idx}].driver.pay" type="number" min="0" placeholder="0" aria-label="Driver pay" />
        </div>
      </div>
      ${roleRows}
    </div>
    </div>`;
	return el;
}

function renderBusGroups(container, n, buses, drivers, fieldPrefix = "buses") {
	const current = container.querySelectorAll(".rux-trip-panel__bus-group").length;
	if (n > current) {
		// Add new groups at the end — never touch existing ones
		for (let i = current; i < n; i++) {
			container.appendChild(buildBusGroup(i, buses, drivers, fieldPrefix));
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

function refreshBusGroupSection(busGroupsEl, busesInput, buses, drivers, fieldPrefix) {
	if (!busGroupsEl || !busesInput) return;

	// Refresh option lists in existing groups without disturbing selected values
	busGroupsEl.querySelectorAll(".rux-trip-panel__bus-group").forEach(group => {
		refreshGroupOptions(group, buses, drivers);
	});

	// Add or remove groups to match the current count
	const n = Math.max(1, Math.min(20, parseInt(busesInput.value, 10) || 1));
	renderBusGroups(busGroupsEl, n, buses, drivers, fieldPrefix);
}

function updateTripOptions(root, options = {}) {
	setTripOptions(root, options);
	const { buses, drivers } = getTripOptions(root);

	refreshBusGroupSection(root.querySelector("#tp-bus-groups"), root.querySelector("#tp-buses"), buses, drivers, "buses");
	refreshBusGroupSection(root.querySelector("#tp-return-bus-groups"), root.querySelector("#tp-return-buses"), buses, drivers, "returnBuses");
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

function formatCoverageAmount(value) {
	const amount = Math.max(0, Number.parseFloat(value) || 0);
	return `$${amount.toLocaleString("en-US", {
		minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
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
	const poAmountEl = root.querySelector("#tp-po-amount");
	const poCoverageEl = root.querySelector("#tp-po-coverage");
	const poDetails = root.querySelector("[data-billing-details]");
	const poStep = root.querySelector('[data-billing-key="poReceived"]');
	if (poStep && poDetails) poStep.append(poDetails);
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
	// Method is fixed at creation and becomes the compact group header.
	const createPaymentRow = (index) => {
		const row = document.createElement("div");
		row.className = "rux-trip-panel__payment-row";
		row.dataset.paymentRow = "";
		row.innerHTML = `
			<div class="rux-card-section rux-trip-panel__payment-content" role="group" aria-labelledby="tp-payment-label-${index + 1}">
				<div class="rux-card-section__header rux-trip-panel__payment-header">
					<div class="rux-trip-panel__payment-method">
						<span class="rux-icon rux-trip-panel__payment-icon" data-payment-method-icon aria-hidden="true"></span>
						<span class="rux-trip-panel__payment-method-label" id="tp-payment-label-${index + 1}" data-payment-method-label>Payment</span>
						<input type="hidden" data-payment-method id="tp-payment-method-${index + 1}" name="payments[${index}].method" />
					</div>
					<button type="button" class="rux-trip-panel__payment-select" data-payment-select aria-label="Delete payment">
						<span class="rux-icon" aria-hidden="true">delete</span>
					</button>
				</div>
				<div class="rux-card-section__body rux-trip-panel__payment-fields">
					<label class="rux-field rux-trip-panel__payment-date-field">
						<span class="rux-field__label">Date</span>
						<span class="rux-input rux-trip-panel__payment-date-control">
							<span class="rux-trip-panel__payment-date-label" data-payment-date-label aria-hidden="true">Date</span>
							<input class="rux-trip-panel__payment-date" id="tp-payment-date-${index + 1}" name="payments[${index}].date" data-payment-date type="date" aria-label="Payment date" />
						</span>
					</label>
					<label class="rux-field rux-trip-panel__payment-amount">
						<span class="rux-field__label">Amount</span>
						<span class="rux-input-group rux-input-group--prefix">
							<span class="rux-input-group__prefix" aria-hidden="true">$</span>
							<input class="rux-input rux-trip-panel__payment-amount-input" id="tp-payment-amount-${index + 1}" name="payments[${index}].amount" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" />
						</span>
					</label>
					<label class="rux-field rux-trip-panel__payment-reference">
						<span class="rux-field__label">Reference</span>
						<input class="rux-input rux-trip-panel__payment-ref" id="tp-payment-ref-${index + 1}" name="payments[${index}].ref" data-payment-ref type="text" placeholder="Optional" />
					</label>
				</div>
			</div>`;
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
		const methodLabel = row.querySelector("[data-payment-method-label]");
		if (methodLabel) methodLabel.textContent = `${safeMethod} Payment`;
		const deleteButton = row.querySelector("[data-payment-select]");
		if (deleteButton) deleteButton.setAttribute("aria-label", `Delete ${safeMethod} payment`);
		if (content) {
			content.setAttribute("aria-labelledby", methodLabel?.id || "");
		}
		if (methodInput) methodInput.value = safeMethod;
	};
	const renumberPaymentRows = () => {
		paymentRows?.querySelectorAll("[data-payment-row]").forEach((row, index) => {
			const amount = row.querySelector("[data-payment-amount]");
			const method = row.querySelector("[data-payment-method]");
			const date = row.querySelector("[data-payment-date]");
			const ref = row.querySelector("[data-payment-ref]");
			const content = row.querySelector(".rux-trip-panel__payment-content");
			const methodLabel = row.querySelector("[data-payment-method-label]");
			if (methodLabel) methodLabel.id = `tp-payment-label-${index + 1}`;
			if (content) content.setAttribute("aria-labelledby", `tp-payment-label-${index + 1}`);
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
		const overpaid = price > 0 && balance < 0;
		const poAmount = readMoney(poAmountEl);

		// Four states, not two: nothing paid yet (red) reads very differently
		// from a partial payment already in (yellow), even though both used to
		// collapse into the same "balance open" yellow. Green/blue (fully
		// paid / overpaid) are unchanged, just renamed to match.
		if (balanceDue) {
			balanceDue.textContent = formatMoney(balance);
			balanceDue.classList.toggle("is-balance-overpaid", overpaid);
			balanceDue.classList.toggle("is-balance-paid", fullyPaid && !overpaid);
			balanceDue.classList.toggle("is-balance-partial", price > 0 && paid > 0 && balance > 0);
			balanceDue.classList.toggle("is-balance-full", price > 0 && paid <= 0 && balance > 0);
		}
if (balancePaidEl) balancePaidEl.checked = fullyPaid;
		if (datePaidEl) datePaidEl.value = fullyPaid ? latestPaymentDate : "";

		toggles.forEach((toggle) => {
			const enabled = toggle.checked;
			const step = toggle.closest("[data-billing-step]");
			step?.classList.toggle("is-enabled", enabled);
			const details = step?.querySelector("[data-billing-details]");
			if (details) details.hidden = !enabled;

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
		if (poCoverageEl) {
			const poEnabled = !!root.querySelector("#tp-po-received")?.checked;
			let state = "";
			const remainingBalance = Math.max(0, balance);
			const shortfall = Math.max(0, remainingBalance - poAmount);
			if (poEnabled && price > 0) {
				if (remainingBalance <= 0 || shortfall <= 0) state = "complete";
				else if (poAmount <= 0) state = "empty";
				else if (shortfall > 0) state = "partial";
				else state = "complete";
			}

			poCoverageEl.replaceChildren();
			if (state === "complete") {
				const checkIcon = document.createElement("span");
				checkIcon.className = "rux-icon";
				checkIcon.setAttribute("aria-hidden", "true");
				checkIcon.textContent = "check";
				poCoverageEl.append(checkIcon);
			} else if (state) {
				poCoverageEl.textContent = `-${formatCoverageAmount(shortfall)}`;
			}
			const coverageLabel = state === "complete"
				? "PO fully covers the remaining balance"
				: state ? `${formatMoney(shortfall)} not authorized` : "";
			poCoverageEl.setAttribute("aria-label", coverageLabel);
			poCoverageEl.title = coverageLabel;
			poCoverageEl.classList.toggle("is-empty", state === "empty");
			poCoverageEl.classList.toggle("is-partial", state === "partial");
			poCoverageEl.classList.toggle("is-complete", state === "complete");
		}

		window.Rux?.syncDateInputs(root);
	};

	const paymentAddBtn = root.querySelector("#tp-payment-add-btn");

	// Keep the rows container visible so its accessible empty-state row
	// preserves the same footprint as one payment.
	const syncPaymentButtons = () => {
		if (paymentRows) paymentRows.style.display = "flex";
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
		syncPaymentButtons();
		sync();
	};

	/* — Add-type menu — .rux-menu popover listing payment methods; picking
	   one creates a new payment row with that method's icon. Same
	   singleton-popover recipe as the Files add-type menu above. */
	const paymentMenuEl = document.createElement("div");
	paymentMenuEl.className = "rux-menu rux-popover";
	paymentMenuEl.hidden = true;
	paymentMenuEl.setAttribute("role", "menu");
	paymentMenuEl.addEventListener("rux:menu-close", () => { paymentMenuEl.innerHTML = ""; });
	document.body.appendChild(paymentMenuEl);

	const closePaymentMenu = () => {
		if (paymentMenuEl.hidden) return;
		window.RuxMenu.close(paymentMenuEl, { restoreFocus: false });
	};
	const positionPaymentMenu = () => {
		window.RuxMenu.open(paymentAddBtn, paymentMenuEl, { placement: "bottom-end" });
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
	poAmountEl?.addEventListener("input", sync);
	priceEl?.addEventListener("focusout", () => formatPaymentAmount(priceEl));
	poAmountEl?.addEventListener("focusout", () => formatPaymentAmount(poAmountEl));
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
		if (selectBtn) deletePaymentRow(selectBtn.closest("[data-payment-row]"));
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
			syncPaymentButtons();
			sync();
		}
	});
	document.addEventListener("settings:billing", () => {
		window.RuxBilling?.applyToTripPanel?.(root);
		sync();
	});
	syncPaymentButtons();
	sync();
}

/* ── Ticket Pricing (Billing tab, Ticketed trips only) ───────────────────── */

// Named price options a Ticketed trip can offer (e.g. "Single", "Double —
// per person"). Same repeating-list recipe as Trip Contacts: a plain "+"
// appends a blank row immediately (no type menu needed, unlike Payments).
// Each row exposes its own delete action on hover/focus.
function initTicketPricing(root) {
	const ticketList = root.querySelector("#tp-ticket-options-list");
	const ticketAddBtn = root.querySelector("#tp-ticket-add-btn");
	if (!ticketList) return;

	let rowSeq = 0;
	const createTicketOptionRow = () => {
		const n = ++rowSeq;
		const row = document.createElement("div");
		row.className = "rux-trip-panel__contact-row";
		row.dataset.ticketOptionRow = "";
		row.innerHTML =
			`<div class="rux-trip-panel__contact-fields">
				<div class="rux-field"><label class="rux-field__label" for="tp-ticket-label-${n}">Option</label><input class="rux-input" id="tp-ticket-label-${n}" data-ticket-label type="text" placeholder="e.g. Single" /></div>
				<div class="rux-field"><label class="rux-field__label" for="tp-ticket-price-${n}">Price</label><div class="rux-input-group rux-input-group--prefix"><span class="rux-input-group__prefix">$</span><input class="rux-input" id="tp-ticket-price-${n}" data-ticket-price type="number" min="0" step="0.01" placeholder="0.00" /></div></div>
			</div>
			<button type="button" class="rux-trip-panel__contact-select" data-ticket-option-select aria-label="Delete option">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		return row;
	};
	const addTicketOptionRow = ({ focus = true } = {}) => {
		const row = createTicketOptionRow();
		ticketList.appendChild(row);
		if (focus) row.querySelector("[data-ticket-label]")?.focus();
		return row;
	};
	const deleteTicketOption = (row) => {
		const hasData = Array.from(row.querySelectorAll("input")).some((el) => el.value);
		if (hasData && !confirm("Delete this option?")) return;
		row.remove();
	};

	ticketAddBtn?.addEventListener("click", () => addTicketOptionRow());
	ticketList.addEventListener("click", (e) => {
		const selectBtn = e.target.closest("[data-ticket-option-select]");
		if (selectBtn) deleteTicketOption(selectBtn.closest("[data-ticket-option-row]"));
	});
	root.addEventListener("rux:ticket-option-row-needed", () => addTicketOptionRow({ focus: false }));
	root.addEventListener("rux:trip-cleared", () => {
		ticketList.querySelectorAll("[data-ticket-option-row]").forEach((row) => row.remove());
	});
}

/* ── Trip Type / Billing Type ────────────────────────────────────────────── */

// Trip Type (Round Trip / One-Way) and Billing Type (Charter / Ticketed) are
// each a two-way segmented control — the generic [data-rux-toggle-group]
// handler in initTripPanel keeps exactly one button pressed at a time per
// group. These getters/setters read/write that shared state so trip-db.js
// and index.html don't need to know the groups' internal markup.
function getTripType(root) {
	return root.querySelector("#tp-trip-type-group [aria-pressed='true']")?.dataset.value || "round_trip";
}

function setTripType(root, value) {
	const group = root.querySelector("#tp-trip-type-group");
	if (!group) return;
	group.querySelectorAll(".rux-button").forEach((btn) => {
		const active = btn.dataset.value === value;
		btn.setAttribute("aria-pressed", String(active));
		btn.classList.toggle("is-active", active);
	});
	syncReturnLegVisibility(root);
}

// Return-leg fields/cards only apply to Drop-off / Pick-up trips. Safe to run
// unconditionally (idempotent show/hide) — called both on genuine user
// clicks and on programmatic setTripType() calls from populateTrip/
// loadTrip/clearForm.
function syncReturnLegVisibility(root) {
	const isDropoffPickup = getTripType(root) === "dropoff_pickup";
	const returnDatesGrid = root.querySelector("#tp-return-dates-grid");
	const returnFleetCard = root.querySelector("#tp-return-fleet-card");
	const returnBusGroupsEl = root.querySelector("#tp-return-bus-groups");
	if (returnDatesGrid) returnDatesGrid.hidden = !isDropoffPickup;
	if (returnFleetCard) returnFleetCard.hidden = !isDropoffPickup;
	if (returnBusGroupsEl) returnBusGroupsEl.hidden = !isDropoffPickup;
	window.Itinerary?.setLegToggleVisible(isDropoffPickup);
}

// Wipes the return leg back to a single empty bus slot — the return leg
// must start empty on a genuine type transition (never pre-filled from the
// outbound assignment), so a dispatcher actively chooses rather than a
// stale/wrong assignment slipping through unnoticed.
function resetReturnLegState(root) {
	const returnBusesInput = root.querySelector("#tp-return-buses");
	const returnBusGroupsEl = root.querySelector("#tp-return-bus-groups");
	if (returnBusesInput) returnBusesInput.value = "1";
	if (returnBusGroupsEl) {
		returnBusGroupsEl.querySelectorAll(".rux-trip-panel__bus-group").forEach((group) => group.remove());
		const { buses, drivers } = getTripOptions(root);
		renderBusGroups(returnBusGroupsEl, 1, buses, drivers, "returnBuses");
	}
}

function getBillingType(root) {
	return root.querySelector("#tp-billing-type-group [aria-pressed='true']")?.dataset.value || "charter";
}

function setBillingType(root, value) {
	const group = root.querySelector("#tp-billing-type-group");
	if (!group) return;
	group.querySelectorAll(".rux-button").forEach((btn) => {
		const active = btn.dataset.value === value;
		btn.setAttribute("aria-pressed", String(active));
		btn.classList.toggle("is-active", active);
	});
	syncTicketPricingVisibility(root);
}

// Ticket pricing and the passenger manifest only apply to Ticketed trips.
// Availability remains separate: trip-db.js keeps the manifest action
// disabled until the trip has been saved and therefore has an id.
function syncTicketPricingVisibility(root) {
	const isTicketed = getBillingType(root) === "ticketed";
	const card = root.querySelector("#tp-ticket-pricing-card");
	const manifestAction = root.querySelector("#tp-manifest-action");
	if (card) card.hidden = !isTicketed;
	if (manifestAction) {
		manifestAction.classList.toggle("is-visible", isTicketed);
		manifestAction.setAttribute("aria-hidden", String(!isTicketed));
	}
}

// Trips where no trip contact will ever exist (e.g. self-organized groups) or
// no itinerary applies shouldn't keep flagging as pending on the trip bar —
// these two toggles record that up front and lock the section so it reads as
// deliberately skipped rather than incomplete.
function getContactNotNeeded(root) {
	return root.querySelector("#tp-contact-toggle-btn")?.getAttribute("aria-pressed") === "true";
}

function setContactNotNeeded(root, value) {
	const btn = root.querySelector("#tp-contact-toggle-btn");
	if (!btn) return;
	btn.setAttribute("aria-pressed", String(value));
	btn.classList.toggle("is-active", value);
	btn.setAttribute("aria-label", value ? "Mark contact as needed" : "Mark contact as not needed");
	root.querySelector("#tp-contacts-list")?.querySelectorAll("input").forEach((input) => { input.disabled = value; });
	const addBtn = root.querySelector("#tp-contact-add-btn");
	if (addBtn) addBtn.disabled = value;
}

function getItineraryNotNeeded(root) {
	return root.querySelector("#tp-doc-toggle-btn")?.getAttribute("aria-pressed") === "true";
}

function setItineraryNotNeeded(root, value) {
	const btn = root.querySelector("#tp-doc-toggle-btn");
	if (btn) {
		btn.setAttribute("aria-pressed", String(value));
		btn.classList.toggle("is-active", value);
		btn.setAttribute("aria-label", value ? "Mark itinerary as needed" : "Mark itinerary as not needed");
	}
	const newBtn = root.querySelector("#tp-doc-new-btn");
	if (newBtn) newBtn.disabled = value;
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

function initTripTabs(root) {
	const tabs = root.querySelector("[data-trip-tabs]");
	if (tabs?.dataset.ruxTripTabsInit === "true") return;
	if (tabs) tabs.dataset.ruxTripTabsInit = "true";

	const allPanes = root.querySelectorAll(".rux-trip-panel__pane");
	const allTabBtns = tabs?.querySelectorAll(".rux-trip-panel__tab[aria-controls]") || [];
	const scrollBody = root.querySelector(".rux-panel__body");
	const drawer = root.closest(".scheduler-app__drawer");
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
			// A railable drawer's own tabs double as its collapsed rail (see
			// css/layout/scheduler-app.css's --railable override and the
			// @container rule in css/features/trip-panel.css) — clicking one
			// while collapsed should also reopen the panel, not just record
			// which tab to land on. RuxDrawer isn't known here, so bridge
			// with a bubbling event index.html's boot code (which holds the
			// drawer handle) listens for.
			if (drawer && !drawer.classList.contains("is-open")) {
				drawer.dispatchEvent(new CustomEvent("rux:trip-tab-expand-request", { bubbles: true }));
			}
		});
	});

	const activeTab =
		tabs?.querySelector(".rux-trip-panel__tab[aria-controls][aria-selected='true']") ||
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

/* ── Contact autofill ───────────────────────────────────────────────────── */
// Search-as-you-type against the saved contacts roster (js/core/suggestions.js
// + window.RuxContacts, wired in index.html). Picking a suggestion fills the
// paired phone/email input(s) and stamps nameInput.dataset.contactId so
// trip-db.js's save() links this trip to that contact instead of re-matching
// or creating a duplicate. Hand-editing the name afterward clears that stamp
// — the link is only trustworthy while the name still matches what was
// picked, and save() already knows how to re-resolve a blank one.

function attachContactAutofill(nameInput, { phoneInput, emailInput, clientInput } = {}) {
	if (!nameInput || !window.RuxSuggestions) return;
	window.RuxSuggestions.attach(nameInput, {
		fetch: async (query) => {
			const results = await window.RuxContacts?.search?.(query);
			return (results ?? []).map((c) => ({
				label: c.name,
				sublabel: [c.client, c.phone, c.email].filter(Boolean).join(" · "),
				...c,
			}));
		},
		onSelect: (contact) => {
			nameInput.value = contact.name;
			nameInput.dataset.contactId = contact.id;
			if (phoneInput) phoneInput.value = contact.phone || "";
			if (emailInput) emailInput.value = contact.email || "";
			// Only fills an empty field — this trip's own Client is the
			// authoritative record of who it's actually for, so a contact
			// picked here should offer a starting point, not overwrite
			// something already typed (which may legitimately differ from
			// this contact's usual client on other trips).
			if (clientInput && !clientInput.value.trim() && contact.client) {
				clientInput.value = contact.client;
			}
		},
	});
	nameInput.addEventListener("input", () => {
		nameInput.dataset.contactId = "";
	});
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
			// Captured before reassigning aria-pressed below, so the
			// dropoff_pickup reset (see below) can tell a genuine type
			// *transition* apart from a redundant re-click while already on
			// that type — re-clicking an already-selected trip type must
			// never wipe an existing trip's already-populated return leg.
			const prevValue = group.querySelector(".rux-button[aria-pressed='true']")?.dataset.value;
			group.querySelectorAll(".rux-button").forEach((b) => {
				b.setAttribute("aria-pressed", "false");
				b.classList.remove("is-active");
			});
			btn.setAttribute("aria-pressed", "true");
			btn.classList.add("is-active");
			if (group.id === "tp-billing-type-group") syncTicketPricingVisibility(root);
			if (group.id === "tp-trip-type-group") {
				syncReturnLegVisibility(root);
				if (btn.dataset.value === "dropoff_pickup" && prevValue !== "dropoff_pickup") resetReturnLegState(root);
			}
			if (group.id === "tp-itin-leg-toggle") window.Itinerary?.setActiveLeg?.(btn.dataset.value);
		});
	});

	initBillingWorkflow(root);
	initTicketPricing(root);

	/* ── Requirements ───────────────────────────────────────────────────── */

	const vehicleReqContainer = root.querySelector("#tp-vehicle-reqs");
	const driverNeedsContainer = root.querySelector("#tp-driver-needs");
	if (vehicleReqContainer || driverNeedsContainer) {
		if (vehicleReqContainer) renderRequirements(vehicleReqContainer, activeReqsByType("vehicle"));
		if (driverNeedsContainer) renderRequirements(driverNeedsContainer, activeReqsByType("driver"), { block: false });
		
	}

	attachContactAutofill(root.querySelector("#tp-book-name"), {
		phoneInput: root.querySelector("#tp-book-phone"),
		emailInput: root.querySelector("#tp-book-email"),
		clientInput: root.querySelector("#tp-customer"),
	});

	/* ── Trip Contacts ─────────────────────────────────────────────────── */

	const contactList = root.querySelector("#tp-contacts-list");
	if (contactList) {
		const contactAddBtn = root.querySelector("#tp-contact-add-btn");
		const contactCount = () => contactList.querySelectorAll("[data-trip-contact]").length;
		const renumberContactRows = () => {
			contactList.querySelectorAll("[data-trip-contact]").forEach((row, offset) => {
				const number = offset + 1;
				const nameInput = row.querySelector("[data-trip-contact-name]");
				const phoneInput = row.querySelector("[data-trip-contact-phone]");
				const nameLabel = row.querySelector("[data-trip-contact-name-label]");
				const phoneLabel = row.querySelector("[data-trip-contact-phone-label]");
				nameInput.id = `tp-trip${number}-name`;
				nameInput.name = `tripContact${number}.name`;
				phoneInput.id = `tp-trip${number}-phone`;
				phoneInput.name = `tripContact${number}.phone`;
				nameLabel.htmlFor = nameInput.id;
				nameLabel.textContent = `Contact Name ${number}`;
				phoneLabel.htmlFor = phoneInput.id;
				phoneLabel.textContent = `Contact Phone ${number}`;
			});
			if (contactAddBtn) contactAddBtn.disabled = contactCount() >= 5;
		};
		const addContactRow = ({ focus = false } = {}) => {
			if (contactCount() >= 5) return;
			const row = document.createElement("div");
			row.className = "rux-trip-panel__contact-row";
			row.dataset.tripContact = "";
			row.innerHTML =
				`<div class="rux-trip-panel__contact-fields">
					<div class="rux-field"><label class="rux-field__label" data-trip-contact-name-label></label><input class="rux-input" data-trip-contact-name type="text" /></div>
					<div class="rux-field"><label class="rux-field__label" data-trip-contact-phone-label></label><input class="rux-input" data-trip-contact-phone type="tel" /></div>
				</div>
				<button type="button" class="rux-trip-panel__contact-select" data-trip-contact-delete aria-label="Delete trip contact"><span class="rux-icon" aria-hidden="true">delete</span></button>`;
			contactList.appendChild(row);
			contactList.style.display = "flex";
			renumberContactRows();
			const nameInput = row.querySelector("[data-trip-contact-name]");
			attachContactAutofill(nameInput, {
				phoneInput: row.querySelector("[data-trip-contact-phone]"),
			});
			if (focus) nameInput?.focus();
		};

		root.addEventListener("rux:contact-row-needed", () => addContactRow({ focus: false }));
		contactAddBtn?.addEventListener("click", () => addContactRow({ focus: true }));
		contactList.addEventListener("click", (event) => {
			const button = event.target.closest("[data-trip-contact-delete]");
			if (!button || contactCount() <= 1) return;
			button.closest("[data-trip-contact]")?.remove();
			renumberContactRows();
		});

		addContactRow({ focus: false });
	}

	/* ── Documents ────────────────────────────────────────────────────────── */

	const docNewBtn = root.querySelector("#tp-doc-new-btn");
	const docToggleBtn = root.querySelector("#tp-doc-toggle-btn");
	docToggleBtn?.addEventListener("click", () => {
		setItineraryNotNeeded(root, !getItineraryNotNeeded(root));
	});
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
	const formatDocumentDate = (value) => {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "";
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date).replaceAll("/", "-");
	};
	const isPdfFile = (file) => Boolean(file) && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));
	const documentIcon = (doc) => {
		// Doc type takes priority over file extension — every upload is a PDF
		// now (see isPdfFile), so extension alone can no longer tell Itinerary/
		// PO/Contract apart and would show the same icon for all three.
		const label = String(doc.label ?? "").toLowerCase();
		if (label === "itinerary") return "route";
		if (label === "po") return "receipt_long";
		if (label === "contract") return "contract";

		const extension = String(doc.file_name ?? "").split(".").pop()?.toLowerCase();
		if (extension === "pdf") return "picture_as_pdf";
		if (["xls", "xlsx", "csv", "ods"].includes(extension)) return "table_view";
		if (["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(extension)) return "image";
		if (["doc", "docx", "odt", "rtf"].includes(extension)) return "description";
		if (["txt", "md"].includes(extension)) return "article";
		if (["zip", "rar", "7z"].includes(extension)) return "folder_zip";
		return "description";
	};

	// The primary button opens the file. Each row owns a hover/focus-revealed
	// delete action, matching itinerary stop rows, so deletion never requires
	// a separate header-level selection mode.
	function createDocRow(doc, { isUpdate = false } = {}) {
		const displayLabel = DOC_TYPE_LABELS[doc.label] || doc.label;
		const uploadedDate = formatDocumentDate(doc.created_at);
		const dateText = uploadedDate ? (isUpdate ? `Updated ${uploadedDate}` : uploadedDate) : "";
		const icon = documentIcon(doc);
		const li = document.createElement("li");
		li.className = "rux-trip-panel__doc-row";
		li.dataset.docId = doc.id;
		li.dataset.docPath = doc.file_path;
		li.dataset.docLabel = doc.label;
		li.innerHTML = `
			<button type="button" class="rux-trip-panel__doc-content" data-doc-open title="${escHtml(doc.file_name)}" aria-label="View ${escHtml(displayLabel)}${uploadedDate ? `, ${isUpdate ? "updated" : "uploaded"} ${escHtml(uploadedDate)}` : ""}">
				<span class="rux-icon" aria-hidden="true">${icon}</span>
				<span class="rux-trip-panel__doc-name">View ${escHtml(displayLabel)}</span>
				${dateText ? `<time class="rux-trip-panel__doc-date" datetime="${escHtml(doc.created_at)}">${escHtml(dateText)}</time>` : ""}
			</button>
			<button type="button" class="rux-trip-panel__doc-select" data-doc-select aria-label="Delete ${escHtml(displayLabel)}">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		return li;
	}

	if (docNewBtn && docFileInput) {
		let pendingUploadLabel = null;
		let pendingReplaceRow = null;
		const deleteDoc = async (row) => {
			const docId = row.dataset.docId;
			const label = row.dataset.docLabel;
			if (!confirm("Delete this document?")) return;
			try {
				await window.RuxDocs.delete(docId);
				row.remove();
				if (label === "Itinerary") {
					// Same event the trip bar's own itinerary shortcut dispatches
					// on delete — keeps every bus track's bar in sync, since
					// deleting via the panel otherwise never touched any bar at all.
					const tripId = window.RuxDocs?.tripId?.();
					if (tripId) {
						document.dispatchEvent(
							new CustomEvent("rux:itinerary-deleted", { detail: { tripId, docId } }),
						);
					}
				}
				window.Rux?.toast("Document deleted");
			} catch (err) {
				console.error("Delete failed:", err);
				window.Rux?.toast("Delete failed — try again.");
			}
		};
		const replaceDoc = async (row, file) => {
			const label = row.dataset.docLabel;
			const tripId = window.RuxDocs?.tripId?.();
			if (!file || !tripId) return;
			try {
				const doc = await window.RuxDocs.upload(tripId, label, file);
				await window.RuxDocs.delete(row.dataset.docId);
				row.remove();
				docList?.prepend(createDocRow(doc, { isUpdate: true }));
				if (label === "Itinerary") {
					// Both events, not just the upload half — a replace is a
					// delete-then-upload, and anything only watching for the
					// upload half (e.g. a trip bar's pending-itinerary indicator)
					// would otherwise never learn the old doc is gone.
					document.dispatchEvent(
						new CustomEvent("rux:itinerary-deleted", { detail: { tripId, docId: row.dataset.docId } }),
					);
					document.dispatchEvent(
						new CustomEvent("rux:itinerary-uploaded", { detail: { tripId, doc } }),
					);
				}
				window.Rux?.toast(`${DOC_TYPE_LABELS[label] || label} replaced`);
			} catch (err) {
				console.error("Replace failed:", err);
				window.Rux?.toast("Replace failed — try again.");
			}
		};

		const openDocRow = (row) => {
			const url = window.RuxDocs?.url?.(row.dataset.docPath);
			if (!url) return;
			if (!window.RuxDocViewer) {
				window.open(url, "_blank");
				return;
			}
			const fileName = row.querySelector("[data-doc-open]")?.title || "";
			const label = row.dataset.docLabel;
			window.RuxDocViewer.open({
				url,
				fileName,
				title: DOC_TYPE_LABELS[label] || label || fileName,
				icon: documentIcon({ file_name: fileName, label }),
				onDelete: () => {
					window.RuxDocViewer.close();
					deleteDoc(row);
				},
				onUpdate: () => {
					window.RuxDocViewer.close();
					pendingReplaceRow = row;
					docFileInput.click();
				},
			});
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
				const hasExistingLabel = Array.from(docList?.querySelectorAll(".rux-trip-panel__doc-row") ?? [])
					.some((row) => row.dataset.docLabel === label);
				const doc = await window.RuxDocs.upload(tripId, label, file);
				docList?.prepend(createDocRow(doc, { isUpdate: hasExistingLabel }));
				if (label === "PO") {
					const poToggle = root.querySelector("#tp-po-received");
					if (poToggle && !poToggle.checked) {
						poToggle.checked = true;
						poToggle.dispatchEvent(new Event("change", { bubbles: true }));
					}
				}
				if (label === "Itinerary") {
					// Same event the trip bar's own paperclip upload dispatches —
					// the scheduler's listener (index.html) updates every bus
					// track's bar for this trip, since uploading via the panel
					// otherwise never touched any bar at all (only this drawer's
					// own document list).
					document.dispatchEvent(
						new CustomEvent("rux:itinerary-uploaded", { detail: { tripId, doc } }),
					);
				}
				window.Rux?.toast(`${label} uploaded`);
			} catch (err) {
				console.error("Upload failed:", err);
				window.Rux?.toast("Upload failed — try again.");
			}
			docNewBtn.disabled = false;
			docFileInput.value = "";
		};

		// Keeps this drawer's own document list in sync when the itinerary
		// changes from elsewhere (the trip bar's paperclip shortcut) while this
		// trip happens to be the one currently open here. Idempotent by design
		// — checks the DOM before touching it — since this panel's own
		// uploadDoc/replaceDoc/deleteDoc above already update the list directly
		// and fire these same events, so a self-dispatched event just finds
		// nothing left to do.
		document.addEventListener("rux:itinerary-uploaded", (e) => {
			const { tripId, doc } = e.detail || {};
			if (!tripId || !doc || tripId !== window.RuxDocs?.tripId?.()) return;
			if (docList?.querySelector(`[data-doc-id="${doc.id}"]`)) return;
			docList?.prepend(createDocRow(doc, { isUpdate: true }));
		});

		document.addEventListener("rux:itinerary-deleted", (e) => {
			const { tripId, docId } = e.detail || {};
			if (!tripId || !docId || tripId !== window.RuxDocs?.tripId?.()) return;
			docList?.querySelector(`[data-doc-id="${docId}"]`)?.remove();
		});

		docFileInput.addEventListener("change", () => {
			const file = docFileInput.files[0];
			if (file && !isPdfFile(file)) {
				window.Rux?.toast("Only PDF files are supported.");
				pendingReplaceRow = null;
				docFileInput.value = "";
				return;
			}
			if (pendingReplaceRow) {
				const row = pendingReplaceRow;
				pendingReplaceRow = null;
				replaceDoc(row, file);
				docFileInput.value = "";
				return;
			}
			uploadDoc(file, pendingUploadLabel);
		});

		/* — Add-type menu — .rux-menu popover listing the 3 document types;
		   picking one immediately opens the file dialog for that type. Same
		   singleton-popover recipe as the payment/contact menus above. */
		const docMenuEl = document.createElement("div");
		docMenuEl.className = "rux-menu rux-popover";
		docMenuEl.hidden = true;
		docMenuEl.setAttribute("role", "menu");
		docMenuEl.addEventListener("rux:menu-close", () => { docMenuEl.innerHTML = ""; });
		document.body.appendChild(docMenuEl);

		const closeDocMenu = () => {
			if (docMenuEl.hidden) return;
			window.RuxMenu.close(docMenuEl, { restoreFocus: false });
		};
		const positionDocMenu = () => {
			window.RuxMenu.open(docNewBtn, docMenuEl, { placement: "bottom-end" });
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
		docList?.addEventListener("click", (e) => {
			const selectBtn = e.target.closest("[data-doc-select]");
			if (selectBtn) {
				deleteDoc(selectBtn.closest(".rux-trip-panel__doc-row"));
				return;
			}
			const row = e.target.closest("[data-doc-open]")?.closest(".rux-trip-panel__doc-row");
			if (row) openDocRow(row);
		});

	}

	root.addEventListener("rux:trip-cleared", () => {
		if (docList) {
			docList.querySelectorAll(".rux-trip-panel__doc-row").forEach((row) => row.remove());
		}
		if (contactList) {
			contactList.querySelectorAll("[data-trip-contact]").forEach(r => r.remove());
			root.dispatchEvent(new CustomEvent("rux:contact-row-needed", { bubbles: true }));
			contactList.classList.remove("is-selecting");
		}
	});

	root.addEventListener("rux:documents-loaded", (event) => {
		if (!docList) return;
		docList.querySelectorAll(".rux-trip-panel__doc-row").forEach((row) => row.remove());
		// Documents arrive oldest-first (created_at ascending); a doc is an
		// "update" if an earlier document already used the same label — e.g.
		// a second Itinerary upload. Walking newest-first and appending each
		// puts the newest document at the top of the list.
		const docs = event.detail?.documents || [];
		const earliestByLabel = new Map();
		docs.forEach((doc) => {
			const cur = earliestByLabel.get(doc.label);
			if (!cur || new Date(doc.created_at) < new Date(cur)) earliestByLabel.set(doc.label, doc.created_at);
		});
		docs.slice().reverse().forEach((doc) => {
			docList.appendChild(createDocRow(doc, { isUpdate: doc.created_at !== earliestByLabel.get(doc.label) }));
		});
	});

	/* ── Bus groups ───────────────────────────────────────────────────────── */

	initBusGroupSection(root, root.querySelector("#tp-bus-groups"), root.querySelector("#tp-buses"), "buses");
	initBusGroupSection(root, root.querySelector("#tp-return-bus-groups"), root.querySelector("#tp-return-buses"), "returnBuses");

	updateTripOptions(root);
}

// Wires bus-count stepper + role-toggle/role-status clicks for one leg's bus
// group section. Called once for the outbound section (#tp-bus-groups) and
// once for the return section (#tp-return-bus-groups) — each pairs its own
// stepper (found via .closest(".rux-number-stepper")) with its own group
// container, so the two legs' inc/dec buttons and role clicks never
// cross-wire despite both using the same unqualified [data-bus-count-*]
// attributes and .rux-trip-panel__bus-group class.
function initBusGroupSection(root, busGroupsEl, busesInput, fieldPrefix) {
	if (!busGroupsEl || !busesInput) return;

	const stepperEl = busesInput.closest(".rux-number-stepper");
	const busCountDecBtn = stepperEl?.querySelector("[data-bus-count-dec]");
	const busCountIncBtn = stepperEl?.querySelector("[data-bus-count-inc]");
	const minBusCount = parseInt(busesInput.min, 10) || 1;
	const maxBusCount = parseInt(busesInput.max, 10) || 20;
	const clampBusCount = (value) => Math.max(minBusCount, Math.min(maxBusCount, parseInt(value, 10) || minBusCount));
	const syncBusCountButtons = (value = busesInput.value) => {
		const n = clampBusCount(value);
		if (busCountDecBtn) busCountDecBtn.disabled = n <= minBusCount;
		if (busCountIncBtn) busCountIncBtn.disabled = n >= maxBusCount;
	};

	syncBusCountButtons();

	stepperEl?.querySelectorAll("[data-bus-count-dec], [data-bus-count-inc]").forEach((btn) => {
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
		renderBusGroups(busGroupsEl, n, buses, drivers, fieldPrefix);
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
		if (row) {
			row.hidden = !nowActive;
			if (!nowActive) {
				const select = row.querySelector("select[name]");
				if (select) select.value = "";
				row.querySelectorAll("input[name]").forEach((input) => { input.value = ""; });
				const label = row.querySelector(".rux-trip-panel__role-label");
				if (label) setRoleStatus(label, "off");
			}
		}
		window.Rux?.syncSelectPlaceholders?.(group);
	});

	// Role status icons: off → pending assignment → pending response → confirmed → declined.
	busGroupsEl.addEventListener("click", (e) => {
		const label = e.target.closest(".rux-trip-panel__role-label");
		if (!label) return;
		const current = normalizeRoleStatus(label.dataset.roleState);
		const currentIndex = ROLE_STATUS_STATES.findIndex((status) => status.value === current);
		const next = ROLE_STATUS_STATES[(currentIndex + 1) % ROLE_STATUS_STATES.length];
		setRoleStatus(label, next.value);
	});

	// A status belongs to one specific driver/leg/role identity. When dispatch
	// replaces the selected driver, never carry the previous driver's green
	// (or pending) state onto the replacement.
	busGroupsEl.addEventListener("change", (e) => {
		const select = e.target.closest(
			".rux-trip-panel__driver-row select[name$='.name']",
		);
		if (!select) return;
		const label = select
			.closest(".rux-trip-panel__driver-row")
			?.querySelector(".rux-trip-panel__role-label");
		if (label) setRoleStatus(label, "off");
	});
}

function refreshRequirements(root) {
	const vEl = root.querySelector("#tp-vehicle-reqs");
	const dEl = root.querySelector("#tp-driver-needs");
	if (vEl) renderRequirements(vEl, activeReqsByType("vehicle"));
	if (dEl) renderRequirements(dEl, activeReqsByType("driver"), { block: false });
	
}

window.TripPanel = {
	init: initTripPanel,
	initTabs: initTripTabs,
	updateOptions: updateTripOptions,
	refreshRequirements,
	normalizeRoleStatus,
	setRoleStatus,
	getTripType,
	setTripType,
	getBillingType,
	setBillingType,
	getContactNotNeeded,
	setContactNotNeeded,
	getItineraryNotNeeded,
	setItineraryNotNeeded,
};
