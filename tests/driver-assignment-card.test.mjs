import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
	allElements,
	installDom,
} from "./dom-fixture.mjs";

installDom();

const { renderDriverAssignmentCard } = await import(
	"../js/components/driver-assignment-card.js"
);

function assignment(overrides = {}) {
	return {
		id: "assignment-1",
		startDate: "2026-07-23",
		endDate: "2026-07-26",
		busNumber: "763",
		role: "driver",
		status: "pending",
		trip: {
			customer: "Donna High School",
			trip_type: "round_trip",
		},
		from: "7250 Val Verde Rd, Donna, TX",
		to: "Austin, TX",
		spotTime: "05:15",
		spotLocation: {
			addressLine1: "7250 Val Verde Rd",
			city: "Donna",
			state: "TX",
			postalCode: "78537",
		},
		...overrides,
	};
}

function buttons(card) {
	return card.querySelectorAll("button");
}

function buttonByLabel(card, label) {
	return buttons(card).find((button) => button.dataset.idleLabel === label) || null;
}

function moduleByKey(card, key) {
	return allElements(card).find((node) => node.dataset.module === key) || null;
}

test("card uses semantic headings, sections, buttons, links, and time", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
	}), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
	});
	assert.equal(card.tagName, "ARTICLE");
	assert.ok(card.querySelector("h2"));
	assert.ok(card.querySelectorAll("section").length >= 2);
	assert.ok(card.querySelector("time"));
	assert.ok(card.querySelector("a"));
	assert.ok(buttons(card).every((button) => button.type === "button"));
});

test("every click handler is attached to a keyboard-operable control", () => {
	const card = renderDriverAssignmentCard(assignment({
		documents: [{ id: "1", type: "itinerary", label: "Itinerary", status: "available" }],
	}), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
		onItinerary: () => {},
	});
	const interactive = allElements(card).filter(
		(node) => (node.listeners.get("click") || []).length,
	);
	assert.ok(interactive.length > 0);
	assert.ok(interactive.every((node) => node.tagName === "BUTTON"));
});

test("pending assignment exposes dominant accept and quieter decline controls", () => {
	const card = renderDriverAssignmentCard(assignment(), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
	});
	const accept = buttonByLabel(card, "Accept Assignment");
	const decline = buttonByLabel(card, "Decline");
	assert.ok(accept.classList.contains("rux-button--accent"));
	assert.ok(decline.classList.contains("rux-button--default"));
});

test("header presents a compact date with supporting weekday context", () => {
	const card = renderDriverAssignmentCard(assignment({
		startDate: "2026-07-26",
		endDate: "2026-07-29",
	}));
	assert.equal(
		card.querySelector(".driver-assignment-card__date-primary").textContent,
		"Jul 26–29",
	);
	assert.equal(
		card.querySelector(".driver-assignment-card__date-weekdays").textContent,
		"Sun–Wed",
	);
	assert.equal(card.textContent.includes("SUN, JUL 26"), false);
});

test("accepted assignment presents status without a large green surface", () => {
	const card = renderDriverAssignmentCard(assignment({ status: "accepted" }), {
		onDecline: async () => ({ status: "declined" }),
	});
	assert.equal(card.dataset.status, "accepted");
	assert.ok(card.querySelector(".driver-assignment-card__status--success"));
	assert.equal(buttonByLabel(card, "Accept Assignment"), null);
	assert.ok(buttonByLabel(card, "Unable to drive?").classList.contains("rux-button--ghost"));
});

test("ordinary drivers rely on the header role while relief assignments show handoff detail", () => {
	const standard = renderDriverAssignmentCard(assignment());
	assert.equal(moduleByKey(standard, "role"), null);
	assert.ok(standard.textContent.includes("Driver"));
	assert.equal(standard.textContent.includes("Primary operator"), false);
	assert.equal(standard.textContent.includes("Assigned Bus"), false);
	const relief = renderDriverAssignmentCard(assignment({
		role: "relief-start",
		roleDetails: {
			takeoverTime: "15:45",
			takeoverLocation: "Austin Convention Center",
			relievesDriverName: "Rigoberto Gomez",
		},
	}));
	assert.ok(relief.textContent.includes("Relief Assignment"));
	assert.ok(relief.textContent.includes("Take over from Rigoberto Gomez"));
	assert.ok(relief.textContent.includes("Handoff at 3:45 PM"));
	assert.ok(relief.textContent.includes("Austin Convention Center"));
});

test("trip and spot time render as one departure-focused overview", () => {
	const card = renderDriverAssignmentCard(assignment());
	const overview = moduleByKey(card, "trip-overview");
	assert.ok(overview);
	assert.equal(moduleByKey(card, "trip"), null);
	assert.equal(moduleByKey(card, "spot-time"), null);
	assert.ok(overview.textContent.includes("Donna High School"));
	assert.ok(overview.textContent.includes("5:15 AM"));
	assert.ok(overview.textContent.includes("Navigate"));
});

test("contact and navigation actions have full screen-reader labels", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
	}));
	const labels = card.querySelectorAll("a").map((link) => link.getAttribute("aria-label"));
	assert.ok(labels.includes("Call Anna Partida"));
	assert.ok(labels.some((label) => label?.startsWith("Navigate to 7250 Val Verde Rd")));
});

test("current user is not rendered as external crew", () => {
	const card = renderDriverAssignmentCard(assignment({
		fleetAssignments: [
			{
				busNumber: "763",
				isCurrentBus: true,
				crew: [{ id: "2", name: "Maria Lopez", role: "relief-start" }],
			},
			{
				busNumber: "746",
				crew: [{ id: "3", name: "Jose Garcia", role: "driver" }],
			},
		],
	}));
	assert.equal(card.textContent.includes("Jorge Current User"), false);
	assert.equal(card.textContent.includes("Maria Lopez"), true);
	assert.equal(card.textContent.includes("Jose Garcia"), true);
});

test("explicit current-user crew rows use You instead of repeating a name", () => {
	const card = renderDriverAssignmentCard(assignment({
		fleetAssignments: [{
			busNumber: "763",
			isCurrentBus: true,
			crew: [
				{ id: "current", name: "Jorge Garcia", role: "driver", isCurrentUser: true },
				{ id: "relief", name: "Maria Lopez", role: "relief-start" },
			],
		}],
	}));
	assert.ok(card.textContent.includes("YouDriver"));
	assert.equal(card.textContent.includes("Jorge Garcia"), false);
});

test("fleet disclosure exposes aria-expanded and controlled content", async () => {
	const card = renderDriverAssignmentCard(assignment({
		fleetAssignments: [
			{ busNumber: "763", isCurrentBus: true, crew: [{ name: "A", role: "driver" }] },
			{ busNumber: "746", crew: [{ name: "B", role: "driver" }] },
			{ busNumber: "752", crew: [{ name: "C", role: "driver" }] },
		],
	}));
	const disclosure = allElements(card).find(
		(node) => node.getAttribute("aria-expanded") === "false",
	);
	assert.ok(disclosure.getAttribute("aria-controls"));
	await disclosure.dispatch("click");
	assert.equal(disclosure.getAttribute("aria-expanded"), "true");
});

test("decline confirmation precedes a successful decline", async () => {
	const host = document.createElement("div");
	let confirmationCount = 0;
	let declineCount = 0;
	host.appendChild(renderDriverAssignmentCard(assignment(), {
		onAccept: async () => ({ status: "accepted" }),
		confirmDecline: async () => {
			confirmationCount += 1;
			return true;
		},
		onDecline: async () => {
			declineCount += 1;
			return { status: "declined", declinedAt: "2026-07-22T12:00:00Z" };
		},
	}));
	const decline = buttonByLabel(host, "Decline");
	await decline.dispatch("click");
	assert.equal(confirmationCount, 1);
	assert.equal(declineCount, 1);
	assert.equal(host.childNodes[0].dataset.status, "declined");
});

test("failed accept preserves pending state and exposes an alert", async () => {
	const host = document.createElement("div");
	host.appendChild(renderDriverAssignmentCard(assignment(), {
		onAccept: async () => {
			const error = new Error("offline");
			error.userMessage = "Couldn’t accept. Try again.";
			throw error;
		},
	}));
	const accept = buttonByLabel(host, "Accept Assignment");
	const originalConsoleError = console.error;
	console.error = () => {};
	try {
		await accept.dispatch("click");
	} finally {
		console.error = originalConsoleError;
	}
	const alert = allElements(host).find((node) => node.getAttribute("role") === "alert");
	assert.equal(host.childNodes[0].dataset.status, "pending");
	assert.equal(alert.hidden, false);
	assert.equal(alert.textContent, "Couldn’t accept. Try again.");
	assert.equal(accept.disabled, false);
});

test("driver documents include only itinerary and envelope resources", () => {
	const card = renderDriverAssignmentCard(assignment({
		documents: [
			{ id: "1", type: "itinerary", label: "Itinerary", status: "available" },
			{ id: "2", type: "purchase_order", label: "PO", status: "available" },
			{ id: "3", type: "envelope", label: "Envelope", status: "unavailable", statusLabel: "Not Yet Available" },
		],
	}), {
		onItinerary: () => {},
	});
	assert.ok(allElements(card).some(
		(node) => node.tagName === "BUTTON"
			&& node.classList.contains("driver-assignment-card__document")
			&& node.textContent.includes("Itinerary"),
	));
	const unavailable = allElements(card).find(
		(node) => node.getAttribute("aria-disabled") === "true",
	);
	assert.ok(unavailable.textContent.includes("EnvelopeNot Yet Available"));
	assert.equal(card.textContent.includes("PO"), false);
	assert.ok(card.querySelector(".driver-assignment-card__document-status"));
	assert.ok(card.querySelector(".driver-assignment-card__document-status--unavailable"));
});

test("assignment actions use the generic semantic module-button primitive", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
		fleetAssignments: [
			{
				busId: "bus-763",
				busNumber: "763",
				isCurrentBus: true,
				crew: [
					{
						id: "crew-2",
						name: "Maria Lopez",
						role: "relief_driver",
						phone: "956-555-0112",
						canMessage: true,
					},
				],
			},
			{
				busId: "bus-746",
				busNumber: "746",
				crew: [{ id: "crew-3", name: "Jose Garcia", role: "driver" }],
			},
		],
	}));
	const links = card.querySelectorAll("a");
	const navigate = links.find((link) => link.textContent.includes("Navigate"));
	const call = links.find((link) => link.textContent.includes("Call"));
	const message = links.find((link) => link.textContent.includes("Message"));

	for (const action of [navigate, call, message]) {
		assert.ok(action);
		assert.ok(action.classList.contains("rux-module-button"));
		assert.ok(action.classList.contains("assignment-module__action"));
	}
	assert.ok(navigate.classList.contains("rux-module-button--info"));
	assert.ok(call.classList.contains("rux-module-button--success"));
	assert.ok(message.classList.contains("rux-module-button--neutral"));
});

test("single-bus crew is people-first while multiple buses retain fleet grouping", () => {
	const singleBus = renderDriverAssignmentCard(assignment({
		fleetAssignments: [{
			busNumber: "763",
			isCurrentBus: true,
			crew: [{
				id: "crew-2",
				name: "Maria Lopez",
				role: "relief_driver",
				phone: "956-555-0112",
			}],
		}],
	}));
	const crew = moduleByKey(singleBus, "crew-fleet");
	assert.ok(crew.textContent.includes("Crew"));
	assert.equal(crew.textContent.includes("Crew & Fleet"), false);
	assert.equal(crew.textContent.includes("Bus 763"), false);
	assert.ok(crew.textContent.includes("Relief Driver for your bus"));

	const multiBus = renderDriverAssignmentCard(assignment({
		fleetAssignments: [
			{ busNumber: "763", isCurrentBus: true, crew: [] },
			{ busNumber: "746", crew: [{ id: "crew-3", name: "Jose", role: "driver" }] },
		],
	}));
	const fleet = moduleByKey(multiBus, "crew-fleet");
	assert.ok(fleet.textContent.includes("Crew & Fleet"));
	assert.ok(fleet.textContent.includes("Bus 763"));
	assert.ok(fleet.textContent.includes("Bus 746"));
});

test("generic module buttons expose one fixed layout and every semantic tone", async () => {
	const [controls, tokens] = await Promise.all([
		readFile(new URL("../css/base/controls.css", import.meta.url), "utf8"),
		readFile(new URL("../css/tokens.css", import.meta.url), "utf8"),
	]);

	assert.match(controls, /\.rux-module-button\s*\{/);
	assert.match(controls, /flex-direction:\s*column/);
	assert.match(controls, /width:\s*var\(--rux-module-button-width\)/);
	assert.match(controls, /min-height:\s*var\(--rux-module-button-min-height\)/);
	for (const tone of ["neutral", "info", "success", "warning", "danger"]) {
		assert.match(controls, new RegExp(`\\.rux-module-button--${tone}\\s*\\{`));
	}
	assert.match(tokens, /--rux-module-button-width:\s*112px/);
	assert.match(tokens, /--rux-module-button-min-height:\s*88px/);
});

test("responsive CSS protects narrow layouts and touch targets", async () => {
	const css = await readFile(
		new URL("../css/features/driver-share.css", import.meta.url),
		"utf8",
	);
	assert.match(css, /@media \(max-width: 479px\)/);
	assert.match(css, /overflow-x: hidden/);
	assert.match(css, /--rux-driver-touch-target/);
	assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
	assert.match(css, /:focus-visible/);
	assert.match(css, /\.assignment-module__content:last-child\s*\{\s*grid-column:\s*2\s*\/\s*-1/);
	assert.match(css, /\.assignment-module__action-wrap\s*\{[^}]*justify-self:\s*end/s);
	assert.match(css, /\.driver-assignment-card__crew-member \.rux-module-button\s*\{[^}]*margin-inline-start:\s*auto/s);
});
