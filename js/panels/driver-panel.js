(function () {
	"use strict";

	// ── DOM refs ──────────────────────────────────────────────────────────────

	const dialog = document.getElementById("driver-editor-dialog");
	const panelEl = dialog;
	const tbody = document.getElementById("driver-roster-body");
	const tabBtns = document.querySelectorAll('[data-rux-tabs][data-scope="driver"] .rux-tab');
	const panes = document.querySelectorAll(".sched-scope-driver__pane");
	const cdlGroup = document.getElementById("dp-cdl-group");
	const tripList = document.getElementById("dp-trip-list");
	const scheduleStatus = document.getElementById("dp-schedule-status");
	const scheduleSummary = document.getElementById("dp-schedule-summary");
	const scheduleManageBtn = document.getElementById("dp-schedule-manage");
	const scheduleOpenBtn = document.getElementById("dp-schedule-open");
	const scheduleCopyBtn = document.getElementById("dp-schedule-copy");
	const scheduleDeactivateBtn = document.getElementById(
		"dp-schedule-deactivate",
	);
	const dpAvatarBtn = document.getElementById("dp-avatar");
	const dpAvatarMain = document.getElementById("dp-avatar-main");
	const dpAvatarInput = document.getElementById("dp-avatar-input");
	const driverModule = document.querySelector(
		'.rux-app-view[data-view="drivers"]',
	);
	const rosterView = document.getElementById("driver-roster-view");
	const driverTable = document.getElementById("driver-roster-table");
	const workloadOptionsCard = document.getElementById(
		"driver-workload-options-card",
	);
	const workloadStartInput = document.getElementById("driver-workload-start");
	const workloadEndLabel = document.getElementById(
		"driver-workload-end-label",
	);
	const workloadAlert = document.getElementById("driver-workload-alert");
	const workloadAlertText = document.getElementById(
		"driver-workload-alert-text",
	);
	const driverToolsTitle = document.getElementById("driver-tools-title");

	let db = null;
	let settingsDb = null;
	let workloadUtils = null;
	let selectedId = null;
	let selectedScheduleShare = null;
	let scheduleLoadRequest = 0;
	let allDrivers = [];
	let colConfig = [];
	let allWorkloadAssignments = null;
	let workloadControlsReady = false;
	let activeDriverView = "roster";

	const DRIVER_SHARE_ORIGIN = "https://rux-sm.github.io/rux-ui/";
	const DRIVER_WORKLOAD_START_KEY = "rux:driver-workload-start";

	// ── Floating editor window ────────────────────────────────────────────────
	// Same composition as the trip, fleet, and customer editor dialogs: a
	// .rux-panel--floating window dragged by its header via RuxFloatingWindow;
	// the shared ≤580px breakpoint in rux-ui/css/base/panel.css pins it
	// near-full-screen on phones.

	const dialogTitleEl = document.getElementById("driver-editor-dialog-title");
	const mobileWindowQuery = window.matchMedia("(max-width: 580px)");

	window.RuxFloatingWindow?.attachDrag(
		dialog,
		dialog.querySelector("[data-driver-dialog-header]"),
		{ minViewportWidth: 580 },
	);

	// Snapshot of the form as last populated/cleared — closing (or switching
	// drivers) with edits on top of it asks before discarding.
	let cleanForm = null;
	function markFormClean() { cleanForm = JSON.stringify(readForm()); }
	function formIsDirty()   { return cleanForm !== null && JSON.stringify(readForm()) !== cleanForm; }

	function openDialog(title) {
		if (dialogTitleEl && title) dialogTitleEl.textContent = title;
		if (mobileWindowQuery.matches) window.RuxFloatingWindow?.resetGeometry(dialog);
		dialog.hidden = false;
		panelEl.querySelector(".sched-scope-driver__body")?.scrollTo({ top: 0, behavior: "instant" });
	}

	// Returns false when the user keeps their unsaved edits instead.
	function closeDialog({ discard = false } = {}) {
		if (dialog.hidden) return true;
		if (!discard && formIsDirty() && !confirm("Discard unsaved changes to this driver?")) return false;
		dialog.hidden = true;
		tbody
			.querySelectorAll(".driver-app__row")
			.forEach((r) => r.removeAttribute("aria-current"));
		selectedId = null;
		return true;
	}

	document
		.getElementById("driver-dialog-close-btn")
		?.addEventListener("click", () => closeDialog());

	document.getElementById("driver-new-btn")?.addEventListener("click", () => {
		if (!closeDialog()) return;
		clearPanel();
		openDialog("New Driver");
	});

	// Right-side "Table Options" drawer (View Options + Filters) — the
	// calendar Tools pattern: resizable right drawer, workspace-header toggle.
	const toolsDrawer = document.getElementById("driver-tools-drawer");
	const toolsPanelEl = toolsDrawer.querySelector(".sched-scope-right-panel");

	const toolsDrawerHandle = RuxDrawer.create({
		drawer: toolsDrawer,
		panel: toolsPanelEl,
		toggleBtn: document.getElementById("driver-tools-toggle-btn"),
		handle: document.getElementById("driver-tools-resize-gutter"),
		direction: "right",
	});
	const openToolsDrawer = toolsDrawerHandle.open;
	const closeToolsDrawer = toolsDrawerHandle.close;

	document
		.querySelectorAll('[data-rux-domain-toggle][data-scope="driver-tools"]')
		.forEach((button) => {
			button.addEventListener("click", () => {
				toolsDrawer.classList.contains("is-open")
					? closeToolsDrawer()
					: openToolsDrawer();
			});
		});

	// ── Tabs ──────────────────────────────────────────────────────────────────

	function switchTab(activeBtn) {
		tabBtns.forEach((btn) =>
			btn.setAttribute(
				"aria-selected",
				btn === activeBtn ? "true" : "false",
			),
		);
		const targetId = activeBtn.getAttribute("aria-controls");
		panes.forEach((pane) => {
			pane.hidden = pane.id !== targetId;
		});
	}

	tabBtns.forEach((btn) =>
		btn.addEventListener("click", () => switchTab(btn)),
	);

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
		return (
			((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?"
		);
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
	}

	function avatarCellHtml(d) {
		const photoUrl = driverPhotoUrl(d);
		return photoUrl ? `<img src="${photoUrl}" alt="">` : initials(d.name);
	}

	function driverIdentityCellHtml(d) {
		return `
			<td data-col="driver">
				<div class="driver-app__driver-cell">
					<div class="driver-app__avatar${d.status === "inactive" ? " driver-app__avatar--inactive" : ""}" aria-hidden="true">${avatarCellHtml(d)}</div>
					<div class="driver-app__driver-info"><span class="driver-app__driver-name">${escapeHtml(d.name)}</span></div>
				</div>
			</td>`;
	}

	const EMPLOYMENT_TYPE_LABELS = {
		"full-time": "Full-time",
		"part-time": "Part-time",
		contract: "Contract",
		seasonal: "Seasonal",
	};

	function employmentCellHtml(d) {
		return `<td data-col="employment-type"><span class="rux-priority-dot" data-priority="${d.priority || 3}" aria-hidden="true" title="Priority ${d.priority || 3}"></span>${EMPLOYMENT_TYPE_LABELS[d.employment_type] || "—"}</td>`;
	}

	function statusMeta(s) {
		if (s === "active")
			return { label: "Active", cls: "rux-status-text--success" };
		if (s === "on-leave")
			return { label: "On Leave", cls: "rux-status-text--warning" };
		return { label: "Inactive", cls: "" };
	}

	function fmtDate(iso) {
		if (!iso) return "—";
		const [y, m, d] = iso.split("-");
		return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	function driverScheduleUrl(token) {
		const url = new URL("driver.html", DRIVER_SHARE_ORIGIN);
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
			scheduleSummary.textContent =
				"Checking this driver’s shared schedule…";
			return;
		}
		if (state === "error") {
			setScheduleStatus("Unavailable", "danger");
			scheduleSummary.textContent =
				"The shared schedule status could not be loaded.";
			return;
		}
		if (!selectedId) {
			setScheduleStatus("Inactive");
			scheduleSummary.textContent =
				"Select a driver to view their shared schedule.";
			return;
		}
		if (!share?.token) {
			setScheduleStatus("Inactive");
			scheduleSummary.textContent =
				"No active link. Manage assignments to activate this driver’s permanent URL.";
			return;
		}

		scheduleDeactivateBtn.disabled = false;
		setScheduleStatus("Active", "success");
		scheduleOpenBtn.disabled = false;
		scheduleCopyBtn.disabled = false;
		const range =
			share.rangeStart && share.rangeEnd
				? `${fmtDate(share.rangeStart)} – ${fmtDate(share.rangeEnd)}`
				: "Upcoming assignments";
		scheduleSummary.textContent = `Current shared schedule · ${range}`;
	}

	async function loadDriverScheduleShare(driverId) {
		const requestId = ++scheduleLoadRequest;
		renderScheduleShare(null, "loading");
		try {
			const share = await db.fetchDriverScheduleShare(driverId);
			if (
				requestId !== scheduleLoadRequest ||
				String(driverId) !== String(selectedId)
			)
				return;
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
		const s = new Date(start + "T00:00:00");
		const e = end ? new Date(end + "T00:00:00") : null;
		const mo = { month: "short", day: "numeric" };
		const sl = s.toLocaleDateString("en-US", mo);
		if (!e || start === end) return sl;
		return s.getMonth() === e.getMonth()
			? `${sl}–${e.getDate()}`
			: `${sl} – ${e.toLocaleDateString("en-US", mo)}`;
	}

	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function formatWorkloadMoney(value) {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(value || 0);
	}

	function formatWorkloadMiles(value) {
		return `${new Intl.NumberFormat("en-US", {
			maximumFractionDigits: 1,
		}).format(value || 0)} mi`;
	}

	function workloadWarningHtml(message) {
		const safe = escapeHtml(message);
		return `<span class="rux-icon driver-app__workload-warning" role="img" aria-label="${safe}" title="${safe}">warning</span>`;
	}

	function workloadStatHtml(value, warning) {
		return `<span class="driver-app__workload-stat"><span>${value}</span>${warning ? workloadWarningHtml(warning) : ""}</span>`;
	}

	function rosterOrderedWorkloadRows(rows) {
		const rowsByDriverId = new Map(
			rows.map((row) => [String(row.driverId), row]),
		);
		return getSortedDrivers()
			.map((driver) => rowsByDriverId.get(String(driver.id)))
			.filter(Boolean);
	}

	function renderWorkloadRows(result) {
		const rows = rosterOrderedWorkloadRows(result.rows);
		const theadRow = driverTable.querySelector("thead tr");
		theadRow.innerHTML = `
			<th scope="col" data-col="driver">Driver</th>
			<th scope="col" data-col="employment-type">Employment</th>
			<th scope="col">Days</th>
			<th scope="col">Trips</th>
			<th scope="col" title="Actual trip miles when present; otherwise estimated miles">Miles</th>
			<th scope="col">Pay</th>`;
		if (!rows.length) {
			tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty">No drivers found.</td></tr>`;
			return;
		}

		tbody.innerHTML = rows
			.map((row) => {
				const payWarning = row.payMissingCount
					? `Pay incomplete — ${row.payMissingCount} of ${row.assignmentCount} driver assignments ${row.payMissingCount === 1 ? "is" : "are"} missing pay`
					: "";
				const mileageWarning = row.milesMissingCount
					? `Mileage incomplete — ${row.milesMissingCount} of ${row.tripsAssigned} assigned trips ${row.milesMissingCount === 1 ? "is" : "are"} missing mileage`
					: "";
				const payValue = row.payMissingCount && !row.payKnownCount
					? "—"
					: formatWorkloadMoney(row.payTotal);
				const milesValue = row.milesMissingCount && !row.milesKnownTripCount
					? "—"
					: formatWorkloadMiles(row.milesTotal);
				return `
					<tr class="driver-app__row driver-app__workload-row"${String(row.driverId) === String(selectedId) ? ' aria-current="true"' : ""} tabindex="0" data-id="${escapeHtml(row.driverId)}" data-status="${escapeHtml(row.driver.status || "active")}" data-employment-type="${escapeHtml(row.driver.employment_type || "")}">
						${driverIdentityCellHtml(row.driver)}
						${employmentCellHtml(row.driver)}
						<td>${row.daysWorked}</td>
						<td>${row.tripsAssigned}</td>
						<td>${workloadStatHtml(milesValue, mileageWarning)}</td>
						<td>${workloadStatHtml(payValue, payWarning)}</td>
					</tr>`;
			})
			.join("");
	}

	function renderWorkloadAlert(result) {
		const messages = [];
		if (result.missingPayAssignments) {
			messages.push(
				`pay is missing from ${result.missingPayAssignments} driver ${result.missingPayAssignments === 1 ? "assignment" : "assignments"}`,
			);
		}
		if (result.missingMileageTrips) {
			messages.push(
				`mileage is missing from ${result.missingMileageTrips} ${result.missingMileageTrips === 1 ? "trip" : "trips"}`,
			);
		}
		workloadAlert.hidden = messages.length === 0;
		if (!messages.length) {
			workloadAlertText.textContent = "";
			return;
		}
		workloadAlertText.textContent = `Some totals are incomplete for ${fmtDate(workloadStartInput.value)} through ${fmtDate(localIsoDate())}: ${messages.join("; ")}.`;
	}

	function renderWorkload() {
		if (
			activeDriverView !== "workload" ||
			!workloadUtils ||
			!allWorkloadAssignments
		)
			return;
		const result = workloadUtils.aggregateDriverWorkload(
			allDrivers,
			allWorkloadAssignments,
			{
				startDate: workloadStartInput.value,
				endDate: localIsoDate(),
			},
		);
		renderWorkloadAlert(result);
		renderWorkloadRows(result);
	}

	function syncWorkloadPresetButtons() {
		const today = localIsoDate();
		workloadOptionsCard
			?.querySelectorAll("[data-workload-preset]")
			.forEach((button) => {
				const on = workloadStartInput.value
					=== workloadUtils.workloadPresetStartDate(
						button.dataset.workloadPreset,
						today,
					);
				button.setAttribute("aria-pressed", String(on));
			});
	}

	async function loadWorkloadData({ refresh = false } = {}) {
		if (!db || !workloadUtils) return;
		if (refresh) allWorkloadAssignments = null;
		if (!allWorkloadAssignments) {
			if (activeDriverView === "workload") {
				tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty">Calculating workload…</td></tr>`;
			}
			workloadAlert.hidden = true;
			try {
				allWorkloadAssignments =
					await db.fetchDriverWorkloadAssignments();
			} catch (err) {
				console.error("fetchDriverWorkloadAssignments failed:", err);
				if (activeDriverView === "workload") {
					tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Could not calculate workload: ${escapeHtml(err?.message || err)}</td></tr>`;
				}
				return;
			}
		}
		if (activeDriverView === "workload") renderWorkload();
	}

	async function setDriverView(view) {
		activeDriverView = view === "workload" ? "workload" : "roster";
		const showWorkload = activeDriverView === "workload";
		driverModule
			?.querySelectorAll("[data-driver-view]")
			.forEach((button) => {
				const on = button.dataset.driverView === activeDriverView;
				button.setAttribute("aria-pressed", String(on));
			});
		driverModule?.classList.toggle("driver-app--workload", showWorkload);
		workloadOptionsCard.hidden = !showWorkload;
		workloadAlert.hidden = true;
		driverTable.classList.toggle("driver-app__table--workload", showWorkload);
		driverTable.setAttribute(
			"aria-label",
			showWorkload ? "Driver workload totals" : "Driver roster",
		);
		rosterView.setAttribute(
			"aria-label",
			showWorkload ? "Driver workload" : "Driver roster",
		);
		if (driverToolsTitle) {
			driverToolsTitle.textContent = showWorkload
				? "Workload Options"
				: "Table Options";
		}
		if (showWorkload) {
			await loadWorkloadData();
		} else {
			renderRoster();
		}
	}

	function setupWorkloadControls() {
		if (workloadControlsReady || !workloadOptionsCard || !workloadUtils) return;
		workloadControlsReady = true;
		const today = localIsoDate();
		let storedStart = "";
		try {
			storedStart = localStorage.getItem(DRIVER_WORKLOAD_START_KEY) || "";
		} catch (_) {
			/* storage is optional */
		}
		const validStoredStart = /^\d{4}-\d{2}-\d{2}$/.test(storedStart)
			&& storedStart <= today;
		workloadStartInput.max = today;
		workloadStartInput.value = validStoredStart
			? storedStart
			: workloadUtils.workloadPresetStartDate("ytd", today);
		workloadEndLabel.textContent = fmtDate(today);
		syncWorkloadPresetButtons();

		driverModule.querySelectorAll("[data-driver-view]").forEach((button) => {
			button.addEventListener("click", () => {
				setDriverView(button.dataset.driverView);
			});
		});

		workloadOptionsCard
			.querySelectorAll("[data-workload-preset]")
			.forEach((button) => {
				button.addEventListener("click", () => {
					workloadStartInput.value =
						workloadUtils.workloadPresetStartDate(
							button.dataset.workloadPreset,
							today,
						);
					workloadStartInput.dispatchEvent(
						new Event("change", { bubbles: true }),
					);
				});
			});

		workloadStartInput.addEventListener("change", () => {
			if (!workloadStartInput.value || workloadStartInput.value > today) {
				workloadStartInput.value =
					workloadUtils.workloadPresetStartDate("ytd", today);
			}
			try {
				localStorage.setItem(
					DRIVER_WORKLOAD_START_KEY,
					workloadStartInput.value,
				);
			} catch (_) {
				/* storage is optional */
			}
			syncWorkloadPresetButtons();
			renderWorkload();
		});

		const openWorkloadDriver = (event) => {
			if (activeDriverView !== "workload") return;
			const row = event.target.closest("[data-id]");
			if (!row) return;
			if (event.type === "keydown" && !["Enter", " "].includes(event.key)) {
				return;
			}
			if (event.type === "keydown") event.preventDefault();
			const driver = allDrivers.find(
				(item) => String(item.id) === String(row.dataset.id),
			);
			if (driver) selectRow(row, driver);
		};
		tbody.addEventListener("click", openWorkloadDriver);
		tbody.addEventListener("keydown", openWorkloadDriver);
		window.Rux?.syncDateInputs(workloadOptionsCard);
	}

	function renderTripList(trips) {
		if (!trips.length) {
			tripList.innerHTML = `<li class="sched-scope-driver__trip-item"><span class="rux-u-muted">No trips assigned.</span></li>`;
			return;
		}
		tripList.innerHTML = trips
			.map((t) => {
				const dates = fmtTripDates(t.startDate, t.endDate);
				const meta =
					[dates, t.destination].filter(Boolean).join(" · ") +
					(t.busNumber ? ` · Bus ${t.busNumber}` : "");
				const status = t.invoiceStatus || "pending";
				const isPaid = status === "paid";
				const badgeCls = isPaid ? "rux-badge--success" : "";
				const badgeLabel =
					status.charAt(0).toUpperCase() + status.slice(1);
				return `
        <li class="sched-scope-driver__trip-item">
          <span class="sched-scope-driver__trip-id">${t.tripRef}</span>
          <span class="sched-scope-driver__trip-meta">${meta}</span>
          <span class="rux-badge rux-badge--dot ${badgeCls}">${badgeLabel}</span>
        </li>
      `;
			})
			.join("");
	}

	function licExpiryClass(iso) {
		if (!iso) return "driver-app__expiry";
		const today = localIsoDate();
		if (iso < today)
			return "driver-app__expiry driver-app__expiry--expired";
		const warn = new Date();
		warn.setMonth(warn.getMonth() + 3);
		if (iso <= localIsoDate(warn))
			return "driver-app__expiry driver-app__expiry--warn";
		return "driver-app__expiry";
	}

	// ── Column definitions ────────────────────────────────────────────────────

	const ALL_DRIVER_COLS = [
		{
			key: "status",
			label: "Status",
			defaultOn: true,
			head: `<th scope="col" data-col="status">Status</th>`,
			cell: (d) => {
				const s = statusMeta(d.status);
				return `<td data-col="status"><span class="rux-status-text ${s.cls}">${s.label}</span></td>`;
			},
		},
		{
			key: "phone",
			label: "Phone",
			defaultOn: true,
			head: `<th scope="col" data-col="phone">Phone</th>`,
			cell: (d) =>
				`<td class="driver-app__phone rux-u-mono" data-col="phone">${d.phone || "—"}</td>`,
		},
		{
			key: "cdl",
			label: "CDL",
			defaultOn: true,
			head: `<th scope="col" data-col="cdl">CDL</th>`,
			cell: (d) =>
				`<td data-col="cdl">${d.cdl_class ? `<span class="rux-tag">CDL-${d.cdl_class}</span>` : `<span class="rux-u-muted">—</span>`}</td>`,
		},
		{
			key: "expiry",
			label: "License Exp",
			defaultOn: true,
			head: `<th scope="col" data-col="expiry">License Exp</th>`,
			cell: (d) => {
				const e = d.license_exp || "";
				return `<td class="${licExpiryClass(e)}" data-col="expiry">${fmtDate(e)}</td>`;
			},
		},
		{
			key: "short-name",
			label: "Short name",
			defaultOn: false,
			head: `<th scope="col" data-col="short-name">Short name</th>`,
			cell: (d) =>
				`<td data-col="short-name" class="rux-u-mono">${d.short_name || "—"}</td>`,
		},
		{
			key: "email",
			label: "Email",
			defaultOn: false,
			head: `<th scope="col" data-col="email">Email</th>`,
			cell: (d) => `<td data-col="email">${d.email || "—"}</td>`,
		},
		{
			key: "city",
			label: "City",
			defaultOn: false,
			head: `<th scope="col" data-col="city">City</th>`,
			cell: (d) => `<td data-col="city">${d.city || "—"}</td>`,
		},
		{
			key: "hire-date",
			label: "Hire date",
			defaultOn: false,
			head: `<th scope="col" data-col="hire-date">Hire date</th>`,
			cell: (d) =>
				`<td data-col="hire-date">${fmtDate(d.hire_date)}</td>`,
		},
		{
			key: "med-card-exp",
			label: "Medical Exp",
			defaultOn: false,
			head: `<th scope="col" data-col="med-card-exp">Medical Exp</th>`,
			cell: (d) => {
				const e = d.med_card_expiry || "";
				return `<td class="${licExpiryClass(e)}" data-col="med-card-exp">${fmtDate(e)}</td>`;
			},
		},
		{
			key: "endorsements",
			label: "Endorsements",
			defaultOn: false,
			head: `<th scope="col" data-col="endorsements">Endorsements</th>`,
			cell: (d) =>
				`<td data-col="endorsements">${d.endorsements || "—"}</td>`,
		},
		{
			key: "license-number",
			label: "License #",
			defaultOn: false,
			head: `<th scope="col" data-col="license-number">License #</th>`,
			cell: (d) =>
				`<td data-col="license-number" class="rux-u-mono">${d.license_number || "—"}</td>`,
		},
		{
			key: "license-state",
			label: "License state",
			defaultOn: false,
			head: `<th scope="col" data-col="license-state">License state</th>`,
			cell: (d) =>
				`<td data-col="license-state">${d.license_state || "—"}</td>`,
		},
		{
			key: "emergency-contact",
			label: "Emergency contact",
			defaultOn: false,
			head: `<th scope="col" data-col="emergency-contact">Emergency contact</th>`,
			cell: (d) =>
				`<td data-col="emergency-contact">${d.emergency_contact_name || "—"}</td>`,
		},
		{
			key: "notes",
			label: "Notes",
			defaultOn: false,
			head: `<th scope="col" data-col="notes">Notes</th>`,
			cell: (d) =>
				`<td data-col="notes">${d.notes ? `<span class="fleet-app__truncate rux-u-muted" title="${d.notes.replace(/"/g, "&quot;")}">${d.notes}</span>` : '<span class="rux-u-muted">—</span>'}</td>`,
		},
		{
			key: "next-trip",
			label: "Next trip",
			defaultOn: true,
			head: `<th scope="col" data-col="next-trip">Next trip</th>`,
			cell: (d) =>
				`<td data-col="next-trip"><span class="rux-u-muted">—</span></td>`,
		},
	];

	function getActiveCols() {
		return colConfig
			.filter((c) => c.visible)
			.map((c) => ALL_DRIVER_COLS.find((d) => d.key === c.key))
			.filter(Boolean);
	}

	// ── Row rendering ─────────────────────────────────────────────────────────

	function renderRows(list) {
		const activeCols = getActiveCols();
		const table = tbody.closest("table");

		// Rebuild thead
		const theadRow = table.querySelector("thead tr");
		theadRow.innerHTML =
			`<th scope="col" data-col="driver">Driver</th>` +
			`<th scope="col" data-col="employment-type">Employment</th>` +
			activeCols.map((c) => c.head).join("");

		tbody.innerHTML = "";
		if (!list.length) {
			tbody.innerHTML = `<tr><td colspan="${2 + activeCols.length}" class="driver-app__empty">No drivers — add one to get started.</td></tr>`;
			return;
		}

		list.forEach((d, idx) => {
			const tr = document.createElement("tr");
			tr.className = "driver-app__row";
			if (String(d.id) === String(selectedId)) tr.setAttribute("aria-current", "true");
			tr.tabIndex = 0;
			tr.dataset.id = d.id;
			tr.dataset.idx = idx;
			tr.dataset.status = d.status || "active";
			tr.dataset.employmentType = d.employment_type || "";

			tr.innerHTML =
				driverIdentityCellHtml(d) +
				employmentCellHtml(d) +
				activeCols.map((c) => c.cell(d)).join("");

			tr.addEventListener("click", () => selectRow(tr, d));
			tr.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					selectRow(tr, d);
				}
			});

			tbody.appendChild(tr);
		});
	}

	function renderRoster() {
		renderRows(getSortedDrivers());
		applyFilter();
	}

	function renderCurrentDriverView() {
		if (activeDriverView === "workload") {
			renderWorkload();
		} else {
			renderRoster();
		}
	}

	function selectRow(tr, d) {
		if (!closeDialog()) return;
		tr.setAttribute("aria-current", "true");
		selectedId = d.id;
		populatePanel(d);
		loadDriverTrips(d.id);
		loadDriverScheduleShare(d.id);
		loadTimeOff(d.id);
		openDialog(d.name || "Edit Driver");
	}

	// ── Panel population ──────────────────────────────────────────────────────

	function populatePanel(d) {
		const parts = (d.name || "").split(" ");
		const first = parts[0] || "";
		const last = parts.slice(1).join(" ") || "";

		renderAvatar(d);
		document.getElementById("dp-sort-order").value = d.sort_order ?? "";
		document.getElementById("dp-first-name").value = first;
		document.getElementById("dp-last-name").value = last;
		document.getElementById("dp-short-name").value = d.short_name || "";
		document.getElementById("dp-phone").value = d.phone || "";
		document.getElementById("dp-texting-url").value = d.texting_url || "";
		document.getElementById("dp-email").value = d.email || "";
		document.getElementById("dp-address").value = d.address || "";
		document.getElementById("dp-city").value = d.city || "";
		document.getElementById("dp-state").value = d.address_state || "";
		document.getElementById("dp-zip").value = d.zip || "";
		document.getElementById("dp-dob").value = d.date_of_birth || "";
		document.getElementById("dp-hire-date").value = d.hire_date || "";
		document.getElementById("dp-lic-num").value = d.license_number || "";
		document.getElementById("dp-lic-state").value = d.license_state || "";
		document.getElementById("dp-lic-expiry").value = d.license_exp || "";
		document.getElementById("dp-med-expiry").value =
			d.med_card_expiry || "";
		document.getElementById("dp-notes").value = d.notes || "";
		document.getElementById("dp-ec-name").value =
			d.emergency_contact_name || "";
		document.getElementById("dp-ec-phone").value =
			d.emergency_contact_phone || "";

		// CDL class
		const cdl = (d.cdl_class || "A").toUpperCase();
		cdlGroup?.querySelectorAll(".rux-button").forEach((btn) => {
			const on = btn.textContent.trim() === `Class ${cdl}`;
			btn.setAttribute("aria-pressed", on ? "true" : "false");
		});

		// Employment status
		const statusLabels = {
			active: "Active",
			"on-leave": "On Leave",
			inactive: "Inactive",
		};
		const target = statusLabels[d.status] || "Active";
		panelEl
			.querySelectorAll(".sched-scope-driver__status-group .rux-button")
			.forEach((btn) => {
				const on =
					btn
						.querySelector("span:not(.rux-icon)")
						?.textContent.trim() === target;
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});

		// Employment type
		const empTypeLabels = {
			"full-time": "Full-time",
			"part-time": "Part-time",
			contract: "Contract",
			seasonal: "Seasonal",
		};
		const empTarget =
			empTypeLabels[d.employment_type || "full-time"] || "Full-time";
		panelEl
			.querySelectorAll("[data-emp-type-group] .rux-button")
			.forEach((btn) => {
				const on = btn.textContent.trim() === empTarget;
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});

		// Priority
		const priorityTarget = String(d.priority || 3);
		panelEl
			.querySelectorAll("[data-priority-group] .rux-button")
			.forEach((btn) => {
				const on =
					btn.querySelector(".rux-priority-dot")?.dataset.priority ===
					priorityTarget;
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});

		// Endorsements
		const ends = Array.isArray(d.endorsements) ? d.endorsements : [];
		panelEl
			.querySelectorAll(".sched-scope-driver__endorsements .rux-button")
			.forEach((btn) => {
				const on = ends.includes(btn.textContent.trim());
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});

		switchTab(tabBtns[0]);
		window.Rux?.syncDateInputs(panelEl);
		markFormClean();
	}

	// ── Form read ─────────────────────────────────────────────────────────────

	function readForm() {
		const first = document.getElementById("dp-first-name").value.trim();
		const last = document.getElementById("dp-last-name").value.trim();

		const statusBtn = panelEl.querySelector(
			".sched-scope-driver__status-group .rux-button[aria-pressed='true']",
		);
		const statusRevMap = {
			Active: "active",
			"On Leave": "on-leave",
			Inactive: "inactive",
		};
		const statusText =
			statusBtn
				?.querySelector("span:not(.rux-icon)")
				?.textContent.trim() || "Active";

		const cdlBtn = cdlGroup?.querySelector(
			".rux-button[aria-pressed='true']",
		);
		const cdlClass = cdlBtn
			? cdlBtn.textContent.trim().replace("Class ", "")
			: "A";

		const empTypeBtn = panelEl.querySelector(
			"[data-emp-type-group] .rux-button[aria-pressed='true']",
		);
		const empTypeMap = {
			"Full-time": "full-time",
			"Part-time": "part-time",
			Contract: "contract",
			Seasonal: "seasonal",
		};
		const empType =
			empTypeMap[empTypeBtn?.textContent.trim()] || "full-time";

		const priorityBtn = panelEl.querySelector(
			"[data-priority-group] .rux-button[aria-pressed='true']",
		);
		const priority =
			parseInt(
				priorityBtn?.querySelector(".rux-priority-dot")?.dataset
					.priority,
				10,
			) || 3;

		const endorsements = [
			...panelEl.querySelectorAll(
				".sched-scope-driver__endorsements .rux-button[aria-pressed='true']",
			),
		].map((btn) => btn.textContent.trim());

		const sortOrderRaw = document.getElementById("dp-sort-order").value;

		return {
			sort_order: sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null,
			name: [first, last].filter(Boolean).join(" ") || null,
			short_name:
				document.getElementById("dp-short-name").value.trim() || null,
			email: document.getElementById("dp-email").value.trim() || null,
			phone: document.getElementById("dp-phone").value.trim() || null,
			texting_url:
				document.getElementById("dp-texting-url").value.trim() || null,
			address: document.getElementById("dp-address").value.trim() || null,
			city: document.getElementById("dp-city").value.trim() || null,
			address_state:
				document
					.getElementById("dp-state")
					.value.trim()
					.toUpperCase() || null,
			zip: document.getElementById("dp-zip").value.trim() || null,
			date_of_birth: document.getElementById("dp-dob").value || null,
			hire_date: document.getElementById("dp-hire-date").value || null,
			cdl_class: cdlClass,
			license_number:
				document.getElementById("dp-lic-num").value.trim() || null,
			license_state:
				document.getElementById("dp-lic-state").value.trim() || null,
			license_exp: document.getElementById("dp-lic-expiry").value || null,
			med_card_expiry:
				document.getElementById("dp-med-expiry").value || null,
			endorsements: endorsements.length ? endorsements : null,
			status: statusRevMap[statusText] || "active",
			employment_type: empType,
			priority: priority,
			emergency_contact_name:
				document.getElementById("dp-ec-name").value.trim() || null,
			emergency_contact_phone:
				document.getElementById("dp-ec-phone").value.trim() || null,
			notes: document.getElementById("dp-notes").value.trim() || null,
			timeOff: collectTimeOff(),
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
		if (timeoffDeleteBtn)
			timeoffDeleteBtn.disabled = timeOffRowCount() === 0;
	}

	function createTimeOffRow(index) {
		const row = document.createElement("div");
		row.className = "sched-scope-driver__timeoff-row";
		row.dataset.timeoffRow = "";
		row.innerHTML = `
      <div class="sched-scope-driver__timeoff-fields">
        <div class="sched-scope-trip__contact-fields">
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
        <div class="rux-field"><label class="rux-field__label" for="dp-timeoff-notes-${index + 1}">Notes</label>
          <input class="rux-input" id="dp-timeoff-notes-${index + 1}" type="text" placeholder="Optional" data-timeoff-notes />
        </div>
      </div>
      <button type="button" class="sched-scope-trip__contact-select" data-timeoff-select aria-label="Delete time off">
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
			timeoffDeleteBtn.querySelector(".rux-icon").textContent = on
				? "close"
				: "delete";
			timeoffDeleteBtn.setAttribute(
				"aria-label",
				on ? "Cancel delete" : "Delete a time off entry",
			);
		}
	}

	function deleteTimeOffRow(row) {
		if (!timeoffRows || !row) return;
		const hasData = [...row.querySelectorAll("input")].some(
			(el) => el.value,
		);
		if (hasData && !confirm("Delete this time off entry?")) return;
		row.remove();
		setTimeOffSelecting(false);
		syncTimeOffButtons();
	}

	function resetTimeOffRows() {
		timeoffRows
			?.querySelectorAll("[data-timeoff-row]")
			.forEach((row) => row.remove());
		setTimeOffSelecting(false);
		syncTimeOffButtons();
	}

	function collectTimeOff() {
		const rows = timeoffRows?.querySelectorAll("[data-timeoff-row]") || [];
		return [...rows]
			.map((row, i) => ({
				position: i,
				start_date:
					row.querySelector("[data-timeoff-start]")?.value || null,
				end_date:
					row.querySelector("[data-timeoff-end]")?.value || null,
				reason:
					row.querySelector("[data-timeoff-reason]")?.value || null,
				notes:
					row.querySelector("[data-timeoff-notes]")?.value.trim() ||
					null,
			}))
			.filter((e) => e.start_date && e.end_date);
	}

	function populateTimeOff(entries) {
		resetTimeOffRows();
		const sorted = [...(entries || [])].sort(
			(a, b) => (a.position ?? 0) - (b.position ?? 0),
		);
		sorted.forEach((entry, i) => {
			const row = createTimeOffRow(i);
			timeoffRows.appendChild(row);
			if (entry.start_date)
				row.querySelector("[data-timeoff-start]").value =
					entry.start_date;
			if (entry.end_date)
				row.querySelector("[data-timeoff-end]").value = entry.end_date;
			if (entry.reason)
				row.querySelector("[data-timeoff-reason]").value = entry.reason;
			if (entry.notes)
				row.querySelector("[data-timeoff-notes]").value = entry.notes;
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
	timeoffDeleteBtn?.addEventListener("click", () =>
		setTimeOffSelecting(!timeOffSelecting),
	);
	timeoffRows?.addEventListener("click", (e) => {
		const selectBtn = e.target.closest("[data-timeoff-select]");
		if (selectBtn && timeOffSelecting)
			deleteTimeOffRow(selectBtn.closest("[data-timeoff-row]"));
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && timeOffSelecting) setTimeOffSelecting(false);
	});

	// ── Save ──────────────────────────────────────────────────────────────────

	document
		.getElementById("dp-btn-save")
		.addEventListener("click", async () => {
			if (!db) return;
			const textingUrlInput = document.getElementById("dp-texting-url");
			textingUrlInput.setCustomValidity("");
			if (textingUrlInput.value.trim()) {
				try {
					const textingUrl = new URL(textingUrlInput.value.trim());
					if (
						textingUrl.protocol !== "https:" ||
						textingUrl.hostname !== "messages.google.com"
					) {
						throw new Error("Unsupported texting URL");
					}
				} catch (_) {
					textingUrlInput.setCustomValidity(
						"Enter a secure messages.google.com conversation URL",
					);
					textingUrlInput.reportValidity();
					return;
				}
			}
			const payload = readForm();
			if (!payload.name) {
				document.getElementById("dp-first-name").focus();
				return;
			}
			const btn = document.getElementById("dp-btn-save");
			btn.disabled = true;
			try {
				await db.saveDriver(
					selectedId ? { id: selectedId, ...payload } : payload,
				);
				await loadDrivers();
				closeDialog({ discard: true });
			} catch (err) {
				console.error("Could not save driver:", err);
			} finally {
				btn.disabled = false;
			}
		});

	// ── Delete ────────────────────────────────────────────────────────────────

	document
		.getElementById("dp-btn-delete")
		.addEventListener("click", async () => {
			if (!db || !selectedId) return;
			if (!confirm("Delete this driver? This cannot be undone.")) return;
			const btn = document.getElementById("dp-btn-delete");
			btn.disabled = true;
			try {
				await db.deleteDriver(selectedId);
				selectedId = null;
				await loadDrivers();
				closeDialog({ discard: true });
			} catch (err) {
				console.error("Could not delete driver:", err);
			} finally {
				btn.disabled = false;
			}
		});

	// ── Clear ─────────────────────────────────────────────────────────────────

	function clearPanel() {
		tbody
			.querySelectorAll(".driver-app__row")
			.forEach((r) => r.removeAttribute("aria-current"));
		selectedId = null;
		scheduleLoadRequest += 1;
		renderScheduleShare(null);

		renderAvatar(null);

		panelEl
			.querySelectorAll(
				".sched-scope-driver__pane input, .sched-scope-driver__pane textarea",
			)
			.forEach((f) => {
				f.value = "";
			});

		panelEl.querySelectorAll("[data-rux-toggle-group]").forEach((group) => {
			group.querySelectorAll(".rux-button").forEach((btn, i) => {
				const on = i === 0;
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});
		});
		// Priority defaults to the middle tier (3), not the first button (1) —
		// matches the drivers.priority column default and populatePanel()'s
		// fallback, so a never-saved new driver reads the same as a saved one.
		panelEl
			.querySelectorAll("[data-priority-group] .rux-button")
			.forEach((btn) => {
				const on =
					btn.querySelector(".rux-priority-dot")?.dataset.priority ===
					"3";
				btn.setAttribute("aria-pressed", on ? "true" : "false");
			});
		panelEl
			.querySelectorAll(".sched-scope-driver__endorsements .rux-button")
			.forEach((btn) => {
				btn.setAttribute("aria-pressed", "false");
			});

		tripList.innerHTML = "";
		resetTimeOffRows();
		switchTab(tabBtns[0]);
		window.Rux?.syncDateInputs(panelEl);
		markFormClean();
	}

	document
		.getElementById("dp-btn-clear")
		.addEventListener("click", clearPanel);

	scheduleManageBtn?.addEventListener("click", () => {
		if (!selectedId) return;
		const driver = allDrivers.find(
			(item) => String(item.id) === String(selectedId),
		);
		window.dispatchEvent(
			new CustomEvent("rux:manage-driver-schedule", {
				detail: { driverId: selectedId, driver },
			}),
		);
	});

	scheduleOpenBtn?.addEventListener("click", () => {
		if (!isScheduleShareActive(selectedScheduleShare)) return;
		window.open(
			driverScheduleUrl(selectedScheduleShare.token),
			"_blank",
			"noopener",
		);
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
		window.Rux?.toast?.(
			copied ? "Driver link copied" : "Could not copy the driver link",
		);
	});

	scheduleDeactivateBtn?.addEventListener("click", async () => {
		if (!selectedScheduleShare?.token) return;
		if (
			!confirm(
				"Deactivate this driver schedule link? Reactivating it later will use the same URL.",
			)
		)
			return;
		scheduleDeactivateBtn.disabled = true;
		try {
			const deactivated = await db.deactivateDriverScheduleShare(
				selectedScheduleShare.token,
			);
			if (!deactivated)
				throw new Error("Driver schedule link was not active");
			renderScheduleShare(null);
			window.Rux?.toast?.("Driver link deactivated");
		} catch (err) {
			console.warn("Could not deactivate driver schedule link:", err);
			scheduleDeactivateBtn.disabled = false;
			window.Rux?.toast?.("Could not deactivate the driver link");
		}
	});

	window.addEventListener("rux:driver-schedule-share-changed", (event) => {
		if (
			!selectedId ||
			String(event.detail?.driverId) !== String(selectedId)
		)
			return;
		loadDriverScheduleShare(selectedId);
	});

	// ── Avatar photo upload ───────────────────────────────────────────────────
	// Clicking the avatar opens a small menu (Upload / Remove) instead of
	// jumping straight to the file picker — a dynamic popover opened via the
	// shared RuxMenu.

	async function removeDriverPhoto() {
		if (!selectedId || !db) return;
		if (!confirm("Remove this driver's photo?")) return;
		try {
			await db.removeDriverPhoto(selectedId);
			const driver = allDrivers.find((x) => x.id === selectedId);
			if (driver) driver.photo_path = null;
			renderAvatar(driver);
			renderCurrentDriverView();
		} catch (err) {
			console.error("Remove photo failed:", err);
			window.Rux?.toast("Could not remove photo — try again.");
		}
	}

	let dpAvatarMenu = null;

	function openAvatarMenu() {
		if (!dpAvatarMenu) {
			dpAvatarMenu = document.createElement("div");
			dpAvatarMenu.className = "rux-menu rux-popover";
			dpAvatarMenu.setAttribute("hidden", "");
			dpAvatarMenu.setAttribute("role", "menu");
			document.body.appendChild(dpAvatarMenu);
		}

		const hasPhoto = Boolean(
			driverPhotoUrl(allDrivers.find((x) => x.id === selectedId)),
		);
		dpAvatarMenu.innerHTML = "";

		const uploadBtn = document.createElement("button");
		uploadBtn.type = "button";
		uploadBtn.className = "rux-menu__item";
		uploadBtn.setAttribute("role", "menuitem");
		uploadBtn.innerHTML =
			'<span class="rux-icon" aria-hidden="true">upload</span><span>Upload photo</span>';
		uploadBtn.addEventListener("click", () => dpAvatarInput.click());
		dpAvatarMenu.appendChild(uploadBtn);

		if (hasPhoto) {
			const removeBtn = document.createElement("button");
			removeBtn.type = "button";
			removeBtn.className = "rux-menu__item";
			removeBtn.setAttribute("role", "menuitem");
			removeBtn.innerHTML =
				'<span class="rux-icon" aria-hidden="true">delete</span><span>Remove photo</span>';
			removeBtn.addEventListener("click", () => removeDriverPhoto());
			dpAvatarMenu.appendChild(removeBtn);
		}

		window.RuxMenu.open(dpAvatarBtn, dpAvatarMenu, {
			placement: "bottom-start",
		});
	}

	dpAvatarBtn.addEventListener("click", () => {
		if (!selectedId) {
			window.Rux?.toast("Save the driver before adding a photo.");
			return;
		}
		openAvatarMenu();
	});

	dpAvatarInput.addEventListener("change", async () => {
		const file = dpAvatarInput.files[0];
		dpAvatarInput.value = "";
		if (!file || !selectedId || !db) return;

		const reader = new FileReader();
		reader.onload = (ev) => {
			dpAvatarMain.innerHTML = `<img src="${ev.target.result}" alt="">`;
		};
		reader.readAsDataURL(file);

		dpAvatarBtn.classList.add("is-uploading");
		try {
			const photoPath = await db.uploadDriverPhoto(selectedId, file);
			const driver = allDrivers.find((x) => x.id === selectedId);
			if (driver) driver.photo_path = photoPath;
			renderCurrentDriverView();
		} catch (err) {
			console.error("Photo upload failed:", err);
			window.Rux?.toast("Photo upload failed — try again.");
			renderAvatar(allDrivers.find((x) => x.id === selectedId));
		} finally {
			dpAvatarBtn.classList.remove("is-uploading");
		}
	});

	// ── Column picker v2 — Supabase-persisted, drag-to-reorder ───────────────

	const DRIVER_COLS_KEY = "driver-cols-v2";
	const driverViewOptionsList = document.getElementById(
		"driver-view-options-list",
	);
	let dragKey = null;

	function defaultConfig() {
		return ALL_DRIVER_COLS.map((c) => ({
			key: c.key,
			visible: c.defaultOn,
		}));
	}

	function mergeConfig(saved) {
		if (!Array.isArray(saved) || !saved.length) return defaultConfig();
		const merged = saved
			.filter((s) => ALL_DRIVER_COLS.some((c) => c.key === s.key))
			.map((s) => ({ key: s.key, visible: !!s.visible }));
		ALL_DRIVER_COLS.forEach((c) => {
			if (!merged.some((m) => m.key === c.key))
				merged.push({ key: c.key, visible: c.defaultOn });
		});
		return merged;
	}

	async function loadColConfig() {
		if (!settingsDb) {
			try {
				settingsDb = await import("../data/settings-db.js");
			} catch {
				/* offline */
			}
		}
		const saved = settingsDb
			? await settingsDb.getSetting(DRIVER_COLS_KEY)
			: null;
		colConfig = mergeConfig(saved);
	}

	async function saveColConfig() {
		if (!settingsDb) return;
		try {
			await settingsDb.setSetting(DRIVER_COLS_KEY, colConfig);
		} catch (err) {
			console.warn("saveColConfig:", err);
		}
	}

	// Renders directly into the Table Options panel's View Options card —
	// always visible there instead of a floating popover, so there's no
	// open/close/position bookkeeping to do anymore.
	function renderColPicker() {
		if (!driverViewOptionsList) return;
		driverViewOptionsList.innerHTML = "";
		colConfig.forEach((c) => {
			const def = ALL_DRIVER_COLS.find((d) => d.key === c.key);
			if (!def) return;

			const row = document.createElement("div");
			row.className = "sched-col-picker__row";
			row.draggable = true;
			row.dataset.key = c.key;

			const handle = document.createElement("span");
			handle.className = "sched-col-picker__handle";
			handle.innerHTML = `<span class="rux-icon">drag_indicator</span>`;

			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = c.visible;
			cb.id = `dcol-${c.key}`;
			cb.addEventListener("change", async () => {
				c.visible = cb.checked;
				renderCurrentDriverView();
				await saveColConfig();
			});

			const lbl = document.createElement("label");
			lbl.htmlFor = cb.id;
			lbl.className = "sched-col-picker__label";
			lbl.textContent = def.label;

			row.append(handle, cb, lbl);

			row.addEventListener("dragstart", (e) => {
				dragKey = c.key;
				row.classList.add("is-dragging");
				e.dataTransfer.effectAllowed = "move";
			});
			row.addEventListener("dragend", () => {
				dragKey = null;
				row.classList.remove("is-dragging");
				driverViewOptionsList
					.querySelectorAll(".is-over")
					.forEach((el) => el.classList.remove("is-over"));
			});
			row.addEventListener("dragover", (e) => {
				if (dragKey && dragKey !== c.key) {
					e.preventDefault();
					e.dataTransfer.dropEffect = "move";
					driverViewOptionsList
						.querySelectorAll(".is-over")
						.forEach((el) => el.classList.remove("is-over"));
					row.classList.add("is-over");
				}
			});
			row.addEventListener("drop", async (e) => {
				e.preventDefault();
				if (!dragKey || dragKey === c.key) return;
				const fromIdx = colConfig.findIndex((x) => x.key === dragKey);
				const toIdx = colConfig.findIndex((x) => x.key === c.key);
				const [item] = colConfig.splice(fromIdx, 1);
				colConfig.splice(toIdx, 0, item);
				renderColPicker();
				renderCurrentDriverView();
				await saveColConfig();
			});

			driverViewOptionsList.appendChild(row);
		});
	}

	// ── Search & filter ───────────────────────────────────────────────────────

	let statusFilter = "all";
	let employmentFilter = "all";

	const DRIVER_COL_FILTERS = {
		status: {
			get: () => statusFilter,
			set: (v) => {
				statusFilter = v;
			},
			options: [
				{ value: "all", label: "All" },
				{ value: "active", label: "Active" },
				{ value: "on-leave", label: "On leave" },
				{ value: "inactive", label: "Inactive" },
			],
		},
		"employment-type": {
			get: () => employmentFilter,
			set: (v) => {
				employmentFilter = v;
			},
			options: [
				{ value: "all", label: "All" },
				{ value: "full-time", label: "Full-time" },
				{ value: "part-time", label: "Part-time" },
				{ value: "contract", label: "Contract" },
				{ value: "seasonal", label: "Seasonal" },
			],
		},
	};

	function applyFilter() {
		tbody.querySelectorAll(".driver-app__row").forEach((row) => {
			const matchF =
				statusFilter === "all" || row.dataset.status === statusFilter;
			const matchE =
				employmentFilter === "all" ||
				row.dataset.employmentType === employmentFilter;
			row.hidden = !(matchF && matchE);
		});
	}

	// Renders one filter's option list into the Table Options panel's
	// Filters card — a static role="radiogroup" list of .rux-menu__item
	// buttons, same look as the old popover but always visible in place.
	function renderFilterGroup(containerId, filterKey) {
		const container = document.getElementById(containerId);
		const def = DRIVER_COL_FILTERS[filterKey];
		if (!container || !def) return;
		container.innerHTML = "";
		def.options.forEach((opt) => {
			const btn = document.createElement("button");
			btn.type = "button";
			const selected = def.get() === opt.value;
			btn.className = "rux-menu__item";
			// aria-checked below is the only channel — state.md rule 2.1, step 8.
			btn.setAttribute("role", "menuitemradio");
			btn.setAttribute("aria-checked", String(selected));
			btn.textContent = opt.label;
			btn.addEventListener("click", () => {
				def.set(opt.value);
				renderFilterGroup(containerId, filterKey);
				applyFilter();
			});
			container.appendChild(btn);
		});
	}

	// ── Sort ──────────────────────────────────────────────────────────────────
	// No user-facing sort — the table always shows the fixed Employment
	// (Full-time→Part-time→Contract→Seasonal) → Status (Active→On Leave→
	// Inactive) → Priority (1→5) order, name as final tiebreak. Column
	// headers are plain labels now; there's no click-to-sort or manual
	// drag-reorder anymore.
	function getSortedDrivers() {
		const empOrder = {
			"full-time": 0,
			"part-time": 1,
			contract: 2,
			seasonal: 3,
		};
		const statusOrder = { active: 0, "on-leave": 1, inactive: 2 };
		return [...allDrivers].sort(
			(a, b) =>
				(empOrder[a.employment_type] ?? 9) -
					(empOrder[b.employment_type] ?? 9) ||
				(statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) ||
				(a.priority || 3) - (b.priority || 3) ||
				(a.name || "").localeCompare(b.name || ""),
		);
	}

	// ── Data loading ──────────────────────────────────────────────────────────

	async function loadDriverTrips(driverId) {
		tripList.innerHTML = `<li class="sched-scope-driver__trip-item"><span class="rux-u-muted">Loading…</span></li>`;
		try {
			const trips = await db.fetchDriverTrips(driverId);
			renderTripList(trips);
		} catch (err) {
			console.warn("Could not load driver trips:", err);
			tripList.innerHTML = `<li class="sched-scope-driver__trip-item"><span class="rux-u-muted">Could not load trips.</span></li>`;
		}
	}

	async function loadDrivers() {
		try {
			allDrivers = await db.fetchDrivers();
			if (activeDriverView === "workload") {
				await loadWorkloadData({ refresh: true });
			} else {
				renderRoster();
			}
		} catch (err) {
			console.error("fetchDrivers failed:", err);
			tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
		}
	}

	// ── Public API ────────────────────────────────────────────────────────────

	async function init() {
		if (!db) {
			try {
				db = await import("../data/driver-db.js?v=4");
			} catch (err) {
				console.warn("Could not load driver-db:", err);
				return;
			}
		}
		if (!workloadUtils) {
			try {
				workloadUtils = await import("../core/driver-workload.js?v=2");
			} catch (err) {
				console.warn("Could not load driver workload helpers:", err);
			}
		}
		setupWorkloadControls();
		await loadColConfig();
		renderColPicker();
		renderFilterGroup("driver-filter-status-list", "status");
		renderFilterGroup("driver-filter-employment-list", "employment-type");
		await loadDrivers();

		// The tools drawer opens by default on desktop, same as the Calendar
		// module's tools drawer — mobile stays closed (panels are full-screen
		// overlays there). The editor is a floating window now and only opens
		// on row click or New Driver, like every other editor dialog.
		if (!window.matchMedia("(max-width: 500px)").matches) {
			openToolsDrawer();
		}
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
		document
			.querySelector(
				'[data-rux-tabs][data-scope="driver"] .rux-tab[aria-controls="pane-timeoff"]',
			)
			?.click();
	}

	window.DriverPanel = { init, reload: loadDrivers, openTimeOff };

	// Auto-init: don't wait for nav event — defer timing means the nav click
	// fires before this script runs on direct load / refresh at #drivers.
	init().catch((err) => {
		console.error("DriverPanel init failed:", err);
		tbody.innerHTML = `<tr><td colspan="6" class="driver-app__empty" style="color:var(--rux-danger)">Init error: ${err?.message ?? err}</td></tr>`;
	});

	// ── Lucide ────────────────────────────────────────────────────────────────
})();
