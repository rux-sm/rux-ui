const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDay(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
	if (!match) return null;
	const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return Number.isFinite(time) ? time : null;
}

function formatIsoDay(time) {
	return new Date(time).toISOString().slice(0, 10);
}

export function workloadPresetStartDate(preset, todayIso) {
	const today = parseIsoDay(todayIso);
	if (today === null) return "";
	if (preset === "ytd") return `${todayIso.slice(0, 4)}-01-01`;
	const days = preset === "30" ? 30 : preset === "90" ? 90 : null;
	return days ? formatIsoDay(today - (days - 1) * DAY_MS) : "";
}

function recordRange(record) {
	const start = parseIsoDay(record.startDate);
	const end = parseIsoDay(record.endDate || record.startDate);
	if (start === null || end === null) return null;
	return start <= end ? { start, end } : { start: end, end: start };
}

export function aggregateDriverWorkload(
	drivers,
	assignments,
	{ startDate, endDate },
) {
	const rangeStart = parseIsoDay(startDate);
	const rangeEnd = parseIsoDay(endDate);
	if (rangeStart === null || rangeEnd === null || rangeStart > rangeEnd) {
		return {
			rows: [],
			missingPayAssignments: 0,
			missingMileageTrips: 0,
		};
	}

	const rowsByDriver = new Map(
		(drivers || []).map((driver) => [
			String(driver.id),
			{
				driver,
				_days: new Set(),
				_trips: new Set(),
				_milesByTrip: new Map(),
				assignmentCount: 0,
				payKnownCount: 0,
				payMissingCount: 0,
				payTotal: 0,
			},
		]),
	);
	const mileageCompletenessByTrip = new Map();
	let missingPayAssignments = 0;

	for (const assignment of assignments || []) {
		const row = rowsByDriver.get(String(assignment.driverId));
		const dates = recordRange(assignment);
		if (!row || !dates) continue;
		if (dates.end < rangeStart || dates.start > rangeEnd) continue;

		const tripKey = String(
			assignment.tripId || assignment.tripRef || assignment.assignmentId,
		);
		row.assignmentCount += 1;
		row._trips.add(tripKey);

		const clippedStart = Math.max(dates.start, rangeStart);
		const clippedEnd = Math.min(dates.end, rangeEnd);
		for (let day = clippedStart; day <= clippedEnd; day += DAY_MS) {
			row._days.add(formatIsoDay(day));
		}

		if (assignment.pay === null || assignment.pay === undefined || assignment.pay === "") {
			row.payMissingCount += 1;
			missingPayAssignments += 1;
		} else {
			const pay = Number(assignment.pay);
			if (Number.isFinite(pay)) {
				row.payKnownCount += 1;
				row.payTotal += pay;
			} else {
				row.payMissingCount += 1;
				missingPayAssignments += 1;
			}
		}

		const miles = Number(assignment.miles);
		const hasMiles = assignment.miles !== null
			&& assignment.miles !== undefined
			&& assignment.miles !== ""
			&& Number.isFinite(miles);
		const existingMiles = row._milesByTrip.get(tripKey);
		if (!existingMiles || (!existingMiles.known && hasMiles)) {
			row._milesByTrip.set(tripKey, {
				known: hasMiles,
				value: hasMiles ? miles : 0,
			});
		}
		mileageCompletenessByTrip.set(
			tripKey,
			Boolean(mileageCompletenessByTrip.get(tripKey)) || hasMiles,
		);
	}

	const rows = [...rowsByDriver.values()].map((row) => {
		let milesTotal = 0;
		let milesKnownTripCount = 0;
		let milesMissingCount = 0;
		for (const mileage of row._milesByTrip.values()) {
			if (mileage.known) {
				milesKnownTripCount += 1;
				milesTotal += mileage.value;
			} else {
				milesMissingCount += 1;
			}
		}
		return {
			driver: row.driver,
			driverId: row.driver.id,
			daysWorked: row._days.size,
			tripsAssigned: row._trips.size,
			assignmentCount: row.assignmentCount,
			payTotal: row.payTotal,
			payKnownCount: row.payKnownCount,
			payMissingCount: row.payMissingCount,
			milesTotal,
			milesKnownTripCount,
			milesMissingCount,
		};
	});

	return {
		rows,
		missingPayAssignments,
		missingMileageTrips: [...mileageCompletenessByTrip.values()].filter(
			(known) => !known,
		).length,
	};
}
