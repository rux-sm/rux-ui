/* ==========================================================================
   RUX UI — REQUEST INBOX PANEL
   --------------------------------------------------------------------------
   The dispatcher-facing side of customer trip requests, surfaced as a
   floating window (same shell as the Trip Finder). Opens from the Requests
   nav item, lists trip_requests rows, and drives the workflow: New request
   invites → new submissions land here → mark reviewed / closed as they are
   triaged into the trip editor.

   Data access is lazy and deduplicated, matching the other panels: the module
   dynamic-imports the db layer and keeps a single in-flight promise so a
   slow load can't double-fetch.

   API
   ---
   window.RequestInbox.open()      → open the window and refresh
   window.RequestInbox.close()     → hide the window
   window.RequestInbox.refresh()   → reload the list + badge
   ========================================================================== */

(function () {
	"use strict";

	const windowEl = document.getElementById("request-inbox-window");
	const headerEl = windowEl?.querySelector(".sched-scope-request__header");
	const closeBtn = document.getElementById("request-inbox-close-btn");
	const openBtn = document.getElementById("request-inbox-btn");
	const badge = document.getElementById("requests-badge");
	const listEl = document.getElementById("request-inbox-list");
	const footerEl = document.getElementById("request-inbox-footer");
	const filterEl = document.getElementById("request-inbox-filters");
	const newBtn = document.getElementById("request-inbox-new-btn");
	const dialog = document.getElementById("request-inbox-dialog");
	const dialogForm = dialog?.querySelector("form");
	const inviteEl = document.getElementById("request-inbox-invite");
	const inviteUrl = document.getElementById("request-inbox-invite-url");

	let db = null;
	let requests = [];
	let isOpen = false;
	let statusFilter = "all";
	let loadPromise = null;

	function ensureDb() {
		if (!db) db = import("../data/trip-request-db.js?v=2");
		return db;
	}

	function escapeAttr(value) {
		const node = document.createElement("span");
		node.textContent = value ?? "";
		return node.innerHTML.replaceAll('"', "&quot;");
	}

	function fmtStamp(value) {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "";
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	function fmtDates(row) {
		if (!row.start_date && !row.end_date) return "";
		if (!row.end_date || row.start_date === row.end_date)
			return fmtStamp(row.start_date);
		return `${fmtStamp(row.start_date)} – ${fmtStamp(row.end_date)}`;
	}

	function sampleOf(row) {
		const parts = [];
		if (row.destination) parts.push(row.destination);
		const dates = fmtDates(row);
		if (dates) parts.push(dates);
		if (row.passenger_count) parts.push(`${row.passenger_count} pax`);
		return parts.join(" · ");
	}

	async function loadRequests() {
		if (!listEl) return;
		if (loadPromise) return loadPromise;
		loadPromise = (async () => {
			try {
				const mod = await ensureDb();
				requests = await mod.listRequests();
				// Pre-compute invite URLs so rowItem can use them synchronously.
				for (const row of requests) {
					if (row.status === "invited" && row.reference) {
						row._url = mod.requestUrl(row.reference);
					}
				}
				renderAll();
			} catch (err) {
				console.error("request-inbox load failed:", err);
				renderFailure();
			} finally {
				loadPromise = null;
			}
		})();
		return loadPromise;
	}

	function renderFailure() {
		if (!listEl) return;
		listEl.innerHTML = `<li class="sched-scope-request__empty">Requests could not be loaded.</li>`;
		if (footerEl) footerEl.textContent = "Couldn't connect";
	}

	// ── Rendering ────────────────────────────────────────────────────────────

	function renderAll() {
		renderBadge();
		renderList();
		renderFooter();
	}

	function renderBadge() {
		if (!badge) return;
		const count = requests.filter((row) => row.status === "new").length;
		badge.hidden = count === 0;
		badge.textContent = count > 99 ? "99+" : String(count);
		if (openBtn) {
			openBtn.setAttribute(
				"aria-label",
				count ? `Requests, ${count} new` : "Requests",
			);
		}
	}

	function renderFooter() {
		if (!footerEl) return;
		const count = requests.filter((row) => row.status === "new").length;
		if (!requests.length) footerEl.textContent = "No trip requests yet";
		else footerEl.textContent = count ? `${count} new` : "All caught up";
	}

	function visibleRows() {
		return requests.filter(
			(row) => statusFilter === "all" || row.status === statusFilter,
		);
	}

	function renderList() {
		if (!listEl) return;
		listEl.innerHTML = "";
		const visible = visibleRows();
		if (!visible.length) {
			listEl.innerHTML = `<li class="sched-scope-request__empty">${
				requests.length
					? "Nothing in this view"
					: "No trip requests yet"
			}</li>`;
			return;
		}
		visible.forEach((row) => listEl.appendChild(rowItem(row)));
	}

	function chipClass(status) {
		const tone =
			{
				invited: "",
				new: " rux-badge--danger",
				reviewed: " rux-badge--info",
				linked: " rux-badge--success",
				closed: " sched-scope-request__chip--closed",
			}[status] ?? " rux-badge--info";
		return `rux-badge${tone} sched-scope-request__chip`;
	}

	function rowItem(row) {
		const li = document.createElement("li");
		li.className = "sched-scope-request__item";
		li.dataset.status = row.status || "";

		const title = escapeAttr(
			row.client || row.contact?.name || "Unnamed request",
		);
		const sample = escapeAttr(sampleOf(row) || "No details yet");
		const note = row.note
			? `<p class="sched-scope-request__item-note">${escapeAttr(row.note)}</p>`
			: "";

		// Invite link — shown only for "invited" rows where we have a URL.
		let linkBlock = "";
		if (row.status === "invited" && row._url) {
			const url = escapeAttr(row._url);
			linkBlock = `
				<div class="sched-scope-request__item-link">
					<input class="rux-input" type="text" readonly value="${url}" data-request-url aria-label="Invite link for ${title}" />
					<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--compact" data-copy-url aria-label="Copy link">
						<span class="rux-icon" aria-hidden="true">content_copy</span>
					</button>
				</div>`;
		}

		let actions = "";
		if (row.status !== "closed") {
			if (row.status !== "reviewed" && row.status !== "linked") {
				actions += `<button type="button" class="rux-button rux-button--ghost rux-button--compact" data-request-action="reviewed" aria-label="Mark ${escapeAttr(row.reference)} reviewed">Reviewed</button>`;
			}
			actions += `<button type="button" class="rux-button rux-button--ghost rux-button--compact" data-request-action="closed" aria-label="Close ${escapeAttr(row.reference)}">Close</button>`;
		}
		actions += `<button type="button" class="rux-button rux-button--ghost rux-button--danger rux-button--compact" data-request-action="delete" aria-label="Delete ${escapeAttr(row.reference)}">Delete</button>`;

		li.innerHTML = `
			<div class="sched-scope-request__item-main">
				<div class="sched-scope-request__item-title-row">
					<span class="sched-scope-request__item-title">${title}</span>
					<span class="${chipClass(row.status)}">${escapeAttr(row.reference)}</span>
				</div>
				<p class="sched-scope-request__item-meta">${sample}</p>
				${note}
				${linkBlock}
			</div>
			${actions ? `<div class="sched-scope-request__item-actions">${actions}</div>` : ""}
		`;

		// Status transitions (reviewed / closed).
		li.querySelectorAll("[data-request-action]").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const action = btn.dataset.requestAction;
				if (action === "delete") {
					await deleteRequest(row.id);
				} else {
					await runStatus(row.id, action);
				}
			});
		});

		// Copy invite URL to clipboard.
		li.querySelector("[data-copy-url]")?.addEventListener("click", async () => {
			const urlInput = li.querySelector("[data-request-url]");
			if (!urlInput) return;
			try {
				await navigator.clipboard.writeText(urlInput.value);
				const copyBtn = li.querySelector("[data-copy-url]");
				if (copyBtn) {
					const icon = copyBtn.querySelector(".rux-icon");
					if (icon) {
						const prev = icon.textContent;
						icon.textContent = "check";
						setTimeout(() => { icon.textContent = prev; }, 1200);
					}
				}
			} catch {
				// Clipboard unavailable — select the text so the user can copy manually.
				urlInput.select();
			}
		});

		return li;
	}

	async function runStatus(id, status) {
		try {
			const mod = await ensureDb();
			await mod.setStatus(id, status);
			await loadRequests();
			openBtn?.focus();
		} catch (err) {
			console.error("request-inbox status update failed:", err);
		}
	}

	async function deleteRequest(id) {
		try {
			const mod = await ensureDb();
			await mod.removeRequest(id);
			await loadRequests();
			openBtn?.focus();
		} catch (err) {
			console.error("request-inbox delete failed:", err);
		}
	}

	// ── Status filters ───────────────────────────────────────────────────────

	function wireFilters() {
		if (!filterEl) return;
		filterEl.querySelectorAll("[data-request-filter]").forEach((btn) => {
			btn.addEventListener("click", () => {
				statusFilter = btn.dataset.requestFilter;
				filterEl
					.querySelectorAll("[data-request-filter]")
					.forEach((b) => {
						const on = b === btn;
						b.classList.toggle("is-active", on);
						b.setAttribute("aria-pressed", String(on));
					});
				renderList();
			});
		});
	}
	// ── New request (invite) ─────────────────────────────────────────────────

	function openDialog() {
		if (!dialog) return;
		dialogForm?.reset();
		if (inviteEl) inviteEl.hidden = true;
		dialog.showModal();
	}

	function closeDialog() {
		if (dialog?.open) dialog.close();
	}

	function clearDialogErrors() {
		dialog?.querySelectorAll("[aria-invalid]").forEach((el) => {
			el.removeAttribute("aria-invalid");
		});
		dialog?.querySelectorAll(".rux-field__error").forEach((el) => {
			el.hidden = true;
		});
	}

	function setDialogError(name, message) {
		if (!dialog) return;
		const input = dialog.querySelector(`[name="${name}"]`);
		const error = dialog.querySelector(`[data-error-for="${name}"]`);
		if (input) input.setAttribute("aria-invalid", "true");
		if (error) {
			error.textContent = message;
			error.hidden = false;
		}
	}

	async function createInvite() {
		clearDialogErrors();
		const fields = {
			name: dialog?.querySelector('[name="name"]')?.value.trim() ?? "",
			email: dialog?.querySelector('[name="email"]')?.value.trim() ?? "",
		};
		if (!fields.name)
			return setDialogError("name", "Enter the contact's name");
		if (!fields.email) return setDialogError("email", "Enter their email");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
			return setDialogError("email", "Enter a valid email");
		}

		const createBtn = document.getElementById("request-inbox-create-btn");
		if (createBtn) {
			createBtn.disabled = true;
			createBtn.textContent = "Creating…";
		}
		try {
			const mod = await ensureDb();
			const invite = await mod.createInvite({
				client:
					dialog?.querySelector('[name="client"]')?.value.trim() ??
					"",
				contact: {
					name: fields.name,
					email: fields.email,
					phone:
						dialog?.querySelector('[name="phone"]')?.value.trim() ??
						"",
				},
				passengerCount:
					dialog?.querySelector('[name="passengers"]')?.value ?? null,
				note:
					dialog?.querySelector('[name="note"]')?.value.trim() ?? "",
			});
			showInvite(invite.url, fields.name);
			await loadRequests();
		} catch (err) {
			setDialogError(
				"email",
				err?.message || "Could not create the invite",
			);
			console.error("request-inbox invite failed:", err);
		} finally {
			if (createBtn) {
				createBtn.disabled = false;
				createBtn.textContent = "Create link";
			}
		}
	}

	function showInvite(url, contactName) {
		if (!inviteEl || !inviteUrl) return;
		inviteUrl.value = url;
		inviteEl.hidden = false;
		const copyBtn = document.getElementById("request-inbox-copy-btn");
		const mailBtn = document.getElementById("request-inbox-mail-btn");
		if (mailBtn) mailBtn.href = composeMailto(url, contactName);
		copyBtn?.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(url);
				const label = copyBtn.querySelector(".rux-button__label");
				if (label) {
					label.textContent = "Copied";
					setTimeout(() => {
						label.textContent = "Copy link";
					}, 1500);
				}
			} catch (err) {
				console.warn("clipboard unavailable:", err);
			}
		});
	}

	function composeMailto(url, contactName) {
		const subject = "Your bus trip request";
		const body =
			`Hi,\n\n` +
			`Please share the details of your trip using the link below, and we'll send you a quote:\n\n` +
			`${url}\n\n` +
			`Thanks,\nEscamilla Tour Buses`;
		return `mailto:${encodeURIComponent(contactName || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}

	// ── Open / close ─────────────────────────────────────────────────────────

	async function open() {
		if (!windowEl) return;
		isOpen = true;
		windowEl.hidden = false;
		if (window.innerWidth <= 580)
			window.RuxFloatingWindow?.resetGeometry(windowEl);
		await loadRequests();
	}

	function close() {
		isOpen = false;
		if (dialog?.open) dialog.close();
		if (windowEl) windowEl.hidden = true;
	}

	// ── Wiring ───────────────────────────────────────────────────────────────

	closeBtn?.addEventListener("click", close);
	if (windowEl && headerEl) {
		window.RuxFloatingWindow?.attachDrag(windowEl, headerEl, {
			minViewportWidth: 580,
		});
	}

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && isOpen) close();
	});

	if (dialog) {
		dialog.addEventListener("click", (e) => {
			if (e.target === dialog) closeDialog();
		});
	}
	dialog
		?.querySelector("#request-inbox-cancel-btn")
		?.addEventListener("click", closeDialog);
	dialog
		?.querySelector("#request-inbox-create-btn")
		?.addEventListener("click", createInvite);
	dialogForm?.addEventListener("submit", (e) => {
		e.preventDefault();
		createInvite();
	});

	newBtn?.addEventListener("click", openDialog);
	wireFilters();

	window.RequestInbox = { open, close, refresh: loadRequests };
	if (openBtn) openBtn.addEventListener("click", open);

	// Load once so the Requests badge has a count at boot.
	loadRequests();
})();
