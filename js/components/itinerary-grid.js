/* ==========================================================================
   ITINERARY GRID  ·  window.ItineraryGrid
   --------------------------------------------------------------------------
   The Grid tab. A second, independent editor for the same job the Itinerary
   tab does, built on the opposite time model.

   The Itinerary tab stores each card as "the journey to get here": a stop
   carries departPrev (when you left the PREVIOUS place) and arrive (when you
   reached THIS one). That reads well as a route and enters badly, because no
   customer document is written that way — every one of them says "arrive at
   10, leave at 2:30".

   This tab stores what the document says. A stop owns its own arrive and
   depart; the leg between two stops owns the miles and the drive time and
   renders between their rows. Dwell — depart minus arrive — is then visible
   without being stored, and it is the number hours-of-service runs on.

   Two consequences worth stating, because they are the reason the tab exists:

     No dates are typed. Day offsets are DERIVED from time monotonicity — a
     departure earlier than its own arrival crossed midnight, and an arrival
     earlier than the previous departure did too. A stop can be pushed a
     further day out by hand for an idle day the clock cannot imply, and
     nothing else about the calendar is ever entered.

     v3 loads one-to-one. docs/trip-import-schema-v3.json describes locations
     the same way this model does, so importing is a copy rather than the
     carry-forward translation js/data/trip-import.js has to do for the
     Itinerary tab.

   State lives in memory for now. Persistence, the mirror into trip_stops, and
   routing are later steps; this tab reads a document and edits it.
   ========================================================================== */

(function () {
	"use strict";

	const YARD_FALLBACK = { name: "Yard", address: "2801 Zinnia Ave, McAllen, TX 78504" };

	// Ordered, because the row's own affordances depend on where it can sit:
	// yard_origin is always first and return always last, so neither moves nor
	// deletes, and neither carries an address the dispatcher types.
	const TYPES = ["yard_origin", "pickup", "stop", "sleeper", "return"];
	const FIXED_TYPES = new Set(["yard_origin", "return"]);
	const TYPE_LABEL = {
		yard_origin: "Leave yard",
		pickup: "Pickup",
		stop: "Stop",
		sleeper: "Rest",
		return: "Return to yard",
	};
	const TYPE_ICON = {
		yard_origin: "garage",
		pickup: "location_on",
		stop: "trip_origin",
		sleeper: "hotel",
		return: "home",
	};
	const CONFIDENCE_NOTE = {
		partial: "Address completed from general knowledge — confirm it",
		source_text: "Address is the source's own wording, not a verified address",
	};

	const PROMPT_URL = "./docs/itinerary-prompt.md";

	/* Routing constants.

	   TRAFFIC_BUFFER is used ONLY to judge whether a leg is tight. It is
	   deliberately not folded into the stored drive time: that number is what
	   Mapbox measured, the Itinerary tab stores the same measurement, and a
	   silently padded copy here would make the two tabs disagree about the
	   same road. The warning gets to be conservative; the record does not.

	   PRE_TRIP is the driver's inspection before wheels roll. Spot padding and
	   the return buffer come from Settings when configured. */
	const TRAFFIC_BUFFER = 0.15;
	const RISK_MARGIN_MINS = 5;
	const PRE_TRIP_MINS = 15;

	const spotPadding = () => window.RuxSettings?.getSpotPadding?.() ?? 15;

	/* ── Formatting ──────────────────────────────────────────────────────
	   Intl for the day dividers, per the interaction-a11y contract. Times are
	   native <input type="time">, so the browser localises those itself. The
	   formatter is built once — one per row is the single most expensive thing
	   a render like this can do. */

	const dayFormat = new Intl.DateTimeFormat(undefined, {
		weekday: "short", month: "short", day: "numeric",
	});

	/* Is the geocoder's answer the same place that was asked for?

	   Comparing the strings does not work. Mapbox expands everything — "101 E
	   Hackberry Ave, McAllen, TX 78501" comes back as "101 East Hackberry
	   Avenue, McAllen, Texas 78501, United States" — so a plain comparison
	   flags every single address as a substitution, and a warning that fires
	   on all of them is one nobody reads.

	   The house number and the ZIP settle it. Both matching means the same
	   address however it is spelled; either one differing means the geocoder
	   went somewhere else. When the typed address has neither there is nothing
	   to compare, and no claim is made. */
	function sameAddress(typed, matched) {
		const parts = (value) => {
			const text = String(value ?? "");
			/* The LAST five-digit run, not the first. A US address ends with
			   its ZIP, and a house number is also five digits often enough to
			   matter: asked for "Whataburger, Falfurrias, TX 78355", Mapbox
			   read the ZIP as a house number and answered "78355 Texas Highway
			   82, Sherman, Texas 75092" — 592 miles away. Taking the first run
			   found 78355 on both sides and called it a match, so the one
			   check that exists to catch a substitution passed on the worst
			   one it will ever see. */
			const zips = text.match(/\b\d{5}\b(?!\d)/g);
			return {
				number: /^\s*(\d+)/.exec(text)?.[1] || null,
				zip: zips ? zips[zips.length - 1] : null,
			};
		};
		const a = parts(typed);
		const b = parts(matched);
		if (a.number && a.zip) return a.number === b.number && a.zip === b.zip;
		if (a.zip) return a.zip === b.zip;
		if (a.number) return a.number === b.number;
		return true; // nothing identifying was typed, so nothing to contradict
	}

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
		})[ch]);
	}

	function parseIsoDate(iso) {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? "").trim());
		if (!match) return null;
		const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function addDays(iso, offset) {
		const date = parseIsoDate(iso);
		if (!date) return null;
		date.setUTCDate(date.getUTCDate() + offset);
		return date.toISOString().slice(0, 10);
	}

	function formatDay(iso) {
		const date = parseIsoDate(iso);
		// UTC in, UTC out: an ISO date is a calendar day, not an instant, so
		// reading it back in local time can land on the day before.
		return date ? dayFormat.format(new Date(date.getTime() + date.getTimezoneOffset() * 60000)) : "";
	}

	function clockMins(hhmm) {
		const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
		if (!match) return null;
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (hours > 23 || minutes > 59) return null;
		return hours * 60 + minutes;
	}

	function formatSpan(mins) {
		if (!Number.isFinite(mins) || mins <= 0) return "";
		const hours = Math.floor(mins / 60);
		const minutes = mins % 60;
		if (!hours) return `${minutes}m`;
		return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
	}

	function driveMins(drive) {
		const match = /^(\d+):([0-5]\d)$/.exec(String(drive ?? "").trim());
		return match ? Number(match[1]) * 60 + Number(match[2]) : null;
	}

	/* ── Model ───────────────────────────────────────────────────────────── */

	let nextId = 1;

	function normalizeStop(value) {
		const stop = value && typeof value === "object" ? value : {};
		const type = TYPES.includes(stop.type) ? stop.type : "stop";
		return {
			id: stop.id || `s${nextId++}`,
			type,
			name: String(stop.name ?? ""),
			address: String(stop.address ?? ""),
			addressConfidence: stop.addressConfidence || null,
			// What the geocoder actually matched, when that differs from what
			// was typed. Recorded rather than applied — substituting it would
			// hide the substitution.
			matchedAddress: stop.matchedAddress || null,
			// Set when the coordinates are the TOWN's rather than this stop's,
			// because the address could not be resolved. The mileage measured
			// from them is good to about a mile; the address is still missing.
			approxFrom: stop.approxFrom || null,
			activity: String(stop.activity ?? ""),
			arrive: String(stop.arrive ?? ""),
			depart: String(stop.depart ?? ""),
			// A day the clock cannot imply — an idle day the bus is held over.
			// Added on top of the derived offset, never instead of it.
			extraDays: Number.isFinite(stop.extraDays) ? Math.max(0, stop.extraDays) : 0,
			// The leg INTO this stop. Same convention the Itinerary tab uses,
			// so the mirror in a later step stays a copy rather than a shift.
			miles: stop.miles === null || stop.miles === undefined ? "" : String(stop.miles),
			drive: String(stop.drive ?? ""),
			milesSource: stop.milesSource === "manual" ? "manual" : "estimated",
			driveSource: stop.driveSource === "manual" ? "manual" : "estimated",
			lat: stop.lat ?? null,
			lng: stop.lng ?? null,
			mapboxId: stop.mapboxId || null,
		};
	}

	// The prompt deliberately never writes the yard out — the app owns it — so
	// the bookends are filled in here rather than arriving in the document.
	function withYard(stop) {
		if (!FIXED_TYPES.has(stop.type) || stop.address) return stop;
		const yard = window.RuxSettings?.getYard?.() || YARD_FALLBACK;
		stop.name = stop.name || yard.name;
		stop.address = yard.address;
		stop.lat = yard.lat ?? null;
		stop.lng = yard.lng ?? null;
		return stop;
	}

	/* Day offsets, derived.

	   Walk the stops in order carrying a running clock. Any time that moves
	   backwards has crossed midnight, so the day advances. extraDays adds an
	   explicitly-held day on top, which the clock alone can never imply — a
	   bus parked for a full free day shows the same times either way.

	   Returns one record per stop rather than mutating: the offsets are a view
	   of the times, and storing them would let the two disagree. */
	function deriveDays(stops) {
		let day = 0;
		let previous = null;
		return stops.map((stop) => {
			day += stop.extraDays;
			const arrive = clockMins(stop.arrive);
			const depart = clockMins(stop.depart);

			if (arrive !== null) {
				if (previous !== null && arrive < previous) day += 1;
				previous = arrive;
			}
			const arriveDay = day;

			let departDay = day;
			if (depart !== null) {
				if (previous !== null && depart < previous) departDay = day + 1;
				day = departDay;
				previous = depart;
			}
			return { arriveDay, departDay };
		});
	}

	/* Schedule risk, per leg.

	   The comparison is made on absolute minutes — day offset times 1440 plus
	   the clock — never on two HH:MM strings. Subtracting those directly makes
	   an overnight leg come out negative and every flag after it wrong, which
	   is the failure the old step-2 prompt called out and is easier to
	   reintroduce here, where the offsets are derived rather than typed.

	   A leg is tight when the traffic-adjusted drive does not fit in the gap
	   the schedule leaves for it. `leaveBy` is then the real answer: the time
	   the driver has to be rolling to arrive as promised. */
	function legRisks(stops, days) {
		const risks = new Array(stops.length).fill(null);
		for (let index = 1; index < stops.length; index += 1) {
			const stop = stops[index];
			const previous = stops[index - 1];
			if (stop.type === "sleeper") continue;

			const drive = driveMins(stop.drive);
			if (drive === null || drive <= 0) continue;

			const departMins = clockMins(previous.depart);
			const arriveMins = clockMins(stop.arrive);
			if (departMins === null || arriveMins === null) continue;

			const from = days[index - 1].departDay * 1440 + departMins;
			const to = days[index].arriveDay * 1440 + arriveMins;
			const gap = to - from;
			if (gap < 0) continue; // the times themselves are out of order

			const needed = Math.ceil(drive * (1 + TRAFFIC_BUFFER));
			if (gap >= needed + RISK_MARGIN_MINS) continue;

			const leaveBy = ((to - needed) % 1440 + 1440) % 1440;
			risks[index] = {
				gap,
				needed,
				leaveBy: `${String(Math.floor(leaveBy / 60)).padStart(2, "0")}:${String(leaveBy % 60).padStart(2, "0")}`,
			};
		}
		return risks;
	}

	/* What the route says about the yard, working backwards from the pickup.

	   Advisory only. The dispatcher's stated times are never overwritten —
	   that is exactly the bug the v3 importer had to avoid, where the editor
	   silently replaced a stated 04:15 yard departure with the pickup's 05:00.
	   Here the computed answer is shown beside the row and applied on request. */
	function yardPlan(stops) {
		const pickupIndex = stops.findIndex((stop) => stop.type === "pickup");
		if (pickupIndex < 1) return null;
		const pickup = stops[pickupIndex];
		const anchor = clockMins(pickup.depart);
		if (anchor === null) return null;

		const drive = driveMins(pickup.drive);
		const spot = ((anchor - spotPadding()) % 1440 + 1440) % 1440;
		const plan = { spot: toClock(spot) };
		if (drive === null || drive <= 0) return plan;

		/* Backed off by the same buffer and margin legRisks judges against, not
		   by the bare drive time. Subtracting only the drive leaves a gap
		   exactly equal to it, which the risk check then fails — so the tab
		   suggested a departure and immediately flagged the leg it created.
		   A tool that warns about its own advice teaches people to ignore the
		   warning. */
		const needed = Math.ceil(drive * (1 + TRAFFIC_BUFFER)) + RISK_MARGIN_MINS;
		const roll = ((spot - needed) % 1440 + 1440) % 1440;
		plan.roll = toClock(roll);
		plan.report = toClock(((roll - PRE_TRIP_MINS) % 1440 + 1440) % 1440);
		return plan;
	}

	function toClock(mins) {
		return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
	}

	/* Duty and drive, counted per day.

	   Hours of service are a per-day limit, so one trip-wide figure is the
	   wrong shape — a four-day trip with 40 driving hours is fine or illegal
	   depending entirely on how those hours fall across the days. */
	function dutyByDay(stops, days) {
		const perDay = new Map();
		const touch = (day) => {
			if (!perDay.has(day)) perDay.set(day, { drive: 0, first: null, last: null });
			return perDay.get(day);
		};
		stops.forEach((stop, index) => {
			const { arriveDay, departDay } = days[index];
			const drive = driveMins(stop.drive);
			if (drive) touch(arriveDay).drive += drive;

			const arrive = clockMins(stop.arrive);
			const depart = clockMins(stop.depart);
			if (arrive !== null) {
				const day = touch(arriveDay);
				day.first = day.first === null ? arrive : Math.min(day.first, arrive);
				day.last = day.last === null ? arrive : Math.max(day.last, arrive);
			}
			if (depart !== null) {
				const day = touch(departDay);
				day.first = day.first === null ? depart : Math.min(day.first, depart);
				day.last = day.last === null ? depart : Math.max(day.last, depart);
			}
		});
		return [...perDay.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([day, value]) => ({
				day,
				drive: value.drive,
				duty: value.first === null || value.last === null ? 0 : value.last - value.first,
			}));
	}

	function totals(stops) {
		let miles = 0;
		let drive = 0;
		for (const stop of stops) {
			const stopMiles = Number.parseFloat(stop.miles);
			if (Number.isFinite(stopMiles)) miles += stopMiles;
			const mins = driveMins(stop.drive);
			if (mins !== null) drive += mins;
		}
		return { miles, drive };
	}

	/* ── v3 in and out ───────────────────────────────────────────────────── */

	function fromV3(payload) {
		const doc = payload && typeof payload === "object" ? payload : {};
		const trip = doc.trip && typeof doc.trip === "object" ? doc.trip : {};
		const legs = trip.legs && typeof trip.legs === "object" ? trip.legs : {};
		const outbound = legs.outbound && typeof legs.outbound === "object" ? legs.outbound : {};
		const source = Array.isArray(outbound.stops) ? outbound.stops : [];

		const stops = [];
		const stated = [];
		let previousDay = 0;
		for (const raw of source) {
			const stop = raw && typeof raw === "object" ? raw : {};
			if (stop.type === "day") continue; // dividers are derived here
			const dayOffset = Number.isFinite(stop.day_offset) ? stop.day_offset : previousDay;
			stated.push(dayOffset);
			stops.push(withYard(normalizeStop({
				type: stop.type,
				name: stop.name,
				address: stop.address,
				addressConfidence: stop.address_confidence,
				activity: stop.activity,
				/* A pickup's arrival is its SPOT time — when the bus is staged
				   with the doors open, which is the time the passengers were
				   actually given. Reading only arrival_time dropped it: a real
				   school trip lost its 5:00 AM meet and kept only the 5:30
				   departure, and the meet is the time the parents were told. */
				arrive: stop.type === "sleeper"
					? stop.rest_start_time
					: stop.type === "pickup"
						? (stop.spot_time ?? stop.arrival_time)
						: stop.arrival_time,
				depart: stop.type === "sleeper" ? stop.rest_end_time : stop.departure_time,
				miles: stop.distance_miles,
				drive: stop.drive_time,
				milesSource: stop.distance_miles === undefined ? "estimated" : "manual",
				driveSource: stop.drive_time === undefined ? "estimated" : "manual",
			})));
			previousDay = Number.isFinite(stop.departure_day_offset)
				? stop.departure_day_offset
				: dayOffset;
		}

		/* Held days, by difference rather than by formula.

		   A draft states a day offset per stop; this tab derives one from the
		   clock. Where the two disagree, the shortfall is a day the times
		   cannot imply — a bus parked for a free day — and becomes extraDays.

		   It has to be a second pass. Whether the clock contributes a rollover
		   at a given stop depends on the times, so there is no arithmetic on
		   the offsets alone that gets it right: a fixed "minus one" over-counts
		   exactly when the times happen to move forward. And because extraDays
		   shifts every later stop too, the correction carries a running total
		   rather than being applied stop by stop. */
		const clock = deriveDays(stops);
		let shift = 0;
		stops.forEach((stop, index) => {
			const gap = stated[index] - (clock[index].arriveDay + shift);
			if (gap > 0) {
				stop.extraDays = gap;
				shift += gap;
			}
		});

		/* The routing annex, when this document came from here rather than
		   from a model. Applied only when its length matches: a draft that
		   has been edited by hand since it was saved would otherwise put one
		   stop's mileage on another's leg, which is worse than none. */
		const annex = Array.isArray(doc.rux_route) ? doc.rux_route : null;
		if (annex && annex.length === stops.length) {
			stops.forEach((stop, index) => {
				const entry = annex[index] && typeof annex[index] === "object" ? annex[index] : {};
				if (entry.miles) stop.miles = String(entry.miles);
				if (entry.drive) stop.drive = String(entry.drive);
				stop.milesSource = entry.miles_source === "manual" ? "manual" : "estimated";
				stop.driveSource = entry.drive_source === "manual" ? "manual" : "estimated";
				if (entry.lat != null) stop.lat = entry.lat;
				if (entry.lng != null) stop.lng = entry.lng;
				if (entry.mapbox_id) stop.mapboxId = entry.mapbox_id;
				if (entry.matched_address) stop.matchedAddress = entry.matched_address;
				if (entry.approx_from) stop.approxFrom = entry.approx_from;
			});
		}

		return {
			startDate: String(outbound.start_date ?? ""),
			client: String(trip.client ?? ""),
			destination: String(trip.destination ?? ""),
			dataFlags: Array.isArray(doc.data_flags) ? doc.data_flags.filter(Boolean).map(String) : [],
			stops,
		};
	}

	function toV3(state) {
		const days = deriveDays(state.stops);
		const stops = state.stops.map((stop, index) => {
			const { arriveDay, departDay } = days[index];
			const out = { type: stop.type };
			if (stop.type !== "yard_origin" && stop.type !== "return") {
				if (stop.name) out.name = stop.name;
				if (stop.address) out.address = stop.address;
				if (stop.addressConfidence) out.address_confidence = stop.addressConfidence;
				if (stop.activity) out.activity = stop.activity;
			}
			if (stop.type === "sleeper") {
				if (stop.arrive) out.rest_start_time = stop.arrive;
				if (stop.depart) out.rest_end_time = stop.depart;
			} else if (stop.type === "pickup") {
				// Emitted as spot_time, which is what it means and what the
				// Itinerary tab's importer reads first.
				if (stop.arrive) out.spot_time = stop.arrive;
				if (stop.depart) out.departure_time = stop.depart;
			} else {
				if (stop.arrive && stop.type !== "yard_origin") out.arrival_time = stop.arrive;
				if (stop.depart && stop.type !== "return") out.departure_time = stop.depart;
			}
			/* v3's distance_miles means "the source stated it" — that is why
			   the importer marks a stated value manual. So only a typed
			   override belongs here. Measured mileage is the app's own, and
			   goes in the annex below rather than being laundered into a
			   customer-stated number that no later Resolve would refresh. */
			if (stop.milesSource === "manual" && stop.miles) {
				const miles = Number.parseFloat(stop.miles);
				if (Number.isFinite(miles)) out.distance_miles = miles;
			}
			if (stop.driveSource === "manual" && stop.drive) out.drive_time = stop.drive;

			if (arriveDay) out.day_offset = arriveDay;
			if (departDay !== arriveDay) out.departure_day_offset = departDay;
			return out;
		});

		const trip = { type: "round_trip", service_type: "charter", legs: { outbound: { stops } } };
		if (state.client) trip.client = state.client;
		if (state.destination) trip.destination = state.destination;
		if (state.startDate) trip.legs.outbound.start_date = state.startDate;
		const doc = { schema_version: 3, trip };
		if (state.dataFlags.length) doc.data_flags = state.dataFlags;

		/* The routing annex.

		   Everything a Resolve pass worked out and v3 has no room for:
		   measured mileage and drive time, which of the two were typed, the
		   coordinates they were measured between, and what the geocoder
		   actually matched. Without it a saved itinerary comes back unrouted
		   and every leg has to be measured again — which is what the driver
		   sheet found by trying to print numbers that were not there.

		   It sits beside `trip` rather than inside it so the v3 document stays
		   exactly what docs/trip-import-schema-v3.json describes: Copy as JSON
		   and the importer both see a clean, schema-valid draft, and only this
		   tab's own storage carries the annex. One index per emitted stop —
		   toV3 maps one-to-one over state.stops, so the positions line up. */
		const annex = state.stops.map((stop) => {
			const entry = {};
			if (stop.miles) entry.miles = stop.miles;
			if (stop.drive) entry.drive = stop.drive;
			if (stop.milesSource === "manual") entry.miles_source = "manual";
			if (stop.driveSource === "manual") entry.drive_source = "manual";
			if (stop.lat != null) entry.lat = stop.lat;
			if (stop.lng != null) entry.lng = stop.lng;
			if (stop.mapboxId) entry.mapbox_id = stop.mapboxId;
			if (stop.matchedAddress) entry.matched_address = stop.matchedAddress;
			if (stop.approxFrom) entry.approx_from = stop.approxFrom;
			return entry;
		});
		if (annex.some((entry) => Object.keys(entry).length)) doc.rux_route = annex;
		return doc;
	}

	/* The clean draft: exactly what docs/trip-import-schema-v3.json describes.

	   Copy as JSON hands this to a person, who may paste it into the Itinerary
	   tab's importer, send it on, or validate it. The annex would fail that
	   schema — its root is additionalProperties: false — and it means nothing
	   outside this tab anyway, so it is stripped here and kept only in what
	   gets persisted. */
	function toCleanV3(state) {
		const { rux_route: _annex, ...doc } = toV3(state);
		return doc;
	}

	/* Read the Itinerary tab's stops into this model.

	   The translation is the inverse of trip-import.js's: there, a location's
	   departure is carried FORWARD onto the next card; here it is pulled back
	   off it. Stop n's depart is stop n+1's departPrev, skipping the day rows,
	   which carry no location and become derived offsets instead. */
	function fromEditorStops(source, startDate) {
		const rows = (Array.isArray(source) ? source : []).filter((stop) => stop?.type !== "day");
		const stops = [];
		let previousDate = startDate || null;

		rows.forEach((stop, index) => {
			const next = rows[index + 1];
			// A sleeper is stored inverted in the editor: its rest START is
			// departPrev and its rest END is arrive (trip-import.js writes it
			// that way, and the editor labels the pair Start/End rather than
			// Arrive/Depart). Reading it like an ordinary stop puts the end of
			// the rest in the arrival column and loses the start entirely.
			const arrive = stop.type === "pickup"
				? stop.spot || ""
				: stop.type === "sleeper"
					? stop.departPrev || ""
					: stop.arrive || "";
			const arriveDate = (stop.type === "pickup" ? stop.spotDate : stop.arriveDate) || null;
			const departDate = next?.departPrevDate || null;

			// A stop's own dates are authoritative when it has them; the clock
			// will re-derive the same offsets from the times, so this only has
			// to catch the held days that the times cannot imply.
			let extraDays = 0;
			if (previousDate && arriveDate) {
				const gap = Math.round(
					(parseIsoDate(arriveDate) - parseIsoDate(previousDate)) / 86400000,
				);
				if (Number.isFinite(gap) && gap > 1) extraDays = gap - 1;
			}

			stops.push(normalizeStop({
				type: TYPES.includes(stop.type) ? stop.type : "stop",
				name: stop.name,
				address: stop.address,
				activity: stop.type === "pickup" ? "" : stop.label || "",
				arrive,
				depart: stop.type === "sleeper" ? stop.arrive || "" : next?.departPrev || "",
				miles: stop.miles,
				drive: stop.drive,
				milesSource: stop.milesSource,
				driveSource: stop.driveSource,
				lat: stop.lat,
				lng: stop.lng,
				mapboxId: stop.mapboxId,
				extraDays,
			}));
			previousDate = departDate || arriveDate || previousDate;
		});

		// The Itinerary tab folds the yard departure onto the pickup card. Here
		// the yard is a row, so pull it back out when it carries a time.
		const pickup = rows[0];
		if (pickup?.type === "pickup" && pickup.departPrev) {
			const yard = window.RuxSettings?.getYard?.() || YARD_FALLBACK;
			stops.unshift(normalizeStop({
				type: "yard_origin",
				name: yard.name,
				address: yard.address,
				depart: pickup.departPrev,
			}));
		}
		return stops;
	}

	/* Write this model back into the Itinerary tab's, so the ordinary save
	   path persists it.

	   This is the mirror, and it is deliberately not a second write. Pushing
	   the stops into Itinerary.setStops() means collectStops() picks them up
	   and trip-db.js's existing save writes trip_stops exactly as it always
	   did — one code path, no divergence, and every downstream reader (print
	   schedules, the trip envelope, driver share, trip-bar mileage) keeps
	   working without knowing this tab exists.

	   The inverse of fromEditorStops: a stop's departure is pushed FORWARD
	   onto the next card as its departPrev, and the yard row folds into the
	   pickup. Dates are stamped from the derived day offsets, which is the one
	   thing the editor cannot work out for itself. */
	function toEditorStops(state) {
		const days = deriveDays(state.stops);
		const dated = (offset) => addDays(state.startDate, offset) || "";
		const rows = [];
		let yard = null;
		// The previous stop's departure, already resolved to a date. Carried
		// rather than looked up: it is the only thing a row needs from the one
		// before it, and searching back for it invites an off-by-one.
		let previous = null;

		state.stops.forEach((stop, index) => {
			if (stop.type === "yard_origin") {
				yard = { time: stop.depart || "", date: dated(days[index].departDay) };
				return;
			}

			const row = {
				id: stop.id,
				type: stop.type,
				name: stop.name,
				address: stop.address,
				miles: stop.miles,
				drive: stop.drive,
				milesSource: stop.milesSource,
				driveSource: stop.driveSource,
				routeStatus: stop.lat != null && stop.drive ? "current" : "stale",
				lat: stop.lat,
				lng: stop.lng,
				mapboxId: stop.mapboxId,
				dwellStatus: "on",
				departPrev: "",
				departPrevDate: "",
				arrive: "",
				arriveDate: "",
				spot: "",
				spotDate: "",
			};

			// activity rides in `label`, except on a pickup where "origin:yard"
			// owns it. Nothing here ever writes that sentinel: it means the
			// passengers board AT the depot, which is not what a yard row says.
			if (stop.type !== "pickup" && stop.activity) row.label = stop.activity;

			if (stop.type === "sleeper") {
				// Inverted on purpose — see fromEditorStops.
				row.departPrev = stop.arrive || "";
				row.departPrevDate = dated(days[index].arriveDay);
				row.arrive = stop.depart || "";
				row.arriveDate = dated(days[index].departDay);
			} else if (stop.type === "pickup") {
				row.departPrev = yard?.time || "";
				row.departPrevDate = yard?.time ? yard.date : "";
				row.spot = stop.arrive || "";
				row.spotDate = stop.arrive ? dated(days[index].arriveDay) : "";
			} else {
				row.departPrev = previous?.time || "";
				row.departPrevDate = previous?.time ? previous.date : "";
				row.arrive = stop.arrive || "";
				row.arriveDate = stop.arrive ? dated(days[index].arriveDay) : "";
			}

			// A sleeper resumes the journey at its rest end, so that is what the
			// next stop departed at — not the last travelling stop's departure.
			previous = stop.depart
				? { time: stop.depart, date: dated(days[index].departDay) }
				: previous;
			rows.push(row);
		});
		return rows;
	}

	/* ── Resolving and routing ───────────────────────────────────────────
	   Same two Mapbox endpoints the Itinerary tab uses, so both tabs get the
	   same numbers for the same road: Search Box forward for coordinates,
	   Directions v5 for the leg. Saved locations are tried first — they are
	   already-verified coordinates for places this operator actually goes, and
	   they cost nothing. */

	let locationsDbPromise = null;

	function getLocationsDb() {
		if (!locationsDbPromise) {
			locationsDbPromise = import("../data/locations-db.js?v=3").catch((error) => {
				locationsDbPromise = null;
				throw error;
			});
		}
		return locationsDbPromise;
	}

	async function fromSavedLocations(address) {
		try {
			const db = await getLocationsDb();
			const wanted = address.toLowerCase().replace(/\s+/g, " ").trim();
			const matches = await db.searchLocations(address, 5);
			return matches.find((location) => {
				if (location.lat == null || location.lng == null) return false;
				return String(location.address || "").toLowerCase().replace(/\s+/g, " ").trim() === wanted;
			}) || null;
		} catch {
			return null;
		}
	}

	/* The town an address sits in, for the fallback below.

	   A US address ends "…, City, ST ZIP", so the last two comma-separated
	   parts are the locality however much venue and street precedes them.
	   "Whataburger, Falfurrias, TX" gives "Falfurrias, TX". */
	function localityOf(address) {
		const parts = String(address ?? "").split(",").map((part) => part.trim()).filter(Boolean);
		if (parts.length < 2) return null;
		return parts.slice(-2).join(", ");
	}

	async function geocode(address, token, types = "address,poi") {
		const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
		url.searchParams.set("q", address);
		url.searchParams.set("access_token", token);
		url.searchParams.set("country", "US");
		url.searchParams.set("types", types);
		url.searchParams.set("limit", "1");
		url.searchParams.set("proximity", "ip");
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Mapbox forward failed: ${response.status}`);
		const feature = (await response.json()).features?.[0];
		const coordinates = feature?.geometry?.coordinates;
		if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
		return {
			lng: coordinates[0],
			lat: coordinates[1],
			mapboxId: feature.properties?.mapbox_id || null,
			address: feature.properties?.full_address
				|| feature.properties?.address
				|| feature.properties?.name
				|| null,
		};
	}

	async function directions(from, to, token) {
		const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
		const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
		url.searchParams.set("overview", "false");
		url.searchParams.set("access_token", token);
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Mapbox directions failed: ${response.status}`);
		const route = (await response.json()).routes?.[0];
		if (!route) return null;
		return {
			miles: (route.distance || 0) / 1609.344,
			mins: Math.round((route.duration || 0) / 60),
		};
	}

	/* ── Render ──────────────────────────────────────────────────────────── */

	function timeCell(stop, index, field, label) {
		const disabled = (field === "arrive" && stop.type === "yard_origin")
			|| (field === "depart" && stop.type === "return");
		if (disabled) return '<div class="sched-itinerary-grid__time-blank" aria-hidden="true"></div>';
		return `<label class="sched-itinerary-grid__time">
			<span class="sched-itinerary-grid__time-label">${escHtml(label)}</span>
			<input class="rux-input sched-itinerary-grid__time-input" type="time"
				data-field="${field}" data-idx="${index}" value="${escHtml(stop[field])}" />
		</label>`;
	}

	function renderRow(stop, index, days, count, extras = {}) {
		const fixed = FIXED_TYPES.has(stop.type);
		const dwell = clockMins(stop.arrive) !== null && clockMins(stop.depart) !== null
			? (clockMins(stop.depart) - clockMins(stop.arrive) + 1440) % 1440
			: null;
		const note = CONFIDENCE_NOTE[stop.addressConfidence];
		const crossesMidnight = days.departDay !== days.arriveDay;
		const located = stop.lat != null && stop.lng != null;

		return `<li class="sched-itinerary-grid__row" data-idx="${index}" data-type="${stop.type}">
			<div class="sched-itinerary-grid__marker">
				<span class="rux-icon${located ? "" : " is-unlocated"}" aria-hidden="true"
					title="${located ? escHtml(TYPE_LABEL[stop.type]) : "Address not resolved yet"}">${TYPE_ICON[stop.type]}</span>
				<span class="sched-itinerary-grid__seq">${index + 1}</span>
			</div>
			<div class="sched-itinerary-grid__times">
				${timeCell(stop, index, "arrive", "Arrive")}
				${timeCell(stop, index, "depart", "Depart")}
				${crossesMidnight ? '<span class="sched-itinerary-grid__nextday" title="Departs the next day">+1 day</span>' : ""}
			</div>
			<div class="sched-itinerary-grid__place">
				${fixed
					? `<p class="sched-itinerary-grid__fixed">${escHtml(TYPE_LABEL[stop.type])}${stop.address ? ` · ${escHtml(stop.address)}` : ""}</p>`
					: `<label class="sched-itinerary-grid__field">
						<span class="rux-field__label">Address</span>
						<input class="rux-input" type="text" data-field="address" data-idx="${index}"
							value="${escHtml(stop.address)}" autocomplete="off" spellcheck="false"/>
					</label>
					<div class="sched-itinerary-grid__pair">
						<label class="sched-itinerary-grid__field">
							<span class="rux-field__label">Name</span>
							<input class="rux-input" type="text" data-field="name" data-idx="${index}"
								value="${escHtml(stop.name)}" autocomplete="off"/>
						</label>
						<label class="sched-itinerary-grid__field">
							<span class="rux-field__label">Activity</span>
							<input class="rux-input" type="text" data-field="activity" data-idx="${index}"
								value="${escHtml(stop.activity)}" autocomplete="off"/>
						</label>
					</div>`}
				${note ? `<p class="sched-itinerary-grid__note"><span class="rux-icon" aria-hidden="true">error</span>${escHtml(note)}</p>` : ""}
				${stop.matchedAddress ? `<p class="sched-itinerary-grid__note"><span class="rux-icon" aria-hidden="true">wrong_location</span>Routed to ${escHtml(stop.matchedAddress)} — check this is the right place.</p>` : ""}
				${stop.approxFrom ? `<p class="sched-itinerary-grid__note"><span class="rux-icon" aria-hidden="true">my_location</span>Measured to ${escHtml(stop.approxFrom)}, not to this stop — get the street address.</p>` : ""}
				${extras.plan ? `<p class="sched-itinerary-grid__plan">
					<span class="rux-icon" aria-hidden="true">route</span>
					<span>${escHtml(extras.plan.text)}</span>
					<button type="button" class="rux-button rux-button--ghost rux-button--sm"
						data-apply-plan="${escHtml(extras.plan.time)}" data-idx="${index}">
						<span class="rux-button__label">Use it</span>
					</button>
				</p>` : ""}
			</div>
			<div class="sched-itinerary-grid__meta">
				${dwell ? `<span class="sched-itinerary-grid__dwell">${escHtml(formatSpan(dwell))} here</span>` : ""}
				${fixed ? "" : `<label class="sched-itinerary-grid__field sched-itinerary-grid__field--num">
					<span class="rux-field__label">Miles</span>
					<input class="rux-input sched-itinerary-grid__num" type="text" inputmode="decimal"
						data-field="miles" data-idx="${index}" value="${escHtml(stop.miles)}"
						autocomplete="off" placeholder="—"/>
				</label>`}
			</div>
			<div class="sched-itinerary-grid__actions">
				${fixed ? "" : `
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm"
					data-move="up" data-idx="${index}" aria-label="Move stop ${index + 1} earlier"
					${index <= 1 ? "disabled" : ""}><span class="rux-icon" aria-hidden="true">arrow_upward</span></button>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm"
					data-move="down" data-idx="${index}" aria-label="Move stop ${index + 1} later"
					${index >= count - 2 ? "disabled" : ""}><span class="rux-icon" aria-hidden="true">arrow_downward</span></button>
				<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-button--sm"
					data-remove data-idx="${index}" aria-label="Delete stop ${index + 1}"><span class="rux-icon" aria-hidden="true">close</span></button>`}
			</div>
		</li>`;
	}

	function renderLeg(stop, index, risk, approx) {
		const miles = Number.parseFloat(stop.miles);
		const mins = driveMins(stop.drive);
		const known = Number.isFinite(miles) || mins !== null;
		const manual = stop.milesSource === "manual" || stop.driveSource === "manual";
		return `<li class="sched-itinerary-grid__leg${known ? "" : " sched-itinerary-grid__leg--unknown"}${risk ? " sched-itinerary-grid__leg--tight" : ""}" data-leg="${index}">
			<span class="rux-icon" aria-hidden="true">${risk ? "warning" : "arrow_downward"}</span>
			${known
				? `<span>${approx ? "≈ " : ""}${Number.isFinite(miles) ? `${miles.toFixed(1)} mi` : "— mi"}${mins !== null ? ` · ${escHtml(formatSpan(mins))}` : ""}${manual ? " · entered" : ""}${approx ? " · to the town" : ""}</span>`
				: "<span>Not routed yet</span>"}
			${risk ? `<span class="sched-itinerary-grid__risk">Tight — ${escHtml(formatSpan(risk.needed))} of driving in a ${escHtml(formatSpan(risk.gap))} gap. Leave by ${escHtml(risk.leaveBy)}.</span>` : ""}
		</li>`;
	}

	function renderDay(number, iso) {
		const date = iso ? formatDay(iso) : "";
		return `<li class="sched-itinerary-grid__day">
			<span class="sched-itinerary-grid__day-number">Day ${number}</span>
			${date ? `<span class="sched-itinerary-grid__day-date">${escHtml(date)}</span>` : ""}
		</li>`;
	}

	function renderList(state) {
		if (!state.stops.length) {
			return `<li class="sched-itinerary-grid__empty">
				<span class="rux-icon" aria-hidden="true">route</span>
				<p>No stops yet. Paste a trip draft above, pull the current itinerary in, or add a stop.</p>
			</li>`;
		}
		const days = deriveDays(state.stops);
		const risks = legRisks(state.stops, days);
		const plan = yardPlan(state.stops);
		const parts = [];
		let shownDay = -1;
		state.stops.forEach((stop, index) => {
			if (days[index].arriveDay !== shownDay) {
				shownDay = days[index].arriveDay;
				parts.push(renderDay(shownDay + 1, addDays(state.startDate, shownDay)));
			}
			// The leg is emitted even on a day boundary. Letting the divider
			// stand in for it hid the drive home on every overnight trip — the
			// mileage still counted in the totals, so the row simply looked
			// unrouted while the footer said otherwise.
			if (index > 0) {
				// Either end being town-level makes the leg approximate, not
				// just the stop that could not be resolved.
				const approx = !!(stop.approxFrom || state.stops[index - 1]?.approxFrom);
				parts.push(renderLeg(stop, index, risks[index], approx));
			}
			parts.push(renderRow(stop, index, days[index], state.stops.length, {
				plan: rowPlan(stop, plan),
			}));
		});
		return parts.join("");
	}

	// The route's answer for a row, offered rather than applied. Only shown
	// when it disagrees with what is already there — an advisory that repeats
	// the value beside it is noise.
	function rowPlan(stop, plan) {
		if (!plan) return null;
		if (stop.type === "yard_origin" && plan.roll && stop.depart !== plan.roll) {
			return {
				time: plan.roll,
				text: `Route says roll at ${plan.roll}${plan.report ? ` — report ${plan.report}` : ""}`,
			};
		}
		if (stop.type === "pickup" && plan.spot && stop.arrive !== plan.spot) {
			return { time: plan.spot, text: `Spot ${plan.spot} to depart on time` };
		}
		return null;
	}

	function renderSummary(state) {
		const { miles, drive } = totals(state.stops);
		const days = deriveDays(state.stops);
		const dayCount = state.stops.length ? days[days.length - 1].departDay + 1 : 0;
		const duty = dutyByDay(state.stops, days);
		const worstDuty = duty.reduce((worst, day) => Math.max(worst, day.duty), 0);
		const stats = [
			["Stops", String(state.stops.length)],
			["Days", dayCount ? String(dayCount) : "—"],
			["Miles", miles ? miles.toFixed(1) : "—"],
			["Drive", drive ? formatSpan(drive) : "—"],
			// Per day, not per trip: hours of service is a daily limit, so the
			// worst day is the number that decides whether this trip is legal.
			["Longest day", worstDuty ? formatSpan(worstDuty) : "—"],
		];
		return stats.map(([label, value]) => `<div class="sched-itinerary-grid__stat">
			<span class="sched-itinerary-grid__stat-label">${escHtml(label)}</span>
			<span class="sched-itinerary-grid__stat-value">${escHtml(value)}</span>
		</div>`).join("");
	}

	function renderFlags(state) {
		if (!state.dataFlags.length) return "";
		return `<section class="rux-card sched-itinerary-grid__flags">
			<header class="rux-card__header">
				<span class="rux-icon" aria-hidden="true">help</span>
				<h4 class="rux-card__title">Ask the customer</h4>
			</header>
			<div class="rux-card__body">
				<ul class="sched-itinerary-grid__flag-list">
					${state.dataFlags.map((flag) => `<li>${escHtml(flag)}</li>`).join("")}
				</ul>
			</div>
		</section>`;
	}

	/* ── Init ────────────────────────────────────────────────────────────── */

	function init(root) {
		const host = root?.querySelector?.("#tp-grid") || document.getElementById("tp-grid");
		if (!host) return null;

		const state = { startDate: "", client: "", destination: "", dataFlags: [], stops: [] };

		host.innerHTML = `
		<section class="sched-itinerary-grid">
			<details class="sched-itinerary-grid__intake" data-intake open>
				<summary class="sched-itinerary-grid__intake-summary">
					<span class="rux-icon" aria-hidden="true">note_add</span>
					<span>Build from a document</span>
				</summary>
				<div class="sched-itinerary-grid__intake-body">
					<label class="sched-itinerary-grid__field">
						<span class="rux-field__label">Customer document, or a trip draft JSON</span>
						<textarea class="rux-textarea sched-itinerary-grid__paste" data-paste rows="4"
							placeholder="Paste the customer's email or schedule here, copy the prompt, then paste the JSON back."></textarea>
					</label>
					<div class="sched-itinerary-grid__intake-actions">
						<button type="button" class="rux-button rux-button--default" data-copy-prompt>
							<span class="rux-icon" aria-hidden="true">content_copy</span>
							<span class="rux-button__label">Copy prompt + document</span>
						</button>
						<button type="button" class="rux-button rux-button--accent" data-load>
							<span class="rux-icon" aria-hidden="true">download</span>
							<span class="rux-button__label">Load JSON</span>
						</button>
						<button type="button" class="rux-button rux-button--ghost" data-pull>
							<span class="rux-icon" aria-hidden="true">move_down</span>
							<span class="rux-button__label">Pull from Itinerary tab</span>
						</button>
					</div>
					<p class="sched-itinerary-grid__status" data-status role="status" aria-live="polite"></p>
				</div>
			</details>

			<div class="sched-itinerary-grid__summary" data-summary></div>
			<div class="sched-itinerary-grid__toolbar">
				<button type="button" class="rux-button rux-button--accent" data-route>
					<span class="rux-icon" aria-hidden="true">explore</span>
					<span class="rux-button__label">Resolve &amp; route</span>
				</button>
				<p class="sched-itinerary-grid__status" data-route-status role="status" aria-live="polite"></p>
			</div>
			<div data-flags></div>
			<ol class="sched-itinerary-grid__list" data-list></ol>

			<div class="sched-itinerary-grid__footer">
				<button type="button" class="rux-button rux-button--default rux-button--block" data-add>
					<span class="rux-icon" aria-hidden="true">add</span>
					<span class="rux-button__label">Add stop</span>
				</button>
				<button type="button" class="rux-button rux-button--default" data-print>
					<span class="rux-icon" aria-hidden="true">print</span>
					<span class="rux-button__label">Driver sheet</span>
				</button>
				<button type="button" class="rux-button rux-button--ghost" data-copy-json>
					<span class="rux-icon" aria-hidden="true">data_object</span>
					<span class="rux-button__label">Copy as JSON</span>
				</button>
			</div>
		</section>`;

		const listEl = host.querySelector("[data-list]");
		const summaryEl = host.querySelector("[data-summary]");
		const flagsEl = host.querySelector("[data-flags]");
		const pasteEl = host.querySelector("[data-paste]");
		const statusEl = host.querySelector("[data-status]");
		const intakeEl = host.querySelector("[data-intake]");
		const routeStatusEl = host.querySelector("[data-route-status]");
		const routeBtn = host.querySelector("[data-route]");
		let routing = false;

		function say(message, isError = false) {
			statusEl.textContent = message;
			statusEl.classList.toggle("is-error", !!isError);
		}

		function sayRoute(message, isError = false) {
			routeStatusEl.textContent = message;
			routeStatusEl.classList.toggle("is-error", !!isError);
		}

		function render() {
			listEl.innerHTML = renderList(state);
			summaryEl.innerHTML = renderSummary(state);
			flagsEl.innerHTML = renderFlags(state);
			intakeEl.open = state.stops.length === 0;
		}

		function scaffold() {
			const yard = window.RuxSettings?.getYard?.() || YARD_FALLBACK;
			return [
				normalizeStop({ type: "yard_origin", name: yard.name, address: yard.address }),
				normalizeStop({ type: "pickup" }),
				normalizeStop({ type: "stop" }),
				normalizeStop({ type: "return", name: yard.name, address: yard.address }),
			];
		}

		/* Edits write straight into the model and re-render. A full rebuild is
		   affordable here because every commit is on `change`, not `input` —
		   the field the dispatcher is typing in is never replaced under them,
		   which is the same reason the Itinerary tab can rebuild too. */
		host.addEventListener("change", (event) => {
			const field = event.target.closest("[data-field]");
			if (!field) return;
			const stop = state.stops[Number(field.dataset.idx)];
			if (!stop) return;
			const name = field.dataset.field;

			if (name === "miles") {
				// Typing a mileage is an override, and it has to survive the
				// next Resolve — the Itinerary tab has this handler too but
				// renders no input for it, so the path is dead there.
				const typed = field.value.trim();
				const number = Number.parseFloat(typed);
				stop.miles = typed && Number.isFinite(number) ? number.toFixed(1) : "";
				stop.milesSource = stop.miles ? "manual" : "estimated";
				render();
				return;
			}

			stop[name] = field.value;
			if (name === "address") {
				// A changed address invalidates the coordinates it was resolved
				// to, and the leg measured from them. Clearing the source lets
				// the next Resolve replace numbers it had previously measured,
				// while a manually typed mileage still stands.
				stop.addressConfidence = null;
				stop.matchedAddress = null;
				stop.approxFrom = null;
				stop.lat = null;
				stop.lng = null;
				stop.mapboxId = null;
			}
			render();
		});

		host.addEventListener("click", (event) => {
			const move = event.target.closest("[data-move]");
			if (move) {
				const from = Number(move.dataset.idx);
				const to = move.dataset.move === "up" ? from - 1 : from + 1;
				// The yard bookends are not reorderable and nothing may pass them.
				if (to < 1 || to > state.stops.length - 2) return;
				const [row] = state.stops.splice(from, 1);
				state.stops.splice(to, 0, row);
				render();
				host.querySelector(`[data-move="${move.dataset.move}"][data-idx="${to}"]`)?.focus();
				return;
			}

			const remove = event.target.closest("[data-remove]");
			if (remove) {
				const index = Number(remove.dataset.idx);
				const stop = state.stops[index];
				const what = stop?.name || stop?.address || `stop ${index + 1}`;
				if (!window.confirm(`Delete ${what}?`)) return;
				state.stops.splice(index, 1);
				render();
				return;
			}

			if (event.target.closest("[data-add]")) {
				if (!state.stops.length) state.stops = scaffold();
				else state.stops.splice(Math.max(1, state.stops.length - 1), 0, normalizeStop({ type: "stop" }));
				render();
				const rows = host.querySelectorAll('[data-field="address"]');
				rows[rows.length - 1]?.focus();
				return;
			}

			const apply = event.target.closest("[data-apply-plan]");
			if (apply) {
				const stop = state.stops[Number(apply.dataset.idx)];
				if (!stop) return;
				// yard_origin has no arrival, so the route's answer for it is
				// its departure; the pickup's is when it must be staged.
				if (stop.type === "yard_origin") stop.depart = apply.dataset.applyPlan;
				else stop.arrive = apply.dataset.applyPlan;
				render();
				return;
			}

			if (event.target.closest("[data-load]")) return loadPasted();
			if (event.target.closest("[data-copy-prompt]")) return copyPrompt();
			if (event.target.closest("[data-copy-json]")) return copyJson();
			if (event.target.closest("[data-pull]")) return pullFromItinerary();
			if (event.target.closest("[data-route]")) return resolveAndRoute();
			if (event.target.closest("[data-print]")) return printDriverSheet();
		});

		function loadPasted() {
			const text = pasteEl.value.trim();
			if (!text) return say("Paste a trip draft JSON first.", true);
			let payload;
			try {
				// Tolerate a ```json fence, which is what most assistants return.
				const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
				payload = JSON.parse(fenced ? fenced[1] : text);
			} catch {
				return say("That is not valid JSON. Paste the whole object, braces included.", true);
			}
			if (Number(payload?.schema_version) !== 3) {
				return say("Expected a Trip Draft v3 document (\"schema_version\": 3).", true);
			}
			const loaded = fromV3(payload);
			if (!loaded.stops.length) return say("That draft has no stops in its outbound leg.", true);
			Object.assign(state, loaded);
			pasteEl.value = "";
			render();
			say(`Loaded ${loaded.stops.length} stops${loaded.dataFlags.length ? `, ${loaded.dataFlags.length} to ask about` : ""}.`);
		}

		async function copyPrompt() {
			const document_ = pasteEl.value.trim();
			let prompt;
			try {
				const response = await fetch(PROMPT_URL);
				if (!response.ok) throw new Error(String(response.status));
				prompt = await response.text();
			} catch {
				return say("Could not read the prompt. Open docs/itinerary-prompt.md and copy it by hand.", true);
			}
			// The prompt carries its own placeholder; swapping the document in
			// means the dispatcher pastes once instead of twice.
			const assembled = document_
				? prompt.replace("[PASTE THE CUSTOMER'S SCHEDULE, EMAIL, OR DOCUMENT HERE]", document_)
				: prompt;
			try {
				await navigator.clipboard.writeText(assembled);
				say(document_
					? "Prompt and document copied. Paste it into Claude, then bring the JSON back here."
					: "Prompt copied — it still has its placeholder, so paste the document into it.");
			} catch {
				say("Clipboard was refused. Copy docs/itinerary-prompt.md by hand.", true);
			}
		}

		async function copyJson() {
			if (!state.stops.length) return say("Nothing to copy yet.", true);
			try {
				await navigator.clipboard.writeText(JSON.stringify(toCleanV3(state), null, 2));
				say("Copied this itinerary as Trip Draft v3.");
			} catch {
				say("Clipboard was refused.", true);
			}
		}

		/* Resolve every address, then measure every leg.

		   Sequential on purpose. A ten-stop trip is twenty Mapbox calls, and
		   firing those in parallel buys a second of wall clock in exchange for
		   rate-limit risk on a token the operator pays for. Progress is
		   reported as it goes so the wait is legible.

		   A manual mileage or drive time is never overwritten. Typing a number
		   is the dispatcher overriding the route on purpose — usually because
		   the coach cannot take the road the router chose — and a Resolve that
		   silently reverted it would make the button unusable. */
		async function resolveAndRoute() {
			if (routing) return;
			if (!state.stops.length) return sayRoute("Nothing to route yet.", true);
			const token = window.RuxSettings?.getMapboxToken?.();
			if (!token) {
				return sayRoute("No Mapbox token — add one in Settings to resolve and route.", true);
			}

			routing = true;
			routeBtn.disabled = true;
			let resolved = 0;
			let routed = 0;
			let approximated = 0;
			let failed = 0;

			try {
				for (const [index, stop] of state.stops.entries()) {
					const address = stop.address.trim();
					if (stop.lat != null && stop.lng != null) continue;
					if (address.length < 3) continue;
					sayRoute(`Resolving stop ${index + 1} of ${state.stops.length}…`);

					// A saved location is a place this operator has actually been,
					// with coordinates already verified against a real trip. That
					// is the one match strong enough to retire the model's doubt
					// about the address.
					const saved = await fromSavedLocations(address);
					if (saved) {
						stop.lat = saved.lat;
						stop.lng = saved.lng;
						stop.mapboxId = saved.mapboxId || null;
						stop.addressConfidence = null;
						stop.matchedAddress = null;
						stop.approxFrom = null;
						resolved += 1;
						continue;
					}
					try {
						const found = await geocode(address, token);
						if (found) {
							stop.lat = found.lat;
							stop.lng = found.lng;
							stop.mapboxId = found.mapboxId;
							/* address_confidence deliberately survives this.

							   Geocoding does not verify an address, it picks the
							   nearest thing it can find — asked for "zzz not a
							   real place zzz" it returned a real address twenty
							   miles away, and routed to it. Clearing the model's
							   own doubt on a hit would erase the warning exactly
							   where it is most needed, and leave a confidently
							   wrong mileage behind it.

							   What is recorded instead is WHAT it matched, so a
							   substitution is visible rather than silent. */
							stop.matchedAddress = found.address && !sameAddress(address, found.address)
								? found.address
								: null;
							stop.approxFrom = null;
							resolved += 1;
							continue;
						}

						/* Nothing matched. Fall back to the TOWN.

						   A leg that cannot be measured is worse than one
						   measured approximately, because the miles it drops
						   come off the whole trip's total: a real Six Flags
						   itinerary quoted 150 miles short because one
						   breakfast stop had no street address. In a town the
						   size of Falfurrias every address is within a mile of
						   every other, so measuring to the town is accurate to
						   about the mile — which is a quoting error nobody can
						   see, against one that loses a leg entirely.

						   It is never silently exact, though. approxFrom
						   records what was actually measured to, the row and
						   the driver sheet both say so, and the stop's typed
						   address is left exactly as it was — a driver must
						   never be sent to a town centre believing it is the
						   Whataburger. */
						const town = localityOf(address);
						if (town && town.toLowerCase() !== address.toLowerCase()) {
							const place = await geocode(town, token, "place,locality,postcode");
							if (place) {
								stop.lat = place.lat;
								stop.lng = place.lng;
								stop.mapboxId = null;
								stop.matchedAddress = null;
								stop.approxFrom = place.address || town;
								approximated += 1;
								continue;
							}
						}
						failed += 1;
					} catch (error) {
						console.warn("Grid geocode failed:", error);
						failed += 1;
					}
				}

				for (let index = 1; index < state.stops.length; index += 1) {
					const stop = state.stops[index];
					// A sleeper rests where the bus already is, so its leg is
					// zero by definition rather than something to measure.
					if (stop.type === "sleeper") {
						stop.miles = "0.0";
						stop.drive = "0:00";
						continue;
					}
					if (stop.milesSource === "manual" && stop.driveSource === "manual") continue;
					const previous = state.stops[index - 1];
					if (previous.lat == null || stop.lat == null) continue;

					sayRoute(`Routing leg ${index} of ${state.stops.length - 1}…`);
					try {
						const leg = await directions(previous, stop, token);
						if (!leg) { failed += 1; continue; }
						if (stop.milesSource !== "manual") stop.miles = leg.miles.toFixed(1);
						if (stop.driveSource !== "manual") {
							stop.drive = `${Math.floor(leg.mins / 60)}:${String(leg.mins % 60).padStart(2, "0")}`;
						}
						routed += 1;
					} catch (error) {
						console.warn("Grid directions failed:", error);
						failed += 1;
					}
				}
			} finally {
				routing = false;
				routeBtn.disabled = false;
				render();
			}

			const parts = [];
			if (resolved) parts.push(`${resolved} address${resolved === 1 ? "" : "es"} resolved`);
			if (approximated) {
				parts.push(`${approximated} measured to the town only — ${approximated === 1 ? "its address is" : "their addresses are"} still needed`);
			}
			if (routed) parts.push(`${routed} leg${routed === 1 ? "" : "s"} measured`);
			if (failed) parts.push(`${failed} could not be worked out`);
			sayRoute(
				parts.length ? `${parts.join(", ")}.` : "Everything was already resolved and routed.",
				failed > 0 || approximated > 0,
			);
		}

		/* Hand the driver sheet everything already worked out here.

		   It computes nothing of its own on purpose: a second implementation
		   of the day offsets, the tight-leg test or the duty arithmetic is a
		   second answer waiting to disagree with what is on screen, and the
		   one on paper is the one nobody can check against anything. */
		function printDriverSheet() {
			if (!state.stops.length) {
				return sayRoute("Nothing to print yet — load a draft or pull the itinerary in.", true);
			}
			const days = deriveDays(state.stops);
			const printed = window.DriverSheet?.print?.({
				meta: {
					client: state.client || document.getElementById("tp-customer")?.value || "",
					destination: state.destination || document.getElementById("tp-destination")?.value || "",
					contactName: document.getElementById("tp-contact-1-name")?.value || "",
					contactPhone: document.getElementById("tp-contact-1-phone")?.value || "",
				},
				startDate: state.startDate || document.getElementById("tp-start")?.value || "",
				stops: state.stops,
				days,
				risks: legRisks(state.stops, days),
				plan: yardPlan(state.stops),
				duty: dutyByDay(state.stops, days),
				totals: totals(state.stops),
				dataFlags: state.dataFlags,
			});
			if (printed === false || printed === undefined) {
				sayRoute("The driver sheet could not be built.", true);
			}
		}

		function pullFromItinerary() {
			const source = window.Itinerary?.getStops?.();
			if (!Array.isArray(source) || !source.length) {
				return say("The Itinerary tab has no stops to pull.", true);
			}
			const startDate = document.getElementById("tp-start")?.value || "";
			state.startDate = startDate;
			state.client = document.getElementById("tp-customer")?.value || "";
			state.destination = document.getElementById("tp-destination")?.value || "";
			state.dataFlags = [];
			state.stops = fromEditorStops(source, startDate);
			render();
			say(`Pulled ${state.stops.length} stops from the Itinerary tab. Nothing is written back.`);
		}

		render();

		let gridDb = null;
		function getGridDb() {
			if (!gridDb) {
				gridDb = import("../data/itinerary-grid-db.js?v=1").catch((error) => {
					gridDb = null;
					throw error;
				});
			}
			return gridDb;
		}

		const api = {
			getDocument: () => toCleanV3(state),
			setDocument(payload) {
				Object.assign(state, fromV3(payload));
				render();
			},

			/* ── The three hooks trip-db.js calls ──────────────────────────
			   All three are optional-chained at their call sites, so the Grid
			   tab failing to load can never break a trip save. */

			// Called before collectStops(). Pushes this tab's stops into the
			// Itinerary tab so the ordinary save path writes trip_stops.
			//
			// The empty guard is the whole safety of this design: an untouched
			// Grid tab must never wipe an itinerary the dispatcher entered in
			// the other tab. No stops here means this tab has nothing to say.
			//
			// The projection is not always identical, and that is expected.
			// setStops() runs the editor's own derivation cascade, so a return
			// whose stated arrival contradicts the measured route comes out as
			// departure-plus-drive instead — 20:00 became 11:55 on a trip whose
			// route says 11:55. The document keeps what the customer said; the
			// projection carries what the road says. Both are true, and the one
			// that survives is the one this tab owns.
			mirrorToItinerary() {
				if (!state.stops.length) return false;
				const rows = toEditorStops(state);
				if (!rows.length) return false;
				window.Itinerary?.setStops?.(rows, "outbound");
				return true;
			},

			// Called after a successful save, with the id the trip was saved
			// under. Never throws: the stops are already safely in trip_stops
			// by this point, so losing the document must not lose the trip.
			async persist(tripId) {
				if (!tripId || !state.stops.length) return false;
				try {
					const db = await getGridDb();
					const stored = await db.saveItineraryDocument(tripId, toV3(state));
					if (stored) sayRoute("Itinerary saved.");
					return stored;
				} catch (error) {
					console.warn("The Grid itinerary could not be persisted:", error);
					return false;
				}
			},

			// Called when a trip opens. A stored document wins over whatever
			// was on screen; no document leaves the tab empty rather than
			// guessing from trip_stops, because Pull from Itinerary tab is the
			// explicit way to do that and a silent one would hide which of the
			// two tabs a trip is actually being edited in.
			async hydrate(tripId) {
				if (!tripId) return false;
				try {
					const db = await getGridDb();
					const document = await db.loadItineraryDocument(tripId);
					if (!document) return false;
					Object.assign(state, fromV3(document));
					render();
					say(`Loaded this trip's saved itinerary — ${state.stops.length} stops.`);
					return true;
				} catch (error) {
					console.warn("The Grid itinerary could not be loaded:", error);
					return false;
				}
			},
			clear() {
				Object.assign(state, {
					startDate: "", client: "", destination: "", dataFlags: [], stops: [],
				});
				pasteEl.value = "";
				say("");
				render();
			},
		};
		window.ItineraryGrid = Object.assign(window.ItineraryGrid || {}, api);
		return api;
	}

	window.ItineraryGrid = {
		init, fromV3, toV3, deriveDays, fromEditorStops, normalizeStop,
		legRisks, yardPlan, dutyByDay, sameAddress, toEditorStops, toCleanV3, localityOf,
	};
})();
