/* ==========================================================================
   RUX UI — BILLING WORKFLOW CONFIG
   --------------------------------------------------------------------------
   Shared billing workflow labels, visibility, status derivation, and trip
   confirmation rules.

   Statuses (derived from payment state):
	 pending            — no contract, no payment
	 contract_signed    — contract signed
	 po_partial         — PO plus recorded payments do not cover the quote
	 po_received        — PO received
     deposit_received   — partial payment received
     paid_full          — fully paid
     overpaid           — paid more than contract value

   Workflow steps (toggles in trip editor):
     contractSigned, poReceived, invoiced
   ========================================================================== */

(function () {
	"use strict";

	const KEY = "billing-workflow-v1";

	const DEFAULT_CONFIG = {
		workflow: {
			contractSigned: { label: "Contract", active: true },
			poReceived: { label: "Purchase Order", active: true },
			invoiced: { label: "Invoice", active: true },
		},
		confirmWhen: ["contract_signed", "po_received", "deposit_received", "paid_full"],
	};

	const STATUS_META = {
		pending:            { label: "Pending",            badgeClass: "rux-badge--danger",    icon: "schedule" },
		contract_signed:    { label: "Contract Signed",    badgeClass: "rux-badge--warning",   icon: "edit_document" },
		po_partial:         { label: "Partial PO",         badgeClass: "rux-badge--warning",   icon: "pending_actions" },
		po_received:        { label: "PO Received",        badgeClass: "rux-badge--info",      icon: "receipt_long" },
		deposit_received:   { label: "Deposit Received",   badgeClass: "rux-badge--info",      icon: "payments" },
		paid_full:          { label: "Paid in Full",       badgeClass: "rux-badge--success",   icon: "paid" },
		overpaid:           { label: "Overpaid",           badgeClass: "rux-badge--warning",   icon: "warning" },
	};

	let config = normalizeConfig(DEFAULT_CONFIG);

	function clone(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function normalizeConfig(value) {
		const source = value && typeof value === "object" ? value : {};
		const workflow = { ...clone(DEFAULT_CONFIG.workflow) };
		Object.entries(source.workflow || {}).forEach(([key, item]) => {
			if (!workflow[key]) return;
			workflow[key] = {
				...workflow[key],
				...(item && typeof item === "object" ? item : {}),
				label: String(item?.label || workflow[key].label).trim() || workflow[key].label,
				active: item?.active !== false,
			};
		});
		const allowed = new Set(Object.keys(STATUS_META).filter((key) => key !== "pending"));
		const confirmWhen = Array.isArray(source.confirmWhen)
			? source.confirmWhen.filter((key) => allowed.has(key))
			: DEFAULT_CONFIG.confirmWhen;
		return {
			workflow,
			confirmWhen: confirmWhen.length ? [...new Set(confirmWhen)] : [...DEFAULT_CONFIG.confirmWhen],
		};
	}

	function getConfig() {
		return clone(config);
	}

	function workflowItem(key) {
		return config.workflow[key] || DEFAULT_CONFIG.workflow[key];
	}

	function isWorkflowActive(key) {
		return workflowItem(key)?.active !== false;
	}

	function paymentNumber(value) {
		const number = Number.parseFloat(value);
		return Number.isFinite(number) ? number : 0;
	}

	/**
	 * Derive billing status from a normalized state object.
	 * @param {Object} state - { contractSigned, poReceived, poAmount, price, paid, balance }
	 * @returns {string} status key
	 */
	function deriveStatus(state = {}) {
		const contractSigned = isWorkflowActive("contractSigned") && !!state.contractSigned;
		const poReceived = isWorkflowActive("poReceived") && !!state.poReceived;
		const poAmount = paymentNumber(state.poAmount);
		const price = paymentNumber(state.price);
		const paid = paymentNumber(state.paid);
		const balance = Number.isFinite(Number(state.balance)) ? Number(state.balance) : price - paid;
		const remainingBalance = Math.max(0, balance);

		if (price > 0 && balance < 0) return "overpaid";
		if (price > 0 && paid > 0 && balance <= 0) return "paid_full";
		if (poReceived && price > 0 && poAmount < remainingBalance) return "po_partial";
		if (poReceived) return "po_received";
		if (paid > 0 && (balance > 0 || price <= 0)) return "deposit_received";
		if (contractSigned) return "contract_signed";
		return "pending";
	}

	/**
	 * Normalize a raw DB trip record into the state shape expected by deriveStatus.
	 * Handles legacy column names and fallbacks.
	 */
	function normalizeRecord(trip = {}) {
		const paid = paymentNumber(trip.deposit_amount ?? trip.depositAmount ?? trip.totalPaid ?? trip.paid);
		const price = paymentNumber(trip.quoted_price ?? trip.quotedPrice ?? trip.price);
		const hasPaidDate = !!(trip.date_paid || trip.datePaid);
		const contractSigned = trip.contract_status === "Signed" || trip.contractSigned === true || !!trip.confirmed;
		const poReceived = !!(trip.po_received || trip.poReceived || trip.po_ref || trip.paymentRef);
		const hasPoAmount = Object.hasOwn(trip, "po_amount") || Object.hasOwn(trip, "poAmount");
		const poAmount = hasPoAmount
			? paymentNumber(trip.po_amount ?? trip.poAmount)
			: (poReceived ? price : 0);
		return {
			contractSigned,
			poReceived,
			poAmount,
			price,
			paid: hasPaidDate && paid <= 0 ? price : paid,
			balance: hasPaidDate && paid >= price ? 0 : price - paid,
		};
	}

	/**
	 * Derive billing status from a raw DB trip record.
	 */
	function deriveRecordStatus(trip = {}) {
		return deriveStatus(normalizeRecord(trip));
	}

	function statusMeta(status) {
		const meta = STATUS_META[status] || STATUS_META.pending;
		const labelOverrides = {
			contract_signed: workflowItem("contractSigned")?.label,
			po_received: workflowItem("poReceived")?.label,
		};
		return {
			...meta,
			label: labelOverrides[status] || meta.label,
		};
	}

	/**
	 * Render a status badge into an element.
	 * @param {HTMLElement} el
	 * @param {string} statusKey
	 * @param {{ confirmed?: boolean }} [options]
	 */
	function renderStatusBadge(el, statusKey, options = {}) {
		if (!el) return;
		const meta = statusMeta(statusKey);
		const confirmed = typeof options.confirmed === "boolean"
			? options.confirmed
			: isStatusConfirmed(statusKey);
		const badgeClass = confirmed
			? (statusKey === "paid_full" ? "rux-badge--success" : "rux-badge--info")
			: "rux-badge--danger";
		el.className = `rux-badge ${badgeClass} rux-trip-panel__billing-status`;
		el.innerHTML = meta.icon
			? `<span class="rux-icon">${meta.icon}</span>${meta.label}`
			: meta.label;
		
	}

	/**
	 * Return the status key for the next pending step a trip needs to reach.
	 * Returns null when the trip is already at its final status.
	 */
	const STEP_ORDER = ["contract_signed", "po_partial", "po_received", "deposit_received", "paid_full"];
	function nextPendingStep(status) {
		if (status === "overpaid") return null;
		const idx = STEP_ORDER.indexOf(status);
		if (idx < 0) return STEP_ORDER[0]; // pending → first step
		if (idx < STEP_ORDER.length - 1) return STEP_ORDER[idx + 1];
		return null; // already at final step
	}

	function isStatusConfirmed(status, cfg = config) {
		// Partial PO is operationally confirmed by the same workflow choice as
		// PO received, while its distinct status remains available for warnings.
		const confirmationStatus = status === "po_partial" ? "po_received" : status;
		return normalizeConfig(cfg).confirmWhen.includes(confirmationStatus);
	}

	function isStateConfirmed(state, cfg = config) {
		return isStatusConfirmed(deriveStatus(state), cfg);
	}

	function isRecordConfirmed(trip, cfg = config) {
		return isStatusConfirmed(deriveRecordStatus(trip), cfg);
	}

	const WORKFLOW_STATUS_KEY = {
		contractSigned: "contract_signed",
		poReceived:     "po_received",
	};

	function applyToTripPanel(root) {
		if (!root) return;
		root.querySelectorAll("[data-billing-key]").forEach((step) => {
			const key = step.dataset.billingKey;
			const item = workflowItem(key);
			if (!item) return;
			step.hidden = item.active === false;
			const label = step.querySelector("[data-billing-label]");
			if (label) label.textContent = item.label;
			const iconEl = step.querySelector("[data-billing-icon]");
			if (iconEl) {
				const statusKey = WORKFLOW_STATUS_KEY[key];
				const iconName = statusKey && STATUS_META[statusKey]?.icon;
				if (iconName) {
					iconEl.textContent = iconName;
					
				}
			}
		});
	}

	async function load() {
		try {
			const db = await import("../data/settings-db.js");
			config = normalizeConfig(await db.getSetting(KEY));
		} catch (err) {
			console.warn("Could not load billing workflow settings:", err);
			config = normalizeConfig(DEFAULT_CONFIG);
		}
		window.RuxSettings = {
			...(window.RuxSettings || {}),
			getBillingWorkflow: getConfig,
		};
		document.dispatchEvent(new CustomEvent("settings:billing", { detail: { config: getConfig() } }));
		return getConfig();
	}

	async function save(next) {
		config = normalizeConfig(next);
		const db = await import("../data/settings-db.js");
		await db.setSetting(KEY, config);
		window.RuxSettings = {
			...(window.RuxSettings || {}),
			getBillingWorkflow: getConfig,
		};
		document.dispatchEvent(new CustomEvent("settings:billing", { detail: { config: getConfig() } }));
		return getConfig();
	}

	window.RuxBilling = {
		KEY,
		DEFAULT_CONFIG: clone(DEFAULT_CONFIG),
		STATUS_META: clone(STATUS_META),
		STEP_ORDER,
		getConfig,
		normalizeConfig,
		deriveStatus,
		deriveRecordStatus,
		normalizeRecord,
		statusMeta,
		renderStatusBadge,
		nextPendingStep,
		isStatusConfirmed,
		isStateConfirmed,
		isRecordConfirmed,
		applyToTripPanel,
		load,
		save,
	};
})();
