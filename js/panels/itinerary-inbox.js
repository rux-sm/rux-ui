/* ==========================================================================
   RUX UI — ITINERARY INBOX
   --------------------------------------------------------------------------
   Processed itineraries that do not belong to a trip yet.

   The Grid tab can only be reached with a trip already open, which is the
   wrong way round for how the work arrives: a customer's itinerary turns up
   before anyone has decided whether it is a new trip, an update to one
   already booked, or a quote that never becomes either. This is where one
   waits while that is decided.

   What lands here is ALREADY PROCESSED — stops, per-leg mileage, drive times,
   day offsets and the questions to put back to the customer. An unrouted
   queue item tells a dispatcher nothing, so the work happens on the way in
   rather than on the way out.

   One way in, on purpose: saveItineraryDraft(document). Every feed is a
   client of that — a paste here, a push from a conversation, and later the
   intake page — so a feed can be added or dropped without touching the inbox.

   A module view rather than a floating window, matching request-inbox.js:
   in this app the module hosts the list and a floating window hosts the
   editor of one record. Here that window mounts a second ItineraryGrid in
   standalone mode, so an itinerary is edited, routed and printed with the
   same component the trip editor uses — without a trip having to exist.

   API
   ---
   window.ItineraryInbox.init()     → first entry to the module
   window.ItineraryInbox.refresh()  → reload the list and the badge
   window.ItineraryInbox.add(doc, label) → the one way in
   ========================================================================== */

(function () {
	"use strict";

	const viewEl = document.getElementById("itinerary-inbox-view");
	if (!viewEl) return;

	const bodyEl = document.getElementById("itinerary-inbox-body");
	const countEl = document.getElementById("itinerary-inbox-count");
	const badgeEl = document.getElementById("itineraries-badge");
	const filtersEl = document.getElementById("itinerary-inbox-filters");
	const addBtn = document.getElementById("itinerary-inbox-add");

	let rows = [];
	let filter = "all";
	let dbPromise = null;

	function db() {
		if (!dbPromise) {
			dbPromise = import("../data/itinerary-grid-db.js?v=3").catch((error) => {
				dbPromise = null;
				throw error;
			});
		}
		return dbPromise;
	}

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		})[ch]);
	}

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		year: "numeric", month: "short", day: "numeric",
	});

	function formatDate(iso) {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "").trim());
		if (!m) return "";
		return dateFormat.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	}

	/* What a row says without opening the document.

	   Read through ItineraryGrid rather than reimplemented: the mileage, the
	   day count and the questions are already worked out there, and a second
	   implementation of any of them is a second answer waiting to disagree
	   with the editor the dispatcher opens next. */
	function summarise(document_) {
		const G = window.ItineraryGrid;
		if (!G?.fromV3) return null;
		try {
			const state = G.fromV3(document_);
			const legs = [state.legs.outbound, state.legs.return].filter(Boolean);
			const stops = legs.reduce((n, leg) => n + leg.stops.length, 0);
			const miles = legs.reduce((total, leg) => total + leg.stops.reduce((sum, stop) => {
				const value = Number.parseFloat(stop.miles);
				return sum + (Number.isFinite(value) ? value : 0);
			}, 0), 0);
			const approx = legs.some((leg) => leg.stops.some((stop) => stop.approxFrom));
			const drive = legs.reduce((total, leg) => total + leg.stops.reduce((sum, stop) => {
				const m = /^(\d+):([0-5]\d)$/.exec(String(stop.drive ?? "").trim());
				return sum + (m ? Number(m[1]) * 60 + Number(m[2]) : 0);
			}, 0), 0);
			const days = G.deriveDays(state.legs.outbound.stops);
			return {
				client: state.client,
				destination: state.destination,
				startDate: state.legs.outbound.startDate,
				split: !!state.legs.return,
				stops,
				miles,
				approx,
				drive,
				dayCount: days.length ? days[days.length - 1].departDay + 1 : 0,
				flags: state.dataFlags.length,
				review: legs.reduce((n, leg) =>
					n + leg.stops.filter(G.needsReview).length + G.suspectCount(leg.stops), 0),
			};
		} catch (error) {
			console.warn("An itinerary in the inbox could not be summarised:", error);
			return null;
		}
	}

	function span(mins) {
		if (!mins) return "";
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
	}

	const STATUS_LABEL = { new: "New", reviewed: "Reviewed", closed: "Closed" };
	const STATUS_CLASS = { new: " rux-badge--info", reviewed: " rux-badge--success", closed: "" };

	function renderRow(row) {
		const s = summarise(row.document);
		const title = row.label || s?.client || s?.destination || "Untitled itinerary";
		const size = s
			? [
				`${s.stops} stop${s.stops === 1 ? "" : "s"}`,
				s.dayCount ? `${s.dayCount} day${s.dayCount === 1 ? "" : "s"}` : "",
				s.miles ? `${s.approx ? "≈ " : ""}${Math.round(s.miles)} mi` : "",
				span(s.drive),
			].filter(Boolean).join(" · ")
			: "Not processed";
		const needs = s
			? [
				s.flags ? `${s.flags} to ask` : "",
				s.review ? `${s.review} address${s.review === 1 ? "" : "es"}` : "",
			].filter(Boolean).join(" · ")
			: "";

		return `<tr data-id="${escHtml(row.id)}">
			<td data-col="itinerary">
				<button type="button" class="rux-button rux-button--ghost sched-itinerary-inbox__open" data-act="open">
					<span class="rux-button__label">${escHtml(title)}</span>
				</button>
				${s?.split ? '<span class="rux-badge">Split</span>' : ""}
			</td>
			<td data-col="when">${s?.startDate ? escHtml(formatDate(s.startDate)) : ""}</td>
			<td data-col="size">${escHtml(size)}</td>
			<td data-col="needs">${needs ? `<span class="sched-itinerary-inbox__attention">${escHtml(needs)}</span>` : ""}</td>
			<td data-col="status">
				<span class="rux-badge${STATUS_CLASS[row.status] ?? ""}">${escHtml(STATUS_LABEL[row.status] ?? row.status)}</span>
			</td>
			<td data-col="actions">
				<button type="button" class="rux-button rux-button--ghost rux-button--sm" data-act="print">
					<span class="rux-button__label">Sheet</span>
				</button>
				<button type="button" class="rux-button rux-button--ghost rux-button--sm" data-act="status">
					<span class="rux-button__label">${row.status === "reviewed" ? "Unmark" : "Reviewed"}</span>
				</button>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm" data-act="delete" aria-label="Delete ${escHtml(title)}">
					<span class="rux-icon" aria-hidden="true">delete</span>
				</button>
			</td>
		</tr>`;
	}

	function render() {
		const shown = rows.filter((row) => filter === "all" || row.status === filter);
		countEl.textContent = rows.length
			? `${shown.length} of ${rows.length} itinerar${rows.length === 1 ? "y" : "ies"}`
			: "";

		bodyEl.innerHTML = shown.length
			? shown.map(renderRow).join("")
			: `<tr><td colspan="6" class="sched-itinerary-inbox__empty">${rows.length
					? "Nothing with that status."
					: "No itineraries waiting. Process a customer's document and it lands here, already routed."}</td></tr>`;

		const fresh = rows.filter((row) => row.status === "new").length;
		if (badgeEl) {
			badgeEl.textContent = String(fresh);
			badgeEl.hidden = fresh === 0;
		}
	}

	async function refresh() {
		try {
			rows = await (await db()).listItineraryDrafts();
		} catch (error) {
			console.warn("The itinerary inbox could not be loaded:", error);
			rows = [];
		}
		render();
	}

	/* The one way in. Anything that produces a processed v3 document calls
	   this — a paste below, a conversation, later the intake page. */
	async function add(document_, label) {
		const saved = await (await db()).saveItineraryDraft(document_, label);
		if (saved) {
			rows.unshift(saved);
			render();
		}
		return saved;
	}

	function rowById(id) {
		return rows.find((row) => String(row.id) === String(id)) || null;
	}

	/* ── The editor of one record ─────────────────────────────────────────
	   A floating window hosting a SECOND ItineraryGrid, per composition.md
	   §2.3: opening a row in a records view must not navigate away from the
	   list. It is the same component the trip editor's Grid tab mounts, in
	   standalone mode — its own state, no trip-form reads, and deliberately
	   not publishing the hooks trip-db.js calls, so a trip save can never be
	   pointed at this window instead of the tab. */

	const editorEl = document.getElementById("itinerary-inbox-editor");
	const editorTitleEl = document.getElementById("itinerary-inbox-editor-title");
	const editorHeaderEl = editorEl?.querySelector("[data-itin-editor-header]");
	const saveBtn = document.getElementById("itinerary-inbox-save");
	let grid = null;
	let openDraft = null;

	function ensureGrid() {
		if (grid || !editorEl) return grid;
		grid = window.ItineraryGrid?.init?.(editorEl, {
			hostId: "itinerary-inbox-grid",
			publishHooks: false,
			standalone: true,
		}) ?? null;
		return grid;
	}

	/* Open a row, or — with no row — a blank one.

	   The blank case is the inbox's front door. Everything that turns a
	   customer's document into an itinerary already lives in the Grid's intake
	   box: paste the email, attach the PDF, "Read it for me", or paste JSON
	   back from a chat. Opening that box empty is therefore the whole of "new
	   itinerary", and it means the document lane no longer requires a trip to
	   exist first, which was the gap. Save to inbox creates the row. */
	function openEditor(row) {
		if (!editorEl) return;
		const instance = ensureGrid();
		if (!instance) {
			window.Rux?.toast?.("The itinerary editor could not be opened.");
			return;
		}
		openDraft = row ?? null;
		if (editorTitleEl) {
			editorTitleEl.textContent = row
				? (row.label || summarise(row.document)?.client || "Itinerary")
				: "New itinerary";
		}
		if (row) instance.setDocument(row.document);
		else instance.clear();
		if (saveBtn) {
			saveBtn.querySelector(".rux-button__label").textContent =
				row ? "Save to inbox" : "Add to inbox";
		}
		editorEl.hidden = false;
		if (window.innerWidth <= 580) window.RuxFloatingWindow?.resetGeometry(editorEl);
		document.getElementById("itinerary-inbox-editor-close")?.focus();
	}

	function closeEditor() {
		openDraft = null;
		if (editorEl) editorEl.hidden = true;
	}

	/* What is on screen, which is not always what is in the row: the point of
	   opening the window is to change it. Falls back to the stored document so
	   an action taken without the editor open still has something to act on.

	   getStoredDocument, never getDocument: the clean export strips the
	   `rux_route` annex, and the annex is where every measured mile and drive
	   time lives. Printing a sheet from it would print a trip with no
	   mileage. */
	function currentDocument(row) {
		return (openDraft === row && grid?.getStoredDocument()) || row.document;
	}

	async function saveToInbox() {
		// The annex-carrying export — see currentDocument above. Saving the
		// clean one silently discarded the entire routing pass.
		const document_ = grid?.getStoredDocument();
		if (!document_) return;
		const summary = summarise(document_);
		if (!summary?.stops) {
			window.Rux?.toast?.("There is nothing to save yet — read a document first.");
			return;
		}

		// No open row means this came in through the front door and has no row
		// yet. Creating one here rather than in a separate handler keeps the
		// button honest: it says where the itinerary ends up, not how it got
		// there.
		if (!openDraft) {
			const created = await add(document_, summary.client || "");
			if (!created) {
				window.Rux?.toast?.("Could not add it — the inbox may not be set up yet.");
				return;
			}
			openDraft = created;
			if (editorTitleEl) editorTitleEl.textContent = created.label || "Itinerary";
			if (saveBtn) {
				saveBtn.querySelector(".rux-button__label").textContent = "Save to inbox";
			}
			window.Rux?.toast?.("Added to the inbox.");
			return;
		}

		const label = summary.client || openDraft.label || "";
		const saved = await (await db()).updateItineraryDraft(openDraft.id, {
			document: document_,
			label,
		});
		if (!saved) {
			window.Rux?.toast?.("That itinerary could not be saved.");
			return;
		}
		openDraft.document = document_;
		openDraft.label = label;
		render();
		window.Rux?.toast?.("Saved to the inbox.");
	}

	/* Open it as a new trip.

	   The editor is where every itinerary tool already lives, so this hands
	   the document to it rather than rebuilding any of them here. Nothing is
	   saved: the trip appears in the editor for review, and the dispatcher
	   saves it — which is the same rule the rest of this workflow follows. */
	function openAsNewTrip(row) {
		const result = window.TripEditor?.openFromDraft?.(
			currentDocument(row),
			row.label ? `Itinerary · ${row.label}` : "From the itinerary inbox",
		);
		if (!result?.ok) {
			window.Rux?.toast?.("That itinerary could not be opened.");
			return;
		}
		closeEditor();
		window.Rux?.toast?.(
			"Opened for review. Saving it creates the trip — then come back and mark this reviewed.",
		);
	}

	function printSheet(row) {
		const G = window.ItineraryGrid;
		if (!G?.fromV3 || !window.DriverSheet?.print) return;
		const state = G.fromV3(currentDocument(row));
		const leg = state.legs.outbound;
		if (!leg.stops.length) {
			window.Rux?.toast?.("That itinerary has no stops to print.");
			return;
		}
		const days = G.deriveDays(leg.stops);
		const totals = leg.stops.reduce((t, stop) => {
			const miles = Number.parseFloat(stop.miles);
			if (Number.isFinite(miles)) t.miles += miles;
			const m = /^(\d+):([0-5]\d)$/.exec(String(stop.drive ?? "").trim());
			if (m) t.drive += Number(m[1]) * 60 + Number(m[2]);
			return t;
		}, { miles: 0, drive: 0 });

		window.DriverSheet.print({
			meta: {
				client: state.client,
				destination: state.destination,
				contactName: state.bookingName,
				contactPhone: state.bookingPhone,
				leg: state.legs.return ? "Outbound leg" : "",
			},
			startDate: leg.startDate,
			stops: leg.stops,
			days,
			risks: G.legRisks(leg.stops, days),
			plan: G.yardPlan(leg.stops),
			duty: G.dutyByDay(leg.stops, days),
			totals,
			dataFlags: state.dataFlags,
		});
	}

	async function setStatus(row, next) {
		if (await (await db()).updateItineraryDraft(row.id, { status: next })) {
			row.status = next;
			render();
		}
	}

	async function deleteRow(row) {
		const label = row.label || summarise(row.document)?.client || "this itinerary";
		if (!window.confirm(`Delete ${label} from the inbox?`)) return;
		if (await (await db()).deleteItineraryDraft(row.id)) {
			if (openDraft === row) closeEditor();
			rows = rows.filter((r) => r !== row);
			render();
		}
	}

	/* ── Wiring ───────────────────────────────────────────────────────── */

	bodyEl?.addEventListener("click", (event) => {
		const button = event.target.closest("[data-act]");
		if (!button) return;
		const row = rowById(button.closest("[data-id]")?.dataset.id);
		if (!row) return;

		switch (button.dataset.act) {
			case "open": return openEditor(row);
			case "print": return printSheet(row);
			case "status": return void setStatus(row, row.status === "reviewed" ? "new" : "reviewed");
			case "delete": return void deleteRow(row);
			default:
		}
	});

	document.getElementById("itinerary-inbox-editor-close")?.addEventListener("click", closeEditor);
	document.getElementById("itinerary-inbox-discard")?.addEventListener("click", closeEditor);
	saveBtn?.addEventListener("click", () => void saveToInbox());
	document.getElementById("itinerary-inbox-to-trip")?.addEventListener("click", () => {
		if (openDraft) return openAsNewTrip(openDraft);
		// Straight from the front door to a trip, never having been a row here.
		// A document that turns out to be a booking nobody needs to think about
		// should not have to be filed first.
		const document_ = grid?.getStoredDocument();
		const summary = summarise(document_);
		if (!summary?.stops) {
			window.Rux?.toast?.("There is nothing to open yet — read a document first.");
			return;
		}
		openAsNewTrip({ document: document_, label: summary.client || "" });
	});

	editorEl?.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closeEditor();
	});

	if (editorEl && editorHeaderEl) {
		window.RuxFloatingWindow?.attachDrag(editorEl, editorHeaderEl, { minViewportWidth: 580 });
	}

	filtersEl?.addEventListener("click", (event) => {
		const button = event.target.closest("[data-itin-filter]");
		if (!button) return;
		filter = button.dataset.itinFilter;
		filtersEl.querySelectorAll("[data-itin-filter]").forEach((el) => {
			el.setAttribute("aria-pressed", String(el === button));
		});
		render();
	});

	/* The front door.

	   This was a window.prompt() taking pasted JSON, which was a stopgap and a
	   bad one: it could not take a PDF, it could not take a customer's email,
	   and pasting 5KB of JSON into a native prompt is miserable. It opens the
	   editor on a blank itinerary instead, where the Grid's own intake box
	   already does all four — read a document, attach a PDF, copy the prompt
	   out, paste JSON back. */
	addBtn?.addEventListener("click", () => openEditor(null));

	let started = false;
	function init() {
		if (started) return;
		started = true;
		refresh();
	}

	window.ItineraryInbox = { init, refresh, add };

	// The badge should be right before anyone opens the module, the same way
	// the Requests badge is.
	if (document.readyState !== "loading") refresh();
	else document.addEventListener("DOMContentLoaded", refresh, { once: true });
})();
