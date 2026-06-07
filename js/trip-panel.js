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

/* Vehicle equipment — determines which bus is eligible for the trip.
   Rendered in the Dispatch pane alongside bus assignment.              */
const VEHICLE_REQS = [
	{ key: "sleeper", label: "Sleeper", icon: "moon" },
	{ key: "pax56", label: "56 pax", icon: "users" },
	{ key: "adaLift", label: "ADA lift", icon: "accessibility" },
];

/* Driver / trip needs — logistical items for the crew.
   Rendered in the Plan pane alongside trip planning details.          */
const DRIVER_NEEDS = [
	{ key: "hotel", label: "Hotel", icon: "building" },
	{ key: "fuelCard", label: "Fuel card", icon: "credit-card" },
];

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
				`<button class="rux-button rux-button--toggle${block ? " rux-button--block" : ""}" data-rux-toggle-button aria-pressed="false" data-req="${escHtml(req.key)}">
					<i data-lucide="${escHtml(req.icon)}" class="rux-icon"></i> ${escHtml(req.label)}
				</button>`,
		)
		.join("");
}

function buildBusGroup(idx, buses, drivers) {
	const busList = buses;
	const driverList = drivers;
	const busOpts = busList.map((b) => `<option value="${escHtml(b.id)}">${escHtml(b.number)}</option>`).join("");
	const driverOpts =
		`<option value="" disabled selected>Assign driver…</option>` +
		driverList.map((d) => `<option value="${escHtml(d.id)}">${escHtml(d.name)}</option>`).join("");

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
	container.innerHTML = "";
	for (let i = 0; i < n; i++) {
		container.appendChild(buildBusGroup(i, buses, drivers));
	}
	if (window.lucide) lucide.createIcons();
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

	const n = Math.max(1, Math.min(20, parseInt(busesInput.value, 10) || 1));
	const { buses, drivers } = getTripOptions(root);
	renderBusGroups(busGroupsEl, n, buses, drivers);
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

	/* ── Requirements ───────────────────────────────────────────────────── */

	const vehicleReqContainer = root.querySelector("#tp-vehicle-reqs");
	const driverNeedsContainer = root.querySelector("#tp-driver-needs");
	if (vehicleReqContainer || driverNeedsContainer) {
		if (vehicleReqContainer) renderRequirements(vehicleReqContainer, VEHICLE_REQS);
		if (driverNeedsContainer) renderRequirements(driverNeedsContainer, DRIVER_NEEDS, { block: false });
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
		updateTripOptions(root);

		busesInput.addEventListener("input", () => {
			const n = Math.max(1, Math.min(20, parseInt(busesInput.value, 10) || 1));
			const { buses, drivers } = getTripOptions(root);
			renderBusGroups(busGroupsEl, n, buses, drivers);
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

window.TripPanel = { init: initTripPanel, initTabs: initTripTabs, updateOptions: updateTripOptions };
