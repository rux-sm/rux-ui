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

   The yard is the implicit origin — hardcoded via YARD, no card needed.

   API
   ---
   Itinerary.init(root)   → wire up a .rux-itin element
   ========================================================================== */

(function () {
	"use strict";

	/* ── Config ──────────────────────────────────────────────────────────── */

	const YARD = {
		name: "Yard",
		address: "2801 Zinnia Ave, McAllen, TX 78504",
	};

	/* ── Default demo data ───────────────────────────────────────────────── */

	function defaultStops() {
		return [];
	}

	/* ── Helpers ───────────────────────────────────────────────────── */

	function parseDriveMins(s) {
		const parts = String(s || "0:00").split(":");
		return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
	}

	function formatDriveMins(mins) {
		return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
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
        <span class="rux-itin__day-badge">${item.label}</span>
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
		const prev = prevStopName(stops, idx);
		const fromText = prev ? `From ${prev}` : "From yard";
		const isReturn = stop.type === "return";
		const statsSection = stop.type === "sleeper" ? renderSleeperStats(stop, stops) : "";

		const time1Label = stop.type === "sleeper" ? "Start" : "Depart";
		const time2 =
			stop.type === "pickup"  ? { label: "Spot",    field: "spot"   } :
			stop.type === "sleeper" ? { label: "End",     field: "arrive" } :
			                          { label: "Arrive",  field: "arrive" };

		const isSleeper = stop.type === "sleeper";

		const nameEl = isReturn
			? `<span class="rux-itin__name">${stop.name}</span>`
			: isSleeper ? ""
			: `<input class="rux-input" type="text" data-field="name"
               value="${stop.name || ""}" placeholder="Location name" />`;

		const addrEl = isReturn
			? `<div class="rux-itin__address">${stop.address}</div>`
			: isSleeper ? ""
			: `<input class="rux-input" type="text" data-field="address"
               value="${stop.address || ""}" placeholder="Address" />`;

		const deleteBtn = `
      <button class="rux-button rux-button--ghost rux-button--icon"
              type="button" data-delete-stop aria-label="Remove stop">
        <i data-lucide="x" class="rux-icon"></i>
      </button>`;

		return `
      <div class="rux-itin__stop" data-stop-idx="${idx}">
        <div class="rux-itin__rail">
          <span class="rux-itin__dot rux-itin__dot--${stop.type}"></span>
          <span class="rux-itin__line"></span>
        </div>
        <div class="rux-itin__card">
          <div class="rux-itin__card-meta">
            <span class="rux-itin__badge rux-itin__badge--${stop.type}">${TYPE_LABEL[stop.type]}</span>
            <span class="rux-itin__from">${fromText}</span>
            <div class="rux-itin__card-actions">
              ${(stop.type !== "pickup" && stop.type !== "return") ? reorderBtns(idx, stops) : ""}
              ${deleteBtn}
            </div>
          </div>
          ${nameEl ? `<div class="rux-itin__card-head">${nameEl}</div>` : ""}
          ${addrEl}
          <div class="rux-itin__fields">
            <span class="rux-itin__field-label">${time1Label}</span>
            <input class="rux-input" type="time" data-field="departPrev" value="${stop.departPrev || ""}" />
            <span class="rux-itin__field-label">${time2.label}</span>
            <input class="rux-input" type="time" data-field="${time2.field}" value="${stop[time2.field] || ""}" />
            ${stop.type !== "sleeper" ? `
            <span class="rux-itin__field-label">Miles</span>
            <input class="rux-input" type="number" data-field="miles"
                   value="${stop.miles || ""}" min="0" step="0.1" placeholder="0" />
            <span class="rux-itin__field-label">Drive</span>
            <input class="rux-input" type="text" data-field="drive"
                   value="${stop.drive || ""}" placeholder="h:mm" />` : ""}
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

		/* — render helpers — */

		function renderStopList() {
			stopsEl.innerHTML = stops
				.map((item, idx) => (item.type === "day" ? renderDay(item, idx, stops) : renderStop(item, idx, stops)))
				.join("");
			if (window.lucide) lucide.createIcons();
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
				fromEl.textContent = prev ? `From ${prev}` : "From yard";
			});
		}

		/* — initial render — */
		updateSummary();
		renderStopList();

		/* — input changes — */
		stopsEl.addEventListener("input", (e) => {
			const stopEl = e.target.closest("[data-stop-idx]");
			if (!stopEl) return;
			const idx = parseInt(stopEl.dataset.stopIdx, 10);
			const field = e.target.dataset.field;
			if (!field || !stops[idx]) return;
			stops[idx][field] = e.target.value;
			if (field === "miles" || field === "drive") updateSummary();
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
						// Auto-calculate drive time from depart → arrive/spot
						if (stop.type !== "sleeper") {
							const dep = parseTimeToMins(stop.departPrev);
							const arr = parseTimeToMins(stop.arrive || stop.spot);
							if (dep !== null && arr !== null) {
								const mins = minutesBetween(dep, arr);
								if (mins !== null)
									stop.drive = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
							}
						}
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
			updateSummary();
			renderStopList();
			syncReturnBtn();
			syncPickupBtn();
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
			updateSummary();
			renderStopList();
		});

		/* — add stop / pick-up — */
		function insertBeforeReturn(newStop) {
			const ri = stops.findIndex((s) => s.type === "return");
			ri >= 0 ? stops.splice(ri, 0, newStop) : stops.push(newStop);
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
				departPrev: "",
				arrive: "",
			});
		});

		const addPickupBtn = root.querySelector("#tp-itin-add-pickup");

		function syncPickupBtn() {
			if (addPickupBtn) addPickupBtn.disabled = stops.some((s) => s.type === "pickup");
		}

		addPickupBtn?.addEventListener("click", () => {
			if (stops.some((s) => s.type === "pickup")) return;
			insertBeforeReturn({ type: "pickup", name: "", address: "", miles: "", drive: "", departPrev: "", spot: "" });
			syncPickupBtn();
		});

		root.querySelector("#tp-itin-add-sleeper")?.addEventListener("click", () => {
			insertBeforeReturn({ type: "sleeper", name: "", address: "", miles: "", drive: "", departPrev: "", arrive: "" });
		});

		/* — add return to yard — */
		const addReturnBtn = root.querySelector("#tp-itin-add-return");

		function syncReturnBtn() {
			if (addReturnBtn) addReturnBtn.disabled = stops.some((s) => s.type === "return");
		}

		addReturnBtn?.addEventListener("click", () => {
			if (stops.some((s) => s.type === "return")) return;
			stops.push({
				type: "return",
				name: YARD.name,
				address: YARD.address,
				miles: "",
				drive: "",
				departPrev: "",
				arrive: "",
			});
			updateSummary();
			renderStopList();
			syncReturnBtn();
		});

		syncReturnBtn();
		syncPickupBtn();

		/* — add day break — */
		root.querySelector("#tp-itin-add-day")?.addEventListener("click", () => {
			const dayCount = stops.filter((s) => s.type === "day").length;
			const newDay = { type: "day", label: `Day ${dayCount + 1}` };
			const ri = stops.findIndex((s) => s.type === "return");
			ri >= 0 ? stops.splice(ri, 0, newDay) : stops.push(newDay);
			renderStopList();
		});
	}

	window.Itinerary = { init: initItinerary };
})();
