import { supabase } from "./supabase.js";
import { fetchDrivers } from "./driver-db.js";

// Tighter than driver-panel.js's licExpiryClass (3 months) — this is a
// proactive push, not passive table coloring, so it's intentionally more
// urgent/actionable than the color a dispatcher would see browsing the
// Drivers table.
const EXPIRY_WARNING_DAYS = 30;

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

export async function fetchNotifications(profileId) {
	const today = localIsoDate();
	const since = addDays(today, -30);
	const { data, error } = await supabase
		.from("notifications")
		.select("*, notification_reads(profile_id, read_at, dismissed_at)")
		.gte("created_at", `${since}T00:00:00`)
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
			// read/dismissed only count if they happened *today* — driver
			// expiry rows are long-lived (one stable row per credential, see
			// generateDriverExpiryAlerts), so treating either as permanent
			// would mean reading or dismissing it once silences it forever
			// instead of it acting as a standing daily reminder until the
			// credential is actually renewed.
			const isToday = (iso) => !!iso && localIsoDate(new Date(iso)) === today;
			return {
				...row,
				notification_reads: undefined,
				read: reads.some((r) => isToday(r.read_at)),
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

export function dismiss(notificationId, profileId) {
	return upsertRead(notificationId, profileId, { dismissed_at: new Date().toISOString() });
}

export function subscribeToNotifications(onChange) {
	return supabase
		.channel("notifications")
		.on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
		.on("postgres_changes", { event: "*", schema: "public", table: "notification_reads" }, onChange)
		.subscribe();
}
