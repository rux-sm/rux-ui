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

	function setToggle(root, groupId, value) {
		if (!value) return;
		root.querySelectorAll(`#${groupId} .rux-button`).forEach((btn) => {
			const match = btn.textContent.trim() === value;
			btn.setAttribute("aria-pressed", String(match));
			btn.classList.toggle("is-active", match);
		});
	}

	function setReq(root, key, value) {
		const btn = root.querySelector(`[data-req="${key}"]`);
		if (!btn) return;
		btn.setAttribute("aria-pressed", String(!!value));
		btn.classList.toggle("is-active", !!value);
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

	function localIsoDate(date = new Date()) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
			trip_contact_1_name:   fieldVal(root, "tp-trip-name"),
			trip_contact_1_phone:  fieldVal(root, "tp-trip-phone"),
			trip_contact_2_name:   fieldVal(root, "tp-trip2-name"),
			trip_contact_2_phone:  fieldVal(root, "tp-trip2-phone"),
			notes:                 fieldVal(root, "tp-notes"),
			// Billing
			contract_status:  root.querySelector("#tp-contract-signed")?.checked ? "Signed" : "Pending",
			quoted_price:     numVal(root, "tp-price"),
			est_miles:        numVal(root, "tp-est-mi"),
			driving_hours:    numVal(root, "tp-drive-hr"),
			on_duty_hours:    numVal(root, "tp-duty-hr"),
			invoice_status:   fieldVal(root, "tp-inv-num") ? "Invoiced" : "Pending",
			po_ref:           fieldVal(root, "tp-po"),
			invoice_number:   fieldVal(root, "tp-inv-num"),
			date_paid:        fieldVal(root, "tp-date-paid"),
			actual_miles:     numVal(root, "tp-act-mi"),
			payment_ref_1:    fieldVal(root, "tp-pay-ref-1"),
			payment_ref_2:    fieldVal(root, "tp-pay-ref-2"),
			payment_ref_3:    fieldVal(root, "tp-pay-ref-3"),
			deposit_amount:   numVal(root, "tp-deposit"),
			confirmed:        !!(root.querySelector("#tp-contract-signed")?.checked
			                  || fieldVal(root, "tp-po")
			                  || (numVal(root, "tp-deposit") ?? 0) > 0
			                  || fieldVal(root, "tp-date-paid")),
			// Dispatch requirements
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

			assignments.push({ bus_id: busId, position: i, drivers });
		}

		return assignments;
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
		setVal(root, "tp-trip-name",   trip.trip_contact_1_name);
		setVal(root, "tp-trip-phone",  trip.trip_contact_1_phone);
		setVal(root, "tp-trip2-name",  trip.trip_contact_2_name);
		setVal(root, "tp-trip2-phone", trip.trip_contact_2_phone);
		setVal(root, "tp-notes",       trip.notes);
		// Billing
		const contractEl = root.querySelector("#tp-contract-signed");
		if (contractEl) contractEl.checked = (trip.contract_status === "Signed");
		setVal(root, "tp-price",    trip.quoted_price);
		setVal(root, "tp-est-mi",   trip.est_miles);
		setVal(root, "tp-drive-hr", trip.driving_hours);
		setVal(root, "tp-duty-hr",  trip.on_duty_hours);
		setVal(root, "tp-deposit", trip.deposit_amount);
		setVal(root, "tp-po",        trip.po_ref);
		setVal(root, "tp-inv-num",   trip.invoice_number);
		setVal(root, "tp-date-paid", trip.date_paid);
		setVal(root, "tp-act-mi",    trip.actual_miles);
		setVal(root, "tp-pay-ref-1", trip.payment_ref_1);
		setVal(root, "tp-pay-ref-2", trip.payment_ref_2);
		setVal(root, "tp-pay-ref-3", trip.payment_ref_3);
		// Dispatch
		setReq(root, "sleeper",  trip.req_sleeper);
		setReq(root, "pax56",    trip.req_56pax);
		setReq(root, "adaLift",  trip.req_ada);
		setReq(root, "hotel",    trip.need_hotel);
		setReq(root, "fuelCard", trip.need_fuel_card);
	}

	function populateAssignments(root, assignments) {
		const roleKeyMap = { "driver": "driver", "co-driver": "coDriver", "relief-start": "relief1", "relief-end": "relief2" };
		assignments.forEach((assignment, i) => {
			const slot = assignment.position ?? i;
			const busSelect = root.querySelector(`[name="buses[${slot}].busId"]`);
			if (busSelect && assignment.bus_id) busSelect.value = assignment.bus_id;

			(assignment.drivers || []).forEach(({ driver_id, role, pay }) => {
				const roleKey = roleKeyMap[role];
				if (!roleKey) return;
				const driverSelect = root.querySelector(`[name="buses[${slot}].${roleKey}.name"]`);
				if (driverSelect && driver_id) {
					driverSelect.value = driver_id;
					if (roleKey !== "driver") {
						const row = driverSelect.closest("[data-role-row]");
						if (row) row.hidden = false;
						const toggleBtn = root.querySelector(`[data-role="${roleKey}"]`);
						if (toggleBtn) {
							toggleBtn.setAttribute("aria-pressed", "true");
							toggleBtn.classList.add("is-active");
						}
					}
				}
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
		const contractEl = root.querySelector("#tp-contract-signed");
		if (contractEl) contractEl.checked = false;
		setToggle(root, "tp-invoice-group",  "Pending");
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

			if (tripData.start_date && tripData.end_date && tripData.end_date < tripData.start_date) {
				throw new Error("End date cannot be before start date.");
			}

			if (currentTripId && hasAssignments(currentAssignments) && assignments.length === 0) {
				throw new Error("Bus assignments are not loaded; refusing to overwrite them.");
			}

			const conflict = await findAssignmentConflict(tripData, assignments);
			if (conflict && !confirm(`Conflict detected: ${conflict.label}. Save anyway?`)) {
				saveBtn.innerHTML = '<i data-lucide="save" class="rux-icon"></i> Save';
				if (window.lucide) lucide.createIcons();
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

			for (const { bus_id, position, drivers } of assignments) {
				const { data: assignment, error: assignErr } = await supabase
					.from("trip_assignments")
					.insert({ trip_id: savedId, bus_id, position })
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
				saveBtn.innerHTML = '<i data-lucide="save" class="rux-icon"></i> Save';
				if (window.lucide) lucide.createIcons();
			}, 1500);
		} catch (err) {
			console.error("Save failed:", err);
			saveBtn.textContent = "Save failed";
			if (window.Rux) Rux.toast("Save failed — check your connection and try again.");
			setTimeout(() => {
				saveBtn.innerHTML = '<i data-lucide="save" class="rux-icon"></i> Save';
				if (window.lucide) lucide.createIcons();
			}, 2000);
		} finally {
			saveBtn.disabled = false;
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
	const { data, error } = await supabase
		.from("trips")
		.select(`
			*,
			trip_assignments(
				id, position, bus_id,
				buses(id, number),
				trip_drivers(id, driver_id, role, pay, drivers(id, name, short_name))
			),
			trip_stops(*)
		`)
		.order("start_date", { ascending: true });
	if (error) throw error;
	// Normalize Supabase's auto-named join key (trip_drivers) to the app-wide name (drivers).
	return (data ?? []).map(trip => ({
		...trip,
		trip_assignments: (trip.trip_assignments ?? []).map(({ trip_drivers, ...a }) => ({
			...a,
			drivers: trip_drivers ?? [],
		})),
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
		quoted_price:          trip.quoted_price   ?? trip.quotedPrice    ?? null,
		est_miles:             trip.est_miles      ?? trip.estimatedMiles ?? null,
		driving_hours:         trip.driving_hours  ?? null,
		on_duty_hours:         trip.on_duty_hours  ?? null,
		invoice_status:        trip.invoice_status ?? trip.invoiceStatus  ?? null,
		po_ref:                trip.po_ref         ?? trip.paymentRef     ?? null,
		invoice_number:        trip.invoice_number ?? trip.invoiceNumber  ?? null,
		date_paid:             trip.date_paid      ?? trip.datePaid       ?? null,
		actual_miles:          trip.actual_miles   ?? trip.actualMiles    ?? null,
		payment_ref_1:         trip.payment_ref_1  ?? trip.paymentRefs?.[0] ?? null,
		payment_ref_2:         trip.payment_ref_2  ?? trip.paymentRefs?.[1] ?? null,
		payment_ref_3:         trip.payment_ref_3  ?? trip.paymentRefs?.[2] ?? null,
		bus_count:             trip.bus_count      ?? trip.busesNeeded    ?? null,
		req_sleeper:    trip.req_sleeper    ?? false,
		req_56pax:      trip.req_56pax      ?? false,
		req_ada:        trip.req_ada        ?? false,
		need_hotel:     trip.need_hotel     ?? false,
		need_fuel_card: trip.need_fuel_card ?? false,
		confirmed:      trip.confirmed      ?? false,
		deposit_amount: trip.deposit_amount ?? null,
	};
	const loadedAssignments = trip.assignments ?? trip.trip_assignments ?? [];
	const busCount = Math.max(1, normalized.bus_count || 0, loadedAssignments.length);
	normalized.bus_count = busCount;

	currentTripId  = UUID_RE.test(String(trip.id ?? "")) ? trip.id : null;
	currentTripRef = trip.trip_ref ?? null;
	currentTripSnapshot = { ...normalized };
	currentAssignments = snapshotAssignments(loadedAssignments);

	root.classList.add("rux-trip-panel--loading");

	populateTrip(root, normalized);
	root.querySelector("#tp-price")?.dispatchEvent(new Event("input"));
	window.Rux?.syncDateInputs(root);
	syncBusCount(root, busCount);

	// Pre-select bus and drivers from the assignment embedded in the trip object
	if (loadedAssignments.length) {
		populateAssignments(root, loadedAssignments);
	}

	populateStops(itinerary, trip.trip_stops ?? trip.stops ?? []);

	const idEl = root.querySelector("#tp-trip-id");
	if (idEl) idEl.textContent = trip.trip_ref ?? trip.id ?? "";

	root.querySelector(".rux-trip-panel__tabs .rux-button[aria-controls]")?.click();

	requestAnimationFrame(() => root.classList.remove("rux-trip-panel--loading"));
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

export function initTripDB(root, itinerary) {
	const saveBtn   = root.querySelector("#tp-btn-save");
	const clearBtn  = root.querySelector("#tp-btn-clear");
	const deleteBtn = root.querySelector("#tp-btn-delete");

	saveBtn?.addEventListener("click",   () => save(root, itinerary, saveBtn));
	clearBtn?.addEventListener("click",  () => clearForm(root, itinerary));
	deleteBtn?.addEventListener("click", () => deleteTrip(root, itinerary));


	const paidFullBtn = root.querySelector("#tp-paid-full-btn");
	const priceEl     = root.querySelector("#tp-price");

	function syncPaidBtn() {
		if (paidFullBtn) paidFullBtn.disabled = !(parseFloat(priceEl?.value) > 0);
	}
	priceEl?.addEventListener("input", syncPaidBtn);
	syncPaidBtn();

	paidFullBtn?.addEventListener("click", () => {
		const price = priceEl?.value;
		if (price) {
			const depositEl = root.querySelector("#tp-deposit");
			if (depositEl) depositEl.value = price;
		}
		const datePaid = root.querySelector("#tp-date-paid");
		if (datePaid && !datePaid.value) {
			datePaid.value = localIsoDate();
		}
		if (window.lucide) lucide.createIcons();
	});
}
