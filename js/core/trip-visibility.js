/* Shared visibility rule for driver-facing trip legs.
   A trip remains current for its entire final calendar day so a late-running
   assignment never disappears from the driver's page mid-service. */

function localCalendarDate(value) {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		return new Date(value.getFullYear(), value.getMonth(), value.getDate());
	}
	const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(year, month, day);
	if (
		Number.isNaN(date.getTime())
		|| date.getFullYear() !== year
		|| date.getMonth() !== month
		|| date.getDate() !== day
	) return null;
	return date;
}

export function isCurrentOrUpcomingLeg(endDate, now = new Date()) {
	const legEnd = localCalendarDate(endDate);
	const today = localCalendarDate(now);
	return Boolean(legEnd && today && legEnd >= today);
}
