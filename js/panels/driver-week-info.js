/* ==========================================================================
   RUX UI — DRIVER WEEK INFO
   --------------------------------------------------------------------------
   Builds driver-facing assignment text from the scheduler's already-loaded
   current and upcoming trip records. Nothing is sent automatically:
   dispatchers review the text, choose which assignments to include, and copy
   it into their messaging app.

   API
   ---
   window.DriverWeekInfo.open({ driver, trips, buses })
   ========================================================================== */

import { supabase } from "../data/supabase.js";
import { isCurrentOrUpcomingLeg } from "../core/trip-visibility.js";
import { latestDocument } from "../core/trip-documents.js";
import { operationalTripContact } from "../components/driver-assignment-model.js?v=19";

(() => {
	"use strict";

	let modal = null;
	let state = null;
	const MAX_SHARED_ASSIGNMENTS = 50;

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

	function fmtMessageDate(startValue, endValue) {
		const start = parseIsoDate(startValue);
		const end = parseIsoDate(endValue || startValue);
		if (!start) return "";
		const day = (date) => date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
		const numeric = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
		if (!end || isoDate(start) === isoDate(end)) return `${day(start)} ${numeric(start)}`;
		return `${day(start)} ${numeric(start)}–${day(end)} ${numeric(end)}`;
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

	function isReliefRole(role) {
		return role === "relief-start" || role === "relief-end";
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

	function itineraryDocument(trip) {
		const doc = latestDocument(trip.trip_documents, "Itinerary");
		if (!doc) return { publicUrl: "", shortUrl: "" };
		return {
			publicUrl: doc.file_path ? window.RuxDocs?.url?.(doc.file_path) || "" : "",
			shortUrl: doc.id
				? `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}doc.html?id=${encodeURIComponent(doc.id)}`
				: "",
		};
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

	function entriesForDriver({ driver, trips }) {
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
				if (!start || !end || !isCurrentOrUpcomingLeg(end)) continue;

				const stops = stopsForLeg(trip, leg);
				const pickup = stops.find((stop) => stop.type === "pickup") || {};
				const returnStop = [...stops].reverse().find((stop) => stop.type === "return") || {};
				const busNumber = assignment.buses?.number ?? "Unassigned";
				const itinerary = itineraryDocument(trip);
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
					roleReportTime: driverAssignment.report_time || "",
					instructions: driverAssignment.instructions || "",
					from: pickup.address || pickup.name || "",
					to: isInbound
						? returnStop.address || returnStop.name || "Yard"
						: trip.destination || "",
					requirements: activeRequirements(trip),
					contact: operationalTripContact(trip),
					itineraryUrl: itinerary.publicUrl,
					itineraryShareUrl: itinerary.shortUrl || itinerary.publicUrl,
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

	function assignmentLines(entry, { includeItinerary = true } = {}) {
		const lines = [];
		const leg = entry.trip.trip_type === "dropoff_pickup"
			? entry.leg === "return" ? "Inbound" : "Outbound"
			: "";
		lines.push(
			[fmtMessageDate(entry.startDate, entry.endDate), `Bus ${entry.busNumber}`, roleLabel(entry.driverAssignment.role), leg]
				.filter(Boolean)
				.join(" • "),
		);
		if (isReliefRole(entry.driverAssignment.role)) {
			lines.push(entry.roleReportTime
				? `${fmtTime(entry.roleReportTime)} swap`
				: "Swap time not set");
			if (entry.instructions) lines.push(entry.instructions);
		} else if (entry.spotTime) {
			lines.push(`${fmtTime(entry.spotTime)} spot`);
		}
		const from = shortLocation(entry.from);
		const to = shortLocation(entry.to);
		if (from || to) lines.push(`${from || "Pickup"} → ${to || "Destination"}`);
		if (includeItinerary && entry.itineraryShareUrl) {
			lines.push(`Itinerary: ${entry.itineraryShareUrl}`);
		}
		return lines;
	}

	function buildMessage(entries, driver, rangeStart, rangeEnd, single = false, shareUrl = "") {
		const greetingName = driverName(driver).split(/\s+/)[0] || "Driver";
		const intro = single
			? `Hi ${greetingName}, here is your trip assignment:`
			: rangeStart && rangeEnd
				? `Hi ${greetingName}, here are your assignments for ${fmtRange(rangeStart, rangeEnd)}:`
				: `Hi ${greetingName}, here are your upcoming assignments:`;
		if (!entries.length) return `${intro}\n\nNo trips are currently assigned.`;
		const message = [
			intro,
			...entries.map((entry) => `\n${assignmentLines(entry, {
				includeItinerary: single || !shareUrl,
			}).join("\n")}`),
		];
		if (shareUrl) message.push(`\nTrip details and itineraries:\n${shareUrl}`);
		return message.join("\n");
	}

	// Always the real, publicly-reachable site — never window.location.href.
	// This link goes to a driver's phone, which may be on cellular with no
	// access to wherever the admin app itself happens to be running (a local
	// dev server's hostname isn't resolvable off that machine's own network
	// at all, so a link built from it would never have worked regardless of
	// whether the machine was on).
	const SITE_ORIGIN = "https://rux-sm.github.io/rux-ui/";

	function shareUrl(token) {
		const url = new URL("d.html", SITE_ORIGIN);
		url.searchParams.set("s", token);
		return url.href;
	}

	function shareStorageKey() {
		if (!state) return "";
		return ["rux:driver-schedule-share", state.driver.id].join(":");
	}

	function legacyShareStorageKey() {
		if (!state) return "";
		return [
			"rux:driver-schedule-share",
			state.driver.id,
			isoDate(state.legacyRangeStart || state.rangeStart),
			isoDate(state.legacyRangeEnd || state.rangeEnd),
		].join(":");
	}

	function selectedAssignmentIds() {
		return selectedEntries().map((entry) => entry.assignment.id).filter(Boolean);
	}

	function rangeForEntries(entries) {
		let start = null;
		let end = null;
		for (const entry of entries || []) {
			const entryStart = parseIsoDate(entry.startDate);
			const entryEnd = parseIsoDate(entry.endDate || entry.startDate);
			if (!entryStart || !entryEnd) continue;
			if (!start || entryStart < start) start = entryStart;
			if (!end || entryEnd > end) end = entryEnd;
		}
		return start && end ? { start, end } : null;
	}

	function selectedRange() {
		return rangeForEntries(selectedEntries());
	}

	function syncSelectedRange() {
		if (!state) return null;
		const range = selectedRange();
		if (range) {
			state.rangeStart = range.start;
			state.rangeEnd = range.end;
		}
		return range;
	}

	function selectedReliefWithoutTime() {
		return selectedEntries().find(
			(entry) => isReliefRole(entry.driverAssignment.role) && !entry.roleReportTime,
		) || null;
	}

	function selectionLimitExceeded() {
		return selectedAssignmentRefs().length > MAX_SHARED_ASSIGNMENTS;
	}

	function selectedAssignmentRefs() {
		const unique = new Map();
		selectedEntries().forEach((entry) => {
			const ref = { tripId: String(entry.trip.id), leg: entry.leg || "outbound" };
			unique.set(assignmentRefKey(ref), ref);
		});
		return [...unique.values()];
	}

	function assignmentRefKey(ref) {
		return `${ref.tripId}:${ref.leg || "outbound"}`;
	}

	function shareMatchesSelection() {
		if (!state?.share) return false;
		const selected = selectedAssignmentRefs().map(assignmentRefKey).sort();
		const shared = (state.share.assignmentRefs || []).map(assignmentRefKey).sort();
		const range = selectedRange();
		return Boolean(range)
			&& selected.length === shared.length
			&& selected.every((id, index) => id === shared[index])
			&& String(state.share.rangeStart || "") === isoDate(range.start)
			&& String(state.share.rangeEnd || "") === isoDate(range.end);
	}

	function activeShareUrl() {
		return shareMatchesSelection() ? state.share.url : "";
	}

	function setShareBusy(busy) {
		modal.querySelectorAll("[data-driver-share-action]").forEach((button) => {
			button.disabled = busy;
		});
	}

	function notifyShareChanged() {
		if (!state?.driver?.id) return;
		window.dispatchEvent(new CustomEvent("rux:driver-schedule-share-changed", {
			detail: { driverId: state.driver.id },
		}));
	}

	function renderShareControls() {
		if (!modal || !state) return;
		const empty = modal.querySelector("[data-driver-share-empty]");
		const active = modal.querySelector("[data-driver-share-active]");
		const createButton = modal.querySelector("[data-driver-share-create]");
		const updateButton = modal.querySelector("[data-driver-share-update]");
		const missingReliefTime = selectedReliefWithoutTime();
		const tooManyAssignments = selectionLimitExceeded();
		if (!state.share) {
			empty.hidden = false;
			active.hidden = true;
			createButton.disabled = !selectedEntries().length || Boolean(missingReliefTime) || tooManyAssignments;
			modal.querySelector("[data-driver-share-state]").textContent = tooManyAssignments
				? `Choose no more than ${MAX_SHARED_ASSIGNMENTS} assignments`
				: missingReliefTime
					? `Set ${driverName(state.driver)}’s relief swap time before sharing`
					: "";
			return;
		}
		empty.hidden = true;
		active.hidden = false;
		modal.querySelector("[data-driver-share-url]").value = state.share.url;
		const current = shareMatchesSelection();
		modal.querySelector("[data-driver-share-state]").textContent = tooManyAssignments
			? `Choose no more than ${MAX_SHARED_ASSIGNMENTS} assignments`
			: missingReliefTime
				? `Set ${driverName(state.driver)}’s relief swap time before updating`
				: current
					? "Live link · selected trips are up to date"
					: "Selection changed · update the link before sending";
		updateButton.hidden = current;
		updateButton.disabled = !selectedEntries().length || Boolean(missingReliefTime) || tooManyAssignments;
	}

	async function createOrUpdateShare(update = false) {
		const assignmentIds = selectedAssignmentIds();
		const range = syncSelectedRange();
		if (
			!assignmentIds.length
			|| !range
			|| selectedReliefWithoutTime()
			|| selectionLimitExceeded()
		) return;
		setShareBusy(true);
		const functionName = update ? "update_driver_schedule_share" : "create_driver_schedule_share";
		const params = {
			p_assignment_ids: assignmentIds,
			p_range_start: isoDate(range.start),
			p_range_end: isoDate(range.end),
		};
		if (update) params.p_token = state.share.token;
		else params.p_driver_id = state.driver.id;
		const { data, error } = await supabase.rpc(functionName, params);
		setShareBusy(false);
		if (error || !data?.token) {
			console.error("Could not save driver schedule link:", error);
			window.Rux?.toast?.(
				error?.code === "PGRST202" || error?.code === "42883"
					? "Run driver-schedule-shares-patch.sql in Supabase first"
					: "Could not create the driver link",
				{ duration: 4200 },
			);
			return;
		}
		state.share = { ...data, url: shareUrl(data.token) };
		try {
			localStorage.setItem(shareStorageKey(), data.token);
		} catch (_) {}
		renderShareControls();
		refreshPreview();
		notifyShareChanged();
		window.Rux?.toast?.(update ? "Driver link updated" : "Driver link activated");
	}

	async function revokeShare() {
		if (!state?.share) return;
		if (!confirm("Deactivate this driver schedule link? It will stop opening immediately, but reactivating it will use the same URL.")) return;
		setShareBusy(true);
		const { data, error } = await supabase.rpc("revoke_driver_schedule_share", {
			p_token: state.share.token,
		});
		setShareBusy(false);
		if (error || !data) {
			window.Rux?.toast?.("Could not revoke the driver link");
			return;
		}
		try {
			localStorage.removeItem(shareStorageKey());
			localStorage.removeItem(legacyShareStorageKey());
		} catch (_) {}
		state.share = null;
		renderShareControls();
		refreshPreview();
		notifyShareChanged();
		window.Rux?.toast?.("Driver link deactivated");
	}

	async function restoreShare() {
		if (!state) return;
		const requestedState = state;
		let { data, error } = await supabase.rpc("get_driver_schedule_share_for_driver", {
			p_driver_id: requestedState.driver.id,
		});

		// Compatibility fallback while the stable-link database patch is being
		// deployed, and for tokens saved under the former driver+range key.
		if (!data) {
			let storedToken = "";
			try {
				storedToken = localStorage.getItem(shareStorageKey())
					|| localStorage.getItem(legacyShareStorageKey())
					|| "";
			} catch (_) {}
			if (storedToken) {
				const fallback = await supabase.rpc("get_driver_schedule_share", {
					p_token: storedToken,
				});
				data = fallback.data;
				error = fallback.error;
			}
		}

		if (state !== requestedState) return;
		if (!error && data?.token && String(data.driver?.id) === String(state.driver.id)) {
			state.share = { ...data, url: shareUrl(data.token) };
			try {
				localStorage.setItem(shareStorageKey(), data.token);
				localStorage.removeItem(legacyShareStorageKey());
			} catch (_) {}
			const sharedRefs = new Set((data.assignmentRefs || []).map(assignmentRefKey));
			state.selected = new Set(
				state.entries
					.filter((entry) => sharedRefs.has(assignmentRefKey({
						tripId: String(entry.trip.id),
						leg: entry.leg,
					})))
					.map((entry) => entry.key),
			);
			syncSelectedRange();
			updateRangeLabel();
			renderTrips();
			refreshPreview();
		}
		renderShareControls();
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
				phone: item.drivers?.phone || item.phone || "",
				role: item.role,
				reportTime: item.report_time || item.reportTime || "",
				instructions: item.instructions || "",
				status: item.driver_status || "off",
				statusSource: item.driver_status_source || "dispatcher",
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
		const range = syncSelectedRange();
		textarea.value = buildMessage(
			selected,
			state.driver,
			range?.start,
			range?.end,
			false,
			activeShareUrl(),
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
			empty.textContent = "No current or upcoming assignments for this driver.";
			host.appendChild(empty);
			return;
		}

		const showMonthGroups = state.entries.length > 6;
		let previousMonth = "";
		state.entries.forEach((entry) => {
			const entryDate = parseIsoDate(entry.startDate);
			const monthKey = entryDate
				? `${entryDate.getFullYear()}-${entryDate.getMonth()}`
				: "";
			if (showMonthGroups && monthKey && monthKey !== previousMonth) {
				const monthHeading = document.createElement("h4");
				monthHeading.className = "rux-driver-week-info__month";
				monthHeading.textContent = entryDate.toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});
				host.appendChild(monthHeading);
				previousMonth = monthKey;
			}
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
					<button type="button" class="rux-button rux-button--default rux-button--icon" data-rux-dismiss aria-label="Close driver info">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</header>
				<div class="rux-modal__body rux-driver-week-info__body">
					<section class="rux-driver-week-info__section">
						<div class="rux-driver-week-info__list-heading">
							<h3 class="rux-driver-week-info__section-title">Assignments to include</h3>
							<span class="rux-driver-week-info__list-scope">Current &amp; upcoming</span>
						</div>
						<div class="rux-driver-week-info__trips" data-driver-info-trips></div>
					</section>
					<section class="rux-driver-week-info__section">
						<div class="rux-driver-week-info__share">
							<div class="rux-driver-week-info__share-heading">
								<h3 class="rux-driver-week-info__section-title">Driver link</h3>
								<span class="rux-driver-week-info__share-state" data-driver-share-state></span>
							</div>
							<div data-driver-share-empty>
								<p class="rux-driver-week-info__share-copy">Activate this driver’s permanent mobile link for the checked assignments, itineraries, directions, and envelopes.</p>
								<button type="button" class="rux-button rux-button--accent rux-button--sm" data-driver-share-action="create" data-driver-share-create>
									<span class="rux-icon" aria-hidden="true">link</span><span>Activate driver link</span>
								</button>
							</div>
							<div data-driver-share-active hidden>
								<div class="rux-driver-week-info__share-url-row">
									<input class="rux-input" type="text" readonly data-driver-share-url aria-label="Driver schedule link" />
									<button type="button" class="rux-button rux-button--accent rux-button--sm" data-driver-share-action="update" data-driver-share-update hidden>Update link</button>
								</div>
								<div class="rux-driver-week-info__share-actions">
									<button type="button" class="rux-button rux-button--default rux-button--sm" data-driver-share-action="copy"><span class="rux-icon" aria-hidden="true">content_copy</span>Copy link</button>
									<button type="button" class="rux-button rux-button--default rux-button--sm" data-driver-share-action="preview"><span class="rux-icon" aria-hidden="true">open_in_new</span>Preview</button>
									<button type="button" class="rux-button rux-button--outline rux-button--danger rux-button--sm" data-driver-share-action="revoke">Deactivate</button>
								</div>
							</div>
						</div>
						<h3 class="rux-driver-week-info__section-title rux-driver-week-info__preview-title">Message preview</h3>
						<textarea class="rux-textarea rux-driver-week-info__preview" readonly data-driver-info-preview aria-label="Driver message preview"></textarea>
					</section>
				</div>
				<footer class="rux-modal__footer">
					<button type="button" class="rux-button rux-button--default" data-rux-dismiss>Close</button>
					<button type="button" class="rux-button rux-button--accent" data-driver-info-copy-week>
						<span class="rux-icon" aria-hidden="true">content_copy</span>
						<span>Copy message</span>
					</button>
				</footer>
			</section>`;
		document.body.appendChild(modal);

		modal.addEventListener("change", (event) => {
			const check = event.target.closest("input[data-entry-key]");
			if (!check || !state) return;
			if (check.checked) state.selected.add(check.dataset.entryKey);
			else state.selected.delete(check.dataset.entryKey);
			syncSelectedRange();
			updateRangeLabel();
			renderShareControls();
			refreshPreview();
		});

		modal.addEventListener("click", async (event) => {
			const shareAction = event.target.closest("[data-driver-share-action]");
			if (shareAction) {
				const action = shareAction.dataset.driverShareAction;
				if (action === "create") await createOrUpdateShare(false);
				else if (action === "update") await createOrUpdateShare(true);
				else if (action === "copy") await copyText(state.share?.url || "");
				else if (action === "preview" && state.share?.url) {
					window.open(state.share.url, "_blank", "noopener");
				} else if (action === "revoke") await revokeShare();
				return;
			}
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
					buildMessage([entry], state.driver, state.rangeStart, state.rangeEnd, true, ""),
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

	function updateRangeLabel() {
		const range = selectedRange();
		const assignmentCount = selectedEntries().length;
		modal.querySelector("[data-driver-info-range]").textContent = [
			range
				? `${fmtRange(range.start, range.end)} · ${assignmentCount} ${assignmentCount === 1 ? "assignment" : "assignments"}`
				: "No assignments selected",
			state.driver.phone,
		].filter(Boolean).join(" · ");
	}

	function open({ driver, trips, weekStart = new Date(), viewDays = 21, buses = [] }) {
		if (!driver) return;
		ensureModal();
		const legacyRangeStart = new Date(weekStart);
		legacyRangeStart.setHours(0, 0, 0, 0);
		const legacyRangeEnd = addDays(
			legacyRangeStart,
			Math.max(1, Number(viewDays) || 21) - 1,
		);
		const entries = entriesForDriver({ driver, trips });
		const range = rangeForEntries(entries);
		state = {
			driver,
			buses,
			trips,
			entries,
			rangeStart: range?.start || legacyRangeStart,
			rangeEnd: range?.end || legacyRangeEnd,
			legacyRangeStart,
			legacyRangeEnd,
			selected: new Set(entries.map((entry) => entry.key)),
			share: null,
		};

		modal.querySelector("[data-driver-info-title]").textContent = `Driver Info · ${fullDriverName(driver)}`;
		updateRangeLabel();
		renderTrips();
		renderShareControls();
		refreshPreview();
		window.Rux?.openModal?.(modal);
		restoreShare();
	}

	window.DriverWeekInfo = { open };
})();
