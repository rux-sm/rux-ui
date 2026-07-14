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

	let currentTripId  = null;
	let currentTripRef = null;
	let currentTripSnapshot = null;
	let currentAssignments = [];
	let currentLoadedTrip = null;

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
		const legacy = {
			default: "off",
			danger: "pending-assignment",
			warning: "pending-response",
			success: "confirmed",
		};
		const normalized = legacy[value] || value || "off";
		return ["off", "pending-assignment", "pending-response", "confirmed"].includes(normalized)
			? normalized
			: "off";
	}

	function restoreDriverStatus(button, value) {
		const state = normalizeDriverStatus(value);
		if (window.TripPanel?.setRoleStatus) {
			window.TripPanel.setRoleStatus(button, state);
			return;
		}
		button.dataset.roleState = state;
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
		return assignments.some((assignment) => assignment.bus_id || (assignment.drivers || []).length);
	}

	function snapshotAssignments(assignments = []) {
		return assignments.map((assignment) => ({
			bus_id: assignment.bus_id ?? null,
			position: assignment.position ?? null,
			drivers: (assignment.trip_drivers || assignment.drivers || []).map((driver) => ({
				driver_id: driver.driver_id ?? null,
				role: driver.role ?? null,
				pay: driver.pay ?? null,
			})),
		}));
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
			trip_contact_1_name:   root.querySelector("#tp-trip1-name")?.value?.trim() || null,
			trip_contact_1_phone:  root.querySelector("#tp-trip1-phone")?.value?.trim() || null,
			trip_contact_2_name:   root.querySelector("#tp-trip2-name")?.value?.trim() || null,
			trip_contact_2_phone:  root.querySelector("#tp-trip2-phone")?.value?.trim() || null,
			notes:                 fieldVal(root, "tp-notes"),
			// Billing
			contract_status:  contractSigned ? "Signed" : "Pending",
			contract_note:    contractSigned ? fieldVal(root, "tp-contract-note") : null,
			quoted_price:     quotedPrice,
			est_miles:        optionalNumVal(root, "tp-est-mi"),
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

			const driverRoles = [
				{ role: "driver",       nameField: `${fieldPrefix}[${i}].driver.name`,  payField: `${fieldPrefix}[${i}].driver.pay`  },
				{ role: "co-driver",    nameField: `${fieldPrefix}[${i}].coDriver.name`, payField: `${fieldPrefix}[${i}].coDriver.pay` },
				{ role: "relief-start", nameField: `${fieldPrefix}[${i}].relief1.name`,  payField: `${fieldPrefix}[${i}].relief1.pay`  },
				{ role: "relief-end",   nameField: `${fieldPrefix}[${i}].relief2.name`,  payField: `${fieldPrefix}[${i}].relief2.pay`  },
			];

			const drivers = driverRoles
				.map(({ role, nameField, payField }) => {
					const driverId = root.querySelector(`[name="${nameField}"]`)?.value || null;
					const pay = parseFloat(root.querySelector(`[name="${payField}"]`)?.value) || null;
					return driverId ? { driver_id: driverId, role, pay } : null;
				})
				.filter(Boolean);

			const busGroup = container?.querySelectorAll(".rux-trip-panel__bus-group")[i];
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
			assignments.push({ bus_id: busId, position: positionOffset + i, drivers, active_roles: activeRoles, leg });
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

	function collectStops(itinerary) {
		return itinerary.getStops().map((s, i) => ({
			position:    i,
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
		}));
	}

	function legacyStopPayload(stop) {
		const {
			lat,
			lng,
			mapbox_id,
			miles_source,
			drive_source,
			route_status,
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
		const contactList = root.querySelector("#tp-contacts-list");
		contactList?.querySelectorAll("[data-trip-contact]").forEach((row) => row.remove());
		root.dispatchEvent(new CustomEvent("rux:contact-row-needed", { bubbles: true }));
		for (const i of [1, 2]) {
			if (trip[`trip_contact_${i}_name`] || trip[`trip_contact_${i}_phone`]) {
				if (!root.querySelector(`#tp-trip${i}-name`)) root.dispatchEvent(new CustomEvent("rux:contact-row-needed", { bubbles: true }));
				setVal(root, `tp-trip${i}-name`,  trip[`trip_contact_${i}_name`]);
				setVal(root, `tp-trip${i}-phone`, trip[`trip_contact_${i}_phone`]);
			}
		}
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
		setVal(root, "tp-est-mi",   trip.est_miles);
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

			// Restore active role toggles and label color states
			(assignment.active_roles || ["driver"]).forEach((entry) => {
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

			(assignment.drivers || []).forEach(({ driver_id, role, pay }) => {
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				const driverSelect = root.querySelector(`[name="${fieldPrefix}[${slot}].${roleKey}.name"]`);
				if (driverSelect && driver_id) driverSelect.value = driver_id;
				const payInput = root.querySelector(`[name="${fieldPrefix}[${slot}].${roleKey}.pay"]`);
				if (payInput && pay != null) payInput.value = pay;
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

	function populateStops(itinerary, rows) {
		const stops = rows
			.sort((a, b) => a.position - b.position)
			.map((r) => ({
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
			}));
		itinerary.setStops(stops);
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
		const defaultTripBarColor = root.querySelector("[name='tripBarColor'][value='']");
		if (defaultTripBarColor) defaultTripBarColor.checked = true;
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
		const savingSnapshot     = currentTripSnapshot;
		const saveAttempt = String(Number(saveBtn.dataset.saveAttempt || 0) + 1);
		saveBtn.dataset.saveAttempt = saveAttempt;
		setSaveButtonState(saveBtn, { busy: true, label: "Saving" });

		try {
			const nextTripData = collectTrip(root);
			const tripData = savingTripId
				? mergeUpdate(nextTripData, savingSnapshot || {})
				: compactPayload(nextTripData);
			const assignments = collectAssignments(root);
			const payments = collectPayments(root);
			const ticketOptions = collectTicketOptions(root);

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
					const { error: driversErr } = await supabase
						.from("trip_drivers")
						.insert(drivers.map(d => ({ ...d, assignment_id: assignment.id })));
					if (driversErr) throw driversErr;
				}
			}

			// Replace stops
			const { error: deleteStopsErr } = await supabase
				.from("trip_stops")
				.delete()
				.eq("trip_id", savedId);
			if (deleteStopsErr) throw deleteStopsErr;
			const stopsData = collectStops(itinerary).map((s) => ({ trip_id: savedId, ...s }));
			if (stopsData.length) {
				const { error: stopsErr } = await supabase.from("trip_stops").insert(stopsData);
				if (stopsErr) {
					const missingOptionalStopColumns = /lat|lng|mapbox_id|miles_source|drive_source|route_status|schema cache|column/i.test(stopsErr.message || "");
					if (!missingOptionalStopColumns) throw stopsErr;
					console.warn("trip_stops optional route columns are missing; saving legacy stop fields only.", stopsErr);
					const legacyStopsData = stopsData.map(legacyStopPayload);
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

			// Only update module state if the user hasn't navigated to a different trip mid-save.
			if (currentTripId === savingTripId) {
				currentTripId       = savedId;
				currentTripSnapshot = { ...tripData };
				currentAssignments  = snapshotAssignments(assignments);
				currentLoadedTrip   = { ...tripData, id: savedId };
				syncManifestBtn(root);
			}

			setSaveButtonState(saveBtn, { label: "Saved", icon: "check", disabled: true });
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
		await supabase.from("trips").delete().eq("id", deletedId);
		clearForm(root, itinerary);
		root.dispatchEvent(new CustomEvent("rux:trip-deleted", { bubbles: true, detail: { id: deletedId } }));
		if (window.Rux) Rux.toast("Trip deleted");
	}

	/* ── Fetch ───────────────────────────────────────────────────────────── */

export async function fetchTrips() {
	const [tripsResult, paymentsResult, docsResult, passengersResult, ticketOptionsResult] = await Promise.all([
		supabase
			.from("trips")
			.select(`
				*,
				trip_assignments(
					id, position, bus_id, active_roles, leg,
					buses(id, number),
					trip_drivers(id, driver_id, role, pay, drivers(id, name, short_name))
				),
				trip_stops(*)
			`)
			.order("start_date", { ascending: true }),
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
	if (tripsResult.error) throw tripsResult.error;
	if (paymentsResult.error) throw paymentsResult.error;

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
		trip_assignments: (trip.trip_assignments ?? []).map(({ trip_drivers, ...a }) => ({
			...a,
			drivers: trip_drivers ?? [],
		})),
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
		trip_contact_1_name:   trip.trip_contact_1_name   ?? trip.tripContact?.name    ?? null,
		trip_contact_1_phone:  trip.trip_contact_1_phone  ?? trip.tripContact?.phone   ?? null,
		trip_contact_2_name:   trip.trip_contact_2_name   ?? trip.tripContact2?.name   ?? null,
		trip_contact_2_phone:  trip.trip_contact_2_phone  ?? trip.tripContact2?.phone  ?? null,
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
		confirmed:      trip.confirmed      ?? false,
		po_received:    trip.po_received    ?? false,
		invoiced:       trip.invoiced       ?? false,
		balance_paid:   trip.balance_paid   ?? false,
		deposit_amount: trip.deposit_amount ?? null,
	};
	const loadedAssignments = trip.assignments ?? trip.trip_assignments ?? [];
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

	// Pre-select bus and drivers from the assignment embedded in the trip object
	if (loadedAssignments.length) {
		populateAssignments(root, loadedAssignments);
	}

	populatePayments(root, trip.trip_payments ?? []);
	populateTicketOptions(root, trip.trip_ticket_options ?? []);
	root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
	populateStops(itinerary, trip.trip_stops ?? trip.stops ?? []);

	if (currentTripId) {
		fetchDocuments(currentTripId).then((docs) => {
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
	const { error } = await supabase
		.from("trip_assignments")
		.update({ bus_id: newBusId })
		.eq("id", assignmentId);
	if (error) throw error;
}

/* ── Documents ──────────────────────────────────────────────────────────── */

const BUCKET = "trip-documents";

export function getDocumentUrl(filePath) {
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
	return data?.publicUrl || null;
}

export function getDocumentShortUrl(docId) {
	return `${window.location.origin}/doc.html?id=${docId}`;
}

export async function uploadDocument(tripId, label, file) {
	const ext = file.name.split(".").pop() || "bin";
	const filePath = `${tripId}/${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${ext}`;

	const { error: uploadErr } = await supabase.storage
		.from(BUCKET)
		.upload(filePath, file);
	if (uploadErr) throw uploadErr;

	const { data: doc, error: dbErr } = await supabase
		.from("trip_documents")
		.insert({ trip_id: tripId, label, file_name: file.name, file_path: filePath, file_size: file.size })
		.select("id, label, file_name, file_path")
		.single();
	if (dbErr) throw dbErr;
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

	const ext = file.name.split(".").pop() || "bin";
	const filePath = `${existing.trip_id}/${existing.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${ext}`;

	const { error: uploadErr } = await supabase.storage
		.from(BUCKET)
		.upload(filePath, file);
	if (uploadErr) throw uploadErr;

	const { error: updateErr } = await supabase
		.from("trip_documents")
		.update({ file_name: file.name, file_path: filePath, file_size: file.size })
		.eq("id", docId);
	if (updateErr) throw updateErr;
	return { ...existing, file_name: file.name, file_path: filePath };
}

export async function deleteDocument(docId) {
	const { data: doc } = await supabase
		.from("trip_documents")
		.select("file_path")
		.eq("id", docId)
		.single();
	if (doc?.file_path) {
		await supabase.storage.from(BUCKET).remove([doc.file_path]);
	}
	await supabase.from("trip_documents").delete().eq("id", docId);
}

export async function fetchDocuments(tripId) {
	const { data, error } = await supabase
		.from("trip_documents")
		.select("id, label, file_name, file_path")
		.eq("trip_id", tripId)
		.order("created_at", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export function getCurrentTripId() {
	return currentTripId;
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
		if (saveBtn) saveBtn.disabled = true;
	}

	function isFormDirty() {
		return snapshotForm() !== cleanSnapshot;
	}

	function syncSaveBtn() {
		if (root.classList.contains("rux-trip-panel--loading")) return;
		if (saveBtn) saveBtn.disabled = !isFormDirty();
	}

	markClean();
	root.addEventListener("rux:trip-cleared", markClean);
	root.addEventListener("rux:trip-prefilled", markClean);
	root.addEventListener("rux:trip-loaded", markClean);

	root.addEventListener("input", syncSaveBtn);
	root.addEventListener("change", syncSaveBtn);
	root.addEventListener("click", (e) => {
		if (e.target.closest("[data-req], [data-rux-toggle-button], [data-role], .rux-trip-panel__role-label")) {
			requestAnimationFrame(syncSaveBtn);
		}
		if (e.target.closest("#tp-billing-type-group")) {
			requestAnimationFrame(() => syncManifestBtn(root));
		}
	});

	saveBtn?.addEventListener("click", async () => {
		const saved = await save(root, itinerary, saveBtn);
		if (saved) markClean();
		else syncSaveBtn();
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
