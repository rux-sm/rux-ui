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

	function defaultStops() {
		return [defaultPickup()];
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
		return stop.routeStatus === "stale" ? "Route" : sourceLabel(source);
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

		const segment = stops.slice(startIdx, dayIdx).filter((s) => s.type !== "day");

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

		// Sleeper dwell = check-in (arrive) → next card's departPrev
		// Summed and subtracted from gross to get net on-duty.
		let sleeperDwell = 0;
		for (let i = startIdx; i < dayIdx; i++) {
			if (stops[i].type !== "sleeper") continue;
			const checkIn = parseTimeToMins(stops[i].arrive);
			for (let j = i + 1; j < dayIdx; j++) {
				if (stops[j].type !== "day" && stops[j].departPrev) {
					const d = minutesBetween(checkIn, parseTimeToMins(stops[j].departPrev));
					if (d !== null) sleeperDwell += d;
					break;
				}
			}
		}
		const netMins = grossMins !== null ? Math.max(0, grossMins - sleeperDwell) : null;

		return { totalMiles, totalDrive, grossMins, netMins };
	}

	function renderSegStats({ totalMiles, totalDrive, grossMins, netMins } = {}) {
		const items = [];

		if (totalMiles > 0) {
			const mi = totalMiles % 1 === 0 ? totalMiles : totalMiles.toFixed(1);
			items.push(`<span class="rux-itin__seg-stat">${mi} mi</span>`);
		}
		if (totalDrive > 0) {
			const warnDrive = totalDrive > 11 * 60;
			items.push(
				`<span class="rux-itin__seg-stat${warnDrive ? " rux-itin__seg-stat--warn" : ""}">${formatDriveMinsCompact(totalDrive)} drive</span>`,
			);
		}
		if (netMins !== null) {
			const warnNet = netMins > 14 * 60;
			items.push(
				`<span class="rux-itin__seg-stat${warnNet ? " rux-itin__seg-stat--warn" : ""}">` +
					`${formatDriveMinsCompact(netMins)} on duty</span>`,
			);
		}
		if (grossMins !== null && sleeperDwellInStats(grossMins, netMins)) {
			items.push(
				`<span class="rux-itin__seg-stat">${formatDriveMinsCompact(grossMins)} gross</span>`,
			);
		}

		return items.length ? `<div class="rux-itin__seg-stats">${items.join("")}</div>` : "";
	}

	// Only show gross alongside net when there is a meaningful difference (sleeper dwell > 0).
	function sleeperDwellInStats(gross, net) {
		return gross !== null && net !== null && gross !== net;
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

		const restLabel = `${formatDriveMinsCompact(thisMins)} rest`;
		let statusLabel, statusClass;
		if (resetOk) {
			statusLabel = splitOk ? "Reset ✓ split" : "Reset ✓";
			statusClass = "rux-itin__seg-stat--ok";
		} else {
			const deficit = RESET - totalRest;
			statusLabel = deficit > 0 ? `${formatDriveMinsCompact(deficit)} to reset` : "Conditions not met";
			statusClass = thisMins < SPLIT_MIN ? "rux-itin__seg-stat--warn" : "";
		}

		return `<div class="rux-itin__seg-stats">
      <span class="rux-itin__seg-stat">${restLabel}</span>
      <span class="rux-itin__seg-stat ${statusClass}">${statusLabel}</span>
    </div>`;
	}

	/* ── Render ──────────────────────────────────────────────────────────── */

	function formatDriveMinsCompact(mins) {
		if (mins === 0) return "—";
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}`;
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
		const milesStr = totalMiles === 0 ? "—" : (totalMiles % 1 === 0 ? `${totalMiles} mi` : `${totalMiles.toFixed(1)} mi`);
		return `
      <div class="rux-itin__stat">
        <span class="rux-itin__stat-label">Miles</span>
        <span class="rux-itin__stat-value">${milesStr}</span>
      </div>
      <div class="rux-itin__stat">
        <span class="rux-itin__stat-label">Days</span>
        <span class="rux-itin__stat-value">${dayCount}</span>
      </div>
      <div class="rux-itin__stat">
        <span class="rux-itin__stat-label">Drive</span>
        <span class="rux-itin__stat-value">${formatDriveMinsCompact(totalDrive)}</span>
      </div>
      <div class="rux-itin__stat">
        <span class="rux-itin__stat-label">On Duty</span>
        <span class="rux-itin__stat-value">${onDutyMins !== null ? formatDriveMinsCompact(onDutyMins) : "—"}</span>
      </div>`;
	}

	function renderDay(item, idx, stops) {
		const stats = computeSegmentStats(stops, idx);
		return `
      <div class="rux-itin__day" data-stop-idx="${idx}">
        <span class="rux-itin__day-badge">${escHtml(item.label)}</span>
        ${renderSegStats(stats)}
        <div class="rux-itin__card-actions">
          ${reorderBtns(idx, stops)}
          <button class="rux-button rux-button--ghost rux-button--icon"
                  type="button" data-delete-stop aria-label="Remove day break">
            <i data-lucide="x" class="rux-icon"></i>
          </button>
        </div>
      </div>`;
	}

	function reorderBtns(idx, stops) {
		const upDis  = idx === 0 || stops[idx - 1]?.type === "pickup"  ? " disabled" : "";
		const downDis = idx === stops.length - 1 || stops[idx + 1]?.type === "return" ? " disabled" : "";
		return `
        <button class="rux-button rux-button--ghost rux-button--icon" type="button" data-move-up${upDis} aria-label="Move up">
          <i data-lucide="chevron-up" class="rux-icon"></i>
        </button>
        <button class="rux-button rux-button--ghost rux-button--icon" type="button" data-move-down${downDis} aria-label="Move down">
          <i data-lucide="chevron-down" class="rux-icon"></i>
        </button>`;
	}

	const TYPE_LABEL = { pickup: "Pick-up", stop: "Stop", sleeper: "Sleeper", return: "Return" };

	function renderStop(stop, idx, stops) {
		const type = TYPE_LABEL[stop.type] ? stop.type : "stop";
		const prev = prevStopName(stops, idx);
		const fromText = prev ? `From ${prev}` : fromYardText();
		const isReturn = type === "return";
		const statsSection = type === "sleeper" ? renderSleeperStats(stop, stops) : "";
		const isStale = stop.routeStatus === "stale" && type !== "sleeper";

		const time1Label = type === "sleeper" ? "Start" : "Depart";
		const time2 =
			type === "pickup"  ? { label: "Spot",    field: "spot"   } :
			type === "sleeper" ? { label: "End",     field: "arrive" } :
			                          { label: "Arrive",  field: "arrive" };

		const isSleeper = type === "sleeper";

		const nameEl = isReturn
			? `<span class="rux-itin__name">${escHtml(stop.name)}</span>`
			: isSleeper ? ""
			: `<input class="rux-input" type="text" data-field="name"
               value="${escHtml(stop.name)}" placeholder="Location name" />`;

		const addrEl = isReturn
			? `<div class="rux-itin__address">${escHtml(stop.address)}</div>`
			: isSleeper ? ""
			: `<div class="rux-itin__address-wrap">
               <input class="rux-input" type="text" data-field="address" autocomplete="off"
                      value="${escHtml(stop.address)}" placeholder="Address" />
             </div>`;

		const deleteBtn = type === "pickup" ? "" : `
      <button class="rux-button rux-button--ghost rux-button--icon"
              type="button" data-delete-stop aria-label="Remove stop">
        <i data-lucide="x" class="rux-icon"></i>
      </button>`;

		return `
      <div class="rux-itin__stop" data-stop-idx="${idx}">
        <div class="rux-itin__rail">
          <span class="rux-itin__dot rux-itin__dot--${type}"></span>
          <span class="rux-itin__line"></span>
        </div>
        <div class="rux-itin__card${isStale ? " rux-itin__card--stale" : ""}">
          <div class="rux-itin__card-meta">
            <span class="rux-itin__badge rux-itin__badge--${type}">${TYPE_LABEL[type]}</span>
            <span class="rux-itin__from">${escHtml(fromText)}</span>
            <div class="rux-itin__card-actions">
              ${(type !== "pickup" && type !== "return") ? reorderBtns(idx, stops) : ""}
              ${deleteBtn}
            </div>
          </div>
          ${nameEl ? `<div class="rux-itin__card-head">${nameEl}</div>` : ""}
          ${addrEl}
          <div class="rux-itin__fields">
            <span class="rux-itin__field-label">${time1Label}</span>
            <input class="rux-input" type="time" data-field="departPrev" value="${escHtml(stop.departPrev)}" />
            <span class="rux-itin__field-label">${time2.label}</span>
            <input class="rux-input" type="time" data-field="${time2.field}" value="${escHtml(stop[time2.field])}" />
            ${type !== "sleeper" ? `
            <span class="rux-itin__field-label rux-itin__field-label--with-source">
              Miles
              <span class="rux-itin__source${routeSourceClass(stop, "miles")}">${routeSourceLabel(stop, "miles")}</span>
            </span>
            <input class="rux-input" type="number" data-field="miles"
                   value="${escHtml(stop.miles)}" min="0" step="0.1" placeholder="0" />
            <span class="rux-itin__field-label rux-itin__field-label--with-source">
              Drive
              <span class="rux-itin__source${routeSourceClass(stop, "drive")}">${routeSourceLabel(stop, "drive")}</span>
            </span>
            <input class="rux-input" type="text" data-field="drive"
                   value="${escHtml(stop.drive)}" placeholder="h:mm" />` : ""}
          </div>
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

		/* — render helpers — */

		function hasStaleRoutes() {
			return stops.some((stop) => stop?.type !== "day" && stop?.type !== "sleeper" && stop.routeStatus === "stale");
		}

		function syncRouteButton() {
			if (!recalcBtn) return;
			const stale = hasStaleRoutes();
			recalcBtn.classList.toggle("is-stale", stale);
			recalcBtn.title = stale ? "Recalculate route updates" : "Recalculate route";
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

		function renderStopList() {
			stopsEl.innerHTML = stops
				.map((item, idx) => (item.type === "day" ? renderDay(item, idx, stops) : renderStop(item, idx, stops)))
				.join("");
			if (window.lucide) lucide.createIcons();
			syncRouteButton();
		}

		function updateSummary() {
			summaryEl.innerHTML = renderSummary(stops);
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

		async function previousLocation(idx) {
			for (let i = idx - 1; i >= 0; i--) {
				const stop = stops[i];
				if (!stop || stop.type === "day") continue;
				if (stop.lat != null && stop.lng != null) return { lat: stop.lat, lng: stop.lng };
				if (await geocodeStop(i)) return { lat: stop.lat, lng: stop.lng };
				return null;
			}
			const yard = getYard();
			return yard.lat != null && yard.lng != null ? { lat: yard.lat, lng: yard.lng } : null;
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
			if (!token || !stop || stop.type === "day") return;
			if ((stop.lat == null || stop.lng == null) && !(await geocodeStop(idx))) return;
			const updateMiles = force || stop.milesSource !== "manual";
			const updateDrive = force || stop.driveSource !== "manual";
			if (!updateMiles && !updateDrive) return;
			const prev = await previousLocation(idx);
			if (!prev) return;
			const coords = `${prev.lng},${prev.lat};${stop.lng},${stop.lat}`;
			const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
			url.searchParams.set("overview", "false");
			url.searchParams.set("access_token", token);
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox directions failed: ${response.status}`);
				const data = await response.json();
				const route = data.routes?.[0];
				if (!route) return;
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
			} catch (err) {
				console.warn("Leg estimate failed:", err);
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
			for (let i = 0; i < stops.length; i++) {
				await estimateLeg(i, options);
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
			if (field === "address") {
				activeAddressIdx = idx;
				stops[idx].lat = null;
				stops[idx].lng = null;
				stops[idx].mapboxId = null;
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
		const TIME_FIELDS = new Set(["departPrev", "arrive", "spot"]);
		stopsEl.addEventListener("change", (e) => {
			const field = e.target.dataset.field;
			if (field && TIME_FIELDS.has(field)) {
				const stopEl = e.target.closest("[data-stop-idx]");
				if (stopEl) {
					const idx = parseInt(stopEl.dataset.stopIdx, 10);
					const stop = stops[idx];
					if (stop) {
						stop[field] = e.target.value;
					}
				}
				renderStopList();
				updateSummary();
			}
		});

		/* — delete stop / day — */
		stopsEl.addEventListener("click", (e) => {
			const delBtn = e.target.closest("[data-delete-stop]");
			if (!delBtn) return;
			const itemEl = delBtn.closest("[data-stop-idx]");
			if (!itemEl) return;
			const idx = parseInt(itemEl.dataset.stopIdx, 10);
			stops.splice(idx, 1);
			const nextIdx = idx < stops.length ? nextRealStopIndex(idx - 1) : -1;
			if (nextIdx >= 0) markLegStale(nextIdx);
			updateSummary();
			renderStopList();
			syncReturnBtn();
		});

		/* — reorder stops — */
		stopsEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-move-up], [data-move-down]");
			if (!btn) return;
			const itemEl = btn.closest("[data-stop-idx]");
			if (!itemEl) return;
			const idx = parseInt(itemEl.dataset.stopIdx, 10);
			const newIdx = btn.hasAttribute("data-move-up") ? idx - 1 : idx + 1;
			if (newIdx < 0 || newIdx >= stops.length) return;
			[stops[idx], stops[newIdx]] = [stops[newIdx], stops[idx]];
			const firstAffected = Math.min(idx, newIdx);
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

		root.querySelector("#tp-itin-add-stop")?.addEventListener("click", () => {
			insertBeforeReturn({
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
			});
		});

		root.querySelector("#tp-itin-add-sleeper")?.addEventListener("click", () => {
			insertBeforeReturn({ type: "sleeper", name: "", address: "", miles: "", drive: "", milesSource: "estimated", driveSource: "estimated", routeStatus: "current", departPrev: "", arrive: "" });
		});

		/* — add return to yard — */
		const addReturnBtn = root.querySelector("#tp-itin-add-return");

		function syncReturnBtn() {
			if (addReturnBtn) addReturnBtn.disabled = stops.some((s) => s.type === "return");
		}

		addReturnBtn?.addEventListener("click", () => {
			if (stops.some((s) => s.type === "return")) return;
			const yard = getYard();
			const returnIdx = stops.length;
			stops.push({
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
			});
			updateSummary();
			renderStopList();
			syncReturnBtn();
			estimateLeg(returnIdx);
		});

		syncReturnBtn();

		document.addEventListener("settings:yard", () => {
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
				stops.push(...(newStops.length ? newStops.map(normalizeStop) : defaultStops()));
				updateSummary();
				renderStopList();
				syncReturnBtn();
			},
			clearStops: () => {
				stops.length = 0;
				stops.push(...defaultStops());
				updateSummary();
				renderStopList();
				syncReturnBtn();
			},
		};
	}

	window.Itinerary = { init: initItinerary };
})();
