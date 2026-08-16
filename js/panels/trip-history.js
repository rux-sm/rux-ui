import {
	fetchTripHistory,
	HISTORY_PAGE_SIZE,
} from "../data/trip-history-db.js";

const pane = document.getElementById("rp-pane-history");
const root = document.getElementById("rp-trip-history");
const list = document.getElementById("rp-history-list");
const status = document.getElementById("rp-history-status");
const loadMoreButton = document.getElementById("rp-history-load-more");
const filterButton = document.getElementById("rp-history-trip-filter");
const title = root?.querySelector(".rux-trip-history__title");

let records = [];
let selectedTrip = null;
let loading = false;
let hasMore = false;
let loadedOnce = false;
let statusOverride = null;
const expandedCards = new Set();

function element(tag, className, text) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

function localDate(isoDate) {
	if (!isoDate) return null;
	const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatTripDate(record) {
	const start = localDate(record.trip_start_date);
	const end = localDate(record.trip_end_date);
	if (!start) return null;
	const formatter = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	if (!end || start.getTime() === end.getTime()) return formatter.format(start);
	const sameYear = start.getFullYear() === end.getFullYear();
	const startFormatter = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" }),
	});
	return `${startFormatter.format(start)}–${formatter.format(end)}`;
}

function formatTimestamp(value) {
	const date = new Date(value);
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function groupLabel(value) {
	const date = new Date(value);
	const today = new Date();
	const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const delta = Math.round((todayDay - day) / 86400000);
	if (delta === 0) return "Today";
	if (delta === 1) return "Yesterday";
	return new Intl.DateTimeFormat(undefined, {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(day);
}

function actionLabel(action) {
	return String(action || "updated").replaceAll("_", " ");
}

function displayValue(value, emptyLabel = "None") {
	if (value === null || value === undefined || value === "") return emptyLabel;
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function renderChange(change) {
	const row = element("div", "rux-trip-history__change");
	const label = element("dt", "", change.label || change.field || "Change");
	const value = element("dd");
	const before = change.before;
	const after = change.after;

	if (before === null || before === undefined || before === "") {
		value.appendChild(element("span", "rux-trip-history__new", displayValue(after, "Added")));
	} else if (after === null || after === undefined || after === "") {
		value.append(
			element("span", "rux-trip-history__old", displayValue(before)),
			element("span", "rux-trip-history__arrow", "→"),
			element("span", "rux-trip-history__new", "Removed"),
		);
	} else {
		value.append(
			element("span", "rux-trip-history__old", displayValue(before)),
			element("span", "rux-trip-history__arrow", "→"),
			element("span", "rux-trip-history__new", displayValue(after)),
		);
	}

	row.append(label, value);
	return row;
}

function renderCard(record) {
	const card = element("article", "rux-trip-history__card");
	const header = element("header", "rux-trip-history__card-header");
	const identity = element("div");
	identity.append(
		element("div", "rux-trip-history__timestamp", formatTimestamp(record.created_at)),
		element("div", "rux-trip-history__actor", record.actor_name || "Dispatcher"),
	);
	const action = element("span", "rux-trip-history__action", actionLabel(record.action));
	action.dataset.action = record.action || "updated";
	header.append(identity, action);

	const context = element("div", "rux-trip-history__context");
	const route = [record.customer_name, record.destination].filter(Boolean).join(" · ") || "Trip";
	const tripDate = formatTripDate(record);
	const meta = [tripDate, record.trip_ref || (record.trip_id ? `Trip ${String(record.trip_id).slice(0, 8)}` : null)]
		.filter(Boolean)
		.join(" · ");
	context.append(
		element("div", "rux-trip-history__route", route),
		element("div", "rux-trip-history__meta", meta),
	);

	const changes = Array.isArray(record.changes) ? record.changes : [];
	const changeList = element("dl", "rux-trip-history__changes");
	const expanded = expandedCards.has(String(record.id));
	const visible = expanded ? changes : changes.slice(0, 3);
	visible.forEach((change) => changeList.appendChild(renderChange(change)));

	card.append(header, context, changeList);

	if (changes.length > 3) {
		const more = element(
			"button",
			"rux-button rux-button--default rux-button--compact rux-trip-history__more",
			expanded ? "Show less" : `Show ${changes.length - 3} more`,
		);
		more.type = "button";
		more.addEventListener("click", () => {
			const key = String(record.id);
			expanded ? expandedCards.delete(key) : expandedCards.add(key);
			render();
		});
		card.appendChild(more);
	}

	return card;
}

function renderFilter() {
	if (!filterButton || !title) return;
	title.textContent = selectedTrip ? "Selected trip history" : "All trip history";
	filterButton.hidden = !selectedTrip;
	filterButton.replaceChildren();
	if (!selectedTrip) return;
	const label = [
		selectedTrip.trip_ref,
		selectedTrip.destination,
	].filter(Boolean).join(" · ") || `Trip ${String(selectedTrip.id).slice(0, 8)}`;
	filterButton.append(
		element("span", "rux-button__label", label),
		element("span", "rux-icon", "close"),
	);
}

function render() {
	if (!list || !status || !loadMoreButton) return;
	renderFilter();
	list.replaceChildren();
	status.hidden = records.length > 0;

	if (!records.length) {
		if (!loading) {
			status.textContent = statusOverride || (selectedTrip
				? "No history has been recorded for this trip."
				: "No trip history has been recorded yet.");
		}
		loadMoreButton.hidden = true;
		return;
	}

	let currentGroup = null;
	let group = null;
	records.forEach((record) => {
		const label = groupLabel(record.created_at);
		if (label !== currentGroup) {
			currentGroup = label;
			group = element("section", "rux-card rux-trip-history__group");
			const sentinel = element("div", "rux-card__sentinel");
			sentinel.setAttribute("aria-hidden", "true");
			const header = element("div", "rux-card__header");
			header.appendChild(element("h4", "rux-trip-history__group-title", label));
			group.append(sentinel, header);
			list.appendChild(group);
		}
		group.appendChild(renderCard(record));
	});
	loadMoreButton.hidden = !hasMore;
}

function historyUnavailableMessage(error) {
	const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
	if (/get_trip_history|schema cache|function/i.test(detail)) {
		return "Run supabase/trip-history-patch.sql to enable global trip history.";
	}
	return "History could not be loaded. Check the connection and try again.";
}

async function load({ append = false, quiet = false } = {}) {
	if (loading || !root) return;
	loading = true;
	if (!quiet) {
		statusOverride = append ? "Loading more history…" : "Loading history…";
		status.hidden = false;
		status.textContent = statusOverride;
	}
	loadMoreButton.disabled = true;

	try {
		const last = append ? records.at(-1) : null;
		const next = await fetchTripHistory({
			limit: HISTORY_PAGE_SIZE,
			beforeCreatedAt: last?.created_at || null,
			beforeId: last?.id || null,
			tripId: selectedTrip?.id || null,
		});
		records = append ? records.concat(next) : next;
		hasMore = next.length === HISTORY_PAGE_SIZE;
		loadedOnce = true;
		statusOverride = null;
	} catch (error) {
		console.warn("Trip history load failed:", error);
		statusOverride = historyUnavailableMessage(error);
		if (!quiet) {
			status.hidden = false;
			status.textContent = statusOverride;
		}
	} finally {
		loading = false;
		loadMoreButton.disabled = false;
		render();
	}
}

function setSelectedTrip(trip) {
	const nextId = trip?.id ? String(trip.id) : null;
	if (nextId === String(selectedTrip?.id || "")) return;
	selectedTrip = nextId ? {
		id: trip.id,
		trip_ref: trip.trip_ref || trip.tripRef || null,
		destination: trip.destination || null,
	} : null;
	records = [];
	hasMore = false;
	statusOverride = null;
	expandedCards.clear();
	renderFilter();
	if (!pane?.hidden) load();
}

filterButton?.addEventListener("click", () => setSelectedTrip(null));
loadMoreButton?.addEventListener("click", () => load({ append: true }));

document
	.querySelector('[data-rux-tabs][data-scope="right-panel"] [aria-controls="rp-pane-history"]')
	?.addEventListener("click", () => load({ quiet: loadedOnce }));

window.addEventListener("rux:trip-selection-changed", (event) => {
	setSelectedTrip(event.detail?.trip || null);
});

window.addEventListener("rux:trip-history-refresh", () => {
	if (!pane?.hidden) load({ quiet: true });
});

window.setInterval(() => {
	if (!pane?.hidden) load({ quiet: true });
}, 30000);

window.TripHistory = {
	activate: () => load({ quiet: loadedOnce }),
	refresh: () => load({ quiet: true }),
	setSelectedTrip,
};

renderFilter();
