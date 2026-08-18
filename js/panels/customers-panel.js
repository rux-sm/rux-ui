/* ==========================================================================
   RUX UI — CUSTOMERS PANEL
   --------------------------------------------------------------------------
   Roster + editor drawer for the saved contacts table. Same shell/recipe
   as the Fleet and Driver panels — a .rux-drawer with a
   RuxDrawer-managed left panel,
   a roster table on the right — trimmed down since a contact is only
   name/phone/email plus its linked trip history, not a multi-tab record.
   Imports the contact persistence API directly from js/data/trip-db.js.
   The trip panel exposes the same functions through window.RuxContacts for
   autofill, but this panel does not depend on scheduler startup order.

   API
   ---
   window.CustomersPanel.init()      → lazy-load the roster on first visit
   window.CustomersPanel.openContact(id)
                                     → select one customer and open its editor;
                                       the global search's entry point here
   window.CustomersPanel.reload()    → re-fetch and re-render the roster

   This module has no search field of its own. Finding a customer is ⌘K's job
   (js/panels/trip-finder.js), which matches name/client/phone/email and calls
   openContact() through the "customers:open" event.
   ========================================================================== */

(function () {
	"use strict";

	const dialog = document.getElementById("customer-editor-dialog");
	const panelEl = dialog;
	const tbody = document.getElementById("customer-roster-body");
	const tripList = document.getElementById("cp-trip-list");

	if (!dialog || !tbody) return;

	let allContacts = [];
	let selectedId = null;
	let contactsDbPromise = null;
	let loadPromise = null;
	let loaded = false;

	function getContactsDb() {
		if (!contactsDbPromise) {
			contactsDbPromise = import("../data/trip-db.js?v=11").catch((error) => {
				// A failed dynamic import may be retried on the next panel load.
				contactsDbPromise = null;
				throw error;
			});
		}
		return contactsDbPromise;
	}

	/* ── Floating editor window ─────────────────────────────────────────── */
	// Same composition as the trip and fleet editor dialogs: a
	// .rux-panel--floating window dragged by its header via RuxFloatingWindow;
	// the shared ≤580px breakpoint in rux-ui/css/base/panel.css pins it
	// near-full-screen on phones.

	const dialogTitleEl = document.getElementById("customer-editor-dialog-title");
	const mobileWindowQuery = window.matchMedia("(max-width: 580px)");

	window.RuxFloatingWindow?.attachDrag(
		dialog,
		dialog.querySelector("[data-customer-dialog-header]"),
		{ minViewportWidth: 580 },
	);

	// Snapshot of the form as last populated/cleared — closing (or switching
	// customers) with edits on top of it asks before discarding.
	let cleanForm = null;
	function markFormClean() { cleanForm = JSON.stringify(readForm()); }
	function formIsDirty()   { return cleanForm !== null && JSON.stringify(readForm()) !== cleanForm; }

	function openDialog(title) {
		if (dialogTitleEl && title) dialogTitleEl.textContent = title;
		if (mobileWindowQuery.matches) window.RuxFloatingWindow?.resetGeometry(dialog);
		dialog.hidden = false;
	}

	// Returns false when the user keeps their unsaved edits instead.
	function closeDialog({ discard = false } = {}) {
		if (dialog.hidden) return true;
		if (!discard && formIsDirty() && !confirm("Discard unsaved changes to this customer?")) return false;
		dialog.hidden = true;
		tbody.querySelectorAll(".customer-app__row").forEach((r) => r.classList.remove("is-selected"));
		selectedId = null;
		return true;
	}

	document.getElementById("customer-dialog-close-btn")?.addEventListener("click", () => closeDialog());

	/* ── Roster ─────────────────────────────────────────────────────────── */

	function renderRows(contacts, emptyMessage = "No customers yet.") {
		tbody.innerHTML = "";
		if (!contacts.length) {
			tbody.innerHTML = `<tr><td colspan="4" class="customer-app__empty">${emptyMessage}</td></tr>`;
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

	function renderRosterState(message, { error = false, retry = false } = {}) {
		const row = document.createElement("tr");
		const cell = document.createElement("td");
		cell.colSpan = 4;
		cell.className = "customer-app__empty";
		cell.textContent = message;
		if (error) {
			cell.style.color = "var(--rux-danger)";
			cell.setAttribute("role", "alert");
		} else {
			cell.setAttribute("role", "status");
		}
		if (retry) {
			const retryButton = document.createElement("button");
			retryButton.type = "button";
			retryButton.className = "rux-button rux-button--default";
			retryButton.textContent = "Retry";
			retryButton.addEventListener("click", () => {
				void loadCustomers({ force: true });
			});
			cell.append(" ", retryButton);
		}
		row.appendChild(cell);
		tbody.replaceChildren(row);
	}

	// The roster shows every customer. Finding one is the global search's job
	// (⌘K matches name, client, phone, and email and calls openContact below),
	// which is why this module no longer carries a search field of its own.
	function renderRoster() {
		renderRows(allContacts);
	}

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (c) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		}[c]));
	}

	function selectRow(tr, contact) {
		if (!closeDialog()) return;
		tr.classList.add("is-selected");
		selectedId = contact.id;
		populatePanel(contact);
		loadContactTrips(contact.id);
		openDialog(contact.name || "Edit Customer");
	}

	/* ── Panel population / read ───────────────────────────────────────── */

	function populatePanel(contact) {
		document.getElementById("cp-name").value = contact.name || "";
		document.getElementById("cp-client").value = contact.client || "";
		document.getElementById("cp-phone").value = contact.phone || "";
		document.getElementById("cp-email").value = contact.email || "";
		markFormClean();
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
		tripList.innerHTML = `<li class="sched-scope-customer__trip-item"><span class="rux-subtle">Loading…</span></li>`;
		try {
			const db = await getContactsDb();
			const trips = await db.fetchContactTrips(contactId);
			if (selectedId !== contactId) return;
			if (!trips.length) {
				tripList.innerHTML = `<li class="sched-scope-customer__trip-item"><span class="rux-subtle">No trips yet.</span></li>`;
				return;
			}
			tripList.innerHTML = trips
				.map((t) => {
					const label = [t.trip_ref, t.customer, t.destination].filter(Boolean).join(" — ") || "Trip";
					return `<li class="sched-scope-customer__trip-item">
						<span class="sched-scope-customer__trip-date">${escHtml(t.start_date || "")}</span>
						<span>${escHtml(label)}</span>
					</li>`;
				})
				.join("");
		} catch (err) {
			if (selectedId !== contactId) return;
			console.warn("Could not load customer trips:", err);
			tripList.innerHTML = `<li class="sched-scope-customer__trip-item"><span class="rux-subtle">Could not load trips.</span></li>`;
		}
	}

	/* ── Save / Delete / Clear ─────────────────────────────────────────── */

	function clearPanel() {
		tbody.querySelectorAll(".customer-app__row").forEach((r) => r.classList.remove("is-selected"));
		selectedId = null;
		panelEl.querySelectorAll(".sched-scope-customer__pane input").forEach((f) => { f.value = ""; });
		if (tripList) tripList.innerHTML = "";
		markFormClean();
	}

	function resetPanel() {
		closeDialog({ discard: true });
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
			const db = await getContactsDb();
			await db.upsertContact(selectedId ? { id: selectedId, ...payload } : payload);
			const refreshed = await loadCustomers({ force: true });
			resetPanel();
			window.Rux?.toast?.(
				refreshed
					? "Customer saved"
					: "Customer saved. Retry the list refresh to see it.",
			);
		} catch (err) {
			console.error("Could not save customer:", err);
			window.Rux?.toast?.("Save failed — try again.");
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
			const db = await getContactsDb();
			await db.deleteContact(selectedId);
			selectedId = null;
			const refreshed = await loadCustomers({ force: true });
			resetPanel();
			window.Rux?.toast?.(
				refreshed
					? "Customer deleted"
					: "Customer deleted. Retry the list refresh.",
			);
		} catch (err) {
			console.error("Could not delete customer:", err);
			window.Rux?.toast?.("Delete failed — try again.");
		} finally {
			btn.disabled = false;
		}
	});

	document.getElementById("cp-btn-clear")?.addEventListener("click", clearPanel);
	document.getElementById("customer-new-btn")?.addEventListener("click", () => {
		if (!closeDialog()) return;
		clearPanel();
		openDialog("New Customer");
		document.getElementById("cp-name")?.focus();
	});

	/* ── Data loading ───────────────────────────────────────────────────── */

	function loadCustomers({ force = false } = {}) {
		if (loadPromise) return loadPromise;
		if (loaded && !force) return Promise.resolve(true);

		renderRosterState("Loading customers…");

		loadPromise = (async () => {
			try {
				const db = await getContactsDb();
				allContacts = await db.fetchContacts();
				loaded = true;
				renderRoster();
				return true;
			} catch (err) {
				loaded = false;
				console.error("fetchContacts failed:", err);
				renderRosterState("Customers could not be loaded.", {
					error: true,
					retry: true,
				});
				return false;
			}
		})().finally(() => {
			loadPromise = null;
		});

		return loadPromise;
	}

	/* ── Public API ─────────────────────────────────────────────────────── */

	function init() {
		return loadCustomers();
	}

	// How the global search opens a customer. It matches against its own copy
	// of the roster and hands back an id rather than reaching into this
	// module's DOM, so the roster may not even be loaded yet when this runs —
	// loadCustomers() deduplicates against an in-flight or finished load.
	// Returns false when the roster fails to load, the id is stale, or the
	// open editor has unsaved changes the user chose to keep.
	async function openContact(contactId) {
		if (!(await loadCustomers())) return false;

		const contact = allContacts.find((c) => c.id === contactId);
		if (!contact) return false;

		// Ask before discarding an in-progress edit, before touching state.
		if (!closeDialog()) return false;

		selectedId = contact.id;
		renderRoster();
		populatePanel(contact);
		loadContactTrips(contact.id);
		openDialog(contact.name || "Edit Customer");
		tbody
			.querySelector(".customer-app__row.is-selected")
			?.scrollIntoView({ block: "nearest" });
		return true;
	}

	window.CustomersPanel = {
		init,
		openContact,
		reload: () => loadCustomers({ force: true }),
	};

	// Trip saves may create or relink contacts while this panel is already
	// mounted. Invalidate the roster immediately so a newly saved customer
	// cannot remain hidden behind the prior successful response.
	window.addEventListener("rux:contacts-changed", () => {
		loaded = false;
		if (loadPromise) {
			// Do not let an older request win the race and restore a roster
			// snapshot captured before the trip created its contact.
			const pendingLoad = loadPromise;
			void pendingLoad.finally(() => {
				loaded = false;
				void loadCustomers({ force: true });
			});
			return;
		}
		void loadCustomers({ force: true });
	});

	// A direct #customers load can run before the module-navigation script calls
	// init(). Starting here as well is safe because loadPromise deduplicates it.
	if (
		document.body.dataset.activeModule === "customers"
		|| location.hash.slice(1).split("/")[0] === "customers"
	) {
		void init();
	}
})();
