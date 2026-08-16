import { renderDriverAssignmentCard } from "../components/driver-assignment-card.js?v=57";
import { createTripBar } from "../components/trip-bar.js?v=14";
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

	function cloneLiveComponent(selector, ariaLabel) {
		const source = document.querySelector(selector);
		if (!source) return null;

		const clone = source.cloneNode(true);
		clone.removeAttribute("id");
		if (ariaLabel) clone.setAttribute("aria-label", ariaLabel);

		// Runtime indicator geometry belongs to the source instance. The shared
		// controls runtime initializes a fresh indicator for this clone, keeping
		// the demo on the exact production component without copying live state.
		clone.querySelector(":scope > .rux-segmented__indicator")?.remove();
		delete clone.dataset.ruxIndicatorInit;
		delete clone.dataset.ruxIndicatorReady;
		clone.style.removeProperty("--_rux-segment-indicator-x");
		clone.style.removeProperty("--_rux-segment-indicator-y");
		clone.style.removeProperty("--_rux-segment-indicator-width");
		clone.style.removeProperty("--_rux-segment-indicator-height");

		return clone;
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
		header.appendChild(el("p", "rux-card__title", "Production Catalog"));
		const body = el("div", "rux-card__body");
		const nav = el("nav", "rux-menu components-app__nav");
		nav.dataset.componentNav = "";
		nav.dataset.liveComponentNav = "";
		nav.setAttribute("aria-label", "Live components");
		[
			["form-controls", "Form Controls"],
			["feedback-status", "Feedback & Status"],
			["navigation", "Navigation"],
			["surfaces-content", "Surfaces & Content"],
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

	function mountCatalogFamilyPages() {
		if (!document.querySelector('[data-component-page="form-controls"]')) {
			const host = demoPage("form-controls", "Form Controls", "components-app__anatomy-stage--column");
			host.innerHTML = `
				<div class="components-app__catalog-grid">
					<div class="rux-field"><label class="rux-field__label" for="component-text-input">Text input</label><input class="rux-input" id="component-text-input" value="Escamilla Tours" /><span class="rux-field__help">Standard field help</span></div>
					<div class="rux-field"><label class="rux-field__label" for="component-select">Select</label><select class="rux-select" id="component-select"><option>Bus 763</option><option>Bus 607</option></select></div>
					<div class="rux-field"><label class="rux-field__label" for="component-date">Date</label><input class="rux-input has-value" id="component-date" type="date" value="2026-08-01" /></div>
					<div class="rux-field"><label class="rux-field__label" for="component-time">Time</label><input class="rux-input has-value" id="component-time" type="time" value="09:15" /></div>
					<div class="rux-field components-app__catalog-span"><label class="rux-field__label" for="component-textarea">Textarea</label><textarea class="rux-textarea" id="component-textarea">Driver instructions</textarea></div>
					<div class="rux-field"><span class="rux-field__label">Checkbox</span><label class="rux-checkbox"><input type="checkbox" checked /> Confirmed</label></div>
					<div class="rux-field"><span class="rux-field__label">Switch</span><label class="rux-switch"><input type="checkbox" checked /><span class="rux-switch__track"></span><span class="rux-switch__thumb"></span></label></div>
					<div class="rux-field"><span class="rux-field__label">Number stepper</span><div class="rux-number-stepper"><button class="rux-number-stepper__btn" type="button" aria-label="Decrease"><span class="rux-icon">remove</span></button><input class="rux-number-stepper__input" type="number" value="2" min="1" /><button class="rux-number-stepper__btn" type="button" aria-label="Increase"><span class="rux-icon">add</span></button></div></div>
					<div class="rux-field"><label class="rux-field__label" for="component-color">Color input</label><div class="rux-color-input"><span class="rux-color-input__swatch" style="background:#0b78ff"></span><input class="rux-color-input__picker" id="component-color" type="color" value="#0b78ff" /><output class="rux-color-input__hex">#0B78FF</output></div></div>
					<div class="rux-field"><span class="rux-field__label">Color swatches</span><div class="rux-color-swatches"><label class="rux-color-swatch"><input type="radio" name="component-swatch" checked /><span class="rux-color-swatch__dot" style="--color:var(--rux-accent)"></span></label><label class="rux-color-swatch"><input type="radio" name="component-swatch" /><span class="rux-color-swatch__dot" style="--color:var(--rux-success)"></span></label><label class="rux-color-swatch"><input type="radio" name="component-swatch" /><span class="rux-color-swatch__dot" style="--color:var(--rux-warning)"></span></label></div></div>
					<div class="rux-field"><span class="rux-field__label">Color picker</span><div class="rux-color-picker" data-component-color-picker><button class="rux-color-picker__trigger" type="button" aria-expanded="false"><span class="rux-color-picker__preview" style="--color:var(--rux-accent)"></span><span class="rux-color-picker__label">Accent</span><span class="rux-color-picker__chevron rux-icon">expand_more</span></button><div class="rux-color-picker__popover" hidden><label class="rux-color-picker__option"><input type="radio" name="component-picker" checked data-label="Accent" data-color="var(--rux-accent)" /><span class="rux-color-picker__dot" style="--color:var(--rux-accent)"></span></label><label class="rux-color-picker__option"><input type="radio" name="component-picker" data-label="Success" data-color="var(--rux-success)" /><span class="rux-color-picker__dot" style="--color:var(--rux-success)"></span></label><label class="rux-color-picker__option"><input type="radio" name="component-picker" data-label="Warning" data-color="var(--rux-warning)" /><span class="rux-color-picker__dot" style="--color:var(--rux-warning)"></span></label></div></div></div>
					<div class="rux-field"><span class="rux-field__label">Output</span><output class="rux-output">508 miles</output></div>
					<div class="rux-field components-app__catalog-span"><label class="rux-field__label" for="component-prefix">Input group</label><div class="rux-input-group rux-input-group--prefix rux-input-group--suffix"><span class="rux-input-group__prefix"><span class="rux-icon">attach_money</span></span><input class="rux-input" id="component-prefix" value="450" /><span class="rux-input-group__suffix">USD</span></div></div>
				</div>`;
			host.querySelectorAll(".rux-number-stepper__btn").forEach((button) => {
				button.addEventListener("click", () => {
					const input = button.parentElement.querySelector(".rux-number-stepper__input");
					input.stepUp(button === button.parentElement.lastElementChild ? 1 : -1);
					input.dispatchEvent(new Event("change", { bubbles: true }));
				});
			});
			const colorPicker = host.querySelector("[data-component-color-picker]");
			colorPicker?.querySelector(".rux-color-picker__trigger")?.addEventListener("click", (event) => {
				const popover = colorPicker.querySelector(".rux-color-picker__popover");
				popover.hidden = !popover.hidden;
				event.currentTarget.setAttribute("aria-expanded", String(!popover.hidden));
			});
			colorPicker?.addEventListener("change", (event) => {
				const option = event.target.closest(".rux-color-picker__option input");
				if (!option) return;
				colorPicker.querySelector(".rux-color-picker__preview").style.setProperty("--color", option.dataset.color);
				colorPicker.querySelector(".rux-color-picker__label").textContent = option.dataset.label;
				colorPicker.querySelector(".rux-color-picker__popover").hidden = true;
				colorPicker.querySelector(".rux-color-picker__trigger").setAttribute("aria-expanded", "false");
			});
		}

		if (!document.querySelector('[data-component-page="feedback-status"]')) {
			const host = demoPage("feedback-status", "Feedback & Status", "components-app__anatomy-stage--column");
			host.innerHTML = `
				<div class="components-app__catalog-block"><span class="rux-badge">Default</span><span class="rux-badge rux-badge--accent">Accent</span><span class="rux-badge rux-badge--info">Info</span><span class="rux-badge rux-badge--success">Success</span><span class="rux-badge rux-badge--warning">Warning</span><span class="rux-badge rux-badge--danger">Danger</span><span class="rux-badge rux-badge--dot">Active</span></div>
				<div class="components-app__catalog-stack"><div class="rux-alert rux-alert--info"><span class="rux-alert__icon rux-icon">info</span><div class="rux-alert__body"><strong class="rux-alert__title">Information</strong><span>Shared alert component.</span></div></div><div class="rux-alert rux-alert--success"><span class="rux-alert__icon rux-icon">check_circle</span><div class="rux-alert__body"><strong class="rux-alert__title">Complete</strong><span>Everything is ready.</span></div></div><div class="rux-alert rux-alert--warning"><span class="rux-alert__icon rux-icon">warning</span><div class="rux-alert__body"><strong class="rux-alert__title">Attention</strong><span>Review this item.</span></div></div><div class="rux-alert rux-alert--danger"><span class="rux-alert__icon rux-icon">error</span><div class="rux-alert__body"><strong class="rux-alert__title">Error</strong><span>Action is required.</span></div></div></div>
				<div class="rux-progress" aria-label="Progress"><span class="rux-progress__bar" style="width:64%"></span></div>
				<div class="components-app__catalog-block"><button class="rux-button rux-button--default" type="button" data-component-toast>Show toast</button><button class="rux-button rux-button--default" type="button" data-component-modal>Open modal</button><button class="rux-button rux-button--ghost" type="button" data-rux-tooltip="floating" data-tooltip="Production tooltip">Tooltip target</button></div>`;
			host.querySelector("[data-component-toast]")?.addEventListener("click", () => window.Rux?.toast?.("Component toast"));
			host.querySelector("[data-component-modal]")?.addEventListener("click", () => window.ContactInfoModal?.open("This is the production modal component.", { title: "Modal" }));
		}

		if (!document.querySelector('[data-component-page="navigation"]')) {
			const host = demoPage("navigation", "Navigation", "components-app__anatomy-stage--column");
			host.innerHTML = `
				<nav class="rux-side-nav" aria-label="Primary Navigation Demo"><ul class="rux-side-nav__list"><li class="rux-side-nav__item"><button class="rux-side-nav__link is-active" type="button" aria-current="page"><span class="rux-icon" aria-hidden="true">map</span><span class="rux-side-nav__label">Trips</span></button></li><li class="rux-side-nav__item"><button class="rux-side-nav__link" type="button"><span class="rux-icon" aria-hidden="true">person</span><span class="rux-side-nav__label">Drivers</span></button></li><li class="rux-side-nav__item"><button class="rux-side-nav__link" type="button"><span class="rux-icon" aria-hidden="true">directions_bus</span><span class="rux-side-nav__label">Fleet</span></button></li></ul></nav>
				<section class="rux-panel components-app__panel-demo" aria-label="Attached tabs demo">
					<div class="rux-panel__nav rux-panel__nav--attached">
						<nav class="rux-tabs rux-tabs--attached" role="tablist" aria-label="Attached tabs" data-rux-tabs>
							<button class="rux-tab" role="tab" type="button" aria-selected="true" aria-controls="demo-attached-pane-1">Tab one</button>
							<button class="rux-tab" role="tab" type="button" aria-selected="false" aria-controls="demo-attached-pane-2">Tab two</button>
							<button class="rux-tab" role="tab" type="button" aria-selected="false" aria-controls="demo-attached-pane-3">Tab three</button>
							<button class="rux-tab" role="tab" type="button" aria-selected="false" aria-controls="demo-attached-pane-4">Tab four</button>
						</nav>
					</div>
					<div class="rux-panel__body">
						<div class="rux-panel__pane" id="demo-attached-pane-1"><p class="rux-card__subtitle">TAB ONE</p><p>Content for the first tab sits right here, flush against the active tab above it.</p></div>
						<div class="rux-panel__pane" id="demo-attached-pane-2" hidden><p class="rux-card__subtitle">TAB TWO</p><p>Switching tabs swaps this pane — the same [data-rux-tabs] runtime every other tab group in the app already uses.</p></div>
						<div class="rux-panel__pane" id="demo-attached-pane-3" hidden><p class="rux-card__subtitle">TAB THREE</p><p>No custom JS needed here — aria-controls on each tab is all this demo adds.</p></div>
						<div class="rux-panel__pane" id="demo-attached-pane-4" hidden><p class="rux-card__subtitle">TAB FOUR</p><p>The only tab-strip style used across the app — Trip Editor, Calendar Tools, and the Fleet vehicle editor all share this look.</p></div>
					</div>
				</section>
				<nav class="rux-menu components-app__menu-demo" aria-label="Menu demo"><span class="rux-menu__header">Actions</span><button class="rux-menu__item" type="button">Open trip</button><button class="rux-menu__item" type="button">Duplicate</button><span class="rux-menu__divider"></span><button class="rux-menu__item rux-menu__item--danger" type="button">Delete</button></nav>
				<div class="components-app__catalog-block" aria-label="Calendar navigation"><button class="rux-button rux-button--ghost rux-button--icon" type="button" aria-label="Previous"><span class="rux-icon">chevron_left</span></button><button class="rux-button rux-button--default" type="button">Today</button><button class="rux-button rux-button--ghost rux-button--icon" type="button" aria-label="Next"><span class="rux-icon">chevron_right</span></button></div>`;
		}

		if (!document.querySelector('[data-component-page="surfaces-content"]')) {
			const host = demoPage("surfaces-content", "Surfaces & Content", "components-app__anatomy-stage--column");
			host.innerHTML = `
				<div class="components-app__catalog-block"><span class="rux-avatar rux-avatar--sm">JG</span><span class="rux-avatar">ML</span><span class="rux-avatar rux-avatar--lg">DH</span><span class="rux-tag">Bus 763</span></div>
				<div class="components-app__surface-grid"><article class="rux-card"><header class="rux-card__header"><p class="rux-card__title">Standard card</p></header><div class="rux-card__body">Card body</div><footer class="rux-card__footer"><button class="rux-button rux-button--default rux-button--compact">Action</button></footer></article><article class="rux-card rux-card--elevated"><header class="rux-card__header"><p class="rux-card__title">Elevated card</p></header><div class="rux-card__body">Elevated surface</div></article><article class="rux-card rux-card--borderless"><div class="rux-card__body">Borderless card</div></article></div>
				<section class="rux-panel components-app__panel-demo"><header class="rux-panel__header"><h2 class="rux-panel__title">Panel</h2></header><div class="rux-panel__body"><div class="rux-panel__pane">Panel body and pane</div></div><footer class="rux-panel__footer"><button class="rux-button rux-button--accent">Save</button></footer></section>
				<div class="rux-suggestions components-app__suggestions-demo" role="listbox"><button class="rux-suggestions__item" type="button" role="option"><span class="rux-suggestions__label">McAllen Convention Center</span><span class="rux-suggestions__sublabel">700 Convention Center Blvd</span></button><button class="rux-suggestions__item" type="button" role="option"><span class="rux-suggestions__label">Escamilla Yard</span><span class="rux-suggestions__sublabel">Saved location</span></button></div>`;
		}
	}

	function mountPrimitivePages() {
		if (!document.querySelector('[data-component-page="segmented"]')) {
			const host = demoPage("segmented", "Segmented Control");
			const group = cloneLiveComponent("#tp-trip-type-group", "Segmented control demo");
			if (group) {
				host.appendChild(group);
			} else {
				host.appendChild(el(
					"p",
					"components-app__empty",
					"Live segmented control is unavailable.",
				));
			}
		}

		if (!document.querySelector('[data-component-page="stepper"]')) {
			const host = demoPage("stepper", "Stepper");
			const stepper = el("div", "rux-number-stepper");
			const decrement = iconButton("remove", "Decrease");
			decrement.className = "rux-number-stepper__btn";
			const input = el("input", "rux-number-stepper__input");
			input.type = "number";
			input.min = "1";
			input.max = "10";
			input.step = "1";
			input.value = "3";
			const increment = iconButton("add", "Increase");
			increment.className = "rux-number-stepper__btn";
			stepper.append(decrement, input, increment);
			decrement.addEventListener("click", () => input.stepDown());
			increment.addEventListener("click", () => input.stepUp());
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
		button.append(el("span", "rux-icon", icon), el("span", "rux-button__label", label));
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
			id: "component-driver-assignment",
			startDate: "2026-07-23",
			endDate: "2026-07-26",
			busNumber: "763",
			from: "1200 N Fir St, Donna, TX",
			to: "Austin, TX",
			spotTime: "05:15",
			role: "driver",
			leg: "outbound",
			status: "pending",
			trip: {
				customer: "Boys & Girls Club",
				trip_type: "dropoff_pickup",
			},
			contact: {
				name: "Maria Reyes",
				phone: "(956) 555-0148",
			},
			fleetAssignments: [
				{
					busId: "bus-763",
					busNumber: "763",
					isCurrentBus: true,
					crew: [
						{
							id: "driver-miguel",
							role: "co-driver",
							name: "Miguel Torres",
							phone: "(956) 555-0199",
							canMessage: true,
						},
					],
				},
				{
					busId: "bus-746",
					busNumber: "746",
					crew: [
						{
							id: "driver-james",
							role: "relief-start",
							name: "James Cole",
							phone: "(956) 555-0142",
							canMessage: true,
						},
					],
				},
			],
			alerts: [
				{ id: "hotel", severity: "warning", title: "Hotel Required" },
				{ id: "fuel", severity: "info", title: "Fuel Card Required" },
			],
			notes: "Meet relief driver at the Pilot Travel Center off I-35, exit 178.",
			itineraryUrl: "demo",
			documents: [
				{
					id: "itinerary",
					type: "itinerary",
					label: "Itinerary",
					status: "available",
					statusLabel: "Updated",
				},
				{
					id: "envelope",
					type: "envelope",
					label: "Envelope",
					status: "available",
					statusLabel: "Available",
				},
			],
		};
		const render = () => {
			const card = renderDriverAssignmentCard(sampleAssignment, {
				className: "components-app__driver-assignment-demo",
				onItinerary: () => window.Rux?.toast?.("Itinerary preview action"),
				onEnvelope: () => window.Rux?.toast?.("Envelope preview action"),
				onAccept: async () => ({
					status: "accepted",
					confirmedAt: new Date().toISOString(),
					confirmedSource: "driver",
				}),
				onDecline: async () => ({
					status: "declined",
					declinedAt: new Date().toISOString(),
					confirmedAt: "",
				}),
				confirmDecline: async () => window.confirm("Decline this assignment?"),
			});
			host.replaceChildren(card);
		};
		render();
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
	mountCatalogFamilyPages();
	mountLiveComponentPages();

	const firstPage = document.querySelector(pageSelector);
	if (firstPage) showComponent(firstPage.dataset.componentPage);

	refreshTokenValues();
	mountDriverAssignmentCardDemo();
})();
