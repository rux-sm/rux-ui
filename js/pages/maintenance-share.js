import { supabase } from "../data/supabase.js";

const root = document.getElementById("maintenance-share-root");
const token = new URLSearchParams(location.search).get("s")?.trim().toLowerCase();
const el = (tag, cls = "", text = "") => {
	const node = document.createElement(tag);
	if (cls) node.className = cls;
	node.textContent = text;
	return node;
};
const date = (value) => {
	const [y, m, d] = String(value || "").slice(0, 10).split("-").map(Number);
	return y ? new Date(y, m - 1, d) : null;
};
const addDays = (value, count) => {
	const next = new Date(value);
	next.setDate(next.getDate() + count);
	return next;
};
const offset = (value, start) => Math.round(
	(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
		- Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000,
);
const time = (value) => {
	const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
	if (!match) return "—";
	let hour = Number(match[1]);
	const suffix = hour < 12 ? "am" : "pm";
	hour = hour % 12 || 12;
	return `${hour}:${match[2]} ${suffix}`;
};
const range = (start, end) => `${start.toLocaleDateString("en-US", {
	month: "short", day: "numeric",
})} – ${end.toLocaleDateString("en-US", {
	month: "short", day: "numeric", year: "numeric",
})}`;

function status(icon, title, message) {
	root.replaceChildren();
	const section = el("section", "maintenance-share__status");
	section.append(el("span", "rux-icon", icon), el("h1", "", title), el("p", "", message));
	root.append(section);
}

function entriesFor(trips) {
	return trips.flatMap((trip) => {
		const assigned = (trip.assignments || []).filter((item) => item.busNumber);
		return assigned.map((assignment) => {
			const isReturn = assignment.leg === "return";
			return {
				trip, bus: String(assignment.busNumber), leg: assignment.leg,
				start: date(isReturn ? trip.returnStartDate : trip.startDate) || date(trip.startDate),
				end: date(isReturn ? trip.returnEndDate : trip.endDate)
					|| date(trip.returnEndDate) || date(trip.endDate) || date(trip.startDate),
			};
		});
	}).filter((item) => item.start && item.end);
}

function withLanes(items) {
	const ends = [];
	return items.slice().sort((a, b) => a.start - b.start).map((item) => {
		let lane = ends.findIndex((end) => end < item.start);
		if (lane < 0) lane = ends.length;
		ends[lane] = item.end;
		return { ...item, lane };
	});
}

function operationalTimes(trip, leg) {
	const allStops = Array.isArray(trip.stops) ? trip.stops : [];
	const legStops = allStops
		.filter((stop) => (stop.leg || "outbound") === (leg || "outbound"))
		.sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
	const pickup = legStops.find((stop) => stop.type === "pickup");
	const returnStop = [...legStops].reverse().find((stop) => stop.type === "return");
	return {
		depart: pickup?.departPrev || trip.departureTime,
		arrive: returnStop?.arrive || trip.returnTime,
	};
}

function tripBar(item, start, end) {
	const visibleStart = item.start < start ? start : item.start;
	const visibleEnd = item.end > end ? end : item.end;
	const bar = el("article", "maintenance-trip");
	bar.style.gridColumn = `${offset(visibleStart, start) + 1} / span ${Math.max(1, offset(visibleEnd, visibleStart) + 1)}`;
	bar.style.gridRow = String(item.lane + 1);
	if (item.trip.tripBarColor) bar.dataset.tripBarColor = item.trip.tripBarColor;
	if (item.start < start) bar.classList.add("is-clipped-start");
	if (item.end > end) bar.classList.add("is-clipped-end");
	const times = operationalTimes(item.trip, item.leg);
	bar.title = `${item.trip.destination || "Trip"} · ${item.trip.customer || ""} · Yard Depart ${time(times.depart)} · Yard Arrive ${time(times.arrive)}`;
	bar.append(
		el("strong", "", item.trip.destination || "Trip"),
		el("span", "", item.trip.customer || "—"),
		el(
			"small",
			"",
			`${item.leg === "return" ? "Return · " : ""}Yard Depart ${time(times.depart)} · Yard Arrive ${time(times.arrive)}`,
		),
	);
	return bar;
}

function render(data) {
	const start = date(data.rangeStart);
	const end = date(data.rangeEnd);
	const entries = entriesFor(data.trips || []);
	const rows = new Map();
	for (const item of entries) {
		if (!rows.has(item.bus)) rows.set(item.bus, []);
		rows.get(item.bus).push(item);
	}
	root.replaceChildren();
	if (!entries.length) return status("event_available", "No Trips Scheduled", "No main-calendar trips fall within these two weeks.");

	const scroll = el("div", "maintenance-schedule__scroll");
	const schedule = el("section", "maintenance-schedule");
	const weeks = el("div", "maintenance-schedule__weeks");
	weeks.append(el("span", "", "Bus"), el("span", "", `Current Week · ${range(start, addDays(start, 6))}`), el("span", "", `Next Week · ${range(addDays(start, 7), end)}`));
	schedule.append(weeks);
	const days = el("div", "maintenance-schedule__days");
	days.append(el("span"));
	for (let i = 0; i < 14; i += 1) {
		const d = addDays(start, i);
		const cell = el("span", "", `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()}`);
		if (d.toDateString() === new Date().toDateString()) cell.classList.add("is-today");
		days.append(cell);
	}
	schedule.append(days);
	const buses = [...rows.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	for (const bus of buses) {
		const items = withLanes(rows.get(bus));
		const row = el("div", "maintenance-schedule__row");
		row.style.setProperty("--lanes", Math.max(...items.map((item) => item.lane + 1)));
		const label = el("strong", "", bus);
		const track = el("div", "maintenance-schedule__track");
		items.forEach((item) => track.append(tripBar(item, start, end)));
		row.append(label, track);
		schedule.append(row);
	}
	scroll.append(schedule);
	root.append(scroll);
}

async function load() {
	if (!token) return status("link_off", "Invalid Maintenance Link", "Ask dispatch for the current link.");
	const { data, error } = await supabase.rpc("get_maintenance_schedule", { p_token: token });
	if (error || !data) {
		console.error(error);
		return status("link_off", "Schedule Unavailable", "This link is inactive or has not been configured.");
	}
	render(data);
}
load();
