/* ==========================================================================
   RUX UI — TRIP DB
   --------------------------------------------------------------------------
   Supabase persistence for the trip editor panel.
   Wires Save / Clear / Delete footer buttons.

   API
   ---
   initTripDB(root, itinerary)   → wire up footer buttons for a panel
   ========================================================================== */

import { supabase } from "./supabase.js";

	let currentTripId = null;

	/* ── Helpers ─────────────────────────────────────────────────────────── */

	function val(root, id) {
		return root.querySelector(`#${id}`)?.value?.trim() || null;
	}

	function numVal(root, id) {
		const v = root.querySelector(`#${id}`)?.value;
		return v !== "" && v != null ? parseFloat(v) : null;
	}

	function toggleVal(root, groupId) {
		return root.querySelector(`#${groupId} [aria-pressed="true"]`)?.textContent?.trim() || null;
	}

	function reqVal(root, key) {
		return root.querySelector(`[data-req="${key}"]`)?.getAttribute("aria-pressed") === "true";
	}

	function setVal(root, id, value) {
		const el = root.querySelector(`#${id}`);
		if (el && value != null) el.value = value;
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

	/* ── Collect ─────────────────────────────────────────────────────────── */

	function collectTrip(root) {
		return {
			customer:             val(root, "tp-customer"),
			destination:          val(root, "tp-destination"),
			start_date:           val(root, "tp-start"),
			end_date:             val(root, "tp-end"),
			departure_time:       val(root, "tp-dep"),
			spot_time:            val(root, "tp-spot"),
			return_time:          val(root, "tp-return"),
			pickup_address:       val(root, "tp-pickup"),
			bus_count:            parseInt(val(root, "tp-buses")) || 1,
			booking_contact_name:  val(root, "tp-book-name"),
			booking_contact_phone: val(root, "tp-book-phone"),
			booking_contact_email: val(root, "tp-book-email"),
			trip_contact_1_name:   val(root, "tp-trip-name"),
			trip_contact_1_phone:  val(root, "tp-trip-phone"),
			trip_contact_2_name:   val(root, "tp-trip2-name"),
			trip_contact_2_phone:  val(root, "tp-trip2-phone"),
			notes:                 val(root, "tp-notes"),
			// Billing
			contract_status:  toggleVal(root, "tp-contract-group"),
			quoted_price:     numVal(root, "tp-price"),
			est_miles:        numVal(root, "tp-est-mi"),
			driving_hours:    numVal(root, "tp-drive-hr"),
			on_duty_hours:    numVal(root, "tp-duty-hr"),
			invoice_status:   toggleVal(root, "tp-invoice-group"),
			po_ref:           val(root, "tp-po"),
			invoice_number:   val(root, "tp-inv-num"),
			date_paid:        val(root, "tp-date-paid"),
			actual_miles:     numVal(root, "tp-act-mi"),
			payment_ref_1:    val(root, "tp-pay-ref-1"),
			payment_ref_2:    val(root, "tp-pay-ref-2"),
			payment_ref_3:    val(root, "tp-pay-ref-3"),
			// Dispatch requirements
			req_sleeper:    reqVal(root, "sleeper"),
			req_56pax:      reqVal(root, "pax56"),
			req_ada:        reqVal(root, "adaLift"),
			need_hotel:     reqVal(root, "hotel"),
			need_fuel_card: reqVal(root, "fuelCard"),
		};
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
			depart_prev: s.departPrev || null,
			arrive:      s.arrive || null,
			spot:        s.spot || null,
		}));
	}

	/* ── Populate ────────────────────────────────────────────────────────── */

	function populateTrip(root, trip) {
		setVal(root, "tp-customer",    trip.customer);
		setVal(root, "tp-destination", trip.destination);
		setVal(root, "tp-start",       trip.start_date);
		setVal(root, "tp-end",         trip.end_date);
		setVal(root, "tp-dep",         trip.departure_time);
		setVal(root, "tp-spot",        trip.spot_time);
		setVal(root, "tp-return",      trip.return_time);
		setVal(root, "tp-pickup",      trip.pickup_address);
		setVal(root, "tp-book-name",   trip.booking_contact_name);
		setVal(root, "tp-book-phone",  trip.booking_contact_phone);
		setVal(root, "tp-book-email",  trip.booking_contact_email);
		setVal(root, "tp-trip-name",   trip.trip_contact_1_name);
		setVal(root, "tp-trip-phone",  trip.trip_contact_1_phone);
		setVal(root, "tp-trip2-name",  trip.trip_contact_2_name);
		setVal(root, "tp-trip2-phone", trip.trip_contact_2_phone);
		setVal(root, "tp-notes",       trip.notes);
		// Billing
		setToggle(root, "tp-contract-group", trip.contract_status);
		setVal(root, "tp-price",    trip.quoted_price);
		setVal(root, "tp-est-mi",   trip.est_miles);
		setVal(root, "tp-drive-hr", trip.driving_hours);
		setVal(root, "tp-duty-hr",  trip.on_duty_hours);
		setToggle(root, "tp-invoice-group", trip.invoice_status);
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
		setToggle(root, "tp-contract-group", "Pending");
		setToggle(root, "tp-invoice-group",  "Pending");
		root.querySelectorAll("[data-req]").forEach((btn) => {
			btn.setAttribute("aria-pressed", "false");
			btn.classList.remove("is-active");
		});
		itinerary.clearStops();
		currentTripId = null;
	}

	/* ── Save ────────────────────────────────────────────────────────────── */

	async function save(root, itinerary, saveBtn) {
		saveBtn.disabled = true;
		saveBtn.textContent = "Saving…";

		try {
			const tripData = collectTrip(root);

			// Upsert trip record
			const { data: trip, error: tripErr } = await supabase
				.from("trips")
				.upsert(currentTripId ? { id: currentTripId, ...tripData } : tripData)
				.select("id")
				.single();

			if (tripErr) throw tripErr;
			currentTripId = trip.id;

			// Replace stops
			await supabase.from("trip_stops").delete().eq("trip_id", currentTripId);
			const stopsData = collectStops(itinerary).map((s) => ({ trip_id: currentTripId, ...s }));
			if (stopsData.length) {
				const { error: stopsErr } = await supabase.from("trip_stops").insert(stopsData);
				if (stopsErr) throw stopsErr;
			}

			saveBtn.textContent = "Saved ✓";
			setTimeout(() => {
				saveBtn.innerHTML = '<i data-lucide="save" class="rux-icon"></i> Save';
				if (window.lucide) lucide.createIcons();
			}, 1500);
		} catch (err) {
			console.error("Save failed:", err);
			saveBtn.textContent = "Save failed";
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
		await supabase.from("trips").delete().eq("id", currentTripId);
		clearForm(root, itinerary);
	}

	/* ── Init ────────────────────────────────────────────────────────────── */

export function initTripDB(root, itinerary) {
	const saveBtn   = root.querySelector("#tp-btn-save");
	const clearBtn  = root.querySelector("#tp-btn-clear");
	const deleteBtn = root.querySelector("#tp-btn-delete");

	saveBtn?.addEventListener("click",   () => save(root, itinerary, saveBtn));
	clearBtn?.addEventListener("click",  () => clearForm(root, itinerary));
	deleteBtn?.addEventListener("click", () => deleteTrip(root, itinerary));
}
