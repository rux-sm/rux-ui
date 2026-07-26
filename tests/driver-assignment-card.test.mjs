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

test("card uses semantic headings, sections, buttons, links, and time", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
	}), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
	});
	assert.equal(card.tagName, "ARTICLE");
	assert.ok(card.querySelector("h2"));
	assert.ok(card.querySelectorAll("section").length >= 4);
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

test("accepted assignment presents status without a large green surface", () => {
	const card = renderDriverAssignmentCard(assignment({ status: "accepted" }));
	assert.equal(card.dataset.status, "accepted");
	assert.ok(card.querySelector(".driver-assignment-card__status--success"));
	assert.equal(buttonByLabel(card, "Accept Assignment"), null);
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

test("documents render actionable and unavailable resources correctly", () => {
	const card = renderDriverAssignmentCard(assignment({
		documents: [
			{ id: "1", type: "itinerary", label: "Itinerary", status: "available" },
			{ id: "2", type: "roster", label: "Roster", status: "unavailable", statusLabel: "Not Yet Available" },
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
	assert.ok(unavailable.textContent.includes("RosterNot Yet Available"));
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
});
