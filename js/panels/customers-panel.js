/* ==========================================================================
   RUX UI — CUSTOMERS PANEL
   --------------------------------------------------------------------------
   Roster + editor drawer for the saved contacts table (see
   supabase/contacts-patch.sql). Same shell/recipe as the Fleet and Driver
   panels — a .scheduler-app__drawer with a RuxDrawer-managed left panel,
   a roster table on the right — trimmed down since a contact is only
   name/phone/email plus its linked trip history, not a multi-tab record.
   Talks to Supabase only through window.RuxContacts (js/data/trip-db.js,
   wired in index.html), the same bridge the trip panel's contact autofill
   uses, so both surfaces share one source of truth.

   API
   ---
   window.CustomersPanel.init()      → lazy-load the roster on first visit
   window.CustomersPanel.reload()    → re-fetch and re-render the roster
   ========================================================================== */

(function () {
	"use strict";

	const drawer = document.getElementById("customer-panel-drawer");
	const panelEl = drawer?.querySelector(".rux-customer-panel");
	const tbody = document.getElementById("customer-roster-body");
	const tripList = document.getElementById("cp-trip-list");
	const searchInput = document.getElementById("customer-search");

	if (!drawer || !panelEl || !tbody) return;

	let allContacts = [];
	let selectedId = null;

	/* ── Drawer ─────────────────────────────────────────────────────────── */

	const drawerHandle = RuxDrawer.create({
		drawer,
		panel: panelEl,
		toggleBtn: document.getElementById("customer-panel-toggle-btn"),
		handle: document.getElementById("customer-panel-resize-gutter"),
		onClose: () => {
			tbody.querySelectorAll(".customer-app__row").forEach((r) => r.classList.remove("is-selected"));
			selectedId = null;
		},
	});
	const openDrawer = drawerHandle.open;
	const closeDrawer = drawerHandle.close;

	document.getElementById("customer-panel-toggle-btn")?.addEventListener("click", () => {
		if (drawer.classList.contains("is-open")) {
			closeDrawer();
		} else {
			clearPanel();
			openDrawer();
		}
	});

	/* ── Roster ─────────────────────────────────────────────────────────── */

	function matchesSearch(contact, query) {
		if (!query) return true;
		const haystack = `${contact.name ?? ""} ${contact.client ?? ""} ${contact.phone ?? ""} ${contact.email ?? ""}`.toLowerCase();
		return haystack.includes(query);
	}

	function renderRows(contacts) {
		tbody.innerHTML = "";
		if (!contacts.length) {
			tbody.innerHTML = `<tr><td colspan="4" class="customer-app__empty">No customers yet.</td></tr>`;
			return;
		}
		contacts.forEach((c) => {
			const tr = document.createElement("tr");
			tr.className = "customer-app__row";
			tr.tabIndex = 0;
			if (c.id === selectedId) tr.classList.add("is-selected");
			tr.innerHTML = `
				<td>${escHtml(c.name || "—")}</td>
				<td>${escHtml(c.client || "")}</td>
				<td>${escHtml(c.phone || "")}</td>
				<td>${escHtml(c.email || "")}</td>
			`;
			tr.addEventListener("click", () => selectRow(tr, c));
			tr.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					selectRow(tr, c);
				}
			});
			tbody.appendChild(tr);
		});
	}

	function applyFilter() {
		const query = searchInput?.value.trim().toLowerCase() || "";
		renderRows(allContacts.filter((c) => matchesSearch(c, query)));
	}

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (c) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[c]));
	}

	searchInput?.addEventListener("input", applyFilter);

	function selectRow(tr, contact) {
		tbody.querySelectorAll(".customer-app__row").forEach((r) => r.classList.remove("is-selected"));
		tr.classList.add("is-selected");
		selectedId = contact.id;
		populatePanel(contact);
		loadContactTrips(contact.id);
		openDrawer();
	}

	/* ── Panel population / read ───────────────────────────────────────── */

	function populatePanel(contact) {
		document.getElementById("cp-name").value = contact.name || "";
		document.getElementById("cp-client").value = contact.client || "";
		document.getElementById("cp-phone").value = contact.phone || "";
		document.getElementById("cp-email").value = contact.email || "";
	}

	function readForm() {
		return {
			name: document.getElementById("cp-name").value.trim() || null,
			client: document.getElementById("cp-client").value.trim() || null,
			phone: document.getElementById("cp-phone").value.trim() || null,
			email: document.getElementById("cp-email").value.trim() || null,
		};
	}

	async function loadContactTrips(contactId) {
		if (!tripList) return;
		tripList.innerHTML = `<li class="rux-customer-panel__trip-item"><span class="rux-subtle">Loading…</span></li>`;
		try {
			const trips = await window.RuxContacts?.trips?.(contactId) ?? [];
			if (!trips.length) {
				tripList.innerHTML = `<li class="rux-customer-panel__trip-item"><span class="rux-subtle">No trips yet.</span></li>`;
				return;
			}
			tripList.innerHTML = trips
				.map((t) => {
					const label = [t.trip_ref, t.customer, t.destination].filter(Boolean).join(" — ") || "Trip";
					return `<li class="rux-customer-panel__trip-item">
						<span class="rux-customer-panel__trip-date">${escHtml(t.start_date || "")}</span>
						<span>${escHtml(label)}</span>
					</li>`;
				})
				.join("");
		} catch (err) {
			console.warn("Could not load customer trips:", err);
			tripList.innerHTML = `<li class="rux-customer-panel__trip-item"><span class="rux-subtle">Could not load trips.</span></li>`;
		}
	}

	/* ── Save / Delete / Clear ─────────────────────────────────────────── */

	function clearPanel() {
		tbody.querySelectorAll(".customer-app__row").forEach((r) => r.classList.remove("is-selected"));
		selectedId = null;
		panelEl.querySelectorAll(".rux-customer-panel__pane input").forEach((f) => { f.value = ""; });
		if (tripList) tripList.innerHTML = "";
	}

	function resetPanel() {
		closeDrawer();
		clearPanel();
	}

	document.getElementById("cp-btn-save")?.addEventListener("click", async () => {
		const payload = readForm();
		if (!payload.name) {
			document.getElementById("cp-name").focus();
			return;
		}
		const btn = document.getElementById("cp-btn-save");
		btn.disabled = true;
		try {
			await window.RuxContacts.upsert(selectedId ? { id: selectedId, ...payload } : payload);
			await loadCustomers();
			resetPanel();
		} catch (err) {
			console.error("Could not save customer:", err);
			window.Rux?.toast("Save failed — try again.");
		} finally {
			btn.disabled = false;
		}
	});

	document.getElementById("cp-btn-delete")?.addEventListener("click", async () => {
		if (!selectedId) return;
		if (!confirm("Delete this customer? This cannot be undone.")) return;
		const btn = document.getElementById("cp-btn-delete");
		btn.disabled = true;
		try {
			await window.RuxContacts.delete(selectedId);
			selectedId = null;
			await loadCustomers();
			resetPanel();
		} catch (err) {
			console.error("Could not delete customer:", err);
			window.Rux?.toast("Delete failed — try again.");
		} finally {
			btn.disabled = false;
		}
	});

	document.getElementById("cp-btn-clear")?.addEventListener("click", clearPanel);
	document.getElementById("customer-new-btn")?.addEventListener("click", () => {
		clearPanel();
		openDrawer();
		document.getElementById("cp-name")?.focus();
	});

	/* ── Data loading ───────────────────────────────────────────────────── */

	async function loadCustomers() {
		try {
			allContacts = await window.RuxContacts.fetch();
			applyFilter();
		} catch (err) {
			console.error("fetchContacts failed:", err);
			tbody.innerHTML = `<tr><td colspan="3" class="customer-app__empty" style="color:var(--rux-danger)">Load error: ${err?.message ?? err}</td></tr>`;
		}
	}

	/* ── Public API ─────────────────────────────────────────────────────── */

	let loaded = false;
	async function init() {
		if (loaded) return;
		// The calendar module's own async data init is what sets up
		// window.RuxContacts — normally already done by the time anyone
		// navigates here, but not guaranteed if Customers is the very first
		// module shown (e.g. a direct #customers link on a cold load). Wait
		// briefly rather than silently failing.
		for (let i = 0; i < 20 && !window.RuxContacts; i++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		if (!window.RuxContacts) {
			console.warn("RuxContacts never became available — Customers module can't load.");
			return;
		}
		loaded = true;
		await loadCustomers();
	}

	window.CustomersPanel = { init, reload: loadCustomers };
})();
