/* ==========================================================================
   RUX UI — TRIP INTAKE WORKBENCH
   --------------------------------------------------------------------------
   Workbench (intake.html) for turning a customer's email or trip document
   into a reviewable Trip Draft v3.

   Source material goes in on the left and Process sends it to the Worker's
   /ai/extract route, which holds the API key and does the extraction
   server-side. The draft comes back into the output area, where
   normalizeTripImport validates it and the preview renders it.

   Three ways out, and the page had only the middle one for a while: Send to
   inbox files it as an itinerary with no trip yet, Open in trip editor hands
   it across for review, Copy JSON is the escape hatch.

   Processing costs money per call, so it needs the extraction passphrase —
   the same one Settings holds in the app, on the same origin, so it is set
   once and both pages see it. Everything else here works without it, and
   pasting a draft in by hand is still the fallback when the service is down.

   v3 rather than v2 now. That is what the inbox and the Grid tab read, and
   the Worker's `itinerary` lane is the contract for it; the `quote` lane
   still speaks v2 for a public enquiry form that does not exist yet.
   ========================================================================== */

import { normalizeTripImport } from "../data/trip-import.js";
import { extractDraft, hasPassphrase, mediaTypeOf } from "../data/extract.js";
import { saveItineraryDraft } from "../data/itinerary-grid-db.js";

// ── DOM refs ─────────────────────────────────────────────────────────────

const sourceText = document.getElementById("intake-source-text");
const dropZone = document.getElementById("intake-drop-zone");
const fileInput = document.getElementById("intake-file-input");
const fileList = document.getElementById("intake-file-list");
const jsonText = document.getElementById("intake-json-text");
const jsonFileInput = document.getElementById("intake-json-file-input");
const uploadJsonBtn = document.getElementById("intake-upload-json-btn");
const parseError = document.getElementById("intake-parse-error");
const previewBtn = document.getElementById("intake-preview-btn");
const copyBtn = document.getElementById("intake-copy-btn");
const openBtn = document.getElementById("intake-open-btn");
const clearBtn = document.getElementById("intake-clear-btn");
const previewSection = document.getElementById("intake-preview");
const previewHeaderContent = document.getElementById("intake-preview-header-content");
const stopCountBadge = document.getElementById("intake-stop-count");
const timeline = document.getElementById("intake-timeline");
const warningsCard = document.getElementById("intake-warnings-card");
const warningsList = document.getElementById("intake-warnings");

const authCard = document.getElementById("intake-auth");
const authNotice = document.getElementById("intake-auth-notice");
const authReady = document.getElementById("intake-auth-ready");
const inboxBtn = document.getElementById("intake-inbox-btn");
const inboxStatus = document.getElementById("intake-inbox-status");
const processBtn = document.getElementById("intake-process-btn");
const processStatus = document.getElementById("intake-process-status");

// ── State ────────────────────────────────────────────────────────────────

const attachedFiles = [];
let lastValidJson = null;

// ── File drop zone ───────────────────────────────────────────────────────

// Kept in step with what the extraction route can actually read. HEIC is
// deliberately absent: the model cannot decode it, and accepting a file that
// silently does nothing is worse than refusing it at the drop zone.
const ACCEPTED_TYPES = new Set([
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"text/plain",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isAcceptedFile(file) {
	if (file.size > MAX_FILE_SIZE) return false;
	if (ACCEPTED_TYPES.has(file.type)) return true;
	const ext = file.name.split(".").pop()?.toLowerCase();
	return ["pdf", "png", "jpg", "jpeg", "webp", "gif", "txt"].includes(ext);
}

function formatSize(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addFiles(files) {
	for (const file of files) {
		if (!isAcceptedFile(file)) continue;
		attachedFiles.push(file);
	}
	renderFileList();
}

function removeFile(index) {
	attachedFiles.splice(index, 1);
	renderFileList();
}

function renderFileList() {
	fileList.innerHTML = "";
	attachedFiles.forEach((file, index) => {
		const li = document.createElement("li");
		li.className = "trip-intake__file-chip";

		const icon = file.type.startsWith("image/") ? "image" : "description";
		li.innerHTML = `
			<span class="rux-icon" aria-hidden="true">${icon}</span>
			<span>${escapeHtml(file.name)}</span>
			<span style="color: var(--rux-text-disabled)">${formatSize(file.size)}</span>
		`;

		const removeBtn = document.createElement("button");
		removeBtn.className = "trip-intake__file-remove";
		removeBtn.type = "button";
		removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
		removeBtn.innerHTML = '<span class="rux-icon">close</span>';
		removeBtn.addEventListener("click", () => removeFile(index));
		li.appendChild(removeBtn);

		fileList.appendChild(li);
	});
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		fileInput.click();
	}
});

fileInput.addEventListener("change", () => {
	if (fileInput.files.length) addFiles(fileInput.files);
	fileInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone.classList.add("is-drag-over");
});

dropZone.addEventListener("dragleave", () => {
	dropZone.classList.remove("is-drag-over");
});

dropZone.addEventListener("drop", (e) => {
	e.preventDefault();
	dropZone.classList.remove("is-drag-over");
	if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
});

// ── JSON file upload ─────────────────────────────────────────────────────

uploadJsonBtn.addEventListener("click", () => jsonFileInput.click());

jsonFileInput.addEventListener("change", () => {
	const file = jsonFileInput.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => {
		jsonText.value = reader.result;
		jsonFileInput.value = "";
	};
	reader.readAsText(file);
});

// ── Sign-in ──────────────────────────────────────────────────────────────

/* Only the extraction route is gated. Pasting a draft, validating it, and
   previewing it all work without the passphrase — and keep working if the
   service is down.

   This replaced a Supabase email-and-password sign-in, which was the gate the
   Worker used to check. That gate presumed an authenticated user the app has
   never had, so the route it protected had never run once; see
   worker/README.md § The gate. The passphrase lives in localStorage on this
   origin, which is the same origin as the app, so Settings → Reading documents
   sets it for both pages at once. */

function renderExtractState() {
	const ready = hasPassphrase();
	authCard.hidden = false;
	authNotice.hidden = ready;
	authReady.hidden = !ready;
	processBtn.disabled = !ready;
	processBtn.setAttribute(
		"title",
		ready
			? "Extract a trip draft from the source material"
			: "Add the extraction passphrase in the app's Settings first",
	);
}

renderExtractState();

// ── Process ──────────────────────────────────────────────────────────────

function isTextFile(file) {
	return mediaTypeOf(file) === "text/plain";
}

// Text only now: extract.js owns the base64 encoding of everything else, so a
// second reader here would be a second answer about the same file.
function readFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
		reader.readAsText(file);
	});
}

function setProcessStatus(message, tone) {
	processStatus.textContent = message || "";
	processStatus.dataset.tone = tone || "";
}

processBtn.addEventListener("click", async () => {
	renderExtractState();
	if (!hasPassphrase()) {
		setProcessStatus("Add the extraction passphrase in the app's Settings first.", "error");
		return;
	}

	processBtn.disabled = true;
	setProcessStatus("Reading the source material…", "busy");

	try {
		// Text files are inlined into the prompt rather than attached — the
		// model reads them either way, and this keeps the request smaller.
		const textParts = [sourceText.value.trim()].filter(Boolean);
		const files = [];
		for (const file of attachedFiles) {
			if (isTextFile(file)) textParts.push(String(await readFile(file)).trim());
			else files.push(file);
		}
		const text = textParts.filter(Boolean).join("\n\n");

		if (!text && !files.length) {
			setProcessStatus("Paste something or attach a file first.", "error");
			return;
		}

		setProcessStatus("Extracting the trip draft…", "busy");
		// One extraction client, shared with the app's Grid tab, so the two
		// cannot disagree about the endpoint, the header or the lane.
		const { draft } = await extractDraft({ text, files, lane: "itinerary" });

		jsonText.value = JSON.stringify(draft, null, 2);
		setProcessStatus("Draft ready. Check it against the source before using it.", "ok");
		// Reuse the one validation path rather than a second copy of it.
		previewBtn.click();
	} catch (error) {
		setProcessStatus(error.message, "error");
	} finally {
		renderExtractState();
	}
});

/* ── Send to the itinerary inbox ──────────────────────────────────────────

   The third way out, and the one that matches how the work actually arrives:
   an itinerary turns up before anyone has decided whether it is a new trip, an
   update to one already booked, or a quote that never becomes either. Filing
   it does not force that decision.

   saveItineraryDraft is the inbox's one way in — the same call the module's own
   New itinerary button makes — so this page is a client of that rather than a
   second writer with its own idea of the row's shape. */

inboxBtn.addEventListener("click", async () => {
	if (!lastValidJson) return;
	if (Number(lastValidJson.schema_version) !== 3) {
		inboxStatus.textContent =
			"The inbox reads Trip Draft v3. This draft is an older version — open it in the trip editor instead.";
		inboxStatus.dataset.tone = "error";
		return;
	}

	inboxBtn.disabled = true;
	inboxStatus.textContent = "Filing…";
	inboxStatus.dataset.tone = "busy";
	try {
		const label = String(lastValidJson.trip?.client || lastValidJson.trip?.destination || "");
		const saved = await saveItineraryDraft(lastValidJson, label);
		if (saved) {
			inboxStatus.textContent = "Filed. It is in Itineraries, waiting for a decision.";
			inboxStatus.dataset.tone = "ok";
		} else {
			inboxStatus.textContent =
				"The inbox is not set up — run supabase/trip_itineraries_inbox.sql.";
			inboxStatus.dataset.tone = "error";
		}
	} catch (error) {
		inboxStatus.textContent = error?.message || "That itinerary could not be filed.";
		inboxStatus.dataset.tone = "error";
	} finally {
		inboxBtn.disabled = false;
	}
});

// ── Preview ──────────────────────────────────────────────────────────────

previewBtn.addEventListener("click", () => {
	const raw = jsonText.value.trim();
	if (!raw) {
		showError("Paste trip JSON above.");
		return;
	}

	let payload;
	try {
		payload = JSON.parse(raw);
	} catch (e) {
		showError(`Invalid JSON: ${e.message}`);
		return;
	}

	let result;
	try {
		result = normalizeTripImport(payload);
	} catch (e) {
		showError(e.message);
		return;
	}

	hideError();
	lastValidJson = payload;
	renderPreview(result.trip, result.warnings, payload);
	previewSection.hidden = false;
	copyBtn.hidden = false;
	inboxBtn.hidden = false;
	openBtn.hidden = false;
	clearBtn.hidden = false;
	inboxStatus.textContent = "";
	previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ── Open in the trip editor ──────────────────────────────────────────────

   This page produced a valid draft and had nowhere to send it: the only way
   across was to copy the JSON by hand and paste it into the editor's own
   import box, on a page that already knows how to read it.

   The handoff is sessionStorage rather than a query string. A draft is a
   customer's schedule with their contact details in it, and CLAUDE.md's
   privacy rule is explicit that personal data does not go in a URL — where it
   would land in history, in any logging proxy, and in the referrer of
   whatever the page loads next. sessionStorage is same-origin, never leaves
   the tab, and is read once and removed. */

const HANDOFF_KEY = "rux-trip-draft-handoff";

openBtn.addEventListener("click", () => {
	if (!lastValidJson) return;
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(lastValidJson));
	} catch (error) {
		// A private window, or storage the browser refuses. Say so rather than
		// navigating to an editor that will open empty.
		showError(
			"This browser would not hand the draft over. Copy the JSON and use "
			+ "Upload JSON in the trip editor instead.",
		);
		console.warn("Draft handoff could not be stored:", error);
		return;
	}
	window.location.href = "./index.html";
});

// ── Copy JSON ────────────────────────────────────────────────────────────

copyBtn.addEventListener("click", async () => {
	const json = lastValidJson;
	if (!json) return;
	try {
		await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
		const label = copyBtn.querySelector(".rux-button__label");
		const original = label.textContent;
		label.textContent = "Copied";
		setTimeout(() => { label.textContent = original; }, 1500);
	} catch {
		// Clipboard API may be unavailable in insecure contexts
	}
});

// ── Clear ────────────────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
	sourceText.value = "";
	jsonText.value = "";
	attachedFiles.length = 0;
	renderFileList();
	lastValidJson = null;
	previewSection.hidden = true;
	copyBtn.hidden = true;
	inboxBtn.hidden = true;
	openBtn.hidden = true;
	clearBtn.hidden = true;
	inboxStatus.textContent = "";
	hideError();
});

// ── Error display ────────────────────────────────────────────────────────

function showError(msg) {
	parseError.textContent = msg;
	parseError.hidden = false;
}

function hideError() {
	parseError.textContent = "";
	parseError.hidden = true;
}

// ── Render preview ───────────────────────────────────────────────────────

const TRIP_TYPE_LABELS = {
	round_trip: "Round trip",
	one_way: "One way",
	dropoff_pickup: "Split (drop off / pick up)",
};

const STOP_ICONS = {
	pickup: "trip_origin",
	stop: "place",
	return: "home",
	day: "wb_sunny",
	sleeper: "hotel",
};

function renderPreview(trip, warnings, raw) {
	renderHeader(trip, raw);
	renderTimeline(trip);
	renderWarnings(warnings);
}

function renderHeader(trip, raw) {
	const source = raw?.trip || {};
	const fields = [];

	fields.push(field("Client", trip.customer));
	fields.push(field("Destination", trip.destination));
	fields.push(field("Trip type", TRIP_TYPE_LABELS[trip.trip_type] || trip.trip_type));
	fields.push(field("Service", trip.is_self_organized ? "Ticketed" : "Charter"));

	if (trip.start_date || trip.end_date) {
		const dates = [trip.start_date, trip.end_date].filter(Boolean).join(" → ");
		fields.push(field("Dates", dates));
	}

	if (trip.bus_count > 1) {
		fields.push(field("Buses", String(trip.bus_count)));
	}

	if (trip.booking_contact_name || trip.booking_contact_phone || trip.booking_contact_email) {
		const parts = [
			trip.booking_contact_name,
			trip.booking_contact_phone,
			trip.booking_contact_email,
		].filter(Boolean);
		fields.push(field("Booking contact", parts.join(" · ")));
	}

	if (trip.trip_contact_1_name || trip.trip_contact_1_phone) {
		const parts = [trip.trip_contact_1_name, trip.trip_contact_1_phone].filter(Boolean);
		fields.push(field("Trip contact", parts.join(" · ")));
	}

	if (trip.quoted_price != null) {
		fields.push(field("Quoted price", `$${Number(trip.quoted_price).toLocaleString()}`));
	}

	if (trip.notes) {
		const notesField = field("Notes", trip.notes);
		notesField.style = "grid-column: 1 / -1";
		fields.push(notesField);
	}

	// Requirements badges
	const reqs = [];
	if (trip.req_sleeper) reqs.push("Sleeper");
	if (trip.req_56pax) reqs.push("56 PAX");
	if (trip.req_ada) reqs.push("ADA Lift");
	if (trip.need_hotel) reqs.push("Hotel");
	if (trip.need_fuel_card) reqs.push("Fuel Card");

	previewHeaderContent.innerHTML = "";
	for (const el of fields) previewHeaderContent.appendChild(el);

	if (reqs.length) {
		const badgeRow = document.createElement("div");
		badgeRow.className = "trip-intake__preview-badges";
		for (const req of reqs) {
			const badge = document.createElement("span");
			badge.className = "rux-badge";
			badge.textContent = req;
			badgeRow.appendChild(badge);
		}
		previewHeaderContent.appendChild(badgeRow);
	}
}

function field(label, value) {
	const el = document.createElement("div");
	el.className = "trip-intake__preview-field";
	el.innerHTML = `
		<span class="trip-intake__preview-label">${escapeHtml(label)}</span>
		<span class="trip-intake__preview-value">${escapeHtml(value || "")}</span>
	`;
	return el;
}

function renderTimeline(trip) {
	const stops = trip.allTripStops || [];
	timeline.innerHTML = "";

	const realStops = stops.filter((s) => s.type !== "day");
	stopCountBadge.textContent = `${realStops.length} stop${realStops.length !== 1 ? "s" : ""}`;

	for (const stop of stops) {
		const li = document.createElement("li");
		li.className = `trip-intake__stop trip-intake__stop--${stop.type}`;

		const icon = STOP_ICONS[stop.type] || "place";
		const iconHtml = `
			<div class="trip-intake__stop-icon">
				<span class="rux-icon" aria-hidden="true">${icon}</span>
			</div>
		`;

		const body = document.createElement("div");
		body.className = "trip-intake__stop-body";

		if (stop.type === "day") {
			const name = document.createElement("span");
			name.className = "trip-intake__stop-name";
			name.textContent = stop.label || "Day boundary";
			body.appendChild(name);
		} else {
			if (stop.name || stop.type) {
				const name = document.createElement("span");
				name.className = "trip-intake__stop-name";
				name.textContent = stop.name || stopTypeLabel(stop.type);
				body.appendChild(name);
			}

			const addr = document.createElement("span");
			if (stop.address) {
				addr.className = "trip-intake__stop-address";
				addr.textContent = stop.address;
			} else if (stop.type !== "return") {
				addr.className = "trip-intake__stop-address trip-intake__stop-address--missing";
				addr.textContent = "Address missing";
			}
			if (addr.textContent) body.appendChild(addr);

			const times = buildTimeString(stop);
			if (times) {
				const timeEl = document.createElement("span");
				timeEl.className = "trip-intake__stop-times";
				timeEl.textContent = times;
				body.appendChild(timeEl);
			}
		}

		li.innerHTML = iconHtml;
		li.appendChild(body);
		timeline.appendChild(li);
	}
}

function stopTypeLabel(type) {
	const labels = { pickup: "Pickup", stop: "Stop", return: "Return to yard", sleeper: "Sleeper" };
	return labels[type] || type;
}

function buildTimeString(stop) {
	const parts = [];
	if (stop.type === "pickup") {
		if (stop.depart_prev) parts.push(`yard depart ${stop.depart_prev}`);
		if (stop.spot) parts.push(`spot ${stop.spot}`);
	} else if (stop.type === "sleeper") {
		if (stop.depart_prev) parts.push(`rest start ${stop.depart_prev}`);
		if (stop.arrive) parts.push(`rest end ${stop.arrive}`);
	} else {
		if (stop.depart_prev) parts.push(`depart prev ${stop.depart_prev}`);
		if (stop.arrive) parts.push(`arrive ${stop.arrive}`);
	}
	return parts.join(" · ");
}

function renderWarnings(warnings) {
	if (!warnings.length) {
		warningsCard.hidden = true;
		return;
	}
	warningsList.innerHTML = "";
	for (const w of warnings) {
		const li = document.createElement("li");
		li.textContent = w;
		warningsList.appendChild(li);
	}
	warningsCard.hidden = false;
}

// ── Utilities ────────────────────────────────────────────────────────────

function escapeHtml(str) {
	const el = document.createElement("span");
	el.textContent = str;
	return el.innerHTML;
}
