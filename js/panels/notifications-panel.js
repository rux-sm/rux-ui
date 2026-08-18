import {
	fetchNotifications,
	markRead,
	markAllRead,
	dismiss,
	subscribeToNotifications,
} from "../data/notification-db.js?v=6";
import { getCurrentProfile } from "../core/profile.js";

const btn = document.getElementById("notifications-menu-btn");
const menu = document.getElementById("notifications-menu");
const badge = document.getElementById("notifications-badge");
const list = menu?.querySelector("[data-notifications-list]");

if (btn && menu && list) {
	let notifications = [];
	const disclosure = window.RuxPopover.createDisclosure(btn, menu, {
		placement: "bottom-end",
		onOpen: openNotifications,
	});

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

	function notificationTimeLabel(row) {
		if (row.type === "driver_license_expiry" || row.type === "driver_medical_expiry") {
			return "Standing alert · active until resolved";
		}
		return timeAgo(row.created_at);
	}

	function updateBadge() {
		const unreadCount = notifications.filter((row) => !row.read).length;
		const hasUnread = unreadCount > 0;
		badge.hidden = !hasUnread;
		badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
		btn.classList.toggle("has-unread", hasUnread);
		btn.setAttribute(
			"aria-label",
			hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications",
		);
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
						<p class="rux-notifications__item-time">${notificationTimeLabel(row)}</p>
					</div>
					<button type="button" class="rux-button rux-button--default rux-button--icon" data-dismiss aria-label="Dismiss">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</div>
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
					updateBadge();
					markRead(row.id, profileId).catch((err) => console.warn("Could not mark notification read:", err));
				}
			});
			list.appendChild(li);
		});
	}

	async function refresh() {
		const profileId = getCurrentProfile()?.id;
		if (!profileId) return false;
		try {
			notifications = await fetchNotifications(profileId);
		} catch (err) {
			console.warn("Could not load notifications:", err);
			return false;
		}
		renderRows();
		return true;
	}

	async function openNotifications() {
		if (!await refresh()) return;
		const profileId = getCurrentProfile()?.id;
		const unreadIds = notifications.filter((row) => !row.read).map((row) => row.id);
		if (!profileId || !unreadIds.length) return;

		// Opening the inbox counts as seeing the visible notifications. Update
		// immediately so the badge responds without waiting for the round trip;
		// refresh from persisted state if the write fails.
		notifications.forEach((row) => {
			if (unreadIds.includes(row.id)) row.read = true;
		});
		renderRows();
		try {
			await markAllRead(unreadIds, profileId);
		} catch (err) {
			console.warn("Could not mark notifications read:", err);
			await refresh();
		}
	}

	window.addEventListener("rux:profile-changed", refresh);
	subscribeToNotifications(refresh);
	refresh();

	window.NotificationsPanel = { refresh, open: disclosure.open, close: disclosure.close };
}
