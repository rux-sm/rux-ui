/* ==========================================================================
   RUX UI — DRIVER WEEK INFO
   --------------------------------------------------------------------------
   Builds driver-facing assignment text from the scheduler's already-loaded
   trip records. Nothing is sent automatically: dispatchers review the text,
   choose which assignments to include, and copy it into their messaging app.

   API
   ---
   window.DriverWeekInfo.open({ driver, trips, weekStart, viewDays, buses })
   ========================================================================== */

(() => {
	"use strict";

	let modal = null;
	let state = null;

	function parseIsoDate(value) {
		if (!value) return null;
		const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
		if (!match) return null;
		return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	}

	function isoDate(date) {
		return [
			date.getFullYear(),
			String(date.getMonth() + 1).padStart(2, "0"),
			String(date.getDate()).padStart(2, "0"),
		].join("-");
	}

	function addDays(date, count) {
		const next = new Date(date);
		next.setDate(next.getDate() + count);
		return next;
	}

	function fmtDate(value, options = {}) {
		const date = value instanceof Date ? value : parseIsoDate(value);
		if (!date) return "";
		return date.toLocaleDateString("en-US", {
			weekday: options.weekday === false ? undefined : "short",
			month: "short",
			day: "numeric",
			year: options.year ? "numeric" : undefined,
		});
	}

	function fmtRange(start, end) {
		if (isoDate(start) === isoDate(end)) return fmtDate(start, { year: true });
		return `${fmtDate(start, { weekday: false })} – ${fmtDate(end, {
			weekday: false,
			year: true,
		})}`;
	}

	function fmtTime(value) {
		if (!value) return "";
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

	function driverName(driver) {
		return String(driver?.short_name || driver?.name || "Driver").trim();
	}

	function fullDriverName(driver) {
		return String(driver?.name || driver?.short_name || "Driver").trim();
	}

	function roleLabel(role) {
		if (role === "co-driver") return "Co-Driver";
		if (role === "relief-start" || role === "relief-end") return "Relief Driver";
		return "Driver";
	}

	function stopsForLeg(trip, leg) {
		const all = [...(trip.trip_stops || [])].sort(
			(a, b) => Number(a.position || 0) - Number(b.position || 0),
		);
		let outbound = all.filter((stop) => (stop.leg || "outbound") !== "return");
		let inbound = all.filter((stop) => stop.leg === "return");

		// Safely understand the legacy split-trip shape where both sequences were
		// once stored as outbound: Pickup … Return, Pickup … Return.
		if (trip.trip_type === "dropoff_pickup" && !inbound.length) {
			const firstReturn = outbound.findIndex((stop) => stop.type === "return");
			const secondPickup = outbound.findIndex(
				(stop, index) => index > firstReturn && stop.type === "pickup",
			);
			if (firstReturn >= 0 && secondPickup > firstReturn) {
				inbound = outbound.slice(secondPickup);
				outbound = outbound.slice(0, secondPickup);
			}
		}

		return leg === "return" ? inbound : outbound;
	}

	function itineraryUrl(trip) {
		const doc = (trip.trip_documents || []).find(
			(item) => String(item.label || "").toLowerCase() === "itinerary",
		);
		return doc?.file_path ? window.RuxDocs?.url?.(doc.file_path) || "" : "";
	}

	function activeRequirements(trip) {
		const labels = new Map(
			(window.appRequirements || []).map((item) => [item.id, item.label]),
		);
		const fallbacks = {
			sleeper: "Sleeper",
			pax56: "56 Pax",
			adaLift: "Wheelchair Lift",
			hotel: "Hotel",
			fuelCard: "Fuel Card",
		};
		let ids = [];
		if (trip.trip_reqs && Object.keys(trip.trip_reqs).length) {
			ids = Object.entries(trip.trip_reqs)
				.filter(([, selected]) => selected)
				.map(([id]) => id);
		} else {
			ids = [
				["sleeper", trip.req_sleeper],
				["pax56", trip.req_56pax],
				["adaLift", trip.req_ada],
				["hotel", trip.need_hotel],
				["fuelCard", trip.need_fuel_card],
			]
				.filter(([, selected]) => selected)
				.map(([id]) => id);
		}
		const result = ids.map((id) => fallbacks[id] || labels.get(id) || id);
		if (trip.trip_type === "one_way" || trip.trip_type === "dropoff_pickup") {
			result.push("One-Way");
		}
		return result;
	}

	function contactFor(trip) {
		if (trip.booking_contact_name || trip.booking_contact_phone) {
			return {
				name: trip.booking_contact_name || "",
				phone: trip.booking_contact_phone || "",
			};
		}
		return {
			name: trip.trip_contact_1_name || "",
			phone: trip.trip_contact_1_phone || "",
		};
	}

	function entriesForDriver({ driver, trips, weekStart, viewDays }) {
		const rangeStart = new Date(weekStart);
		rangeStart.setHours(0, 0, 0, 0);
		const rangeEnd = addDays(rangeStart, Math.max(1, Number(viewDays) || 7) - 1);
		rangeEnd.setHours(23, 59, 59, 999);
		const entries = [];

		for (const trip of trips || []) {
			for (const assignment of trip.trip_assignments || []) {
				const driverAssignment = (assignment.drivers || []).find(
					(item) => String(item.driver_id) === String(driver.id),
				);
				if (!driverAssignment) continue;

				const leg = assignment.leg || "outbound";
				const isInbound = leg === "return" && trip.trip_type === "dropoff_pickup";
				const startDate = isInbound ? trip.return_start_date : trip.start_date;
				const endDate = isInbound
					? trip.return_end_date || startDate
					: trip.end_date || startDate;
				const start = parseIsoDate(startDate);
				const end = parseIsoDate(endDate);
				if (!start || !end || end < rangeStart || start > rangeEnd) continue;

				const stops = stopsForLeg(trip, leg);
				const pickup = stops.find((stop) => stop.type === "pickup") || {};
				const returnStop = [...stops].reverse().find((stop) => stop.type === "return") || {};
				const busNumber = assignment.buses?.number ?? "Unassigned";
				entries.push({
					key: String(assignment.id || `${trip.id}:${leg}:${driver.id}`),
					trip,
					assignment,
					driverAssignment,
					leg,
					startDate,
					endDate,
					busNumber: String(busNumber),
					pickup,
					returnStop,
					reportTime: pickup.depart_prev || trip.departure_time || "",
					spotTime: pickup.spot || trip.spot_time || "",
					returnTime: returnStop.arrive || trip.return_time || "",
					from: pickup.address || pickup.name || "",
					to: isInbound
						? returnStop.address || returnStop.name || "Yard"
						: trip.destination || "",
					requirements: activeRequirements(trip),
					contact: contactFor(trip),
					itineraryUrl: itineraryUrl(trip),
				});
			}
		}

		return entries.sort((a, b) => {
			const byDate = String(a.startDate).localeCompare(String(b.startDate));
			if (byDate) return byDate;
			return String(a.reportTime || a.spotTime).localeCompare(
				String(b.reportTime || b.spotTime),
			);
		});
	}

	function assignmentLines(entry) {
		const lines = [];
		const date = entry.startDate === entry.endDate
			? fmtDate(entry.startDate)
			: `${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate, { weekday: false })}`;
		const leg = entry.trip.trip_type === "dropoff_pickup"
			? entry.leg === "return" ? "Inbound" : "Outbound"
			: "";
		lines.push(
			[date, roleLabel(entry.driverAssignment.role), leg].filter(Boolean).join(" · "),
		);
		lines.push(`Bus: ${entry.busNumber}`);
		if (entry.trip.customer) lines.push(`Group: ${entry.trip.customer}`);
		if (entry.reportTime) lines.push(`Report/Yard: ${fmtTime(entry.reportTime)}`);
		if (entry.spotTime) lines.push(`Spot: ${fmtTime(entry.spotTime)}`);
		if (entry.from) lines.push(`From: ${entry.from}`);
		if (entry.to) lines.push(`To: ${entry.to}`);
		if (entry.returnTime) lines.push(`Estimated return: ${fmtTime(entry.returnTime)}`);
		if (entry.requirements.length) {
			lines.push(`Requirements: ${entry.requirements.join(" · ")}`);
		}
		if (entry.contact.name || entry.contact.phone) {
			lines.push(
				`Trip contact: ${[entry.contact.name, entry.contact.phone].filter(Boolean).join(" · ")}`,
			);
		}
		if (entry.itineraryUrl) lines.push(`Itinerary: ${entry.itineraryUrl}`);
		return lines;
	}

	function buildMessage(entries, driver, rangeStart, rangeEnd, single = false) {
		const greetingName = driverName(driver).split(/\s+/)[0] || "Driver";
		const intro = single
			? `Hi ${greetingName}, here is your trip assignment:`
			: `Hi ${greetingName}, here are your assignments for ${fmtRange(rangeStart, rangeEnd)}:`;
		if (!entries.length) return `${intro}\n\nNo trips are currently assigned.`;
		return [
			intro,
			...entries.map((entry) => `\n${assignmentLines(entry).join("\n")}`),
		].join("\n");
	}

	async function copyText(text) {
		if (await window.Rux?.copy?.(text)) return true;
		const fallback = document.createElement("textarea");
		fallback.value = text;
		fallback.setAttribute("readonly", "");
		fallback.style.cssText = "position:fixed;inset:auto auto 0 -9999px";
		document.body.appendChild(fallback);
		fallback.select();
		let copied = false;
		try {
			copied = document.execCommand("copy");
		} catch (_) {
			copied = false;
		}
		fallback.remove();
		window.Rux?.toast?.(
			copied ? "Copied" : "Copy was blocked — select the preview and copy manually",
			{ duration: copied ? 1400 : 3200 },
		);
		return copied;
	}

	function envelopeTrip(entry) {
		const trip = entry.trip;
		const assignment = entry.assignment;
		return {
			id: trip.id,
			trip_ref: trip.trip_ref,
			assignmentId: assignment.id,
			busId: assignment.bus_id,
			leg: entry.leg,
			startDate: entry.startDate,
			endDate: entry.endDate,
			destination: trip.destination,
			customer: trip.customer,
			trip_type: trip.trip_type,
			departureTime: trip.departure_time,
			spotTime: trip.spot_time,
			returnTime: trip.return_time,
			bookingContact: {
				name: trip.booking_contact_name,
				phone: trip.booking_contact_phone,
				email: trip.booking_contact_email,
			},
			tripContact: {
				name: trip.trip_contact_1_name,
				phone: trip.trip_contact_1_phone,
			},
			tripContact2: {
				name: trip.trip_contact_2_name,
				phone: trip.trip_contact_2_phone,
			},
			trip_stops: stopsForLeg(trip, entry.leg),
			trip_documents: trip.trip_documents || [],
			trip_reqs: trip.trip_reqs || {},
			req_sleeper: trip.req_sleeper,
			req_56pax: trip.req_56pax,
			req_ada: trip.req_ada,
			need_hotel: trip.need_hotel,
			need_fuel_card: trip.need_fuel_card,
			drivers: (assignment.drivers || []).map((item) => ({
				name: item.drivers?.name || item.name || "",
				shortName: item.drivers?.short_name || item.drivers?.name || item.name || "",
				role: item.role,
				status: "confirmed",
				pay: item.pay != null ? `$${item.pay}` : "",
			})),
			activeRoles: assignment.active_roles || ["driver"],
		};
	}

	function selectedEntries() {
		if (!state) return [];
		return state.entries.filter((entry) => state.selected.has(entry.key));
	}

	function refreshPreview() {
		if (!modal || !state) return;
		const textarea = modal.querySelector("[data-driver-info-preview]");
		const selected = selectedEntries();
		textarea.value = buildMessage(
			selected,
			state.driver,
			state.rangeStart,
			state.rangeEnd,
		);
		modal.querySelector("[data-driver-info-copy-week]").disabled = !selected.length;
	}

	function createButton(label, icon, variant, action, key) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = `rux-button rux-button--${variant} rux-button--sm`;
		button.dataset.action = action;
		if (key) button.dataset.entryKey = key;
		button.innerHTML = `<span class="rux-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
		return button;
	}

	function renderTrips() {
		const host = modal.querySelector("[data-driver-info-trips]");
		host.innerHTML = "";
		if (!state.entries.length) {
			const empty = document.createElement("p");
			empty.className = "rux-driver-week-info__empty";
			empty.textContent = "No assignments for this driver in the loaded date range.";
			host.appendChild(empty);
			return;
		}

		state.entries.forEach((entry) => {
			const card = document.createElement("article");
			card.className = "rux-driver-week-info__trip";

			const checkLabel = document.createElement("label");
			checkLabel.className = "rux-checkbox rux-driver-week-info__trip-check";
			const check = document.createElement("input");
			check.type = "checkbox";
			check.checked = state.selected.has(entry.key);
			check.dataset.entryKey = entry.key;
			check.setAttribute("aria-label", `Include ${entry.trip.destination || "trip"}`);
			checkLabel.appendChild(check);
			card.appendChild(checkLabel);

			const content = document.createElement("div");
			content.className = "rux-driver-week-info__trip-content";
			const title = document.createElement("p");
			title.className = "rux-driver-week-info__trip-title";
			title.textContent = `${fmtDate(entry.startDate)} · ${entry.trip.destination || "Trip"}`;
			const meta = document.createElement("p");
			meta.className = "rux-driver-week-info__trip-meta";
			meta.textContent = `Bus ${entry.busNumber} · ${roleLabel(entry.driverAssignment.role)}`;
			content.append(title, meta);

			const actions = document.createElement("div");
			actions.className = "rux-driver-week-info__trip-actions";
			actions.appendChild(createButton("Copy trip", "content_copy", "ghost", "copy-trip", entry.key));
			if (entry.itineraryUrl) {
				actions.appendChild(createButton("Itinerary", "description", "ghost", "itinerary", entry.key));
			}
			actions.appendChild(createButton("Envelope", "mail", "ghost", "envelope", entry.key));
			content.appendChild(actions);
			card.appendChild(content);
			host.appendChild(card);
		});
	}

	function ensureModal() {
		if (modal) return modal;
		modal = document.createElement("div");
		modal.className = "rux-modal-backdrop";
		modal.hidden = true;
		modal.innerHTML = `
			<section class="rux-modal rux-driver-week-info" role="dialog" aria-modal="true" aria-labelledby="driver-week-info-title">
				<header class="rux-modal__header">
					<div class="rux-driver-week-info__heading">
						<h2 class="rux-modal__title" id="driver-week-info-title" data-driver-info-title>Driver Info</h2>
						<p class="rux-driver-week-info__range" data-driver-info-range></p>
					</div>
					<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-rux-dismiss aria-label="Close driver info">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</header>
				<div class="rux-modal__body rux-driver-week-info__body">
					<section class="rux-driver-week-info__section">
						<h3 class="rux-driver-week-info__section-title">Assignments to include</h3>
						<div class="rux-driver-week-info__trips" data-driver-info-trips></div>
					</section>
					<section class="rux-driver-week-info__section">
						<h3 class="rux-driver-week-info__section-title">Message preview</h3>
						<textarea class="rux-textarea rux-driver-week-info__preview" readonly data-driver-info-preview aria-label="Driver message preview"></textarea>
					</section>
				</div>
				<footer class="rux-modal__footer">
					<button type="button" class="rux-button rux-button--default" data-rux-dismiss>Close</button>
					<button type="button" class="rux-button rux-button--accent" data-driver-info-copy-week>
						<span class="rux-icon" aria-hidden="true">content_copy</span>
						<span>Copy week text</span>
					</button>
				</footer>
			</section>`;
		document.body.appendChild(modal);

		modal.addEventListener("change", (event) => {
			const check = event.target.closest("input[data-entry-key]");
			if (!check || !state) return;
			if (check.checked) state.selected.add(check.dataset.entryKey);
			else state.selected.delete(check.dataset.entryKey);
			refreshPreview();
		});

		modal.addEventListener("click", async (event) => {
			const weekButton = event.target.closest("[data-driver-info-copy-week]");
			if (weekButton) {
				await copyText(modal.querySelector("[data-driver-info-preview]").value);
				return;
			}
			const actionButton = event.target.closest("button[data-action][data-entry-key]");
			if (!actionButton || !state) return;
			const entry = state.entries.find((item) => item.key === actionButton.dataset.entryKey);
			if (!entry) return;
			if (actionButton.dataset.action === "copy-trip") {
				await copyText(
					buildMessage([entry], state.driver, state.rangeStart, state.rangeEnd, true),
				);
			} else if (actionButton.dataset.action === "itinerary") {
				window.open(entry.itineraryUrl, "_blank", "noopener");
			} else if (actionButton.dataset.action === "envelope") {
				window.Rux?.closeModal?.(modal);
				window.TripEnvelope?.open?.(envelopeTrip(entry), state.buses);
			}
		});

		return modal;
	}

	function open({ driver, trips, weekStart, viewDays = 7, buses = [] }) {
		if (!driver || !weekStart) return;
		ensureModal();
		const rangeStart = new Date(weekStart);
		rangeStart.setHours(0, 0, 0, 0);
		const rangeEnd = addDays(rangeStart, Math.max(1, Number(viewDays) || 7) - 1);
		const entries = entriesForDriver({ driver, trips, weekStart: rangeStart, viewDays });
		state = {
			driver,
			buses,
			entries,
			rangeStart,
			rangeEnd,
			selected: new Set(entries.map((entry) => entry.key)),
		};

		modal.querySelector("[data-driver-info-title]").textContent = `Driver Info · ${fullDriverName(driver)}`;
		modal.querySelector("[data-driver-info-range]").textContent = [
			fmtRange(rangeStart, rangeEnd),
			driver.phone,
		].filter(Boolean).join(" · ");
		renderTrips();
		refreshPreview();
		window.Rux?.openModal?.(modal);
	}

	window.DriverWeekInfo = { open };
})();
