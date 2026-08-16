/* ==========================================================================
   RUX UI — ITINERARY
   --------------------------------------------------------------------------
   Functional stop-timeline editor for the trip panel Itinerary tab.

   Data model
   ----------
   stops[]  — flat array mixing stop objects and day-break markers:
	 { type: "day", label: "YYYY-MM-DD", departPrev: "00:00" } // non-stop boundary
	 { type: "pickup", name, address, miles, drive, departPrevDate, departPrev, spotDate, spot }
	 { type: "stop", name, address, miles, drive, departPrevDate, departPrev, arriveDate, arrive }
	 { type: "return", name, address, miles, drive, departPrevDate, departPrev, arriveDate, arrive }

   Each card always answers "the journey to get here":
     departPrev  = time you left the previous location heading to this card
     spot/arrive = time you arrive at this card's location

   The yard is the implicit origin — loaded from Settings with a fallback.

   API
   ---
   Itinerary.init(root)   → wire up a .rux-trip-itinerary element
   ========================================================================== */

(function () {
	"use strict";

	/* ── Config ──────────────────────────────────────────────────────────── */

	const DEFAULT_YARD = {
		name: "Yard",
		address: "2801 Zinnia Ave, McAllen, TX 78504",
	};

	function getYard() {
		const yard = window.RuxSettings?.getYard?.();
		if (!yard || typeof yard !== "object") return DEFAULT_YARD;
		return {
			name: String(yard.name || DEFAULT_YARD.name).trim() || DEFAULT_YARD.name,
			address: String(yard.address || DEFAULT_YARD.address).trim() || DEFAULT_YARD.address,
			lat: yard.lat ?? null,
			lng: yard.lng ?? null,
		};
	}

	function getMapboxToken() {
		return window.RuxSettings?.getMapboxToken?.() || "";
	}

	function displayAddress(address) {
		return window.RuxAddress?.display?.(address)
			?? String(address || "").trim();
	}

	function isIsoDate(value) {
		return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
	}

	function addIsoDays(iso, days) {
		if (!isIsoDate(iso)) return "";
		const date = new Date(`${iso}T12:00:00`);
		date.setDate(date.getDate() + days);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	function inclusiveIsoDayCount(start, end) {
		if (!isIsoDate(start) || !isIsoDate(end) || end < start) return 1;
		const startMs = new Date(`${start}T12:00:00`).getTime();
		const endMs = new Date(`${end}T12:00:00`).getTime();
		return Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
	}

	function formatBoundaryDate(iso) {
		if (!isIsoDate(iso)) return "Date needed";
		return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	}

	/* ── Default demo data ───────────────────────────────────────────────── */

	function defaultPickup() {
		return {
			type: "pickup",
			originMode: "pickup",
			name: "",
			address: "",
			miles: "",
			drive: "",
			milesSource: "estimated",
			driveSource: "estimated",
			routeStatus: "stale",
			departPrev: "",
			departPrevDate: "",
			spot: "",
			spotDate: "",
			dwellStatus: "on",
			lat: null,
			lng: null,
			mapboxId: null,
		};
	}

	function defaultStop() {
		return {
			type: "stop",
			name: "",
			address: "",
			miles: "",
			drive: "",
			milesSource: "estimated",
			driveSource: "estimated",
			routeStatus: "stale",
			departPrev: "",
			departPrevDate: "",
			arrive: "",
			arriveDate: "",
			dwellStatus: "on",
			lat: null,
			lng: null,
			mapboxId: null,
		};
	}

	function defaultReturn() {
		const yard = getYard();
		return {
			type: "return",
			name: yard.name,
			address: yard.address,
			lat: yard.lat ?? null,
			lng: yard.lng ?? null,
			miles: "",
			drive: "",
			milesSource: "estimated",
			driveSource: "estimated",
			routeStatus: "stale",
			departPrev: "",
			departPrevDate: "",
			arrive: "",
			arriveDate: "",
		};
	}

	function defaultStops() {
		// Stop 1 is the real timing anchor now (Pickup's Dep/Spot derive from
		// it), so a fresh trip starts with one already in place — still a
		// normal, deletable Stop, not a permanent fixture like Pickup/Return.
		return [defaultPickup(), defaultStop(), defaultReturn()];
	}

	function normalizeStop(stop) {
		const value = stop && typeof stop === "object" ? stop : {};
		const type = value.type || "stop";
		return {
			...value,
			type,
			originMode: type === "pickup" && (value.originMode === "yard" || value.label === "origin:yard")
				? "yard"
				: "pickup",
			name: value.name || "",
			address: value.address || "",
			miles: value.miles || "",
			drive: value.drive || "",
			milesSource: value.milesSource === "manual" ? "manual" : "estimated",
			driveSource: value.driveSource === "manual" ? "manual" : "estimated",
			routeStatus: value.routeStatus === "stale" ? "stale" : "current",
			departPrev: value.departPrev || "",
			departPrevDate: value.departPrevDate || "",
			arrive: value.arrive || "",
			dwellStatus: ["off", "sleeper", "on"].includes(value.dwellStatus) ? value.dwellStatus : "on",
			arriveDate: value.arriveDate || "",
			spot: value.spot || "",
			spotDate: value.spotDate || "",
			lat: value.lat ?? null,
			lng: value.lng ?? null,
			mapboxId: value.mapboxId || null,
		};
	}

	/* ── Helpers ───────────────────────────────────────────────────── */

	function parseDriveMins(s) {
		const parts = String(s || "0:00").split(":");
		return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
	}

	function minsToTimeStr(mins) {
		const h = Math.floor(mins / 60) % 24;
		const m = mins % 60;
		return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
	}

	function parseClockMins(t) {
		if (!t) return null;
		const parts = String(t).split(":");
		const h = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
		return h * 60 + m;
	}

	function formatDriveMins(mins) {
		return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
	}

	function escHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function formatDriveValue(minutes) {
		return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
	}

	function sourceLabel(source) {
		return source === "manual" ? "Manual" : "Est";
	}

	function sourceClass(source) {
		return source === "manual" ? " rux-trip-itinerary__source--manual" : "";
	}

	function routeSourceLabel(stop, field) {
		const source = field === "miles" ? stop.milesSource : stop.driveSource;
		if (stop.routeStatus === "stale") return "Route";
		if (source === "manual") return "Manual";
		return "";
	}

	function fieldLabelHtml(text, stop, field) {
		const label = routeSourceLabel(stop, field);
		const badge = label
			? `<span class="rux-trip-itinerary__source${routeSourceClass(stop, field)}">${label}</span>`
			: "";
		const cls = label ? " rux-trip-itinerary__field-label--with-source" : "";
		return `<span class="rux-trip-itinerary__field-label${cls}">${text}${badge}</span>`;
	}

	function routeSourceClass(stop, field) {
		const source = field === "miles" ? stop.milesSource : stop.driveSource;
		if (stop.routeStatus === "stale") return " rux-trip-itinerary__source--stale";
		return sourceClass(source);
	}

	function formatMilesValue(meters) {
		return (meters / 1609.34).toFixed(1);
	}

	function uuid() {
		return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	function parseTimeToMins(t) {
		if (!t) return null;
		const [h, m] = t.split(":").map(Number);
		return h * 60 + m;
	}

	// Elapsed minutes from start to end, handling midnight crossover.
	function minutesBetween(start, end) {
		if (start === null || end === null) return null;
		const diff = end - start;
		return diff < 0 ? diff + 24 * 60 : diff;
	}

	function elapsedMinutes(startDate, startTime, endDate, endTime) {
		if (isIsoDate(startDate) && startTime && isIsoDate(endDate) && endTime) {
			const start = new Date(`${startDate}T${startTime}:00`).getTime();
			const end = new Date(`${endDate}T${endTime}:00`).getTime();
			if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
				return Math.round((end - start) / 60000);
			}
		}
		return minutesBetween(parseTimeToMins(startTime), parseTimeToMins(endTime));
	}

	function datedMinute(date, time) {
		if (!isIsoDate(date) || !time) return null;
		const value = new Date(`${date}T${time}:00`).getTime();
		return Number.isFinite(value) ? Math.round(value / 60000) : null;
	}

	// Name of the stop that precedes index idx (skipping day items).
	// Returns null if idx is the first real stop (origin = yard).
	function prevStopName(stops, idx) {
		for (let i = idx - 1; i >= 0; i--) {
			if (stops[i].type === "pickup" && stops[i].originMode === "yard") return getYard().name || "Yard";
			if (stops[i].type !== "day") return stops[i].name || "previous stop";
		}
		return null;
	}

	function fromYardText() {
		const yard = getYard();
		return `From ${yard.name || "yard"}`;
	}

	// Single pass over stops building the raw duty data everything else (day-
	// card totals, off-duty totals, cross-midnight session totals) derives
	// from. Alongside on-duty/off-duty intervals, it assigns each stop a
	// `sessionId` — a duty session is a maximal run of on-duty activity
	// bounded by off-duty/sleeper periods (real HOS duty-day segmentation,
	// not calendar midnight), so a session that runs past midnight without a
	// break still accumulates as one continuous total for the 10hr driving /
	// 15hr duty warnings, instead of resetting at the calendar boundary.
	function dutyIntervalData(stops) {
		const onDuty = []; // { start, end, sessionId, kind: "drive" | "stationary" }
		const offDuty = []; // { start, end }
		const legs = []; // { sessionId, arriveMinute, miles } — one per real stop, for session mileage totals
		// Session id "as of" each stop's own arrival — captured before that
		// stop's own off/sleeper status (if any) closes it out, so a dwell
		// card can look up totals for the session its own arrival concluded.
		const sessionIdByStopIdx = new Map();
		let sessionId = 0;
		let sessionHasActivity = false;

		const pushInterval = (arr, startDate, startTime, endDate, endTime, extra) => {
			const start = datedMinute(startDate, startTime);
			const end = datedMinute(endDate, endTime);
			if (start === null || end === null || end <= start) return;
			arr.push({ start, end, ...extra });
		};
		const breakSession = () => {
			if (sessionHasActivity) {
				sessionId += 1;
				sessionHasActivity = false;
			}
		};

		for (let i = 0; i < stops.length; i += 1) {
			const current = stops[i];
			if (!current || current.type === "day") continue;

			if (current.type === "sleeper") {
				// Sleeper pauses a session instead of ending it — it contributes
				// nothing to on-duty/drive/miles (correctly excluded below), but
				// the session spanning it stays one continuous window through to
				// the next real Off Duty, matching how a multi-day run with a
				// sleeper break in the middle is still "one trip" for mileage/
				// drive-hour purposes. Off duty (not sleeper) is what actually
				// resets the session — see the status!=="on" branch below.
				sessionIdByStopIdx.set(i, sessionId);
				pushInterval(offDuty, current.departPrevDate, current.departPrev, current.arriveDate, current.arrive);
				continue;
			}

			// Every routed leg is driving: departure from the previous location
			// through arrival at this one. Tagged kind:"drive" — the wall-clock
			// scheduled duration, not the separate route-estimate .drive field,
			// so a session's drive total stays consistent with its on-duty
			// total (same source data) instead of drifting from it by whatever
			// buffer the schedule builds in beyond the raw estimate.
			const arrivalDate = current.type === "pickup" ? current.spotDate : current.arriveDate;
			const arrivalTime = current.type === "pickup" ? current.spot : current.arrive;
			const before = onDuty.length;
			pushInterval(onDuty, current.departPrevDate, current.departPrev, arrivalDate, arrivalTime, { sessionId, kind: "drive" });
			if (onDuty.length > before) sessionHasActivity = true;

			// Meet-at-yard begins duty before the bus moves. Its synthetic Pickup
			// record stores Meet in spot/spotDate and Yard Depart in departPrev.
			if (current.type === "pickup" && current.originMode === "yard") {
				const beforeMeet = onDuty.length;
				pushInterval(onDuty, current.spotDate, current.spot, current.departPrevDate, current.departPrev, { sessionId, kind: "stationary" });
				if (onDuty.length > beforeMeet) sessionHasActivity = true;
			}

			legs.push({ sessionId, arriveMinute: datedMinute(arrivalDate, arrivalTime), miles: parseFloat(current.miles || 0) });

			if (current.type === "return") continue;

			// A stop's selected status owns the stationary interval after arrival
			// and before whatever comes next — a Sleeper card counts here too:
			// its own Str (departPrev) is exactly where this stop's dwell ends,
			// not something to skip past in search of the next travel stop
			// (that would either wrongly stretch this interval across the
			// entire rest period, or silently drop it if nothing dated
			// follows the sleeper yet). On duty contributes to onDuty; off/
			// sleeper contribute to offDuty, but only "off" ends the session —
			// "sleeper" pauses it, same reasoning as the Sleeper-card branch.
			const status = current.dwellStatus || "on";
			const next = stops.slice(i + 1).find((item) => item.type !== "day");
			if (status === "on") {
				if (next) {
					const beforeStationary = onDuty.length;
					pushInterval(onDuty, arrivalDate, arrivalTime, next.departPrevDate, next.departPrev, { sessionId, kind: "stationary" });
					if (onDuty.length > beforeStationary) sessionHasActivity = true;
				}
			} else {
				sessionIdByStopIdx.set(i, sessionId);
				if (next) pushInterval(offDuty, arrivalDate, arrivalTime, next.departPrevDate, next.departPrev);
				if (status === "off") breakSession();
			}
		}
		return { onDuty, offDuty, legs, sessionIdByStopIdx };
	}

	function sumIntervalsInWindow(intervals, windowStart = null, windowEnd = null) {
		if (!intervals.length) return null;
		return intervals.reduce((total, interval) => {
			const start = windowStart === null ? interval.start : Math.max(interval.start, windowStart);
			const end = windowEnd === null ? interval.end : Math.min(interval.end, windowEnd);
			return total + Math.max(0, end - start);
		}, 0);
	}

	function dutyMinutesInWindow(stops, windowStart = null, windowEnd = null) {
		return sumIntervalsInWindow(dutyIntervalData(stops).onDuty, windowStart, windowEnd);
	}

	// Which duty session is "current" as of windowEnd — the session whose
	// on-duty activity is closest to (but not after) that point. Sessions
	// are chronological by construction, so the last interval starting
	// before windowEnd identifies it.
	function activeSessionIdThroughWindow(onDuty, windowEnd) {
		const relevant = windowEnd === null ? onDuty : onDuty.filter((iv) => iv.start < windowEnd);
		if (!relevant.length) return null;
		return relevant[relevant.length - 1].sessionId;
	}

	// Running on-duty/drive totals for one session, from its true start (not
	// clipped to any calendar day) up through windowEnd — the amount "used"
	// against that session's 10hr/15hr HOS limits as of this point, letting
	// a session that crosses midnight still trip the warning correctly.
	function sessionOnDutyThroughWindow(onDuty, sessionId, windowEnd) {
		if (sessionId === null) return null;
		let total = 0;
		for (const iv of onDuty) {
			if (iv.sessionId !== sessionId) continue;
			const end = windowEnd === null ? iv.end : Math.min(iv.end, windowEnd);
			total += Math.max(0, end - iv.start);
		}
		return total;
	}

	// Same source data as sessionOnDutyThroughWindow (the wall-clock intervals
	// in onDuty), just restricted to kind:"drive" — so drive is guaranteed a
	// subset of on-duty for the same session, never an inconsistent number
	// pulled from a separate route-estimate field.
	function sessionDriveThroughWindow(onDuty, sessionId, windowEnd) {
		if (sessionId === null) return null;
		let total = 0;
		for (const iv of onDuty) {
			if (iv.sessionId !== sessionId || iv.kind !== "drive") continue;
			const end = windowEnd === null ? iv.end : Math.min(iv.end, windowEnd);
			total += Math.max(0, end - iv.start);
		}
		return total;
	}

	function sessionMilesThroughWindow(legs, sessionId, windowEnd) {
		if (sessionId === null) return null;
		let total = 0;
		for (const leg of legs) {
			if (leg.sessionId !== sessionId) continue;
			if (windowEnd !== null && leg.arriveMinute !== null && leg.arriveMinute > windowEnd) continue;
			total += leg.miles;
		}
		return total;
	}

	// Stats for the day-card ending at dayIdx (an "End day" marker, or
	// stops.length for the trailing/Trip Complete segment). Day markers are
	// a display/date concept only — which stops render under this card —
	// and never clip the actual on-duty/drive/miles totals below. Those are
	// always the FULL duty session that's active as of this card's own end
	// point, reported in full on every day card a session touches, not a
	// per-day slice — a long haul that runs past midnight without an Off
	// Duty break is still one session, not two half-sessions that would
	// under-count if split at the calendar boundary. Off Duty is the
	// exception: a rest period is a discrete dated event, not something
	// that spans sessions, so it stays scoped to this card's own window.
	function computeSegmentStats(stops, dayIdx) {
		// Find segment start (right after previous "day" marker, or 0)
		let startIdx = 0;
		for (let i = dayIdx - 1; i >= 0; i--) {
			if (stops[i].type === "day") {
				startIdx = i + 1;
				break;
			}
		}

		// The return-to-yard leg always sits after every "day" marker and
		// belongs to whichever day is actually still in progress. If this is
		// the LAST day marker and no real stop has been added after it yet,
		// fold the return leg into THIS day's total instead of leaving it to
		// spawn an empty trailing "Day N+1" with nothing but the return leg
		// counted toward it (even though the card itself now always shows).
		let endIdx = dayIdx;
		const isLastDayMarker = !stops.slice(dayIdx + 1).some((s) => s.type === "day");
		if (isLastDayMarker) {
			const hasRealStopAfter = stops.slice(dayIdx + 1).some((s) => s.type !== "day" && s.type !== "return");
			if (!hasRealStopAfter) endIdx = stops.length;
		}

		const segment = stops.slice(startIdx, endIdx).filter((s) => s.type !== "day");

		const previousBoundary = [...stops.slice(0, startIdx)].reverse().find((item) => item.type === "day");
		const currentBoundary = stops[dayIdx]?.type === "day" ? stops[dayIdx] : null;
		const windowStart = previousBoundary ? datedMinute(previousBoundary.label, previousBoundary.departPrev || "00:00") : null;

		// Anchor for identifying which duty session governs this card: the day
		// boundary's own end-of-day time if this card has one, else fall back
		// to the segment's own last dated arrival (the trailing/Trip Complete
		// card has no closing boundary to read a time from).
		let windowEnd = currentBoundary ? datedMinute(currentBoundary.label, currentBoundary.departPrev || "00:00") : null;
		if (windowEnd === null) {
			for (let i = segment.length - 1; i >= 0; i--) {
				const item = segment[i];
				const t = item.type === "pickup" ? item.spot : item.arrive;
				const d = item.type === "pickup" ? item.spotDate : item.arriveDate;
				const minute = datedMinute(d, t);
				if (minute !== null) { windowEnd = minute; break; }
			}
		}

		const { onDuty, offDuty, legs } = dutyIntervalData(stops);
		const activeSessionId = activeSessionIdThroughWindow(onDuty, windowEnd);

		// Full session totals, unclipped (windowEnd: null) — see function
		// comment above for why this doesn't stop at the calendar boundary.
		const netMins = sessionOnDutyThroughWindow(onDuty, activeSessionId, null);
		const totalDrive = sessionDriveThroughWindow(onDuty, activeSessionId, null) ?? 0;
		const rawMiles = sessionMilesThroughWindow(legs, activeSessionId, null) ?? 0;
		const totalMiles = Math.round(rawMiles * 10) / 10;

		const offDutyMins = sumIntervalsInWindow(offDuty, windowStart, windowEnd);

		return {
			totalMiles,
			totalDrive: Math.round(totalDrive),
			netMins,
			offDutyMins,
			sessionDutyMins: netMins,
			sessionDriveMins: totalDrive,
		};
	}

	// Same value+unit format as the per-stop Miles/Drive boxes — no labels,
	// the unit suffix communicates what the number means.
	function renderDayStatsGrid({ totalMiles, totalDrive, netMins, offDutyMins, sessionDriveMins, sessionDutyMins } = {}) {
		const miVal = totalMiles > 0 ? (totalMiles % 1 === 0 ? String(totalMiles) : totalMiles.toFixed(1)) : "—";
		const drVal = totalDrive > 0 ? formatDriveValue(totalDrive) : "—";
		const dutyVal = netMins !== null && netMins > 0 ? formatDriveValue(netMins) : "—";
		const offVal = offDutyMins !== null && offDutyMins > 0 ? formatDriveValue(offDutyMins) : "—";
		// Passenger-carrier thresholds: 10 driving hours and 15 on-duty hours,
		// checked against the current duty session's running total (since the
		// last off-duty/sleeper period) rather than this calendar day's own
		// isolated slice — see dutyIntervalData. A session that runs past
		// midnight without a break still flags once IT exceeds the limit,
		// instead of resetting at whichever day happens to hold the tail end.
		const driveForWarn = sessionDriveMins ?? totalDrive;
		const dutyForWarn = sessionDutyMins ?? netMins;
		const drWarn = driveForWarn > 10 * 60;
		const dutyWarn = dutyForWarn !== null && dutyForWarn > 15 * 60;
		const field = (val, unit, warn) => `
        <output class="rux-output${warn ? " rux-trip-itinerary__seg-stat--warn" : ""}">${escHtml(val)} <span class="rux-trip-itinerary__unit">${unit}</span></output>`;
		return `<div class="rux-trip-itinerary__day-stats">${field(miVal, "mi", false)}${field(drVal, "hr", drWarn)}${field(dutyVal, "hr", dutyWarn)}${field(offVal, "hr", false)}</div>`;
	}

	// Shared three-stat anatomy for cards that close a duty period. Off Duty
	// reports the duty session ending at that stop; Trip Complete reports the
	// final calendar day's segment. Only the calculation scope and title differ.
	function renderDutySummaryStats({ onDutyMins, driveMins, miles } = {}) {
		const dutyVal = onDutyMins !== null && onDutyMins > 0 ? formatDriveValue(onDutyMins) : "—";
		const driveVal = driveMins !== null && driveMins > 0 ? formatDriveValue(driveMins) : "—";
		const milesVal = miles !== null && miles > 0
			? (miles % 1 === 0 ? String(miles) : miles.toFixed(1))
			: "—";
		return `
		  <div class="rux-field">
			<div class="rux-trip-itinerary__stats-values rux-trip-itinerary__stats-values--3col is-expanded">
			  <div class="rux-field">
				<label class="rux-field__label">On-Duty</label>
				<output class="rux-output">${escHtml(dutyVal)} <span class="rux-trip-itinerary__unit">hr</span></output>
			  </div>
			  <div class="rux-field">
				<label class="rux-field__label">Drive</label>
				<output class="rux-output">${escHtml(driveVal)} <span class="rux-trip-itinerary__unit">hr</span></output>
			  </div>
			  <div class="rux-field">
				<label class="rux-field__label">Miles</label>
				<output class="rux-output">${escHtml(milesVal)} <span class="rux-trip-itinerary__unit">mi</span></output>
			  </div>
			</div>
		  </div>`;
	}

	// Returns just the two boxed outputs (status + duration) — the caller
	// wraps them in the same collapsible .rux-trip-itinerary__stats-values/--pair
	// shell every other type's Miles/Drive row uses, so Sleeper's reset
	// status hides behind the same toggle instead of always showing.
	function renderSleeperStats(stop, stops) {
		const dep = parseTimeToMins(stop.departPrev);
		const arr = parseTimeToMins(stop.arrive);
		const thisMins = dep !== null && arr !== null
			? elapsedMinutes(stop.departPrevDate, stop.departPrev, stop.arriveDate, stop.arrive)
			: null;

		const RESET = 8 * 60;
		const SPLIT_MIN = 2 * 60;

		let statusClass = "";
		let statusVal = "—";
		let restVal = "—";
		if (thisMins !== null) {
			const allMins = stops
				.filter((s) => s.type === "sleeper")
				.map((s) => elapsedMinutes(s.departPrevDate, s.departPrev, s.arriveDate, s.arrive) || 0)
				.filter((d) => d > 0);

			const singleOk = allMins.some((d) => d >= RESET);
			const splitPairs = allMins.filter((d) => d >= SPLIT_MIN);
			const splitOk = !singleOk && splitPairs.length >= 2 && splitPairs[0] + splitPairs[1] >= RESET;
			const resetOk = singleOk || splitOk;

			// Same read-only-field look as Miles/Drive: status where Miles would
			// go (this card has no distance of its own), duration formatted like
			// every other "hr" field instead of the old "8h"/"1h 30m" shorthand.
			statusClass = resetOk ? " rux-trip-itinerary__seg-stat--ok" : (thisMins < SPLIT_MIN ? " rux-trip-itinerary__seg-stat--warn" : "");
			statusVal = resetOk ? "Reset" : "Not reset";
			restVal = formatDriveValue(thisMins);
		}

		return `<output class="rux-output${statusClass}">${statusVal}</output>
      <output class="rux-output">${escHtml(restVal)} <span class="rux-trip-itinerary__unit">hr</span></output>`;
	}

	/* ── Render ──────────────────────────────────────────────────────────── */

	function autoPopulateReturnTimes(stops) {
		const ret = stops.find((s) => s.type === "return");
		if (!ret) return;
		const prev = [...stops].reverse().find((s) => s.type !== "day" && s.type !== "return");
		if (!prev?.arrive) return;
		const prevArrMins = parseClockMins(prev.arrive);
		if (prevArrMins === null) return;
		const buffer = window.RuxSettings?.getReturnBuffer?.() ?? 15;
		const suggestedDepMins = (prevArrMins + buffer) % 1440;
		if (!ret.departPrev) ret.departPrev = minsToTimeStr(suggestedDepMins);
		const depMins = parseClockMins(ret.departPrev);
		if (depMins === null) return;
		const prevDate = prev.arriveDate || prev.spotDate || prev.departPrevDate;
		if (prevDate && !ret.departPrevDate) {
			ret.departPrevDate = suggestedDepMins < prevArrMins ? addIsoDays(prevDate, 1) : prevDate;
		}
		const driveMins = parseDriveMins(ret.drive);
		if (driveMins > 0) {
			ret.arrive = minsToTimeStr((depMins + driveMins) % 1440);
			if (ret.departPrevDate) ret.arriveDate = addIsoDays(ret.departPrevDate, Math.floor((depMins + driveMins) / 1440));
		}
	}

	// Chain of derived times working backward from the one real anchor a
	// dispatcher is actually given — Stop 1's scheduled departure *with
	// passengers*:
	//   Stop1.departPrev (manual, the anchor)
	//     → Pickup.spot = Stop1.departPrev − boarding padding
	//         → Pickup.departPrev = Pickup.spot − yard-to-pickup drive time
	//             − (a reset sitting between Pickup and boarding, if any)
	// "Spot padding" is the boarding buffer for the first step (how much
	// earlier the bus should be ready than the scheduled passenger
	// departure) — it has nothing to do with the yard leg, which is pure
	// travel time. A sleeper card between Pickup and Stop 1 means Spot is
	// when boarding happens, not when the driver arrived — its own
	// duration has to come off the chain too, on top of the drive itself,
	// or the derived yard-departure time comes out however long the reset
	// took too late.

	function autoPopulatePickupSpot(stops) {
		const pickup = stops.find((s) => s.type === "pickup");
		if (!pickup) return;
		const firstStop = stops.find((s) => s.type === "stop");
		if (!firstStop?.departPrev) return;
		const depMins = parseClockMins(firstStop.departPrev);
		if (depMins === null) return;
		const padding = window.RuxSettings?.getSpotPadding?.() ?? 15;
		pickup.spot = minsToTimeStr(((depMins - padding) % 1440 + 1440) % 1440);
	}

	// Reset sitting between Pickup and boarding (Stop 1) — chronologically
	// "before" the pickup event even though, in the list, its card comes
	// after Pickup's (it inherits Pickup's own address, so it has to).
	function resetBeforeBoardingMins(stops, pickupIdx) {
		const firstStopIdx = stops.findIndex((s) => s.type === "stop");
		const boardingIdx = firstStopIdx >= 0 ? firstStopIdx : stops.length;
		const resetStop = stops.slice(pickupIdx + 1, boardingIdx).find((s) => s.type === "sleeper");
		if (!resetStop) return 0;
		const str = parseClockMins(resetStop.departPrev);
		const end = parseClockMins(resetStop.arrive);
		if (str === null || end === null) return 0;
		return minutesBetween(str, end) || 0;
	}

	function autoPopulatePickupDepart(stops) {
		const pickupIdx = stops.findIndex((s) => s.type === "pickup");
		if (pickupIdx < 0) return;
		const pickup = stops[pickupIdx];
		if (!pickup?.spot) return;
		const spotMins = parseClockMins(pickup.spot);
		if (spotMins === null) return;
		const firstStop = stops.find((s) => s.type === "stop");
		if (pickup.originMode === "yard" && firstStop?.departPrev) {
			pickup.departPrev = firstStop.departPrev;
			pickup.departPrevDate = firstStop.departPrevDate || pickup.departPrevDate;
			const departMins = parseClockMins(pickup.departPrev);
			if (pickup.departPrevDate && departMins !== null) {
				pickup.spotDate = spotMins > departMins
					? addIsoDays(pickup.departPrevDate, -1)
					: pickup.departPrevDate;
			}
			return;
		}
		const driveMins = parseDriveMins(pickup.drive);
		if (driveMins <= 0) return;
		const resetMins = resetBeforeBoardingMins(stops, pickupIdx);
		pickup.departPrev = minsToTimeStr(((spotMins - driveMins - resetMins) % 1440 + 1440) % 1440);
		const departMins = parseClockMins(pickup.departPrev);
		if (pickup.departPrevDate && departMins !== null) {
			pickup.spotDate = spotMins < departMins
				? addIsoDays(pickup.departPrevDate, 1)
				: pickup.departPrevDate;
		}
	}

	function computeOnDuty(stops) {
		return dutyMinutesInWindow(stops);
	}

	function calculatedMiles(stops) {
		return stops
			.filter((s) => s.type !== "day" && s.type !== "sleeper")
			.reduce((total, stop) => total + parseFloat(stop.miles || 0), 0);
	}

	function renderSummary(stops) {
		const real = stops.filter((s) => s.type !== "day");
		// Sleeper never travels — excluded from travel totals as a safety net
		// even though its own fields should always be zero (see syncSleeperLeg).
		const travelStops = real.filter((s) => s.type !== "sleeper");
		const totalMiles = calculatedMiles(travelStops);
		const totalDrive = travelStops.reduce((n, s) => n + parseDriveMins(s.drive), 0);
		const dayCount = stops.filter((s) => s.type === "day").length + 1;
		const onDutyMins = computeOnDuty(stops);

		const stats = [
			{ id: "days", label: "Days", value: `${dayCount}` },
			{ id: "miles", label: "Miles", value: totalMiles > 0 ? `${totalMiles % 1 === 0 ? totalMiles : totalMiles.toFixed(1)}` : "—" },
			{ id: "drive", label: "Drive", value: totalDrive > 0 ? formatDriveValue(totalDrive) : "—" },
			{ id: "duty", label: "On-Duty", value: onDutyMins !== null && onDutyMins > 0 ? formatDriveValue(onDutyMins) : "—" },
		];
		const statsHtml = stats
			.map(
				(s) => `
        <div class="rux-field">
          <label class="rux-field__label" for="tp-itin-summary-${s.id}">${s.label}</label>
          <output class="rux-output" id="tp-itin-summary-${s.id}">${escHtml(s.value)}</output>
        </div>`
			)
			.join("");

		return `
      <div class="rux-card__sentinel" aria-hidden="true"></div>
      <div class="rux-card__header">
        <span class="rux-card__title">Trip Summary</span>
        <div class="rux-trip-itinerary__summary-actions"></div>
      </div>
      <div class="rux-card__body">
        <div class="rux-trip-itinerary__summary-grid">${statsHtml}</div>
      </div>`;
	}

	function renderFinalDaySummary(stops) {
		const lastDayIdx = (() => {
			for (let i = stops.length - 1; i >= 0; i--) {
				if (stops[i].type === "day") return i;
			}
			return -1;
		})();
		// A trip with no explicit "End day" break is just a one-day trip — the
		// Route Summary at top already covers its totals, so don't duplicate
		// them here. Only the trailing segment of a multi-day trip gets a card.
		if (lastDayIdx === -1) return "";

		// The return leg auto-populates its own times/miles once the last real
		// stop has route data, which would otherwise make an empty trailing
		// day look "real" on its own. Only count actual stops here — the
		// return leg's numbers still show up (via computeSegmentStats) once
		// there's a genuine reason to render this card.
		const finalSegment = stops.slice(lastDayIdx + 1).filter((s) => s.type !== "day" && s.type !== "return");
		const hasData = finalSegment.some((s) => s.miles || s.drive || s.departPrev || s.arrive || s.spot);
		if (!hasData) return "";

		const stats = computeSegmentStats(stops, stops.length);
		return `
      <section class="rux-trip-itinerary__dwell-card rux-trip-itinerary__trip-complete" data-itinerary-final-summary>
		<header class="rux-trip-itinerary__stop-header">
		  <div class="rux-trip-itinerary__stop-heading">
			<span class="rux-trip-itinerary__marker"><span class="rux-icon rux-trip-itinerary__marker-pin rux-trip-itinerary__marker-pin--off" aria-hidden="true">location_on</span></span>
			<h4 class="rux-card__title">Trip Complete</h4>
		  </div>
		  <button type="button" class="rux-button rux-button--ghost rux-button--icon" data-day-add aria-haspopup="menu" aria-expanded="false" aria-label="Add to final day" title="Add to final day">
			<span class="rux-icon" aria-hidden="true">add</span>
		  </button>
		</header>
		<div class="rux-trip-itinerary__stop-body">
		  ${renderDutySummaryStats({
			onDutyMins: stats.netMins,
			driveMins: stats.totalDrive,
			miles: stats.totalMiles,
		  })}
		</div>
	  </section>`;
	}

	function formatDayLabel(label) {
		if (isIsoDate(label)) return formatBoundaryDate(label);
		const m = String(label || "").match(/^(\w+),\s+(\w+)\s+(\d+),\s+\d{4}$/);
		if (!m) return label;
		const [, weekday, month, day] = m;
		return `${weekday.slice(0, 3).toUpperCase()} · ${month.slice(0, 3).toUpperCase()} ${day}`;
	}

	function renderYardDeparture(stops, startDate) {
		const yard = getYard();
		const pickup = stops.find((stop) => stop.type === "pickup");
		const mode = pickup?.originMode === "yard" ? "yard" : "pickup";
		const startMarkerType = mode === "yard" ? "pickup" : "depart-yard";
		const modeButton = (value, label, icon) => `<button type="button" class="rux-button rux-button--segment${mode === value ? "" : ""}" data-value="${value}" aria-pressed="${mode === value}"><span class="rux-icon" aria-hidden="true">${icon}</span><span class="rux-button__label">${label}</span></button>`;
		return `
		<section class="rux-trip-itinerary__stop rux-trip-itinerary__stop--yard">
			<header class="rux-trip-itinerary__stop-header">
				<div class="rux-trip-itinerary__stop-heading"><span class="rux-trip-itinerary__marker"><span class="rux-icon rux-trip-itinerary__marker-pin rux-trip-itinerary__marker-pin--${startMarkerType}" aria-hidden="true">location_on</span></span><h4 class="rux-card__title">Trip Start</h4></div>
			</header>
			<div class="rux-trip-itinerary__stop-body">
			<div class="rux-field">
				<label class="rux-field__label">Passengers Board At</label>
				<div class="rux-segmented-track rux-trip-itinerary__origin-mode" data-rux-segmented data-itinerary-segment="origin-mode" aria-label="Passengers board at">
					${modeButton("pickup", "Pickup", "location_on")}
					${modeButton("yard", "Yard", "garage")}
				</div>
				<div class="rux-trip-itinerary__fields">
					<input class="rux-input" type="text" value="${escHtml(displayAddress(yard.address))}" readonly aria-label="Departure yard" />
				</div>
			</div>
			<div class="rux-trip-itinerary__yard-times${mode === "yard" ? " rux-trip-itinerary__yard-times--meet" : ""}">
				<div class="rux-field" data-yard-meet-row${mode === "yard" ? "" : " hidden"}><div class="rux-trip-itinerary__datetime"><input class="rux-input" type="date" data-yard-meet-date value="${escHtml(pickup?.spotDate || startDate || "")}" aria-label="Calculated customer meet date" readonly /><input class="rux-input" type="time" data-yard-meet-time value="${escHtml(pickup?.spot || "")}" aria-label="Calculated customer meet time" readonly /></div></div>
				<div class="rux-field"><div class="rux-trip-itinerary__datetime"><input class="rux-input" type="date" data-yard-depart-date value="${escHtml(pickup?.departPrevDate || startDate || "")}" aria-label="Yard departure date" ${mode === "pickup" ? 'readonly title="Calculated from pickup timing and route duration"' : ""} /><input class="rux-input" type="time" data-yard-depart-time value="${escHtml(pickup?.departPrev || "")}" aria-label="Yard departure time" ${mode === "pickup" ? 'readonly title="Calculated from pickup timing and route duration"' : ""} /></div></div>
			</div>
			</div>
		</section>`;
	}

	function boundaryActivity(stops, boundaryIdx) {
		const boundary = stops[boundaryIdx];
		const boundaryMinute = datedMinute(boundary?.label, boundary?.departPrev || "00:00");
		const continuedDriving = boundaryMinute !== null && stops.some((item) => {
			if (!item || item.type === "day" || item.type === "sleeper") return false;
			const arrivalDate = item.type === "pickup" ? item.spotDate : item.arriveDate;
			const arrivalTime = item.type === "pickup" ? item.spot : item.arrive;
			const legStart = datedMinute(item.departPrevDate, item.departPrev);
			const legEnd = datedMinute(arrivalDate, arrivalTime);
			return legStart !== null && legEnd !== null
				&& legStart < boundaryMinute && boundaryMinute < legEnd;
		});
		if (continuedDriving) return { moving: true, location: "" };

		for (let index = boundaryIdx - 1; index >= 0; index -= 1) {
			const item = stops[index];
			if (!item || item.type === "day" || item.type === "sleeper") continue;
			if (item.type === "pickup" && item.originMode === "yard") {
				return { moving: false, location: getYard().name || "Yard" };
			}
			const location = item.name || displayAddress(item.address);
			if (location) return { moving: false, location };
		}
		return { moving: false, location: "last location" };
	}

	function activityAtBoundaryIsMoving(stops, boundaryIdx) {
		return boundaryActivity(stops, boundaryIdx).moving;
	}

	function boundarySegmentHasActivity(stops, boundaryIdx) {
		let startIdx = 0;
		for (let i = boundaryIdx - 1; i >= 0; i -= 1) {
			if (stops[i]?.type === "day") {
				startIdx = i + 1;
				break;
			}
		}
		return stops.slice(startIdx, boundaryIdx).some((item) =>
			item && item.type !== "day" && item.type !== "sleeper",
		);
	}

	function statusAtBoundary(stops, boundaryIdx) {
		for (let i = boundaryIdx - 1; i >= 0; i -= 1) {
			const item = stops[i];
			if (!item || item.type === "day" || item.type === "sleeper") continue;
			return ["off", "sleeper", "on"].includes(item.dwellStatus) ? item.dwellStatus : "on";
		}
		return "on";
	}

	function renderDay(item, idx, stops, rangeGenerated = false) {
		const stats = computeSegmentStats(stops, idx);
		const label = formatDayLabel(item.label);
		const dayNum = dayNumberFor(stops, idx);
		const activity = boundaryActivity(stops, idx);
		const segmentHasActivity = boundarySegmentHasActivity(stops, idx);

		// An automatic midnight marker after an active day is calculation data,
		// not another form row. The next card's header already communicates the
		// new date, so keep this boundary invisible unless a leg crosses it.
		if (!activity.moving && segmentHasActivity) return "";

		// A date with no routed leg remains visible as a compact idle-day card.
		// Its midnight boundary stays in the model, while the UI shows only the
		// operational facts a dispatcher needs: status and inherited location.
		if (!activity.moving) {
			const status = statusAtBoundary(stops, idx);
			const statusLabel = status === "sleeper" ? "Sleeper berth" : status === "on" ? "On duty" : "Off duty";
			return `
			  <div class="rux-trip-itinerary__idle-day" data-itinerary-day-summary data-stop-idx="${idx}">
				<strong>No activity</strong>
				<span>${escHtml(statusLabel)} at ${escHtml(activity.location)}</span>
			  </div>`;
		}
		const hasStats = stats.totalMiles > 0 || stats.totalDrive > 0 || (stats.netMins ?? 0) > 0 || (stats.offDutyMins ?? 0) > 0;
		const activityNote = activity.moving
			? '<span class="rux-icon" aria-hidden="true">route</span> Continued driving · not a stop'
			: `<span class="rux-icon" aria-hidden="true">pause_circle</span> No bus movement · remains at ${escHtml(activity.location)}`;
		return `
      <section class="rux-card rux-trip-itinerary__day rux-trip-itinerary__day--boundary" data-itinerary-day-summary data-stop-idx="${idx}" title="${activity.moving ? "Continued driving" : "No bus movement"} into ${escHtml(label)}">
        <div class="rux-trip-itinerary__marker rux-trip-itinerary__marker--add">
          <button type="button" class="rux-button rux-button--ghost rux-button--icon" data-day-add aria-haspopup="menu" aria-expanded="false" aria-label="Add to Day ${dayNum}" title="Add to Day ${dayNum}">
            <span class="rux-icon" aria-hidden="true">add</span>
          </button>
        </div>
        <div class="rux-trip-itinerary__content">
          <div class="rux-trip-itinerary__label-row">
            <label class="rux-field__label">Day ${dayNum} → Day ${dayNum + 1}</label>
          </div>
		  <div class="rux-trip-itinerary__boundary-fields">
			<input class="rux-input" type="date" value="${isIsoDate(item.label) ? escHtml(item.label) : ""}" aria-label="Calendar day boundary date" readonly />
			<input class="rux-input" type="time" value="${escHtml(item.departPrev || "00:00")}" aria-label="Calendar day boundary time" readonly />
		  </div>
		  <p class="rux-trip-itinerary__boundary-note${activity.moving ? " is-moving" : " is-stationary"}">${activityNote}</p>
          <div class="rux-trip-itinerary__day-header">
			${hasStats ? renderDayStatsGrid(stats) : ""}
			${rangeGenerated ? "" : `<button type="button" class="rux-trip-itinerary__inline-action rux-trip-itinerary__inline-action--delete" data-inline-delete aria-label="Delete Day ${dayNum} boundary">
					<span class="rux-icon" aria-hidden="true">delete</span>
				</button>`}
          </div>
        </div>
      </section>`;
	}

	const TYPE_LABEL = { pickup: "Pickup", stop: "Stop", sleeper: "Sleeper", return: "Return" };

	function dayNumberFor(stops, idx) {
		return stops.slice(0, idx).filter((s) => s.type === "day").length + 1;
	}
	// 1-based position of this stop among only the "stop"-type stops, for
	// address placeholders like "Stop 2 Address".
	function stopNumberFor(stops, idx) {
		return stops.slice(0, idx + 1).filter((s) => s.type === "stop").length;
	}

	// Persistent label above the address field — unlike the badge (icon +
	// color only) or the placeholder (disappears once filled in), this stays
	// visible so a long list of stops still reads clearly at a glance.
	function fieldLabelFor(stops, idx, type) {
		if (type === "return") return "Return to Yard";
		if (type === "stop") return `Stop ${stopNumberFor(stops, idx)}`;
		return TYPE_LABEL[type];
	}

	// Sleeper always rests wherever the previous real stop is — computed
	// fresh from the current list on every render so the displayed address
	// can never go stale, unlike stop.address itself which is only a
	// one-time snapshot taken when the sleeper was inserted.
	function previousStopAddress(stops, idx) {
		for (let i = idx - 1; i >= 0; i--) {
			const s = stops[i];
			if (!s || s.type === "day" || s.type === "sleeper") continue;
			if (s.type === "pickup" && s.originMode === "yard") return getYard().address;
			return s.address || "";
		}
		return "";
	}

	function renderStop(stop, idx, stops) {
		const type = TYPE_LABEL[stop.type] ? stop.type : "stop";
		const isReturn = type === "return";
		const isPickup = type === "pickup";
		const isStale = stop.routeStatus === "stale" && type !== "sleeper";
		const nextTravelStop = stops.slice(idx + 1).find((item) => item.type !== "day" && item.type !== "sleeper");
		const showDwellStatus = type !== "sleeper" && type !== "return" && !!nextTravelStop;
		const dwellStatus = ["off", "sleeper", "on"].includes(stop.dwellStatus) ? stop.dwellStatus : "on";

		const time1Label = type === "sleeper" ? "Str" : "Dep";
		const time2 =
			type === "pickup"  ? { label: "Spt", field: "spot", dateField: "spotDate" } :
			type === "sleeper" ? { label: "End", field: "arrive", dateField: "arriveDate" } :
			                     { label: "Arr", field: "arrive", dateField: "arriveDate" };

		const isVerified = !!(stop.lat && stop.lng);
		const showAddrIcon = isStale || isVerified;
		// "Pick-up Address" / "Stop 2 Address" instead of a bare "Address" —
		// tells you which stop you're filling in without needing to glance
		// back at the badge, especially useful once a list has several Stops.
		const addressPlaceholder = type === "pickup" ? `${TYPE_LABEL[type]} Address` : `Stop ${stopNumberFor(stops, idx)} Address`;
		// Sleeper always sits at whatever location the previous stop is at —
		// shown read-only (like Return's) instead of empty space, since it's
		// a time block at an inherited place, not a place of its own to edit.
		// Return's address is a real (but read-only) input styled like every
		// other address field, instead of plain text — the yard is always a
		// known-good location so there's no verified/stale icon to show, and
		// the yard name folds into the accessible label instead of its own
		// heading (which used to awkwardly interrupt the card's field rows).
		const sleeperAddr = type === "sleeper" ? previousStopAddress(stops, idx) : "";
		const visibleAddress = displayAddress(stop.address);
		const visibleSleeperAddr = displayAddress(sleeperAddr);
		const addrFieldId = `itin-addr-${idx}`;
		const addrEl = type === "sleeper"
			? `<div class="rux-trip-itinerary__address-wrap">
               <input id="${addrFieldId}" class="rux-input" type="text" value="${escHtml(visibleSleeperAddr)}" readonly
                      placeholder="Inherits previous stop's address"
                      aria-label="${visibleSleeperAddr ? `Resting at ${escHtml(visibleSleeperAddr)}` : "Resting location — inherits previous stop's address"}" />
             </div>`
			: isReturn
				? `<div class="rux-trip-itinerary__address-wrap">
               <input id="${addrFieldId}" class="rux-input" type="text" value="${escHtml(visibleAddress)}" readonly
                      aria-label="${escHtml(stop.name)} — ${escHtml(visibleAddress)}" />
             </div>`
				: `<div class="rux-trip-itinerary__address-wrap${showAddrIcon ? " is-verified" : ""}">
			   <input id="${addrFieldId}" class="rux-input" type="text" data-field="address" autocomplete="street-address"
					  value="${escHtml(visibleAddress)}" placeholder="${addressPlaceholder}" aria-label="${escHtml(fieldLabelFor(stops, idx, type))} address" />
               ${isStale
				? '<span class="rux-icon rux-trip-itinerary__addr-check rux-trip-itinerary__addr-check--stale">priority_high</span>'
				: isVerified
					? '<span class="rux-icon rux-trip-itinerary__addr-check">check</span>'
					: ""}
             </div>`;

		const isDraggable = type !== "pickup" && type !== "return";
		const deleteControl = isDraggable
			? `<button type="button" class="rux-trip-itinerary__inline-action rux-trip-itinerary__inline-action--delete" data-inline-delete aria-label="Delete ${TYPE_LABEL[type]}">
				<span class="rux-icon" aria-hidden="true">delete</span>
			</button>`
			: "";
		const sectionLabel = fieldLabelFor(stops, idx, type);
		const moveControl = isDraggable
			? `<button type="button" class="rux-trip-itinerary__inline-action rux-trip-itinerary__inline-action--move" data-drag-handle aria-label="Drag to reorder ${TYPE_LABEL[type]}">
              <span class="rux-icon" aria-hidden="true">drag_indicator</span>
            </button>`
			: "";
		// Every location card uses the same pin silhouette; type color carries
		// the route meaning without changing the card-header vocabulary.
		// isReturn still drops the connecting line below it — nothing follows
		// the last stop.
		// Every waypoint type shares the same pin glyph — only the color (via
		// the --marker-pin--${type} modifier) tells them apart. A different
		// icon shape per type read as more inconsistent than helpful.
		const markerIcon = `<span class="rux-icon rux-trip-itinerary__marker-pin rux-trip-itinerary__marker-pin--${type}" aria-hidden="true">location_on</span>`;

		const milesVal = parseFloat(stop.miles) > 0 ? stop.miles : "—";
		const driveVal = stop.drive && stop.drive !== "0:00" ? stop.drive : "—";
		const statsInner = type === "sleeper"
			? renderSleeperStats(stop, stops)
			: `<output class="rux-output">${escHtml(milesVal)} <span class="rux-trip-itinerary__unit">mi</span></output>
      <output class="rux-output">${escHtml(driveVal)} <span class="rux-trip-itinerary__unit">hr</span></output>`;
		const dwellControl = showDwellStatus ? `
		  <div class="rux-trip-itinerary__dwell-status">
			<div class="rux-segmented-track" data-rux-segmented data-itinerary-segment="dwell-status" aria-label="Duty status until next departure">
			  <button type="button" class="rux-button rux-button--segment rux-button--segment-icon${dwellStatus === "on" ? "" : ""}" data-value="on" aria-label="On duty until next departure" title="On duty" aria-pressed="${dwellStatus === "on"}"><span class="rux-icon" aria-hidden="true">search_hands_free</span></button>
			  <button type="button" class="rux-button rux-button--segment rux-button--segment-icon${dwellStatus === "sleeper" ? "" : ""}" data-value="sleeper" aria-label="Sleeper berth until next departure" title="Sleeper berth" aria-pressed="${dwellStatus === "sleeper"}"><span class="rux-icon" aria-hidden="true">airline_seat_flat</span></button>
			  <button type="button" class="rux-button rux-button--segment rux-button--segment-icon${dwellStatus === "off" ? "" : ""}" data-value="off" aria-label="Off duty until next departure" title="Off duty" aria-pressed="${dwellStatus === "off"}"><span class="rux-icon" aria-hidden="true">logout</span></button>
			</div>
		  </div>` : "";

		return `
	  <section class="rux-trip-itinerary__stop${isStale ? " is-stale" : ""}${isReturn ? " rux-trip-itinerary__stop--terminal" : ""}" data-stop-idx="${idx}"${isPickup && stop.originMode === "yard" ? " hidden" : ""}${isDraggable ? ' draggable="true"' : ""}>
		  <header class="rux-trip-itinerary__stop-header">
			<div class="rux-trip-itinerary__stop-heading">
			  <span class="rux-trip-itinerary__marker">${markerIcon}</span>
			  <h4 class="rux-card__title">${escHtml(sectionLabel)}</h4>
			</div>
			<div class="rux-trip-itinerary__stop-actions">
			  ${deleteControl}
			  ${moveControl}
			</div>
		  </header>
		  <div class="rux-trip-itinerary__stop-body">
		  <div class="rux-trip-itinerary__fields">
			${addrEl}
          </div>
		  <div class="rux-trip-itinerary__time-row${isPickup ? " rux-trip-itinerary__time-row--single" : ""}">
			${isPickup ? "" : `<div class="rux-trip-itinerary__datetime">
				<input class="rux-input" type="date" data-field="departPrevDate" value="${escHtml(stop.departPrevDate)}" aria-label="${time1Label} date" />
				<input class="rux-input" type="time" data-field="departPrev" value="${escHtml(stop.departPrev)}" aria-label="${time1Label} time" />
			</div>`}
			<div class="rux-trip-itinerary__datetime">
				<input class="rux-input" type="date" data-field="${time2.dateField}" value="${escHtml(stop[time2.dateField])}" aria-label="${time2.label} date" ${isPickup ? "readonly" : ""} />
				<input class="rux-input" type="time" data-field="${time2.field}" value="${escHtml(stop[time2.field])}" aria-label="${isPickup ? "Spot time — calculated from Stop 1" : `${time2.label} time`}" ${isPickup ? "readonly" : ""} />
			</div>
		  </div>
		  <div class="rux-trip-itinerary__fields--pair${stop.statsExpanded ? " is-expanded" : ""}">
            <div class="rux-trip-itinerary__stats-values${stop.statsExpanded ? " is-expanded" : ""}">
              ${statsInner}
            </div>
		  </div>
		  ${dwellControl}
		  </div>
	  </section>`;
	}

	// A lightweight, read-only summary card that appears right after a stop
	// whenever its dwell status is off/sleeper — total dwell time (computed,
	// same interval dutyMinutesInWindow excludes) plus a manually-set Reset
	// flag for whether this period qualifies as an HOS restart. Not a stops[]
	// entry: purely derived from the anchor stop + whatever comes after it,
	// so there's nothing to keep in sync on reorder/delete.
	function renderDwellSummaryCard(stop, idx, stops) {
		const type = TYPE_LABEL[stop.type] ? stop.type : "stop";
		if (type === "sleeper" || type === "return") return "";
		const status = stop.dwellStatus === "off" || stop.dwellStatus === "sleeper" ? stop.dwellStatus : null;
		if (!status) return "";
		const next = stops.slice(idx + 1).find((item) => item.type !== "day" && item.type !== "sleeper");
		if (!next) return "";

		const arriveDate = type === "pickup" ? stop.spotDate : stop.arriveDate;
		const arriveTime = type === "pickup" ? stop.spot : stop.arrive;
		const mins = elapsedMinutes(arriveDate, arriveTime, next.departPrevDate, next.departPrev);
		const totalVal = mins !== null && mins > 0 ? formatDriveValue(mins) : "—";
		const label = status === "sleeper" ? "Sleeper" : "Off Duty";
		// Same pin glyph every other itinerary marker uses (see markerIcon in
		// renderStop) — color alone (the --marker-pin--${status} modifier
		// below) distinguishes this from other card types.
		const icon = "location_on";
		// Passenger-carrier HOS: 8 consecutive hours off duty/sleeper berth
		// resets the 10hr driving / 15hr on-duty clock (same thresholds already
		// used for the drive/duty warn states below).
		const resetsClock = mins !== null && mins >= 8 * 60;

		// Off Duty is the only thing that actually ends a session now — Sleeper
		// pauses it instead (see dutyIntervalData), so only an Off Duty card
		// shows "session ending here"; a Sleeper card would be reporting a
		// running total that's still open and will keep growing past it.
		let sessionBlock = "";
		if (status === "off") {
			const { onDuty, legs, sessionIdByStopIdx } = dutyIntervalData(stops);
			const sessionId = sessionIdByStopIdx.get(idx);
			const sessionDutyMins = sessionId !== undefined ? sessionOnDutyThroughWindow(onDuty, sessionId, null) : null;
			const sessionDriveMins = sessionId !== undefined ? sessionDriveThroughWindow(onDuty, sessionId, null) : null;
			const sessionMiles = sessionId !== undefined ? sessionMilesThroughWindow(legs, sessionId, null) : null;
			sessionBlock = renderDutySummaryStats({
				onDutyMins: sessionDutyMins,
				driveMins: sessionDriveMins,
				miles: sessionMiles,
			});
		}

		return `
	  <section class="rux-trip-itinerary__dwell-card" data-stop-idx="${idx}"${stop.type === "pickup" && stop.originMode === "yard" ? " hidden" : ""}>
		  <header class="rux-trip-itinerary__stop-header">
			<div class="rux-trip-itinerary__stop-heading">
			  <span class="rux-trip-itinerary__marker"><span class="rux-icon rux-trip-itinerary__marker-pin rux-trip-itinerary__marker-pin--${status === "sleeper" ? "sleeper" : "off"}" aria-hidden="true">${icon}</span></span>
			  <h4 class="rux-card__title">${escHtml(label)}</h4>
			</div>
			<output class="rux-output rux-output--boxed rux-trip-itinerary__dwell-total" aria-label="Total ${escHtml(label)} time"><span>${escHtml(totalVal)} <span class="rux-trip-itinerary__unit">hr</span></span><span class="rux-status-text ${resetsClock ? "rux-status-text--success" : "rux-status-text--warning"}">${resetsClock ? "Reset" : "Not Reset"}</span></output>
		  </header>
		  <div class="rux-trip-itinerary__stop-body">
		  ${sessionBlock}
		  </div>
	  </section>`;
	}

	/* ── Init ────────────────────────────────────────────────────────────── */

	function initItinerary(root) {
		const summaryEl = root.querySelector("#tp-itin-summary");
		const stopsEl = root.querySelector("#tp-itin-stops");
		if (!summaryEl || !stopsEl) return;

		const stops = defaultStops();
		const recalcBtn = root.querySelector("#tp-itin-recalc");
		const importBtn = root.querySelector("#tp-import-btn");
		const confirmBtn = root.querySelector("#tp-itin-confirm");
		const legToggleEl = root.querySelector("#tp-itin-leg-toggle");
		const legCardEl = root.querySelector("#tp-itin-leg-card");
		const resetLegBtn = root.querySelector("#tp-itin-reset-leg");

		// Manually set, not derived — a dispatcher confirming "I checked this
		// itinerary, the miles/times are accurate" is a judgment call the data
		// itself can't make. Cleared by updateSummary() below, which every
		// edit path already calls, so any change after confirming — a new
		// stop, an edited time, a recalculated route — silently un-confirms it
		// rather than leaving a stale checkmark next to numbers that moved.
		let confirmed = false;

		function syncConfirmBtn() {
			if (!confirmBtn) return;
			confirmBtn.setAttribute("aria-pressed", String(confirmed));
			confirmBtn.title = confirmed
				? "Itinerary confirmed — click to unconfirm"
				: "Confirm itinerary";
		}

		// Split trips get a second, independent stop list (pickup -> stops ->
		// return-to-yard) for the return leg. `stops` above always holds
		// whichever leg is currently on screen; the *other* leg's contents are
		// stashed here (null = not yet populated, seed lazily on first switch)
		// rather than ever reassigning `stops` itself — every closure in this
		// file reads/mutates that one array by reference, and reassigning it
		// could desync an in-flight async recalculation (see recalculateRoute).
		let activeLeg = "outbound";
		let legBuffers = { outbound: null, return: null };

		function setLegToggleValue(leg) {
			legToggleEl?.querySelectorAll(".rux-button").forEach((btn) => {
				const on = btn.dataset.value === leg;
				btn.setAttribute("aria-pressed", String(on));
			});
			if (resetLegBtn) {
				const legLabel = leg === "return" ? "Inbound" : "Outbound";
				resetLegBtn.title = `Reset ${legLabel} itinerary`;
				resetLegBtn.setAttribute("aria-label", `Reset ${legLabel} itinerary`);
				const label = resetLegBtn.querySelector("[data-reset-leg-label]");
				if (label) label.textContent = `Reset ${legLabel}`;
			}
		}

		function resetActiveLeg() {
			const legLabel = activeLeg === "return" ? "Inbound" : "Outbound";
			if (
				!confirm(
					`Reset the ${legLabel} itinerary? This clears its addresses, times, mileage, and added days. The other leg will not change.`,
				)
			) return false;

			stops.length = 0;
			stops.push(...defaultStops());
			updateSummary();
			renderStopList();
			return true;
		}

		function switchLeg(leg) {
			if (leg === activeLeg || !legBuffers.hasOwnProperty(leg)) return;
			legBuffers[activeLeg] = stops.slice();
			const incoming = legBuffers[leg] ?? defaultStops();
			legBuffers[leg] = null;
			stops.length = 0;
			stops.push(...incoming);
			activeLeg = leg;
			setLegToggleValue(leg);
			updateSummary();
			renderStopList();
		}

		let yardCoordsCache = null;
		let yardAddressCacheKey = null;

		/* — render helpers — */

		function hasStaleRoutes() {
			return stops.some((stop) => stop?.type !== "day"
				&& stop?.type !== "sleeper"
				&& !(stop.type === "pickup" && stop.originMode === "yard")
				&& stop.routeStatus === "stale");
		}

		function hasRoutableLegs() {
			if (!getMapboxToken()) return false;
			// A return leg routes FROM the previous located stop, so it only counts once
			// some other real stop actually has a location to route from.
			return stops.some((stop) => {
				if (!stop || stop.type === "day" || stop.type === "return") return false;
				return !!stop.address?.trim() || (stop.lat != null && stop.lng != null);
			});
		}

		function syncRouteButton() {
			if (!recalcBtn) return;
			const routable = hasRoutableLegs();
			const stale = routable && hasStaleRoutes();
			recalcBtn.classList.toggle("is-stale", stale);
			recalcBtn.disabled = !routable;
			if (!routable) recalcBtn.classList.remove("is-error", "is-routing");
			recalcBtn.title = !routable
				? "Add a stop address to calculate a route"
				: stale
				? "Recalculate route updates"
				: "Recalculate route";
			recalcBtn.setAttribute("aria-label", routable ? "Recalculate route" : "Calculate route");
			const label = recalcBtn.querySelector("[data-recalc-label]");
			if (label) label.textContent = routable ? "Recalculate" : "Calculate";
		}

		function markLegStale(idx) {
			const stop = stops[idx];
			if (!stop || stop.type === "day" || stop.type === "sleeper") return;
			stop.routeStatus = "stale";
		}

		function markAffectedLegsStale(idx) {
			markLegStale(idx);
			const nextIdx = nextRealStopIndex(idx);
			if (nextIdx >= 0) markLegStale(nextIdx);
			syncRouteButton();
		}

		function tripStartDate() {
			return root.querySelector(activeLeg === "return" ? "#tp-return-start" : "#tp-start")?.value || "";
		}

		function tripEndDate() {
			return root.querySelector(activeLeg === "return" ? "#tp-return-end" : "#tp-end")?.value || "";
		}

		function scaffoldDaysFromTripRange() {
			const start = tripStartDate();
			const end = tripEndDate();
			if (!isIsoDate(start) || !isIsoDate(end) || end < start) return;
			const desiredBoundaries = inclusiveIsoDayCount(start, end) - 1;
			let boundaryIndices = stops
				.map((item, index) => item.type === "day" ? index : -1)
				.filter((index) => index >= 0);

			while (boundaryIndices.length > desiredBoundaries) {
				stops.splice(boundaryIndices.pop(), 1);
				boundaryIndices = stops
					.map((item, index) => item.type === "day" ? index : -1)
					.filter((index) => index >= 0);
			}

			while (boundaryIndices.length < desiredBoundaries) {
				const returnIndex = stops.findIndex((item) => item.type === "return");
				const insertIndex = returnIndex >= 0 ? returnIndex : stops.length;
				stops.splice(insertIndex, 0, {
					type: "day",
					label: "",
					name: "continued_driving",
					departPrev: "00:00",
				});
				boundaryIndices = stops
					.map((item, index) => item.type === "day" ? index : -1)
					.filter((index) => index >= 0);
			}

			boundaryIndices.forEach((index, boundaryIndex) => {
				stops[index].label = addIsoDays(start, boundaryIndex + 1);
				stops[index].departPrev ||= "00:00";
				stops[index].name = "continued_driving";
			});
		}

		function normalizeBoundaryDates() {
			const start = tripStartDate();
			let boundaryNumber = 0;
			let currentDate = start;
			for (const item of stops) {
				if (item.type === "day") {
					boundaryNumber += 1;
					if (!isIsoDate(item.label) && start) item.label = addIsoDays(start, boundaryNumber);
					if (!item.departPrev) item.departPrev = "00:00";
					item.name = "continued_driving";
					if (isIsoDate(item.label)) currentDate = item.label;
					continue;
				}
				if (!currentDate) continue;
				if (!item.departPrevDate) item.departPrevDate = currentDate;
				if (item.type === "pickup") {
					if (!item.spotDate) item.spotDate = currentDate;
				} else if (!item.arriveDate) {
					item.arriveDate = currentDate;
				}
			}
		}

		function syncTripDatesFromBoundaries() {
			const startInput = root.querySelector(activeLeg === "return" ? "#tp-return-start" : "#tp-start");
			const endInput = root.querySelector(activeLeg === "return" ? "#tp-return-end" : "#tp-end");
			const start = startInput?.value || "";
			if (!start || !endInput) return;
			const eventDates = stops.flatMap((item) => [
				item.departPrevDate,
				item.arriveDate,
				item.spotDate,
				item.type === "day" ? item.label : null,
			]).filter(isIsoDate);
			const datedBoundaries = eventDates.sort();
			const itineraryEnd = datedBoundaries.at(-1) || start;
			root.dispatchEvent(new CustomEvent("rux:itinerary-dates-changed", {
				bubbles: true,
				detail: {
					leg: activeLeg,
					startDate: start,
					endDate: endInput.value,
					itineraryEndDate: itineraryEnd,
					outsideTripRange: itineraryEnd > endInput.value,
				},
			}));
		}

		function renderStopList() {
			scaffoldDaysFromTripRange();
			normalizeBoundaryDates();
			autoPopulateReturnTimes(stops);
			autoPopulatePickupSpot(stops);
			autoPopulatePickupDepart(stops);
			let dayNumber = 1;
			let daySections = renderYardDeparture(stops, tripStartDate());
			let dayExpandableCount = 0;
			let dayExpandedCount = 0;
			let dayHasSummary = false;
			const dayCards = [];
			const closeDayCard = () => {
				if (!daySections) return;
				const dayDate = addIsoDays(tripStartDate(), dayNumber - 1);
				const addRow = dayHasSummary ? "" : `
						<div class="rux-trip-itinerary__add-row">
							<button type="button" class="rux-button rux-button--accent" data-day-add aria-haspopup="menu" aria-expanded="false" aria-label="Add to Day ${dayNumber}" title="Add to Day ${dayNumber}">
								<span class="rux-icon" aria-hidden="true">add</span>
								<span class="rux-button__label">Add stop</span>
							</button>
						</div>`;
				dayCards.push(`
					<article class="rux-card rux-trip-itinerary__day-group" data-day-number="${dayNumber}">
						<div class="rux-card__sentinel" aria-hidden="true"></div>
						<div class="rux-card__header">
							<h3 class="rux-card__title">Day ${dayNumber}${dayDate ? `<span class="rux-trip-itinerary__day-date">${escHtml(formatBoundaryDate(dayDate))}</span>` : ""}</h3>
							${dayExpandableCount > 0 ? `<div class="rux-cluster">
				<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-day-expand aria-expanded="${dayExpandableCount > 0 && dayExpandedCount === dayExpandableCount}" aria-label="${dayExpandableCount > 0 && dayExpandedCount === dayExpandableCount ? "Collapse" : "Expand"} Day ${dayNumber} statistics"><span class="rux-icon rux-button__disclosure-icon" aria-hidden="true">keyboard_arrow_down</span></button>
							</div>` : ""}
						</div>
						<div class="rux-card__body rux-trip-itinerary__day-group-body">
							${daySections}
							${addRow}
						</div>
					</article>`);
				daySections = "";
				dayExpandableCount = 0;
				dayExpandedCount = 0;
				dayHasSummary = false;
				dayNumber += 1;
			};

			stops.forEach((item, idx) => {
				const hiddenYardPickup = item.type === "pickup" && item.originMode === "yard";
				if (item.type !== "day" && !hiddenYardPickup) {
					dayExpandableCount += 1;
					if (item.statsExpanded) dayExpandedCount += 1;
				}
				if (item.type === "day") {
					const boundarySection = renderDay(
						item,
						idx,
						stops,
						isIsoDate(tripStartDate()) && isIsoDate(tripEndDate()),
					);
					daySections += boundarySection;
					dayHasSummary = activityAtBoundaryIsMoving(stops, idx) && !!boundarySection;
				} else {
					daySections += renderStop(item, idx, stops);
					daySections += renderDwellSummaryCard(item, idx, stops);
				}
				if (item.type === "day") closeDayCard();
			});
			const finalDaySummary = renderFinalDaySummary(stops);
			daySections += finalDaySummary;
			dayHasSummary = !!finalDaySummary;
			closeDayCard();

			stopsEl.innerHTML = dayCards.join("");
			syncRouteButton();
		}

		function elementFromMarkup(markup) {
			if (!markup) return null;
			const template = document.createElement("template");
			template.innerHTML = markup.trim();
			return template.content.firstElementChild;
		}

		function syncDwellSummaryCard(stop, idx) {
			const stopSection = stopsEl.querySelector(`.rux-trip-itinerary__stop[data-stop-idx="${idx}"]`);
			if (!stopSection) return;
			const existing = stopsEl.querySelector(`.rux-trip-itinerary__dwell-card[data-stop-idx="${idx}"]`);
			const replacement = elementFromMarkup(renderDwellSummaryCard(stop, idx, stops));
			if (!replacement) {
				existing?.remove();
				return;
			}
			if (existing) existing.replaceWith(replacement);
			else stopSection.insertAdjacentElement("afterend", replacement);
		}

		function syncDaySummaryCards() {
			const rangeGenerated = isIsoDate(tripStartDate()) && isIsoDate(tripEndDate());
			stops.forEach((item, idx) => {
				if (item.type !== "day") return;
				const existing = stopsEl.querySelector(`[data-itinerary-day-summary][data-stop-idx="${idx}"]`);
				if (!existing) return;
				const replacement = elementFromMarkup(renderDay(item, idx, stops, rangeGenerated));
				if (replacement) existing.replaceWith(replacement);
				else existing.remove();
			});

			const finalSummary = stopsEl.querySelector("[data-itinerary-final-summary]");
			if (finalSummary) {
				const replacement = elementFromMarkup(renderFinalDaySummary(stops));
				if (replacement) finalSummary.replaceWith(replacement);
				else finalSummary.remove();
			}
		}

		function syncOriginModeUi(pickup) {
			const mode = pickup.originMode === "yard" ? "yard" : "pickup";
			const section = stopsEl.querySelector(".rux-trip-itinerary__stop--yard");
			const startMarker = section?.querySelector(".rux-trip-itinerary__marker-pin");
			if (startMarker) {
				startMarker.classList.toggle("rux-trip-itinerary__marker-pin--pickup", mode === "yard");
				startMarker.classList.toggle("rux-trip-itinerary__marker-pin--depart-yard", mode !== "yard");
			}
			const times = section?.querySelector(".rux-trip-itinerary__yard-times");
			const meetRow = section?.querySelector("[data-yard-meet-row]");
			if (times) times.classList.toggle("rux-trip-itinerary__yard-times--meet", mode === "yard");
			if (meetRow) meetRow.hidden = mode !== "yard";
			const meetDate = section?.querySelector("[data-yard-meet-date]");
			const meetTime = section?.querySelector("[data-yard-meet-time]");
			if (meetDate) meetDate.value = pickup.spotDate || tripStartDate() || "";
			if (meetTime) meetTime.value = pickup.spot || "";

			const departDate = section?.querySelector("[data-yard-depart-date]");
			const departTime = section?.querySelector("[data-yard-depart-time]");
			[departDate, departTime].forEach((input) => {
				if (!input) return;
				input.readOnly = mode === "pickup";
				if (mode === "pickup") input.title = "Calculated from pickup timing and route duration";
				else input.removeAttribute("title");
			});
			if (departDate) departDate.value = pickup.departPrevDate || tripStartDate() || "";
			if (departTime) departTime.value = pickup.departPrev || "";

			const pickupIdx = stops.indexOf(pickup);
			if (mode === "yard" && activeAddressIdx === pickupIdx) {
				hideSuggestions();
				activeAddressIdx = null;
			}
			const currentPickup = stopsEl.querySelector(`.rux-trip-itinerary__stop[data-stop-idx="${pickupIdx}"]`);
			const replacementPickup = elementFromMarkup(renderStop(pickup, pickupIdx, stops));
			if (currentPickup && replacementPickup) currentPickup.replaceWith(replacementPickup);
			syncDwellSummaryCard(pickup, pickupIdx);
			window.Rux?.syncDateInputs?.(section);
		}

		function updateSummary() {
			confirmed = false;
			summaryEl.innerHTML = renderSummary(stops);
			const outboundStops = activeLeg === "outbound"
				? stops
				: (legBuffers.outbound ?? []);
			const returnStops = activeLeg === "return"
				? stops
				: (legBuffers.return ?? []);
			const totalMiles = calculatedMiles(outboundStops) + calculatedMiles(returnStops);
			const roundedMiles = Math.round(totalMiles * 10) / 10;
			root.dispatchEvent(new CustomEvent("rux:itinerary-miles-changed", {
				bubbles: true,
				detail: { miles: roundedMiles > 0 ? roundedMiles : null },
			}));
			const actions = summaryEl.querySelector(".rux-trip-itinerary__summary-actions");
			if (!actions) return;
			if (importBtn) actions.appendChild(importBtn);
			if (recalcBtn) actions.appendChild(recalcBtn);
			if (confirmBtn) actions.appendChild(confirmBtn);
			syncConfirmBtn();
		}

		// Update just the "From …" labels without re-rendering the whole list.
		// Called on name-field blur so the user doesn't lose focus while typing.
		function updateFromLabels() {
			stopsEl.querySelectorAll("[data-stop-idx]").forEach((el) => {
				const idx = parseInt(el.dataset.stopIdx, 10);
				const stop = stops[idx];
				if (!stop || stop.type === "day") return;
				const fromEl = el.querySelector(".rux-trip-itinerary__from");
				if (!fromEl) return;
				const prev = prevStopName(stops, idx);
				fromEl.textContent = prev ? `From ${prev}` : fromYardText();
			});
		}

		let dragSrcIdx = null;
		let dragFromHandle = false;

		const dayAddMenu = document.createElement("div");
		dayAddMenu.className = "rux-menu rux-popover";
		dayAddMenu.hidden = true;
		dayAddMenu.setAttribute("role", "menu");
		document.body.appendChild(dayAddMenu);
		let activeAddDay = null;

		const closeDayAddMenu = () => {
			if (!dayAddMenu.hidden) window.RuxMenu.close(dayAddMenu, { restoreFocus: false });
			activeAddDay = null;
		};
		const dayInsertIndex = (dayNumber) => {
			let start = dayNumber === 1
				? 0
				: stops.findIndex((item, idx) => item.type !== "day" && dayNumberFor(stops, idx) === dayNumber);
			if (start < 0) {
				// Idle day with no stops of its own — locate it via its own
				// "day" boundary marker (the (dayNumber-1)th one in the
				// array) instead of falling back to stops.length, which
				// always landed on whichever day happens to be last,
				// regardless of which idle middle day was actually clicked.
				const dayMarkerIdxs = [];
				stops.forEach((item, idx) => {
					if (item.type === "day") dayMarkerIdxs.push(idx);
				});
				const marker = dayMarkerIdxs[dayNumber - 2];
				start = marker != null ? marker + 1 : stops.length;
			}
			for (let idx = start; idx < stops.length; idx += 1) {
				if (stops[idx].type === "day" || stops[idx].type === "return") return idx;
				if (dayNumberFor(stops, idx) > dayNumber) return idx;
			}
			return stops.length;
		};
		const openDayAddMenu = (dayNumber, trigger) => {
			const insertIndex = dayInsertIndex(dayNumber);
			const hasEndDay = stops[insertIndex]?.type === "day";
			const datesDriveDays = isIsoDate(tripStartDate()) && isIsoDate(tripEndDate());
			const canAddDayBoundary = !(hasEndDay || datesDriveDays);

			// Sleeper is a dwell-status toggle on a regular stop now, not its
			// own insertable type, so "Add stop" is the only choice most of
			// the time. Skip the menu and insert directly instead of popping
			// up a single-item dropdown — only show it when there's an actual
			// second option (a driving day boundary) to pick from.
			if (!canAddDayBoundary) {
				insertAtIndex(insertIndex, defaultStop());
				return;
			}

			activeAddDay = dayNumber;
			dayAddMenu.innerHTML = `
				<button type="button" class="rux-menu__item" role="menuitem" data-day-add-type="stop"><span class="rux-icon" aria-hidden="true">location_on</span>Add stop</button>
				<button type="button" class="rux-menu__item" role="menuitem" data-day-add-type="day"><span class="rux-icon" aria-hidden="true">route</span>Add driving day boundary</button>`;
			window.RuxMenu.open(trigger, dayAddMenu, { placement: "bottom-end" });
		};
		dayAddMenu.addEventListener("rux:menu-close", () => {
			activeAddDay = null;
			dayAddMenu.innerHTML = "";
		});

		let addressSearchTimer = null;
		let addressSearchSeq = 0;
		let addressSessionToken = uuid();
		let activeAddressIdx = null;
		let activeSuggestions = [];
		let locationsDbPromise = null;

		const suggestionsEl = document.createElement("div");
		suggestionsEl.className = "rux-trip-itinerary__suggestions";
		suggestionsEl.hidden = true;
		suggestionsEl.setAttribute("role", "listbox");
		suggestionsEl.setAttribute("aria-label", "Address suggestions");
		document.body.appendChild(suggestionsEl);

		function hideSuggestions() {
			suggestionsEl.hidden = true;
			suggestionsEl.innerHTML = "";
			activeSuggestions = [];
		}

		function selectedAddressInput() {
			if (activeAddressIdx === null) return null;
			return stopsEl.querySelector(`.rux-trip-itinerary__stop[data-stop-idx="${activeAddressIdx}"]:not([hidden]) [data-field="address"]`);
		}

		function positionSuggestions(input) {
			const rect = input.getBoundingClientRect();
			const margin = 8;
			const width = Math.max(rect.width, 240);
			suggestionsEl.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
			suggestionsEl.style.top = `${rect.bottom + 4}px`;
			suggestionsEl.style.width = `${Math.min(width, window.innerWidth - margin * 2)}px`;
		}

		function suggestionLabel(suggestion) {
			if (suggestion.source === "saved") return suggestion.location.address;
			return suggestion.full_address ||
				[suggestion.name, suggestion.place_formatted].filter(Boolean).join(", ") ||
				suggestion.name ||
				"Address";
		}

		function renderSuggestions(input, suggestions) {
			activeSuggestions = suggestions;
			if (!suggestions.length) {
				hideSuggestions();
				return;
			}
			// Same promotion rux-ui/js/suggestions.js's own dropdown uses — this
			// one predates that shared component and has its own copy of the
			// same positioning mechanics (see the file header comment), so it
			// needs the same fix independently: .rux-trip-itinerary__suggestions
			// is a fixed-position, document.body-appended panel with a flat
			// --rux-z-dropdown (100) z-index, while the trip editor's own
			// .rux-panel--floating sits at --rux-z-modal (400) — without
			// this, the address suggestions list renders behind the dialog
			// it's popping out of instead of on top of it.
			suggestionsEl.toggleAttribute(
				"data-rux-modal-layer",
				Boolean(input.closest(".rux-modal-backdrop, .rux-panel--floating")),
			);
			positionSuggestions(input);
			suggestionsEl.innerHTML = suggestions.map((suggestion, i) => {
				const isSaved = suggestion.source === "saved";
				const name = isSaved
					? suggestion.location.name
					: suggestion.name || suggestionLabel(suggestion);
				const address = isSaved
					? suggestion.location.address
					: suggestion.place_formatted || suggestion.full_address || "";
				return `
					<div class="rux-trip-itinerary__suggestion-row${isSaved ? " is-saved" : ""}">
						<button class="rux-trip-itinerary__suggestion" type="button" role="option" data-suggestion-idx="${i}">
							<span class="rux-trip-itinerary__suggestion-name">${escHtml(name)}</span>
							<span class="rux-trip-itinerary__suggestion-address">${isSaved ? "Saved · " : ""}${escHtml(address)}</span>
						</button>
						${isSaved ? "" : `<button class="rux-button rux-button--ghost rux-button--icon rux-trip-itinerary__suggestion-save" type="button" data-save-suggestion-idx="${i}" aria-label="Use and save ${escHtml(name)}" title="Use and save location"><span class="rux-icon" aria-hidden="true">bookmark_add</span></button>`}
					</div>`;
			}).join("");
			suggestionsEl.hidden = false;
		}

		async function getLocationsDb() {
			if (!locationsDbPromise) {
				locationsDbPromise = import("../data/locations-db.js?v=1").catch((err) => {
					locationsDbPromise = null;
					throw err;
				});
			}
			return locationsDbPromise;
		}

		async function savedLocationSuggestions(query) {
			try {
				const locations = await (await getLocationsDb()).searchLocations(query, 5);
				return locations.map((location) => ({
					source: "saved",
					location,
					name: location.name,
					full_address: location.address,
				}));
			} catch (err) {
				console.warn("Saved location search failed:", err);
				return [];
			}
		}

		async function suggestAddress(input, idx) {
			const token = getMapboxToken();
			const q = input.value.trim();
			if (q.length < 2) {
				hideSuggestions();
				return;
			}
			const seq = ++addressSearchSeq;
			const saved = await savedLocationSuggestions(q);
			if (seq !== addressSearchSeq || activeAddressIdx !== idx) return;
			if (!token || q.length < 3) {
				renderSuggestions(input, saved);
				return;
			}
			const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
			url.searchParams.set("q", q);
			url.searchParams.set("session_token", addressSessionToken);
			url.searchParams.set("access_token", token);
			url.searchParams.set("country", "US");
			url.searchParams.set("types", "address,poi");
			url.searchParams.set("limit", "5");
			url.searchParams.set("proximity", "ip");
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox suggest failed: ${response.status}`);
				const data = await response.json();
				if (seq !== addressSearchSeq || activeAddressIdx !== idx) return;
				const savedAddresses = new Set(
					saved.map((item) => item.location.address.toLowerCase()),
				);
				const mapbox = (data.suggestions || [])
					.filter((item) => !savedAddresses.has(suggestionLabel(item).toLowerCase()))
					.map((item) => ({ ...item, source: "mapbox" }));
				renderSuggestions(input, [...saved, ...mapbox]);
			} catch (err) {
				console.warn("Address suggestions failed:", err);
				renderSuggestions(input, saved);
			}
		}

		async function geocodeYard() {
			const yard = getYard();
			if (yard.lat != null && yard.lng != null) return { lat: yard.lat, lng: yard.lng };
			const address = String(yard.address || "").trim();
			if (address.length < 3) return null;
			if (yardCoordsCache && yardAddressCacheKey === address) return yardCoordsCache;
			const token = getMapboxToken();
			if (!token) return null;
			try {
				const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
				url.searchParams.set("q", address);
				url.searchParams.set("access_token", token);
				url.searchParams.set("country", "US");
				url.searchParams.set("types", "address");
				url.searchParams.set("limit", "1");
				url.searchParams.set("proximity", "ip");
				const resp = await fetch(url);
				if (!resp.ok) return null;
				const data = await resp.json();
				const feat = data.features?.[0];
				const coords = feat?.geometry?.coordinates || [
					feat?.properties?.coordinates?.longitude,
					feat?.properties?.coordinates?.latitude,
				];
				const lng = Number(coords?.[0]);
				const lat = Number(coords?.[1]);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
				yardCoordsCache = { lat, lng };
				yardAddressCacheKey = address;
				return yardCoordsCache;
			} catch {
				return null;
			}
		}

		async function previousLocation(idx) {
			for (let i = idx - 1; i >= 0; i--) {
				const stop = stops[i];
				if (!stop || stop.type === "day") continue;
				// Sleeper has no location of its own — it's always wherever the
				// previous real stop already is (see previousStopAddress) — so
				// skip past it instead of treating its lack of an address as a dead
				// end. Without this, a stale/never-geocoded sleeper permanently
				// blocks routing for every stop after it, no matter how many
				// times Recalculate runs.
				if (stop.type === "sleeper") continue;
				if (stop.type === "pickup" && stop.originMode === "yard") return geocodeYard();
				if (stop.lat != null && stop.lng != null) return { lat: stop.lat, lng: stop.lng };
				if (await geocodeStop(i)) return { lat: stop.lat, lng: stop.lng };
				return null;
			}
			return geocodeYard();
		}

		function nextRealStopIndex(idx) {
			for (let i = idx + 1; i < stops.length; i++) {
				if (stops[i]?.type !== "day") return i;
			}
			return -1;
		}

		function applyFeatureToStop(stop, feature, fallbackLabel = "") {
			const props = feature?.properties || {};
			const coords = feature?.geometry?.coordinates || [
				props.coordinates?.longitude,
				props.coordinates?.latitude,
			];
			const lng = Number(coords?.[0]);
			const lat = Number(coords?.[1]);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
			stop.address = props.full_address || fallbackLabel || stop.address || "";
			stop.name = stop.name || props.name || "";
			stop.mapboxId = props.mapbox_id || props.feature_id || stop.mapboxId || null;
			stop.lng = lng;
			stop.lat = lat;
			return true;
		}

		async function geocodeStop(idx) {
			const token = getMapboxToken();
			const stop = stops[idx];
			if (!token || !stop || stop.type === "day" || stop.lat != null || stop.lng != null) return true;
			const q = String(stop.address || "").trim();
			if (q.length < 3) return false;

			const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
			url.searchParams.set("q", q);
			url.searchParams.set("access_token", token);
			url.searchParams.set("country", "US");
			url.searchParams.set("types", "address,poi");
			url.searchParams.set("limit", "1");
			url.searchParams.set("proximity", "ip");
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox forward failed: ${response.status}`);
				const data = await response.json();
				return applyFeatureToStop(stop, data.features?.[0], q);
			} catch (err) {
				console.warn("Stop geocode failed:", err);
				return false;
			}
		}

		// A sleeper never travels — it rests wherever the previous real stop
		// already is, by definition (see previousStopAddress).
		// So its own "leg" is always zero, and re-deriving that through a route
		// call would depend on its cached lat/lng still matching the current
		// previous stop's — which silently goes stale the moment the stops
		// around it get reordered or a new stop lands next to it (nothing else
		// re-syncs it). Rather than trust a snapshot that can drift, treat
		// sleeper's zero-distance leg as a fact about its type, not something
		// to compute from coordinates and cache.
		async function syncSleeperLeg(idx) {
			const stop = stops[idx];
			const prev = await previousLocation(idx);
			if (prev) {
				stop.lat = prev.lat;
				stop.lng = prev.lng;
			}
			stop.miles = "0.0";
			stop.drive = "0:00";
			stop.milesSource = "estimated";
			stop.driveSource = "estimated";
			stop.routeStatus = "current";
			renderStopList();
			updateSummary();
			return true;
		}

		async function estimateLeg(idx, options = {}) {
			const force = !!options.force;
			const stop = stops[idx];
			if (!stop || stop.type === "day") return false;
			if (stop.type === "sleeper") return syncSleeperLeg(idx);
			if (stop.type === "pickup" && stop.originMode === "yard") {
				stop.miles = "0.0";
				stop.drive = "0:00";
				stop.routeStatus = "current";
				return true;
			}
			const token = getMapboxToken();
			if (!token) return false;
			if (stop.lat == null || stop.lng == null) {
				if (stop.type === "return") {
					const yc = await geocodeYard();
					if (!yc) return false;
					stop.lat = yc.lat;
					stop.lng = yc.lng;
				} else if (!(await geocodeStop(idx))) {
					return false;
				}
			}
			const updateMiles = force || stop.milesSource !== "manual";
			const updateDrive = force || stop.driveSource !== "manual";
			if (!updateMiles && !updateDrive) return false;
			const prev = await previousLocation(idx);
			if (!prev) return false;
			const coords = `${prev.lng},${prev.lat};${stop.lng},${stop.lat}`;
			const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
			url.searchParams.set("overview", "false");
			url.searchParams.set("access_token", token);
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox directions failed: ${response.status}`);
				const data = await response.json();
				const route = data.routes?.[0];
				if (!route) return false;
				if (updateMiles) {
					stop.miles = formatMilesValue(route.distance || 0);
					stop.milesSource = "estimated";
				}
				if (updateDrive) {
					stop.drive = formatDriveValue(Math.round((route.duration || 0) / 60));
					stop.driveSource = "estimated";
				}
				stop.routeStatus = "current";
				renderStopList();
				updateSummary();
				return true;
			} catch (err) {
				console.warn("Leg estimate failed:", err);
				return false;
			}
		}

		async function finishAddressSelection(idx) {
			const stop = stops[idx];
			stop.milesSource = stop.milesSource === "manual" ? "manual" : "estimated";
			stop.driveSource = stop.driveSource === "manual" ? "manual" : "estimated";
			hideSuggestions();
			renderStopList();
			updateFromLabels();
			await estimateLeg(idx);
			const nextIdx = nextRealStopIndex(idx);
			if (nextIdx >= 0) await estimateLeg(nextIdx);
		}

		async function applySavedLocation(idx, suggestion) {
			const stop = stops[idx];
			const location = suggestion?.location;
			if (!stop || !location) return;
			stop.address = location.address;
			stop.name = stop.name || location.name;
			stop.lat = location.lat;
			stop.lng = location.lng;
			stop.mapboxId = location.mapboxId || null;
			await finishAddressSelection(idx);
		}

		async function saveSelectedLocation(stop, suggestion) {
			try {
				await (await getLocationsDb()).saveLocation({
					name: suggestion?.name || stop.name || stop.address,
					address: stop.address,
					lat: stop.lat,
					lng: stop.lng,
					mapboxId: stop.mapboxId,
				});
				window.Rux?.toast?.("Location saved for future autofill.");
			} catch (err) {
				console.warn("Could not save selected location:", err);
				window.Rux?.toast?.(err?.message || "Could not save location.");
			}
		}

		async function retrieveSuggestion(idx, suggestion, { save = false } = {}) {
			const token = getMapboxToken();
			const stop = stops[idx];
			if (!token || !stop || !suggestion?.mapbox_id) return;
			const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}`);
			url.searchParams.set("session_token", addressSessionToken);
			url.searchParams.set("access_token", token);
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox retrieve failed: ${response.status}`);
				const data = await response.json();
				if (!applyFeatureToStop(stop, data.features?.[0], suggestionLabel(suggestion))) {
					throw new Error("Mapbox did not return coordinates for that location.");
				}
				stop.mapboxId = suggestion.mapbox_id || stop.mapboxId;
				stop.name = stop.name || suggestion.name || "";
				addressSessionToken = uuid();
				const savePromise = save
					? saveSelectedLocation(stop, suggestion)
					: null;
				await finishAddressSelection(idx);
				if (savePromise) await savePromise;
			} catch (err) {
				console.warn("Address retrieve failed:", err);
			}
		}

		/* — initial render — */
		updateSummary();
		renderStopList();

		root.addEventListener("change", (event) => {
			const startId = activeLeg === "return" ? "tp-return-start" : "tp-start";
			const endId = activeLeg === "return" ? "tp-return-end" : "tp-end";
			if (![startId, endId].includes(event.target?.id)) return;
			if (event.target.id === startId) {
				const pickup = stops.find((item) => item.type === "pickup");
				if (pickup) pickup.departPrevDate = event.target.value;
			}
			scaffoldDaysFromTripRange();
			normalizeBoundaryDates();
			syncTripDatesFromBoundaries();
			renderStopList();
		});

		async function recalculateRoute(options = {}) {
			const recalcLabel = recalcBtn?.querySelector("[data-recalc-label]");
			if (recalcBtn) {
				recalcBtn.disabled = true;
				recalcBtn.classList.add("is-routing");
				recalcBtn.setAttribute("aria-label", "Calculating route");
				if (recalcLabel) recalcLabel.textContent = "Calculating…";
			}
			// A leg switch mid-recalc would swap `stops` out from under this loop's
			// indices, silently misapplying results to the wrong leg — lock the
			// toggle for the duration.
			legToggleEl?.querySelectorAll(".rux-button").forEach((btn) => { btn.disabled = true; });
			if (resetLegBtn) resetLegBtn.disabled = true;
			let routed = 0;
			for (let i = 0; i < stops.length; i++) {
				if (await estimateLeg(i, options)) routed++;
			}
			autoPopulateReturnTimes(stops);
			autoPopulatePickupSpot(stops);
			autoPopulatePickupDepart(stops);
			legToggleEl?.querySelectorAll(".rux-button").forEach((btn) => { btn.disabled = false; });
			if (resetLegBtn) resetLegBtn.disabled = false;
			if (recalcBtn) {
				recalcBtn.disabled = false;
				recalcBtn.classList.remove("is-routing");
				if (routed === 0) {
					recalcBtn.classList.add("is-error");
					recalcBtn.title = "Route failed — check addresses and Mapbox token in Settings";
					if (recalcLabel) recalcLabel.textContent = "Retry";
					setTimeout(() => {
						recalcBtn.classList.remove("is-error");
						syncRouteButton();
					}, 4000);
				} else {
					syncRouteButton();
				}
			}
		}

		/* — input changes — */
		stopsEl.addEventListener("input", (e) => {
			if (e.target.matches("[data-yard-depart-date]")) {
				const startInput = root.querySelector(activeLeg === "return" ? "#tp-return-start" : "#tp-start");
				if (startInput) startInput.value = e.target.value;
				const pickup = stops.find((item) => item.type === "pickup");
				if (pickup) pickup.departPrevDate = e.target.value;
				if (pickup?.originMode === "yard") {
					const firstStop = stops.find((item) => item.type === "stop");
					if (firstStop) firstStop.departPrevDate = e.target.value;
				}
				normalizeBoundaryDates();
				syncTripDatesFromBoundaries();
				return;
			}
			if (e.target.matches("[data-yard-depart-time]")) {
				const pickup = stops.find((item) => item.type === "pickup");
				if (!pickup || pickup.originMode !== "yard") return;
				pickup.departPrev = e.target.value;
				const firstStop = stops.find((item) => item.type === "stop");
				if (firstStop) firstStop.departPrev = e.target.value;
				return;
			}
			const stopEl = e.target.closest("[data-stop-idx]");
			if (!stopEl) return;
			const idx = parseInt(stopEl.dataset.stopIdx, 10);
			const field = e.target.dataset.field;
			if (!field || !stops[idx]) return;
			stops[idx][field] = e.target.value;
			if (field === "arrive") {
				autoPopulateReturnTimes(stops);
				updateSummary();
			}
			if (field === "address") {
				activeAddressIdx = idx;
				stops[idx].lat = null;
				stops[idx].lng = null;
				stops[idx].mapboxId = null;
				const wrap = e.target.closest(".rux-trip-itinerary__address-wrap");
				if (wrap) {
					wrap.classList.remove("is-verified");
					wrap.querySelector(".rux-trip-itinerary__addr-check")?.remove();
				}
				markAffectedLegsStale(idx);
				if (stops[idx].milesSource !== "manual") stops[idx].miles = "";
				if (stops[idx].driveSource !== "manual") stops[idx].drive = "";
				updateSummary();
				clearTimeout(addressSearchTimer);
				addressSearchTimer = setTimeout(() => suggestAddress(e.target, idx), 250);
			}
			if (field === "miles") {
				stops[idx].milesSource = "manual";
				stops[idx].routeStatus = "current";
				syncRouteButton();
				updateSummary();
			}
			if (field === "drive") {
				stops[idx].driveSource = "manual";
				stops[idx].routeStatus = "current";
				syncRouteButton();
				updateSummary();
			}
		});

		stopsEl.addEventListener("focusin", (e) => {
			if (e.target.dataset.field !== "address") return;
			const stopEl = e.target.closest("[data-stop-idx]");
			if (!stopEl) return;
			const idx = parseInt(stopEl.dataset.stopIdx, 10);
			if (activeAddressIdx !== idx) {
				activeAddressIdx = idx;
				addressSessionToken = uuid();
			}
			suggestAddress(e.target, idx);
		});

		suggestionsEl.addEventListener("click", (e) => {
			const saveBtn = e.target.closest("[data-save-suggestion-idx]");
			const btn = e.target.closest("[data-suggestion-idx]");
			if ((!btn && !saveBtn) || activeAddressIdx === null) return;
			const suggestionIndex = parseInt(
				saveBtn?.dataset.saveSuggestionIdx ?? btn.dataset.suggestionIdx,
				10,
			);
			const suggestion = activeSuggestions[suggestionIndex];
			if (suggestion?.source === "saved") {
				applySavedLocation(activeAddressIdx, suggestion);
			} else {
				retrieveSuggestion(activeAddressIdx, suggestion, {
					save: Boolean(saveBtn),
				});
			}
		});

		document.addEventListener("mousedown", (e) => {
			if (suggestionsEl.hidden) return;
			if (suggestionsEl.contains(e.target)) return;
			if (selectedAddressInput()?.contains(e.target)) return;
			hideSuggestions();
		});

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") hideSuggestions();
		});

		// Update "From" labels after the user finishes editing a name field
		stopsEl.addEventListener(
			"blur",
			(e) => {
				if (e.target.dataset.field === "name") updateFromLabels();
			},
			true,
		);

		// Re-render when a time field commits (after native picker closes or field blurs)
		// so that day-segment stats stay current without fighting the time picker.
		// renderStopList() re-runs the whole Stop1→Spot→Pickup-departure chain
		// on every render, so changing any time field naturally cascades —
		// no need to special-case which field triggers which derived value here.
		const TIME_FIELDS = new Set([
			"departPrev", "departPrevDate", "arrive", "arriveDate", "spot", "spotDate", "label",
		]);
		stopsEl.addEventListener("change", (e) => {
			if (e.target.matches("[data-yard-depart-date], [data-yard-depart-time]")) {
				normalizeBoundaryDates();
				syncTripDatesFromBoundaries();
				renderStopList();
				updateSummary();
				return;
			}
			const field = e.target.dataset.field;
			if (field && TIME_FIELDS.has(field)) {
				const stopEl = e.target.closest("[data-stop-idx]");
				if (stopEl) {
					const idx = parseInt(stopEl.dataset.stopIdx, 10);
					const stop = stops[idx];
					if (stop) stop[field] = e.target.value;
				}
				if (field?.endsWith("Date") || field === "label") syncTripDatesFromBoundaries();
				renderStopList();
				updateSummary();
			}
		});

		/* — day header actions and inline section controls — */
		stopsEl.addEventListener("rux:segment-change", (e) => {
			const group = e.target.closest?.("[data-itinerary-segment]");
			if (!group) return;

			if (group.dataset.itinerarySegment === "dwell-status") {
				const idx = Number(group.closest("[data-stop-idx]")?.dataset.stopIdx);
				const stop = stops[idx];
				if (!stop) return;
				stop.dwellStatus = ["on", "sleeper", "off"].includes(e.detail.value) ? e.detail.value : "on";
				syncDwellSummaryCard(stop, idx);
				syncDaySummaryCards();
				updateSummary();
				return;
			}

			if (group.dataset.itinerarySegment === "origin-mode") {
				const pickup = stops.find((item) => item.type === "pickup");
				if (!pickup) return;
				pickup.originMode = e.detail.value === "yard" ? "yard" : "pickup";
				pickup.label = pickup.originMode === "yard" ? "origin:yard" : null;
				if (pickup.originMode === "yard") {
					pickup.miles = "0.0";
					pickup.drive = "0:00";
					pickup.routeStatus = "current";
					const firstStop = stops.find((item) => item.type === "stop");
					if (firstStop?.departPrev) {
						pickup.departPrev = firstStop.departPrev;
						pickup.departPrevDate = firstStop.departPrevDate || pickup.departPrevDate;
					}
				} else {
					pickup.routeStatus = "stale";
					if (pickup.milesSource !== "manual") pickup.miles = "";
					if (pickup.driveSource !== "manual") pickup.drive = "";
				}
				autoPopulatePickupSpot(stops);
				autoPopulatePickupDepart(stops);
				syncOriginModeUi(pickup);
				syncDaySummaryCards();
				updateSummary();
				syncRouteButton();
			}
		});

		stopsEl.addEventListener("click", (e) => {
			const expandButton = e.target.closest("[data-day-expand]");
			if (expandButton) {
				const group = expandButton.closest("[data-day-number]");
				const indices = Array.from(group?.querySelectorAll(".rux-trip-itinerary__stop[data-stop-idx]:not([hidden])") || [])
					.map((section) => Number(section.dataset.stopIdx))
					.filter((idx) => stops[idx] && stops[idx].type !== "day");
				const expand = !indices.every((idx) => stops[idx].statsExpanded);
				indices.forEach((idx) => { stops[idx].statsExpanded = expand; });
				renderStopList();
				return;
			}
			const addButton = e.target.closest("[data-day-add]");
			if (addButton) {
				const day = Number(addButton.closest("[data-day-number]")?.dataset.dayNumber);
				openDayAddMenu(day, addButton);
				return;
			}
			const deleteButton = e.target.closest("[data-inline-delete]");
			if (deleteButton) {
				const idx = Number(deleteButton.closest("[data-stop-idx]")?.dataset.stopIdx);
				const item = stops[idx];
				if (!item || item.type === "pickup" || item.type === "return") return;
				const what = item.type === "day" ? "driving day boundary" : item.type;
				if (!confirm(`Delete this ${what}?`)) return;
				stops.splice(idx, 1);
				const nextIdx = idx < stops.length ? nextRealStopIndex(idx - 1) : -1;
				if (nextIdx >= 0) markLegStale(nextIdx);
				updateSummary();
				if (item.type === "day") syncTripDatesFromBoundaries();
				renderStopList();
				return;
			}

		});

		dayAddMenu.addEventListener("click", (e) => {
			const button = e.target.closest("[data-day-add-type]");
			if (!button || activeAddDay === null) return;
			const day = activeAddDay;
			const insertIndex = dayInsertIndex(day);
			const type = button.dataset.dayAddType;
			closeDayAddMenu();
			const item = type === "day"
				? { type: "day", label: addIsoDays(tripStartDate(), day), name: "continued_driving", departPrev: "00:00" }
				: defaultStop();
			insertAtIndex(insertIndex, item);
			if (type === "day") syncTripDatesFromBoundaries();
		});

		document.addEventListener("keydown", (e) => {
			if (e.key !== "Escape") return;
			closeDayAddMenu();
		});

		/* — drag to reorder — */
		stopsEl.addEventListener("mousedown", (e) => {
			dragFromHandle = !!e.target.closest("[data-drag-handle]");
		});

		stopsEl.addEventListener("dragstart", (e) => {
			if (!dragFromHandle) { e.preventDefault(); return; }
			const el = e.target.closest("[data-stop-idx]");
			if (!el) return;
			dragSrcIdx = parseInt(el.dataset.stopIdx, 10);
			el.classList.add("is-dragging");
			e.dataTransfer.effectAllowed = "move";
		});

		stopsEl.addEventListener("dragend", (e) => {
			const el = e.target.closest("[data-stop-idx]");
			el?.classList.remove("is-dragging");
			stopsEl.querySelectorAll(".is-drag-target").forEach((t) => t.classList.remove("is-drag-target"));
			dragSrcIdx = null;
		});

		stopsEl.addEventListener("dragover", (e) => {
			if (dragSrcIdx === null) return;
			const el = e.target.closest("[data-stop-idx]");
			if (!el) return;
			const overIdx = parseInt(el.dataset.stopIdx, 10);
			if (overIdx === dragSrcIdx) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			stopsEl.querySelectorAll(".is-drag-target").forEach((t) => t.classList.remove("is-drag-target"));
			el.classList.add("is-drag-target");
		});

		stopsEl.addEventListener("drop", (e) => {
			e.preventDefault();
			const el = e.target.closest("[data-stop-idx]");
			if (!el || dragSrcIdx === null) return;
			const toIdx = parseInt(el.dataset.stopIdx, 10);
			if (toIdx === dragSrcIdx) return;
			const [moved] = stops.splice(dragSrcIdx, 1);
			const insertIdx = dragSrcIdx < toIdx ? toIdx - 1 : toIdx;
			stops.splice(insertIdx, 0, moved);
			const firstAffected = Math.min(dragSrcIdx, toIdx);
			markAffectedLegsStale(firstAffected);
			updateSummary();
			renderStopList();
		});

		function insertAtIndex(idx, newStop) {
			stops.splice(idx, 0, newStop);
			markAffectedLegsStale(idx);
			updateSummary();
			renderStopList();
		}

		document.addEventListener("settings:yard", () => {
			yardCoordsCache = null;
			yardAddressCacheKey = null;
			stops.forEach((stop) => {
				if (stop.type !== "return") return;
				const yard = getYard();
				stop.name = yard.name;
				stop.address = yard.address;
				stop.lat = yard.lat ?? null;
				stop.lng = yard.lng ?? null;
				stop.routeStatus = "stale";
			});
			// The other leg's stops aren't in `stops` right now (see legBuffers
			// above) — patch its return stop too, just mark it stale instead of
			// re-estimating, since that leg isn't on screen to show the result.
			const bufferedLeg = activeLeg === "outbound" ? "return" : "outbound";
			legBuffers[bufferedLeg]?.forEach((stop) => {
				if (stop.type !== "return") return;
				const yard = getYard();
				stop.name = yard.name;
				stop.address = yard.address;
				stop.lat = yard.lat ?? null;
				stop.lng = yard.lng ?? null;
				stop.routeStatus = "stale";
			});
			updateFromLabels();
			renderStopList();
			const returnIdx = stops.findIndex((stop) => stop.type === "return");
			if (returnIdx >= 0) estimateLeg(returnIdx);
		});

		root.querySelector("#tp-itin-recalc")?.addEventListener("click", () => {
			recalculateRoute({ force: true });
		});
		// Toggles confirmed directly rather than through updateSummary() (which
		// always clears it) — confirming isn't an edit, it shouldn't immediately
		// un-confirm itself.
		confirmBtn?.addEventListener("click", () => {
			confirmed = !confirmed;
			syncConfirmBtn();
		});
		resetLegBtn?.addEventListener("click", resetActiveLeg);

		const api = {
			// Defaults to whichever leg is currently on screen (not a literal
			// "outbound") so callers like the Upload JSON modal, which have no
			// idea which leg is active, target whatever the user is looking at.
			// trip-db.js always passes an explicit leg so it can address both
			// legs deterministically regardless of what's on screen.
			getStops: (leg = activeLeg) =>
				(leg === activeLeg ? stops : (legBuffers[leg] ?? defaultStops())).slice(),
			setStops: (newStops, leg = activeLeg) => {
				const normalized = newStops?.length ? newStops.map(normalizeStop) : defaultStops();
				if (!normalized.some((s) => s.type === "return")) normalized.push(defaultReturn());
				if (leg === activeLeg) {
					stops.length = 0;
					stops.push(...normalized);
					updateSummary();
					renderStopList();
				} else {
					legBuffers[leg] = normalized;
					updateSummary();
				}
			},
			clearStops: () => {
				stops.length = 0;
				stops.push(...defaultStops());
				legBuffers = { outbound: null, return: null };
				activeLeg = "outbound";
				setLegToggleValue("outbound");
				updateSummary();
				renderStopList();
			},
			setActiveLeg: (leg) => switchLeg(leg),
			getActiveLeg: () => activeLeg,
			resetActiveLeg,
			// Trip-level, not per-leg — set once on load (after setStops, whose
			// own updateSummary() call would otherwise clear it right back to
			// false) and read once at save time.
			getConfirmed: () => confirmed,
			setConfirmed: (value) => {
				confirmed = !!value;
				syncConfirmBtn();
			},
			setLegToggleVisible: (visible) => {
				if (legCardEl) legCardEl.hidden = !visible;
				if (!visible && activeLeg !== "outbound") switchLeg("outbound");
			},
		};
		// Published onto window.Itinerary (not just returned) so trip-panel.js's
		// syncReturnLegVisibility() and toggle-group click handler — which only
		// ever get `root`, never the `itinerary` instance index.html holds
		// locally — can reach setLegToggleVisible/setActiveLeg via
		// window.Itinerary, same convention as window.TripPanel/window.RuxDocs.
		Object.assign(window.Itinerary, api);
		return api;
	}

	window.Itinerary = { init: initItinerary };
})();
