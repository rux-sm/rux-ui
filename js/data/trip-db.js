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

	function syncBusCount(root, count) {
		const value = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
		const input = root.querySelector("#tp-buses");
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

		return {
			customer:             fieldVal(root, "tp-customer"),
			destination:          fieldVal(root, "tp-destination"),
			start_date:           fieldVal(root, "tp-start"),
			end_date:             fieldVal(root, "tp-end"),
			trip_type:            root.querySelector("#tp-one-way")?.getAttribute("aria-pressed") === "true"
			                        ? "one_way"
			                        : "round_trip",

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

	function collectAssignments(root) {
		const busCount = busCountVal(root);
		const assignments = [];

		for (let i = 0; i < busCount; i++) {
			const busId = root.querySelector(`[name="buses[${i}].busId"]`)?.value || null;
			if (!busId) continue;

			const driverRoles = [
				{ role: "driver",       nameField: `buses[${i}].driver.name`,  payField: `buses[${i}].driver.pay`  },
				{ role: "co-driver",    nameField: `buses[${i}].coDriver.name`, payField: `buses[${i}].coDriver.pay` },
				{ role: "relief-start", nameField: `buses[${i}].relief1.name`,  payField: `buses[${i}].relief1.pay`  },
				{ role: "relief-end",   nameField: `buses[${i}].relief2.name`,  payField: `buses[${i}].relief2.pay`  },
			];

			const drivers = driverRoles
				.map(({ role, nameField, payField }) => {
					const driverId = root.querySelector(`[name="${nameField}"]`)?.value || null;
					const pay = parseFloat(root.querySelector(`[name="${payField}"]`)?.value) || null;
					return driverId ? { driver_id: driverId, role, pay } : null;
				})
				.filter(Boolean);

			const busGroup = root.querySelectorAll(".rux-trip-panel__bus-group")[i];
			const activeRoles = [];
			if (busGroup) {
				const roleMap = { coDriver: "co-driver", relief1: "relief-start", relief2: "relief-end" };
				// Driver role label state
				const driverLabel = busGroup.querySelector(".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label");
				const driverState = driverLabel?.dataset.roleState || "default";
				activeRoles.push(driverState !== "default" ? `driver:${driverState}` : "driver");
				// Other role states (only if toggled active)
				busGroup.querySelectorAll("[data-role][aria-pressed='true']").forEach((btn) => {
					const mapped = roleMap[btn.dataset.role];
					if (!mapped) return;
					const roleKey = btn.dataset.role;
					const row = busGroup.querySelector(`[data-role-row="${roleKey}"]`);
					const label = row?.querySelector(".rux-trip-panel__role-label");
					const state = label?.dataset.roleState || "default";
					activeRoles.push(state !== "default" ? `${mapped}:${state}` : mapped);
				});
			} else {
				activeRoles.push("driver");
			}
			assignments.push({ bus_id: busId, position: i, drivers, active_roles: activeRoles });
		}

		return assignments;
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

	function tripRange(tripData) {
		if (!tripData.start_date) return null;
		return {
			start: tripData.start_date,
			end: tripData.end_date || tripData.start_date,
		};
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

	async function findAssignmentConflict(tripData, assignments) {
		const range = tripRange(tripData);
		if (!range || !assignments.length) return null;

		const busIds = new Set(assignments.map((assignment) => assignment.bus_id).filter(Boolean));
		const driverIds = selectedDriverIds(assignments);
		if (!busIds.size && !driverIds.size) return null;

		let query = supabase
			.from("trips")
			.select(`
				id, trip_ref, customer, destination, start_date, end_date,
				trip_assignments(
					id, bus_id,
					buses(id, number),
					trip_drivers(driver_id, drivers(id, name))
				)
			`)
			.lte("start_date", range.end)
			.or(`end_date.gte.${range.start},end_date.is.null`);

		if (currentTripId) query = query.neq("id", currentTripId);

		const { data, error } = await query;
		if (error) throw error;

		for (const trip of data ?? []) {
			const otherStart = trip.start_date;
			const otherEnd = trip.end_date || trip.start_date;
			if (!otherStart || !overlaps(range.start, range.end, otherStart, otherEnd)) continue;

			for (const assignment of trip.trip_assignments ?? []) {
				if (assignment.bus_id && busIds.has(assignment.bus_id)) {
					return {
						label: `Bus ${assignment.buses?.number ?? assignment.bus_id} is already assigned to ${tripLabel(trip)}`,
					};
				}

				for (const driver of assignment.drivers ?? assignment.trip_drivers ?? []) {
					if (driver.driver_id && driverIds.has(driver.driver_id)) {
						return {
							label: `${driver.drivers?.name ?? "A selected driver"} is already assigned to ${tripLabel(trip)}`,
						};
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


		const oneWay    = trip.trip_type === "one_way";
		const oneWayBtn = root.querySelector("#tp-one-way");
		if (oneWayBtn) {
			oneWayBtn.setAttribute("aria-pressed", String(oneWay));
			oneWayBtn.classList.toggle("is-active", oneWay);
		}

		setVal(root, "tp-book-name",   trip.booking_contact_name);
		setVal(root, "tp-book-phone",  trip.booking_contact_phone);
		setVal(root, "tp-book-email",  trip.booking_contact_email);
		const addBtn = root.querySelector("#tp-add-contact");
		for (const i of [1, 2]) {
			if (trip[`trip_contact_${i}_name`] || trip[`trip_contact_${i}_phone`]) {
				if (addBtn && !root.querySelector(`#tp-trip${i}-name`)) addBtn.click();
				setVal(root, `tp-trip${i}-name`,  trip[`trip_contact_${i}_name`]);
				setVal(root, `tp-trip${i}-phone`, trip[`trip_contact_${i}_phone`]);
			}
		}
		setVal(root, "tp-notes",       trip.notes);
		resetPaymentRows(root);
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

	function populatePayments(root, payments) {
		if (!payments?.length) return;
		const paymentRows = root.querySelector("#tp-payment-rows");
		if (!paymentRows) return;
		const sorted = [...payments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
		for (const payment of sorted) {
			const index = paymentRows.querySelectorAll("[data-payment-row]").length;
			const row = document.createElement("div");
			row.className = "rux-trip-panel__payment-row";
			row.dataset.paymentRow = "";
			row.innerHTML = `
				<label class="rux-field__label rux-trip-panel__payment-row-label">Payment ${index + 1}</label>
				<div class="rux-input-group rux-input-group--prefix rux-input-group--suffix rux-input-group--action">
					<span class="rux-input-group__prefix">$</span>
					<input class="rux-input" id="tp-payment-amount-${index + 1}" name="payments[${index}].amount" data-payment-amount type="number" min="0" step="0.01" placeholder="0.00" />
					<span class="rux-input-group__suffix"><button class="rux-trip-panel__payment-fill" type="button" data-payment-fill title="Fill remaining balance"><span class="rux-icon">check_circle</span></button></span>
				</div>
				<input class="rux-input" id="tp-payment-date-${index + 1}" name="payments[${index}].date" data-payment-date type="date" aria-label="Payment date" />
				<select class="rux-select" id="tp-payment-method-${index + 1}" name="payments[${index}].method" data-payment-method aria-label="Payment method">
					<option value="">Method</option>
					<option value="Cash">Cash</option>
					<option value="Check">Check</option>
					<option value="Card">Card</option>
					<option value="ACH">ACH</option>
					<option value="Zelle">Zelle</option>
					<option value="Other">Other</option>
				</select>
				<input class="rux-input" id="tp-payment-ref-${index + 1}" name="payments[${index}].ref" data-payment-ref type="text" placeholder="Reference Number" />`;
			paymentRows.appendChild(row);
			if (payment.amount) row.querySelector("[data-payment-amount]").value = payment.amount;
			if (payment.date) row.querySelector("[data-payment-date]").value = payment.date;
			if (payment.method) row.querySelector("[data-payment-method]").value = payment.method;
			if (payment.ref) row.querySelector("[data-payment-ref]").value = payment.ref;
		}
		
	}

	function populateAssignments(root, assignments) {
		const roleKeyMap = { "driver": "driver", "co-driver": "coDriver", "relief-start": "relief1", "relief-end": "relief2" };
		assignments.forEach((assignment, i) => {
			const slot = assignment.position ?? i;
			const busGroup = root.querySelectorAll(".rux-trip-panel__bus-group")[slot];
			const busSelect = root.querySelector(`[name="buses[${slot}].busId"]`);
			if (busSelect && assignment.bus_id) busSelect.value = assignment.bus_id;

			// Restore active role toggles and label color states
			(assignment.active_roles || ["driver"]).forEach((entry) => {
				const [role, state] = entry.includes(":") ? entry.split(":") : [entry, "default"];
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				if (!busGroup) return;

				if (roleKey === "driver") {
					const label = busGroup.querySelector(".rux-trip-panel__driver-row:not([data-role-row]) .rux-trip-panel__role-label");
					if (label && state !== "default") {
						label.dataset.roleState = state;
						label.classList.add(`rux-role--${state}`);
					}
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
						if (label && state !== "default") {
							label.dataset.roleState = state;
							label.classList.add(`rux-role--${state}`);
						}
					}
				}
			});

			(assignment.drivers || []).forEach(({ driver_id, role, pay }) => {
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				const driverSelect = root.querySelector(`[name="buses[${slot}].${roleKey}.name"]`);
				if (driverSelect && driver_id) driverSelect.value = driver_id;
				const payInput = root.querySelector(`[name="buses[${slot}].${roleKey}.pay"]`);
				if (payInput && pay != null) payInput.value = pay;
			});
		});
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
		).forEach((el) => { el.value = ""; });
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
		resetPaymentRows(root);
		root.querySelectorAll("[data-req]").forEach((btn) => {
			btn.setAttribute("aria-pressed", "false");
			btn.classList.remove("is-active");
		});
		const oneWayBtn = root.querySelector("#tp-one-way");
		if (oneWayBtn) {
			oneWayBtn.setAttribute("aria-pressed", "false");
			oneWayBtn.classList.remove("is-active");
		}
		const idEl = root.querySelector("#tp-trip-id");
		if (idEl) idEl.textContent = "";
		const delBtn = root.querySelector("#tp-btn-delete");
		if (delBtn) delBtn.disabled = true;
		syncBusCount(root, 1);
		itinerary.clearStops();
		currentTripId  = null;
		currentTripRef = null;
		currentTripSnapshot = null;
		currentAssignments = [];
		root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
		window.Rux?.syncDateInputs(root);
		root.dispatchEvent(new CustomEvent("rux:trip-cleared", { bubbles: true }));
	}

	/* ── Save ────────────────────────────────────────────────────────────── */

	async function save(root, itinerary, saveBtn) {
		// Freeze identity at call time so a mid-save loadTrip can't corrupt state.
		const savingTripId       = currentTripId;
		const savingTripRef      = currentTripRef;
		const savingSnapshot     = currentTripSnapshot;
		saveBtn.disabled = true;
		saveBtn.textContent = "Saving…";

		try {
			const nextTripData = collectTrip(root);
			const tripData = savingTripId
				? mergeUpdate(nextTripData, savingSnapshot || {})
				: compactPayload(nextTripData);
			const assignments = collectAssignments(root);
			const payments = collectPayments(root);

			if (!tripData.start_date || !tripData.end_date) {
				throw new Error("Start date and end date are required.");
			}
			if (tripData.end_date < tripData.start_date) {
				throw new Error("End date cannot be before start date.");
			}
			if (!tripData.destination?.trim()) {
				throw new Error("Destination is required.");
			}

			if (currentTripId && hasAssignments(currentAssignments) && assignments.length === 0) {
				throw new Error("Bus assignments are not loaded; refusing to overwrite them.");
			}

			const conflict = await findAssignmentConflict(tripData, assignments);
			if (conflict && !confirm(`Conflict detected: ${conflict.label}. Save anyway?`)) {
				saveBtn.innerHTML = '<span class="rux-icon">save</span> Save';
				
				return;
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

			for (const { bus_id, position, drivers, active_roles } of assignments) {
				const { data: assignment, error: assignErr } = await supabase
					.from("trip_assignments")
					.insert({ trip_id: savedId, bus_id, position, active_roles })
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

			// Only update module state if the user hasn't navigated to a different trip mid-save.
			if (currentTripId === savingTripId) {
				currentTripId       = savedId;
				currentTripSnapshot = { ...tripData };
				currentAssignments  = snapshotAssignments(assignments);
			}

			saveBtn.textContent = "Saved ✓";
			const idEl = root.querySelector("#tp-trip-id");
			if (idEl && resolvedRef) idEl.textContent = resolvedRef;
			root.dispatchEvent(new CustomEvent("rux:trip-saved", { bubbles: true, detail: { id: savedId } }));
			if (window.Rux) Rux.toast("Trip saved");
			clearForm(root, itinerary);
			setTimeout(() => {
				saveBtn.innerHTML = '<span class="rux-icon">save</span> Save';
				
			}, 1500);
		} catch (err) {
			console.error("Save failed:", err);
			const isValidation = err instanceof Error && !err.status;
			saveBtn.textContent = "Save failed";
			if (window.Rux) Rux.toast(isValidation ? err.message : "Save failed — check your connection and try again.");
			setTimeout(() => {
				saveBtn.innerHTML = '<span class="rux-icon">save</span> Save';
				
			}, 2000);
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
	const [tripsResult, paymentsResult, docsResult] = await Promise.all([
		supabase
			.from("trips")
			.select(`
				*,
				trip_assignments(
					id, position, bus_id, active_roles,
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

	return (tripsResult.data ?? []).map(trip => ({
		...trip,
		trip_assignments: (trip.trip_assignments ?? []).map(({ trip_drivers, ...a }) => ({
			...a,
			drivers: trip_drivers ?? [],
		})),
		trip_payments: paymentsByTrip.get(trip.id) ?? [],
		trip_documents: docsByTrip.get(trip.id) ?? [],
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
		trip_type:             trip.trip_type     ?? trip.tripType     ?? null,

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
	const busCount = Math.max(1, normalized.bus_count || 0, loadedAssignments.length);
	normalized.bus_count = busCount;

	currentTripId  = UUID_RE.test(String(trip.id ?? "")) ? trip.id : null;
	currentTripRef = trip.trip_ref ?? null;
	const delBtn = root.querySelector("#tp-btn-delete");
	if (delBtn) delBtn.disabled = !currentTripId;
	currentTripSnapshot = { ...normalized };
	currentAssignments = snapshotAssignments(loadedAssignments);

	root.classList.add("rux-trip-panel--loading");

	populateTrip(root, normalized);
	window.Rux?.syncDateInputs(root);
	syncBusCount(root, busCount);

	// Pre-select bus and drivers from the assignment embedded in the trip object
	if (loadedAssignments.length) {
		populateAssignments(root, loadedAssignments);
	}

	populatePayments(root, trip.trip_payments ?? []);
	root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
	populateStops(itinerary, trip.trip_stops ?? trip.stops ?? []);

	if (currentTripId) {
		fetchDocuments(currentTripId).then((docs) => {
			root.dispatchEvent(new CustomEvent("rux:documents-loaded", { bubbles: true, detail: { documents: docs } }));
		}).catch((err) => console.warn("Could not load documents:", err));
	}

	const idEl = root.querySelector("#tp-trip-id");
	if (idEl) idEl.textContent = trip.trip_ref ?? trip.id ?? "";

	root.querySelector(".rux-trip-panel__tabs .rux-button[aria-controls]")?.click();

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

export function initTripDB(root, itinerary) {
	const saveBtn   = root.querySelector("#tp-btn-save");
	const clearBtn  = root.querySelector("#tp-btn-clear");
	const deleteBtn = root.querySelector("#tp-btn-delete");

	let cleanSnapshot = null;

	function snapshotForm() {
		const inputs = root.querySelectorAll(".rux-trip-panel__pane input, .rux-trip-panel__pane textarea, .rux-trip-panel__pane select");
		const toggles = root.querySelectorAll("[data-req], [data-rux-toggle-button], [data-role], .rux-trip-panel__role-label");
		const inputVals = Array.from(inputs).map(el => {
			const key = el.id || el.name || "";
			const val = el.type === "checkbox" ? String(el.checked) : el.value;
			return `${key}=${val}`;
		});
		// Role-status buttons (driver/co-driver/relief click-to-cycle color)
		// track state via dataset.roleState, not aria-pressed like every other
		// toggle here — read whichever the element actually uses. "default" is
		// normalized to the same value as the attribute never having been set
		// at all, so cycling all the way back around reads as clean again.
		const toggleVals = Array.from(toggles).map((el, i) => {
			const key = el.dataset.req || el.id || el.dataset.roleKey || `toggle-${i}`;
			const roleState = el.dataset.roleState;
			const val = roleState !== undefined
				? (roleState === "default" ? "false" : roleState)
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
	});

	saveBtn?.addEventListener("click", async () => {
		try {
			await save(root, itinerary, saveBtn);
			markClean();
		} catch (_) {
			syncSaveBtn();
		}
	});
	clearBtn?.addEventListener("click",  () => {
		if (isFormDirty() && !confirm("Discard unsaved changes?")) return;
		clearForm(root, itinerary);
	});
	deleteBtn?.addEventListener("click", () => deleteTrip(root, itinerary));

	return { isFormDirty };
}
