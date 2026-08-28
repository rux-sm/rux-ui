/* ==========================================================================
   DRIVER SHEET  ·  window.DriverSheet
   --------------------------------------------------------------------------
   The printable itinerary a driver carries. Replaces the third prompt in the
   old chain (docs/gem-itinerary-prompt-3.md), which asked a model to write an
   HTML file by hand — its own note said it "deliberately does not use the
   app's design system… If it ever moves into the app, it gets rebuilt on
   --rux-* tokens." This is that.

   Pure presentation. Everything it prints has already been worked out by the
   Grid tab — day offsets, per-leg mileage, tight legs, the yard plan, duty by
   day — and arrives as one payload. Nothing is computed here, because a
   second implementation of the same arithmetic is a second answer waiting to
   disagree with the screen.

   It follows the print mechanism print-schedule.js established: build a
   .sched-print-root into the live document, print, remove on afterprint.
   That class is what @media print in print-schedule.css exempts from the
   blanket hide, and it already carries the light-on-paper --print-* palette
   that a dark UI theme must not leak into.
   ========================================================================== */

(function () {
	"use strict";

	// Letter, and margins on the sheet rather than in @page. The print driver
	// does not reliably honour an @page margin — trip-envelope.css records
	// measuring that directly — so the box model, which it cannot ignore, is
	// what actually controls spacing.
	const PAGE_SIZE = "Letter";
	const PAGE_MARGIN = "0.4in";

	const dayFormat = new Intl.DateTimeFormat(undefined, {
		weekday: "long", month: "long", day: "numeric",
	});
	const headerDateFormat = new Intl.DateTimeFormat(undefined, {
		weekday: "short", year: "numeric", month: "short", day: "numeric",
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

	function formatDate(iso, formatter) {
		const date = parseIsoDate(iso);
		// An ISO date is a calendar day, not an instant. Reading it back in
		// local time lands on the day before for anyone west of UTC.
		return date
			? formatter.format(new Date(date.getTime() + date.getTimezoneOffset() * 60000))
			: "";
	}

	function addDays(iso, offset) {
		const date = parseIsoDate(iso);
		if (!date) return null;
		date.setUTCDate(date.getUTCDate() + offset);
		return date.toISOString().slice(0, 10);
	}

	/* 12-hour, because this is read at 4am in a cab by someone who has not had
	   coffee. The screen keeps 24-hour inputs; paper does not have to match. */
	function clock12(hhmm) {
		const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
		if (!match) return "";
		const hours = Number(match[1]);
		const minutes = match[2];
		const suffix = hours < 12 ? "AM" : "PM";
		const shown = hours % 12 === 0 ? 12 : hours % 12;
		return `${shown}:${minutes} ${suffix}`;
	}

	function span(mins) {
		if (!Number.isFinite(mins) || mins <= 0) return "";
		const hours = Math.floor(mins / 60);
		const minutes = mins % 60;
		if (!hours) return `${minutes} min`;
		return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
	}

	const TYPE_TITLE = {
		yard_origin: "Yard",
		pickup: "Pickup",
		stop: "Stop",
		sleeper: "Rest",
		return: "Return to yard",
	};

	/* One stop's time cell.

	   The yard and the pickup print different labels from the rest, because
	   what a driver needs from those two rows is not "arrive" and "depart" —
	   it is when to report, when the wheels roll, and when the bus has to be
	   staged with the doors open. */
	function timeCell(stop, plan) {
		const lines = [];
		if (stop.type === "yard_origin") {
			if (plan?.report) lines.push(["Report", plan.report]);
			lines.push(["Roll", plan?.roll || stop.depart]);
		} else if (stop.type === "pickup") {
			if (stop.arrive || plan?.spot) lines.push(["Spot", stop.arrive || plan.spot]);
			if (stop.depart) lines.push(["Dep", stop.depart]);
		} else if (stop.type === "sleeper") {
			if (stop.arrive) lines.push(["Rest", stop.arrive]);
			if (stop.depart) lines.push(["Up", stop.depart]);
		} else {
			if (stop.arrive) lines.push(["Arr", stop.arrive]);
			if (stop.depart) lines.push(["Dep", stop.depart]);
		}
		return lines
			.filter(([, time]) => time)
			.map(([label, time]) =>
				`<span class="sched-driver-sheet__time"><span class="sched-driver-sheet__time-label">${escHtml(label)}</span>${escHtml(clock12(time))}</span>`)
			.join("");
	}

	function legLine(stop, previous) {
		const miles = Number.parseFloat(stop.miles);
		const parts = [];
		if (Number.isFinite(miles) && miles > 0) parts.push(`${miles.toFixed(1)} mi`);
		const drive = /^(\d+):([0-5]\d)$/.exec(String(stop.drive ?? "").trim());
		if (drive) {
			const mins = Number(drive[1]) * 60 + Number(drive[2]);
			if (mins > 0) parts.push(span(mins));
		}
		if (!parts.length) return "";
		/* Two different caveats, and the stronger one wins.

		   Town-level is the bigger caveat: the leg was measured to a place in
		   the town rather than to this stop, because the address is missing.
		   Unverified is the softer one: there IS an address, it just came from
		   the model's general knowledge rather than the source. */
		// "to" when this stop is the approximate end, "from" when the leg
		// merely starts at one. The leg into George West is approximate
		// because it LEAVES the Falfurrias town point, and reading "measured
		// to Falfurrias" on a row headed George West is a double-take.
		const caveat = stop.approxFrom
			? ` · approx, measured to ${stop.approxFrom}`
			: previous?.approxFrom
				? ` · approx, measured from ${previous.approxFrom}`
				: stop.addressConfidence && stop.addressConfidence !== "exact"
					? " · est. from unverified address"
					: "";
		const approxTown = stop.approxFrom || previous?.approxFrom;
		return `<span class="sched-driver-sheet__leg">${approxTown ? "≈ " : ""}${escHtml(parts.join(" · "))}${escHtml(caveat)}</span>`;
	}

	function buildRows(payload) {
		const { stops, days, risks, plan, startDate } = payload;
		const rows = [];
		let shownDay = -1;

		stops.forEach((stop, index) => {
			const previous = stops[index - 1];
			if (days[index].arriveDay !== shownDay) {
				shownDay = days[index].arriveDay;
				const iso = addDays(startDate, shownDay);
				const label = iso ? formatDate(iso, dayFormat) : "";
				rows.push(`<tr class="sched-driver-sheet__dayrow"><td colspan="4">Day ${shownDay + 1}${label ? ` — ${escHtml(label)}` : ""}</td></tr>`);
			}

			const risk = risks[index];
			const address = stop.address
				? escHtml(stop.address)
					+ (stop.approxFrom
						? ' <span class="sched-driver-sheet__unverified">street address needed</span>'
						: stop.addressConfidence && stop.addressConfidence !== "exact"
							? ' <span class="sched-driver-sheet__unverified">unverified</span>'
							: "")
				: "";

			rows.push(`<tr>
				<td class="sched-driver-sheet__time-cell">${timeCell(stop, plan)}</td>
				<td class="sched-driver-sheet__loc">
					${escHtml(stop.name || TYPE_TITLE[stop.type] || "")}
					${index > 0 ? legLine(stop, previous) : ""}
					${risk ? `<span class="sched-driver-sheet__alert"><strong>TIGHT:</strong> ${escHtml(span(risk.needed))} of driving in a ${escHtml(span(risk.gap))} gap. <strong>Leave by ${escHtml(clock12(risk.leaveBy))}</strong></span>` : ""}
				</td>
				<td class="sched-driver-sheet__addr">${address}</td>
				<td class="sched-driver-sheet__act">${escHtml(stop.activity || "")}</td>
			</tr>`);
		});
		return rows.join("");
	}

	function buildFooter(payload) {
		const { totals, duty, startDate } = payload;
		const lines = [];
		const anyApprox = (payload.stops || []).some((stop) => stop.approxFrom);
		if (totals.miles > 0) {
			lines.push(`Total distance: <strong>${anyApprox ? "≈ " : ""}${totals.miles.toFixed(1)} mi</strong>`);
		}
		if (totals.drive > 0) lines.push(`Total driving: <strong>${escHtml(span(totals.drive))}</strong>`);

		// One line per day, never a trip-wide total. Hours of service is a
		// daily limit, so a single figure across four days cannot be compared
		// to anything a driver is actually held to.
		const dutyLines = (duty || [])
			.filter((day) => day.duty > 0)
			.map((day) => {
				const iso = addDays(startDate, day.day);
				const label = duty.length > 1
					? `Day ${day.day + 1}${iso ? ` (${escHtml(formatDate(iso, headerDateFormat))})` : ""}`
					: "On duty";
				return `<div>${label}: <strong>${escHtml(span(day.duty))}</strong></div>`;
			});

		return `<div class="sched-driver-sheet__totals">
			${lines.map((line) => `<div>${line}</div>`).join("")}
			${dutyLines.length ? `<div class="sched-driver-sheet__duty">${dutyLines.join("")}</div>` : ""}
		</div>`;
	}

	function buildNotes(payload) {
		const flags = (payload.dataFlags || []).filter(Boolean);
		const substitutions = payload.stops
			.filter((stop) => stop.matchedAddress)
			.map((stop) => `${stop.name || stop.address}: routed to ${stop.matchedAddress}`);
		const approximate = payload.stops
			.filter((stop) => stop.approxFrom)
			.map((stop) => `${stop.name || stop.address}: no street address — mileage measured to ${stop.approxFrom}, so it is good to about a mile. Get the address before quoting.`);
		const all = [...flags, ...substitutions, ...approximate];
		if (!all.length) return "";
		return `<div class="sched-driver-sheet__notes">
			<h2>Check before rolling</h2>
			<ul>${all.map((note) => `<li>${escHtml(note)}</li>`).join("")}</ul>
		</div>`;
	}

	function build(payload) {
		const { meta, startDate } = payload;
		const date = startDate ? formatDate(startDate, headerDateFormat) : "";
		const contact = [meta.contactName, meta.contactPhone].filter(Boolean).join(" · ");

		const root = document.createElement("div");
		root.className = "sched-print-root sched-driver-sheet";
		root.innerHTML = `
			<div class="sched-driver-sheet__page">
				<header class="sched-driver-sheet__header">
					<h1>Trip Itinerary</h1>
					<div class="sched-driver-sheet__meta">
						${date ? `<div><strong>${escHtml(date)}</strong></div>` : ""}
						${meta.client ? `<div>${escHtml(meta.client)}</div>` : ""}
						${meta.destination ? `<div>${escHtml(meta.destination)}</div>` : ""}
						${contact ? `<div>Contact: ${escHtml(contact)}</div>` : ""}
					</div>
				</header>
				<table class="sched-driver-sheet__table">
					<thead>
						<tr>
							<th class="sched-driver-sheet__time-cell">Time</th>
							<th class="sched-driver-sheet__loc">Location</th>
							<th class="sched-driver-sheet__addr">Address</th>
							<th class="sched-driver-sheet__act">Activity</th>
						</tr>
					</thead>
					<tbody>${buildRows(payload)}</tbody>
				</table>
				${buildFooter(payload)}
				${buildNotes(payload)}
			</div>`;
		return root;
	}

	// Shared with print-schedule.js on purpose: whichever feature printed last
	// owns the page box. Two elements would leave both @page rules live and
	// let the loser's paper size win at random.
	function pageStyleEl() {
		let el = document.getElementById("sched-print-page-style");
		if (!el) {
			el = document.createElement("style");
			el.id = "sched-print-page-style";
			document.head.appendChild(el);
		}
		return el;
	}

	function print(payload) {
		if (!payload?.stops?.length) return false;
		document.querySelector(".sched-driver-sheet")?.remove();
		pageStyleEl().textContent = `@page { size: ${PAGE_SIZE}; margin: ${PAGE_MARGIN}; }`;

		const root = build(payload);
		document.body.appendChild(root);
		requestAnimationFrame(() => {
			window.addEventListener("afterprint", () => root.remove(), { once: true });
			window.print();
		});
		return true;
	}

	// Exposed for the preview and for tests: the same tree, without printing.
	function render(payload) {
		return build(payload);
	}

	window.DriverSheet = { print, render, clock12, span };
})();
