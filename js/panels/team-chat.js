import {
	fetchMessages,
	sendMessage,
	fetchLastRead,
	markChatRead,
	subscribeToTeamChat,
} from "../data/team-chat-db.js";
import { getCurrentProfile } from "../core/profile.js";
import { profileAvatarEl } from "../core/avatar.js";

const btn = document.getElementById("team-chat-btn");
const badge = document.getElementById("team-chat-badge");

if (btn && badge) {
	let panelEl = null;
	let messages = [];
	let lastReadAt = null;
	let previousFocus = null;

	function isPanelOpen() {
		return !!panelEl && !panelEl.hidden;
	}

	// Same recipe as flip-seven.js's own chat — textContent round-trip is the
	// simplest reliable HTML-escape for free-text user input rendered via
	// innerHTML.
	function escapeHtml(value) {
		const node = document.createElement("span");
		node.textContent = value;
		return node.innerHTML;
	}

	function timeLabel(iso) {
		const date = new Date(iso);
		return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	}

	// Floating/draggable/resizable, same shell as the document viewer and
	// trip manifest (js/core/floating-window.js) — a plain position:fixed
	// panel, not a dimmed rux-modal-backdrop, so it can float over the
	// calendar while a dispatcher keeps working instead of blocking input.
	function ensurePanel() {
		if (panelEl) return panelEl;
		panelEl = document.createElement("div");
		panelEl.className =
			"rux-floating-window rux-team-chat-window rux-card rux-card--elevated";
		panelEl.hidden = true;
		panelEl.innerHTML = `
			<header class="rux-floating-window__header rux-team-chat__header rux-card__header">
				<p class="rux-card__title">Team Chat</p>
				<button type="button" class="rux-button rux-button--default rux-button--icon" data-team-chat-close aria-label="Close team chat">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			</header>
			<div class="rux-floating-window__body rux-team-chat__body rux-card__body">
				<div class="rux-team-chat__messages" data-team-chat-messages></div>
			</div>
			<footer class="rux-floating-window__footer rux-team-chat__footer rux-card__footer">
				<form class="rux-team-chat__form" data-team-chat-form>
					<input class="rux-input rux-team-chat__input" type="text" maxlength="2000" placeholder="Message the team…" aria-label="Message" data-team-chat-input autocomplete="off" />
					<button type="submit" class="rux-button rux-button--accent rux-button--icon" aria-label="Send">
						<span class="rux-icon" aria-hidden="true">send</span>
					</button>
				</form>
			</footer>`;
		document.body.appendChild(panelEl);

		panelEl.querySelector("[data-team-chat-close]").addEventListener("click", close);
		panelEl.querySelector("[data-team-chat-form]").addEventListener("submit", async (event) => {
			event.preventDefault();
			const profile = getCurrentProfile();
			if (!profile) return;
			const input = panelEl.querySelector("[data-team-chat-input]");
			const body = input.value;
			if (!body.trim()) return;
			input.value = "";
			try {
				await sendMessage(body, profile);
			} catch (err) {
				console.warn("Could not send message:", err);
			}
		});

		window.RuxFloatingWindow.attachDrag(panelEl, panelEl.querySelector(".rux-floating-window__header"));

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && isPanelOpen()) close();
		});

		return panelEl;
	}

	function close() {
		if (!isPanelOpen()) return;
		panelEl.hidden = true;
		// Drag/resize leave inline left/top/width/height on this singleton
		// panel — clear them so the next open() starts from the CSS defaults
		// again, same cleanup doc-viewer.js/trip-envelope.js do for the same
		// reason.
		window.RuxFloatingWindow.resetGeometry(panelEl);
		previousFocus?.focus?.({ preventScroll: true });
		previousFocus = null;
	}

	function renderMessages() {
		const container = ensurePanel().querySelector("[data-team-chat-messages]");
		const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
		if (!messages.length) {
			container.innerHTML = `<p class="rux-team-chat__empty">No messages yet</p>`;
			return;
		}
		container.innerHTML = messages
			.map((message) => {
				const avatar = profileAvatarEl({
					photo_path: message.sender_photo_path,
					avatar_color: message.sender_avatar_color,
					display_name: message.sender_name,
				});
				return `
					<div class="rux-team-chat__message">
						${avatar.outerHTML}
						<div class="rux-team-chat__message-body">
							<div class="rux-team-chat__message-meta">
								<span class="rux-team-chat__message-name">${escapeHtml(message.sender_name)}</span>
								<span class="rux-team-chat__message-time">${timeLabel(message.created_at)}</span>
							</div>
							<p class="rux-team-chat__message-text">${escapeHtml(message.body)}</p>
						</div>
					</div>
				`;
			})
			.join("");
		if (wasNearBottom || isPanelOpen()) container.scrollTop = container.scrollHeight;
	}

	function updateBadge() {
		if (isPanelOpen()) {
			badge.hidden = true;
			return;
		}
		const latest = messages[messages.length - 1];
		badge.hidden = !latest || (lastReadAt && latest.created_at <= lastReadAt);
	}

	async function refresh() {
		try {
			messages = await fetchMessages();
		} catch (err) {
			console.warn("Could not load team chat:", err);
			return;
		}
		renderMessages();
		updateBadge();
	}

	async function open() {
		const profile = getCurrentProfile();
		if (!profile) return;
		const panel = ensurePanel();
		previousFocus = document.activeElement;
		panel.hidden = false;
		renderMessages();
		updateBadge();
		panel.querySelector("[data-team-chat-input]")?.focus();
		lastReadAt = new Date().toISOString();
		markChatRead(profile.id).catch((err) => console.warn("Could not mark chat read:", err));
	}

	btn.addEventListener("click", () => {
		if (isPanelOpen()) close();
		else open();
	});

	window.addEventListener("rux:profile-changed", async () => {
		const profile = getCurrentProfile();
		if (!profile) return;
		try {
			lastReadAt = await fetchLastRead(profile.id);
		} catch (err) {
			console.warn("Could not load chat read state:", err);
		}
		refresh();
	});

	subscribeToTeamChat(refresh);

	(async () => {
		const profile = getCurrentProfile();
		if (profile) {
			try {
				lastReadAt = await fetchLastRead(profile.id);
			} catch (err) {
				console.warn("Could not load chat read state:", err);
			}
		}
		refresh();
	})();

	window.TeamChat = { refresh };
}
