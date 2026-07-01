/* ==========================================================================
   RUX UI — ITINERARY
   --------------------------------------------------------------------------
   Functional stop-timeline editor for the trip panel Itinerary tab.

   Data model
   ----------
   stops[]  — flat array mixing stop objects and day-break markers:
     { type: "day",    label }
     { type: "pickup", name, address, miles, drive, departPrev, spot }
     { type: "stop",   name, address, miles, drive, departPrev, arrive }
     { type: "return", name, address, miles, drive, departPrev, arrive }

   Each card always answers "the journey to get here":
     departPrev  = time you left the previous location heading to this card
     spot/arrive = time you arrive at this card's location

   The yard is the implicit origin — loaded from Settings with a fallback.

   API
   ---
   Itinerary.init(root)   → wire up a .rux-itin element
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

	/* ── Default demo data ───────────────────────────────────────────────── */

	function defaultPickup() {
		return {
			type: "pickup",
			name: "",
			address: "",
			miles: "",
			drive: "",
			milesSource: "estimated",
			driveSource: "estimated",
			routeStatus: "stale",
			departPrev: "",
			spot: "",
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
			arrive: "",
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
			arrive: "",
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
		return {
			...value,
			type: value.type || "stop",
			name: value.name || "",
			address: value.address || "",
			miles: value.miles || "",
			drive: value.drive || "",
			milesSource: value.milesSource === "manual" ? "manual" : "estimated",
			driveSource: value.driveSource === "manual" ? "manual" : "estimated",
			routeStatus: value.routeStatus === "stale" ? "stale" : "current",
			departPrev: value.departPrev || "",
			arrive: value.arrive || "",
			spot: value.spot || "",
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
		return source === "manual" ? " rux-itin__source--manual" : "";
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
			? `<span class="rux-itin__source${routeSourceClass(stop, field)}">${label}</span>`
			: "";
		const cls = label ? " rux-itin__field-label--with-source" : "";
		return `<span class="rux-itin__field-label${cls}">${text}${badge}</span>`;
	}

	function routeSourceClass(stop, field) {
		const source = field === "miles" ? stop.milesSource : stop.driveSource;
		if (stop.routeStatus === "stale") return " rux-itin__source--stale";
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

	// Name of the stop that precedes index idx (skipping day items).
	// Returns null if idx is the first real stop (origin = yard).
	function prevStopName(stops, idx) {
		for (let i = idx - 1; i >= 0; i--) {
			if (stops[i].type !== "day") return stops[i].name || "previous stop";
		}
		return null;
	}

	function fromYardText() {
		const yard = getYard();
		return `From ${yard.name || "yard"}`;
	}

	// Compute stats for the day segment ending at dayIdx (an "End day" marker).
	// Segment = stops between the previous "day" marker and this one (exclusive both ends).
	// Sleeper cards sit INSIDE a segment; their dwell time is subtracted from gross → net.
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

		const totalMiles = segment.reduce((n, s) => n + parseFloat(s.miles || 0), 0);
		const totalDrive = segment.reduce((n, s) => n + parseDriveMins(s.drive), 0);

		// Gross = wall clock first departPrev → last arrive/spot (includes sleeper rest)
		let firstDepart = null;
		let lastArrive = null;
		for (const s of segment) {
			if (s.departPrev && firstDepart === null) firstDepart = parseTimeToMins(s.departPrev);
		}
		for (let i = segment.length - 1; i >= 0; i--) {
			const t = segment[i].arrive || segment[i].spot;
			if (t) {
				lastArrive = parseTimeToMins(t);
				break;
			}
		}
		const grossMins = minutesBetween(firstDepart, lastArrive);

		// Sleeper rest = departPrev (STR) → arrive (END), same interval shown on the sleeper card.
		let sleeperDwell = 0;
		for (let i = startIdx; i < endIdx; i++) {
			if (stops[i].type !== "sleeper") continue;
			const d = minutesBetween(parseTimeToMins(stops[i].departPrev), parseTimeToMins(stops[i].arrive));
			if (d !== null) sleeperDwell += d;
		}
		const netMins = grossMins !== null ? Math.max(0, grossMins - sleeperDwell) : null;

		return { totalMiles, totalDrive, grossMins, netMins };
	}

	// Same value+unit format as the per-stop Miles/Drive boxes — no labels,
	// the unit suffix communicates what the number means.
	function renderDayStatsGrid({ totalMiles, totalDrive, netMins } = {}) {
		const miVal = totalMiles > 0 ? (totalMiles % 1 === 0 ? String(totalMiles) : totalMiles.toFixed(1)) : "—";
		const drVal = totalDrive > 0 ? formatDriveValue(totalDrive) : "—";
		const dutyVal = netMins !== null && netMins > 0 ? formatDriveValue(netMins) : "—";
		const drWarn = totalDrive > 11 * 60;
		const dutyWarn = netMins !== null && netMins > 14 * 60;
		const field = (val, unit, warn) => `
        <output class="rux-trip-panel__billing-output${warn ? " rux-itin__seg-stat--warn" : ""}">${escHtml(val)} <span class="rux-itin__unit">${unit}</span></output>`;
		return `<div class="rux-itin__day-stats">${field(miVal, "mi", false)}${field(drVal, "hr", drWarn)}${field(dutyVal, "hr", dutyWarn)}</div>`;
	}

	function renderSleeperStats(stop, stops) {
		const dep = parseTimeToMins(stop.departPrev);
		const arr = parseTimeToMins(stop.arrive);
		if (dep === null || arr === null) return "";
		const thisMins = minutesBetween(dep, arr);
		if (thisMins === null) return "";

		const RESET = 8 * 60;
		const SPLIT_MIN = 2 * 60;

		const allMins = stops
			.filter((s) => s.type === "sleeper")
			.map((s) => minutesBetween(parseTimeToMins(s.departPrev), parseTimeToMins(s.arrive)) || 0)
			.filter((d) => d > 0);

		const totalRest = allMins.reduce((a, b) => a + b, 0);
		const singleOk = allMins.some((d) => d >= RESET);
		const splitPairs = allMins.filter((d) => d >= SPLIT_MIN);
		const splitOk = !singleOk && splitPairs.length >= 2 && splitPairs[0] + splitPairs[1] >= RESET;
		const resetOk = singleOk || splitOk;

		// Same read-only-field look as Miles/Drive: status where Miles would
		// go (this card has no distance of its own), duration formatted like
		// every other "hr" field instead of the old "8h"/"1h 30m" shorthand.
		const statusClass = resetOk ? " rux-itin__seg-stat--ok" : (thisMins < SPLIT_MIN ? " rux-itin__seg-stat--warn" : "");
		const statusVal = resetOk ? "Reset" : "Not reset";
		const restVal = formatDriveValue(thisMins);

		return `<div class="rux-itin__sleeper-stats">
      <span class="rux-itin__lead-spacer" aria-hidden="true"></span>
      <output class="rux-trip-panel__billing-output${statusClass}">${statusVal}</output>
      <output class="rux-trip-panel__billing-output">${escHtml(restVal)} <span class="rux-itin__unit">hr</span></output>
    </div>`;
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
		const depMins = (prevArrMins + buffer) % 1440;
		ret.departPrev = minsToTimeStr(depMins);
		const driveMins = parseDriveMins(ret.drive);
		if (driveMins > 0) {
			ret.arrive = minsToTimeStr((depMins + driveMins) % 1440);
		}
	}

	// Chain of derived times working backward from the one real anchor a
	// dispatcher is actually given — Stop 1's scheduled departure *with
	// passengers*:
	//   Stop1.departPrev (manual, the anchor)
	//     → Pickup.spot = Stop1.departPrev − boarding padding
	//         → Pickup.departPrev = Pickup.spot − yard-to-pickup drive time
	// "Spot padding" is the boarding buffer for the first step (how much
	// earlier the bus should be ready than the scheduled passenger
	// departure) — it has nothing to do with the yard leg, which is pure
	// travel time.

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

	function autoPopulatePickupDepart(stops) {
		const pickup = stops.find((s) => s.type === "pickup");
		if (!pickup?.spot) return;
		const spotMins = parseClockMins(pickup.spot);
		if (spotMins === null) return;
		const driveMins = parseDriveMins(pickup.drive);
		if (driveMins <= 0) return;
		pickup.departPrev = minsToTimeStr(((spotMins - driveMins) % 1440 + 1440) % 1440);
	}

	function computeOnDuty(stops) {
		const pickup = stops.find((s) => s.type === "pickup");
		const ret = stops.find((s) => s.type === "return");
		if (!pickup?.departPrev || !ret?.arrive) return null;
		const gross = minutesBetween(parseTimeToMins(pickup.departPrev), parseTimeToMins(ret.arrive));
		if (gross === null) return null;
		let sleeperDwell = 0;
		for (const s of stops) {
			if (s.type !== "sleeper") continue;
			const dwell = minutesBetween(parseTimeToMins(s.departPrev), parseTimeToMins(s.arrive));
			if (dwell !== null) sleeperDwell += dwell;
		}
		return Math.max(0, gross - sleeperDwell);
	}

	function renderSummary(stops) {
		const real = stops.filter((s) => s.type !== "day");
		const totalMiles = real.reduce((n, s) => n + parseFloat(s.miles || 0), 0);
		const totalDrive = real.reduce((n, s) => n + parseDriveMins(s.drive), 0);
		const dayCount = stops.filter((s) => s.type === "day").length + 1;
		const onDutyMins = computeOnDuty(stops);

		const stats = [
			{ id: "days", value: `${dayCount}`, unit: dayCount === 1 ? "day" : "days" },
			{ id: "miles", value: totalMiles > 0 ? `${totalMiles % 1 === 0 ? totalMiles : totalMiles.toFixed(1)}` : "—", unit: "mi" },
			{ id: "drive", value: totalDrive > 0 ? formatDriveValue(totalDrive) : "—", unit: "hr" },
			{ id: "duty", value: onDutyMins !== null && onDutyMins > 0 ? formatDriveValue(onDutyMins) : "—", unit: "hr" },
		];
		const statsHtml = stats
			.map(
				(s) => `
        <output class="rux-trip-panel__billing-output" id="tp-itin-summary-${s.id}">${escHtml(s.value)} <span class="rux-itin__unit">${s.unit}</span></output>`
			)
			.join("");

		return `
      <span class="rux-trip-panel__section-label">Trip Summary</span>
      <div class="rux-itin__summary-grid">${statsHtml}</div>
      <div class="rux-itin__summary-actions"></div>`;
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

		const dayNum = stops.filter((s) => s.type === "day").length + 1;
		const stats = computeSegmentStats(stops, stops.length);
		return `
      <div class="rux-card rux-itin__day rux-itin__day--final">
        <div class="rux-itin__day-header">
          <span class="rux-itin__badge rux-itin__badge--endday" title="Day ${dayNum}" aria-label="Day ${dayNum} summary">
            <span class="rux-icon" aria-hidden="true">event_busy</span>
          </span>
          ${renderDayStatsGrid(stats)}
        </div>
      </div>`;
	}

	function formatDayLabel(label) {
		const m = label.match(/^(\w+),\s+(\w+)\s+(\d+),\s+\d{4}$/);
		if (!m) return label;
		const [, weekday, month, day] = m;
		return `${weekday.slice(0, 3).toUpperCase()} · ${month.slice(0, 3).toUpperCase()} ${day}`;
	}

	function renderDay(item, idx, stops) {
		const stats = computeSegmentStats(stops, idx);
		const label = formatDayLabel(item.label);
		return `
      <div class="rux-card rux-itin__day" data-stop-idx="${idx}" draggable="true">
        <div class="rux-itin__day-header">
          <span class="rux-itin__badge rux-itin__badge--endday" title="${escHtml(label)}"
                data-drag-handle data-delete-stop role="button" tabindex="0"
                aria-label="${escHtml(label)} — drag to reorder, click to remove">
            <span class="rux-icon" aria-hidden="true">event_busy</span>
          </span>
          ${renderDayStatsGrid(stats)}
        </div>
      </div>`;
	}

	const TYPE_LABEL = { pickup: "Pick-up", stop: "Stop", sleeper: "Sleeper", return: "Return" };
	// Icon shown in the 28x28 badge — TYPE_LABEL stays the accessible name
	// (title/aria-label). Pick-up and Stop share location_on since both are
	// just "arrive at a place"; return uses home for "back to the yard".
	const TYPE_ICON = { pickup: "location_on", stop: "location_on", sleeper: "airline_seat_flat", return: "home" };

	// A stop opens a new day's section if it's the very first stop, or the
	// one right after a "day" break marker.
	function isFirstStopOfDay(stops, idx) {
		return idx === 0 || stops[idx - 1]?.type === "day";
	}
	function dayNumberFor(stops, idx) {
		return stops.slice(0, idx).filter((s) => s.type === "day").length + 1;
	}
	// 1-based position of this stop among only the "stop"-type stops, for
	// address placeholders like "Stop 2 Address".
	function stopNumberFor(stops, idx) {
		return stops.slice(0, idx + 1).filter((s) => s.type === "stop").length;
	}

	// Sleeper always rests wherever the previous real stop is (see
	// sleeperFromPrev) — computed fresh from the current list on every render
	// so the displayed address can never go stale, unlike stop.address itself
	// which is only a one-time snapshot taken when the sleeper was inserted.
	function previousStopAddress(stops, idx) {
		for (let i = idx - 1; i >= 0; i--) {
			const s = stops[i];
			if (!s || s.type === "day" || s.type === "sleeper") continue;
			return s.address || "";
		}
		return "";
	}

	function renderStop(stop, idx, stops) {
		const type = TYPE_LABEL[stop.type] ? stop.type : "stop";
		const isReturn = type === "return";
		const isPickup = type === "pickup";
		const statsSection = type === "sleeper" ? renderSleeperStats(stop, stops) : "";
		const isStale = stop.routeStatus === "stale" && type !== "sleeper";

		const time1Label = type === "sleeper" ? "Str" : "Dep";
		const time2 =
			type === "pickup"  ? { label: "Spt", field: "spot"   } :
			type === "sleeper" ? { label: "End", field: "arrive" } :
			                     { label: "Arr", field: "arrive" };

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
		const addrEl = type === "sleeper"
			? `<div class="rux-itin__address-wrap">
               <input class="rux-input" type="text" value="${escHtml(sleeperAddr)}" readonly
                      placeholder="Inherits previous stop's address"
                      aria-label="${sleeperAddr ? `Resting at ${escHtml(sleeperAddr)}` : "Resting location — inherits previous stop's address"}" />
             </div>`
			: isReturn
				? `<div class="rux-itin__address-wrap">
               <input class="rux-input" type="text" value="${escHtml(stop.address)}" readonly
                      aria-label="${escHtml(stop.name)} — ${escHtml(stop.address)}" />
             </div>`
				: `<div class="rux-itin__address-wrap${showAddrIcon ? " is-verified" : ""}">
               <input class="rux-input" type="text" data-field="address" autocomplete="street-address"
                      value="${escHtml(stop.address)}" placeholder="${addressPlaceholder}" />
               ${isStale
				? '<span class="rux-icon rux-itin__addr-check rux-itin__addr-check--stale">error</span>'
				: isVerified
					? '<span class="rux-icon rux-itin__addr-check">check_circle</span>'
					: ""}
             </div>`;

		const isDraggable = type !== "pickup" && type !== "return";
		// Drag-handle/delete buttons folded into the badge itself: drag from
		// the badge to reorder, click it to remove the stop. Keeps the card
		// meta row down to just the address for types that have one.
		const badgeActionAttrs = isDraggable
			? `data-drag-handle data-delete-stop role="button" tabindex="0" aria-label="${TYPE_LABEL[type]} — drag to reorder, click to remove"`
			: `aria-label="${TYPE_LABEL[type]}"`;

		const milesVal = parseFloat(stop.miles) > 0 ? stop.miles : "—";
		const driveVal = stop.drive && stop.drive !== "0:00" ? stop.drive : "—";

		// Day-section header lives inside the card itself, like every other
		// piece of card content, rather than floating above it as bare text.
		// Return never gets one — it closes out the trip, it doesn't open a day.
		const dayTitle = !isReturn && isFirstStopOfDay(stops, idx)
			? `<div class="rux-itin__day-title rux-trip-panel__section-label">Day ${dayNumberFor(stops, idx)}</div>`
			: "";

		return `
      <div class="rux-itin__stop" data-stop-idx="${idx}"${isDraggable ? ' draggable="true"' : ""}>
        <div class="rux-card rux-itin__card${isStale ? " rux-itin__card--stale" : ""}">
          ${dayTitle}
          <div class="rux-itin__fields">
            <span class="rux-itin__badge rux-itin__badge--${type}" title="${TYPE_LABEL[type]}" ${badgeActionAttrs}><span class="rux-icon" aria-hidden="true">${TYPE_ICON[type]}</span></span>
            ${addrEl}
          </div>
          <div class="rux-itin__time-row">
            ${type !== "sleeper" ? `
            <button class="rux-button rux-button--ghost rux-button--icon" type="button"
                    data-toggle-stats aria-expanded="${!!stop.statsExpanded}"
                    aria-label="${stop.statsExpanded ? "Hide" : "Show"} mileage and drive time">
              <span class="rux-icon" aria-hidden="true">keyboard_arrow_down</span>
            </button>` : `<span class="rux-itin__lead-spacer" aria-hidden="true"></span>`}
            <input class="rux-input" type="time" data-field="departPrev" value="${escHtml(stop.departPrev)}"
                   aria-label="${isPickup ? "Yard departure — calculated from Stop 1" : time1Label}" ${isPickup ? "readonly" : ""} />
            <input class="rux-input" type="time" data-field="${time2.field}" value="${escHtml(stop[time2.field])}"
                   aria-label="${isPickup ? "Spot time — calculated from Stop 1" : time2.label}" ${isPickup ? "readonly" : ""} />
          </div>
          ${type !== "sleeper" ? `
          <div class="rux-itin__fields--pair">
            <span class="rux-itin__lead-spacer" aria-hidden="true"></span>
            <div class="rux-itin__stats-values${stop.statsExpanded ? " is-expanded" : ""}">
              <output class="rux-trip-panel__billing-output">${escHtml(milesVal)} <span class="rux-itin__unit">mi</span></output>
              <output class="rux-trip-panel__billing-output">${escHtml(driveVal)} <span class="rux-itin__unit">hr</span></output>
            </div>
          </div>` : ""}
          ${statsSection}
        </div>
      </div>`;
	}

	/* ── Init ────────────────────────────────────────────────────────────── */

	function initItinerary(root) {
		const summaryEl = root.querySelector("#tp-itin-summary");
		const stopsEl = root.querySelector("#tp-itin-stops");
		if (!summaryEl || !stopsEl) return;

		const stops = defaultStops();
		const recalcBtn = root.querySelector("#tp-itin-recalc");
		const importBtn = root.querySelector("#tp-import-btn");

		let yardCoordsCache = null;
		let yardAddressCacheKey = null;

		/* — render helpers — */

		function hasStaleRoutes() {
			return stops.some((stop) => stop?.type !== "day" && stop?.type !== "sleeper" && stop.routeStatus === "stale");
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

		function renderAddStopActions(stops) {
			const returnIdx = stops.findIndex((s) => s.type === "return");
			const afterIdx = returnIdx > 0 ? returnIdx - 1 : stops.length - 2;
			return `<div class="rux-itin__add-actions">
				<button class="rux-button" type="button" data-insert-after="${afterIdx}" data-insert-type="stop">
					<span class="rux-icon" aria-hidden="true">location_on</span>Stop
				</button>
				<button class="rux-button" type="button" data-insert-after="${afterIdx}" data-insert-type="sleeper">
					<span class="rux-icon" aria-hidden="true">hotel</span>Sleep
				</button>
				<button class="rux-button" type="button" data-insert-after="${afterIdx}" data-insert-type="day">
					<span class="rux-icon" aria-hidden="true">event_busy</span>End day
				</button>
			</div>`;
		}

		function renderStopList() {
			autoPopulateReturnTimes(stops);
			autoPopulatePickupSpot(stops);
			autoPopulatePickupDepart(stops);
			stopsEl.innerHTML =
				stops
					.map((item, idx) => (item.type === "day" ? renderDay(item, idx, stops) : renderStop(item, idx, stops)))
					.join("")
				+ renderAddStopActions(stops)
				+ renderFinalDaySummary(stops);
			syncRouteButton();
		}

		function updateSummary() {
			summaryEl.innerHTML = renderSummary(stops);
			const actions = summaryEl.querySelector(".rux-itin__summary-actions");
			if (!actions) return;
			if (importBtn) actions.appendChild(importBtn);
			if (recalcBtn) actions.appendChild(recalcBtn);
		}

		// Update just the "From …" labels without re-rendering the whole list.
		// Called on name-field blur so the user doesn't lose focus while typing.
		function updateFromLabels() {
			stopsEl.querySelectorAll("[data-stop-idx]").forEach((el) => {
				const idx = parseInt(el.dataset.stopIdx, 10);
				const stop = stops[idx];
				if (!stop || stop.type === "day") return;
				const fromEl = el.querySelector(".rux-itin__from");
				if (!fromEl) return;
				const prev = prevStopName(stops, idx);
				fromEl.textContent = prev ? `From ${prev}` : fromYardText();
			});
		}

		let dragSrcIdx = null;
		let dragFromHandle = false;

		let addressSearchTimer = null;
		let addressSearchSeq = 0;
		let addressSessionToken = uuid();
		let activeAddressIdx = null;
		let activeSuggestions = [];

		const suggestionsEl = document.createElement("div");
		suggestionsEl.className = "rux-itin__suggestions";
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
			return stopsEl.querySelector(`[data-stop-idx="${activeAddressIdx}"] [data-field="address"]`);
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
			positionSuggestions(input);
			suggestionsEl.innerHTML = suggestions.map((suggestion, i) => `
        <button class="rux-itin__suggestion" type="button" role="option" data-suggestion-idx="${i}">
          <span class="rux-itin__suggestion-name">${escHtml(suggestion.name || suggestionLabel(suggestion))}</span>
          <span class="rux-itin__suggestion-address">${escHtml(suggestion.place_formatted || suggestion.full_address || "")}</span>
        </button>
      `).join("");
			suggestionsEl.hidden = false;
		}

		async function suggestAddress(input, idx) {
			const token = getMapboxToken();
			const q = input.value.trim();
			if (!token || q.length < 3) {
				hideSuggestions();
				return;
			}
			const seq = ++addressSearchSeq;
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
				renderSuggestions(input, data.suggestions || []);
			} catch (err) {
				console.warn("Address suggestions failed:", err);
				hideSuggestions();
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
				// previous real stop already is (see sleeperFromPrev) — so skip
				// past it instead of treating its lack of an address as a dead
				// end. Without this, a stale/never-geocoded sleeper permanently
				// blocks routing for every stop after it, no matter how many
				// times Recalculate runs.
				if (stop.type === "sleeper") continue;
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

		async function estimateLeg(idx, options = {}) {
			const force = !!options.force;
			const token = getMapboxToken();
			const stop = stops[idx];
			if (!token || !stop || stop.type === "day") return false;
			if (stop.lat == null || stop.lng == null) {
				if (stop.type === "return") {
					const yc = await geocodeYard();
					if (!yc) return false;
					stop.lat = yc.lat;
					stop.lng = yc.lng;
				} else if (stop.type === "sleeper") {
					// Sleeper has no address to geocode — it just needs to
					// re-inherit whatever the previous real stop's location is
					// now (its initial snapshot from sleeperFromPrev can go
					// stale if that stop wasn't geocoded yet at insert time).
					const prev = await previousLocation(idx);
					if (!prev) return false;
					stop.lat = prev.lat;
					stop.lng = prev.lng;
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

		async function retrieveSuggestion(idx, suggestion) {
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
				applyFeatureToStop(stop, data.features?.[0], suggestionLabel(suggestion));
				stop.mapboxId = suggestion.mapbox_id || stop.mapboxId;
				stop.name = stop.name || suggestion.name || "";
				stop.milesSource = stop.milesSource === "manual" ? "manual" : "estimated";
				stop.driveSource = stop.driveSource === "manual" ? "manual" : "estimated";
				addressSessionToken = uuid();
				hideSuggestions();
				renderStopList();
				updateFromLabels();
				await estimateLeg(idx);
				const nextIdx = nextRealStopIndex(idx);
				if (nextIdx >= 0) await estimateLeg(nextIdx);
			} catch (err) {
				console.warn("Address retrieve failed:", err);
			}
		}

		/* — initial render — */
		updateSummary();
		renderStopList();

		async function recalculateRoute(options = {}) {
			const recalcLabel = recalcBtn?.querySelector("[data-recalc-label]");
			if (recalcBtn) {
				recalcBtn.disabled = true;
				recalcBtn.classList.add("is-routing");
				if (recalcLabel) recalcLabel.textContent = "Calculating…";
			}
			let routed = 0;
			for (let i = 0; i < stops.length; i++) {
				if (await estimateLeg(i, options)) routed++;
			}
			autoPopulateReturnTimes(stops);
			autoPopulatePickupSpot(stops);
			autoPopulatePickupDepart(stops);
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
				const wrap = e.target.closest(".rux-itin__address-wrap");
				if (wrap) {
					wrap.classList.remove("is-verified");
					wrap.querySelector(".rux-itin__addr-check")?.remove();
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
			const btn = e.target.closest("[data-suggestion-idx]");
			if (!btn || activeAddressIdx === null) return;
			const suggestion = activeSuggestions[parseInt(btn.dataset.suggestionIdx, 10)];
			retrieveSuggestion(activeAddressIdx, suggestion);
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
		const TIME_FIELDS = new Set(["departPrev", "arrive", "spot"]);
		stopsEl.addEventListener("change", (e) => {
			const field = e.target.dataset.field;
			if (field && TIME_FIELDS.has(field)) {
				const stopEl = e.target.closest("[data-stop-idx]");
				if (stopEl) {
					const idx = parseInt(stopEl.dataset.stopIdx, 10);
					const stop = stops[idx];
					if (stop) stop[field] = e.target.value;
				}
				renderStopList();
				updateSummary();
			}
		});

		/* — delete stop / day — */
		stopsEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-delete-stop]");
			if (!btn) return;
			const itemEl = btn.closest("[data-stop-idx]");
			if (!itemEl) return;
			const what = btn.classList.contains("rux-itin__badge--endday") ? "day break" : "stop";
			if (!confirm(`Remove this ${what}?`)) return;
			const idx = parseInt(itemEl.dataset.stopIdx, 10);
			stops.splice(idx, 1);
			const nextIdx = idx < stops.length ? nextRealStopIndex(idx - 1) : -1;
			if (nextIdx >= 0) markLegStale(nextIdx);
			updateSummary();
			renderStopList();
		});

		/* Badges with data-delete-stop are focusable spans (role="button"),
		   not real <button>s, so Enter/Space needs wiring up manually. */
		stopsEl.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" && e.key !== " ") return;
			const el = e.target.closest("[data-delete-stop]");
			if (!el) return;
			e.preventDefault();
			el.click();
		});

		/* — toggle Miles/Drive stats — */
		stopsEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-toggle-stats]");
			if (!btn) return;
			const itemEl = btn.closest("[data-stop-idx]");
			if (!itemEl) return;
			const idx = parseInt(itemEl.dataset.stopIdx, 10);
			stops[idx].statsExpanded = !stops[idx].statsExpanded;
			renderStopList();
			// renderStopList() rebuilds innerHTML, destroying the clicked button —
			// re-focus its replacement so keyboard users don't lose their place.
			stopsEl.querySelector(`[data-stop-idx="${idx}"] [data-toggle-stats]`)?.focus();
		});

		/* — inline insert row — */
		stopsEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-insert-after]");
			if (btn) {
				const afterIdx = parseInt(btn.dataset.insertAfter, 10);
				const insertType = btn.dataset.insertType;
				let newStop;
				if (insertType === "day") {
					newStop = { type: "day", label: `Day ${stops.filter((s) => s.type === "day").length + 1}` };
				} else if (insertType === "sleeper") {
					newStop = newSleeperStop(afterIdx + 1);
				} else {
					newStop = defaultStop();
				}
				insertAtIndex(afterIdx + 1, newStop);
				return;
			}
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
			stops.splice(toIdx, 0, moved);
			const firstAffected = Math.min(dragSrcIdx, toIdx);
			markAffectedLegsStale(firstAffected);
			updateSummary();
			renderStopList();
		});

		/* — add stop / pick-up — */
		function insertBeforeReturn(newStop) {
			const ri = stops.findIndex((s) => s.type === "return");
			const insertIdx = ri >= 0 ? ri : stops.length;
			ri >= 0 ? stops.splice(ri, 0, newStop) : stops.push(newStop);
			markAffectedLegsStale(insertIdx);
			updateSummary();
			renderStopList();
		}

		function insertAtIndex(idx, newStop) {
			stops.splice(idx, 0, newStop);
			markAffectedLegsStale(idx);
			updateSummary();
			renderStopList();
		}

		function sleeperFromPrev(insertIdx) {
			for (let i = insertIdx - 1; i >= 0; i--) {
				const s = stops[i];
				if (!s || s.type === "day") continue;
				// Skip past an earlier sleeper too, same reasoning as
				// previousLocation() — copy a real stop's location, not
				// another sleeper's possibly-still-unresolved snapshot.
				if (s.type === "sleeper") continue;
				return { address: s.address || "", lat: s.lat ?? null, lng: s.lng ?? null, mapboxId: s.mapboxId ?? null };
			}
			return { address: "", lat: null, lng: null, mapboxId: null };
		}

		function newSleeperStop(insertIdx) {
			const prev = sleeperFromPrev(insertIdx);
			return { type: "sleeper", name: "", address: prev.address, miles: "", drive: "", milesSource: "estimated", driveSource: "estimated", routeStatus: "current", departPrev: "", arrive: "", lat: prev.lat, lng: prev.lng, mapboxId: prev.mapboxId };
		}

		root.querySelector("#tp-itin-add-stop")?.addEventListener("click", () => {
			insertBeforeReturn(defaultStop());
		});

		root.querySelector("#tp-itin-add-sleeper")?.addEventListener("click", () => {
			const ri = stops.findIndex((s) => s.type === "return");
			const insertIdx = ri >= 0 ? ri : stops.length;
			insertBeforeReturn(newSleeperStop(insertIdx));
		});

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
			updateFromLabels();
			renderStopList();
			const returnIdx = stops.findIndex((stop) => stop.type === "return");
			if (returnIdx >= 0) estimateLeg(returnIdx);
		});

		root.querySelector("#tp-itin-recalc")?.addEventListener("click", () => {
			recalculateRoute({ force: true });
		});


		/* — add day break — */
		root.querySelector("#tp-itin-add-day")?.addEventListener("click", () => {
			const dayCount = stops.filter((s) => s.type === "day").length;
			const newDay = { type: "day", label: `Day ${dayCount + 1}` };
			const ri = stops.findIndex((s) => s.type === "return");
			ri >= 0 ? stops.splice(ri, 0, newDay) : stops.push(newDay);
			renderStopList();
		});

		return {
			getStops: () => stops.slice(),
			setStops: (newStops) => {
				stops.length = 0;
				const normalized = newStops.length ? newStops.map(normalizeStop) : defaultStops();
				if (!normalized.some((s) => s.type === "return")) normalized.push(defaultReturn());
				stops.push(...normalized);
				updateSummary();
				renderStopList();
			},
			clearStops: () => {
				stops.length = 0;
				stops.push(...defaultStops());
				updateSummary();
				renderStopList();
			},
		};
	}

	window.Itinerary = { init: initItinerary };
})();
