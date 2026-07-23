import { supabase } from "./supabase.js";
import { activeAssignmentDrivers } from "../core/trip-assignment-roles.js";

export const DRIVER_ROLE_STATUSES = [
	"off",
	"pending-assignment",
	"pending-response",
	"confirmed",
];

const LEGACY_STATUS = {
	default: "off",
	danger: "pending-assignment",
	warning: "pending-response",
	success: "confirmed",
};

let warnedMissingPatch = false;

export function normalizeDriverRoleStatus(value) {
	const normalized = LEGACY_STATUS[value] || value || "off";
	return DRIVER_ROLE_STATUSES.includes(normalized) ? normalized : "off";
}

export function driverStatusKey(tripId, driverId, leg = "outbound", role = "driver") {
	return [tripId, driverId, leg || "outbound", role || "driver"].map(String).join(":");
}

function missingStatusPatch(error) {
	const detail = [error?.message, error?.details, error?.hint]
		.filter(Boolean)
		.join(" ");
	return /get_trip_driver_statuses|sync_trip_driver_statuses|schema cache|function/i.test(detail);
}

function warnMissingPatch(error) {
	if (warnedMissingPatch) return;
	warnedMissingPatch = true;
	console.warn(
		"Canonical driver statuses are unavailable; using assignment metadata until trip-driver-confirmation-patch.sql is rerun.",
		error,
	);
}

export async function fetchTripDriverStatuses(tripIds = []) {
	const ids = [...new Set((tripIds || []).filter(Boolean))];
	if (!ids.length) return [];
	const { data, error } = await supabase.rpc("get_trip_driver_statuses", {
		p_trip_ids: ids,
	});
	if (error) {
		if (missingStatusPatch(error)) {
			warnMissingPatch(error);
			return [];
		}
		throw error;
	}
	return Array.isArray(data) ? data : [];
}

export async function syncTripDriverStatuses(tripId, statuses = []) {
	if (!tripId) return [];
	const { data, error } = await supabase.rpc("sync_trip_driver_statuses", {
		p_trip_id: tripId,
		p_statuses: statuses,
	});
	if (error) {
		if (missingStatusPatch(error)) {
			warnMissingPatch(error);
			return [];
		}
		throw error;
	}
	return Array.isArray(data) ? data : [];
}

function legacyStatuses(activeRoles) {
	const result = new Map();
	for (const raw of Array.isArray(activeRoles) ? activeRoles : ["driver"]) {
		const entry = String(raw);
		const [role, savedStatus] = entry.includes(":")
			? entry.split(":", 2)
			: [entry, "off"];
		result.set(role, normalizeDriverRoleStatus(savedStatus));
	}
	if (!result.has("driver")) result.set("driver", "off");
	return result;
}

/**
 * Overlays stable status rows on one assignment without changing which
 * optional roles are active. Legacy active_roles remains the fallback until
 * the canonical patch has been installed and populated.
 */
export function mergeAssignmentDriverStatuses(
	tripId,
	assignment,
	statusesByKey = new Map(),
) {
	const leg = assignment.leg || "outbound";
	const rawDrivers = assignment.trip_drivers ?? assignment.drivers ?? [];
	const savedRoles = Array.isArray(assignment.active_roles)
		? assignment.active_roles
		: [
			"driver",
			...rawDrivers
				.map((driver) => driver.role)
				.filter((role) => role && role !== "driver"),
		];
	const legacyByRole = legacyStatuses(savedRoles);
	const driversWithStatus = rawDrivers.map((driver) => {
		const fallbackStatus = legacyByRole.get(driver.role) || "off";
		const canonical = statusesByKey.get(
			driverStatusKey(tripId, driver.driver_id, leg, driver.role),
		);
		return {
			...driver,
			driver_status: normalizeDriverRoleStatus(canonical?.status ?? fallbackStatus),
			driver_status_source: canonical?.source || "dispatcher",
			driver_status_updated_at: canonical?.updatedAt || null,
			driver_accepted_at: canonical?.acceptedAt || null,
		};
	});

	const activeDrivers = activeAssignmentDrivers({
		...assignment,
		trip_drivers: driversWithStatus,
		drivers: driversWithStatus,
	});
	const statusByRole = new Map(
		activeDrivers.map((driver) => [driver.role, driver.driver_status || "off"]),
	);
	const activeRoles = [...legacyByRole.keys()]
		.map((role) => {
			const status = normalizeDriverRoleStatus(
				statusByRole.get(role) ?? legacyByRole.get(role),
			);
			return status === "off" ? role : `${role}:${status}`;
		});

	return {
		...assignment,
		active_roles: activeRoles.length ? activeRoles : ["driver"],
		drivers: activeDrivers,
	};
}

export function indexTripDriverStatuses(statuses = []) {
	return new Map(
		statuses.map((status) => [
			driverStatusKey(
				status.tripId,
				status.driverId,
				status.leg,
				status.role,
			),
			status,
		]),
	);
}
