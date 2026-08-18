/* ==========================================================================
   RUX UI — DRIVER ASSIGNMENT CARD
   Modular renderer shared by the public driver schedule and component demo.
   ========================================================================== */

import {
	assignmentRoleLabel,
	buildAssignmentViewModel,
	formatAssignmentTime,
} from "./driver-assignment-model.js?v=20";

const ICONS = {
	bus: "directions_bus",
	call: "call",
	envelope: "mail",
	expand: "expand_more",
	itinerary: "description",
	message: "chat_bubble",
	navigate: "navigation",
	role: "badge",
};

let moduleId = 0;

function el(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = text;
	return node;
}

function icon(name, className = "") {
	const node = el("span", `rux-icon${className ? ` ${className}` : ""}`, name);
	node.setAttribute("aria-hidden", "true");
	return node;
}

function safeId(value) {
	return String(value || "assignment").replace(/[^a-z0-9_-]/gi, "-");
}

function mapsUrl(address) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function telUrl(phone) {
	return `tel:${String(phone).replace(/[^+\d]/g, "")}`;
}

function smsUrl(phone) {
	return `sms:${String(phone).replace(/[^+\d]/g, "")}`;
}

function statusMeta(status) {
	const statuses = {
		pending: {
			icon: "schedule",
			label: "Awaiting Response",
			tone: "pending",
		},
		accepted: {
			icon: "check_circle",
			label: "Accepted",
			tone: "success",
		},
		declined: {
			icon: "cancel",
			label: "Declined",
			tone: "danger",
		},
		changes_requested: {
			icon: "rate_review",
			label: "Changes Requested",
			tone: "warning",
		},
		cancelled: {
			icon: "event_busy",
			label: "Cancelled",
			tone: "neutral",
		},
	};
	return statuses[status] || statuses.pending;
}

function setButtonLoading(button, loading, label) {
	button.disabled = loading;
	button.classList.toggle("rux-button--loading", loading);
	button.setAttribute("aria-busy", String(loading));
	const labelNode = button.querySelector(".rux-button__label");
	if (labelNode) labelNode.textContent = loading ? label : button.dataset.idleLabel;
}

function createButton(label, {
	iconName,
	variant = "default",
	className = "",
	onClick,
} = {}) {
	const button = el(
		"button",
		`rux-button rux-button--${variant}${className ? ` ${className}` : ""}`,
	);
	button.type = "button";
	button.dataset.idleLabel = label;
	if (iconName) button.appendChild(icon(iconName, "rux-button__idle-icon"));
	button.append(
		el("span", "rux-button__spinner"),
		el("span", "rux-button__label", label),
	);
	if (onClick) button.addEventListener("click", onClick);
	return button;
}

// .rux-module-button (tone-tinted background component) was retired in favor
// of the shared .rux-button variants — no info/success/warning color tones
// exist there, so this flattens onto the closest existing look rather than
// keeping a second button system alive for a handful of link actions.
const ACTION_LINK_TONE_CLASS = {
	neutral: "rux-button--default",
	info:    "rux-button--default",
	success: "rux-button--accent",
	warning: "rux-button--default",
	danger:  "rux-button--ghost rux-button--danger",
};

// Icon-only, same as .rux-module-button was (its __label was visually
// hidden, sr-only) — accessibility comes from aria-label/title below, not a
// visible label span, so this keeps the same footprint these action links
// (Navigate/Text/Call) have always had.
function createActionLink(label, iconName, href, ariaLabel, tone = "info") {
	const toneClass = ACTION_LINK_TONE_CLASS[tone] || ACTION_LINK_TONE_CLASS.info;
	const link = el(
		"a",
		`rux-button ${toneClass} rux-button--icon assignment-module__action`,
	);
	link.href = href;
	link.setAttribute("aria-label", ariaLabel || label);
	if (!href.startsWith("tel:") && !href.startsWith("sms:")) {
		link.target = "_blank";
		link.rel = "noopener";
	}
	link.title = label;
	link.appendChild(icon(iconName));
	return link;
}

function createAssignmentModule({
	key,
	iconName,
	label,
	tone = "neutral",
	content,
	action,
}) {
	const section = el(
		"section",
		`rux-card assignment-module assignment-module--${tone}`,
	);
	section.dataset.module = key;
	moduleId += 1;
	const headingId = `assignment-module-${safeId(key)}-${moduleId}`;
	section.setAttribute("aria-labelledby", headingId);
	const labelWrap = el("div", "assignment-module__label-wrap");
	const iconWrap = el("span", "assignment-module__icon");
	iconWrap.appendChild(icon(iconName));
	labelWrap.appendChild(iconWrap);
	const heading = el("h3", "assignment-module__label rux-u-eyebrow", label);
	heading.id = headingId;
	labelWrap.appendChild(heading);
	section.append(labelWrap, content);
	if (action) {
		const actionWrap = el("div", "assignment-module__action-wrap");
		actionWrap.appendChild(action);
		section.appendChild(actionWrap);
	}
	return section;
}

function createStatus(entry, view, options, card) {
	const wrap = el("div", "driver-assignment-card__response");
	wrap.dataset.status = view.status;
	const meta = statusMeta(view.status);

	if (view.status !== "pending") {
		const state = el(
			"div",
			`driver-assignment-card__response-state driver-assignment-card__response-state--${meta.tone}`,
		);
		state.setAttribute("role", "status");
		state.setAttribute("aria-live", "polite");
		state.append(
			icon(meta.icon, "driver-assignment-card__response-state-icon"),
			el("span", "driver-assignment-card__response-state-label", meta.label),
		);
		wrap.appendChild(state);
		return wrap;
	}

	const canAccept =
		typeof options.onAccept === "function"
		|| typeof options.onConfirm === "function";
	const actions = el("div", "driver-assignment-card__response-actions");
	const error = el("p", "driver-assignment-card__action-error");
	error.hidden = true;
	error.setAttribute("role", "alert");
	error.tabIndex = -1;

	const perform = async (button, loadingLabel, handler, successMessage) => {
		if (typeof handler !== "function") return;
		error.hidden = true;
		setButtonLoading(button, true, loadingLabel);
		try {
			const update = await handler(entry);
			if (update && typeof update === "object") Object.assign(entry, update);
			const replacement = renderDriverAssignmentCard(entry, options);
			card.replaceWith(replacement);
			options.onStatusChange?.(successMessage);
		} catch (actionError) {
			console.error(`Driver assignment action failed:`, actionError);
			setButtonLoading(button, false, loadingLabel);
			error.textContent = actionError?.userMessage
				|| "The assignment could not be updated. Check your connection and try again.";
			error.hidden = false;
			error.focus?.();
		}
	};

	const addAccept = () => {
		if (!canAccept) return;
		const accept = createButton("Accept", {
			iconName: "check_circle",
			variant: "accent",
			className:
				"driver-assignment-card__response-control driver-assignment-card__accept",
		});
		accept.addEventListener("click", () => perform(
			accept,
			"Accepting…",
			options.onAccept || options.onConfirm,
			"Assignment accepted",
		));
		actions.appendChild(accept);
	};

	const addDecline = () => {
		if (typeof options.onDecline !== "function") return;
		const decline = createButton("Decline", {
			variant: "ghost",
			className:
				"rux-button--danger driver-assignment-card__response-control driver-assignment-card__decline",
		});
		decline.addEventListener("click", async () => {
			if (typeof options.confirmDecline === "function") {
				const confirmed = await options.confirmDecline(entry, decline);
				if (!confirmed) return;
			}
			await perform(
				decline,
				"Declining…",
				options.onDecline,
				"Assignment declined",
			);
		});
		actions.appendChild(decline);
	};

	addDecline();
	addAccept();
	if (actions.childElementCount === 1) {
		actions.classList.add("driver-assignment-card__response-actions--single");
	}

	if (actions.childElementCount) {
		wrap.appendChild(actions);
	} else {
		const state = el(
			"div",
			"driver-assignment-card__response-state driver-assignment-card__response-state--pending",
		);
		state.setAttribute("role", "status");
		state.append(
			icon(meta.icon, "driver-assignment-card__response-state-icon"),
			el("span", "driver-assignment-card__response-state-label", meta.label),
		);
		wrap.appendChild(state);
	}
	wrap.appendChild(error);
	return wrap;
}

function assignmentHeader(entry, view, options, card) {
	const header = el("header", "driver-assignment-card__header");
	const titleId = `assignment-${safeId(view.id)}-title`;
	const title = el("h2", "driver-assignment-card__date-range", view.dateRange || "Assignment");
	title.id = titleId;
	card.setAttribute("aria-labelledby", titleId);
	const primary = el("div", "driver-assignment-card__header-primary");
	primary.appendChild(title);
	const destinationGroup = el(
		"div",
		"driver-assignment-card__destination-group",
	);
	const destinationLabel = view.destination || view.origin;
	if (destinationLabel) {
		const destination = el(
			"p",
			"driver-assignment-card__destination",
			destinationLabel,
		);
		destination.setAttribute("aria-label", `Destination: ${destinationLabel}`);
		destination.setAttribute("title", destinationLabel);
		destinationGroup.appendChild(destination);
	}
	if (view.customerName) {
		const customer = el(
			"p",
			"driver-assignment-card__customer",
			view.customerName,
		);
		customer.setAttribute("aria-label", `Customer: ${view.customerName}`);
		customer.setAttribute("title", view.customerName);
		destinationGroup.appendChild(customer);
	}
	if (destinationGroup.childElementCount) primary.appendChild(destinationGroup);
	const metadata = el("div", "driver-assignment-card__header-metadata");
	const busBadge = el(
		"span",
		"rux-badge rux-badge--info rux-badge--module driver-assignment-card__bus-badge",
	);
	busBadge.setAttribute("aria-label", view.busLabel);
	busBadge.append(
		icon(ICONS.bus, "rux-badge__icon"),
		el(
			"span",
			"rux-badge__label",
			view.busLabel.replace(/^Bus\s+/i, ""),
		),
	);
	const roleBadge = el(
		"span",
		"rux-badge rux-badge--info rux-badge--module driver-assignment-card__role-badge",
	);
	roleBadge.setAttribute("aria-label", view.roleLabel);
	roleBadge.append(
		icon(ICONS.role, "rux-badge__icon"),
		el("span", "rux-badge__label", view.roleLabel),
	);
	metadata.append(busBadge, roleBadge);
	const summary = el("div", "driver-assignment-card__header-summary");
	summary.append(primary, metadata);
	header.appendChild(summary);
	header.appendChild(createStatus(entry, view, options, card));
	return header;
}

function spotLocationModule(entry, view) {
	const location = view.spotLocation || {};
	const addressLines = [
		location.addressLine1,
		location.addressLine2,
		[location.city, location.state, location.postalCode].filter(Boolean).join(" "),
	].filter(Boolean).join("\n");
	const visibleAddress = addressLines || location.name || view.customerName;
	const navigationTarget = [location.name, addressLines].filter(Boolean).join("\n")
		|| view.customerName;
	const section = el(
		"section",
		"rux-card driver-assignment-card__reporting-section",
	);
	section.dataset.module = "spot-location";
	section.setAttribute(
		"aria-label",
		view.contact?.name || view.contact?.phone
			? "Reporting details and trip contact"
			: "Reporting details",
	);
	const reportingRow = el(
		"div",
		"assignment-compact-module driver-assignment-card__reporting-row",
	);
	const details = el(
		"div",
		"assignment-compact-module__details driver-assignment-card__reporting-details",
	);
	if (visibleAddress) {
		const address = el(
			"address",
			"assignment-compact-module__secondary driver-assignment-card__spot-address",
			visibleAddress.replace(/\n/g, ", "),
		);
		address.setAttribute(
			"aria-label",
			`Spot location: ${visibleAddress.replace(/\n/g, ", ")}`,
		);
		details.appendChild(address);
	}
	if (view.spotTime) {
		const time = el("time", "driver-assignment-card__time", view.spotTime);
		if (entry.spotTime) time.dateTime = String(entry.spotTime);
		const timeLabel = view.roleLabel === "Relief Driver" ? "Report time" : "Spot time";
		time.setAttribute("aria-label", `${timeLabel}: ${view.spotTime}`);
		details.appendChild(time);
	}
	if (details.childElementCount) reportingRow.appendChild(details);
	if (navigationTarget) {
		const actions = el("div", "assignment-compact-module__actions");
		actions.appendChild(createActionLink(
			"Navigate",
			ICONS.navigate,
			mapsUrl(navigationTarget),
			`Navigate to ${navigationTarget.replace(/\n/g, ", ")}`,
		));
		reportingRow.classList.add("assignment-compact-module--actions");
		reportingRow.appendChild(actions);
	}
	if (reportingRow.childElementCount) section.appendChild(reportingRow);
	const contact = contactRow(view);
	if (contact) section.appendChild(contact);
	return section;
}

function roleModule(entry, view) {
	const content = el("div", "assignment-module__content");
	const isRelief = view.roleLabel === "Relief Driver";
	if (view.roleDetails.relievesDriverName) {
		content.appendChild(el(
			"p",
			"driver-assignment-card__role-context",
			`Take over from ${view.roleDetails.relievesDriverName}`,
		));
	}
	if (view.roleDetails.takeoverTime) {
		content.appendChild(el(
			"p",
			"driver-assignment-card__role-context",
			`Handoff at ${view.roleDetails.takeoverTime}`,
		));
	}
	if (view.roleDetails.takeoverLocation) {
		content.appendChild(el(
			"p",
			"driver-assignment-card__role-location",
			view.roleDetails.takeoverLocation,
		));
	}
	if (
		isRelief
		&& !view.roleDetails.relievesDriverName
		&& !view.roleDetails.takeoverTime
		&& !view.roleDetails.takeoverLocation
		&& !view.roleDetails.instructions
	) {
		content.appendChild(el(
			"p",
			"driver-assignment-card__role-context",
			"Relief assignment details will be provided by dispatch.",
		));
	}
	if (view.roleDetails.instructions) {
		content.appendChild(el(
			"p",
			"driver-assignment-card__role-instructions",
			view.roleDetails.instructions,
		));
	}
	return createAssignmentModule({
		key: "role",
		iconName: ICONS.role,
		label: isRelief ? "Relief Assignment" : "Role Details",
		content,
		tone: isRelief ? "accent" : "neutral",
	});
}

function contactRow(view) {
	const contact = view.contact || {};
	if (!contact.name && !contact.phone) return null;
	const row = el(
		"div",
		"assignment-compact-module driver-assignment-card__reporting-contact",
	);
	row.setAttribute("aria-label", "Trip contact");
	const details = el("div", "assignment-compact-module__details");
	details.appendChild(el("p", "assignment-module__label rux-u-eyebrow", "Trip Contact"));
	const identity = el("div", "assignment-compact-module__body");
	if (contact.name || contact.phone) {
		const contactLine = el(
			"p",
			"assignment-compact-module__primary driver-assignment-card__contact-line",
		);
		if (contact.name) {
			contactLine.appendChild(el(
				"span",
				"driver-assignment-card__contact-name",
				contact.name,
			));
		}
		if (contact.phone) {
			contactLine.appendChild(el(
				"span",
				"driver-assignment-card__contact-phone",
				contact.phone,
			));
		}
		identity.appendChild(contactLine);
	}
	if (identity.childElementCount) details.appendChild(identity);
	row.appendChild(details);
	const actions = el("div", "assignment-compact-module__actions");
	if (contact.phone && contact.canMessage !== false) {
		actions.appendChild(createActionLink(
			"Text",
			ICONS.message,
			smsUrl(contact.phone),
			`Text ${contact.name || "trip contact"}`,
			"neutral",
		));
	}
	if (contact.phone && contact.canCall !== false) {
		actions.appendChild(createActionLink(
			"Call",
			ICONS.call,
			telUrl(contact.phone),
			`Call ${contact.name || "trip contact"}`,
			"success",
		));
	}
	if (actions.childElementCount) {
		row.classList.add("assignment-compact-module--actions");
		row.appendChild(actions);
	}
	return row;
}

function crewMemberRow(member) {
	const row = el("li", "driver-assignment-card__crew-member");
	const identity = el("div", "driver-assignment-card__crew-identity");
	const role = assignmentRoleLabel(member.role);
	const name = member.isCurrentUser ? "You" : member.name || "Crew Member";
	const body = el("div", "assignment-compact-module__body");
	body.appendChild(el(
		"p",
		"assignment-compact-module__primary driver-assignment-card__crew-name",
		name,
	));
	body.appendChild(el(
		"p",
		"assignment-compact-module__secondary driver-assignment-card__crew-role",
		role,
	));
	identity.appendChild(body);
	row.appendChild(identity);
	const actions = el(
		"div",
		"assignment-compact-module__actions driver-assignment-card__crew-actions",
	);
	if (member.phone && member.canMessage !== false) {
		actions.appendChild(createActionLink(
			"Message",
			ICONS.message,
			smsUrl(member.phone),
			`Message ${member.name || "crew member"}`,
			"neutral",
		));
	}
	if (member.phone && member.canCall !== false) {
		actions.appendChild(createActionLink(
			"Call",
			ICONS.call,
			telUrl(member.phone),
			`Call ${member.name || "crew member"}`,
			"success",
		));
	}
	if (actions.childElementCount) {
		row.classList.add("assignment-compact-module--actions");
		row.appendChild(actions);
	}
	return row;
}

function crewBusSection(fleet, fleetIndex, assignmentId) {
	const isCurrentBus = Boolean(fleet.isCurrentBus || fleetIndex === 0);
	const section = el(
		"section",
		"rux-card driver-assignment-card__crew-bus-section",
	);
	const headingId = `crew-${safeId(assignmentId)}-${safeId(fleet.busNumber || fleetIndex)}`;
	const heading = el(
		"h3",
		"assignment-module__label rux-u-eyebrow driver-assignment-card__crew-bus-heading",
		isCurrentBus ? "Your Bus" : `Bus ${fleet.busNumber || "Unassigned"}`,
	);
	heading.id = headingId;
	section.setAttribute("aria-labelledby", headingId);
	section.dataset.busNumber = fleet.busNumber || "";
	if (isCurrentBus) section.dataset.currentBus = "true";
	const crew = el("ul", "driver-assignment-card__crew-list");
	fleet.crew.forEach((member) => {
		crew.appendChild(crewMemberRow(member));
	});
	section.append(heading, crew);
	return section;
}

function crewFleetModule(view) {
	const listId = `fleet-${safeId(view.id)}`;
	const group = el("div", "driver-assignment-card__crew-fleet-group");
	group.dataset.module = "crew-fleet";
	group.setAttribute("aria-label", "Crew by bus");
	const list = el("div", "driver-assignment-card__crew-bus-list");
	list.id = listId;
	const populatedFleets = view.fleetAssignments
		.map((fleet, index) => ({ fleet, index }))
		.filter(({ fleet }) => fleet.crew?.length);
	const busSections = [];
	populatedFleets.forEach(({ fleet, index }, renderedIndex) => {
		const busSection = crewBusSection(fleet, index, view.id);
		if (renderedIndex > 1) busSection.hidden = true;
		busSections.push(busSection);
		list.appendChild(busSection);
	});
	group.appendChild(list);
	if (populatedFleets.length > 2) {
		const totalCrew = populatedFleets.reduce(
			(total, { fleet }) => total + fleet.crew.length,
			0,
		);
		const disclosure = createButton(`View All Crew (${totalCrew})`, {
			iconName: ICONS.expand,
			variant: "ghost",
			className: "driver-assignment-card__disclosure",
		});
		disclosure.setAttribute("aria-expanded", "false");
		disclosure.setAttribute("aria-controls", listId);
		disclosure.querySelector(".rux-button__idle-icon")?.classList.add("rux-button__disclosure-icon");
		disclosure.addEventListener("click", () => {
			const expanded = disclosure.getAttribute("aria-expanded") !== "true";
			disclosure.setAttribute("aria-expanded", String(expanded));
			busSections.forEach((busSection, index) => {
				if (index > 1) busSection.hidden = !expanded;
			});
			disclosure.querySelector(".rux-button__label").textContent = expanded
				? "Show Less Crew"
				: `View All Crew (${totalCrew})`;
		});
		const disclosureSection = el(
			"div",
			"rux-card driver-assignment-card__crew-disclosure-section",
		);
		disclosureSection.appendChild(disclosure);
		group.appendChild(disclosureSection);
	}
	return group;
}

function documentAction(document, entry, options) {
	const unavailable = document.status === "unavailable";
	const attentionNeeded = document.status === "required"
		|| document.status === "attention";
	const className = [
		"driver-assignment-card__document",
		unavailable ? "is-unavailable" : "",
		attentionNeeded ? "is-attention-needed" : "",
	].filter(Boolean).join(" ");
	let control;
	const callback = document.action
		|| (document.type === "itinerary" ? options.onItinerary : null)
		|| (document.type === "envelope" ? options.onEnvelope : null)
		|| options.onDocument;
	if (unavailable || (!document.url && typeof callback !== "function")) {
		control = el("div", className);
		control.setAttribute("aria-disabled", "true");
	} else if (document.url && typeof callback !== "function") {
		control = el("a", className);
		control.href = document.url;
		control.target = "_blank";
		control.rel = "noopener";
	} else {
		control = el("button", className);
		control.type = "button";
		control.addEventListener("click", () => callback(entry, document, control));
	}
	control.append(
		icon(document.icon || (document.type === "envelope" ? ICONS.envelope : ICONS.itinerary)),
		el("span", "driver-assignment-card__document-label", document.label),
	);
	if (document.statusLabel) control.title = document.statusLabel;
	return control;
}

function documentsModule(entry, view, options) {
	const section = el(
		"section",
		"rux-card driver-assignment-card__documents-section",
	);
	section.dataset.module = "documents";
	section.setAttribute("aria-label", "Documents");
	const grid = el("div", "driver-assignment-card__documents");
	view.documents.forEach((document) => {
		grid.appendChild(documentAction(document, entry, options));
	});
	section.appendChild(grid);
	return section;
}

function notesModule(view) {
	const section = el(
		"section",
		"rux-card driver-assignment-card__notes-section",
	);
	section.dataset.module = "notes";
	section.setAttribute("aria-label", "Notes");
	section.appendChild(el("p", "assignment-module__label rux-u-eyebrow", "Notes"));
	const notesId = `notes-${safeId(view.id)}`;
	const notes = el("p", "driver-assignment-card__notes", view.notes);
	notes.id = notesId;
	section.appendChild(notes);
	if (view.notes.length > 240) {
		notes.classList.add("is-collapsed");
		const disclosure = createButton("View Full Notes", {
			iconName: ICONS.expand,
			variant: "ghost",
			className: "driver-assignment-card__disclosure",
		});
		disclosure.setAttribute("aria-expanded", "false");
		disclosure.setAttribute("aria-controls", notesId);
		disclosure.querySelector(".rux-button__idle-icon")?.classList.add("rux-button__disclosure-icon");
		disclosure.addEventListener("click", () => {
			const expanded = disclosure.getAttribute("aria-expanded") !== "true";
			disclosure.setAttribute("aria-expanded", String(expanded));
			notes.classList.toggle("is-collapsed", !expanded);
			disclosure.querySelector(".rux-button__label").textContent = expanded
				? "Show Less"
				: "View Full Notes";
		});
		section.appendChild(disclosure);
	}
	return section;
}

function renderModule(module, entry, view, options) {
	switch (module.key) {
	case "spot-location":
		return spotLocationModule(entry, view);
	case "role":
		return roleModule(entry, view);
	case "crew-fleet":
		return crewFleetModule(view);
	case "documents":
		return documentsModule(entry, view, options);
	case "notes":
		return notesModule(view);
	default:
		return null;
	}
}

export function renderDriverAssignmentCard(entry, options = {}) {
	const view = buildAssignmentViewModel(entry);
	const card = el(
		"article",
		`rux-card driver-assignment-card${options.className ? ` ${options.className}` : ""}`,
	);
	card.dataset.assignmentId = view.id;
	card.dataset.status = view.status;
	card.appendChild(assignmentHeader(entry, view, options, card));
	view.modules.forEach((module) => {
		const rendered = renderModule(module, entry, view, options);
		if (rendered) card.appendChild(rendered);
	});
	return card;
}

export {
	buildAssignmentViewModel,
	formatAssignmentTime,
};

export default renderDriverAssignmentCard;
