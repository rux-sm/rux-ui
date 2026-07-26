/* ==========================================================================
   RUX UI — DRIVER ASSIGNMENT CARD
   Modular renderer shared by the public driver schedule and component demo.
   ========================================================================== */

import {
	assignmentRoleLabel,
	buildAssignmentViewModel,
	formatAssignmentTime,
} from "./driver-assignment-model.js?v=6";

const ICONS = {
	alerts: "warning",
	call: "call",
	contact: "person",
	crew: "groups",
	documents: "description",
	envelope: "mail",
	expand: "expand_more",
	itinerary: "description",
	message: "chat_bubble",
	navigate: "navigation",
	notes: "notes",
	role: "verified",
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

function addressText(location = {}) {
	return [
		location.name,
		location.addressLine1,
		location.addressLine2,
		[location.city, location.state, location.postalCode].filter(Boolean).join(" "),
	].filter(Boolean).join("\n");
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
	const labelNode = button.querySelector(".rux-btn-label");
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
		el("span", "rux-btn-label", label),
	);
	if (onClick) button.addEventListener("click", onClick);
	return button;
}

function createActionLink(label, iconName, href, ariaLabel, tone = "info") {
	const link = el(
		"a",
		`rux-module-button rux-module-button--${tone} assignment-module__action`,
	);
	link.href = href;
	link.setAttribute("aria-label", ariaLabel || label);
	if (!href.startsWith("tel:") && !href.startsWith("sms:")) {
		link.target = "_blank";
		link.rel = "noopener";
	}
	link.append(icon(iconName), el("span", "", label));
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
		`rux-card__section assignment-module assignment-module--${tone}`,
	);
	section.dataset.module = key;
	moduleId += 1;
	const headingId = `assignment-module-${safeId(key)}-${moduleId}`;
	section.setAttribute("aria-labelledby", headingId);
	const labelWrap = el("div", "assignment-module__label-wrap");
	const iconWrap = el("span", "assignment-module__icon");
	iconWrap.appendChild(icon(iconName));
	labelWrap.appendChild(iconWrap);
	const heading = el("h3", "assignment-module__label", label);
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
	const status = el(
		"div",
		`driver-assignment-card__status driver-assignment-card__status--${meta.tone}`,
	);
	status.append(icon(meta.icon), el("span", "", meta.label));
	wrap.appendChild(status);

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
		if (typeof options.onAccept !== "function" && typeof options.onConfirm !== "function") return;
		const accept = createButton("Accept Assignment", {
			iconName: "check_circle",
			variant: "accent",
			className: "driver-assignment-card__accept",
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
		const accepted = view.status === "accepted";
		const decline = createButton(view.status === "accepted" ? "Unable to drive?" : "Decline", {
			variant: accepted ? "ghost" : "default",
			className: `driver-assignment-card__decline${accepted ? " driver-assignment-card__decline--quiet" : ""}`,
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

	if (view.status === "pending") {
		addAccept();
		addDecline();
	} else if (view.status === "accepted") {
		addDecline();
	} else if (view.status === "declined" || view.status === "changes_requested") {
		addAccept();
	}
	if (actions.childElementCount) wrap.appendChild(actions);
	wrap.appendChild(error);
	return wrap;
}

function assignmentHeader(entry, view, options, card) {
	const header = el("header", "driver-assignment-card__header");
	const info = el("div", "driver-assignment-card__identity");
	const titleId = `assignment-${safeId(view.id)}-title`;
	const title = el("h2", "driver-assignment-card__bus", view.busLabel);
	title.id = titleId;
	card.setAttribute("aria-labelledby", titleId);
	info.append(title, el("span", "driver-assignment-card__role-badge", view.roleLabel));
	const date = el("div", "driver-assignment-card__date");
	if (view.datePrimary) {
		date.appendChild(el("p", "driver-assignment-card__date-primary", view.datePrimary));
	}
	if (view.dateWeekdays) {
		date.appendChild(el("p", "driver-assignment-card__date-weekdays", view.dateWeekdays));
	}
	header.append(info, date, createStatus(entry, view, options, card));
	return header;
}

function tripOverviewModule(entry, view) {
	const content = el(
		"div",
		"driver-assignment-card__trip-overview",
	);
	const hasTripSummary = Boolean(
		entry.trip
		|| entry.customerName
		|| entry.from
		|| entry.to
		|| entry.origin
		|| entry.destination,
	);
	if (hasTripSummary) {
		const summary = el("div", "driver-assignment-card__trip-content");
		const route = el("div", "driver-assignment-card__route");
		route.append(
			el("span", "driver-assignment-card__route-place", view.origin),
			icon("arrow_forward", "driver-assignment-card__route-arrow"),
			el("span", "driver-assignment-card__route-place", view.destination),
		);
		summary.append(route, el("span", "driver-assignment-card__trip-type", view.tripType));
		content.appendChild(summary);
	}

	const fullAddress = addressText(view.spotLocation);
	const hasDepartureBriefing = Boolean(view.customerName || view.spotTime || fullAddress);
	if (hasDepartureBriefing) {
		if (hasTripSummary) {
			content.appendChild(el("div", "driver-assignment-card__overview-divider"));
		}
		const departure = el("div", "driver-assignment-card__departure");
		const briefing = el("div", "driver-assignment-card__departure-briefing");
		if (view.customerName) {
			briefing.appendChild(el(
				"p",
				"driver-assignment-card__customer",
				view.customerName,
			));
		}
		if (fullAddress) {
			const location = view.spotLocation || {};
			const address = el("address", "driver-assignment-card__address");
			if (location.name) {
				address.appendChild(el(
					"span",
					"driver-assignment-card__location-name",
					location.name,
				));
			}
			const lines = [
				location.addressLine1,
				location.addressLine2,
				[location.city, location.state, location.postalCode].filter(Boolean).join(" "),
			].filter(Boolean).join("\n");
			if (lines) {
				address.appendChild(el(
					"span",
					"driver-assignment-card__address-lines",
					lines,
				));
			}
			briefing.appendChild(address);
		}
		if (view.spotTime) {
			const spot = el("div", "driver-assignment-card__spot-summary");
			spot.appendChild(el(
				"p",
				"driver-assignment-card__departure-label",
				view.roleLabel === "Relief Driver" ? "Report Time" : "Spot Time",
			));
			const time = el("time", "driver-assignment-card__time", view.spotTime);
			if (entry.spotTime) time.dateTime = String(entry.spotTime);
			spot.appendChild(time);
			briefing.appendChild(spot);
		}
		departure.appendChild(briefing);
		if (fullAddress) {
			const action = createActionLink(
				"Navigate",
				ICONS.navigate,
				mapsUrl(fullAddress),
				`Navigate to ${fullAddress.replace(/\n/g, ", ")}`,
			);
			action.classList.add("driver-assignment-card__overview-action");
			departure.appendChild(action);
		}
		content.appendChild(departure);
	}

	const section = el(
		"section",
		"rux-card__section driver-assignment-card__trip-overview-section",
	);
	section.dataset.module = "trip-overview";
	section.setAttribute("aria-label", "Trip overview");
	section.appendChild(content);
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

function contactModule(view) {
	const contact = view.contact || {};
	const content = el("div", "assignment-module__content");
	if (contact.name) content.appendChild(el("p", "assignment-module__primary", contact.name));
	if (contact.phone) {
		const phone = el("a", "driver-assignment-card__phone", contact.phone);
		phone.href = telUrl(contact.phone);
		phone.setAttribute("aria-label", `Call ${contact.name || "trip contact"} at ${contact.phone}`);
		content.appendChild(phone);
	}
	const action = contact.phone
		? createActionLink(
			"Call",
			ICONS.call,
			telUrl(contact.phone),
			`Call ${contact.name || "trip contact"}`,
			"success",
		)
		: null;
	return createAssignmentModule({
		key: "contact",
		iconName: ICONS.contact,
		label: "Trip Contact",
		content,
		action,
	});
}

function crewMemberRow(member, peopleOnly = false) {
	const row = el("li", "driver-assignment-card__crew-member");
	const identity = el("div", "driver-assignment-card__crew-identity");
	const role = assignmentRoleLabel(member.role);
	identity.append(
		el(
			"span",
			"driver-assignment-card__crew-name",
			member.isCurrentUser ? "You" : member.name || "Crew Member",
		),
		el(
			"span",
			"driver-assignment-card__crew-role",
			peopleOnly ? `${role} for your bus` : role,
		),
	);
	row.appendChild(identity);
	if (member.phone && member.canMessage !== false) {
		row.appendChild(createActionLink(
			"Message",
			ICONS.message,
			smsUrl(member.phone),
			`Message ${member.name || "crew member"}`,
			"neutral",
		));
	}
	return row;
}

function fleetRow(fleet) {
	const row = el("li", "driver-assignment-card__fleet-row");
	const bus = el("div", "driver-assignment-card__fleet-bus");
	bus.append(
		icon("directions_bus"),
		el("span", "", `Bus ${fleet.busNumber || "Unassigned"}`),
	);
	if (fleet.isCurrentBus) {
		bus.appendChild(el("span", "driver-assignment-card__current-bus", "Your Bus"));
	}
	row.appendChild(bus);
	const crew = el("ul", "driver-assignment-card__crew-list");
	(fleet.crew || []).forEach((member) => crew.appendChild(crewMemberRow(member)));
	if (crew.childElementCount) row.appendChild(crew);
	return row;
}

function crewFleetModule(view) {
	const content = el("div", "assignment-module__content");
	const peopleOnly = view.fleetAssignments.length === 1;
	const listId = `fleet-${safeId(view.id)}`;
	let list;
	if (peopleOnly) {
		list = el(
			"ul",
			"driver-assignment-card__crew-list driver-assignment-card__crew-list--people-only",
		);
		list.id = listId;
		(view.fleetAssignments[0]?.crew || []).forEach((member) => {
			list.appendChild(crewMemberRow(member, true));
		});
	} else {
		list = el("ul", "driver-assignment-card__fleet-list");
		list.id = listId;
		view.fleetAssignments.forEach((fleet, index) => {
			const row = fleetRow(fleet);
			if (index > 1) row.hidden = true;
			list.appendChild(row);
		});
	}
	content.appendChild(list);
	if (view.fleetAssignments.length > 2) {
		const totalCrew = view.fleetAssignments.reduce(
			(total, fleet) => total + (fleet.crew?.length || 0),
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
			list.querySelectorAll(":scope > li").forEach((row, index) => {
				if (index > 1) row.hidden = !expanded;
			});
			disclosure.querySelector(".rux-btn-label").textContent = expanded
				? "Show Less Crew"
				: `View All Crew (${totalCrew})`;
		});
		content.appendChild(disclosure);
	}
	return createAssignmentModule({
		key: "crew-fleet",
		iconName: ICONS.crew,
		label: peopleOnly ? "Crew" : "Crew & Fleet",
		content,
	});
}

function alertIcon(severity) {
	if (severity === "critical") return "error";
	if (severity === "warning") return "warning";
	return "info";
}

function alertsModule(alerts) {
	const content = el("div", "assignment-module__content");
	const list = el("ul", "driver-assignment-card__alert-list");
	alerts.forEach((alert) => {
		const row = el(
			"li",
			`driver-assignment-card__alert driver-assignment-card__alert--${alert.severity || "info"}`,
		);
		const text = el("div", "");
		text.appendChild(el("p", "driver-assignment-card__alert-title", alert.title));
		if (alert.description) {
			text.appendChild(el("p", "driver-assignment-card__alert-description", alert.description));
		}
		row.append(icon(alertIcon(alert.severity)), text);
		list.appendChild(row);
	});
	content.appendChild(list);
	const hasCritical = alerts.some((alert) => alert.severity === "critical");
	const hasWarning = alerts.some((alert) => alert.severity === "warning");
	return createAssignmentModule({
		key: "alerts",
		iconName: ICONS.alerts,
		label: "Alerts",
		content,
		tone: hasCritical ? "danger" : (hasWarning ? "warning" : "accent"),
	});
}

function documentAction(document, entry, options) {
	const className = `driver-assignment-card__document${document.status === "unavailable" ? " is-unavailable" : ""}`;
	let control;
	const callback = document.action
		|| (document.type === "itinerary" ? options.onItinerary : null)
		|| (document.type === "envelope" ? options.onEnvelope : null)
		|| options.onDocument;
	if (document.status === "unavailable" || (!document.url && typeof callback !== "function")) {
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
	if (document.statusLabel) {
		const unavailable = document.status === "unavailable";
		control.appendChild(el(
			"span",
			`driver-assignment-card__document-status${unavailable ? " driver-assignment-card__document-status--unavailable" : ""}`,
			document.statusLabel,
		));
	}
	return control;
}

function documentsModule(entry, view, options) {
	const content = el("div", "assignment-module__content");
	const grid = el("div", "driver-assignment-card__documents");
	view.documents.forEach((document) => {
		grid.appendChild(documentAction(document, entry, options));
	});
	content.appendChild(grid);
	return createAssignmentModule({
		key: "documents",
		iconName: ICONS.documents,
		label: "Documents",
		content,
	});
}

function notesModule(view) {
	const content = el("div", "assignment-module__content");
	const notesId = `notes-${safeId(view.id)}`;
	const notes = el("p", "driver-assignment-card__notes", view.notes);
	notes.id = notesId;
	content.appendChild(notes);
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
			disclosure.querySelector(".rux-btn-label").textContent = expanded
				? "Show Less"
				: "View Full Notes";
		});
		content.appendChild(disclosure);
	}
	return createAssignmentModule({
		key: "notes",
		iconName: ICONS.notes,
		label: "Notes",
		content,
	});
}

function renderModule(module, entry, view, options) {
	switch (module.key) {
	case "trip-overview":
		return tripOverviewModule(entry, view);
	case "role":
		return roleModule(entry, view);
	case "crew-fleet":
		return crewFleetModule(view);
	case "contact":
		return contactModule(view);
	case "alerts":
		return alertsModule(module.data);
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
