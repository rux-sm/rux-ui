/* ==========================================================================
   RUX UI — TRIP DB
   --------------------------------------------------------------------------
   Supabase persistence for the trip editor panel.
   Wires Save / Clear / Delete footer buttons.

   API
   ---
   initTripDB(root, itinerary)          → wire up footer buttons for a panel
   loadTrip(root, itinerary, trip)      → populate panel from a trip object
   newTrip(root, itinerary)             → clear panel for a new entry
   fetchTrips()                         → load all trips with assignments
   fetchBuses()                         → load all active buses
   fetchDrivers()                       → load all active drivers
   ========================================================================== */

import { supabase } from "./supabase.js";
import { activeAssignmentDrivers } from "../core/trip-assignment-roles.js";
import {
	buildTripHistoryChanges,
	recordTripHistory,
} from "./trip-history-db.js";
import {
	fetchTripDriverStatuses,
	indexTripDriverStatuses,
	mergeAssignmentDriverStatuses,
	normalizeDriverRoleStatus,
	syncTripDriverStatuses,
} from "./trip-driver-status-db.js";

	let currentTripId  = null;
	let currentTripRef = null;
	let currentTripSnapshot = null;
	let currentAssignments = [];
	let currentLoadedTrip = null;
	let currentStopsHydrated = true;
	let driverShareFieldsAvailable = null;

	/* ── Trip ref ────────────────────────────────────────────────────────── */

	async function generateTripRef(startDate) {
		const { count } = await supabase
			.from("trips")
			.select("id", { count: "exact", head: true })
			.eq("start_date", startDate);
		const d  = new Date(startDate + "T00:00:00");
		const yy = String(d.getFullYear()).slice(2);
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `TRP${yy}${mm}${dd}-${String((count ?? 0) + 1).padStart(3, "0")}`;
	}

	/* ── Helpers ─────────────────────────────────────────────────────────── */

	function normalizeDriverStatus(value) {
		return normalizeDriverRoleStatus(value);
	}

	function restoreDriverStatus(button, value, metadata = {}) {
		const state = normalizeDriverStatus(value);
		if (window.TripPanel?.setRoleStatus) {
			window.TripPanel.setRoleStatus(button, state, {
				dirty: false,
				source: metadata.source || "dispatcher",
				updatedAt: metadata.updatedAt || null,
				acceptedAt: metadata.acceptedAt || null,
			});
			return;
		}
		button.dataset.roleState = state;
		button.dataset.statusDirty = "false";
		button.dataset.statusSource = metadata.source || "dispatcher";
		button.dataset.statusUpdatedAt = metadata.updatedAt || "";
		button.dataset.acceptedAt = metadata.acceptedAt || "";
		button.classList.remove(
			"rux-role--pending-assignment",
			"rux-role--pending-response",
			"rux-role--confirmed",
			"rux-role--danger",
			"rux-role--warning",
			"rux-role--success",
		);
		if (state !== "off") button.classList.add(`rux-role--${state}`);
	}

	function restoreSyncedDriverStatuses(root, statusRows = []) {
		const statusByIdentity = new Map(
			statusRows.map((status) => [
				[
					status.driverId,
					status.leg || "outbound",
					status.role || "driver",
				].map(String).join(":"),
				status,
			]),
		);
		const sections = [
			{ selector: "#tp-bus-groups", leg: "outbound" },
			{ selector: "#tp-return-bus-groups", leg: "return" },
		];
		const roleByKey = {
			coDriver: "co-driver",
			relief1: "relief-start",
			relief2: "relief-end",
		};

		for (const section of sections) {
			root.querySelectorAll(
				`${section.selector} .rux-trip-panel__driver-row`,
			).forEach((row) => {
				const role = row.dataset.roleRow
					? roleByKey[row.dataset.roleRow]
					: "driver";
				const select = row.querySelector("select[name$='.name']");
				const label = row.querySelector(".rux-trip-panel__role-label");
				if (!role || !label) return;
				const status = select?.value
					? statusByIdentity.get(
						[select.value, section.leg, role].map(String).join(":"),
					)
					: null;
				restoreDriverStatus(label, status?.status ?? label.dataset.roleState, {
					source: status?.source || label.dataset.statusSource || "dispatcher",
					updatedAt: status
						? status.updatedAt
						: label.dataset.statusUpdatedAt || null,
					acceptedAt: status
						? status.acceptedAt
						: label.dataset.acceptedAt || null,
				});
			});
		}
	}

	function defaultSaveLabel() {
		return "Save";
	}

	function fieldVal(root, id) {
		const el = root.querySelector(`#${id}`);
		return el ? el.value.trim() || null : null;
	}

	function numVal(root, id) {
		const el = root.querySelector(`#${id}`);
		if (!el) return null;
		const v = el.value;
		if (v === "") return null;
		const n = parseFloat(v);
		return Number.isFinite(n) ? n : null;
	}

	function optionalNumVal(root, id) {
		return root.querySelector(`#${id}`) ? numVal(root, id) : undefined;
	}

	// The visible field mirrors the live itinerary total while in auto mode,
	// but only an explicit manual edit is persisted. Keeping calculated miles
	// in trip_stops avoids freezing a duplicate estimate that would immediately
	// become stale the next time the route changes.
	function estimatedMilesOverride(root) {
		const input = root.querySelector("#tp-est-mi");
		if (!input || input.dataset.milesMode !== "manual") return null;
		return numVal(root, "tp-est-mi");
	}

	function setEstimatedMilesField(root, override) {
		const input = root.querySelector("#tp-est-mi");
		if (!input) return;
		const hasOverride = override !== null && override !== undefined && override !== "";
		input.dataset.milesMode = hasOverride ? "manual" : "auto";
		input.value = hasOverride ? override : (input.dataset.calculatedMiles || "");
	}

	function intVal(root, id, fallback = null) {
		const el = root.querySelector(`#${id}`);
		if (!el) return fallback;
		const n = parseInt(el.value, 10);
		return Number.isFinite(n) ? n : fallback;
	}

	function busCountVal(root) {
		return Math.max(1, Math.min(20, intVal(root, "tp-buses", 1)));
	}

	function returnBusCountVal(root) {
		return Math.max(1, Math.min(20, intVal(root, "tp-return-buses", 1)));
	}

	function reqVal(root, key) {
		const btn = root.querySelector(`[data-req="${key}"]`);
		return btn ? btn.getAttribute("aria-pressed") === "true" : false;
	}

	function setVal(root, id, value) {
		const el = root.querySelector(`#${id}`);
		if (el) el.value = value ?? "";
	}

	function setReq(root, key, value) {
		const btn = root.querySelector(`[data-req="${key}"]`);
		if (!btn) return;
		btn.setAttribute("aria-pressed", String(!!value));
		btn.classList.toggle("is-active", !!value);
	}

	function resetPaymentRows(root) {
		const paymentRows = root.querySelector("#tp-payment-rows");
		if (!paymentRows) return;
		paymentRows.dataset.paymentsTouched = "false";
		paymentRows.querySelectorAll("[data-payment-row]").forEach((row) => row.remove());
	}

	function resetTicketOptionRows(root) {
		root.querySelector("#tp-ticket-options-list")
			?.querySelectorAll("[data-ticket-option-row]").forEach((row) => row.remove());
	}

	function syncBusCount(root, count) {
		const value = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
		const input = root.querySelector("#tp-buses");
		if (!input) return;

		input.value = String(value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}

	function syncReturnBusCount(root, count) {
		const value = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
		const input = root.querySelector("#tp-return-buses");
		if (!input) return;

		input.value = String(value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}

	function compactPayload(data) {
		return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
	}

	function mergeUpdate(next, previous = {}) {
		return Object.fromEntries(
			Object.entries(next).map(([key, value]) => [
				key,
				value === undefined ? previous[key] ?? null : value,
			]),
		);
	}

	function hasAssignments(assignments) {
		return assignments.some((assignment) => assignment.bus_id || activeAssignmentDrivers(assignment).length);
	}

	function snapshotAssignments(assignments = []) {
		return assignments.map((assignment) => ({
			bus_id: assignment.bus_id ?? null,
			position: assignment.position ?? null,
			active_roles: cloneHistoryValue(assignment.active_roles ?? ["driver"]),
			leg: assignment.leg ?? "outbound",
			drivers: activeAssignmentDrivers(assignment).map((driver) => ({
				driver_id: driver.driver_id ?? null,
				role: driver.role ?? null,
				pay: driver.pay ?? null,
				report_time: driver.report_time ?? null,
				instructions: driver.instructions ?? null,
			})),
		}));
	}

	function cloneHistoryValue(value) {
		if (value === undefined) return undefined;
		return JSON.parse(JSON.stringify(value));
	}

	async function safelyRecordTripHistory(entry) {
		try {
			return await recordTripHistory(entry);
		} catch (error) {
			// History is additive and must never turn an otherwise successful
			// operational save into a failed trip save. This also lets the app
			// remain usable before trip-history-patch.sql has been installed.
			console.warn("Trip history could not be recorded:", error);
			return null;
		}
	}

	async function fetchTripHistorySnapshot(tripId) {
		const { data, error } = await supabase
			.from("trips")
			.select("id, trip_ref, start_date, end_date, customer, destination")
			.eq("id", tripId)
			.maybeSingle();
		if (error) throw error;
		return data;
	}

	async function safelyRecordTripHistoryForTrip(tripId, entry) {
		try {
			const snapshot = entry.snapshot || await fetchTripHistorySnapshot(tripId);
			return await recordTripHistory({ ...entry, tripId, snapshot });
		} catch (error) {
			console.warn("Trip history could not be recorded:", error);
			return null;
		}
	}

	/* ── Collect ─────────────────────────────────────────────────────────── */

	function collectTrip(root) {
		const billingWorkflow = (window.RuxBilling?.getConfig?.() || {}).workflow || {};
		const billingActive = (key) => billingWorkflow[key]?.active !== false;
		const contractSigned = billingActive("contractSigned") && !!root.querySelector("#tp-contract-signed")?.checked;
		const poReceived = billingActive("poReceived") && !!root.querySelector("#tp-po-received")?.checked;
		const invoiced = !!root.querySelector("#tp-invoiced")?.checked;
		const balancePaid = !!root.querySelector("#tp-balance-paid")?.checked;
		const poRef = poReceived ? fieldVal(root, "tp-po") : null;
		const invoiceNumber = invoiced ? fieldVal(root, "tp-inv-num") : null;
		const datePaid = balancePaid ? fieldVal(root, "tp-date-paid") : null;
		const depositAmount = collectPayments(root).reduce((sum, p) => sum + (p.amount || 0), 0) || null;
		const quotedPrice = numVal(root, "tp-price");
		const billingConfirmed = window.RuxBilling?.isStateConfirmed?.({
			contractSigned,
			poReceived,
			price: quotedPrice,
			paid: depositAmount,
			balance: (quotedPrice ?? 0) - (depositAmount ?? 0),
		});

		const selectedTripType = window.TripPanel?.getTripType(root) || "round_trip";
		const isDropoffPickup = selectedTripType === "dropoff_pickup";

		return {
			customer:             fieldVal(root, "tp-customer"),
			destination:          fieldVal(root, "tp-destination"),
			is_self_organized:    window.TripPanel?.getBillingType(root) === "ticketed",
			start_date:           fieldVal(root, "tp-start"),
			end_date:             fieldVal(root, "tp-end"),
			trip_type:            selectedTripType === "one_way" ? "one_way" : isDropoffPickup ? "dropoff_pickup" : "round_trip",
			trip_bar_color:       root.querySelector("[name='tripBarColor']:checked")?.value || null,

			// Return leg (Drop-off / Pick-up only) — explicitly nulled (dates) or
			// reset to the column default (bus count, which is NOT NULL) when the
			// trip isn't this type, so switching away actually clears stale return
			// data instead of `mergeUpdate` silently preserving it on an edit.
			return_start_date:    isDropoffPickup ? fieldVal(root, "tp-return-start") : null,
			return_end_date:      isDropoffPickup ? fieldVal(root, "tp-return-end") : null,
			return_bus_count:     isDropoffPickup ? returnBusCountVal(root) : 1,

			bus_count:            busCountVal(root),
			booking_contact_name:  fieldVal(root, "tp-book-name"),
			booking_contact_phone: fieldVal(root, "tp-book-phone"),
			booking_contact_email: fieldVal(root, "tp-book-email"),
			// Set by the autofill dropdown (js/panels/trip-panel.js) when a saved
			// contact is picked, and cleared the moment the name is hand-edited
			// afterward — save() below re-resolves whenever this is empty, so a
			// stale link never survives editing the name into someone else.
			booking_contact_id:    root.querySelector("#tp-book-name")?.dataset.contactId || null,
			trip_contact_1_name:   root.querySelector("#tp-trip1-name")?.value?.trim() || null,
			trip_contact_1_phone:  root.querySelector("#tp-trip1-phone")?.value?.trim() || null,
			trip_contact_1_id:     root.querySelector("#tp-trip1-name")?.dataset.contactId || null,
			trip_contact_2_name:   root.querySelector("#tp-trip2-name")?.value?.trim() || null,
			trip_contact_2_phone:  root.querySelector("#tp-trip2-phone")?.value?.trim() || null,
			trip_contact_2_id:     root.querySelector("#tp-trip2-name")?.dataset.contactId || null,
			notes:                 fieldVal(root, "tp-notes"),
			// Billing
			contract_status:  contractSigned ? "Signed" : "Pending",
			contract_note:    contractSigned ? fieldVal(root, "tp-contract-note") : null,
			quoted_price:     quotedPrice,
			est_miles:        estimatedMilesOverride(root),
			driving_hours:    optionalNumVal(root, "tp-drive-hr"),
			on_duty_hours:    optionalNumVal(root, "tp-duty-hr"),
			invoice_status:   invoiced ? "Invoiced" : "Pending",
			po_ref:           poRef,
			invoice_number:   invoiceNumber,
			date_paid:        datePaid,
			actual_miles:     optionalNumVal(root, "tp-act-mi"),
			deposit_amount:   depositAmount,
			confirmed:        billingConfirmed ?? !!(contractSigned
			                  || poRef
			                  || (depositAmount ?? 0) > 0
			                  || datePaid),
			// Billing status flags
			po_received:  poReceived,
			invoiced:     invoiced,
			balance_paid: balancePaid,
			// Dispatch requirements — JSONB map + legacy boolean columns
			trip_reqs: (() => {
				const map = {};
				root.querySelectorAll("[data-req]").forEach(btn => {
					if (btn.getAttribute("aria-pressed") === "true") map[btn.dataset.req] = true;
				});
				return map;
			})(),
			req_sleeper:    reqVal(root, "sleeper"),
			req_56pax:      reqVal(root, "pax56"),
			req_ada:        reqVal(root, "adaLift"),
			need_hotel:     reqVal(root, "hotel"),
			need_fuel_card: reqVal(root, "fuelCard"),
			contact_not_needed:   window.TripPanel?.getContactNotNeeded(root) ?? false,
			itinerary_not_needed: window.TripPanel?.getItineraryNotNeeded(root) ?? false,
		};
	}

	// containerSelector must scope the bus-group lookup to this leg's own
	// section — a root-wide query would misalign indices once a second
	// (return-leg) section exists using the same .rux-trip-panel__bus-group
	// class. positionOffset keeps `position` unique across both legs (they
	// share one trip_assignments set), since legs are numbered continuously
	// rather than each restarting at 0.
	function collectAssignmentsForLeg(root, leg, containerSelector, fieldPrefix, busCount, positionOffset) {
		const container = root.querySelector(containerSelector);
		const assignments = [];

		for (let i = 0; i < busCount; i++) {
			const busId = root.querySelector(`[name="${fieldPrefix}[${i}].busId"]`)?.value || null;
			if (!busId) continue;

			const busGroup = container?.querySelectorAll(".rux-trip-panel__bus-group")[i];
			const driverRoles = [
				{ role: "driver",       roleKey: "driver",   nameField: `${fieldPrefix}[${i}].driver.name`,  payField: `${fieldPrefix}[${i}].driver.pay`  },
				{ role: "co-driver",    roleKey: "coDriver", nameField: `${fieldPrefix}[${i}].coDriver.name`, payField: `${fieldPrefix}[${i}].coDriver.pay` },
				{ role: "relief-start", roleKey: "relief1",  nameField: `${fieldPrefix}[${i}].relief1.name`,  payField: `${fieldPrefix}[${i}].relief1.pay`  },
				{ role: "relief-end",   roleKey: "relief2",  nameField: `${fieldPrefix}[${i}].relief2.name`,  payField: `${fieldPrefix}[${i}].relief2.pay`  },
			];

			const drivers = driverRoles
				.map(({ role, roleKey, nameField, payField }) => {
					const roleIsActive = role === "driver"
						|| busGroup?.querySelector(`[data-role="${roleKey}"]`)?.getAttribute("aria-pressed") === "true";
					if (!roleIsActive) return null;
					const driverId = root.querySelector(`[name="${nameField}"]`)?.value || null;
					const pay = parseFloat(root.querySelector(`[name="${payField}"]`)?.value) || null;
					const reportTime = root.querySelector(
						`[name="${fieldPrefix}[${i}].${roleKey}.reportTime"]`,
					)?.value || null;
					const instructions = root.querySelector(
						`[name="${fieldPrefix}[${i}].${roleKey}.instructions"]`,
					)?.value?.trim() || null;
					return driverId ? {
						driver_id: driverId,
						role,
						pay,
						report_time: reportTime,
						instructions,
					} : null;
				})
				.filter(Boolean);

			const statusButtonForRole = (role) => {
				const roleKey = driverRoles.find((item) => item.role === role)?.roleKey;
				if (!roleKey || !busGroup) return null;
				return role === "driver"
					? busGroup.querySelector(
						".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label",
					)
					: busGroup.querySelector(
						`[data-role-row="${roleKey}"] .rux-trip-panel__role-label`,
					);
			};
			const driverStatuses = drivers.map((driver) => {
				const label = statusButtonForRole(driver.role);
				return {
					driverId: driver.driver_id,
					leg,
					role: driver.role,
					status: normalizeDriverStatus(label?.dataset.roleState),
					dirty: label?.dataset.statusDirty === "true",
				};
			});

			const activeRoles = [];
			if (busGroup) {
				const roleMap = { coDriver: "co-driver", relief1: "relief-start", relief2: "relief-end" };
				// Driver role label state
				const driverLabel = busGroup.querySelector(".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label");
				const driverState = normalizeDriverStatus(driverLabel?.dataset.roleState);
				activeRoles.push(driverState !== "off" ? `driver:${driverState}` : "driver");
				// Other role states (only if toggled active)
				busGroup.querySelectorAll("[data-role][aria-pressed='true']").forEach((btn) => {
					const mapped = roleMap[btn.dataset.role];
					if (!mapped) return;
					const roleKey = btn.dataset.role;
					const row = busGroup.querySelector(`[data-role-row="${roleKey}"]`);
					const label = row?.querySelector(".rux-trip-panel__role-label");
					const state = normalizeDriverStatus(label?.dataset.roleState);
					activeRoles.push(state !== "off" ? `${mapped}:${state}` : mapped);
				});
			} else {
				activeRoles.push("driver");
			}
			assignments.push({
				bus_id: busId,
				position: positionOffset + i,
				drivers,
				driver_statuses: driverStatuses,
				active_roles: activeRoles,
				leg,
			});
		}

		return assignments;
	}

	function collectAssignments(root) {
		const outbound = collectAssignmentsForLeg(root, "outbound", "#tp-bus-groups", "buses", busCountVal(root), 0);
		if (window.TripPanel?.getTripType(root) !== "dropoff_pickup") return outbound;
		const returnLeg = collectAssignmentsForLeg(root, "return", "#tp-return-bus-groups", "returnBuses", returnBusCountVal(root), outbound.length);
		return outbound.concat(returnLeg);
	}

	function collectPayments(root) {
		const rows = root.querySelectorAll("#tp-payment-rows [data-payment-row]");
		return Array.from(rows).map((row, i) => ({
			position: i,
			amount: parseFloat(row.querySelector("[data-payment-amount]")?.value) || null,
			method: row.querySelector("[data-payment-method]")?.value || null,
			date: row.querySelector("[data-payment-date]")?.value || null,
			ref: row.querySelector("[data-payment-ref]")?.value?.trim() || null,
		})).filter(p => p.amount || p.method || p.date || p.ref);
	}

	function collectTicketOptions(root) {
		const rows = root.querySelectorAll("#tp-ticket-options-list [data-ticket-option-row]");
		return Array.from(rows).map((row, i) => ({
			position: i,
			label: row.querySelector("[data-ticket-label]")?.value?.trim() || null,
			price: parseFloat(row.querySelector("[data-ticket-price]")?.value) || null,
		})).filter(o => o.label || o.price);
	}

	function stopRow(s, position, leg) {
		return {
			position,
			leg,
			type:        s.type,
			label:       s.label || null,
			name:        s.name || null,
			address:     s.address || null,
			miles:       s.miles ? parseFloat(s.miles) : null,
			drive:       s.drive || null,
			lat:         s.lat ?? null,
			lng:         s.lng ?? null,
			mapbox_id:   s.mapboxId || null,
			miles_source: s.milesSource || "estimated",
			drive_source: s.driveSource || "estimated",
			route_status: s.routeStatus || "current",
			depart_prev: s.departPrev || null,
			arrive:      s.arrive || null,
			spot:        s.spot || null,
		};
	}

	// Split trips get a second, independent stop list for the return leg
	// (js/components/itinerary.js's Outbound/Inbound toggle) — position stays
	// globally continuous across both legs rather than restarting at 0 per
	// leg, mirroring collectAssignmentsForLeg's positionOffset below (both
	// tables share one trip_id with two legs' rows in it).
	function collectStops(itinerary, includeReturn) {
		const outbound = itinerary.getStops("outbound").map((s, i) => stopRow(s, i, "outbound"));
		if (!includeReturn) return outbound;
		const returnLeg = itinerary.getStops("return").map((s, i) => stopRow(s, outbound.length + i, "return"));
		return outbound.concat(returnLeg);
	}

	function legacyStopPayload(stop) {
		const {
			lat,
			lng,
			mapbox_id,
			miles_source,
			drive_source,
			route_status,
			leg,
			...legacy
		} = stop;
		return legacy;
	}

	// The date range a trip occupies for a given assignment leg. Outbound
	// always uses the trip's primary start/end; return only applies for
	// Drop-off / Pick-up trips and uses the separate return start/end.
	function legRange(tripData, leg) {
		if (leg === "return") {
			if (tripData.trip_type !== "dropoff_pickup" || !tripData.return_start_date) return null;
			return { start: tripData.return_start_date, end: tripData.return_end_date || tripData.return_start_date };
		}
		if (!tripData.start_date) return null;
		return { start: tripData.start_date, end: tripData.end_date || tripData.start_date };
	}

	function overlaps(aStart, aEnd, bStart, bEnd) {
		return aStart <= bEnd && bStart <= aEnd;
	}

	function tripLabel(trip) {
		return [trip.trip_ref, trip.customer, trip.destination].filter(Boolean).join(" — ") || "another trip";
	}

	function selectedDriverIds(assignments) {
		return new Set(
			assignments
				.flatMap((assignment) => assignment.drivers || [])
				.map((driver) => driver.driver_id)
				.filter(Boolean),
		);
	}

	// Correctness note: a real double-booking is about whether two *specific*
	// date ranges overlap for a shared bus/driver — it does not matter
	// whether either side is labeled "outbound" or "return". So this checks
	// every one of our own assignments (each carrying its own leg-appropriate
	// range) against every other trip's assignments (each likewise carrying
	// its own leg-appropriate range), independent of leg-label equality. This
	// also guarantees leg isolation for free: a return-leg assignment's range
	// is far from its own outbound range, so it will never spuriously
	// conflict with something only busy during the outbound window.
	async function findAssignmentConflict(tripData, assignments) {
		if (!assignments.length) return null;

		const ours = assignments
			.map((assignment) => ({ ...assignment, range: legRange(tripData, assignment.leg ?? "outbound") }))
			.filter((assignment) => assignment.range);
		if (!ours.length) return null;

		const busIds = new Set(ours.map((assignment) => assignment.bus_id).filter(Boolean));
		const driverIds = selectedDriverIds(ours);
		if (!busIds.size && !driverIds.size) return null;

		// No date prefilter here (unlike a single-range trip, we'd need to
		// widen it across both legs anyway) — the real check below is a
		// precise per-assignment overlap, so the prefilter would only be an
		// optimization, not a correctness requirement.
		let query = supabase
			.from("trips")
			.select(`
				id, trip_ref, customer, destination, start_date, end_date,
				return_start_date, return_end_date, trip_type,
				trip_assignments(
					id, bus_id, leg,
					buses(id, number),
					trip_drivers(driver_id, drivers(id, name))
				)
			`);

		if (currentTripId) query = query.neq("id", currentTripId);

		const { data, error } = await query;
		if (error) throw error;

		for (const trip of data ?? []) {
			for (const assignment of trip.trip_assignments ?? []) {
				const otherRange = legRange(trip, assignment.leg ?? "outbound");
				if (!otherRange) continue;

				for (const mine of ours) {
					if (!overlaps(mine.range.start, mine.range.end, otherRange.start, otherRange.end)) continue;

					if (assignment.bus_id && mine.bus_id === assignment.bus_id) {
						return {
							label: `Bus ${assignment.buses?.number ?? assignment.bus_id} is already assigned to ${tripLabel(trip)}`,
						};
					}

					const otherDrivers = assignment.drivers ?? assignment.trip_drivers ?? [];
					for (const driver of mine.drivers ?? []) {
						if (!driver.driver_id) continue;
						const match = otherDrivers.find((d) => d.driver_id === driver.driver_id);
						if (match) {
							return {
								label: `${match.drivers?.name ?? "A selected driver"} is already assigned to ${tripLabel(trip)}`,
							};
						}
					}
				}
			}
		}

		return null;
	}

	/* ── Populate ────────────────────────────────────────────────────────── */

	function populateTrip(root, trip) {
		setVal(root, "tp-customer",    trip.customer);
		setVal(root, "tp-destination", trip.destination);
		setVal(root, "tp-start",       trip.start_date);
		setVal(root, "tp-end",         trip.end_date);
		setVal(root, "tp-return-start", trip.return_start_date);
		setVal(root, "tp-return-end",   trip.return_end_date);


		const validTripTypes = ["round_trip", "one_way", "dropoff_pickup"];
		window.TripPanel?.setTripType(root, validTripTypes.includes(trip.trip_type) ? trip.trip_type : "round_trip");
		window.TripPanel?.setBillingType(root, trip.is_self_organized ? "ticketed" : "charter");
		const tripBarColor = ["cyan", "green", "purple", "yellow", "orange", "pink"].includes(trip.trip_bar_color)
			? trip.trip_bar_color
			: "";
		const tripBarColorInput = root.querySelector(`[name="tripBarColor"][value="${tripBarColor}"]`);
		if (tripBarColorInput) tripBarColorInput.checked = true;
		syncManifestBtn(root);

		setVal(root, "tp-book-name",   trip.booking_contact_name);
		setVal(root, "tp-book-phone",  trip.booking_contact_phone);
		setVal(root, "tp-book-email",  trip.booking_contact_email);
		const bookNameInput = root.querySelector("#tp-book-name");
		if (bookNameInput) bookNameInput.dataset.contactId = trip.booking_contact_id || "";
		const contactList = root.querySelector("#tp-contacts-list");
		contactList?.querySelectorAll("[data-trip-contact]").forEach((row) => row.remove());
		root.dispatchEvent(new CustomEvent("rux:contact-row-needed", { bubbles: true }));
		for (const i of [1, 2]) {
			if (trip[`trip_contact_${i}_name`] || trip[`trip_contact_${i}_phone`]) {
				if (!root.querySelector(`#tp-trip${i}-name`)) root.dispatchEvent(new CustomEvent("rux:contact-row-needed", { bubbles: true }));
				setVal(root, `tp-trip${i}-name`,  trip[`trip_contact_${i}_name`]);
				setVal(root, `tp-trip${i}-phone`, trip[`trip_contact_${i}_phone`]);
				const tripContactInput = root.querySelector(`#tp-trip${i}-name`);
				if (tripContactInput) tripContactInput.dataset.contactId = trip[`trip_contact_${i}_id`] || "";
			}
		}
		window.TripPanel?.setContactNotNeeded(root, !!trip.contact_not_needed);
		window.TripPanel?.setItineraryNotNeeded(root, !!trip.itinerary_not_needed);
		setVal(root, "tp-notes",       trip.notes);
		resetPaymentRows(root);
		resetTicketOptionRows(root);
		// Billing — treat legacy `confirmed: true` (no contract_status) as signed
		const contractEl = root.querySelector("#tp-contract-signed");
		if (contractEl) contractEl.checked = trip.contract_status === "Signed"
			|| (trip.contract_status == null && !!trip.confirmed);
		const poReceivedEl = root.querySelector("#tp-po-received");
		if (poReceivedEl) poReceivedEl.checked = !!(trip.po_received || trip.po_ref);
		const invoicedEl = root.querySelector("#tp-invoiced");
		if (invoicedEl) invoicedEl.checked = !!(trip.invoiced || trip.invoice_number || trip.invoice_status === "Invoiced");
		const balancePaidEl = root.querySelector("#tp-balance-paid");
		if (balancePaidEl) balancePaidEl.checked = !!(trip.balance_paid || trip.date_paid);
		setVal(root, "tp-contract-note", trip.contract_note);
		setVal(root, "tp-price",    trip.quoted_price);
		setEstimatedMilesField(root, trip.est_miles);
		setVal(root, "tp-drive-hr", trip.driving_hours);
		setVal(root, "tp-duty-hr",  trip.on_duty_hours);
		setVal(root, "tp-po",        trip.po_ref);
		setVal(root, "tp-inv-num",   trip.invoice_number);
		setVal(root, "tp-date-paid", trip.date_paid);
		setVal(root, "tp-act-mi",    trip.actual_miles);
		// Dispatch requirements — prefer trip_reqs JSONB, fall back to legacy columns
		const tripReqs = trip.trip_reqs && Object.keys(trip.trip_reqs).length
			? trip.trip_reqs
			: { sleeper: trip.req_sleeper, pax56: trip.req_56pax, adaLift: trip.req_ada, hotel: trip.need_hotel, fuelCard: trip.need_fuel_card };
		root.querySelectorAll("[data-req]").forEach(btn => {
			const val = !!tripReqs[btn.dataset.req];
			btn.setAttribute("aria-pressed", String(val));
			btn.classList.toggle("is-active", val);
		});
	}

	const PAYMENT_METHOD_ICONS = { Cash: "universal_currency_alt", Check: "checkbook", Card: "credit_card", ACH: "account_balance", Zelle: "bolt", Other: "more_horiz" };

	// Single-line pill: type icon as Reference prefix · date · amount — mirrors
	// createPaymentRow in trip-panel.js. Method is set via DOM property
	// (not string-interpolated) since it comes from saved trip data here,
	// not a fixed trusted menu list.
	function createPaymentRow(index, method) {
		const row = document.createElement("div");
		row.className = "rux-trip-panel__payment-row";
		row.dataset.paymentRow = "";
		row.innerHTML = `
			<div class="rux-trip-panel__payment-content">
				<div class="rux-trip-panel__payment-reference">
					<span class="rux-icon rux-trip-panel__payment-icon" data-payment-method-icon aria-hidden="true"></span>
					<input type="hidden" data-payment-method id="tp-payment-method-${index + 1}" name="payments[${index}].method" />
					<input class="rux-trip-panel__payment-field rux-trip-panel__payment-input rux-trip-panel__payment-ref" id="tp-payment-ref-${index + 1}" name="payments[${index}].ref" data-payment-ref type="text" placeholder="Reference" aria-label="Reference number" />
				</div>
				<div class="rux-trip-panel__payment-date-control">
					<span class="rux-trip-panel__payment-date-label" data-payment-date-label aria-hidden="true">Date</span>
					<input class="rux-input rux-trip-panel__payment-field rux-trip-panel__payment-input rux-trip-panel__payment-date" id="tp-payment-date-${index + 1}" name="payments[${index}].date" data-payment-date type="date" aria-label="Payment date" />
				</div>
				<div class="rux-input-group rux-input-group--prefix rux-trip-panel__payment-amount">
					<span class="rux-input-group__prefix">$</span>
					<input class="rux-input rux-trip-panel__payment-field" id="tp-payment-amount-${index + 1}" name="payments[${index}].amount" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" aria-label="Amount" />
				</div>
			</div>
			<button type="button" class="rux-trip-panel__payment-select" data-payment-select aria-label="Delete payment">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		const safeMethod = PAYMENT_METHOD_ICONS[method] ? method : "Other";
		const content = row.querySelector(".rux-trip-panel__payment-content");
		row.querySelectorAll("[data-payment-method-icon]").forEach((icon) => {
			icon.textContent = PAYMENT_METHOD_ICONS[safeMethod];
			icon.title = safeMethod;
		});
		content.setAttribute("role", "group");
		content.setAttribute("aria-label", `${safeMethod} payment`);
		row.querySelector("[data-payment-method]").value = safeMethod;
		return row;
	}

	// Payments are optional now (no more mandatory first row) — mirrors
	// Files/Trip Contacts, which also start empty until "+ Add" is used.
	function populatePayments(root, payments) {
		const paymentRows = root.querySelector("#tp-payment-rows");
		if (!paymentRows) return;
		const sorted = [...(payments || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		for (const payment of sorted) {
			const index = paymentRows.querySelectorAll("[data-payment-row]").length;
			const row = createPaymentRow(index, payment.method);
			paymentRows.appendChild(row);
			if (payment.amount) row.querySelector("[data-payment-amount]").value = Number(payment.amount).toFixed(2);
			if (payment.date) {
				row.querySelector("[data-payment-date]").value = payment.date;
				const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(payment.date);
				row.querySelector("[data-payment-date-label]").textContent = match
					? `${match[2]}/${match[3]}/${match[1].slice(-2)}`
					: "Date";
			}
			if (payment.ref) row.querySelector("[data-payment-ref]").value = payment.ref;
		}
		const hasPayments = Boolean(paymentRows.querySelector("[data-payment-row]"));
		paymentRows.style.display = "flex";
		const paymentDeleteBtn = root.querySelector("#tp-payment-delete-btn");
		if (paymentDeleteBtn) paymentDeleteBtn.disabled = !hasPayments;
	}

	// Mirrors createTicketOptionRow's add-button counterpart in trip-panel.js.
	function createTicketOptionRow(index) {
		const row = document.createElement("div");
		row.className = "rux-trip-panel__contact-row";
		row.dataset.ticketOptionRow = "";
		row.innerHTML =
			`<div class="rux-trip-panel__contact-fields">
				<div class="rux-field"><label class="rux-field__label" for="tp-ticket-label-${index + 1}">Option</label><input class="rux-input" id="tp-ticket-label-${index + 1}" data-ticket-label type="text" placeholder="e.g. Single" /></div>
				<div class="rux-field"><label class="rux-field__label" for="tp-ticket-price-${index + 1}">Price</label><div class="rux-input-group rux-input-group--prefix"><span class="rux-input-group__prefix">$</span><input class="rux-input" id="tp-ticket-price-${index + 1}" data-ticket-price type="number" min="0" step="0.01" placeholder="0.00" /></div></div>
			</div>
			<button type="button" class="rux-trip-panel__contact-select" data-ticket-option-select aria-label="Delete option">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`;
		return row;
	}

	function populateTicketOptions(root, options) {
		const list = root.querySelector("#tp-ticket-options-list");
		if (!list) return;
		const sorted = [...(options || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		sorted.forEach((option, i) => {
			const row = createTicketOptionRow(i);
			list.appendChild(row);
			if (option.label) row.querySelector("[data-ticket-label]").value = option.label;
			if (option.price != null) row.querySelector("[data-ticket-price]").value = option.price;
		});
		const ticketDeleteBtn = root.querySelector("#tp-ticket-delete-btn");
		if (ticketDeleteBtn) ticketDeleteBtn.disabled = !sorted.length;
	}

	// slot is this assignment's index *within its own leg* (derived by sorted
	// position, not the raw position value) — positions are numbered
	// continuously across both legs at save time, so the raw value can't be
	// used directly as a per-leg DOM slot index.
	function populateAssignmentsForLeg(root, assignments, containerSelector, fieldPrefix) {
		const roleKeyMap = { "driver": "driver", "co-driver": "coDriver", "relief-start": "relief1", "relief-end": "relief2" };
		const container = root.querySelector(containerSelector);
		const sorted = [...assignments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

		sorted.forEach((assignment, slot) => {
			const busGroup = container?.querySelectorAll(".rux-trip-panel__bus-group")[slot];
			const busSelect = root.querySelector(`[name="${fieldPrefix}[${slot}].busId"]`);
			if (busSelect && assignment.bus_id) busSelect.value = assignment.bus_id;

			// active_roles is authoritative whenever it exists. Older assignments
			// created before that column was populated can still be recovered by
			// inferring their optional roles from the saved driver rows.
			const savedRoles = Array.isArray(assignment.active_roles)
				? assignment.active_roles
				: null;
			const activeRoleEntries = savedRoles ?? [
				"driver",
				...activeAssignmentDrivers(assignment)
					.map((driver) => driver.role)
					.filter((role) => role && role !== "driver"),
			];
			const activeRoleKeys = new Set(
				activeRoleEntries.map((entry) => String(entry).split(":", 1)[0]),
			);

			// Restore active role toggles and label color states.
			activeRoleEntries.forEach((rawEntry) => {
				const entry = String(rawEntry);
				const [role, savedState] = entry.includes(":") ? entry.split(":") : [entry, "off"];
				const state = normalizeDriverStatus(savedState);
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				if (!busGroup) return;

				if (roleKey === "driver") {
					const label = busGroup.querySelector(".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label");
					if (label) restoreDriverStatus(label, state);
				} else {
					const toggleBtn = busGroup.querySelector(`[data-role="${roleKey}"]`);
					if (toggleBtn) {
						toggleBtn.setAttribute("aria-pressed", "true");
						toggleBtn.classList.add("is-active");
					}
					const row = busGroup.querySelector(`[data-role-row="${roleKey}"]`);
					if (row) {
						row.hidden = false;
						const label = row.querySelector(".rux-trip-panel__role-label");
						if (label) restoreDriverStatus(label, state);
					}
				}
			});

			activeAssignmentDrivers(assignment).forEach((driverRow) => {
				const {
					driver_id,
					role,
					pay,
					report_time,
					instructions,
					driver_status,
					driver_status_source,
					driver_status_updated_at,
					driver_accepted_at,
				} = driverRow;
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				// Never hydrate a hidden optional role merely because an old or
				// inconsistent trip_drivers row still exists. The role toggle is the
				// source of truth; primary driver is always available.
				if (role !== "driver" && !activeRoleKeys.has(role)) return;
				const driverSelect = root.querySelector(`[name="${fieldPrefix}[${slot}].${roleKey}.name"]`);
				if (driverSelect && driver_id) driverSelect.value = driver_id;
				const label = role === "driver"
					? busGroup?.querySelector(
						".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label",
					)
					: busGroup?.querySelector(
						`[data-role-row="${roleKey}"] .rux-trip-panel__role-label`,
					);
				if (label) {
					restoreDriverStatus(
						label,
						driver_status ?? label.dataset.roleState,
						{
							source: driver_status_source,
							updatedAt: driver_status_updated_at,
							acceptedAt: driver_accepted_at,
						},
					);
				}
				const payInput = root.querySelector(`[name="${fieldPrefix}[${slot}].${roleKey}.pay"]`);
				if (payInput && pay != null) payInput.value = pay;
				const reportTimeInput = root.querySelector(
					`[name="${fieldPrefix}[${slot}].${roleKey}.reportTime"]`,
				);
				if (reportTimeInput) {
					reportTimeInput.value = report_time ? String(report_time).slice(0, 5) : "";
				}
				const instructionsInput = root.querySelector(
					`[name="${fieldPrefix}[${slot}].${roleKey}.instructions"]`,
				);
				if (instructionsInput) instructionsInput.value = instructions || "";
			});
		});
	}

	function resetAssignmentGroups(root) {
		root.querySelectorAll("#tp-bus-groups .rux-trip-panel__bus-group, #tp-return-bus-groups .rux-trip-panel__bus-group")
			.forEach((group) => {
				group.querySelectorAll("select[name], input[name]").forEach((control) => {
					control.value = "";
				});
				group.querySelectorAll("[data-role]").forEach((button) => {
					button.setAttribute("aria-pressed", "false");
					button.classList.remove("is-active");
				});
				group.querySelectorAll("[data-role-row]").forEach((row) => {
					row.hidden = true;
				});
				group.querySelectorAll(".rux-trip-panel__role-label").forEach((label) => {
					restoreDriverStatus(label, "off");
				});
			});
	}

	function populateAssignments(root, assignments) {
		const outbound = assignments.filter((assignment) => (assignment.leg ?? "outbound") !== "return");
		const returnLeg = assignments.filter((assignment) => assignment.leg === "return");
		populateAssignmentsForLeg(root, outbound, "#tp-bus-groups", "buses");
		if (returnLeg.length) populateAssignmentsForLeg(root, returnLeg, "#tp-return-bus-groups", "returnBuses");
		window.Rux?.syncSelectPlaceholders?.(root);
	}

	function stopFromRow(r) {
		return {
			type:       r.type,
			label:      r.label,
			name:       r.name,
			address:    r.address,
			miles:      r.miles != null ? String(r.miles) : "",
			drive:      r.drive || "",
			lat:        r.lat ?? null,
			lng:        r.lng ?? null,
			mapboxId:   r.mapbox_id || null,
			milesSource: r.miles_source || "estimated",
			driveSource: r.drive_source || "estimated",
			routeStatus: r.route_status === "stale" ? "stale" : "current",
			departPrev: r.depart_prev || "",
			arrive:     r.arrive || "",
			spot:       r.spot || "",
		};
	}

	// Rows missing `leg` (pre-migration data, or the legacy-schema save
	// fallback) default to outbound; split-trip legacy sequences are repaired
	// below when their old concatenated shape can be identified safely.
	function populateStops(itinerary, rows, { splitTrip = false } = {}) {
		// itinerary.js is a singleton reused across every trip opened —
		// force the view back to Outbound before loading this trip's stops,
		// otherwise a Split trip loaded right after another Split trip that
		// was left on "Inbound" would populate outbound data into a buffer
		// instead of the visible array, opening on the wrong leg.
		itinerary.setActiveLeg("outbound");
		let outboundRows = rows
			.filter((r) => (r.leg ?? "outbound") !== "return")
			.sort((a, b) => a.position - b.position);
		let returnRows = rows
			.filter((r) => r.leg === "return")
			.sort((a, b) => a.position - b.position);

		// Before trip_stops.leg existed, split-trip saves fell back to the column's
		// default and both leg sequences became outbound. The old shape is
		// unambiguous when a second Pickup begins after the first Return. Repair it
		// in memory; the next normal save writes the trailing rows back as return.
		if (splitTrip && returnRows.length === 0) {
			const firstReturnIndex = outboundRows.findIndex((row) => row.type === "return");
			const secondPickupIndex = outboundRows.findIndex(
				(row, index) => index > firstReturnIndex && row.type === "pickup",
			);
			if (firstReturnIndex >= 0 && secondPickupIndex > firstReturnIndex) {
				returnRows = outboundRows.slice(secondPickupIndex);
				outboundRows = outboundRows.slice(0, secondPickupIndex);
			}
		}
		itinerary.setStops(outboundRows.map(stopFromRow), "outbound");
		itinerary.setStops(returnRows.map(stopFromRow), "return");
	}

	/* ── Clear form ──────────────────────────────────────────────────────── */


	function clearForm(root, itinerary) {
		root.querySelectorAll(
			"#pane-trip input, #pane-trip textarea, #pane-billing input"
		).forEach((el) => {
			/* Preserve radio option values; clearing `.value` would rewrite every
			   trip-color choice to an empty string for the rest of the session. */
			if (el.type === "radio") {
				el.checked = el.value === "";
				return;
			}
			el.value = "";
		});
		// Reset all bus group selects and pay inputs
		root.querySelectorAll(".rux-trip-panel__bus-group select").forEach(el => { el.value = ""; });
		root.querySelectorAll(".rux-trip-panel__bus-group input[type='number']").forEach(el => { el.value = ""; });
		// Hide non-primary driver role rows
		root.querySelectorAll("[data-role-row]").forEach(row => { row.hidden = true; });
		root.querySelectorAll("[data-role]").forEach(btn => {
			btn.setAttribute("aria-pressed", "false");
			btn.classList.remove("is-active");
		});
		["#tp-contract-signed", "#tp-po-received", "#tp-invoiced", "#tp-balance-paid"].forEach(sel => {
			const el = root.querySelector(sel);
			if (el) el.checked = false;
		});
		window.TripPanel?.setTripType(root, "round_trip");
		window.TripPanel?.setBillingType(root, "charter");
		window.TripPanel?.setContactNotNeeded(root, false);
		window.TripPanel?.setItineraryNotNeeded(root, false);
		const defaultTripBarColor = root.querySelector("[name='tripBarColor'][value='']");
		if (defaultTripBarColor) defaultTripBarColor.checked = true;
		setEstimatedMilesField(root, null);
		resetPaymentRows(root);
		resetTicketOptionRows(root);
		root.querySelectorAll("[data-req]").forEach((btn) => {
			btn.setAttribute("aria-pressed", "false");
			btn.classList.remove("is-active");
		});
		const delBtn = root.querySelector("#tp-btn-delete");
		if (delBtn) delBtn.disabled = true;
		syncBusCount(root, 1);
		syncReturnBusCount(root, 1);
		root.querySelectorAll(".rux-trip-panel__role-label").forEach((button) => {
			restoreDriverStatus(button, "off");
		});
		itinerary.clearStops();
		currentTripId  = null;
		currentTripRef = null;
		currentTripSnapshot = null;
		currentAssignments = [];
		currentLoadedTrip = null;
		currentStopsHydrated = true;
		syncManifestBtn(root);
		root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
		window.Rux?.syncDateInputs(root);
		window.Rux?.syncSelectPlaceholders?.(root);
		root.dispatchEvent(new CustomEvent("rux:trip-cleared", { bubbles: true }));
	}

	/* ── Save ────────────────────────────────────────────────────────────── */

	function setSaveButtonState(saveBtn, { busy = false, label = defaultSaveLabel(), icon = "save", disabled } = {}) {
		const iconEl = saveBtn.querySelector(".rux-button__idle-icon");
		const labelEl = saveBtn.querySelector(".rux-btn-label");

		saveBtn.classList.toggle("rux-button--loading", busy);
		if (busy) {
			saveBtn.setAttribute("aria-busy", "true");
			saveBtn.disabled = true;
		} else {
			saveBtn.removeAttribute("aria-busy");
			if (disabled !== undefined) saveBtn.disabled = disabled;
		}
		if (iconEl) iconEl.textContent = icon;
		if (labelEl) labelEl.textContent = label;
	}

	async function save(root, itinerary, saveBtn) {
		// Freeze identity at call time so a mid-save loadTrip can't corrupt state.
		const savingTripId       = currentTripId;
		const savingTripRef      = currentTripRef;
		const savingSnapshot     = cloneHistoryValue(currentTripSnapshot);
		const savingAssignments  = cloneHistoryValue(currentAssignments) || [];
		const savingLoadedTrip   = cloneHistoryValue(currentLoadedTrip);
		const saveAttempt = String(Number(saveBtn.dataset.saveAttempt || 0) + 1);
		saveBtn.dataset.saveAttempt = saveAttempt;
		setSaveButtonState(saveBtn, { busy: true, label: "Saving" });

		try {
			if (!currentStopsHydrated) {
				throw new Error("Both split-trip itinerary legs were not loaded. Reopen the trip before saving.");
			}
			const nextTripData = collectTrip(root);
			const tripData = savingTripId
				? mergeUpdate(nextTripData, savingSnapshot || {})
				: compactPayload(nextTripData);
			const assignments = collectAssignments(root);
			const payments = collectPayments(root);
			const ticketOptions = collectTicketOptions(root);
			const stopsData = collectStops(
				itinerary,
				tripData.trip_type === "dropoff_pickup",
			);

			if (!tripData.start_date || !tripData.end_date) {
				throw new Error("Start date and end date are required.");
			}
			if (tripData.end_date < tripData.start_date) {
				throw new Error("End date cannot be before start date.");
			}
			if (!tripData.destination?.trim()) {
				throw new Error("Destination is required.");
			}
			if (tripData.trip_type === "dropoff_pickup") {
				if (!tripData.return_start_date || !tripData.return_end_date) {
					throw new Error("Return start and end dates are required for a Drop-off / Pick-up trip.");
				}
				if (tripData.return_end_date < tripData.return_start_date) {
					throw new Error("Return end date cannot be before return start date.");
				}
				if (tripData.return_start_date < tripData.end_date) {
					throw new Error("Return start date must be on or after the outbound end date.");
				}
			}

			if (currentTripId && hasAssignments(currentAssignments) && assignments.length === 0) {
				throw new Error("Bus assignments are not loaded; refusing to overwrite them.");
			}

			const conflict = await findAssignmentConflict(tripData, assignments);
			if (conflict && !confirm(`Conflict detected: ${conflict.label}. Save anyway?`)) {
				setSaveButtonState(saveBtn, { label: defaultSaveLabel(), icon: "save", disabled: false });
				return false;
			}

			await detectDriverShareFields();
			const hasReliefDetails = assignments.some((assignment) =>
				(assignment.drivers || []).some((driver) => driver.report_time || driver.instructions),
			);
			if (!driverShareFieldsAvailable && hasReliefDetails) {
				throw new Error(
					"Run driver-schedule-shares-patch.sql before saving relief meet times or notes.",
				);
			}

			// Generate human-readable ref for new trips only
			if (!savingTripId && tripData.start_date && !savingTripRef) {
				currentTripRef = await generateTripRef(tripData.start_date);
			}
			const resolvedRef = currentTripRef;
			if (resolvedRef) tripData.trip_ref = resolvedRef;

			// Upsert trip record
			const { data: trip, error: tripErr } = await supabase
				.from("trips")
				.upsert(savingTripId ? { id: savingTripId, ...tripData } : tripData)
				.select("id")
				.single();

			if (tripErr) throw tripErr;
			const savedId = trip.id;

			// Replace bus assignments (cascade deletes trip_drivers)
			const { error: deleteAssignmentsErr } = await supabase
				.from("trip_assignments")
				.delete()
				.eq("trip_id", savedId);
			if (deleteAssignmentsErr) throw deleteAssignmentsErr;

			for (const { bus_id, position, drivers, active_roles, leg } of assignments) {
				const { data: assignment, error: assignErr } = await supabase
					.from("trip_assignments")
					.insert({ trip_id: savedId, bus_id, position, active_roles, leg: leg ?? "outbound" })
					.select("id")
					.single();
				if (assignErr) throw assignErr;

				if (drivers.length) {
					const driverRows = drivers.map((driver) => {
						if (driverShareFieldsAvailable) {
							return { ...driver, assignment_id: assignment.id };
						}
						const { report_time, instructions, ...legacyDriver } = driver;
						return { ...legacyDriver, assignment_id: assignment.id };
					});
					const { error: driversErr } = await supabase
						.from("trip_drivers")
						.insert(driverRows);
					if (driversErr) throw driversErr;
				}
			}

			// Assignment rows are intentionally replaced on every save, but role
			// statuses live in a stable table. Non-dirty entries preserve a newer
			// driver acceptance that may have arrived while this form was open;
			// only an icon the dispatcher explicitly clicked may override it.
			try {
				const syncedDriverStatuses = await syncTripDriverStatuses(
					savedId,
					assignments.flatMap((assignment) => assignment.driver_statuses || []),
				);
				restoreSyncedDriverStatuses(root, syncedDriverStatuses);
			} catch (statusError) {
				// Status enrichment must not turn a successful trip write into a
				// failed save. active_roles remains a complete legacy fallback.
				console.warn("Driver statuses could not be synchronized:", statusError);
			}

			// Replace stops
			const { error: deleteStopsErr } = await supabase
				.from("trip_stops")
				.delete()
				.eq("trip_id", savedId);
			if (deleteStopsErr) throw deleteStopsErr;
			const savedStopsData = stopsData.map((stop) => ({ trip_id: savedId, ...stop }));
			if (savedStopsData.length) {
				const { error: stopsErr } = await supabase.from("trip_stops").insert(savedStopsData);
				if (stopsErr) {
					const missingOptionalStopColumns = /lat|lng|mapbox_id|miles_source|drive_source|route_status|schema cache|column/i.test(stopsErr.message || "");
					if (!missingOptionalStopColumns) throw stopsErr;
					console.warn("trip_stops optional route columns are missing; saving legacy stop fields only.", stopsErr);
					const legacyStopsData = savedStopsData.map(legacyStopPayload);
					const { error: legacyStopsErr } = await supabase.from("trip_stops").insert(legacyStopsData);
					if (legacyStopsErr) throw legacyStopsErr;
				}
			}

			// Replace payments
			const { error: deletePaymentsErr } = await supabase
				.from("trip_payments")
				.delete()
				.eq("trip_id", savedId);
			if (deletePaymentsErr) throw deletePaymentsErr;
			if (payments.length) {
				const { error: paymentsErr } = await supabase
					.from("trip_payments")
					.insert(payments.map(p => ({ trip_id: savedId, ...p })));
				if (paymentsErr) throw paymentsErr;
			}

			// Replace ticket pricing options
			const { error: deleteTicketOptionsErr } = await supabase
				.from("trip_ticket_options")
				.delete()
				.eq("trip_id", savedId);
			if (deleteTicketOptionsErr) throw deleteTicketOptionsErr;
			if (ticketOptions.length) {
				const { error: ticketOptionsErr } = await supabase
					.from("trip_ticket_options")
					.insert(ticketOptions.map(o => ({ trip_id: savedId, ...o })));
				if (ticketOptionsErr) throw ticketOptionsErr;
			}

			// Resolve booking/trip contacts against the saved roster. A name typed
			// fresh (no id yet — the autofill dropdown wasn't used, or was picked
			// then hand-edited since) gets matched to an existing contact by
			// phone/name or creates a new one. An already-linked contact is left
			// alone entirely — once linked, the Customers module is the only
			// place that actually edits a contact's info; trip-form edits to its
			// phone/email/client stay local to this trip's own snapshot columns
			// and never write back, so a one-off "different number for this
			// trip" can't silently corrupt someone's permanent roster entry.
			// Non-fatal on failure — the trip itself already saved successfully
			// above, and the contact roster is a convenience layer on top, not
			// something worth failing the whole save over.
			const contactSlots = [
				// client seeds a brand-new booking contact only (matchOrCreateContact's
				// create fallback) — trip_contact_1/2 have no natural client of their
				// own (a day-of chaperone doesn't necessarily work for the same org
				// the trip's Client field names), so they don't pass one at all.
				{ idField: "booking_contact_id", inputId: "tp-book-name", name: tripData.booking_contact_name, phone: tripData.booking_contact_phone, email: tripData.booking_contact_email, id: tripData.booking_contact_id, client: tripData.customer },
				{ idField: "trip_contact_1_id", inputId: "tp-trip1-name", name: tripData.trip_contact_1_name, phone: tripData.trip_contact_1_phone, email: null, id: tripData.trip_contact_1_id },
				{ idField: "trip_contact_2_id", inputId: "tp-trip2-name", name: tripData.trip_contact_2_name, phone: tripData.trip_contact_2_phone, email: null, id: tripData.trip_contact_2_id },
			];
			const contactUpdates = {};
			for (const slot of contactSlots) {
				if (!slot.name) {
					contactUpdates[slot.idField] = null;
					continue;
				}
				if (slot.id) {
					contactUpdates[slot.idField] = slot.id;
					continue;
				}
				try {
					const resolved = await matchOrCreateContact({ name: slot.name, phone: slot.phone, email: slot.email, client: slot.client });
					contactUpdates[slot.idField] = resolved?.id ?? null;
					const input = root.querySelector(`#${slot.inputId}`);
					if (input) input.dataset.contactId = resolved?.id || "";
				} catch (err) {
					console.warn("Contact save failed (non-fatal):", err);
					contactUpdates[slot.idField] = null;
				}
			}
			const { error: contactLinkErr } = await supabase
				.from("trips")
				.update(contactUpdates)
				.eq("id", savedId);
			if (contactLinkErr) {
				console.warn("Linking contacts to trip failed (non-fatal):", contactLinkErr);
			} else {
				Object.assign(tripData, contactUpdates);
			}

			const historyChanges = buildTripHistoryChanges({
				beforeTrip: savingTripId ? savingSnapshot : null,
				afterTrip: tripData,
				beforeAssignments: savingAssignments,
				afterAssignments: snapshotAssignments(assignments),
				beforeStops: savingLoadedTrip?.allTripStops
					?? savingLoadedTrip?.trip_stops
					?? [],
				afterStops: stopsData,
				beforePayments: savingLoadedTrip?.trip_payments ?? [],
				afterPayments: payments,
				beforeTicketOptions: savingLoadedTrip?.trip_ticket_options ?? [],
				afterTicketOptions: ticketOptions,
				options: root.__ruxTripPanelOptions || {},
			});
			await safelyRecordTripHistory({
				tripId: savedId,
				action: savingTripId ? "updated" : "created",
				snapshot: tripData,
				changes: historyChanges,
			});

			// Only update module state if the user hasn't navigated to a different trip mid-save.
			if (currentTripId === savingTripId) {
				currentTripId       = savedId;
				currentTripSnapshot = { ...tripData };
				currentAssignments  = snapshotAssignments(assignments);
				currentLoadedTrip   = { ...tripData, id: savedId };
				syncManifestBtn(root);
			}

			setSaveButtonState(saveBtn, { label: "Saved", icon: "check", disabled: false });
			root.dispatchEvent(new CustomEvent("rux:trip-saved", { bubbles: true, detail: { id: savedId } }));
			if (window.Rux) Rux.toast("Trip saved");
			clearForm(root, itinerary);
			setTimeout(() => {
				if (saveBtn.dataset.saveAttempt === saveAttempt && !saveBtn.hasAttribute("aria-busy")) {
					setSaveButtonState(saveBtn, { label: defaultSaveLabel(), icon: "save" });
				}
			}, 1500);
			return true;
		} catch (err) {
			console.error("Save failed:", err);
			const isValidation = err instanceof Error && !err.status;
			setSaveButtonState(saveBtn, { label: "Save failed", icon: "error", disabled: false });
			if (window.Rux) Rux.toast(isValidation ? err.message : "Save failed — check your connection and try again.");
			setTimeout(() => {
				if (saveBtn.dataset.saveAttempt === saveAttempt && !saveBtn.hasAttribute("aria-busy")) {
					setSaveButtonState(saveBtn, { label: defaultSaveLabel(), icon: "save" });
				}
			}, 2000);
			return false;
		}
	}

	/* ── Delete ──────────────────────────────────────────────────────────── */

	async function deleteTrip(root, itinerary) {
		if (!currentTripId) {
			clearForm(root, itinerary);
			return;
		}
		if (!confirm("Delete this trip? This cannot be undone.")) return;
		const deletedId = currentTripId;
		const deletedSnapshot = cloneHistoryValue(currentLoadedTrip)
			|| cloneHistoryValue(currentTripSnapshot)
			|| { id: deletedId };
		const { error } = await supabase.from("trips").delete().eq("id", deletedId);
		if (error) throw error;
		await safelyRecordTripHistory({
			tripId: deletedId,
			action: "deleted",
			snapshot: deletedSnapshot,
			changes: [{
				field: "trip",
				label: "Trip",
				before: "Active",
				after: "Deleted",
			}],
		});
		clearForm(root, itinerary);
		root.dispatchEvent(new CustomEvent("rux:trip-deleted", { bubbles: true, detail: { id: deletedId } }));
		if (window.Rux) Rux.toast("Trip deleted");
	}

	/* ── Fetch ───────────────────────────────────────────────────────────── */
	function fetchTripRows(includeDriverShareFields = true) {
		const driverShareFields = includeDriverShareFields
			? ", report_time, instructions"
			: "";
		return supabase
			.from("trips")
			.select(`
				*,
				trip_assignments(
					id, position, bus_id, active_roles, leg,
					buses(id, number),
					trip_drivers(id, driver_id, role, pay${driverShareFields}, drivers(id, name, short_name, phone))
				),
				trip_stops(*)
			`)
			.order("start_date", { ascending: true });
	}

	function isMissingDriverShareField(error) {
		const detail = [error?.message, error?.details, error?.hint]
			.filter(Boolean)
			.join(" ");
		return /\b(report_time|instructions)\b/i.test(detail);
	}

	async function detectDriverShareFields() {
		if (driverShareFieldsAvailable !== null) return driverShareFieldsAvailable;
		const { error } = await supabase
			.from("trip_drivers")
			.select("report_time, instructions")
			.limit(1);
		if (error && !isMissingDriverShareField(error)) throw error;
		driverShareFieldsAvailable = !error;
		return driverShareFieldsAvailable;
	}

export async function fetchTrips() {
	let [tripsResult, paymentsResult, docsResult, passengersResult, ticketOptionsResult] = await Promise.all([
		fetchTripRows(true),
		supabase
			.from("trip_payments")
			.select("*")
			.order("position", { ascending: true }),
		supabase
			.from("trip_documents")
			.select("id, trip_id, label, file_name, file_path")
			.order("created_at", { ascending: true }),
		supabase
			.from("trip_passengers")
			.select("*")
			.order("position", { ascending: true }),
		supabase
			.from("trip_ticket_options")
			.select("*")
			.order("position", { ascending: true }),
	]);
	if (tripsResult.error && isMissingDriverShareField(tripsResult.error)) {
		driverShareFieldsAvailable = false;
		console.warn(
			"Relief meet-time columns are not available yet; loading trips without them.",
		);
		tripsResult = await fetchTripRows(false);
	} else if (!tripsResult.error) {
		driverShareFieldsAvailable = true;
	}
	if (tripsResult.error) throw tripsResult.error;
	if (paymentsResult.error) throw paymentsResult.error;

	let canonicalDriverStatuses = [];
	try {
		canonicalDriverStatuses = await fetchTripDriverStatuses(
			(tripsResult.data || []).map((trip) => trip.id),
		);
	} catch (statusError) {
		// Status enrichment is additive. Legacy active_roles still renders the
		// scheduler if the status RPC is temporarily unavailable.
		console.warn("Canonical driver statuses could not be loaded:", statusError);
	}
	const driverStatusesByKey = indexTripDriverStatuses(canonicalDriverStatuses);

	const paymentsByTrip = new Map();
	for (const p of paymentsResult.data ?? []) {
		if (!paymentsByTrip.has(p.trip_id)) paymentsByTrip.set(p.trip_id, []);
		paymentsByTrip.get(p.trip_id).push(p);
	}

	const docsByTrip = new Map();
	for (const d of docsResult?.data ?? []) {
		if (!docsByTrip.has(d.trip_id)) docsByTrip.set(d.trip_id, []);
		docsByTrip.get(d.trip_id).push(d);
	}

	const passengersByTrip = new Map();
	for (const p of passengersResult?.data ?? []) {
		if (!passengersByTrip.has(p.trip_id)) passengersByTrip.set(p.trip_id, []);
		passengersByTrip.get(p.trip_id).push(p);
	}

	const ticketOptionsByTrip = new Map();
	for (const o of ticketOptionsResult?.data ?? []) {
		if (!ticketOptionsByTrip.has(o.trip_id)) ticketOptionsByTrip.set(o.trip_id, []);
		ticketOptionsByTrip.get(o.trip_id).push(o);
	}

	return (tripsResult.data ?? []).map(trip => ({
		...trip,
		trip_assignments: (trip.trip_assignments ?? []).map(({ trip_drivers, ...assignment }) =>
			mergeAssignmentDriverStatuses(
				trip.id,
				{ ...assignment, trip_drivers },
				driverStatusesByKey,
			),
		),
		trip_payments: paymentsByTrip.get(trip.id) ?? [],
		trip_passengers: passengersByTrip.get(trip.id) ?? [],
		trip_documents: docsByTrip.get(trip.id) ?? [],
		trip_ticket_options: ticketOptionsByTrip.get(trip.id) ?? [],
	}));
}

export async function fetchBuses() {
	const { data, error } = await supabase
		.from("buses")
		.select("id, number, sort_order, capacity, type, ada_lift, sleeper, color, status")
		.neq("status", "retired")
		.order("sort_order", { ascending: true, nullsFirst: false })
		.order("number");
	if (error) throw error;
	return data ?? [];
}

export async function fetchDrivers() {
	const { data, error } = await supabase
		.from("drivers")
		.select("id, name, phone")
		.eq("status", "active")
		.order("name");
	if (error) throw error;
	return data ?? [];
}

	/* ── Load ────────────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function loadTrip(root, itinerary, trip) {
	const normalized = {
		customer:              trip.customer,
		destination:           trip.destination,
		start_date:            trip.start_date    ?? trip.startDate    ?? null,
		end_date:              trip.end_date      ?? trip.endDate      ?? null,
		return_start_date:     trip.return_start_date ?? trip.returnStartDate ?? null,
		return_end_date:       trip.return_end_date   ?? trip.returnEndDate   ?? null,
		trip_type:             trip.trip_type     ?? trip.tripType     ?? null,
		trip_bar_color:        trip.trip_bar_color ?? trip.tripBarColor ?? null,
		is_self_organized:     trip.is_self_organized ?? false,

		booking_contact_name:  trip.booking_contact_name  ?? trip.bookingContact?.name  ?? null,
		booking_contact_phone: trip.booking_contact_phone ?? trip.bookingContact?.phone ?? null,
		booking_contact_email: trip.booking_contact_email ?? trip.bookingContact?.email ?? null,
		booking_contact_id:    trip.booking_contact_id ?? null,
		trip_contact_1_name:   trip.trip_contact_1_name   ?? trip.tripContact?.name    ?? null,
		trip_contact_1_phone:  trip.trip_contact_1_phone  ?? trip.tripContact?.phone   ?? null,
		trip_contact_1_id:     trip.trip_contact_1_id ?? null,
		trip_contact_2_name:   trip.trip_contact_2_name   ?? trip.tripContact2?.name   ?? null,
		trip_contact_2_phone:  trip.trip_contact_2_phone  ?? trip.tripContact2?.phone  ?? null,
		trip_contact_2_id:     trip.trip_contact_2_id ?? null,
		notes:                 trip.notes ?? null,
		contract_status:       trip.contract_status ?? null,
		contract_note:         trip.contract_note ?? null,
		quoted_price:          trip.quoted_price   ?? trip.quotedPrice    ?? null,
		est_miles:             trip.est_miles      ?? trip.estimatedMiles ?? null,
		driving_hours:         trip.driving_hours  ?? null,
		on_duty_hours:         trip.on_duty_hours  ?? null,
		invoice_status:        trip.invoice_status ?? trip.invoiceStatus  ?? null,
		po_ref:                trip.po_ref         ?? trip.paymentRef     ?? null,
		invoice_number:        trip.invoice_number ?? trip.invoiceNumber  ?? null,
		date_paid:             trip.date_paid      ?? trip.datePaid       ?? null,
		actual_miles:          trip.actual_miles   ?? trip.actualMiles    ?? null,
		bus_count:             trip.bus_count      ?? trip.busesNeeded    ?? null,
		return_bus_count:      trip.return_bus_count ?? trip.returnBusCount ?? null,
		trip_reqs:      trip.trip_reqs      ?? {},
		req_sleeper:    trip.req_sleeper    ?? false,
		req_56pax:      trip.req_56pax      ?? false,
		req_ada:        trip.req_ada        ?? false,
		need_hotel:     trip.need_hotel     ?? false,
		need_fuel_card: trip.need_fuel_card ?? false,
		contact_not_needed:   trip.contact_not_needed   ?? false,
		itinerary_not_needed: trip.itinerary_not_needed ?? false,
		confirmed:      trip.confirmed      ?? false,
		po_received:    trip.po_received    ?? false,
		invoiced:       trip.invoiced       ?? false,
		balance_paid:   trip.balance_paid   ?? false,
		deposit_amount: trip.deposit_amount ?? null,
	};
	// A scheduler placement without allTripStops is a leg-filtered projection.
	// Mark that load unsafe so the replace-all stop save cannot erase the leg
	// that never reached the editor (also protects already-rendered cached bars).
	currentStopsHydrated = normalized.trip_type !== "dropoff_pickup"
		|| Array.isArray(trip.allTripStops)
		|| !trip.leg;
	// Prefer the complete database relation whenever it is present. Scheduler
	// bars also carry an `assignments` projection for rendering; that projection
	// can be older than allTripsRaw during a realtime refresh and must not win.
	const loadedAssignments = Array.isArray(trip.trip_assignments)
		? trip.trip_assignments
		: (Array.isArray(trip.assignments) ? trip.assignments : []);
	const outboundAssignments = loadedAssignments.filter((a) => (a.leg ?? "outbound") !== "return");
	const returnAssignments = loadedAssignments.filter((a) => a.leg === "return");
	const busCount = Math.max(1, normalized.bus_count || 0, outboundAssignments.length);
	const returnBusCount = Math.max(1, normalized.return_bus_count || 0, returnAssignments.length);
	normalized.bus_count = busCount;
	normalized.return_bus_count = returnBusCount;

	currentTripId  = UUID_RE.test(String(trip.id ?? "")) ? trip.id : null;
	currentTripRef = trip.trip_ref ?? null;
	currentLoadedTrip = trip;
	const delBtn = root.querySelector("#tp-btn-delete");
	if (delBtn) delBtn.disabled = !currentTripId;
	currentTripSnapshot = { ...normalized };
	currentAssignments = snapshotAssignments(loadedAssignments);

	root.classList.add("rux-trip-panel--loading");

	populateTrip(root, normalized);
	window.Rux?.syncDateInputs(root);
	syncBusCount(root, busCount);
	syncReturnBusCount(root, returnBusCount);
	// Bus-count rendering preserves existing cards so user edits survive an
	// interactive count change. A trip load is different: every assignment
	// control must start clean or an optional driver from the previous trip can
	// leak into this one (and, before save-side gating, become persistent).
	resetAssignmentGroups(root);

	// Pre-select bus and drivers from the assignment embedded in the trip object
	populateAssignments(root, loadedAssignments);

	populatePayments(root, trip.trip_payments ?? []);
	populateTicketOptions(root, trip.trip_ticket_options ?? []);
	root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
	// Scheduler bars carry leg-filtered trip_stops for their own summary, plus
	// allTripStops for the editor. Prefer the complete array so opening either
	// the outbound or return placement hydrates both itinerary buffers.
	populateStops(
		itinerary,
		trip.allTripStops ?? trip.trip_stops ?? trip.stops ?? [],
		{ splitTrip: normalized.trip_type === "dropoff_pickup" },
	);
	if (normalized.trip_type === "dropoff_pickup" && trip.leg === "return") {
		itinerary.setActiveLeg("return");
	}

	if (currentTripId) {
		// Freeze which trip this fetch is for — loadTrip() isn't awaited by its
		// callers, so a second loadTrip() (a different trip opened before this
		// one's fetch resolves) can easily land first. Without the guard below,
		// this trip's now-stale response would still fire and repaint the doc
		// list with the WRONG trip's files over whatever the second load just
		// (correctly) populated — and from there, deleting a "duplicate" is
		// actually deleting the other trip's real document.
		const requestedTripId = currentTripId;
		fetchDocuments(requestedTripId).then((docs) => {
			if (currentTripId !== requestedTripId) return;
			root.dispatchEvent(new CustomEvent("rux:documents-loaded", { bubbles: true, detail: { documents: docs } }));
		}).catch((err) => console.warn("Could not load documents:", err));
	}

	root.querySelector("[data-trip-tabs] .rux-tab[aria-controls]")?.click();

	requestAnimationFrame(() => {
		root.classList.remove("rux-trip-panel--loading");
		root.dispatchEvent(new CustomEvent("rux:trip-loaded", { bubbles: true }));
	});
}

export function newTrip(root, itinerary) {
	clearForm(root, itinerary);
}

	/* ── Init ────────────────────────────────────────────────────────────── */

export async function reassignBus(assignmentId, newBusId) {
	const { data: previous, error: previousError } = await supabase
		.from("trip_assignments")
		.select("trip_id, bus_id")
		.eq("id", assignmentId)
		.single();
	if (previousError) throw previousError;
	const { error } = await supabase
		.from("trip_assignments")
		.update({ bus_id: newBusId })
		.eq("id", assignmentId);
	if (error) throw error;
	try {
		const [snapshot, busesResult] = await Promise.all([
			fetchTripHistorySnapshot(previous.trip_id),
			supabase.from("buses").select("id, number").in("id", [previous.bus_id, newBusId].filter(Boolean)),
		]);
		const busNames = new Map((busesResult.data || []).map((bus) => [String(bus.id), String(bus.number)]));
		await safelyRecordTripHistory({
			tripId: previous.trip_id,
			action: "assignment_changed",
			snapshot,
			changes: [{
				field: "bus",
				label: "Bus",
				before: previous.bus_id ? `Bus ${busNames.get(String(previous.bus_id)) || previous.bus_id}` : null,
				after: newBusId ? `Bus ${busNames.get(String(newBusId)) || newBusId}` : null,
			}],
		});
	} catch (historyError) {
		console.warn("Bus reassignment history could not be recorded:", historyError);
	}
}

/* ── Documents ──────────────────────────────────────────────────────────── */

const BUCKET = "trip-documents";

function documentFileSlug(value, fallback) {
	const slug = String(value ?? "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || fallback;
}

function documentFileExtension(file) {
	const match = String(file?.name ?? "").match(/\.([a-z0-9]+)$/i);
	return documentFileSlug(match?.[1], "bin");
}

async function buildDocumentFileName(tripId, label, file) {
	const { data: trip, error } = await supabase
		.from("trips")
		.select("trip_ref, customer, start_date, booking_contact_name, trip_contact_1_name, trip_contact_2_name")
		.eq("id", tripId)
		.single();
	if (error) throw error;

	const date = /^\d{4}-\d{2}-\d{2}$/.test(trip.start_date ?? "")
		? trip.start_date
		: "unknown-date";
	const clientOrName = trip.customer
		|| trip.booking_contact_name
		|| trip.trip_contact_1_name
		|| trip.trip_contact_2_name;
	const tripRef = trip.trip_ref || String(tripId).slice(0, 8);
	const extension = documentFileExtension(file);

	return [
		date,
		documentFileSlug(clientOrName, "unnamed"),
		documentFileSlug(label, "document"),
		documentFileSlug(tripRef, "trip"),
	].join("_") + `.${extension}`;
}

function renamedDocumentFile(file, fileName) {
	return new File([file], fileName, {
		type: file.type,
		lastModified: file.lastModified,
	});
}

export function getDocumentUrl(filePath) {
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
	return data?.publicUrl || null;
}

export function getDocumentShortUrl(docId) {
	return `${window.location.origin}/doc.html?id=${docId}`;
}

export async function uploadDocument(tripId, label, file) {
	const fileName = await buildDocumentFileName(tripId, label, file);
	const uploadFile = renamedDocumentFile(file, fileName);
	const filePath = `${tripId}/${Date.now()}/${fileName}`;

	const { error: uploadErr } = await supabase.storage
		.from(BUCKET)
		.upload(filePath, uploadFile);
	if (uploadErr) throw uploadErr;

	const { data: doc, error: dbErr } = await supabase
		.from("trip_documents")
		.insert({ trip_id: tripId, label, file_name: fileName, file_path: filePath, file_size: uploadFile.size })
		.select("id, label, file_name, file_path, created_at")
		.single();
	if (dbErr) throw dbErr;
	await safelyRecordTripHistoryForTrip(tripId, {
		action: "document_uploaded",
		changes: [{
			field: "document",
			label: "Document",
			before: null,
			after: `${label || "Document"} uploaded`,
		}],
		metadata: { documentId: doc.id, fileName },
	});
	return doc;
}

export async function replaceDocument(docId, file) {
	const { data: existing } = await supabase
		.from("trip_documents")
		.select("file_path, trip_id, label")
		.eq("id", docId)
		.single();
	if (!existing) throw new Error("Document not found");

	await supabase.storage.from(BUCKET).remove([existing.file_path]);

	const fileName = await buildDocumentFileName(existing.trip_id, existing.label, file);
	const uploadFile = renamedDocumentFile(file, fileName);
	const filePath = `${existing.trip_id}/${Date.now()}/${fileName}`;

	const { error: uploadErr } = await supabase.storage
		.from(BUCKET)
		.upload(filePath, uploadFile);
	if (uploadErr) throw uploadErr;

	const { error: updateErr } = await supabase
		.from("trip_documents")
		.update({ file_name: fileName, file_path: filePath, file_size: uploadFile.size })
		.eq("id", docId);
	if (updateErr) throw updateErr;
	await safelyRecordTripHistoryForTrip(existing.trip_id, {
		action: "document_replaced",
		changes: [{
			field: "document",
			label: "Document",
			before: existing.label || "Previous file",
			after: `${existing.label || "Document"} replaced`,
		}],
		metadata: { documentId: docId, fileName },
	});
	return { ...existing, file_name: fileName, file_path: filePath };
}

export async function deleteDocument(docId) {
	const { data: doc } = await supabase
		.from("trip_documents")
		.select("trip_id, label, file_name, file_path")
		.eq("id", docId)
		.single();
	if (doc?.file_path) {
		await supabase.storage.from(BUCKET).remove([doc.file_path]);
	}
	const { error } = await supabase.from("trip_documents").delete().eq("id", docId);
	if (error) throw error;
	if (doc?.trip_id) {
		await safelyRecordTripHistoryForTrip(doc.trip_id, {
			action: "document_deleted",
			changes: [{
				field: "document",
				label: "Document",
				before: doc.label || doc.file_name || "Document",
				after: "Deleted",
			}],
			metadata: { documentId: docId, fileName: doc.file_name },
		});
	}
}

export async function fetchDocuments(tripId) {
	const { data, error } = await supabase
		.from("trip_documents")
		.select("id, label, file_name, file_path, created_at")
		.eq("trip_id", tripId)
		.order("created_at", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export function getCurrentTripId() {
	return currentTripId;
}

/* ── Contacts ────────────────────────────────────────────────────────── */
// Backs both the Customers module (full roster CRUD) and the trip panel's
// booking/trip-contact autofill (search + the match-or-create path below).

export async function fetchContacts() {
	const { data, error } = await supabase
		.from("contacts")
		.select("id, name, phone, email, client")
		.order("name");
	if (error) throw error;
	return data ?? [];
}

export async function searchContacts(query) {
	const q = String(query ?? "").trim();
	if (q.length < 2) return [];
	const { data, error } = await supabase
		.from("contacts")
		.select("id, name, phone, email, client")
		.ilike("name", `%${q}%`)
		.order("name")
		.limit(5);
	if (error) throw error;
	return data ?? [];
}

// client (the business/school/organization this contact represents) is
// deliberately partial-update: only written when the caller actually passes
// it. Every trip-save-driven refresh (below, and inside matchOrCreateContact)
// omits it on purpose — a trip's single Client field can't be trusted to
// describe every contact slot on that trip (the booking contact and a
// day-of chaperone may work for entirely different organizations), so only
// an explicit edit (Customers module, or seeding a brand-new contact at
// creation) should ever touch it.
export async function upsertContact({ id, name, phone, email, client }) {
	const payload = { name, phone: phone || null, email: email || null };
	if (client !== undefined) payload.client = client || null;
	const query = id
		? supabase.from("contacts").update(payload).eq("id", id)
		: supabase.from("contacts").insert(payload);
	const { data, error } = await query.select("id, name, phone, email, client").single();
	if (error) throw error;
	return data;
}

export async function deleteContact(contactId) {
	const { error } = await supabase.from("contacts").delete().eq("id", contactId);
	if (error) throw error;
}

// Trips linked to a contact via any of the three slots — backs the
// Customers module's "past trips" list, the actual payoff of linking
// contacts to trips instead of only ever copying freetext (see
// contacts-patch.sql's header comment).
export async function fetchContactTrips(contactId) {
	const { data, error } = await supabase
		.from("trips")
		.select("id, trip_ref, customer, destination, start_date, end_date")
		.or(`booking_contact_id.eq.${contactId},trip_contact_1_id.eq.${contactId},trip_contact_2_id.eq.${contactId}`)
		.order("start_date", { ascending: false });
	if (error) throw error;
	return data ?? [];
}

// Finds-or-creates a contact for a name/phone/email typed directly into a
// trip's booking/trip-contact fields (as opposed to picked from an autofill
// suggestion, which already carries a real id and goes through
// upsertContact above instead). Matches by phone first — the more reliable
// key when present — falling back to an exact case-insensitive name match,
// so re-typing an existing customer's info without bothering to pick the
// suggestion doesn't spawn a duplicate roster entry.
// client only applies to the create fallback (a brand-new contact has
// nothing better to seed it with) — the two match branches deliberately
// leave an existing contact's client untouched, same reasoning as
// upsertContact's own client handling above.
export async function matchOrCreateContact({ name, phone, email, client }) {
	const trimmedName = String(name ?? "").trim();
	if (!trimmedName) return null;

	if (phone) {
		const { data: byPhone } = await supabase
			.from("contacts")
			.select("id, name, phone, email, client")
			.eq("phone", phone)
			.limit(1)
			.maybeSingle();
		if (byPhone) return upsertContact({ id: byPhone.id, name: trimmedName, phone, email: email || byPhone.email });
	}

	const { data: byName } = await supabase
		.from("contacts")
		.select("id, name, phone, email, client")
		.ilike("name", trimmedName)
		.limit(1)
		.maybeSingle();
	if (byName) return upsertContact({ id: byName.id, name: trimmedName, phone: phone || byName.phone, email: email || byName.email });

	return upsertContact({ name: trimmedName, phone, email, client });
}

// Manifest only makes sense for a saved, ticketed trip — Passenger Roster
// looks passengers up by trip id, and there's nothing to bill/board for a
// charter trip.
function syncManifestBtn(root) {
	const btn = root.querySelector("#tp-view-manifest-btn");
	if (!btn) return;
	const isTicketed = window.TripPanel?.getBillingType(root) === "ticketed";
	const isSaved = !!currentTripId;
	const available = isSaved && isTicketed;
	btn.disabled = !available;
	btn.title = available
		? ""
		: !isTicketed
			? "Toggle Ticketed to enable"
			: "Save this trip to enable";
}

export function initTripDB(root, itinerary) {
	const saveBtn   = root.querySelector("#tp-btn-save");
	const clearBtn  = root.querySelector("#tp-btn-clear");
	const deleteBtn = root.querySelector("#tp-btn-delete");
	const manifestBtn = root.querySelector("#tp-view-manifest-btn");
	const estimatedMilesInput = root.querySelector("#tp-est-mi");

	function syncCalculatedMiles(value) {
		if (!estimatedMilesInput) return;
		estimatedMilesInput.dataset.calculatedMiles = value == null ? "" : String(value);
		if (estimatedMilesInput.dataset.milesMode !== "manual") {
			estimatedMilesInput.dataset.milesMode = "auto";
			estimatedMilesInput.value = estimatedMilesInput.dataset.calculatedMiles;
		}
	}

	estimatedMilesInput?.addEventListener("input", () => {
		if (estimatedMilesInput.value.trim() === "") {
			estimatedMilesInput.dataset.milesMode = "auto";
			estimatedMilesInput.value = estimatedMilesInput.dataset.calculatedMiles || "";
			return;
		}
		estimatedMilesInput.dataset.milesMode = "manual";
	});

	root.addEventListener("rux:itinerary-miles-changed", (event) => {
		syncCalculatedMiles(event.detail?.miles ?? null);
	});

	let cleanSnapshot = null;

	function snapshotForm() {
		const inputs = root.querySelectorAll(".rux-trip-panel__pane input, .rux-trip-panel__pane textarea, .rux-trip-panel__pane select");
		const toggles = root.querySelectorAll("[data-req], [data-rux-toggle-button], [data-role], .rux-trip-panel__role-label");
		const inputVals = Array.from(inputs).map(el => {
			const key = el.id || el.name || "";
			const val = el.type === "checkbox" ? String(el.checked) : el.value;
			return `${key}=${val}`;
		});
		// Role-status buttons use a four-state semantic cycle.
		// Track state via dataset.roleState rather than aria-pressed because
		// this control has four values. Off normalizes to the initial clean state.
		const toggleVals = Array.from(toggles).map((el, i) => {
			const key = el.dataset.req || el.id || el.dataset.roleKey || `toggle-${i}`;
			const roleState = el.dataset.roleState;
			const val = roleState !== undefined
				? (normalizeDriverStatus(roleState) === "off" ? "false" : normalizeDriverStatus(roleState))
				: (el.getAttribute("aria-pressed") || "false");
			return `${key}=${val}`;
		});
		return inputVals.concat(toggleVals).sort().join("\0");
	}

	function markClean() {
		cleanSnapshot = snapshotForm();
	}

	function isFormDirty() {
		return snapshotForm() !== cleanSnapshot;
	}

	markClean();
	root.addEventListener("rux:trip-cleared", markClean);
	root.addEventListener("rux:trip-prefilled", markClean);
	root.addEventListener("rux:trip-loaded", markClean);

	root.addEventListener("click", (e) => {
		if (e.target.closest("#tp-billing-type-group")) {
			requestAnimationFrame(() => syncManifestBtn(root));
		}
	});

	saveBtn?.addEventListener("click", async () => {
		const saved = await save(root, itinerary, saveBtn);
		if (saved) markClean();
	});
	clearBtn?.addEventListener("click",  () => {
		if (isFormDirty() && !confirm("Discard unsaved changes?")) return;
		clearForm(root, itinerary);
	});
	deleteBtn?.addEventListener("click", () => deleteTrip(root, itinerary));
	manifestBtn?.addEventListener("click", () => {
		if (window.TripView?.get() === "manifest") {
			window.TripView.set("calendar");
			return;
		}
		if (!currentLoadedTrip) return;
		window.TripView?.set("manifest");
	});

	return { isFormDirty };
}
