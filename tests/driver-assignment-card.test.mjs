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
	assert.ok(card.querySelectorAll("section").length >= 1);
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
	const accept = buttonByLabel(card, "Accept");
	const decline = buttonByLabel(card, "Decline");
	assert.ok(accept.classList.contains("rux-button--accent"));
	assert.ok(decline.classList.contains("rux-button--default"));
	assert.ok(decline.classList.contains("rux-button--danger"));
	const actions = card.querySelector(".driver-assignment-card__response-actions");
	assert.equal(actions.childNodes[0], decline);
	assert.equal(actions.childNodes[1], accept);
});

test("header presents the full date range as its own top row", () => {
	const card = renderDriverAssignmentCard(assignment({
		startDate: "2026-07-26",
		endDate: "2026-07-29",
	}));
	assert.equal(
		card.querySelector(".driver-assignment-card__date-range").textContent,
		"SUNDAY, JUL 26 – JUL 29",
	);
	assert.equal(card.querySelector(".driver-assignment-card__date-weekdays"), null);
});

test("header places the assigned bus at top right and role with route metadata", () => {
	const card = renderDriverAssignmentCard(assignment());
	assert.equal(card.querySelector(".driver-assignment-card__bus-badge").textContent, "Bus 763");
	const metadata = card.querySelector(".driver-assignment-card__header-metadata");
	assert.ok(metadata.textContent.includes("Round-Trip"));
	assert.ok(metadata.textContent.includes("Driver"));
});

test("header combines assignment identity, route, and response details", () => {
	const card = renderDriverAssignmentCard(assignment(), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
	});
	const header = card.querySelector(".driver-assignment-card__header");
	const route = card.querySelector(".driver-assignment-card__header-route");
	const response = card.querySelector(".driver-assignment-card__response");
	assert.ok(route.textContent.includes("Donna, TX"));
	assert.ok(route.textContent.includes("Austin, TX"));
	assert.ok(route.textContent.includes("Round-Trip"));
	assert.equal(moduleByKey(card, "departure-summary"), null);
	assert.ok(header.childNodes.includes(response));
});

test("accepted assignment presents status without a large green surface", () => {
	const card = renderDriverAssignmentCard(assignment({ status: "accepted" }), {
		onDecline: async () => ({ status: "declined" }),
	});
	assert.equal(card.dataset.status, "accepted");
	assert.ok(card.querySelector(".driver-assignment-card__status--success"));
	assert.equal(buttonByLabel(card, "Accept"), null);
	assert.ok(buttonByLabel(card, "Unable to drive?").classList.contains("rux-button--ghost"));
});

test("ordinary drivers use header badges while relief assignments show handoff detail", () => {
	const standard = renderDriverAssignmentCard(assignment());
	assert.equal(moduleByKey(standard, "role"), null);
	assert.ok(standard.textContent.includes("Driver"));
	assert.equal(standard.textContent.includes("Primary operator"), false);
	assert.equal(standard.querySelector(".driver-assignment-card__bus-badge").textContent, "Bus 763");
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

test("header route is followed by spot time and spot location", () => {
	const card = renderDriverAssignmentCard(assignment());
	const route = card.querySelector(".driver-assignment-card__header-route");
	const spotLocation = moduleByKey(card, "spot-location");
	assert.ok(route);
	assert.ok(spotLocation);
	assert.equal(moduleByKey(card, "trip"), null);
	assert.equal(moduleByKey(card, "trip-overview"), null);
	assert.equal(moduleByKey(card, "spot-time"), null);
	assert.ok(route.textContent.includes("Donna, TX"));
	assert.ok(route.textContent.includes("Austin, TX"));
	assert.ok(route.textContent.includes("Round-Trip"));
	assert.equal(route.textContent.includes("5:15 AM"), false);
	assert.ok(spotLocation.textContent.includes("Spot Time"));
	assert.ok(spotLocation.textContent.includes("5:15 AM"));
	assert.ok(spotLocation.textContent.includes("Donna High School"));
	assert.ok(spotLocation.textContent.includes("Navigate"));
	const spotDetails = spotLocation.querySelector(".assignment-compact-module__details");
	assert.ok(spotDetails.childNodes[0].classList.contains("driver-assignment-card__spot-time"));
	assert.equal(spotDetails.childNodes[1].textContent, "Spot Location");
	assert.equal(spotLocation.textContent.includes("Austin"), false);
	assert.equal(spotLocation.textContent.includes("Round-Trip"), false);
});

test("contact and navigation actions have full screen-reader labels", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
	}));
	const labels = card.querySelectorAll("a").map((link) => link.getAttribute("aria-label"));
	assert.ok(labels.includes("Call Anna Partida"));
	assert.ok(labels.includes("Text Anna Partida"));
	assert.ok(labels.some((label) => label?.includes("7250 Val Verde Rd")));
});

test("trip contact follows spot time and alerts are omitted", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
		alerts: [{ id: "warning", severity: "warning", title: "Hotel Required" }],
	}));
	const modules = allElements(card)
		.filter((node) => node.dataset.module)
		.map((node) => node.dataset.module);
	assert.deepEqual(modules.slice(0, 2), ["spot-location", "contact"]);
	assert.equal(modules.includes("alerts"), false);
	assert.equal(card.textContent.includes("Hotel Required"), false);
	const contact = moduleByKey(card, "contact");
	assert.equal(contact.querySelector(".assignment-module__label-wrap"), null);
	assert.ok(contact.querySelector(".assignment-compact-module__body"));
	assert.equal(
		contact.querySelector(".driver-assignment-card__phone").parentNode
			.querySelector(".assignment-compact-module__primary").textContent,
		"Anna Partida",
	);
	assert.deepEqual(
		contact.querySelector(".assignment-compact-module__actions").childNodes.map(
			(action) => action.getAttribute("aria-label"),
		),
		["Text Anna Partida", "Call Anna Partida"],
	);
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
	assert.ok(card.textContent.includes("DriverYou"));
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
	const accept = buttonByLabel(host, "Accept");
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
	assert.ok(unavailable.textContent.includes("Envelope"));
	assert.equal(unavailable.textContent.includes("Not Yet Available"), false);
	assert.equal(unavailable.title, "Not Yet Available");
	assert.equal(card.textContent.includes("PO"), false);
	assert.equal(card.textContent.includes("Documents"), false);
	assert.equal(card.textContent.includes("Not Yet Available"), false);
	assert.equal(card.querySelector(".driver-assignment-card__document-status"), null);
	assert.equal(moduleByKey(card, "documents").querySelector(".assignment-module__label"), null);
});

test("notes precede the headerless document actions at the end of the card", () => {
	const card = renderDriverAssignmentCard(assignment({
		notes: "Meet the relief driver at the Pilot Travel Center.",
		documents: [
			{ id: "1", type: "itinerary", label: "Itinerary", status: "available" },
			{ id: "2", type: "envelope", label: "Envelope", status: "available" },
		],
	}), {
		onItinerary: () => {},
		onEnvelope: () => {},
	});
	const modules = allElements(card)
		.filter((node) => node.dataset.module)
		.map((node) => node.dataset.module);
	assert.deepEqual(modules.slice(-2), ["notes", "documents"]);
	assert.equal(moduleByKey(card, "notes").querySelector(".assignment-module__label").textContent, "Notes");
	assert.equal(moduleByKey(card, "documents").getAttribute("aria-label"), "Documents");
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

test("crew and fleet uses compact bus-person rows", () => {
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
	assert.equal(crew.textContent.includes("Crew & Fleet"), false);
	assert.equal(crew.textContent.includes("Bus 763"), false);
	assert.ok(crew.textContent.includes("Maria Lopez"));
	assert.ok(crew.textContent.includes("Relief Driver"));
	assert.ok(crew.textContent.includes("956-555-0112"));
	assert.equal(crew.querySelector(".assignment-module__label-wrap"), null);
	const crewActions = crew.querySelector(".driver-assignment-card__crew-actions");
	const crewActionLabels = crewActions.childNodes.map(
		(action) => action.getAttribute("aria-label"),
	);
	assert.deepEqual(crewActionLabels, ["Message Maria Lopez", "Call Maria Lopez"]);

	const multiBus = renderDriverAssignmentCard(assignment({
		fleetAssignments: [
			{
				busNumber: "763",
				isCurrentBus: true,
				crew: [{
					id: "crew-2",
					name: "Miguel Torres",
					role: "co-driver",
					phone: "111-333-4444",
				}],
			},
			{
				busNumber: "746",
				crew: [
					{
						id: "crew-3",
						name: "James Cole",
						role: "driver",
						phone: "909-111-1111",
					},
					{
						id: "crew-4",
						name: "Jose Garcia",
						role: "driver",
						phone: "909-222-2222",
					},
				],
			},
		],
	}));
	const fleet = moduleByKey(multiBus, "crew-fleet");
	assert.equal(fleet.textContent.includes("Crew & Fleet"), false);
	assert.equal(fleet.textContent.includes("Bus 763"), false);
	assert.ok(fleet.textContent.includes("Bus 746"));
	assert.ok(fleet.textContent.includes("Co-Driver"));
	assert.ok(fleet.textContent.includes("Miguel Torres"));
	assert.ok(fleet.textContent.includes("111-333-4444"));
	assert.ok(fleet.textContent.includes("James Cole (Driver)"));
	assert.ok(fleet.textContent.includes("Jose Garcia (Driver)"));
	assert.equal(fleet.textContent.match(/Bus 746/g)?.length, 1);
	assert.ok(
		fleet.querySelectorAll(".driver-assignment-card__crew-context")
			.every((context) => context.classList.contains("assignment-module__label")),
	);
});

test("generic module buttons expose one fixed layout and every semantic tone", async () => {
	const [controls, tokens] = await Promise.all([
		readFile(new URL("../css/base/controls.css", import.meta.url), "utf8"),
		readFile(new URL("../css/tokens.css", import.meta.url), "utf8"),
	]);

	assert.match(controls, /\.rux-module-button\s*\{/);
	assert.match(controls, /flex-direction:\s*column/);
	assert.match(controls, /width:\s*var\(--rux-module-button-width\)/);
	assert.match(controls, /height:\s*var\(--rux-module-button-height\)/);
	assert.match(controls, /min-height:\s*var\(--rux-module-button-min-height\)/);
	assert.match(controls, /\.rux-module-button__label\s*\{/);
	for (const tone of ["neutral", "info", "success", "warning", "danger"]) {
		assert.match(controls, new RegExp(`\\.rux-module-button--${tone}\\s*\\{`));
	}
	assert.match(tokens, /--rux-module-button-width:\s*44px/);
	assert.match(tokens, /--rux-module-button-height:\s*44px/);
	assert.match(tokens, /--rux-module-button-min-height:\s*44px/);
});

test("responsive CSS protects narrow layouts and touch targets", async () => {
	const [css, componentDemoCss, tokens] = await Promise.all([
		readFile(new URL("../css/features/driver-share.css", import.meta.url), "utf8"),
		readFile(new URL("../css/features/comp-components-app.css", import.meta.url), "utf8"),
		readFile(new URL("../css/tokens.css", import.meta.url), "utf8"),
	]);
	assert.match(css, /@media \(max-width: 479px\)/);
	assert.match(css, /container:\s*driver-assignment-card\s*\/\s*inline-size/);
	assert.match(css, /@container driver-assignment-card \(max-width: 479px\)/);
	assert.match(css, /\.driver-assignment-card__bus-badge\s*\{[^}]*justify-self:\s*end/s);
	assert.match(css, /\.driver-assignment-card__header-route\s*\{[^}]*display:\s*flex/s);
	assert.match(
		css,
		/\.driver-assignment-card__response\[data-status="pending"\] \.driver-assignment-card__response-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*width:\s*100%/s,
	);
	assert.match(tokens, /--rux-driver-(?:date-primary|bus|route|time)-size:\s+1\.5rem/g);
	assert.match(
		css,
		/@container driver-assignment-card \(max-width: 479px\)[\s\S]*?\.driver-assignment-card__response-actions\s*\{[\s\S]*?display:\s*flex/,
	);
	assert.match(css, /overflow-x: hidden/);
	assert.match(css, /--rux-driver-touch-target/);
	assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
	assert.match(css, /:focus-visible/);
	assert.match(css, /\.assignment-module__content:last-child\s*\{\s*grid-column:\s*2\s*\/\s*-1/);
	assert.match(css, /\.assignment-module__action-wrap\s*\{[^}]*justify-self:\s*end/s);
	assert.match(css, /\.driver-assignment-card__crew-actions\s*\{[^}]*margin-inline-start:\s*auto/s);
	assert.match(tokens, /--rux-driver-phone-preview-max-width:\s*430px/);
	assert.match(
		componentDemoCss,
		/width:\s*min\(100%, var\(--rux-driver-phone-preview-max-width\)\)/,
	);
});
