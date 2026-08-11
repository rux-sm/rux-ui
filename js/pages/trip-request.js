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

import { buildDraft, validateDraft } from "../core/trip-request-model.js";
import { submitRequest } from "../data/trip-request-db.js";

const form = document.getElementById("trip-request-form");
const submitBtn = document.getElementById("trip-request-submit");
const successEl = document.getElementById("trip-request-success");
const successText = document.getElementById("trip-request-success-text");
const ticketsEl = document.getElementById("trip-request-tickets");
const ticketList = document.getElementById("trip-request-ticket-list");
const addTicketBtn = document.getElementById("trip-request-add-ticket");

const reference = new URLSearchParams(window.location.search).get("r")?.trim() ?? "";
let submitting = false;

// ── Value collection ─────────────────────────────────────────────────────

function valueOf(fieldKey) {
	return form?.querySelector(`[data-field="${fieldKey}"]`)?.value ?? "";
}

function selectedType() {
	return form?.querySelector('input[name="type"]:checked')?.value ?? "round_trip";
}

function isTicketed() {
	return form?.querySelector('[data-switch="service.ticketed"]')?.checked ?? false;
}

function isNoContact() {
	return form?.querySelector('[data-switch="service.noContact"]')?.checked ?? false;
}

function collectRequirements() {
	const codes = [];
	form?.querySelectorAll('input[data-req]:checked').forEach((box) => {
		codes.push(box.dataset.req);
	});
	return codes;
}

function collectTicketOptions() {
	if (!ticketList) return [];
	return [...ticketList.children].map((row) => ({
		label: row.querySelector("[data-ticket-label]")?.value ?? "",
		price: row.querySelector("[data-ticket-price]")?.value ?? "",
	}));
}

function collectValues() {
	return {
		type: selectedType(),
		serviceType: isTicketed() ? "ticketed" : "charter",
		client: valueOf("client"),
		destination: valueOf("destination"),
		bookingContact: {
			name: valueOf("booking.name"),
			phone: valueOf("booking.phone"),
			email: valueOf("booking.email"),
		},
		pickup: {
			date: valueOf("pickup.date"),
			time: valueOf("pickup.time"),
			name: valueOf("pickup.name"),
			address: valueOf("pickup.address"),
		},
		returnDate: valueOf("returnDate"),
		split: {
			date: valueOf("split.date"),
			time: "",
			name: valueOf("split.name"),
			address: "",
		},
		passengerCount: valueOf("passengerCount"),
		busCount: valueOf("busCount"),
		requirements: collectRequirements(),
		tripContact: {
			name: valueOf("tripContact.name"),
			phone: valueOf("tripContact.phone"),
		},
		contactNotNeeded: isNoContact(),
		ticketOptions: collectTicketOptions(),
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
			section.hidden = isNoContact();
		}
	});
	if (ticketsEl) ticketsEl.hidden = !isTicketed();
}

// ── Ticket option rows ───────────────────────────────────────────────────

function addTicketRow(label = "", price = "") {
	if (!ticketList) return;
	const row = document.createElement("div");
	row.className = "trip-request__ticket-row";
	row.innerHTML = `
		<input class="rux-input" data-ticket-label type="text" placeholder="Adult" aria-label="Ticket name" />
		<div class="rux-input-group rux-input-group--prefix">
			<span class="rux-input-group__prefix" aria-hidden="true">$</span>
			<input class="rux-input" data-ticket-price type="number" min="0" step="0.01" placeholder="0.00" aria-label="Ticket price" />
		</div>
		<button type="button" class="rux-button rux-button--ghost rux-button--icon" aria-label="Remove option">
			<span class="rux-icon" aria-hidden="true">close</span>
		</button>
	`;
	const removeBtn = row.querySelector("button");
	removeBtn.addEventListener("click", () => row.remove());
	ticketList.appendChild(row);
	if (label) row.querySelector("[data-ticket-label]").value = label;
	if (price) row.querySelector("[data-ticket-price]").value = price;
}

// ── Submit ───────────────────────────────────────────────────────────────

async function onSubmit(event) {
	event.preventDefault();
	if (submitting) return;
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
		showSuccess(result.reference);
	} catch (err) {
		console.error("trip request submit failed:", err);
		showErrors({ "booking.email": err?.message || "Could not send the request. Please try again." });
	} finally {
		submitting = false;
		if (submitBtn) submitBtn.disabled = false;
	}
}

function showSuccess(resultReference) {
	if (!successEl || !form) return;
	form.hidden = true;
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
		.querySelector('[data-switch="service.ticketed"]')
		?.addEventListener("change", applyTypeSections);
	form
		.querySelector('[data-switch="service.noContact"]')
		?.addEventListener("change", applyTypeSections);
	form.addEventListener("submit", onSubmit);
}

addTicketBtn?.addEventListener("click", () => addTicketRow());
applyTypeSections();
addTicketRow();