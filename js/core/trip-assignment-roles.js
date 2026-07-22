export function assignmentRoleNames(activeRoles) {
	if (!Array.isArray(activeRoles)) return null;
	return new Set(activeRoles.map((entry) => String(entry).split(":", 1)[0]));
}

export function isAssignmentRoleActive(assignment, role) {
	if (role === "driver") return true;
	const activeRoles = assignmentRoleNames(assignment?.active_roles);
	// Missing metadata means legacy data: preserve its saved optional drivers.
	return activeRoles === null || activeRoles.has(role);
}

export function activeAssignmentDrivers(assignment = {}) {
	const drivers = assignment.drivers ?? assignment.trip_drivers ?? [];
	return drivers.filter((driver) => isAssignmentRoleActive(assignment, driver.role));
}
