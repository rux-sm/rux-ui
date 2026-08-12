import {
	fetchMessages,
	sendMessage,
	deleteMessage,
	toggleReaction,
	fetchLastRead,
	markChatRead,
	subscribeToTeamChat,
} from "../data/team-chat-db.js";
import { supabase } from "../data/supabase.js";
import { getCurrentProfile } from "../core/profile.js";
import { profileAvatarEl } from "../core/avatar.js";

// Curated, not the full Unicode set — hand-picked so there's no external
// picker dependency (no CDN, nothing to verify without a live browser).
const EMOJI_CATEGORIES = [
	{ label: "Smileys", emoji: ["😀", "😂", "😅", "😊", "😍", "😘", "🤔", "😐", "😴", "😢", "😭", "😡", "🤯", "🥳", "😎", "🙄", "😬", "🤗", "🤢", "😱"] },
	{ label: "Gestures", emoji: ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "👌", "🤙", "✋"] },
	{ label: "Hearts", emoji: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕"] },
	{ label: "Nature", emoji: ["🐶", "🐱", "🐻", "🦁", "🐸", "🦄", "🌞", "🌧️", "🔥", "⭐", "🌈"] },
	{ label: "Food", emoji: ["🍕", "🍔", "🌮", "🍩", "☕", "🍺", "🎂"] },
	{ label: "Other", emoji: ["🎉", "🎈", "🚀", "💯", "✅", "❌", "⚠️", "💤", "🔔", "📌", "💡", "⏰", "🚌", "👀"] },
];

// A message that's only emoji (optionally with whitespace between them) reads
// as a reaction-in-message-form — render it larger, same "jumbomoji" idea as
// Slack/Discord. Capped at 6 glyphs so a long run of emoji doesn't turn into
// a wall of giant characters.
const EMOJI_ONLY_RE = /^[\p{Extended_Pictographic}\u200D\uFE0F\s]+$/u;
function isEmojiOnlyMessage(text) {
	const trimmed = String(text || "").trim();
	if (!trimmed || !EMOJI_ONLY_RE.test(trimmed)) return false;
	const count = trimmed.match(/\p{Extended_Pictographic}/gu)?.length || 0;
	return count > 0 && count <= 6;
}

const btn = document.getElementById("team-chat-btn");
const badge = document.getElementById("team-chat-badge");

if (btn && badge) {
	let panelEl = null;
	let emojiMenuEl = null;
	// { type: "react", messageId } when opened from a message's add-reaction
	// button, or { type: "compose" } when opened from the input's own emoji
	// button — same shared picker, different action on pick.
	let emojiMenuMode = null;
	let messages = [];
	let lastReadAt = null;
	let previousFocus = null;
	let typingChannel = null;
	let typingTimeout = null;

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
		panelEl.id = "team-chat-window";
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
			<p class="rux-team-chat__typing" data-team-chat-typing hidden></p>
			<footer class="rux-floating-window__footer rux-team-chat__footer rux-card__footer">
				<form class="rux-team-chat__form" data-team-chat-form>
					<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-team-chat-compose-emoji aria-label="Insert emoji">
						<span class="rux-icon" aria-hidden="true">mood</span>
					</button>
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
			clearTimeout(typingTimeout);
			trackTyping(false);
			try {
				await sendMessage(body, profile);
			} catch (err) {
				console.warn("Could not send message:", err);
			}
		});

		panelEl.querySelector("[data-team-chat-input]").addEventListener("input", () => {
			trackTyping(true);
			clearTimeout(typingTimeout);
			typingTimeout = setTimeout(() => trackTyping(false), 3000);
		});

		panelEl.querySelector("[data-team-chat-compose-emoji]").addEventListener("click", (event) => {
			emojiMenuMode = { type: "compose" };
			window.RuxMenu?.open(event.currentTarget, ensureEmojiMenu(), { placement: "top-start" });
		});

		panelEl.querySelector("[data-team-chat-messages]").addEventListener("click", async (event) => {
			const deleteBtn = event.target.closest("[data-delete-message]");
			if (deleteBtn) {
				if (!window.confirm("Delete this message?")) return;
				try {
					await deleteMessage(deleteBtn.dataset.deleteMessage);
				} catch (err) {
					console.warn("Could not delete message:", err);
				}
				return;
			}
			const openBtn = event.target.closest("[data-open-emoji-menu]");
			if (openBtn) {
				emojiMenuMode = { type: "react", messageId: openBtn.dataset.openEmojiMenu };
				window.RuxMenu?.open(openBtn, ensureEmojiMenu(), { placement: "top" });
				return;
			}
			const reactBtn = event.target.closest("[data-react-emoji]");
			if (reactBtn) {
				await applyReaction(reactBtn.dataset.messageId, reactBtn.dataset.reactEmoji);
			}
		});

		window.RuxFloatingWindow.attachDrag(panelEl, panelEl.querySelector(".rux-floating-window__header"));

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && isPanelOpen()) close();
		});

		return panelEl;
	}

	// Singleton popover, same idiom as #notifications-menu/#profile-menu —
	// one shared instance reused for both "react to this message" (opened
	// from a message's add-reaction button) and "insert into the message
	// I'm composing" (opened from the input's own emoji button), switching
	// behavior on emojiMenuMode rather than building two separate pickers.
	// role="menuitem" on each emoji gets Escape/outside-click dismissal and
	// arrow-key navigation for free from js/core/menu.js, and clicking a
	// menuitem auto-closes the menu the same way any other RuxMenu item
	// does — no manual close() call needed.
	function ensureEmojiMenu() {
		if (emojiMenuEl) return emojiMenuEl;
		emojiMenuEl = document.createElement("div");
		emojiMenuEl.className = "rux-menu rux-popover rux-team-chat__emoji-menu";
		emojiMenuEl.id = "team-chat-emoji-menu";
		emojiMenuEl.role = "menu";
		emojiMenuEl.hidden = true;
		emojiMenuEl.innerHTML = EMOJI_CATEGORIES
			.map(
				(category) => `
					<div class="rux-menu__header">${category.label}</div>
					<div class="rux-team-chat__emoji-grid">
						${category.emoji
							.map(
								(emoji) => `<button type="button" class="rux-team-chat__emoji-option" role="menuitem" data-react-emoji="${emoji}">${emoji}</button>`,
							)
							.join("")}
					</div>
				`,
			)
			.join("");
		document.body.appendChild(emojiMenuEl);

		emojiMenuEl.addEventListener("click", (event) => {
			const emojiBtn = event.target.closest("[data-react-emoji]");
			if (!emojiBtn || !emojiMenuMode) return;
			const emoji = emojiBtn.dataset.reactEmoji;
			if (emojiMenuMode.type === "react") {
				applyReaction(emojiMenuMode.messageId, emoji);
			} else if (emojiMenuMode.type === "compose") {
				insertEmojiIntoInput(emoji);
			}
		});

		return emojiMenuEl;
	}

	// Inserts at the cursor rather than just appending, so picking an emoji
	// mid-sentence doesn't jump it to the end of whatever's already typed.
	function insertEmojiIntoInput(emoji) {
		const input = panelEl?.querySelector("[data-team-chat-input]");
		if (!input) return;
		const start = input.selectionStart ?? input.value.length;
		const end = input.selectionEnd ?? input.value.length;
		input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
		const cursor = start + emoji.length;
		input.setSelectionRange(cursor, cursor);
		input.focus();
		trackTyping(true);
		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => trackTyping(false), 3000);
	}

	async function applyReaction(messageId, emoji) {
		const profile = getCurrentProfile();
		if (!profile) return;
		const message = messages.find((m) => String(m.id) === String(messageId));
		const alreadyReacted = (message?.team_message_reactions || []).some(
			(r) => String(r.profile_id) === String(profile.id) && r.emoji === emoji,
		);
		try {
			await toggleReaction(messageId, profile.id, emoji, alreadyReacted);
		} catch (err) {
			console.warn("Could not toggle reaction:", err);
		}
	}

	function close() {
		if (!isPanelOpen()) return;
		panelEl.hidden = true;
		btn.setAttribute("aria-expanded", "false");
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
		const myProfileId = String(getCurrentProfile()?.id || "");
		container.innerHTML = messages
			.map((message) => {
				const avatar = profileAvatarEl({
					photo_path: message.sender_photo_path,
					avatar_color: message.sender_avatar_color,
					display_name: message.sender_name,
				});
				// Own-message-only, enforced client-side — profiles here aren't
				// real logged-in accounts (no auth.uid() for RLS to check
				// against), so this is the same honor-system trust level the
				// rest of the app already runs on, not a security boundary.
				const canDelete = myProfileId && String(message.profile_id) === myProfileId;

				// Group this message's reactions by emoji into count pills,
				// e.g. two 👍 + one 🎉 becomes ["👍", ["a","b"]], ["🎉", ["c"]].
				const groups = new Map();
				(message.team_message_reactions || []).forEach((r) => {
					if (!groups.has(r.emoji)) groups.set(r.emoji, []);
					groups.get(r.emoji).push(String(r.profile_id));
				});
				const pillsHtml = [...groups.entries()]
					.map(([emoji, profileIds]) => {
						const mine = myProfileId && profileIds.includes(myProfileId);
						return `<button type="button" class="rux-team-chat__reaction-pill${mine ? " is-active" : ""}" data-react-emoji="${emoji}" data-message-id="${message.id}"><span class="rux-team-chat__reaction-emoji">${emoji}</span> ${profileIds.length}</button>`;
					})
					.join("");
				return `
					<div class="rux-team-chat__message">
						${avatar.outerHTML}
						<div class="rux-team-chat__message-body">
							<div class="rux-team-chat__message-meta">
								<span class="rux-team-chat__message-name">${escapeHtml(message.sender_name)}</span>
								<span class="rux-team-chat__message-time">${timeLabel(message.created_at)}</span>
							</div>
							<p class="rux-team-chat__message-text${isEmojiOnlyMessage(message.body) ? " rux-team-chat__message-text--jumbo" : ""}">${escapeHtml(message.body)}</p>
							${pillsHtml ? `<div class="rux-team-chat__reactions">${pillsHtml}</div>` : ""}
						</div>
						<div class="rux-team-chat__message-actions">
							<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-open-emoji-menu="${message.id}" aria-label="Add reaction">
								<span class="rux-icon" aria-hidden="true">add_reaction</span>
							</button>
							${canDelete ? `
								<button type="button" class="rux-button rux-button--ghost rux-button--icon rux-team-chat__message-delete" data-delete-message="${message.id}" aria-label="Delete message">
									<span class="rux-icon" aria-hidden="true">delete</span>
								</button>
							` : ""}
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
			btn.classList.remove("has-unread");
			btn.setAttribute("aria-label", "Team chat");
			return;
		}
		// Skip my own messages — otherwise closing the window in the instant
		// before my own send's realtime confirmation round-trips back would
		// light the badge for something I just wrote myself (last_read_at is
		// only bumped on open/markChatRead, not on every send).
		const myProfileId = String(getCurrentProfile()?.id || "");
		const unread = messages.filter(
			(m) => String(m.profile_id) !== myProfileId && (!lastReadAt || m.created_at > lastReadAt),
		);
		const hasUnread = unread.length > 0;
		badge.hidden = !hasUnread;
		badge.textContent = unread.length > 99 ? "99+" : String(unread.length);
		btn.classList.toggle("has-unread", hasUnread);
		btn.setAttribute(
			"aria-label",
			hasUnread ? `Team chat, ${unread.length} unread` : "Team chat",
		);
	}

	// Own channel, separate from the header's "rux-presence" — reusing that
	// one would mean every typing flicker also re-renders the unrelated
	// "who's active" avatar bar. Same recipe as joinPresenceChannel/
	// renderActiveProfiles in index.html, just scoped to chat and keyed on
	// a `typing` flag instead of always-present identity.
	function leaveTypingChannel() {
		if (!typingChannel) return;
		supabase.removeChannel(typingChannel);
		typingChannel = null;
	}

	function joinTypingChannel(profile) {
		leaveTypingChannel();
		typingChannel = supabase.channel("team-chat-typing", {
			config: { presence: { key: String(profile.id) } },
		});
		typingChannel
			.on("presence", { event: "sync" }, renderTyping)
			.subscribe(async (status) => {
				if (status !== "SUBSCRIBED") return;
				await typingChannel.track({ display_name: profile.display_name, typing: false });
			});
	}

	function renderTyping() {
		const el = panelEl?.querySelector("[data-team-chat-typing]");
		if (!el) return;
		const state = typingChannel?.presenceState() || {};
		const myId = String(getCurrentProfile()?.id || "");
		const names = Object.entries(state)
			.filter(([id, entries]) => id !== myId && entries[0]?.typing)
			.map(([, entries]) => entries[0].display_name);
		if (!names.length) {
			el.hidden = true;
			return;
		}
		let text;
		if (names.length === 1) text = `${names[0]} is typing…`;
		else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing…`;
		else text = `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length - 2 === 1 ? "" : "s"} are typing…`;
		el.textContent = text;
		el.hidden = false;
	}

	function trackTyping(isTyping) {
		if (!typingChannel) return;
		const profile = getCurrentProfile();
		if (!profile) return;
		typingChannel.track({ display_name: profile.display_name, typing: isTyping });
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
		btn.setAttribute("aria-expanded", "true");
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
		if (!profile) {
			leaveTypingChannel();
			return;
		}
		joinTypingChannel(profile);
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
			joinTypingChannel(profile);
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
