/* ========================================================================== 
   RUX UI — TRIP JSON IMPORT
   --------------------------------------------------------------------------
   Converts the public, source-friendly v2 trip-draft format into the
   snake_case shape consumed by trip-db.js's loadTrip(). It intentionally
   never imports persisted IDs, assignments, payments, confirmation state,
   documents, passengers, or calculated route metadata.
   ========================================================================== */

const TRIP_TYPES = new Set(["round_trip", "one_way", "dropoff_pickup"]);
const SERVICE_TYPES = new Set(["charter", "ticketed"]);
const STOP_TYPES = new Set(["pickup", "stop", "sleeper", "return", "day"]);

function objectValue(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function textValue(value) {
	if (value === null || value === undefined) return null;
	const valueText = String(value).trim();
	return valueText || null;
}

function numberValue(value) {
	if (value === null || value === undefined || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function countValue(value) {
	const number = Math.trunc(Number(value));
	return Number.isFinite(number) ? Math.max(1, Math.min(20, number)) : 1;
}

function firstValue(...values) {
	return values.find((value) => value !== undefined && value !== null) ?? null;
}

function normalizeToken(value) {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");
}

function requirementMap(requirements = []) {
	const map = new Map();
	for (const requirement of requirements) {
		if (!requirement?.id) continue;
		map.set(normalizeToken(requirement.id), requirement.id);
		if (requirement.label) map.set(normalizeToken(requirement.label), requirement.id);
	}
	const aliases = {
		sleeper: "sleeper",
		sleeperbus: "sleeper",
		pax56: "pax56",
		passengers56: "pax56",
		"56passengers": "pax56",
		adalift: "adaLift",
		ada: "adaLift",
		wheelchair: "adaLift",
		wheelchairlift: "adaLift",
		hotel: "hotel",
		fuelcard: "fuelCard",
	};
	for (const [alias, id] of Object.entries(aliases)) {
		if (!map.has(alias)) map.set(alias, id);
	}
	return map;
}

function normalizeRequirements(values, configuredRequirements, warnings) {
	const selected = {};
	const lookup = requirementMap(configuredRequirements);
	const entries = Array.isArray(values)
		? values
		: Object.entries(objectValue(values)).filter(([, enabled]) => !!enabled).map(([key]) => key);

	for (const value of entries) {
		const id = lookup.get(normalizeToken(value));
		if (id) selected[id] = true;
		else if (textValue(value)) warnings.push(`Unknown requirement "${textValue(value)}" was not selected.`);
	}
	return selected;
}

function routeFields(stop) {
	const miles = numberValue(firstValue(stop.distance_miles, stop.miles));
	const drive = textValue(firstValue(stop.drive_time, stop.drive));
	return {
		miles,
		drive,
		miles_source: miles === null ? "estimated" : "manual",
		drive_source: drive === null ? "estimated" : "manual",
		route_status: miles === null && drive === null ? "stale" : "current",
	};
}

function baseStop(stop, type, leg, position) {
	return {
		position,
		leg,
		type,
		label: textValue(stop.label),
		name: textValue(stop.name),
		address: textValue(stop.address),
		...routeFields(stop),
		depart_prev: null,
		arrive: null,
		spot: null,
	};
}

// The editor stores each travel card as "the journey to get here", while the
// public import format describes each location naturally (arrival/departure at
// this location). Carry each location's departure forward onto the next card.
function normalizeV2Stops(values, leg, warnings) {
	if (!Array.isArray(values)) return [];
	const rows = [];
	let pendingDeparture = null;

	for (const rawValue of values) {
		const stop = objectValue(rawValue);
		const type = textValue(stop.type) || "stop";
		if (!STOP_TYPES.has(type)) {
			warnings.push(`Unknown ${leg} stop type "${type}" was skipped.`);
			continue;
		}

		const row = baseStop(stop, type, leg, rows.length);
		if (type === "day") {
			row.label = textValue(stop.label) || textValue(stop.date) || "End of day";
			rows.push(row);
			continue;
		}

		if (type === "sleeper") {
			row.depart_prev = textValue(firstValue(stop.rest_start_time, stop.depart_prev));
			row.arrive = textValue(firstValue(stop.rest_end_time, stop.arrive));
			if (row.arrive) pendingDeparture = row.arrive;
			rows.push(row);
			continue;
		}

		if (type === "pickup") {
			row.depart_prev = textValue(firstValue(stop.yard_departure_time, stop.depart_prev));
			row.spot = textValue(firstValue(stop.spot_time, stop.spot));
		} else {
			row.depart_prev = pendingDeparture;
			row.arrive = textValue(firstValue(stop.arrival_time, stop.arrive));
		}

		pendingDeparture = textValue(stop.departure_time);
		rows.push(row);
	}

	if (rows.length && !rows.some((row) => row.type === "pickup")) {
		rows.unshift(baseStop({}, "pickup", leg, 0));
		warnings.push(`A blank pickup was added to the ${leg} itinerary.`);
	}
	if (rows.length && !rows.some((row) => row.type === "return")) {
		const returnRow = baseStop({}, "return", leg, rows.length);
		returnRow.depart_prev = pendingDeparture;
		rows.push(returnRow);
		warnings.push(`A return-to-yard card was added to the ${leg} itinerary.`);
	}
	rows.forEach((row, position) => { row.position = position; });
	return rows;
}

function normalizeLegacyStops(values, warnings) {
	if (!Array.isArray(values)) return [];
	warnings.push("Legacy JSON was imported. Use schema_version 2 for split legs and natural arrival/departure fields.");
	return values
		.filter((value) => value && typeof value === "object")
		.map((stop, position) => ({
			position,
			leg: stop.leg === "return" ? "return" : "outbound",
			type: STOP_TYPES.has(stop.type) ? stop.type : "stop",
			label: textValue(stop.label),
			name: textValue(stop.name),
			address: textValue(stop.address),
			...routeFields(stop),
			depart_prev: textValue(firstValue(stop.depart_prev, stop.departPrev)),
			arrive: textValue(stop.arrive),
			spot: textValue(stop.spot),
		}));
}

function contactFields(trip, warnings) {
	const booking = objectValue(trip.booking_contact);
	const contacts = Array.isArray(trip.trip_contacts) ? trip.trip_contacts.map(objectValue) : [];
	if (contacts.length > 2) warnings.push("Only the first two trip contacts were imported.");
	return {
		booking_contact_name: textValue(booking.name),
		booking_contact_phone: textValue(booking.phone),
		booking_contact_email: textValue(booking.email),
		trip_contact_1_name: textValue(contacts[0]?.name),
		trip_contact_1_phone: textValue(contacts[0]?.phone),
		trip_contact_2_name: textValue(contacts[1]?.name),
		trip_contact_2_phone: textValue(contacts[1]?.phone),
	};
}

function normalizeV2(payload, configuredRequirements, warnings) {
	const source = objectValue(payload.trip);
	const legs = objectValue(source.legs);
	const outbound = objectValue(legs.outbound);
	const inbound = objectValue(legs.return);
	const tripType = TRIP_TYPES.has(source.type) ? source.type : "round_trip";
	const serviceType = SERVICE_TYPES.has(source.service_type) ? source.service_type : "charter";
	const tripReqs = normalizeRequirements(source.requirements, configuredRequirements, warnings);
	const outboundRows = normalizeV2Stops(outbound.stops, "outbound", warnings);
	const returnRows = tripType === "dropoff_pickup"
		? normalizeV2Stops(inbound.stops, "return", warnings)
		: [];
	if (tripType !== "dropoff_pickup" && Array.isArray(inbound.stops) && inbound.stops.length) {
		warnings.push("The return leg was ignored because this is not a split trip.");
	}
	const allTripStops = outboundRows.concat(
		returnRows.map((row, index) => ({ ...row, position: outboundRows.length + index })),
	);
	const ticketOptions = serviceType === "ticketed" && Array.isArray(source.ticket_options)
		? source.ticket_options.map((option, position) => ({
			position,
			label: textValue(objectValue(option).label),
			price: numberValue(objectValue(option).price),
		})).filter((option) => option.label || option.price !== null)
		: [];

	return {
		customer: textValue(firstValue(source.client, source.customer)),
		destination: textValue(source.destination),
		trip_type: tripType,
		is_self_organized: serviceType === "ticketed",
		start_date: textValue(outbound.start_date),
		end_date: textValue(outbound.end_date),
		return_start_date: tripType === "dropoff_pickup" ? textValue(inbound.start_date) : null,
		return_end_date: tripType === "dropoff_pickup" ? textValue(inbound.end_date) : null,
		bus_count: countValue(outbound.bus_count),
		return_bus_count: tripType === "dropoff_pickup" ? countValue(inbound.bus_count) : 1,
		...contactFields(source, warnings),
		contact_not_needed: source.contact_not_needed === true,
		itinerary_not_needed: source.itinerary_not_needed === true,
		notes: textValue(source.notes),
		quoted_price: numberValue(source.quoted_price),
		est_miles: numberValue(source.estimated_miles_override),
		trip_reqs: tripReqs,
		req_sleeper: !!tripReqs.sleeper,
		req_56pax: !!tripReqs.pax56,
		req_ada: !!tripReqs.adaLift,
		need_hotel: !!tripReqs.hotel,
		need_fuel_card: !!tripReqs.fuelCard,
		trip_ticket_options: ticketOptions,
		allTripStops,
	};
}

function normalizeLegacy(payload, configuredRequirements, warnings) {
	const tripReqs = normalizeRequirements(
		payload.requirements ?? payload.trip_reqs ?? {
			sleeper: payload.req_sleeper,
			pax56: payload.req_56pax,
			adaLift: payload.req_ada,
			hotel: payload.need_hotel,
			fuelCard: payload.need_fuel_card,
		},
		configuredRequirements,
		warnings,
	);
	return {
		customer: textValue(payload.customer),
		destination: textValue(payload.destination),
		trip_type: TRIP_TYPES.has(payload.trip_type) ? payload.trip_type : "round_trip",
		is_self_organized: payload.service_type === "ticketed" || payload.is_self_organized === true,
		start_date: textValue(firstValue(payload.start_date, payload.startDate)),
		end_date: textValue(firstValue(payload.end_date, payload.endDate)),
		return_start_date: textValue(firstValue(payload.return_start_date, payload.returnStartDate)),
		return_end_date: textValue(firstValue(payload.return_end_date, payload.returnEndDate)),
		bus_count: countValue(firstValue(payload.bus_count, payload.busesNeeded)),
		return_bus_count: countValue(firstValue(payload.return_bus_count, payload.returnBusCount)),
		booking_contact_name: textValue(firstValue(payload.booking_contact_name, payload.bookingContact?.name)),
		booking_contact_phone: textValue(firstValue(payload.booking_contact_phone, payload.bookingContact?.phone)),
		booking_contact_email: textValue(firstValue(payload.booking_contact_email, payload.bookingContact?.email)),
		trip_contact_1_name: textValue(firstValue(payload.trip_contact_1_name, payload.tripContact?.name)),
		trip_contact_1_phone: textValue(firstValue(payload.trip_contact_1_phone, payload.tripContact?.phone)),
		trip_contact_2_name: textValue(firstValue(payload.trip_contact_2_name, payload.tripContact2?.name)),
		trip_contact_2_phone: textValue(firstValue(payload.trip_contact_2_phone, payload.tripContact2?.phone)),
		contact_not_needed: payload.contact_not_needed === true,
		itinerary_not_needed: payload.itinerary_not_needed === true,
		notes: textValue(payload.notes),
		quoted_price: numberValue(firstValue(payload.quoted_price, payload.quotedPrice)),
		est_miles: numberValue(firstValue(payload.est_miles, payload.estimatedMiles)),
		trip_reqs: tripReqs,
		req_sleeper: !!tripReqs.sleeper,
		req_56pax: !!tripReqs.pax56,
		req_ada: !!tripReqs.adaLift,
		need_hotel: !!tripReqs.hotel,
		need_fuel_card: !!tripReqs.fuelCard,
		allTripStops: normalizeLegacyStops(payload.stops ?? payload.trip_stops ?? [], warnings),
		trip_ticket_options: Array.isArray(payload.ticket_options) ? payload.ticket_options : [],
	};
}

export function normalizeTripImport(payload, configuredRequirements = []) {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw new Error("Expected a JSON object.");
	}
	const warnings = [];
	const isV2 = Number(payload.schema_version) === 2 && payload.trip && typeof payload.trip === "object";
	if (payload.schema_version !== undefined && !isV2) {
		throw new Error(`Unsupported trip JSON schema version: ${payload.schema_version}`);
	}
	const trip = isV2
		? normalizeV2(payload, configuredRequirements, warnings)
		: normalizeLegacy(payload, configuredRequirements, warnings);
	return { trip, warnings, schemaVersion: isV2 ? 2 : 1 };
}
