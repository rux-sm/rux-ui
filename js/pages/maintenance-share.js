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

function changeTimestamp(value) {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function changeLine(row) {
	const label = row.destination || row.tripRef || "Trip";
	if (row.action === "created") return `Added — ${label}`;
	if (row.action === "deleted") return `Removed — ${label}`;
	if (row.action === "assignment_changed") {
		const bus = (row.changes || []).find((change) => change.field === "bus");
		if (bus?.before && bus?.after) return `Moved — ${label}: ${bus.before} → ${bus.after}`;
		if (bus?.after) return `Assigned — ${label}: ${bus.after}`;
		if (bus?.before) return `Unassigned — ${label}: removed from ${bus.before}`;
	}
	return `Updated — ${label}`;
}

function renderChanges(rows) {
	const section = el("section", "maintenance-changes");
	section.append(el("h2", "maintenance-changes__title", "Recent Changes"));
	if (!rows.length) {
		section.append(el("p", "maintenance-changes__empty", "No recent changes."));
		return section;
	}
	rows.forEach((row) => {
		section.append(el("p", "maintenance-changes__line", `${changeTimestamp(row.createdAt)} — ${changeLine(row)}`));
	});
	return section;
}

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
				trip, bus: String(assignment.busNumber), busSortOrder: assignment.busSortOrder,
				leg: assignment.leg,
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

function timeLine(times, showDepart, showArrive) {
	const line = el("small", "maintenance-trip__times");
	if (showDepart) {
		const depart = el("span", "maintenance-trip__time maintenance-trip__time--depart");
		depart.append(
			document.createTextNode("D "),
			el("span", "maintenance-trip__time-value", time(times.depart)),
		);
		line.append(depart);
	}
	if (showArrive) {
		const arrive = el("span", "maintenance-trip__time maintenance-trip__time--arrive");
		arrive.append(
			document.createTextNode("A "),
			el("span", "maintenance-trip__time-value", time(times.arrive)),
		);
		line.append(arrive);
	}
	return line;
}

function tripBar(item, start, end) {
	const visibleStart = item.start < start ? start : item.start;
	const visibleEnd = item.end > end ? end : item.end;
	const bar = el("article", "maintenance-trip");
	bar.style.gridColumn = `${offset(visibleStart, start) + 1} / span ${Math.max(1, offset(visibleEnd, visibleStart) + 1)}`;
	bar.style.gridRow = String(item.lane + 1);
	if (item.trip.tripBarColor) bar.dataset.tripBarColor = item.trip.tripBarColor;
	const tripType = String(item.trip.tripType || "")
		.trim()
		.toLowerCase()
		.replaceAll("-", "_");
	if (["one_way", "oneway"].includes(tripType)) {
		bar.classList.add("maintenance-trip--one-way");
	}
	if (["dropoff_pickup", "split"].includes(tripType)) {
		bar.classList.add("maintenance-trip--split");
	}
	if (item.trip.confirmed === false) bar.classList.add("maintenance-trip--unconfirmed");
	const clippedStart = item.start < start;
	const clippedEnd = item.end > end;
	if (clippedStart) bar.classList.add("is-clipped-start");
	if (clippedEnd) bar.classList.add("is-clipped-end");
	const times = operationalTimes(item.trip, item.leg);
	bar.title = `${item.trip.destination || "Trip"} · ${item.trip.customer || ""} · Yard Depart ${time(times.depart)} · Yard Arrive ${time(times.arrive)}`;
	bar.append(
		el("strong", "", item.trip.destination || "Trip"),
	);
	const showDepart = !clippedStart;
	const showArrive = !clippedEnd;
	if (showDepart || showArrive) bar.append(timeLine(times, showDepart, showArrive));
	return bar;
}

function render(data, changes = []) {
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
	const todayOffset = offset(new Date(), start);
	if (todayOffset >= 0 && todayOffset < 14) {
		schedule.classList.add("has-today");
		schedule.style.setProperty(
			"--maintenance-today-position",
			`${((todayOffset + 0.5) / 14) * 100}%`,
		);
	}
	const days = el("div", "maintenance-schedule__days");
	days.append(el("span", "", "Bus #"));
	for (let i = 0; i < 14; i += 1) {
		const d = addDays(start, i);
		const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
		const month = d.toLocaleDateString("en-US", { month: "short" });
		const cell = el("span", "", `${weekday} ${month} ${d.getDate()}`);
		if (d.toDateString() === new Date().toDateString()) cell.classList.add("is-today");
		days.append(cell);
	}
	schedule.append(days);
	const busOrder = (bus) => {
		const value = rows.get(bus)?.find((item) => item.busSortOrder != null)?.busSortOrder;
		const number = Number(value);
		return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
	};
	const buses = [...rows.keys()].sort((a, b) =>
		busOrder(a) - busOrder(b) || a.localeCompare(b, undefined, { numeric: true }),
	);
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
	root.append(renderChanges(changes));
}

async function load() {
	if (!token) return status("link_off", "Invalid Maintenance Link", "Ask dispatch for the current link.");
	const previousScroller = root.querySelector(".maintenance-schedule__scroll");
	const scrollPosition = previousScroller
		? { left: previousScroller.scrollLeft, top: previousScroller.scrollTop }
		: null;
	const [{ data, error }, changesResult] = await Promise.all([
		supabase.rpc("get_maintenance_schedule", { p_token: token }),
		supabase.rpc("get_maintenance_schedule_changes", { p_token: token }),
	]);
	if (error || !data) {
		console.error(error);
		return status("link_off", "Schedule Unavailable", "This link is inactive or has not been configured.");
	}
	if (changesResult.error) console.warn("Maintenance schedule changes could not be loaded:", changesResult.error);
	render(data, changesResult.data?.changes || []);
	if (scrollPosition) {
		const nextScroller = root.querySelector(".maintenance-schedule__scroll");
		if (nextScroller) {
			nextScroller.scrollLeft = scrollPosition.left;
			nextScroller.scrollTop = scrollPosition.top;
		}
	}
}

let reloadTimer = null;
let loadInProgress = false;
let loadQueued = false;

async function reload() {
	if (loadInProgress) {
		loadQueued = true;
		return;
	}
	loadInProgress = true;
	try {
		await load();
	} finally {
		loadInProgress = false;
		if (loadQueued) {
			loadQueued = false;
			reload();
		}
	}
}

function scheduleReload() {
	clearTimeout(reloadTimer);
	reloadTimer = window.setTimeout(reload, 300);
}

const scheduleChannel = supabase
	.channel("maintenance-schedule")
	.on("postgres_changes", { event: "*", schema: "public", table: "trips" }, scheduleReload)
	.on("postgres_changes", { event: "*", schema: "public", table: "trip_assignments" }, scheduleReload)
	.on("postgres_changes", { event: "*", schema: "public", table: "trip_stops" }, scheduleReload)
	.on("postgres_changes", { event: "*", schema: "public", table: "buses" }, scheduleReload)
	.subscribe((channelStatus) => {
		if (["CHANNEL_ERROR", "TIMED_OUT"].includes(channelStatus)) {
			console.warn(`Maintenance schedule realtime: ${channelStatus}`);
		}
	});

window.addEventListener("focus", scheduleReload);
window.setInterval(scheduleReload, 30000);
window.addEventListener("pagehide", () => {
	clearTimeout(reloadTimer);
	supabase.removeChannel(scheduleChannel);
}, { once: true });

reload();
