/* ==========================================================================
   RUX UI — TRIP INTAKE WORKBENCH
   --------------------------------------------------------------------------
   Workbench (intake.html) for turning a customer's email or trip document
   into a reviewable Trip Draft v2.

   Source material goes in on the left and Process sends it to the Worker's
   /ai/extract route, which holds the API key and does the extraction
   server-side. The draft comes back into the output area, where
   normalizeTripImport validates it and the preview renders it.

   Processing costs money per call, so that one route requires a signed-in
   session; nothing else on the page does. Pasting a draft in by hand still
   works exactly as before, which is also the fallback when the service is
   down.
   ========================================================================== */

import { normalizeTripImport } from "../data/trip-import.js";
import { supabase, SUPABASE_URL } from "../data/supabase.js";

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
const clearBtn = document.getElementById("intake-clear-btn");
const previewSection = document.getElementById("intake-preview");
const previewHeaderContent = document.getElementById("intake-preview-header-content");
const stopCountBadge = document.getElementById("intake-stop-count");
const timeline = document.getElementById("intake-timeline");
const warningsCard = document.getElementById("intake-warnings-card");
const warningsList = document.getElementById("intake-warnings");

const authCard = document.getElementById("intake-auth");
const signInForm = document.getElementById("intake-signin-form");
const emailInput = document.getElementById("intake-email");
const passwordInput = document.getElementById("intake-password");
const signInBtn = document.getElementById("intake-signin-btn");
const authError = document.getElementById("intake-auth-error");
const signedInRow = document.getElementById("intake-signed-in");
const userEmailEl = document.getElementById("intake-user-email");
const signOutBtn = document.getElementById("intake-signout-btn");
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

// Only the extraction route is gated. Pasting a draft, validating it, and
// previewing it all work signed out — and keep working if the service is down.

let session = null;

function renderAuthState() {
	const signedIn = !!session;
	authCard.hidden = false;
	signInForm.hidden = signedIn;
	signedInRow.hidden = !signedIn;
	if (signedIn) userEmailEl.textContent = session.user?.email || "";
	processBtn.disabled = !signedIn;
	processBtn.setAttribute(
		"title",
		signedIn ? "Extract a trip draft from the source material" : "Sign in to process documents",
	);
}

supabase.auth.getSession().then(({ data }) => {
	session = data.session;
	renderAuthState();
});

supabase.auth.onAuthStateChange((_event, next) => {
	session = next;
	renderAuthState();
});

signInForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	authError.hidden = true;
	signInBtn.disabled = true;
	const { error } = await supabase.auth.signInWithPassword({
		email: emailInput.value.trim(),
		password: passwordInput.value,
	});
	signInBtn.disabled = false;
	passwordInput.value = "";
	if (error) {
		authError.textContent = error.message;
		authError.hidden = false;
	}
});

signOutBtn.addEventListener("click", () => supabase.auth.signOut());

// ── Process ──────────────────────────────────────────────────────────────

const EXTRACT_URL = `${SUPABASE_URL}/ai/extract`;

const EXTENSION_TYPES = {
	pdf: "application/pdf",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	txt: "text/plain",
};

// A dropped file's type can be empty depending on the source, so fall back to
// the extension rather than sending the model a blank media type.
function mediaTypeOf(file) {
	if (file.type) return file.type;
	return EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase()] || "";
}

function isTextFile(file) {
	return mediaTypeOf(file) === "text/plain";
}

function readFile(file, as) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
		if (as === "text") reader.readAsText(file);
		else reader.readAsDataURL(file);
	});
}

async function toFilePayload(file) {
	const dataUrl = String(await readFile(file, "dataURL"));
	return {
		name: file.name,
		media_type: mediaTypeOf(file),
		// readAsDataURL gives "data:<type>;base64,<payload>" — the API wants
		// only the payload.
		data: dataUrl.slice(dataUrl.indexOf(",") + 1),
	};
}

function setProcessStatus(message, tone) {
	processStatus.textContent = message || "";
	processStatus.dataset.tone = tone || "";
}

processBtn.addEventListener("click", async () => {
	// Ask for the session fresh rather than trusting the cached one: an access
	// token expires, and supabase-js refreshes it on demand.
	const { data } = await supabase.auth.getSession();
	session = data.session;
	renderAuthState();
	if (!session) {
		setProcessStatus("Sign in first.", "error");
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
			if (isTextFile(file)) textParts.push(String(await readFile(file, "text")).trim());
			else files.push(await toFilePayload(file));
		}
		const text = textParts.filter(Boolean).join("\n\n");

		if (!text && !files.length) {
			setProcessStatus("Paste something or attach a file first.", "error");
			return;
		}

		setProcessStatus("Extracting the trip draft…", "busy");
		const response = await fetch(EXTRACT_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify({ text, files }),
		});

		const body = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(body.error || `Processing failed (${response.status}).`);
		}

		jsonText.value = JSON.stringify(body.draft, null, 2);
		setProcessStatus("Draft ready. Check it against the source before using it.", "ok");
		// Reuse the one validation path rather than a second copy of it.
		previewBtn.click();
	} catch (error) {
		setProcessStatus(error.message, "error");
	} finally {
		processBtn.disabled = !session;
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
	clearBtn.hidden = false;
	previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
	clearBtn.hidden = true;
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
