/* The trip editor's Updates: the card on the Details tab that lists the
   trip's updates newest first, and the window every Save opens first to ask
   for one, as the scheduler's Save does; see core/trip-update-change.js.

   From Save the window resolves `{ kind, body, keys }`: `update` from Save
   with update; `nothing` from Save, no update after a change the customer
   would ask about, whose row keeps the change's own line and is never drawn;
   `none` from Save, no update after any other change, which writes nothing.
   Closing it resolves null, and the trip is not saved. The card's Add opens
   the same window on its own, where Add update writes at once. */

import { UPDATE_REASONS, changeSentence, shownUpdates, updateStamp } from "../core/trip-update-change.js";
import { addTripUpdate, fetchTripUpdates } from "../data/trip-updates-db.js";

let modal = null;

function element(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function updateItem(u) {
	const li = element("li", "sched-scope-trip__update");
	li.append(element("p", "sched-scope-trip__update-body", u.body),
		element("p", "sched-scope-trip__update-meta", updateStamp(u)));
	return li;
}

// Draws `rows` into a list, with its status line saying when there are none.
function drawUpdates(list, status, rows) {
	const shown = shownUpdates(rows);
	list.replaceChildren(...shown.map(updateItem));
	status.hidden = shown.length > 0;
	status.textContent = "No updates yet.";
}

// Reads a trip's updates into a list. `stillFor` is false once another trip opened.
async function readInto(list, status, tripId, stillFor = () => true) {
	list.replaceChildren();
	status.hidden = false;
	status.textContent = "Reading updates…";
	try {
		const rows = await fetchTripUpdates(tripId);
		if (stillFor()) drawUpdates(list, status, rows);
	} catch (error) {
		console.warn("The updates were not read:", error);
		if (stillFor()) status.textContent = "The updates could not be read.";
	}
}

function ensureModal() {
	if (modal) return modal;
	modal = element("div", "rux-modal-scrim");
	modal.hidden = true;
	modal.innerHTML = `
		<section class="rux-modal sched-update-modal" role="dialog" aria-modal="true" aria-labelledby="trip-update-modal-title">
			<header class="rux-card__header">
				<div>
					<h2 class="rux-card__title" id="trip-update-modal-title">Update</h2>
					<p class="sched-update-modal__trip" data-update-trip></p>
				</div>
				<button type="button" class="rux-button rux-button--default rux-button--icon rux-button--lg" data-rux-dismiss data-update-close>
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="rux-modal__body">
				<p class="sched-update-modal__what" data-update-what></p>
				<div class="rux-field">
					<label class="rux-field__label" for="trip-update-text">What was said to or heard from the customer</label>
					<textarea class="rux-textarea" id="trip-update-text" data-update-text rows="2"></textarea>
				</div>
				<div class="rux-u-cluster" data-update-reasons></div>
				<p class="sched-update-modal__error" data-update-error role="alert" hidden></p>
				<div class="sched-update-modal__earlier" data-update-earlier>
					<p class="rux-field__label">Earlier updates</p>
					<ul class="sched-scope-trip__update-list" data-update-list></ul>
					<p class="sched-scope-trip__update-status" data-update-status role="status"></p>
				</div>
			</div>
			<footer class="rux-modal__footer">
				<button type="button" class="rux-button rux-button--default" data-update-skip></button>
				<button type="button" class="rux-button rux-button--accent" data-update-save></button>
			</footer>
		</section>`;
	const text = modal.querySelector("[data-update-text]");
	const save = modal.querySelector("[data-update-save]");
	// A quick reason shows as picked while the box holds its words.
	text.addEventListener("input", () => {
		save.disabled = !text.value.trim();
		modal.querySelectorAll("[data-update-reasons] button").forEach((chip) => {
			chip.setAttribute("aria-pressed", String(chip.textContent === text.value.trim()));
		});
	});
	// Cmd or Ctrl with Enter presses the main button, as a chat box sends.
	text.addEventListener("keydown", (event) => {
		if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !save.disabled) {
			event.preventDefault();
			save.click();
		}
	});
	document.body.appendChild(modal);
	return modal;
}

/* Fills and opens the window. `onSave` and `onSkip` take the box's text; the
   promise settles with what `settle` is handed, or null when the window closes
   any other way (X, Escape), which the shared modal code does by hiding it. */
function openWindow({ trip, what, line, reasons, tripId, saveLabel, skipLabel, closeLabel, onSave, onSkip }) {
	const box = ensureModal();
	const text = box.querySelector("[data-update-text]");
	const save = box.querySelector("[data-update-save]");
	const skip = box.querySelector("[data-update-skip]");
	const close = box.querySelector("[data-update-close]");
	const error = box.querySelector("[data-update-error]");
	box.querySelector("[data-update-trip]").textContent = trip;
	const whatLine = box.querySelector("[data-update-what]");
	whatLine.textContent = what;
	whatLine.hidden = !what;
	error.hidden = true;
	text.value = line;
	save.textContent = saveLabel;
	skip.textContent = skipLabel;
	close.setAttribute("aria-label", closeLabel);
	close.title = closeLabel;
	save.disabled = !line;
	const chips = reasons.map((reason) => {
		const chip = element("button", "rux-button rux-button--default rux-button--toggle rux-button--sm", reason);
		chip.type = "button";
		chip.setAttribute("aria-pressed", String(reason === line));
		chip.addEventListener("click", () => {
			text.value = reason;
			chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
			save.disabled = false;
			text.focus();
		});
		return chip;
	});
	box.querySelector("[data-update-reasons]").replaceChildren(...chips);
	// A new trip has nothing earlier to list.
	const earlier = box.querySelector("[data-update-earlier]");
	earlier.hidden = !tripId;
	if (tripId) readInto(box.querySelector("[data-update-list]"), box.querySelector("[data-update-status]"), tripId,
		() => !box.hidden);
	window.Rux?.openModal?.(box);
	text.focus();
	text.setSelectionRange(text.value.length, text.value.length);
	return new Promise((resolve) => {
		let result = null;
		const settle = (value) => { result = value; window.Rux?.closeModal?.(box); };
		const clicked = async (event) => {
			if (event.target.closest("[data-update-save]")) {
				if (!text.value.trim()) return;
				save.disabled = true;
				const failed = await onSave(text.value.trim(), settle);
				if (failed) {
					error.textContent = failed;
					error.hidden = false;
					save.disabled = !text.value.trim();
				}
			} else if (event.target.closest("[data-update-skip]")) {
				onSkip(settle);
			}
		};
		box.addEventListener("click", clicked);
		const observer = new MutationObserver(() => {
			if (!box.hidden) return;
			observer.disconnect();
			box.removeEventListener("click", clicked);
			resolve(result);
		});
		observer.observe(box, { attributes: true, attributeFilter: ["hidden"] });
	});
}

export const tripName = (t) => [t?.destination, t?.customer].filter(Boolean).join(" · ") || "New trip";

/* The window from Save. `change` is what `customerChange` named, or null. A
   new trip's box comes filled with Quote sent, a named change's with its own
   line, and any other's empty. */
export function askForUpdate({ change, creating, trip }) {
	const keys = change?.keys ?? null;
	return openWindow({
		trip: tripName(trip),
		what: changeSentence(change, creating),
		line: creating ? "Quote sent" : change?.line ?? "",
		reasons: change ? [change.line, ...UPDATE_REASONS.filter((r) => r !== change.line)] : UPDATE_REASONS,
		tripId: creating ? null : trip?.id,
		saveLabel: "Save with update",
		skipLabel: "Save, no update",
		closeLabel: "Back to the trip, not saved",
		onSave: (body, settle) => settle({ kind: "update", body, keys }),
		onSkip: (settle) => settle(change ? { kind: "nothing", body: change.line, keys } : { kind: "none" }),
	});
}

/* Writes Save's answer once the save has landed. False when it failed, which
   is logged and never undoes the save. */
export async function writeUpdate(tripId, answer) {
	if (!answer || answer.kind === "none") return true;
	try {
		await addTripUpdate(tripId, answer);
		return true;
	} catch (error) {
		console.warn("The update was not written:", error);
		return false;
	}
}

/* ── The card ── */

let cardTrip = null;

// Shows a trip's updates on the card, or, with no id, that a new trip has none yet.
export function showTripUpdates(root, trip) {
	const list = root.querySelector("#tp-update-list");
	const status = root.querySelector("#tp-update-status");
	const add = root.querySelector("#tp-updates-add-btn");
	if (!list || !status) return;
	cardTrip = trip?.id ? trip : null;
	if (add) add.disabled = !cardTrip;
	if (!cardTrip) {
		list.replaceChildren();
		status.hidden = false;
		status.textContent = "Save the trip to add updates.";
		return;
	}
	const id = cardTrip.id;
	readInto(list, status, id, () => cardTrip?.id === id);
}

export function initTripUpdates(root) {
	root.querySelector("#tp-updates-add-btn")?.addEventListener("click", async () => {
		const trip = cardTrip;
		if (!trip) return;
		let added = null;
		await openWindow({
			trip: tripName(trip), what: "", line: "", reasons: UPDATE_REASONS, tripId: trip.id,
			saveLabel: "Add update", skipLabel: "Close", closeLabel: "Close",
			onSave: async (body, settle) => {
				try {
					await addTripUpdate(trip.id, { kind: "update", body });
				} catch (error) {
					console.warn("The update was not added:", error);
					return "The update was not added. Try again.";
				}
				added = body;
				settle(true);
				return null;
			},
			onSkip: (settle) => settle(null),
		});
		if (added === null) return;
		window.Rux?.toast?.("Update added");
		if (cardTrip?.id === trip.id) showTripUpdates(root, trip);
	});
}
