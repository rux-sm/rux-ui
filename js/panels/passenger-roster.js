(function () {
	"use strict";

	// ── DOM refs ──────────────────────────────────────────────────────────────

	const drawer = document.getElementById("passenger-panel-drawer");
	const tbody = document.getElementById("passenger-roster-body");
	const titleEl = document.getElementById("pr-trip-title");
	const backBtn = document.getElementById("pr-btn-back");
	const addBtn = document.getElementById("pr-btn-add");
	const editTripBtn = document.getElementById("pr-btn-edit-trip");
	const saveBtn = document.getElementById("pp-btn-save");
	const deleteBtn = document.getElementById("pp-btn-delete");
	const clearBtn = document.getElementById("pp-btn-clear");
	const owedInput = document.getElementById("pp-owed");
	const paidInput = document.getElementById("pp-paid");
	const statusBadge = document.getElementById("pp-status-badge");

	let db = null;
	let currentTrip = null;
	let allPassengers = [];
	let selectedId = null;

	// ── Drawer ────────────────────────────────────────────────────────────────

	function openDrawer() { drawer.classList.add("is-open"); }
	function closeDrawer() {
		drawer.classList.remove("is-open");
		tbody.querySelectorAll(".trips-app__row").forEach((r) => r.classList.remove("is-selected"));
		selectedId = null;
	}
	document.getElementById("pp-btn-close")?.addEventListener("click", closeDrawer);

	// ── Helpers ───────────────────────────────────────────────────────────────

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
		tbody.innerHTML = "";
		if (!allPassengers.length) {
			tbody.innerHTML = `<tr><td colspan="7" class="trips-app__empty">No passengers yet — add one to get started.</td></tr>`;
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
			tbody.appendChild(tr);
		});
	}

	// ── Panel population ──────────────────────────────────────────────────────

	function populatePanel(p) {
		document.getElementById("pp-title").textContent = p.name || "Passenger";
		document.getElementById("pp-name").value = p.name || "";
		document.getElementById("pp-phone").value = p.phone || "";
		document.getElementById("pp-email").value = p.email || "";
		document.getElementById("pp-address").value = p.address || "";
		document.getElementById("pp-dob").value = p.dob || "";
		document.getElementById("pp-notes").value = p.notes || "";
		owedInput.value = p.amount_owed ?? "";
		paidInput.value = p.amount_paid ?? "";
		syncStatusBadge();
		window.Rux?.syncDateInputs(drawer);
	}

	function selectRow(p) {
		tbody.querySelectorAll(".trips-app__row").forEach((r) => r.classList.remove("is-selected"));
		tbody.querySelector(`[data-id="${p.id}"]`)?.classList.add("is-selected");
		selectedId = p.id;
		deleteBtn.disabled = false;
		populatePanel(p);
		openDrawer();
	}

	function clearPanel() {
		selectedId = null;
		deleteBtn.disabled = true;
		document.getElementById("pp-title").textContent = "New passenger";
		drawer.querySelectorAll(".rux-panel__body input, .rux-panel__body textarea").forEach((f) => { f.value = ""; });
		syncStatusBadge();
		tbody.querySelectorAll(".trips-app__row").forEach((r) => r.classList.remove("is-selected"));
	}

	addBtn?.addEventListener("click", () => {
		clearPanel();
		openDrawer();
	});
	clearBtn?.addEventListener("click", clearPanel);

	// ── Save / Delete ─────────────────────────────────────────────────────────

	function readForm() {
		return {
			name: document.getElementById("pp-name").value.trim() || null,
			phone: document.getElementById("pp-phone").value.trim() || null,
			email: document.getElementById("pp-email").value.trim() || null,
			address: document.getElementById("pp-address").value.trim() || null,
			dob: document.getElementById("pp-dob").value || null,
			notes: document.getElementById("pp-notes").value.trim() || null,
			amount_owed: parseFloat(owedInput.value) || null,
			amount_paid: parseFloat(paidInput.value) || null,
		};
	}

	saveBtn?.addEventListener("click", async () => {
		if (!db || !currentTrip) return;
		const payload = readForm();
		if (!payload.name) {
			document.getElementById("pp-name").focus();
			return;
		}
		saveBtn.disabled = true;
		try {
			if (selectedId) {
				await db.savePassenger(currentTrip.id, { id: selectedId, ...payload });
			} else {
				await db.savePassenger(currentTrip.id, { position: allPassengers.length, ...payload });
			}
			await loadPassengers();
			closeDrawer();
			document.dispatchEvent(new CustomEvent("trips:refresh"));
		} catch (err) {
			console.error("Could not save passenger:", err);
		} finally {
			saveBtn.disabled = false;
		}
	});

	deleteBtn?.addEventListener("click", async () => {
		if (!db || !selectedId) return;
		if (!confirm("Delete this passenger? This cannot be undone.")) return;
		deleteBtn.disabled = true;
		try {
			await db.deletePassenger(selectedId);
			selectedId = null;
			await loadPassengers();
			closeDrawer();
			document.dispatchEvent(new CustomEvent("trips:refresh"));
		} catch (err) {
			console.error("Could not delete passenger:", err);
		} finally {
			deleteBtn.disabled = false;
		}
	});

	// ── Navigation ────────────────────────────────────────────────────────────

	backBtn?.addEventListener("click", () => {
		closeDrawer();
		document.dispatchEvent(new CustomEvent("nav:show-module", { detail: { module: "my-trips" } }));
	});

	editTripBtn?.addEventListener("click", () => {
		if (currentTrip) document.dispatchEvent(new CustomEvent("trips:open", { detail: { trip: currentTrip } }));
	});

	// ── Data loading ──────────────────────────────────────────────────────────

	async function loadPassengers() {
		if (!currentTrip) return;
		try {
			allPassengers = await db.fetchPassengers(currentTrip.id);
			renderRows();
		} catch (err) {
			console.error("fetchPassengers failed:", err);
			tbody.innerHTML = `<tr><td colspan="7" class="trips-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
		}
	}

	document.addEventListener("passenger-roster:open", async (e) => {
		currentTrip = e.detail?.trip;
		if (!currentTrip) return;
		closeDrawer();
		titleEl.textContent = `Passenger Roster · ${currentTrip.destination || currentTrip.trip_ref || ""}`;
		document.dispatchEvent(new CustomEvent("nav:show-module", { detail: { module: "passenger-roster" } }));
		if (!db) {
			try {
				db = await import("../data/passenger-db.js");
			} catch (err) {
				console.warn("Could not load passenger-db:", err);
				return;
			}
		}
		await loadPassengers();
	});
})();
