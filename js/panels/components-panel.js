import { renderDriverAssignmentCard } from "../components/driver-assignment-card.js?v=2";
import { createTripBar } from "../components/trip-bar.js?v=9";
import BusPicker from "../components/bus-picker.js?v=2";

/* ==========================================================================
   COMPONENTS PANEL
   --------------------------------------------------------------------------
   Switches the workspace stage to the demo matching the clicked nav item,
   and resolves anatomy-card token values from the live computed styles so
   they can never drift from what tokens.css actually defines.
   ========================================================================== */

(function () {
	"use strict";

	const pageSelector = "[data-component-page]";
	const targetSelector = "[data-component-target]";
	const tokenSelector = "[data-token-value]";

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined && text !== null) node.textContent = text;
		return node;
	}

	function iconButton(icon, label, variant = "default") {
		const button = el("button", `rux-button rux-button--${variant} rux-button--icon`);
		button.type = "button";
		button.setAttribute("aria-label", label);
		button.title = label;
		button.appendChild(el("span", "rux-icon", icon));
		return button;
	}

	function demoPage(name, title, hostClass = "") {
		const page = el("div", "components-app__page");
		page.dataset.componentPage = name;
		page.dataset.componentTitle = title;
		page.hidden = true;

		const card = el("div", "rux-card");
		const header = el("header", "rux-card__header");
		header.appendChild(el("p", "rux-card__title", title));
		const body = el("div", "rux-card__body");
		const host = el("div", `components-app__anatomy-stage${hostClass ? ` ${hostClass}` : ""}`);
		body.appendChild(host);
		card.append(header, body);
		page.appendChild(card);
		document.querySelector(".components-app__stage")?.appendChild(page);
		return host;
	}

	function addLiveComponentNavigation() {
		const pane = document.querySelector(".components-app__list .rux-panel__pane");
		if (!pane || pane.querySelector("[data-live-component-nav]")) return;
		const card = el("div", "rux-card");
		const header = el("header", "rux-card__header");
		header.appendChild(el("p", "rux-card__title", "Live Components"));
		const body = el("div", "rux-card__body");
		const nav = el("nav", "rux-menu components-app__nav");
		nav.dataset.componentNav = "";
		nav.dataset.liveComponentNav = "";
		nav.setAttribute("aria-label", "Live components");
		[
			["trip-bar", "Trip Bar"],
			["bus-picker", "Bus Picker"],
			["document-viewer", "Document Viewer"],
			["trip-envelope", "Trip Envelope"],
		].forEach(([target, label]) => {
			const button = el("button", "rux-menu__item", label);
			button.type = "button";
			button.dataset.componentTarget = target;
			nav.appendChild(button);
		});
		body.appendChild(nav);
		card.append(header, body);
		pane.appendChild(card);
	}

	function mountPrimitivePages() {
		if (!document.querySelector('[data-component-page="icon-button"]')) {
			const host = demoPage("icon-button", "Icon Buttons");
			const specimens = el("div", "components-app__specimens");
			specimens.append(
				iconButton("add", "Add", "accent"),
				iconButton("edit", "Edit", "default"),
				iconButton("more_vert", "More options", "ghost"),
				iconButton("delete", "Delete", "default"),
			);
			specimens.lastElementChild.classList.add("rux-button--danger");
			const disabled = iconButton("block", "Unavailable", "default");
			disabled.disabled = true;
			specimens.appendChild(disabled);
			host.appendChild(specimens);
		}

		if (!document.querySelector('[data-component-page="segmented"]')) {
			const host = demoPage("segmented", "Segmented Control");
			const group = el("div", "rux-segmented rux-segmented--inline");
			group.dataset.ruxToggleGroup = "";
			[["Day", true], ["Week", false], ["Month", false]].forEach(([label, active]) => {
				const button = el("button", `rux-button rux-button--default${active ? " is-active" : ""}`, label);
				button.type = "button";
				button.setAttribute("aria-pressed", String(active));
				group.appendChild(button);
			});
			host.appendChild(group);
		}

		if (!document.querySelector('[data-component-page="stepper"]')) {
			const host = demoPage("stepper", "Stepper");
			const stepper = el("div", "rux-segmented rux-segmented--inline");
			stepper.dataset.ruxStepper = "";
			const input = document.createElement("input");
			input.type = "hidden";
			input.min = "1";
			input.max = "10";
			input.step = "1";
			input.value = "3";
			const decrement = iconButton("remove", "Decrease", "default");
			decrement.dataset.stepperDec = "";
			const count = el("span", "rux-stepper__count", "3");
			const increment = iconButton("add", "Increase", "default");
			increment.dataset.stepperInc = "";
			stepper.append(input, decrement, count, increment);
			host.appendChild(stepper);
		}
	}

	function sampleTripBarData() {
		return {
			id: "component-trip-bar",
			assignmentId: "component-assignment",
			startDate: "2026-07-23",
			endDate: "2026-07-26",
			destination: "Austin, TX",
			customer: "Boys & Girls Club",
			groupLabel: "2 Buses",
			driverStatus: "confirmed",
			trip_type: "dropoff_pickup",
			leg: "outbound",
			trip_bar_color: "cyan",
			paymentStatus: "paid_full",
			datePaid: "2026-07-20",
			pdfUploaded: true,
			itineraryStatus: "received",
			is_self_organized: false,
			notes: "D/O & P/U",
			estimatedMiles: 508.2,
			quotedPrice: 4285,
			invoiceNumber: "15619",
			paymentRef: "Ck #1068",
			bookingContact: { name: "Maria Reyes", phone: "956-555-0148" },
			tripContact: { name: "Maria Reyes", phone: "956-555-0148" },
			trip_stops: [
				{ type: "pickup", position: 0, depart_prev: "04:45", spot: "05:15", address: "1200 N Fir St, Donna, TX" },
				{ type: "return", position: 1, arrive: "22:58", address: "2801 Zinnia Ave, McAllen, TX" },
			],
			drivers: [
				{ role: "driver", name: "Jorge L. Garcia", shortName: "Jorge", pay: "$500" },
				{ role: "co-driver", name: "Miguel Torres", shortName: "Miguel", pay: "$450" },
			],
			activeRoles: ["driver:confirmed", "co-driver:confirmed"],
		};
	}

	function sampleEnvelopeTrip() {
		return {
			id: "component-envelope",
			startDate: "2026-07-23",
			endDate: "2026-07-26",
			destination: "Austin, TX",
			trip_type: "dropoff_pickup",
			spotTime: "05:15",
			bookingContact: { name: "Maria Reyes", phone: "956-555-0148" },
			tripContact: { name: "Maria Reyes", phone: "956-555-0148" },
			trip_reqs: { pax56: true, fuelCard: true },
			trip_stops: [
				{ type: "pickup", position: 0, spot: "05:15", address: "1200 N Fir St, Donna, TX" },
				{ type: "return", position: 1, arrive: "22:58", address: "2801 Zinnia Ave, McAllen, TX" },
			],
			drivers: [
				{ role: "driver", name: "Jorge L. Garcia", shortName: "Jorge", phone: "956-555-0148" },
				{ role: "co-driver", name: "Miguel Torres", shortName: "Miguel", phone: "956-555-0199" },
			],
		};
	}

	function launchButton(label, icon) {
		const button = el("button", "rux-button rux-button--accent");
		button.type = "button";
		button.append(el("span", "rux-icon", icon), el("span", "rux-btn-label", label));
		return button;
	}

	function mountLiveComponentPages() {
		addLiveComponentNavigation();

		if (!document.querySelector('[data-component-page="trip-bar"]')) {
			const host = demoPage("trip-bar", "Trip Bar", "components-app__anatomy-stage--trip-bar");
			const bar = createTripBar(sampleTripBarData(), {
				onOpenTrip: () => window.Rux?.toast?.("Open trip action"),
				onViewPdf: () => window.Rux?.toast?.("View itinerary action"),
				onChangeBus: () => window.Rux?.toast?.("Move bus action"),
				onPrintEnvelope: () => window.Rux?.toast?.("Envelope action"),
			});
			bar.classList.add("components-app__trip-bar-demo");
			bar.style.setProperty("--rux-trip-bar-day-inline-size", "58%");
			host.appendChild(bar);
		}

		if (!document.querySelector('[data-component-page="bus-picker"]')) {
			const host = demoPage("bus-picker", "Bus Picker");
			const button = launchButton("Open Bus Picker", "directions_bus");
			button.addEventListener("click", () => {
				const trip = {
					assignmentId: "component-assignment",
					busId: "bus-763",
					startDate: "2026-07-23",
					endDate: "2026-07-26",
				};
				const buses = [
					{ id: "bus-763", number: "763" },
					{ id: "bus-218", number: "218" },
					{ id: "bus-470", number: "470" },
				];
				const trips = {
					current: trip,
					conflict: {
						assignmentId: "component-conflict",
						busId: "bus-218",
						startDate: "2026-07-24",
						endDate: "2026-07-25",
					},
				};
				BusPicker.show(trip, buses, trips, (bus, conflictId) => {
					window.Rux?.toast?.(conflictId ? `Swap with bus ${bus.number}` : `Move to bus ${bus.number}`);
				}, button);
			});
			host.appendChild(button);
		}

		if (!document.querySelector('[data-component-page="document-viewer"]')) {
			const host = demoPage("document-viewer", "Document Viewer");
			const button = launchButton("Open Document Viewer", "description");
			button.addEventListener("click", () => {
				const sample = `<!doctype html><html><body style="margin:0;padding:48px;font:16px/1.5 Arial;color:#111"><h1>Sample Itinerary</h1><h2>Donna to Austin</h2><p><strong>Pick-up:</strong> 5:15 AM</p><p><strong>Address:</strong> 1200 N Fir St, Donna, TX</p><p><strong>Destination:</strong> Austin, TX</p></body></html>`;
				window.RuxDocViewer?.open({
					url: `data:text/html;charset=utf-8,${encodeURIComponent(sample)}`,
					title: "Sample Itinerary · Bus 763",
					fileName: "Sample Itinerary",
					icon: "route",
				});
			});
			host.appendChild(button);
		}

		if (!document.querySelector('[data-component-page="trip-envelope"]')) {
			const host = demoPage("trip-envelope", "Trip Envelope");
			const button = launchButton("Open Trip Envelope", "mail");
			button.addEventListener("click", () => {
				window.TripEnvelope?.open(sampleEnvelopeTrip(), [], { busNumber: "763" });
			});
			host.appendChild(button);
		}
	}

	function mountDriverAssignmentCardDemo() {
		const host = document.querySelector("[data-driver-assignment-card-demo]");
		if (!host) return;
		const sampleAssignment = {
			startDate: "2026-07-23",
			endDate: "2026-07-26",
			busNumber: "763",
			from: "1200 N Fir St, Donna, TX",
			to: "Austin, TX",
			spotTime: "05:15",
			role: "driver",
			leg: "outbound",
			trip: {
				customer: "Boys & Girls Club",
				trip_type: "dropoff_pickup",
			},
			contact: {
				name: "Maria Reyes",
				phone: "(956) 555-0148",
			},
			crew: [
				{
					role: "co-driver",
					drivers: { name: "Miguel Torres", phone: "(956) 555-0199" },
				},
				{
					role: "relief-start",
					drivers: { name: "James Cole", phone: "(956) 555-0142" },
				},
			],
			instructions: "Meet relief driver at the Pilot Travel Center off I-35, exit 178.",
			itineraryUrl: "demo",
		};
		const card = renderDriverAssignmentCard(sampleAssignment, {
			onItinerary: () => window.Rux?.toast?.("Itinerary preview action"),
			onEnvelope: () => window.Rux?.toast?.("Envelope preview action"),
		});
		card.classList.add("components-app__driver-assignment-demo");
		host.replaceChildren(card);
	}

	function showComponent(name) {
		const page = document.querySelector(`${pageSelector}[data-component-page="${name}"]`);
		if (!page) return;

		document.querySelectorAll(pageSelector).forEach((el) => {
			el.hidden = el !== page;
		});
		document.querySelectorAll(targetSelector).forEach((button) => {
			button.classList.toggle("is-active", button.dataset.componentTarget === name);
		});

		const title = document.getElementById("components-title");
		if (title && page.dataset.componentTitle) title.textContent = page.dataset.componentTitle;
	}

	function withPx(value, rootFontSize) {
		const remMatch = value.match(/^(-?[\d.]+)rem$/);
		if (!remMatch) return value;
		const px = parseFloat(remMatch[1]) * rootFontSize;
		return `${value} (${px}px)`;
	}

	function refreshTokenValues() {
		const styles = getComputedStyle(document.documentElement);
		const rootFontSize = parseFloat(styles.fontSize);
		document.querySelectorAll(tokenSelector).forEach((output) => {
			const raw = styles.getPropertyValue(output.dataset.tokenValue).trim();
			const value = raw ? withPx(raw, rootFontSize) : "Not defined";
			output.value = value;
			output.textContent = value;
		});
	}

	document.addEventListener("click", (event) => {
		const target = event.target.closest(targetSelector);
		if (target) showComponent(target.dataset.componentTarget);
	});

	mountPrimitivePages();
	mountLiveComponentPages();

	const firstPage = document.querySelector(pageSelector);
	if (firstPage) showComponent(firstPage.dataset.componentPage);

	refreshTokenValues();
	mountDriverAssignmentCardDemo();
})();
