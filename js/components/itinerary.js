/* ==========================================================================
   RUX UI — ITINERARY
   --------------------------------------------------------------------------
   The trip panel's Itinerary tab: six fields, and three times worked out
   from them. It asks where the group is picked up and dropped off, each a
   name and an address, and when the group leaves and arrives. Everything
   else — when the bus leaves the yard, when it reaches the pickup, when it
   gets home — follows.

   The labels name who is moving, which is also the rule for what is typed:
   the group's two times are typed, the bus's three are worked out.

     Yard depart    worked out   Bus arrives less the drive from the yard
     Bus arrives    worked out   Group departs less 15 minutes
     Group departs  typed
     Group arrives  typed
     Yard return    worked out   Group arrives plus the drive back

   The same six fields and the same five labels as the scheduler's Route tab
   (docs/itinerary-simplify-plan.md), so a trip reads the same in either app.

   Data model
   ----------
   Per leg: { pickup, drop, depart, arrive, driveOut, driveBack, milesOut,
   milesBack }, each place { name, address, lat, lng, mapboxId }.

   trip-db.js replaces every `trip_stops` row on save with what getStops
   returns, so these six fields ARE the trip's stops. Three rows go back:

     pickup  name/address, spot (Bus arrives), departPrev (Yard depart),
             drive and miles from the yard
     stop    name/address of the drop-off, departPrev (Group departs),
             arrive (Group arrives)
     return  the yard, departPrev (Group arrives), arrive (Yard return),
             drive and miles back

   That is the shape the scheduler writes, so neither app has to translate.

   API
   ---
   Itinerary.init(root) → wire up the trip panel's Itinerary tab
   ========================================================================== */

(function () {
	"use strict";

	/* ── Config ──────────────────────────────────────────────────────────── */

	const DEFAULT_YARD = {
		name: "Yard",
		address: "2801 Zinnia Ave, McAllen, TX 78504",
	};

	// The bus is spotted this long before the group leaves. Fixed: the field
	// that changed it went with the per-day editor, and the Times list says so.
	const PADDING_MINS = 15;

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

	/* ── Time helpers ────────────────────────────────────────────────────── */

	function parseClockMins(t) {
		const m = /^(\d{1,2}):(\d{2})/.exec(String(t || "").trim());
		if (!m) return null;
		const mins = Number(m[1]) * 60 + Number(m[2]);
		return Number.isFinite(mins) ? mins : null;
	}

	function minsToTimeStr(mins) {
		if (mins == null) return "";
		const wrapped = ((mins % 1440) + 1440) % 1440;
		return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
	}

	function clockLabel(t) {
		const mins = parseClockMins(t);
		if (mins == null) return "—";
		const hour = Math.floor(mins / 60) % 12 || 12;
		return `${hour}:${String(mins % 60).padStart(2, "0")} ${mins < 720 ? "AM" : "PM"}`;
	}

	/* `trip_stops.drive` stores "H:MM" -- "0:35", "3:13". Reading it as
	   anything else makes every stored drive null, and the yard times with it. */
	function parseDriveMins(text) {
		const s = String(text ?? "").trim();
		if (!s.includes(":")) return null;
		const [h, m] = s.split(":");
		const mins = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
		return Number.isFinite(mins) ? mins : null;
	}

	// What goes back into the column, in the format it came out in.
	function formatDriveValue(mins) {
		if (mins == null) return "";
		return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
	}

	// "3h 13m", for reading in the Times list. Never stored.
	function formatDriveMins(mins) {
		if (mins == null) return "";
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
	}

	function escHtml(value) {
		return String(value ?? "").replace(/[&<>"']/g, (c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
	}

	function uuid() {
		return crypto.randomUUID ? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	/* ── The route a leg holds ───────────────────────────────────────────── */

	const blankPlace = () => ({ name: "", address: "", lat: null, lng: null, mapboxId: null });

	const blankLeg = () => ({
		pickup: blankPlace(),
		drop: blankPlace(),
		depart: "",
		arrive: "",
		driveOut: null,
		driveBack: null,
		milesOut: null,
		milesBack: null,
	});

	const hasPlace = (p) => !!(p && (p.name || p.address));

	/* ── The three times the bus keeps ───────────────────────────────────── */

	function busTimes(leg) {
		const departMins = parseClockMins(leg.depart);
		const arriveMins = parseClockMins(leg.arrive);
		const spotMins = departMins == null ? null : departMins - PADDING_MINS;
		const yardOutMins = spotMins == null || leg.driveOut == null ? null : spotMins - leg.driveOut;
		const yardBackMins = arriveMins == null || leg.driveBack == null ? null : arriveMins + leg.driveBack;
		return {
			spot: minsToTimeStr(spotMins),
			yardOut: minsToTimeStr(yardOutMins),
			yardBack: minsToTimeStr(yardBackMins),
			// The whole day the bus is out, which is what the duty limit is on.
			dutyMins: yardOutMins == null || yardBackMins == null ? null
				: ((yardBackMins - yardOutMins) % 1440 + 1440) % 1440,
		};
	}

	/* ── The stop rows, in and out ───────────────────────────────────────── */

	const stopPlace = (row) => ({
		name: row?.name || "",
		address: row?.address || "",
		lat: row?.lat ?? null,
		lng: row?.lng ?? null,
		mapboxId: row?.mapboxId || null,
	});

	/* Reads a leg out of the rows a trip was saved with. A trip written by the
	   old per-day editor has stops in between; only the ends are read, and the
	   rest do not come back, because the six fields are the route now. */
	function legFromStops(rows) {
		const leg = blankLeg();
		const list = (rows || []).filter((r) => r && r.type !== "day");
		if (!list.length) return leg;
		const pickup = list.find((r) => r.type === "pickup") || null;
		const back = [...list].reverse().find((r) => r.type === "return") || null;
		const middle = list.filter((r) => r.type === "stop");
		const drop = middle.length ? middle[middle.length - 1] : null;

		if (pickup) {
			leg.pickup = stopPlace(pickup);
			leg.driveOut = parseDriveMins(pickup.drive);
			leg.milesOut = pickup.miles ? Number(pickup.miles) : null;
		}
		if (drop) {
			leg.drop = stopPlace(drop);
			leg.depart = String(drop.departPrev || "").slice(0, 5);
			leg.arrive = String(drop.arrive || "").slice(0, 5);
		}
		// A leg the old editor left with several stops keeps the first one's
		// departure, which is where that editor put the group's leaving time.
		if (middle.length > 1) leg.depart = String(middle[0].departPrev || leg.depart).slice(0, 5);
		if (back) {
			leg.driveBack = parseDriveMins(back.drive);
			leg.milesBack = back.miles ? Number(back.miles) : null;
			if (!leg.arrive) leg.arrive = String(back.departPrev || "").slice(0, 5);
		}
		return leg;
	}

	/* The rows trip-db writes. Three of them, in the order and with the fields
	   the scheduler uses, so a trip saved here opens there unchanged. */
	function stopsFromLeg(leg, startDate, endDate) {
		if (!hasPlace(leg.pickup) && !hasPlace(leg.drop) && !leg.depart && !leg.arrive) return [];
		const yard = getYard();
		const times = busTimes(leg);
		const from = startDate || "";
		const to = endDate || startDate || "";
		// A time earlier in the clock than the one after it belongs to the day
		// before; a yard return earlier than the group's arrival, to the day after.
		const earlier = (a, b, day) => {
			const am = parseClockMins(a);
			const bm = parseClockMins(b);
			return a && b && am != null && bm != null && am > bm ? addIsoDays(day, -1) : day;
		};
		const spotDate = times.spot ? earlier(times.spot, leg.depart, from) : "";
		const yardOutDate = times.yardOut ? earlier(times.yardOut, times.spot, spotDate || from) : "";
		const yardBackLate = times.yardBack && leg.arrive
			&& parseClockMins(times.yardBack) < parseClockMins(leg.arrive);

		return [
			{
				type: "pickup",
				label: null,
				name: leg.pickup.name || "",
				address: leg.pickup.address || "",
				miles: leg.milesOut != null ? String(leg.milesOut) : "",
				drive: formatDriveValue(leg.driveOut),
				lat: leg.pickup.lat, lng: leg.pickup.lng, mapboxId: leg.pickup.mapboxId,
				milesSource: "estimated", driveSource: "estimated", routeStatus: "current",
				departPrev: times.yardOut, departPrevDate: times.yardOut ? yardOutDate : "",
				arrive: "", arriveDate: "",
				spot: times.spot, spotDate: times.spot ? spotDate : "",
				dwellStatus: "on",
			},
			{
				type: "stop",
				label: null,
				name: leg.drop.name || leg.pickup.name || "",
				address: leg.drop.address || leg.pickup.address || "",
				miles: "", drive: "",
				lat: leg.drop.lat, lng: leg.drop.lng, mapboxId: leg.drop.mapboxId,
				milesSource: "estimated", driveSource: "estimated", routeStatus: "current",
				departPrev: leg.depart, departPrevDate: leg.depart ? from : "",
				arrive: leg.arrive, arriveDate: leg.arrive ? to : "",
				spot: "", spotDate: "",
				dwellStatus: "on",
			},
			{
				type: "return",
				label: null,
				name: yard.name,
				address: yard.address,
				miles: leg.milesBack != null ? String(leg.milesBack) : "",
				drive: formatDriveValue(leg.driveBack),
				lat: yard.lat ?? null, lng: yard.lng ?? null, mapboxId: null,
				milesSource: "estimated", driveSource: "estimated", routeStatus: "current",
				departPrev: leg.arrive, departPrevDate: leg.arrive ? to : "",
				arrive: times.yardBack,
				arriveDate: times.yardBack ? (yardBackLate ? addIsoDays(to, 1) : to) : "",
				spot: "", spotDate: "",
				dwellStatus: "on",
			},
		];
	}

	function addIsoDays(iso, days) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return iso || "";
		const d = new Date(`${iso}T00:00:00`);
		d.setDate(d.getDate() + days);
		return d.toISOString().slice(0, 10);
	}

	/* ── The tab ─────────────────────────────────────────────────────────── */

	function initItinerary(root) {
		const summaryEl = root.querySelector("#tp-itin-summary");
		const stopsEl = root.querySelector("#tp-itin-stops");
		if (!summaryEl || !stopsEl) return;
		/* The times go in the card's body, never the card: its footer holds
		   Calculate and Confirm, and replacing the card would take both
		   buttons out of the page while their handlers stayed on the orphans. */
		const timesEl = summaryEl.querySelector(".rux-card__body") || summaryEl;
		// Fill-in first, worked-out second. The markup has the summary card
		// above, from when it was a summary rather than the answer.
		summaryEl.parentNode?.insertBefore(stopsEl, summaryEl);

		const recalcBtn = root.querySelector("#tp-itin-recalc");
		const confirmBtn = root.querySelector("#tp-itin-confirm");
		const legToggleEl = root.querySelector("#tp-itin-leg-toggle");
		const legCardEl = root.querySelector("#tp-itin-leg-card");

		const legs = { outbound: blankLeg(), return: blankLeg() };
		let activeLeg = "outbound";
		let confirmed = false;
		let addressSessionToken = uuid();

		const current = () => legs[activeLeg] || legs.outbound;

		/* The leg's dates, off the trip form. Asked per leg rather than for
		   whichever is on screen, because trip-db collects both legs' stops in
		   one pass and only one of them is ever the active one. */
		const legDates = (leg) => {
			const id = (name) => root.querySelector(`#${name}`)?.value || "";
			return leg === "return"
				? { from: id("tp-return-start"), to: id("tp-return-end") || id("tp-return-start") }
				: { from: id("tp-start"), to: id("tp-end") || id("tp-start") };
		};

		/* ── Mapbox ──────────────────────────────────────────────────────── */

		let locationsDbPromise = null;
		function getLocationsDb() {
			if (!locationsDbPromise) {
				locationsDbPromise = import("../data/locations-db.js").catch((err) => {
					locationsDbPromise = null;
					throw err;
				});
			}
			return locationsDbPromise;
		}

		async function savedSuggestions(query) {
			try {
				const found = await (await getLocationsDb()).searchLocations(query, 5);
				return found.map((location) => ({
					source: "saved",
					location,
					label: location.name,
					sublabel: location.address,
				}));
			} catch (err) {
				console.warn("Saved location search failed:", err);
				return [];
			}
		}

		async function fetchSuggestions(query) {
			const saved = await savedSuggestions(query);
			const token = getMapboxToken();
			if (!token || query.length < 3) return saved;
			const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
			url.searchParams.set("q", query);
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
				const already = new Set(saved.map((s) => String(s.sublabel || "").toLowerCase()));
				const mapbox = (data.suggestions || [])
					.map((item) => ({
						source: "mapbox",
						mapbox_id: item.mapbox_id,
						label: item.name || item.full_address || "",
						sublabel: item.full_address || item.place_formatted || "",
					}))
					.filter((item) => !already.has(String(item.sublabel).toLowerCase()));
				return [...saved, ...mapbox];
			} catch (err) {
				console.warn("Address suggestions failed:", err);
				return saved;
			}
		}

		// A suggestion carries no coordinates; retrieve is what turns one into
		// a place the drive can be measured from.
		async function retrievePlace(item) {
			if (item.source === "saved") {
				const l = item.location || {};
				return { name: l.name || "", address: l.address || "", lat: l.lat ?? null, lng: l.lng ?? null, mapboxId: null };
			}
			const token = getMapboxToken();
			if (!token || !item.mapbox_id) return null;
			const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(item.mapbox_id)}`);
			url.searchParams.set("session_token", addressSessionToken);
			url.searchParams.set("access_token", token);
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox retrieve failed: ${response.status}`);
				const data = await response.json();
				const feature = data.features?.[0];
				const [lng, lat] = feature?.geometry?.coordinates || [];
				addressSessionToken = uuid();
				return {
					name: feature?.properties?.name || item.label || "",
					address: feature?.properties?.full_address || item.sublabel || "",
					lat: lat ?? null, lng: lng ?? null,
					mapboxId: item.mapbox_id || null,
				};
			} catch (err) {
				console.warn("Address retrieve failed:", err);
				return null;
			}
		}

		async function yardPoint() {
			const yard = getYard();
			if (yard.lat != null && yard.lng != null) return { lat: yard.lat, lng: yard.lng };
			const found = await fetchSuggestions(yard.address);
			const first = found.find((f) => f.source === "mapbox") || found[0];
			if (!first) return null;
			const place = await retrievePlace(first);
			return place && place.lat != null ? { lat: place.lat, lng: place.lng } : null;
		}

		// Minutes and miles between two points, or null when Mapbox will not say.
		async function driveBetween(a, b) {
			const token = getMapboxToken();
			if (!token || !a || !b || a.lat == null || b.lat == null) return null;
			const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
			const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
			url.searchParams.set("overview", "false");
			url.searchParams.set("access_token", token);
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Mapbox directions failed: ${response.status}`);
				const data = await response.json();
				const route = data.routes?.[0];
				if (!route) return null;
				return {
					mins: Math.round((route.duration || 0) / 60),
					miles: Math.round((route.distance || 0) / 160.934) / 10,
				};
			} catch (err) {
				console.warn("Drive lookup failed:", err);
				return null;
			}
		}

		let routing = 0;
		async function measure() {
			const leg = current();
			const seq = ++routing;
			const yard = await yardPoint();
			if (seq !== routing) return;
			if (hasPlace(leg.pickup) && leg.pickup.lat != null && yard) {
				const out = await driveBetween(yard, leg.pickup);
				if (seq !== routing) return;
				if (out) { leg.driveOut = out.mins; leg.milesOut = out.miles; }
			}
			const home = hasPlace(leg.drop) && leg.drop.lat != null ? leg.drop : leg.pickup;
			if (hasPlace(home) && home.lat != null && yard) {
				const back = await driveBetween(home, yard);
				if (seq !== routing) return;
				if (back) { leg.driveBack = back.mins; leg.milesBack = back.miles; }
			}
			if (seq === routing) renderTimes();
		}

		/* ── Render ──────────────────────────────────────────────────────── */

		function field(id, label, value, placeholder) {
			return `
				<div class="rux-field">
					<label class="rux-field__label" for="${id}">${escHtml(label)}</label>
					<input class="rux-input" type="text" id="${id}" value="${escHtml(value)}"
					       placeholder="${escHtml(placeholder || "")}" autocomplete="off">
				</div>`;
		}

		function timeField(id, label, value) {
			return `
				<div class="rux-field">
					<label class="rux-field__label" for="${id}">${escHtml(label)}</label>
					<input class="rux-input" type="time" id="${id}" value="${escHtml(value)}">
				</div>`;
		}

		function renderFields() {
			const leg = current();
			stopsEl.innerHTML = `
				<div class="sched-trip-itinerary__route">
					${field("tp-itin-pickup-name", "Pickup location", leg.pickup.name, "Who or where it is")}
					${field("tp-itin-pickup-address", "Pickup address", leg.pickup.address, "Search an address")}
					${field("tp-itin-drop-name", "Drop-off location", leg.drop.name, "Same as pickup for a round trip")}
					${field("tp-itin-drop-address", "Drop-off address", leg.drop.address, "Search an address")}
					${timeField("tp-itin-depart", "Group departs", leg.depart)}
					${timeField("tp-itin-arrive", "Group arrives", leg.arrive)}
				</div>`;
			attachSuggestions();
		}

		function renderTimes() {
			const leg = current();
			const t = busTimes(leg);
			const driveOut = leg.driveOut == null ? "waiting on the drive from the yard"
				: `${formatDriveMins(leg.driveOut)} from the yard`;
			const driveBack = leg.driveBack == null ? "waiting on the drive back"
				: `${formatDriveMins(leg.driveBack)} back to the yard`;
			const rows = [
				["Yard depart", t.yardOut, driveOut],
				["Bus arrives", t.spot, `${PADDING_MINS} min before the group leaves`],
				["Group departs", leg.depart, leg.pickup.name || ""],
				["Group arrives", leg.arrive, leg.drop.name || leg.pickup.name || ""],
				["Yard return", t.yardBack, driveBack],
			];
			// The bus's whole day. Not the old duty engine, which went with the
			// per-day editor: one span, against the 15-hour limit.
			const over = t.dutyMins != null && t.dutyMins > 15 * 60;
			const duty = t.dutyMins == null ? ""
				: `<p class="sched-trip-itinerary__duty${over ? " is-over" : ""}">
					Bus out ${formatDriveMins(t.dutyMins)}${over ? " — over the 15-hour limit" : ""}
				   </p>`;
			timesEl.innerHTML = `
				<dl class="sched-trip-itinerary__times">
					${rows.map(([label, time, why]) => `
						<dt>${escHtml(label)}</dt>
						<dd><span class="sched-trip-itinerary__time">${escHtml(clockLabel(time))}</span>
						    ${why ? `<span class="sched-trip-itinerary__why">${escHtml(why)}</span>` : ""}</dd>
					`).join("")}
				</dl>${duty}`;
		}

		function render() {
			renderFields();
			renderTimes();
		}

		function attachSuggestions() {
			if (!window.RuxSuggestions?.attach) return;
			for (const [id, which] of [["tp-itin-pickup-address", "pickup"], ["tp-itin-drop-address", "drop"]]) {
				const input = stopsEl.querySelector(`#${id}`);
				if (!input) continue;
				window.RuxSuggestions.attach(input, {
					minChars: 2,
					debounceMs: 250,
					fetch: fetchSuggestions,
					onSelect: async (item) => {
						const place = await retrievePlace(item);
						if (!place) return;
						const leg = current();
						leg[which] = place;
						input.value = place.address;
						const nameEl = stopsEl.querySelector(`#tp-itin-${which}-name`);
						if (nameEl && !nameEl.value) { nameEl.value = place.name; leg[which].name = place.name; }
						// A drop-off nobody has touched follows the pickup.
						if (which === "pickup" && !hasPlace(leg.drop)) {
							leg.drop = { ...place };
							const dropAddress = stopsEl.querySelector("#tp-itin-drop-address");
							const dropName = stopsEl.querySelector("#tp-itin-drop-name");
							if (dropAddress) dropAddress.value = place.address;
							if (dropName) dropName.value = place.name;
						}
						renderTimes();
						measure();
					},
				});
			}
		}

		// Typing goes straight onto the leg; the times follow every keystroke.
		stopsEl.addEventListener("input", (event) => {
			const leg = current();
			const id = event.target?.id;
			if (id === "tp-itin-pickup-name") leg.pickup.name = event.target.value;
			else if (id === "tp-itin-pickup-address") leg.pickup.address = event.target.value;
			else if (id === "tp-itin-drop-name") leg.drop.name = event.target.value;
			else if (id === "tp-itin-drop-address") leg.drop.address = event.target.value;
			else if (id === "tp-itin-depart") leg.depart = event.target.value;
			else if (id === "tp-itin-arrive") leg.arrive = event.target.value;
			else return;
			renderTimes();
		});

		recalcBtn?.addEventListener("click", () => measure());

		function syncConfirmBtn() {
			if (!confirmBtn) return;
			confirmBtn.setAttribute("aria-pressed", String(!!confirmed));
			confirmBtn.classList.toggle("is-confirmed", !!confirmed);
		}
		confirmBtn?.addEventListener("click", () => {
			confirmed = !confirmed;
			syncConfirmBtn();
		});

		function setLegToggleValue(leg) {
			if (!legToggleEl) return;
			for (const btn of legToggleEl.querySelectorAll("[data-value]")) {
				btn.setAttribute("aria-pressed", String(btn.dataset.value === leg));
			}
		}

		function switchLeg(leg) {
			activeLeg = leg === "return" ? "return" : "outbound";
			setLegToggleValue(activeLeg);
			render();
		}

		render();
		syncConfirmBtn();

		const api = {
			getStops: (leg = activeLeg) => {
				const which = leg === "return" ? "return" : "outbound";
				const dates = legDates(which);
				return stopsFromLeg(legs[which], dates.from, dates.to);
			},
			setStops: (rows, leg = activeLeg) => {
				const which = leg === "return" ? "return" : "outbound";
				legs[which] = legFromStops(rows);
				if (which === activeLeg) render();
			},
			clearStops: () => {
				legs.outbound = blankLeg();
				legs.return = blankLeg();
				activeLeg = "outbound";
				setLegToggleValue("outbound");
				render();
			},
			setActiveLeg: (leg) => switchLeg(leg),
			getActiveLeg: () => activeLeg,
			resetActiveLeg: () => switchLeg("outbound"),
			// Trip-level, not per-leg: set on load and read at save time.
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
		// Published onto window.Itinerary as well as returned, because
		// trip-panel.js only ever holds `root`, not this instance.
		Object.assign(window.Itinerary, api);
		return api;
	}

	window.Itinerary = { init: initItinerary };
})();
