/* ==========================================================================
   RUX UI — TRIP REQUEST PAGE
   --------------------------------------------------------------------------
   Public, no-login form (request.html) that collects enough to open a trip
   request for dispatch. Values are assembled and validated by the pure
   trip-request-model and submitted through trip-request-db → a security
   definer RPC; the submission lands in the app's Requests inbox.

   Also honors a ?r=REQ-XXXXXX reference so an invited customer's submission
   attaches to the invite row dispatch created (see submit_trip_request).
   ========================================================================== */

import {
	buildDraft,
	documentError,
	formatFileSize,
	MAX_DOCUMENTS,
	normalizePassengerCount,
	recommendedBusCount,
	SEATS_PER_BUS,
	validateDraft,
} from "../core/trip-request-model.js";
import { submitRequest, uploadRequestDocument } from "../data/trip-request-db.js";

const form = document.getElementById("trip-request-form");
const submitBtn = document.getElementById("trip-request-submit");
const successEl = document.getElementById("trip-request-success");
const successText = document.getElementById("trip-request-success-text");
const introEl = document.getElementById("trip-request-intro");
const footerEl = document.getElementById("trip-request-footer");

const reference = new URLSearchParams(window.location.search).get("r")?.trim() ?? "";
let submitting = false;
let submitted = false;

// ── Value collection ─────────────────────────────────────────────────────

function valueOf(fieldKey) {
	return form?.querySelector(`[data-field="${fieldKey}"]`)?.value ?? "";
}

function selectedType() {
	return form?.querySelector('input[name="type"]:checked')?.value ?? "round_trip";
}

function bookerIsDayOfContact() {
	return form?.querySelector('[data-switch="contact.sameAsBooker"]')?.checked ?? false;
}

function collectValues() {
	const bookingContact = {
		name: valueOf("booking.name"),
		phone: valueOf("booking.phone"),
		email: valueOf("booking.email"),
	};

	return {
		type: selectedType(),
		client: valueOf("client"),
		destination: valueOf("destination"),
		bookingContact,
		pickup: {
			date: valueOf("pickup.date"),
			time: valueOf("pickup.time"),
			address: valueOf("pickup.address"),
		},
		returnDate: valueOf("returnDate"),
		split: {
			date: valueOf("split.date"),
			time: "",
			name: valueOf("split.name"),
			address: "",
		},
		/* The form no longer asks what the bus should carry — dispatch sets
		   requirements against real availability. buildDraft omits the key
		   entirely when nothing is passed. */
		passengerCount: valueOf("passengerCount"),
		/* "I am the day-of contact" means the booker IS that contact, so the
		   draft carries them as one. It is emphatically not contact_not_needed
		   — that flag tells dispatch no day-of contact is required at all, and
		   it suppresses the "Trip contact missing" flag on the trip bar and
		   reads "Not Required" in Tasks. A customer answering this form never
		   has grounds to claim that, so the page never sets it. */
		tripContact: bookerIsDayOfContact()
			? { name: bookingContact.name, phone: bookingContact.phone }
			: {
					name: valueOf("tripContact.name"),
					phone: valueOf("tripContact.phone"),
			  },
		contactNotNeeded: false,
		notes: valueOf("notes"),
	};
}

// ── Validation / error display ───────────────────────────────────────────

function clearErrors() {
	document.querySelectorAll("[aria-invalid]").forEach((el) => {
		el.removeAttribute("aria-invalid");
	});
	document.querySelectorAll(".rux-field__error").forEach((el) => {
		el.hidden = true;
	});
}

function showErrors(errors) {
	Object.entries(errors).forEach(([key, message]) => {
		const input = form?.querySelector(`[data-validate="${key}"]`);
		const error = document.querySelector(`[data-error-for="${key}"]`);
		if (input) input.setAttribute("aria-invalid", "true");
		if (error) {
			error.textContent = message;
			error.hidden = false;
		}
	});
	submitBtn?.focus();
}

// ── Progressive disclosure ───────────────────────────────────────────────

function applyTypeSections() {
	const type = selectedType();
	document.querySelectorAll("[data-section]").forEach((section) => {
		if (section.dataset.section === "round") {
			section.hidden = type !== "round_trip";
		} else if (section.dataset.section === "split") {
			section.hidden = type !== "dropoff_pickup";
		} else if (section.dataset.section === "no-contact") {
			section.hidden = bookerIsDayOfContact();
		}
	});
}

/* Answers "how many buses is this?" while the customer types, so nobody has
   to divide by 52 themselves or guess. The same number goes into the draft
   as bus_count — see recommendedBusCount. */
function applyBusHint() {
	const hint = form?.querySelector("[data-bus-hint]");
	if (!hint) return;
	const passengers = normalizePassengerCount(valueOf("passengerCount"));
	if (!passengers) {
		hint.hidden = true;
		hint.textContent = "";
		return;
	}
	const buses = recommendedBusCount(passengers);
	hint.textContent = `About ${buses} ${buses === 1 ? "bus" : "buses"} — our coaches seat ${SEATS_PER_BUS}.`;
	hint.hidden = false;
}

// ── Attachments ──────────────────────────────────────────────────────────

/* Files are held here and uploaded only once the request itself is safely
   in — see onSubmit. Nothing about attaching a file can cost the customer
   their submission. */
let attachments = [];

function renderFileList() {
	const list = form?.querySelector("[data-file-list]");
	if (!list) return;
	list.innerHTML = "";
	attachments.forEach((file) => {
		const item = document.createElement("li");
		item.className = "trip-request__file";
		const size = formatFileSize(file.size);
		item.textContent = size ? `${file.name} · ${size}` : file.name;
		list.appendChild(item);
	});
}

function onFilesPicked(event) {
	const picked = [...(event.target.files ?? [])];
	const errorEl = document.querySelector('[data-error-for="documents"]');
	let message = "";

	const accepted = [];
	for (const file of picked) {
		const problem = documentError(file);
		if (problem) {
			message = `${file.name}: ${problem}`;
			continue;
		}
		if (accepted.length >= MAX_DOCUMENTS) {
			message = `Attach up to ${MAX_DOCUMENTS} files`;
			break;
		}
		accepted.push(file);
	}

	attachments = accepted;
	renderFileList();

	if (errorEl) {
		errorEl.textContent = message;
		errorEl.hidden = !message;
	}
	event.target.setAttribute("aria-invalid", message ? "true" : "false");
	if (!message) event.target.removeAttribute("aria-invalid");
}

/* Uploads run after the request is recorded, so a storage failure degrades to
   "we have your request but not your file" rather than losing the lot. The
   customer is told plainly, with the fallback that already worked before
   uploads existed: send it when we follow up. */
async function uploadAttachments(reference) {
	if (!attachments.length || !reference) return "";
	const failed = [];
	for (const file of attachments) {
		try {
			await uploadRequestDocument(reference, file);
		} catch (err) {
			console.error("trip request attachment failed:", err);
			failed.push(file.name);
		}
	}
	if (!failed.length) return "";
	return failed.length === attachments.length
		? "We couldn't attach your files, but your request is in. Send them over when we follow up."
		: `We couldn't attach ${failed.join(", ")}. Send those over when we follow up.`;
}

// ── Submit ───────────────────────────────────────────────────────────────

async function onSubmit(event) {
	event.preventDefault();
	if (submitting || submitted) return;
	clearErrors();

	const values = collectValues();
	const errors = validateDraft(values);
	if (Object.keys(errors).length) {
		showErrors(errors);
		return;
	}

	const payload = buildDraft(values);
	submitting = true;
	if (submitBtn) submitBtn.disabled = true;

	try {
		const result = await submitRequest({
			reference,
			client: values.client,
			contact: values.bookingContact,
			passengerCount: values.passengerCount,
			payload,
			note: values.notes,
		});
		// The request is recorded from here on: show the confirmation first so
		// a slow or failing upload never leaves the customer staring at a form
		// wondering whether it went through.
		showSuccess(result.reference);
		const attachmentNote = await uploadAttachments(result.reference);
		if (attachmentNote) showAttachmentNote(attachmentNote);
	} catch (err) {
		console.error("trip request submit failed:", err);
		showErrors({ "booking.email": err?.message || "Could not send the request. Please try again." });
	} finally {
		submitting = false;
		if (submitBtn) submitBtn.disabled = false;
	}
}

/* Replaces the standing "send it when we follow up" line rather than adding a
   second one — the customer needs one instruction, not two. */
function showAttachmentNote(message) {
	const note = document.querySelector(".trip-request__success-note");
	if (note) note.textContent = message;
}

/* The submit button sits in the action row outside the form, bound to it with
   form="trip-request-form" — hiding the form alone left a live "Send trip
   request" under the confirmation that posted the request a second time. The
   whole ask collapses instead (title and intro included), and `submitted`
   closes the door on any other path back into onSubmit. */
function showSuccess(resultReference) {
	if (!successEl || !form) return;
	submitted = true;
	form.hidden = true;
	if (introEl) introEl.hidden = true;
	if (footerEl) footerEl.hidden = true;
	if (successText && resultReference) {
		successText.textContent = `Your request ${resultReference} is in. We'll review it and be in touch shortly.`;
	}
	successEl.hidden = false;
	successEl.scrollIntoView({ block: "center" });
}

// ── Wiring ───────────────────────────────────────────────────────────────

if (form) {
	form.querySelectorAll('input[name="type"]').forEach((radio) => {
		radio.addEventListener("change", applyTypeSections);
	});
	form
		.querySelector('[data-switch="contact.sameAsBooker"]')
		?.addEventListener("change", applyTypeSections);
	form
		.querySelector('[data-field="passengerCount"]')
		?.addEventListener("input", applyBusHint);
	form
		.querySelector("[data-field-files]")
		?.addEventListener("change", onFilesPicked);
	form.addEventListener("submit", onSubmit);
}

applyTypeSections();
applyBusHint();