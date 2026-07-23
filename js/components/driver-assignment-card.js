/* ==========================================================================
   RUX UI — DRIVER ASSIGNMENT CARD
   --------------------------------------------------------------------------
   Shared renderer used by the public driver schedule and component demo.

   API
   ---
   renderDriverAssignmentCard(entry, { onItinerary, onEnvelope })
   ========================================================================== */

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = text;
	return node;
}

function parseIsoDate(value) {
	if (!value) return null;
	const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fmtDate(value, options = {}) {
	const date = value instanceof Date ? value : parseIsoDate(value);
	if (!date) return "";
	return date.toLocaleDateString("en-US", {
		weekday: options.weekday === false ? undefined : "long",
		month: "short",
		day: "numeric",
		year: options.year ? "numeric" : undefined,
	});
}

function fmtTime(value) {
	if (!value) return "—";
	const text = String(value).trim();
	if (/[ap]m$/i.test(text)) return text.toUpperCase();
	const match = text.match(/^(\d{1,2}):(\d{2})/);
	if (!match) return text;
	let hour = Number(match[1]);
	const suffix = hour < 12 ? "AM" : "PM";
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${match[2]} ${suffix}`;
}

function roleLabel(role) {
	if (role === "co-driver") return "Co-Driver";
	if (role === "relief-start" || role === "relief-end") return "Relief Driver";
	return "Driver";
}

function isReliefRole(role) {
	return role === "relief-start" || role === "relief-end";
}

function shortLocation(value) {
	const text = String(value || "").trim();
	if (!text) return "";
	const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
	if (parts.length < 2) return text;
	if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
	if (parts.length > 1 && /^(texas|tx|oklahoma|ok)(\s+\d{5}(?:-\d{4})?)?$/i.test(parts.at(-1))) {
		parts.pop();
	}
	return parts.at(-1) || text;
}

function mapsUrl(address) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function telUrl(phone) {
	return `tel:${String(phone).replace(/[^+\d]/g, "")}`;
}

function iconButton(icon, href, ariaLabel, variant) {
	const link = document.createElement("a");
	link.className = `driver-assignment-card__icon-btn driver-assignment-card__icon-btn--${variant}`;
	link.href = href;
	link.setAttribute("aria-label", ariaLabel);
	if (!href.startsWith("tel:")) {
		link.target = "_blank";
		link.rel = "noopener";
	}
	link.appendChild(el("span", "rux-icon", icon));
	return link;
}

function contactIdentity(name, phone) {
	const identity = el("p", "driver-assignment-card__contact-identity");
	if (name) identity.appendChild(el("span", "driver-assignment-card__contact-name", name));
	if (phone) identity.appendChild(el("span", "driver-assignment-card__contact-phone", phone));
	return identity;
}

function contactSection(label, name, phone) {
	if (!name && !phone) return null;
	const section = el("div", "rux-card__section driver-assignment-card__contact-section");
	section.appendChild(el("span", "driver-assignment-card__section-label", label));
	const row = el("div", "driver-assignment-card__contact-row");
	const text = el("div", "driver-assignment-card__contact-text");
	text.appendChild(contactIdentity(name, phone));
	row.appendChild(text);
	if (phone) row.appendChild(iconButton("call", telUrl(phone), `Call ${name || label}`, "call"));
	section.appendChild(row);
	return section;
}

function actionButton(label, icon, callback) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "rux-button rux-button--default rux-button--block";
	button.innerHTML = `<span class="rux-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
	button.addEventListener("click", callback);
	return button;
}

// Unaccepted: the one accent action on the card — Itinerary/Envelope below
// are reference actions a driver reaches for as needed, not something to
// compete with confirming for attention.
// Confirmed: stays confirmed regardless of later trip edits (see
// trip-driver-confirmation-patch.sql) — confirmationStale just flags that
// something changed since, with a quiet way to re-confirm against the
// current version instead of losing the original confirmation outright.
function confirmSection(entry, options) {
	if (typeof options.onConfirm !== "function") return null;
	const section = el("div", "rux-card__section driver-assignment-card__confirm-section");
	if (!entry.confirmedAt) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "rux-button rux-button--accent rux-button--block";
		button.innerHTML = `<span class="rux-icon" aria-hidden="true">check_circle</span><span>Accept Assignment</span>`;
		button.addEventListener("click", () => options.onConfirm(entry, button));
		section.appendChild(button);
		return section;
	}
	const status = el(
		"div",
		`driver-assignment-card__confirm-status${entry.confirmationStale ? " is-stale" : ""}`,
	);
	const acceptedByDriver = entry.confirmedSource !== "dispatcher";
	const statusText = entry.confirmationStale
		? `${acceptedByDriver ? "Accepted" : "Confirmed"} · trip updated since`
		: (acceptedByDriver ? "Assignment accepted" : "Confirmed by dispatch");
	status.append(
		el("span", "rux-icon", entry.confirmationStale ? "update" : "check_circle"),
		el("span", "", statusText),
	);
	section.appendChild(status);
	if (entry.confirmationStale) {
		const reconfirm = document.createElement("button");
		reconfirm.type = "button";
		reconfirm.className = "rux-button rux-button--default rux-button--sm driver-assignment-card__reconfirm";
		reconfirm.textContent = "Review & accept";
		reconfirm.addEventListener("click", () => options.onConfirm(entry, reconfirm));
		section.appendChild(reconfirm);
	}
	return section;
}

export function renderDriverAssignmentCard(entry, options = {}) {
	const card = el("article", "rux-card driver-assignment-card");
	const trip = entry.trip || {};
	const contact = entry.contact || {};

	const header = el("header", "rux-card__header driver-assignment-card__header");
	const dateText = entry.startDate === entry.endDate
		? fmtDate(entry.startDate)
		: `${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate, { weekday: false })}`;
	header.append(
		el("span", "driver-assignment-card__date", dateText),
		el("span", "driver-assignment-card__bus", `Bus ${entry.busNumber ?? "Unassigned"}`),
	);
	card.appendChild(header);

	const confirm = confirmSection(entry, options);
	if (confirm) card.appendChild(confirm);

	const routeSection = el("div", "rux-card__section driver-assignment-card__route-section");
	routeSection.appendChild(el(
		"p",
		"driver-assignment-card__route",
		`${shortLocation(entry.from) || "Pickup"} → ${shortLocation(entry.to) || "Destination"}`,
	));
	if (trip.customer) routeSection.appendChild(el("p", "driver-assignment-card__client", trip.customer));
	if (contact.name || contact.phone) {
		routeSection.appendChild(el("span", "driver-assignment-card__section-label", "Trip Contact"));
		const row = el("div", "driver-assignment-card__contact-row driver-assignment-card__contact-row--inline");
		const text = el("div", "driver-assignment-card__contact-text");
		text.appendChild(contactIdentity(contact.name, contact.phone));
		row.appendChild(text);
		if (contact.phone) {
			row.appendChild(iconButton("call", telUrl(contact.phone), `Call ${contact.name || "trip contact"}`, "call"));
		}
		routeSection.appendChild(row);
	}
	card.appendChild(routeSection);

	const relief = isReliefRole(entry.role);
	const timeLabelParts = [relief ? "Swap Time" : "Spot Time", roleLabel(entry.role)];
	if (trip.trip_type === "dropoff_pickup") {
		timeLabelParts.push(entry.leg === "return" ? "Inbound" : "Outbound");
	}
	const hasAddress = entry.from && entry.from !== "Pickup not provided";
	const timeSection = el(
		"div",
		`rux-card__section driver-assignment-card__time-section${relief && !entry.roleReportTime ? " is-missing" : ""}`,
	);
	const timeRow = el("div", "driver-assignment-card__time-row");
	const timeText = el("div", "driver-assignment-card__contact-text");
	timeText.append(
		el("span", "driver-assignment-card__section-label", timeLabelParts.join(" · ")),
		el(
			"p",
			"driver-assignment-card__time",
			relief ? (entry.roleReportTime ? fmtTime(entry.roleReportTime) : "Not set") : fmtTime(entry.spotTime),
		),
	);
	if (hasAddress) timeText.appendChild(el("p", "driver-assignment-card__address", entry.from));
	timeRow.appendChild(timeText);
	if (hasAddress) timeRow.appendChild(iconButton("navigation", mapsUrl(entry.from), "Open in Maps", "maps"));
	timeSection.appendChild(timeRow);
	card.appendChild(timeSection);

	for (const member of entry.crew || []) {
		const crewSection = contactSection(
			roleLabel(member.role),
			member.drivers?.name || member.name,
			member.drivers?.phone || member.phone,
		);
		if (crewSection) card.appendChild(crewSection);
	}

	if (entry.instructions) {
		const note = el("div", "rux-card__section driver-assignment-card__note-section");
		note.appendChild(el("span", "driver-assignment-card__section-label", "Notes"));
		const noteBody = el("p", "driver-assignment-card__note");
		noteBody.append(el("span", "rux-icon", "info"), document.createTextNode(entry.instructions));
		note.appendChild(noteBody);
		card.appendChild(note);
	}

	const actions = el("footer", "rux-card__footer driver-assignment-card__actions");
	if (entry.itineraryUrl && typeof options.onItinerary === "function") {
		actions.appendChild(actionButton(
			"View Itinerary",
			"description",
			() => options.onItinerary(entry),
		));
	}
	if (typeof options.onEnvelope === "function") {
		actions.appendChild(actionButton(
			"View Envelope",
			"mail",
			() => options.onEnvelope(entry),
		));
	}
	if (actions.childElementCount) card.appendChild(actions);

	return card;
}

export default renderDriverAssignmentCard;
