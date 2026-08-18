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
	assert.ok(decline.classList.contains("rux-button--ghost"));
	assert.ok(decline.classList.contains("rux-button--danger"));
	assert.ok(accept.classList.contains("driver-assignment-card__response-control"));
	assert.ok(decline.classList.contains("driver-assignment-card__response-control"));
	assert.equal(card.textContent.includes("Awaiting Response"), false);
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

test("header stacks bus and role beside the date and destination", () => {
	const card = renderDriverAssignmentCard(assignment());
	const metadata = card.querySelector(".driver-assignment-card__header-metadata");
	const busBadge = card.querySelector(".driver-assignment-card__bus-badge");
	const roleBadge = card.querySelector(".driver-assignment-card__role-badge");
	assert.equal(
		busBadge.querySelector(".rux-badge__label").textContent,
		"763",
	);
	assert.equal(busBadge.getAttribute("aria-label"), "Bus 763");
	assert.equal(
		roleBadge.querySelector(".rux-badge__label").textContent,
		"Driver",
	);
	for (const badge of [busBadge, roleBadge]) {
		assert.ok(badge.classList.contains("rux-badge"));
		assert.ok(badge.classList.contains("rux-badge--info"));
		assert.ok(badge.classList.contains("rux-badge--module"));
	}
	assert.deepEqual(
		metadata.childNodes.map(
			(badge) => badge.querySelector(".rux-badge__icon").textContent,
		),
		["directions_bus", "badge"],
	);
	assert.equal(card.querySelector(".driver-assignment-card__trip-type"), null);
});

test("header combines assignment date, destination, metadata, and response details", () => {
	const card = renderDriverAssignmentCard(assignment(), {
		onAccept: async () => ({ status: "accepted" }),
		onDecline: async () => ({ status: "declined" }),
	});
	const header = card.querySelector(".driver-assignment-card__header");
	const destination = card.querySelector(".driver-assignment-card__destination");
	const customer = card.querySelector(".driver-assignment-card__customer");
	const response = card.querySelector(".driver-assignment-card__response");
	assert.equal(destination.textContent, "Austin, TX");
	assert.equal(customer.textContent, "Donna High School");
	assert.equal(destination.parentNode, customer.parentNode);
	assert.ok(
		destination.parentNode.classList.contains(
			"driver-assignment-card__destination-group",
		),
	);
	assert.equal(customer.getAttribute("aria-label"), "Customer: Donna High School");
	assert.equal(destination.getAttribute("aria-label"), "Destination: Austin, TX");
	assert.equal(destination.getAttribute("title"), "Austin, TX");
	assert.equal(header.textContent.includes("Donna, TX"), false);
	assert.equal(header.textContent.includes("Round-Trip"), false);
	assert.equal(moduleByKey(card, "departure-summary"), null);
	assert.ok(header.childNodes.includes(response));
});

test("accepted assignment replaces response actions with a non-interactive status", () => {
	const card = renderDriverAssignmentCard(assignment({ status: "accepted" }), {
		onDecline: async () => ({ status: "declined" }),
	});
	assert.equal(card.dataset.status, "accepted");
	assert.equal(buttonByLabel(card, "Accept"), null);
	assert.equal(buttonByLabel(card, "Decline"), null);
	assert.equal(card.querySelector(".driver-assignment-card__response-actions"), null);
	const accepted = card.querySelector(
		".driver-assignment-card__response-state--success",
	);
	assert.equal(accepted.getAttribute("role"), "status");
	assert.equal(accepted.getAttribute("aria-live"), "polite");
	assert.equal(
		accepted.querySelector(".driver-assignment-card__response-state-label").textContent,
		"Accepted",
	);
});

test("declined assignment replaces response actions with a non-interactive status", () => {
	const card = renderDriverAssignmentCard(assignment({ status: "declined" }), {
		onAccept: async () => ({ status: "accepted" }),
	});
	const declined = card.querySelector(
		".driver-assignment-card__response-state--danger",
	);
	assert.equal(card.querySelector(".driver-assignment-card__response-actions"), null);
	assert.equal(buttonByLabel(card, "Accept"), null);
	assert.equal(buttonByLabel(card, "Decline"), null);
	assert.equal(declined.getAttribute("role"), "status");
	assert.equal(
		declined.querySelector(".driver-assignment-card__response-state-label").textContent,
		"Declined",
	);
});

test("ordinary drivers use header badges while relief assignments show handoff detail", () => {
	const standard = renderDriverAssignmentCard(assignment());
	assert.equal(moduleByKey(standard, "role"), null);
	assert.ok(standard.textContent.includes("Driver"));
	assert.equal(standard.textContent.includes("Primary operator"), false);
	assert.equal(
		standard
			.querySelector(".driver-assignment-card__bus-badge")
			.querySelector(".rux-badge__label")
			.textContent,
		"763",
	);
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

test("header destination is followed by spot time and spot location", () => {
	const card = renderDriverAssignmentCard(assignment());
	const destination = card.querySelector(".driver-assignment-card__destination");
	const spotLocation = moduleByKey(card, "spot-location");
	assert.ok(destination);
	assert.ok(spotLocation);
	assert.equal(moduleByKey(card, "trip"), null);
	assert.equal(moduleByKey(card, "trip-overview"), null);
	assert.equal(moduleByKey(card, "spot-time"), null);
	assert.equal(destination.textContent, "Austin, TX");
	assert.equal(
		card.querySelector(".driver-assignment-card__customer").textContent,
		"Donna High School",
	);
	assert.equal(card.querySelector(".driver-assignment-card__header").textContent.includes("Round-Trip"), false);
	assert.equal(destination.textContent.includes("5:15 AM"), false);
	assert.ok(spotLocation.textContent.includes("5:15 AM"));
	assert.equal(spotLocation.textContent.includes("Donna High School"), false);
	assert.ok(spotLocation.textContent.includes("7250 Val Verde Rd"));
	/* The navigate control is icon-only now (Material Symbols "navigation"),
	   so its accessible name carries the label. Assert that, not glyph text. */
	const navigateLabel = [...card.querySelectorAll("[aria-label]")]
		.map((el) => el.getAttribute("aria-label"))
		.find((label) => label.startsWith("Navigate to"));
	assert.ok(navigateLabel, "navigate link is missing its accessible name");
	const spotDetails = spotLocation.querySelector(".assignment-compact-module__details");
	const address = spotDetails.childNodes[0];
	assert.equal(address.tagName, "ADDRESS");
	assert.ok(address.classList.contains("driver-assignment-card__spot-address"));
	assert.equal(address.textContent, "7250 Val Verde Rd, Donna TX 78537");
	assert.equal(
		address.getAttribute("aria-label"),
		"Spot location: 7250 Val Verde Rd, Donna TX 78537",
	);
	const time = spotDetails.childNodes[1];
	assert.equal(time.tagName, "TIME");
	assert.ok(time.classList.contains("driver-assignment-card__time"));
	assert.equal(time.getAttribute("aria-label"), "Spot time: 5:15 AM");
	assert.equal(spotLocation.textContent.includes("Spot Time"), false);
	assert.equal(spotLocation.textContent.includes("Spot Location"), false);
	assert.equal(spotLocation.textContent.includes("Austin"), false);
	assert.equal(spotLocation.textContent.includes("Round-Trip"), false);
});

test("reporting details show the address even when customer data exists", () => {
	const card = renderDriverAssignmentCard(assignment({
		spotLocation: {
			addressLine1: "7250 Val Verde Rd",
			city: "Donna",
			state: "TX",
			postalCode: "78537",
		},
	}));
	const reporting = moduleByKey(card, "spot-location");
	const address = reporting.querySelector(".driver-assignment-card__spot-address");
	assert.ok(address);
	assert.equal(address.textContent, "7250 Val Verde Rd, Donna TX 78537");
	assert.equal(reporting.textContent.includes("Donna High School"), false);
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

test("trip contact shares reporting details and alerts are omitted", () => {
	const card = renderDriverAssignmentCard(assignment({
		contact: { name: "Anna Partida", phone: "956-292-9255" },
		alerts: [{ id: "warning", severity: "warning", title: "Hotel Required" }],
	}));
	const modules = allElements(card)
		.filter((node) => node.dataset.module)
		.map((node) => node.dataset.module);
	assert.deepEqual(modules, ["spot-location"]);
	assert.equal(modules.includes("alerts"), false);
	assert.equal(card.textContent.includes("Hotel Required"), false);
	const reporting = moduleByKey(card, "spot-location");
	const contact = reporting.querySelector(".driver-assignment-card__reporting-contact");
	assert.ok(contact);
	assert.ok(contact.classList.contains("assignment-compact-module--actions"));
	assert.equal(reporting.getAttribute("aria-label"), "Reporting details and trip contact");
	assert.equal(contact.querySelector(".assignment-module__label-wrap"), null);
	assert.ok(contact.querySelector(".assignment-compact-module__body"));
	assert.equal(
		contact.querySelector(".driver-assignment-card__contact-name").textContent,
		"Anna Partida",
	);
	assert.equal(
		contact.querySelector(".driver-assignment-card__contact-phone").textContent,
		"956-292-9255",
	);
	assert.equal(contact.textContent.includes("956-292-9255"), true);
	assert.deepEqual(
		contact.querySelector(".assignment-compact-module__actions").childNodes.map(
			(action) => action.getAttribute("aria-label"),
		),
		["Text Anna Partida", "Call Anna Partida"],
	);
	assert.deepEqual(
		contact.querySelector(".assignment-compact-module__actions").childNodes.map(
			(action) => action.href,
		),
		["sms:9562929255", "tel:9562929255"],
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
	assert.equal(card.querySelector(".driver-assignment-card__crew-name").textContent, "You");
	assert.equal(card.querySelector(".driver-assignment-card__crew-role").textContent, "Driver");
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
	assert.ok(crew.textContent.includes("Your Bus"));
	assert.ok(crew.textContent.includes("Maria Lopez"));
	assert.ok(crew.textContent.includes("Relief Driver"));
	assert.equal(crew.textContent.includes("956-555-0112"), false);
	assert.equal(crew.querySelector(".assignment-module__label-wrap"), null);
	const crewActions = crew.querySelector(".driver-assignment-card__crew-actions");
	assert.ok(crewActions.parentNode.classList.contains("assignment-compact-module--actions"));
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
	assert.ok(fleet.textContent.includes("Your Bus"));
	assert.ok(fleet.textContent.includes("Bus 746"));
	assert.ok(fleet.textContent.includes("Miguel Torres"));
	assert.ok(fleet.textContent.includes("Co-Driver"));
	assert.equal(fleet.textContent.includes("111-333-4444"), false);
	assert.equal(fleet.textContent.includes("909-111-1111"), false);
	assert.equal(fleet.textContent.includes("909-222-2222"), false);
	assert.ok(fleet.textContent.includes("James Cole"));
	assert.ok(fleet.textContent.includes("Jose Garcia"));
	assert.equal(
		fleet.querySelectorAll(".driver-assignment-card__crew-role")
			.filter((role) => role.textContent === "Driver").length,
		2,
	);
	assert.equal(fleet.textContent.match(/Bus 746/g)?.length, 1);
	const busSections = fleet.querySelectorAll(".driver-assignment-card__crew-bus-section");
	assert.equal(busSections.length, 2);
	assert.equal(busSections[0].getAttribute("aria-labelledby"), busSections[0].querySelector("h3").id);
	assert.equal(busSections[1].getAttribute("aria-labelledby"), busSections[1].querySelector("h3").id);
});

test("document actions use neutral styling unless attention is required", () => {
	const card = renderDriverAssignmentCard(assignment({
		documents: [
			{ id: "1", type: "itinerary", label: "Itinerary", status: "available" },
			{ id: "2", type: "envelope", label: "Envelope", status: "required" },
		],
	}), {
		onItinerary: () => {},
		onEnvelope: () => {},
	});
	const documents = card.querySelectorAll(".driver-assignment-card__document");
	assert.equal(documents.length, 2);
	assert.equal(documents[0].classList.contains("is-attention-needed"), false);
	assert.equal(documents[1].classList.contains("is-attention-needed"), true);
});

test("responsive CSS protects narrow layouts and touch targets", async () => {
	const [css, componentDemoCss, tokens, badges] = await Promise.all([
		readFile(new URL("../scheduler/css/features/driver-share.css", import.meta.url), "utf8"),
		readFile(new URL("../scheduler/css/features/comp-components-app.css", import.meta.url), "utf8"),
		readFile(new URL("../rux-ui/css/tokens.css", import.meta.url), "utf8"),
		readFile(new URL("../rux-ui/css/base/badges.css", import.meta.url), "utf8"),
	]);
	assert.match(css, /@media \(max-width: 479px\)/);
	assert.match(css, /container:\s*driver-assignment-card\s*\/\s*inline-size/);
	assert.match(css, /@container driver-assignment-card \(max-width: 479px\)/);
	assert.match(
		css,
		/\.driver-assignment-card__bus-badge,\s*\.driver-assignment-card__role-badge\s*\{/s,
	);
	assert.match(css, /\.driver-assignment-card__date-range\s*\{[^}]*color:\s*var\(--rux-text-muted\)/s);
	assert.match(css, /--sched-driver-date-primary-size:\s+var\(--rux-size-md\)/);
	assert.match(
		css,
		/\.driver-assignment-card__header-summary\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) clamp\(104px,\s*24cqi,\s*128px\)[^}]*grid-template-areas:[^}]*"date bus"[^}]*"destination role"[^}]*row-gap:\s*var\(--rux-space-2\)[^}]*padding:\s*var\(--sched-driver-card-header-padding\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__destination-group\s*\{[^}]*grid-area:\s*destination[^}]*display:\s*grid[^}]*gap:\s*var\(--rux-space-1\)[^}]*min-width:\s*0/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__destination\s*\{[^}]*overflow:\s*hidden[^}]*min-width:\s*0[^}]*font-size:\s*var\(--rux-size-2xl\)[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__customer\s*\{[^}]*color:\s*var\(--rux-text-muted\)[^}]*font-size:\s*var\(--rux-size-md\)[^}]*text-overflow:\s*ellipsis/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__bus-badge,\s*\.driver-assignment-card__role-badge\s*\{[^}]*justify-content:\s*center[^}]*width:\s*100%[^}]*min-width:\s*0/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__header-metadata\s*\{[^}]*display:\s*contents/s,
	);
	assert.match(
		css,
		/--sched-driver-card-header-padding:\s+28px var\(--rux-space-5\)/,
	);
	assert.match(tokens, /--rux-badge-background-opacity:\s+12%/);
	assert.match(tokens, /--rux-badge-module-height:\s+44px/);
	assert.match(
		css,
		/--sched-driver-module-padding:\s+20px var\(--rux-space-5\)/,
	);
	assert.match(
		badges,
		/\.rux-badge\s*\{[^}]*--_badge-color:\s*var\(--rux-info-strong\)[^}]*background:\s*color-mix\([^}]*var\(--rux-badge-background-opacity\)[^}]*border:\s*var\(--rux-border-width\) solid var\(--_badge-color\)[^}]*color:\s*var\(--_badge-color\)/s,
	);
	for (const [tone, color] of [
		["info", "info"],
		["success", "success"],
		["warning", "warning"],
		["danger", "danger"],
	]) {
		assert.match(
			badges,
			new RegExp(`\\.rux-badge--${tone}[^}]*--_badge-color:\\s*var\\(--rux-${color}-strong\\)`),
		);
	}
	assert.match(
		badges,
		/\.rux-badge--module\s*\{[^}]*height:\s*var\(--rux-badge-module-height\)[^}]*border-radius:\s*var\(--rux-badge-module-radius\)/s,
	);
	assert.doesNotMatch(css, /\.driver-assignment-card__trip-type/);
	assert.match(
		css,
		/\.driver-assignment-card__response-actions\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*width:\s*100%/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__response-control\s*\{[^}]*width:\s*100%[^}]*height:\s*var\(--rux-button-height-standard\)[^}]*min-height:\s*var\(--rux-button-height-standard\)[^}]*border-radius:\s*var\(--rux-button-radius\)[^}]*font-size:\s*var\(--rux-button-font-size\)/s,
	);
	assert.doesNotMatch(css, /driver-assignment-card__decline--availability/);
	assert.match(
		css,
		/\.driver-assignment-card__response-state\s*\{[^}]*min-width:\s*10rem[^}]*min-height:\s*var\(--rux-button-height-standard\)[^}]*margin-inline:\s*auto[^}]*border:\s*var\(--rux-border-width\) solid var\(--_state-color\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__response-state--danger\s*\{[^}]*--_state-color:\s*var\(--rux-danger-bright\)/s,
	);
	/* The emphasised driver type size is tokenised now (--rux-size-2xl is
	   1.5rem); the -bus- and -route- variants no longer exist. */
	assert.match(css, /--sched-driver-time-size:\s+var\(--rux-size-2xl\)/);
	assert.doesNotMatch(
		css,
		/@container driver-assignment-card \(max-width: 479px\)[\s\S]*?\.driver-assignment-card__response-actions\s*\{[\s\S]*?display:\s*flex/,
	);
	assert.match(css, /overflow-x: hidden/);
	assert.match(css, /--sched-driver-touch-target/);
	assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
	assert.match(css, /:focus-visible/);
	assert.match(css, /\.assignment-module__content:last-child\s*\{\s*grid-column:\s*2\s*\/\s*-1/);
	assert.match(css, /\.assignment-module__action-wrap\s*\{[^}]*justify-self:\s*end/s);
	assert.match(css, /\.driver-assignment-card__crew-actions\s*\{[^}]*margin-inline-start:\s*auto/s);
	assert.match(css, /--sched-driver-action-rail-width:\s*96px/);
	assert.match(
		css,
		/\.assignment-compact-module--actions\s*\{[^}]*var\(--sched-driver-action-rail-width,\s*96px\)/s,
	);
	assert.match(
		css,
		/\.assignment-compact-module__actions\s*\{[^}]*width:\s*var\(--sched-driver-action-rail-width,\s*96px\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__crew-member\.assignment-compact-module--actions\s*\{[^}]*var\(--sched-driver-action-rail-width,\s*96px\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__crew-role\s*\{[^}]*font-size:\s*var\(--rux-size-sm\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__document\s*\{[^}]*background:\s*var\(--sched-driver-doc-neutral-bg\)[^}]*color:\s*var\(--sched-driver-doc-neutral-fg\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__document\.is-attention-needed\s*\{[^}]*background:\s*var\(--sched-driver-doc-warning-bg\)/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__crew-member\s*\{[^}]*margin:\s*0/s,
	);
	assert.match(
		css,
		/\.driver-assignment-card__crew-bus-section\s*\{[^}]*display:\s*grid[^}]*gap:\s*var\(--rux-space-3\)[^}]*padding:\s*var\(--sched-driver-module-padding\)[^}]*border-top:/s,
	);
	assert.match(css, /--sched-driver-page-max-width:\s*520px/);
	assert.match(css, /--sched-driver-phone-preview-max-width:\s*430px/);
	assert.match(
		componentDemoCss,
		/width:\s*min\(100%, var\(--sched-driver-phone-preview-max-width\)\)/,
	);
});
