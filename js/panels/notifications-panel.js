import {
	fetchNotifications,
	markRead,
	dismiss,
	subscribeToNotifications,
} from "../data/notification-db.js";
import { getCurrentProfile } from "../core/profile.js";

const btn = document.getElementById("notifications-menu-btn");
const menu = document.getElementById("notifications-menu");
const badge = document.getElementById("notifications-badge");
const list = menu?.querySelector("[data-notifications-list]");

if (btn && menu && list) {
	let notifications = [];

	function severityBadgeClass(severity) {
		if (severity === "critical") return "rux-badge--danger";
		if (severity === "warning") return "rux-badge--warning";
		return "rux-badge--info";
	}

	function timeAgo(iso) {
		const ms = Date.now() - new Date(iso).getTime();
		const minutes = Math.round(ms / 60000);
		if (minutes < 1) return "just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.round(hours / 24)}d ago`;
	}

	function tripLabel(trip) {
		return [trip.trip_ref, trip.customer, trip.destination].filter(Boolean).join(" — ") || "Trip";
	}

	function isTripReady(trip) {
		const hasContact = !!(trip.contact_not_needed
			|| trip.booking_contact_name?.trim()
			|| trip.trip_contact_1_name?.trim());
		// A PO only matters as proof payment is coming — moot once the
		// balance is already paid.
		const poOk = !!(trip.po_received || trip.balance_paid);
		return !!(poOk && trip.confirmed && hasContact);
	}

	// The summary row's dedupe_key ("trip_departure_summary:{date}") already
	// carries the exact date it was generated for — reading it back out
	// avoids recomputing "tomorrow" (which would silently drift if the panel
	// is opened after midnight relative to when the row was created).
	function renderChecklist(row, container) {
		const date = row.dedupe_key.split(":")[1];
		const trips = (window.RuxTrips?.list() || []).filter((t) => t.start_date === date);
		if (!trips.length) {
			container.innerHTML = `<p class="rux-notifications__checklist-empty">No trips found for this date.</p>`;
			return;
		}
		container.innerHTML = trips
			.map((trip) => {
				const ready = isTripReady(trip);
				return `
					<div class="rux-notifications__checklist-row">
						<span>${tripLabel(trip)}</span>
						<span class="rux-badge ${ready ? "rux-badge--success" : "rux-badge--warning"}">${ready ? "Ready" : "Pending"}</span>
					</div>
				`;
			})
			.join("");
	}

	// Tied to "not dismissed" rather than "unread" — fetchNotifications
	// already excludes dismissed rows, so any row still in the list means
	// there's something outstanding to clear, whether or not it's been
	// opened/read yet.
	function updateBadge() {
		badge.hidden = notifications.length === 0;
	}

	function renderRows() {
		list.innerHTML = "";
		updateBadge();
		if (!notifications.length) {
			list.innerHTML = `<li class="rux-notifications__empty">No notifications</li>`;
			return;
		}
		notifications.forEach((row) => {
			const li = document.createElement("li");
			li.className = `rux-notifications__item${row.read ? "" : " is-unread"}`;
			li.innerHTML = `
				<div class="rux-notifications__item-main">
					<span class="rux-badge rux-badge--dot ${severityBadgeClass(row.severity)}"></span>
					<div class="rux-notifications__item-body">
						<p class="rux-notifications__item-title">${row.title}</p>
						${row.body ? `<p class="rux-notifications__item-detail">${row.body}</p>` : ""}
						<p class="rux-notifications__item-time">${timeAgo(row.created_at)}</p>
					</div>
					<button type="button" class="rux-button rux-button--default rux-button--icon" data-dismiss aria-label="Dismiss">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</div>
				${row.type === "trip_departure_summary" ? `<div class="rux-notifications__checklist" data-checklist hidden></div>` : ""}
			`;
			li.addEventListener("click", async (event) => {
				const profileId = getCurrentProfile()?.id;
				if (event.target.closest("[data-dismiss]")) {
					event.stopPropagation();
					if (!profileId) return;
					await dismiss(row.id, profileId);
					notifications = notifications.filter((n) => n.id !== row.id);
					renderRows();
					return;
				}
				if (!row.read && profileId) {
					row.read = true;
					li.classList.remove("is-unread");
					markRead(row.id, profileId).catch((err) => console.warn("Could not mark notification read:", err));
				}
				if (row.type === "trip_departure_summary") {
					const checklist = li.querySelector("[data-checklist]");
					const wasOpen = !checklist.hidden;
					checklist.hidden = wasOpen;
					if (!wasOpen) renderChecklist(row, checklist);
				}
			});
			list.appendChild(li);
		});
	}

	async function refresh() {
		const profileId = getCurrentProfile()?.id;
		if (!profileId) return;
		try {
			notifications = await fetchNotifications(profileId);
		} catch (err) {
			console.warn("Could not load notifications:", err);
			return;
		}
		renderRows();
	}

	btn.addEventListener("click", () => {
		const isOpen = menu.hidden === false;
		if (isOpen) {
			window.RuxMenu?.close(menu);
		} else {
			window.RuxMenu?.open(btn, menu, { placement: "bottom-end" });
			refresh();
		}
	});

	window.addEventListener("rux:profile-changed", refresh);
	subscribeToNotifications(refresh);
	refresh();

	window.NotificationsPanel = { refresh };
}
