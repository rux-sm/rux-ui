import { supabase } from "./supabase.js";
import { fetchDrivers } from "./driver-db.js";

// Tighter than driver-panel.js's licExpiryClass (3 months) — this is a
// proactive push, not passive table coloring, so it's intentionally more
// urgent/actionable than the color a dispatcher would see browsing the
// Drivers table.
const EXPIRY_WARNING_DAYS = 30;
const TRIP_ALERT_LOOKAHEAD_DAYS = 3;

function localIsoDate(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate, days) {
	const d = new Date(`${isoDate}T00:00:00`);
	d.setDate(d.getDate() + days);
	return localIsoDate(d);
}

function isWithinWarningWindow(iso, today) {
	if (!iso) return false;
	if (iso < today) return true; // already expired
	return iso <= addDays(today, EXPIRY_WARNING_DAYS);
}

function formatExpiryDate(iso) {
	return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function daysBetween(iso, today) {
	const ms = new Date(`${iso}T00:00:00`) - new Date(`${today}T00:00:00`);
	return Math.round(ms / 86400000);
}

// Relies on the notifications_dedupe_key_idx unique index. Deliberately
// NOT ignoreDuplicates — an existing row's title/severity/body are updated
// in place each run (e.g. the "N days" count needs to tick down daily), and
// created_at is left out of the payload so a conflict-update doesn't reset
// it. Safe to run from every dispatcher's client at boot, since there's no
// backend/cron to run it once centrally.
async function upsertNotification(row) {
	const { error } = await supabase
		.from("notifications")
		.upsert(row, { onConflict: "dedupe_key" });
	if (error) console.warn("Could not create notification:", error);
}

// Deletes any existing row for this driver+credential type, keyed by
// (type, ref_id) rather than the exact dedupe_key string — that also
// sweeps up orphans left behind by an earlier dedupe_key scheme (this one
// used to bake the expiry date in), not just the current row. Pass
// keepDedupeKey to leave the current, still-relevant row untouched (just
// purging legacy duplicates) instead of deleting everything.
async function clearDriverNotifications(type, driverId, keepDedupeKey = null) {
	let query = supabase
		.from("notifications")
		.delete()
		.eq("type", type)
		.eq("ref_id", driverId);
	if (keepDedupeKey) query = query.neq("dedupe_key", keepDedupeKey);
	const { error } = await query;
	if (error) console.warn("Could not clear notification:", error);
}

// Only active drivers — on-leave/inactive drivers aren't currently running
// trips, so their credential dates aren't an operational concern yet.
// Fetches its own full driver records rather than accepting a list from the
// caller — the `drivers` already loaded for the trip panel (trip-db.js's
// own fetchDrivers()) is a minimal `id, name, phone` shape for the
// assignment dropdown and doesn't carry status/license_exp/med_card_expiry.
//
// One stable row per driver+credential (dedupe_key has no date in it) —
// as long as the credential is within the warning window it's updated in
// place every run (fresh day-count, in case the date hasn't changed but
// time has passed), and dismissing only hides it for the day dismissed
// (see fetchNotifications) so it resurfaces daily as a standing reminder
// until the driver actually renews. Once renewed (or the driver goes
// inactive) the credential falls outside the window and its row is
// deleted outright, rather than lingering with stale data.
export async function generateDriverExpiryAlerts() {
	const drivers = await fetchDrivers();
	const today = localIsoDate();
	const checks = [
		{ type: "driver_license_expiry", field: "license_exp", label: "license" },
		{ type: "driver_medical_expiry", field: "med_card_expiry", label: "medical card" },
	];
	for (const driver of drivers || []) {
		for (const check of checks) {
			const dedupeKey = `${check.type}:${driver.id}`;
			const iso = driver[check.field];
			const active = driver.status === "active";
			const withinWindow = active && isWithinWarningWindow(iso, today);
			// Always sweep first — either clears everything (credential
			// resolved/driver inactive) or just legacy-format duplicates
			// while leaving the current row alone for the upsert below.
			await clearDriverNotifications(check.type, driver.id, withinWindow ? dedupeKey : null);
			if (!withinWindow) continue;
			const expired = iso < today;
			const days = Math.abs(daysBetween(iso, today));
			const dayText = `${days} day${days === 1 ? "" : "s"}`;
			await upsertNotification({
				type: check.type,
				severity: expired ? "critical" : "warning",
				title: `${driver.name} — ${check.label} ${expired ? `expired ${dayText} ago` : `expires in ${dayText}`}`,
				body: formatExpiryDate(iso),
				ref_table: "drivers",
				ref_id: driver.id,
				dedupe_key: dedupeKey,
			});
		}
	}
}

function tripLegsInAlertWindow(trip, today) {
	const through = addDays(today, TRIP_ALERT_LOOKAHEAD_DAYS);
	const legs = [{ leg: "outbound", date: trip.start_date }];
	if (trip.trip_type === "dropoff_pickup") {
		legs.push({ leg: "return", date: trip.return_start_date });
	}
	return legs.filter(({ date }) => date && date >= today && date <= through);
}

function tripDriversForLeg(trip, leg) {
	return (trip.trip_assignments || [])
		.filter((assignment) => (assignment.leg || "outbound") === leg)
		.flatMap((assignment) => assignment.drivers || assignment.trip_drivers || []);
}

function tripReadinessIssues(trip, leg) {
	const issues = [];
	const hasItinerary = trip.itinerary_not_needed
		|| (trip.trip_documents || []).some(
			(document) => String(document.label || "").toLowerCase() === "itinerary",
		);
	const hasContact = trip.contact_not_needed
		|| trip.booking_contact_name?.trim()
		|| trip.trip_contact_1_name?.trim();
	const hasPoOrEquivalent = trip.po_received
		|| trip.po_ref
		|| trip.contract_status === "Signed"
		|| Number(trip.deposit_amount || 0) > 0
		|| trip.date_paid;

	if (!trip.confirmed) {
		const price = Number(trip.quoted_price || 0);
		const poAmount = Number(trip.po_amount || 0);
		if (trip.po_received && price > 0 && poAmount < price) issues.push("full PO authorization");
		else issues.push(hasPoOrEquivalent ? "payment confirmation" : "PO/payment confirmation");
	}
	if (!hasItinerary) issues.push("itinerary");
	if (!hasContact) issues.push("trip contact");

	const drivers = tripDriversForLeg(trip, leg);
	if (!drivers.length) {
		issues.push("driver assignment");
	} else if (drivers.some((driver) => driver.driver_status !== "confirmed")) {
		issues.push("driver confirmation");
	}
	return issues;
}

function formatTripAlertDate(iso) {
	return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

// Trip alerts represent current work, not inbox history. A date-scoped key
// gives each day a truthful timestamp; rows that are resolved, outside the
// lookahead window, or left over from the retired summary generator are
// deleted. Current rows are upserted in place so hourly checks do not reset
// per-profile read/dismiss state.
export async function syncTripReadinessAlerts(trips = []) {
	const today = localIsoDate();
	const current = [];
	for (const trip of trips || []) {
		if (trip.cancelled_at) continue;
		for (const { leg, date } of tripLegsInAlertWindow(trip, today)) {
			const issues = tripReadinessIssues(trip, leg);
			if (!issues.length) continue;
			const dedupeKey = `trip_departure_summary:${today}:${trip.id}:${leg}`;
			const daysUntil = daysBetween(date, today);
			const reference = trip.trip_ref || trip.destination || trip.customer || "Trip";
			current.push({
				type: "trip_departure_summary",
				severity: daysUntil <= 1 ? "critical" : "warning",
				title: `${reference} needs attention`,
				body: `Departing ${formatTripAlertDate(date)}${leg === "return" ? " · Return" : ""} · Missing: ${issues.join(", ")}`,
				ref_table: "trips",
				ref_id: trip.id,
				dedupe_key: dedupeKey,
			});
		}
	}

	const { data: existing, error: fetchError } = await supabase
		.from("notifications")
		.select("id, dedupe_key")
		.eq("type", "trip_departure_summary");
	if (fetchError) throw fetchError;
	const currentKeys = new Set(current.map((row) => row.dedupe_key));
	const staleIds = (existing || [])
		.filter((row) => !currentKeys.has(row.dedupe_key))
		.map((row) => row.id);
	if (staleIds.length) {
		const { error } = await supabase.from("notifications").delete().in("id", staleIds);
		if (error) throw error;
	}
	for (const row of current) await upsertNotification(row);
}

export async function fetchNotifications(profileId) {
	const today = localIsoDate();
	const { data, error } = await supabase
		.from("notifications")
		.select("*, notification_reads(profile_id, read_at, dismissed_at)")
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? [])
		.map((row) => {
			// notification_reads is scoped by the profile_id filter below via a
			// second pass — Supabase's embedded-resource filter can't take a
			// dynamic profile id server-side without an RPC, so filter client-side.
			const reads = (row.notification_reads || []).filter(
				(r) => String(r.profile_id) === String(profileId),
			);
			// Read state is durable across sessions and calendar days. Standing
			// alerts may reappear after a one-day dismissal, but viewing them once
			// must not make the same stable row look new again on the next login.
			const isToday = (iso) => !!iso && localIsoDate(new Date(iso)) === today;
			return {
				...row,
				notification_reads: undefined,
				read: reads.some((r) => Boolean(r.read_at)),
				dismissed: reads.some((r) => isToday(r.dismissed_at)),
			};
		})
		.filter((row) => !row.dismissed);
}

async function upsertRead(notificationId, profileId, fields) {
	const { error } = await supabase
		.from("notification_reads")
		.upsert(
			{ notification_id: notificationId, profile_id: profileId, ...fields },
			{ onConflict: "notification_id,profile_id" },
		);
	if (error) throw error;
}

export function markRead(notificationId, profileId) {
	return upsertRead(notificationId, profileId, { read_at: new Date().toISOString() });
}

export async function markAllRead(notificationIds, profileId) {
	if (!notificationIds.length) return;
	const readAt = new Date().toISOString();
	const { error } = await supabase
		.from("notification_reads")
		.upsert(
			notificationIds.map((notificationId) => ({
				notification_id: notificationId,
				profile_id: profileId,
				read_at: readAt,
			})),
			{ onConflict: "notification_id,profile_id" },
		);
	if (error) throw error;
}

export function dismiss(notificationId, profileId) {
	const now = new Date().toISOString();
	return upsertRead(notificationId, profileId, {
		read_at: now,
		dismissed_at: now,
	});
}

export function subscribeToNotifications(onChange) {
	return supabase
		.channel("notifications")
		.on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
		.on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, onChange)
		.subscribe();
}
