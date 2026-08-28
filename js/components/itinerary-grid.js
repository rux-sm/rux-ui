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

	/* ── Formatting ──────────────────────────────────────────────────────
	   Intl for the day dividers, per the interaction-a11y contract. Times are
	   native <input type="time">, so the browser localises those itself. The
	   formatter is built once — one per row is the single most expensive thing
	   a render like this can do. */

	const dayFormat = new Intl.DateTimeFormat(undefined, {
		weekday: "short", month: "short", day: "numeric",
	});

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
				arrive: stop.type === "sleeper" ? stop.rest_start_time : stop.arrival_time,
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
			} else {
				if (stop.arrive && stop.type !== "yard_origin") out.arrival_time = stop.arrive;
				if (stop.depart && stop.type !== "return") out.departure_time = stop.depart;
			}
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
			const arrive = stop.type === "pickup" ? stop.spot || "" : stop.arrive || "";
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
				depart: next?.departPrev || "",
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

	function renderRow(stop, index, days, count) {
		const fixed = FIXED_TYPES.has(stop.type);
		const dwell = clockMins(stop.arrive) !== null && clockMins(stop.depart) !== null
			? (clockMins(stop.depart) - clockMins(stop.arrive) + 1440) % 1440
			: null;
		const note = CONFIDENCE_NOTE[stop.addressConfidence];
		const crossesMidnight = days.departDay !== days.arriveDay;

		return `<li class="sched-itinerary-grid__row" data-idx="${index}" data-type="${stop.type}">
			<div class="sched-itinerary-grid__marker">
				<span class="rux-icon" aria-hidden="true">${TYPE_ICON[stop.type]}</span>
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
			</div>
			<div class="sched-itinerary-grid__meta">
				${dwell ? `<span class="sched-itinerary-grid__dwell">${escHtml(formatSpan(dwell))} here</span>` : ""}
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

	function renderLeg(stop, index) {
		const miles = Number.parseFloat(stop.miles);
		const mins = driveMins(stop.drive);
		const known = Number.isFinite(miles) || mins !== null;
		return `<li class="sched-itinerary-grid__leg${known ? "" : " sched-itinerary-grid__leg--unknown"}" data-leg="${index}">
			<span class="rux-icon" aria-hidden="true">arrow_downward</span>
			${known
				? `<span>${Number.isFinite(miles) ? `${miles.toFixed(1)} mi` : "— mi"}${mins !== null ? ` · ${escHtml(formatSpan(mins))}` : ""}</span>`
				: "<span>Not routed yet</span>"}
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
			if (index > 0) parts.push(renderLeg(stop, index));
			parts.push(renderRow(stop, index, days[index], state.stops.length));
		});
		return parts.join("");
	}

	function renderSummary(state) {
		const { miles, drive } = totals(state.stops);
		const days = deriveDays(state.stops);
		const dayCount = state.stops.length ? days[days.length - 1].departDay + 1 : 0;
		const stats = [
			["Stops", String(state.stops.length)],
			["Days", dayCount ? String(dayCount) : "—"],
			["Miles", miles ? miles.toFixed(1) : "—"],
			["Drive", drive ? formatSpan(drive) : "—"],
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
			<div data-flags></div>
			<ol class="sched-itinerary-grid__list" data-list></ol>

			<div class="sched-itinerary-grid__footer">
				<button type="button" class="rux-button rux-button--default rux-button--block" data-add>
					<span class="rux-icon" aria-hidden="true">add</span>
					<span class="rux-button__label">Add stop</span>
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

		function say(message, isError = false) {
			statusEl.textContent = message;
			statusEl.classList.toggle("is-error", !!isError);
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
			stop[field.dataset.field] = field.value;
			if (field.dataset.field === "address") {
				stop.addressConfidence = null;
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

			if (event.target.closest("[data-load]")) return loadPasted();
			if (event.target.closest("[data-copy-prompt]")) return copyPrompt();
			if (event.target.closest("[data-copy-json]")) return copyJson();
			if (event.target.closest("[data-pull]")) return pullFromItinerary();
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
				await navigator.clipboard.writeText(JSON.stringify(toV3(state), null, 2));
				say("Copied this itinerary as Trip Draft v3.");
			} catch {
				say("Clipboard was refused.", true);
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

		const api = {
			getDocument: () => toV3(state),
			setDocument(payload) {
				Object.assign(state, fromV3(payload));
				render();
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

	window.ItineraryGrid = { init, fromV3, toV3, deriveDays, fromEditorStops, normalizeStop };
})();
