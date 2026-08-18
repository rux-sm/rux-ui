/* ==========================================================================
   RUX UI — REQUEST INBOX PANEL
   --------------------------------------------------------------------------
   The dispatcher-facing side of customer trip requests, surfaced as its own
   module view (data-view="requests") alongside Calendar, Fleet, and Drivers.
   Lists trip_requests rows and drives the workflow: New request invites →
   new submissions land here → mark reviewed / closed as they are triaged
   into the trip editor.

   It is a module rather than a floating window because it is a list surface:
   in this app a floating window hosts the editor of one record, while the
   module view hosts the list. The view router (rux-ui/js/view-router.js) owns
   showing and hiding it, which is why nothing here toggles `hidden`, drags a
   frame, or listens for Escape.

   Data access is lazy and deduplicated, matching the other panels: the module
   dynamic-imports the db layer and keeps a single in-flight promise so a
   slow load can't double-fetch.

   API
   ---
   window.RequestInbox.init()      → refresh on first entry to the module
   window.RequestInbox.refresh()   → reload the list + badge
   ========================================================================== */

(function () {
	"use strict";

	const viewEl = document.getElementById("request-inbox-view");
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
	const detailEl = document.getElementById("request-detail-window");
	const detailHeader = document.getElementById("request-detail-header");
	const detailTitle = document.getElementById("request-detail-title");
	const detailStatus = document.getElementById("request-detail-status");
	const detailBody = document.getElementById("request-detail-body");
	const detailCloseBtn = document.getElementById("request-detail-close-btn");
	const detailDraftBtn = document.getElementById("request-detail-draft-btn");

	// The request currently shown in the detail window, so the footer action
	// has something to act on without re-fetching.
	let openRequest = null;

	let db = null;
	let requests = [];
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

	/* created_at only arrives once list_trip_requests returns it — see the
	   note in supabase/trip_request_detail.sql. Until then this renders an em
	   dash instead of an "Invalid Date". */
	function fmtReceived(value) {
		if (!value) return "—";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "—";
		const days = Math.floor((Date.now() - date.getTime()) / 86400000);
		if (days < 1) return "Today";
		if (days === 1) return "Yesterday";
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	function fmtDates(row) {
		if (!row.start_date && !row.end_date) return "";
		if (!row.end_date || row.start_date === row.end_date)
			return fmtStamp(row.start_date);
		return `${fmtStamp(row.start_date)} – ${fmtStamp(row.end_date)}`;
	}

	/* The trip column: where and when, without the passenger count — that has
	   a column of its own now. */
	function tripSummary(row) {
		const parts = [];
		if (row.destination) parts.push(row.destination);
		const dates = fmtDates(row);
		if (dates) parts.push(dates);
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
		listEl.innerHTML = `<tr><td colspan="6" class="sched-scope-request__empty">Requests could not be loaded.</td></tr>`;
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
			listEl.innerHTML = `<tr><td colspan="6" class="sched-scope-request__empty">${
				requests.length
					? "Nothing in this view"
					: "No trip requests yet"
			}</td></tr>`;
			return;
		}
		visible.forEach((row) => listEl.appendChild(rowItem(row)));
	}

	/* Mirrors STATUS_LABELS in js/core/trip-request-model.js. This file is a
	   classic-script IIFE, not a module, so it cannot import it — keep the two
	   in step. */
	const STATUS_LABELS = {
		invited: "Sent",
		new: "Received",
		reviewed: "Reviewed",
		linked: "Linked",
		closed: "Closed",
	};

	function statusLabel(status) {
		return STATUS_LABELS[status] ?? String(status ?? "");
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
		const tr = document.createElement("tr");
		tr.className = "sched-scope-request__row";
		tr.dataset.status = row.status || "";
		tr.dataset.requestId = row.id || "";
		// The whole row opens the request; keyboard users get the same via the
		// reference button in the client cell, which is a real <button>.
		tr.tabIndex = 0;
		tr.setAttribute("role", "button");
		tr.setAttribute(
			"aria-label",
			`Open ${row.reference || "request"}${row.client ? ` for ${row.client}` : ""}`,
		);

		const title = escapeAttr(
			row.client || row.contact?.name || "Unnamed request",
		);
		const trip = escapeAttr(tripSummary(row) || "—");
		const pax = row.passenger_count ? escapeAttr(row.passenger_count) : "—";
		const note = row.note
			? `<p class="sched-scope-request__row-note">${escapeAttr(row.note)}</p>`
			: "";

		let actions = "";
		if (row.status === "invited" && row._url) {
			actions += `<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--compact" data-copy-url data-url="${escapeAttr(row._url)}" aria-label="Copy invite link for ${title}"><span class="rux-icon" aria-hidden="true">content_copy</span></button>`;
		}
		if (row.status !== "closed") {
			if (row.status !== "reviewed" && row.status !== "linked") {
				actions += `<button type="button" class="rux-button rux-button--ghost rux-button--compact" data-request-action="reviewed" aria-label="Mark ${escapeAttr(row.reference)} reviewed">Reviewed</button>`;
			}
			actions += `<button type="button" class="rux-button rux-button--ghost rux-button--compact" data-request-action="closed" aria-label="Close ${escapeAttr(row.reference)}">Close</button>`;
		}
		actions += `<button type="button" class="rux-button rux-button--ghost rux-button--danger rux-button--compact" data-request-action="delete" aria-label="Delete ${escapeAttr(row.reference)}">Delete</button>`;

		tr.innerHTML = `
			<td><span class="${chipClass(row.status)}">${escapeAttr(statusLabel(row.status))}</span></td>
			<td>
				<span class="sched-scope-request__row-title">${title}</span>
				<span class="sched-scope-request__row-ref">${escapeAttr(row.reference)}</span>
				${note}
			</td>
			<td>${trip}</td>
			<td class="sched-scope-request__row-pax">${pax}</td>
			<td class="sched-scope-request__row-received">${escapeAttr(fmtReceived(row.created_at))}</td>
			<td><div class="sched-scope-request__row-actions">${actions}</div></td>
		`;

		// Row actions must not also open the detail window behind them.
		tr.querySelectorAll("[data-request-action]").forEach((btn) => {
			btn.addEventListener("click", async (event) => {
				event.stopPropagation();
				const action = btn.dataset.requestAction;
				if (action === "delete") {
					await deleteRequest(row.id);
				} else {
					await runStatus(row.id, action);
				}
			});
		});

		tr.querySelector("[data-copy-url]")?.addEventListener("click", async (event) => {
			event.stopPropagation();
			const btn = event.currentTarget;
			try {
				await navigator.clipboard.writeText(btn.dataset.url || "");
				const icon = btn.querySelector(".rux-icon");
				if (icon) {
					const prev = icon.textContent;
					icon.textContent = "check";
					setTimeout(() => { icon.textContent = prev; }, 1200);
				}
			} catch (err) {
				console.warn("clipboard unavailable:", err);
			}
		});

		tr.addEventListener("click", () => openDetail(row));
		tr.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openDetail(row);
			}
		});

		return tr;
	}

	async function runStatus(id, status) {
		try {
			const mod = await ensureDb();
			await mod.setStatus(id, status);
			await loadRequests();
		} catch (err) {
			console.error("request-inbox status update failed:", err);
		}
	}

	async function deleteRequest(id) {
		try {
			const mod = await ensureDb();
			await mod.removeRequest(id);
			closeDetail();
			await loadRequests();
		} catch (err) {
			console.error("request-inbox delete failed:", err);
		}
	}

	// ── Detail window ────────────────────────────────────────────────────────

	/* Renders the Trip Draft v2 payload the customer submitted. The draft is
	   the same shape the import pipeline produces, so this reads it directly
	   rather than keeping a second copy of the field list — see
	   docs/trip-import-schema-v2.json. */
	function detailRows(request) {
		const trip = request?.payload?.trip ?? {};
		const legs = trip.legs ?? {};
		const out = legs.outbound ?? {};
		const back = legs.return ?? null;
		const contact = request?.contact ?? {};
		const dayOf = (trip.trip_contacts ?? [])[0] ?? null;

		const TRIP_TYPES = {
			round_trip: "Round trip",
			one_way: "One way",
			dropoff_pickup: "Two trips",
		};

		const stop = (leg) => (leg?.stops ?? [])[0] ?? {};
		const dateRange = (leg) =>
			!leg ? "" : leg.start_date === leg.end_date || !leg.end_date
				? leg.start_date
				: `${leg.start_date} – ${leg.end_date}`;

		return [
			["Contact", contact.name],
			["Email", contact.email],
			["Phone", contact.phone],
			["Business or school", request?.client || trip.client],
			["Trip type", TRIP_TYPES[trip.type] ?? trip.type],
			["Destination", trip.destination],
			["Pickup", stop(out).address || stop(out).name],
			["Pickup date", dateRange(out)],
			["Pickup time", stop(out).spot_time],
			["Return pickup", back ? stop(back).name || stop(back).address : ""],
			["Return date", back ? dateRange(back) : ""],
			["Passengers", request?.passenger_count],
			["Buses", out.bus_count],
			[
				"Day-of contact",
				trip.contact_not_needed
					? "Not required"
					: dayOf
						? [dayOf.name, dayOf.phone].filter(Boolean).join(" · ")
						: "",
			],
			["Requirements", (trip.requirements ?? []).join(", ")],
			["Notes", trip.notes || request?.note],
		].filter(([, value]) => value !== null && value !== undefined && value !== "");
	}

	function renderDetail(request, row) {
		if (!detailBody) return;
		openRequest = request ?? null;
		// Only a submitted request has a draft to build a trip from; a Sent
		// row is still waiting on the customer.
		if (detailDraftBtn) {
			detailDraftBtn.hidden = !request?.payload?.trip;
		}
		if (detailTitle) {
			detailTitle.textContent =
				request?.client || row?.client || row?.contact?.name || "Request";
		}
		if (detailStatus) {
			detailStatus.textContent = `${row?.reference ?? request?.reference ?? ""} · ${statusLabel(request?.status ?? row?.status)}`;
		}

		const pairs = detailRows(request);
		if (!pairs.length) {
			detailBody.innerHTML = `<p class="sched-scope-request__empty">Nothing submitted yet. This request is still waiting on the customer.</p>`;
		} else {
			detailBody.innerHTML = `
				<dl class="sched-scope-request__detail-list">
					${pairs
						.map(
							([label, value]) => `
						<div class="sched-scope-request__detail-row">
							<dt>${escapeAttr(label)}</dt>
							<dd>${escapeAttr(String(value))}</dd>
						</div>`,
						)
						.join("")}
				</dl>`;
		}

		// An invited request has no submission yet — the link is the useful
		// thing to hand back instead.
		if (row?.status === "invited" && row?._url) {
			const wrap = document.createElement("div");
			wrap.className = "sched-scope-request__detail-link";
			wrap.innerHTML = `
				<p class="sched-scope-request__invite-label">Invite link</p>
				<input class="rux-input" type="text" readonly value="${escapeAttr(row._url)}" aria-label="Invite link" />`;
			detailBody.appendChild(wrap);
		}
	}

	async function openDetail(row) {
		if (!detailEl || !row?.id) return;
		// Clear the previous request first: if this load fails, the footer
		// action must not still be pointing at whatever was open before.
		openRequest = null;
		if (detailDraftBtn) detailDraftBtn.hidden = true;
		detailEl.hidden = false;
		if (detailBody) detailBody.innerHTML = `<p class="sched-scope-request__empty">Loading…</p>`;
		if (window.innerWidth <= 580)
			window.RuxFloatingWindow?.resetGeometry(detailEl);
		detailCloseBtn?.focus();
		try {
			const mod = await ensureDb();
			const request = await mod.getRequest(row.id);
			renderDetail(request, row);
		} catch (err) {
			console.error("request detail load failed:", err);
			if (detailBody) {
				detailBody.innerHTML = `<p class="sched-scope-request__empty">This request could not be opened.</p>`;
			}
		}
	}

	function closeDetail() {
		openRequest = null;
		if (detailEl) detailEl.hidden = true;
	}

	/* Hands the customer's own Trip Draft v2 payload to the trip editor,
	   which opens pre-filled for review. Nothing is saved and the request's
	   status is untouched — dispatch saves the trip, and marks the request
	   Reviewed or links it, so a request is never silently consumed. */
	function createDraftTrip() {
		if (!openRequest?.payload) return;
		const title = openRequest.client
			? `Draft · ${openRequest.client}`
			: `Draft · ${openRequest.reference ?? "Request"}`;
		const result = window.TripEditor?.openFromDraft(openRequest.payload, title);
		if (!result?.ok) {
			console.error("could not open draft trip:", result?.warnings);
			return;
		}
		if (result.warnings.length) {
			console.warn("draft trip imported with warnings:", result.warnings);
		}
		closeDetail();
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
			showInvite(invite.url, fields);
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

	function showInvite(url, contact) {
		if (!inviteEl || !inviteUrl) return;
		inviteUrl.value = url;
		inviteEl.hidden = false;
		const copyBtn = document.getElementById("request-inbox-copy-btn");
		const mailBtn = document.getElementById("request-inbox-mail-btn");
		if (mailBtn) mailBtn.href = composeMailto(url, contact);
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

	/* The recipient is the address, not the person's name — the name only
	   greets them in the body. Percent-encoding protects the reserved
	   characters a local part may legally contain, but the "@" separator has
	   to survive as itself for mail clients to parse the address. */
	function composeMailto(url, contact = {}) {
		const name = String(contact.name ?? "").trim();
		const address = encodeURIComponent(String(contact.email ?? "").trim())
			.replaceAll("%40", "@");
		const subject = "Your bus trip request";
		const body =
			`Hi${name ? ` ${name}` : ""},\n\n` +
			`Please share the details of your trip using the link below, and we'll send you a quote:\n\n` +
			`${url}\n\n` +
			`Thanks,\nEscamilla Tour Buses`;
		return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}

	// ── Module entry ─────────────────────────────────────────────────────────

	/* Called by the view router the first time (and every time) the module is
	   opened. The router owns visibility, so this only refreshes the data. */
	async function init() {
		if (!viewEl) return;
		await loadRequests();
	}

	// ── Wiring ───────────────────────────────────────────────────────────────

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

	detailCloseBtn?.addEventListener("click", closeDetail);
	detailDraftBtn?.addEventListener("click", createDraftTrip);
	if (detailEl && detailHeader) {
		window.RuxFloatingWindow?.attachDrag(detailEl, detailHeader, {
			minViewportWidth: 580,
		});
	}
	// Scoped to the detail window: the module view itself is never dismissed
	// by Escape, the router owns it.
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && detailEl && !detailEl.hidden && !dialog?.open) {
			closeDetail();
		}
	});

	newBtn?.addEventListener("click", openDialog);
	wireFilters();

	window.RequestInbox = { init, refresh: loadRequests };

	// Load once so the Requests badge has a count at boot.
	loadRequests();
})();
