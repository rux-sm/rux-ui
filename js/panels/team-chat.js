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
import { fetchProfiles } from "../data/profile-db.js";
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

const EMOJI_GRAPHEME_RE = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u;
const GRAPHEME_SEGMENTER = typeof Intl.Segmenter === "function"
	? new Intl.Segmenter(undefined, { granularity: "grapheme" })
	: null;
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;
const MENTION_TOKEN_SOURCE = String.raw`@\[([^\]]+)\]\(profile:([^\)]+)\)`;

const btn = document.getElementById("team-chat-btn");
const badge = document.getElementById("team-chat-badge");

if (btn && badge) {
	let panelEl = null;
	let disclosure = null;
	let emojiMenuEl = null;
	let mentionMenuEl = null;
	let mentionProfiles = [];
	let activeMentionQuery = null;
	let activeMentionIndex = 0;
	const selectedMentions = new Map();
	// { type: "react", messageId } when opened from a message's add-reaction
	// button, or { type: "compose" } when opened from the input's own emoji
	// button — same shared picker, different action on pick.
	let emojiMenuMode = null;
	let messages = [];
	let lastReadAt = null;
	let typingChannel = null;
	let typingTimeout = null;
	let isSending = false;

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

	// Keep message copy at the standard body size while giving every emoji
	// grapheme the shared 20px treatment. Segmenting by grapheme preserves
	// joined emoji and variation selectors as one visible glyph.
	function renderPlainMessageContent(value) {
		const text = String(value || "");
		const segments = GRAPHEME_SEGMENTER
			? [...GRAPHEME_SEGMENTER.segment(text)].map(({ segment }) => segment)
			: Array.from(text);
		return segments
			.map((segment) => EMOJI_GRAPHEME_RE.test(segment)
				? `<span class="sched-team-chat__message-emoji">${escapeHtml(segment)}</span>`
				: escapeHtml(segment))
			.join("");
	}

	function decodeMentionPart(value) {
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}

	// Mentions are stored inline with a stable profile ID while rendering as
	// ordinary @Name copy. This keeps existing team_messages rows compatible
	// and avoids treating a changeable display name as the recipient identity.
	function renderMessageContent(value, currentProfileId = "") {
		const text = String(value || "");
		const mentionPattern = new RegExp(MENTION_TOKEN_SOURCE, "g");
		let cursor = 0;
		let html = "";
		for (const match of text.matchAll(mentionPattern)) {
			html += renderPlainMessageContent(text.slice(cursor, match.index));
			const name = decodeMentionPart(match[1]);
			const profileId = decodeMentionPart(match[2]);
			const isCurrentUser = currentProfileId && String(profileId) === String(currentProfileId);
			html += `<span class="sched-team-chat__mention${isCurrentUser ? " sched-team-chat__mention--current-user" : ""}" data-mentioned-profile-id="${escapeHtml(profileId)}">@${renderPlainMessageContent(name)}</span>`;
			cursor = match.index + match[0].length;
		}
		return html + renderPlainMessageContent(text.slice(cursor));
	}

	function messageMentionsProfile(message, profileId) {
		if (!profileId) return false;
		const mentionPattern = new RegExp(MENTION_TOKEN_SOURCE, "g");
		return [...String(message?.body || "").matchAll(mentionPattern)]
			.some((match) => decodeMentionPart(match[2]) === String(profileId));
	}

	function encodeSelectedMentions(value) {
		let body = String(value || "");
		const profiles = [...selectedMentions.values()]
			.sort((a, b) => b.display_name.length - a.display_name.length);
		profiles.forEach((profile) => {
			const escapedName = profile.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const visibleMention = new RegExp(`@${escapedName}(?![\\p{L}\\p{N}_])`, "gu");
			const token = `@[${encodeURIComponent(profile.display_name)}](profile:${encodeURIComponent(profile.id)})`;
			body = body.replace(visibleMention, token);
		});
		return body;
	}

	function timeLabel(iso) {
		const date = new Date(iso);
		return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	}

	function continuesMessageGroup(message, previousMessage) {
		if (
			!previousMessage
			|| !message.profile_id
			|| !previousMessage.profile_id
			|| String(message.profile_id) !== String(previousMessage.profile_id)
		) {
			return false;
		}
		const elapsed = new Date(message.created_at).getTime()
			- new Date(previousMessage.created_at).getTime();
		return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= MESSAGE_GROUP_WINDOW_MS;
	}

	function syncComposerState() {
		if (!panelEl) return;
		const input = panelEl.querySelector("[data-team-chat-input]");
		const sendButton = panelEl.querySelector("[data-team-chat-send]");
		if (!input || !sendButton) return;
		sendButton.disabled = isSending || !input.value.trim();
		sendButton.setAttribute("aria-label", isSending ? "Sending" : "Send");
	}

	async function refreshMentionProfiles() {
		try {
			const currentProfileId = String(getCurrentProfile()?.id || "");
			mentionProfiles = (await fetchProfiles()).filter(
				(profile) => String(profile.id) !== currentProfileId,
			);
			const input = panelEl?.querySelector("[data-team-chat-input]");
			if (input && isPanelOpen()) updateMentionSuggestions(input);
		} catch (err) {
			console.warn("Could not load mention suggestions:", err);
			mentionProfiles = [];
		}
	}

	function ensureMentionMenu() {
		if (mentionMenuEl) return mentionMenuEl;
		mentionMenuEl = document.createElement("div");
		mentionMenuEl.id = "team-chat-mention-suggestions";
		mentionMenuEl.className = "rux-suggestions sched-team-chat__mention-menu";
		mentionMenuEl.setAttribute("role", "listbox");
		mentionMenuEl.setAttribute("aria-label", "Mention a teammate");
		mentionMenuEl.hidden = true;
		document.body.appendChild(mentionMenuEl);
		mentionMenuEl.addEventListener("pointerdown", (event) => event.preventDefault());
		mentionMenuEl.addEventListener("click", (event) => {
			const option = event.target.closest("[data-mention-profile-id]");
			if (!option) return;
			const profile = mentionProfiles.find(
				(candidate) => String(candidate.id) === option.dataset.mentionProfileId,
			);
			if (profile) selectMention(profile);
		});
		return mentionMenuEl;
	}

	function closeMentionMenu() {
		activeMentionQuery = null;
		activeMentionIndex = 0;
		if (mentionMenuEl) mentionMenuEl.hidden = true;
		const input = panelEl?.querySelector("[data-team-chat-input]");
		input?.setAttribute("aria-expanded", "false");
		input?.removeAttribute("aria-activedescendant");
	}

	function mentionQueryAtCursor(input) {
		const cursor = input.selectionStart ?? input.value.length;
		const prefix = input.value.slice(0, cursor);
		const at = prefix.lastIndexOf("@");
		if (at < 0 || (at > 0 && !/\s/.test(prefix[at - 1]))) return null;
		const query = prefix.slice(at + 1);
		if (query.length > 80 || !/^[\p{L}\p{N} .'-]*$/u.test(query)) return null;
		if (query.endsWith(" ") && selectedMentions.has(query.trim().toLocaleLowerCase())) return null;
		return { start: at, end: cursor, query };
	}

	function setActiveMentionOption(index) {
		if (!mentionMenuEl || mentionMenuEl.hidden) return;
		const options = [...mentionMenuEl.querySelectorAll("[data-mention-profile-id]")];
		if (!options.length) return;
		activeMentionIndex = (index + options.length) % options.length;
		options.forEach((option, optionIndex) => {
			const active = optionIndex === activeMentionIndex;
			option.classList.toggle("is-active", active);
			option.setAttribute("aria-selected", String(active));
		});
		const activeOption = options[activeMentionIndex];
		panelEl?.querySelector("[data-team-chat-input]")
			?.setAttribute("aria-activedescendant", activeOption.id);
	}

	function positionMentionMenu() {
		const input = panelEl?.querySelector("[data-team-chat-input]");
		if (!input || !mentionMenuEl || mentionMenuEl.hidden) return;
		window.RuxPopover?.position(input, mentionMenuEl, { placement: "top-start" });
	}

	function updateMentionSuggestions(input) {
		const query = mentionQueryAtCursor(input);
		if (!query) {
			closeMentionMenu();
			return;
		}
		const needle = query.query.trim().toLocaleLowerCase();
		const matches = mentionProfiles
			.filter((profile) => profile.display_name.toLocaleLowerCase().includes(needle))
			.slice(0, 6);
		if (!matches.length) {
			closeMentionMenu();
			return;
		}
		activeMentionQuery = query;
		const menu = ensureMentionMenu();
		menu.replaceChildren(...matches.map((profile, index) => {
			const option = document.createElement("button");
			option.type = "button";
			option.id = `team-chat-mention-option-${index}`;
			option.className = "rux-suggestions__item sched-team-chat__mention-option";
			option.dataset.mentionProfileId = profile.id;
			option.setAttribute("role", "option");
			option.append(
				profileAvatarEl(profile, "rux-avatar--sm"),
				Object.assign(document.createElement("span"), {
					className: "rux-suggestions__label",
					textContent: profile.display_name,
				}),
			);
			return option;
		}));
		menu.hidden = false;
		input.setAttribute("aria-expanded", "true");
		document.dispatchEvent(new CustomEvent("rux:popover-open", {
			detail: { popover: menu, trigger: input },
		}));
		positionMentionMenu();
		setActiveMentionOption(0);
	}

	function selectMention(profile) {
		const input = panelEl?.querySelector("[data-team-chat-input]");
		if (!input || !activeMentionQuery) return;
		const visibleMention = `@${profile.display_name}`;
		input.value = input.value.slice(0, activeMentionQuery.start)
			+ visibleMention
			+ " "
			+ input.value.slice(activeMentionQuery.end);
		const cursor = activeMentionQuery.start + visibleMention.length + 1;
		selectedMentions.set(profile.display_name.toLocaleLowerCase(), profile);
		closeMentionMenu();
		input.setSelectionRange(cursor, cursor);
		input.focus();
		syncComposerState();
	}

	function renderConnectionStatus(status) {
		const statusEl = panelEl?.querySelector("[data-team-chat-status]");
		if (!statusEl) return;
		const reconnecting = ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status);
		statusEl.hidden = !reconnecting;
		statusEl.textContent = reconnecting ? "Reconnecting…" : "";
	}

	// Interactive header popover. Unlike Profile and Notifications, chat is
	// not a menu: it contains a message log, reactions, and a composer, so it
	// uses a non-modal dialog role inside the shared tab-tip visual shell.
	function ensurePanel() {
		if (panelEl) return panelEl;
		panelEl = document.createElement("div");
		panelEl.id = "team-chat-popover";
		panelEl.className =
			"rux-popover rux-popover--surface rux-popover--tab-tip sched-team-chat-popover";
		panelEl.setAttribute("role", "dialog");
		panelEl.setAttribute("aria-modal", "false");
		panelEl.setAttribute("aria-label", "Team Chat");
		panelEl.hidden = true;
		panelEl.innerHTML = `
			<header class="sched-team-chat__header rux-card__header">
				<p class="rux-card__title">Team Chat</p>
			</header>
			<div class="sched-team-chat__body rux-card__body">
				<div class="sched-team-chat__messages" role="log" aria-label="Team Chat Messages" aria-live="polite" aria-relevant="additions text" aria-atomic="false" data-team-chat-messages>
					<p class="sched-team-chat__empty" role="status">Loading Messages…</p>
				</div>
			</div>
			<p class="sched-team-chat__status" role="status" data-team-chat-status hidden></p>
			<p class="sched-team-chat__typing" data-team-chat-typing hidden></p>
			<footer class="sched-team-chat__footer rux-card__footer">
				<form class="sched-team-chat__form" data-team-chat-form>
					<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-team-chat-compose-emoji aria-label="Insert emoji">
						<span class="rux-icon" aria-hidden="true">mood</span>
					</button>
					<input class="rux-input sched-team-chat__input" type="text" maxlength="2000" placeholder="Message the team…" aria-label="Message" aria-autocomplete="list" aria-controls="team-chat-mention-suggestions" aria-expanded="false" data-team-chat-input autocomplete="off" />
					<button type="submit" class="rux-button rux-button--accent rux-button--icon" aria-label="Send" data-team-chat-send disabled>
						<span class="rux-icon" aria-hidden="true">send</span>
					</button>
				</form>
			</footer>`;
		document.body.appendChild(panelEl);

		panelEl.querySelector("[data-team-chat-form]").addEventListener("submit", async (event) => {
			event.preventDefault();
			const profile = getCurrentProfile();
			if (!profile || isSending) return;
			const input = panelEl.querySelector("[data-team-chat-input]");
			const body = input.value;
			if (!body.trim()) return;
			isSending = true;
			syncComposerState();
			clearTimeout(typingTimeout);
			trackTyping(false);
			try {
				await sendMessage(encodeSelectedMentions(body), profile);
				input.value = "";
				selectedMentions.clear();
				closeMentionMenu();
			} catch (err) {
				console.warn("Could not send message:", err);
				window.Rux?.toast?.("Couldn't Send Message");
			} finally {
				isSending = false;
				syncComposerState();
				input.focus();
			}
		});

		panelEl.querySelector("[data-team-chat-input]").addEventListener("input", (event) => {
			const hasDraft = Boolean(event.currentTarget.value.trim());
			syncComposerState();
			trackTyping(hasDraft);
			clearTimeout(typingTimeout);
			if (hasDraft) typingTimeout = setTimeout(() => trackTyping(false), 3000);
			updateMentionSuggestions(event.currentTarget);
		});

		panelEl.querySelector("[data-team-chat-input]").addEventListener("keydown", (event) => {
			if (!mentionMenuEl || mentionMenuEl.hidden) return;
			const options = mentionMenuEl.querySelectorAll("[data-mention-profile-id]");
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				setActiveMentionOption(activeMentionIndex + (event.key === "ArrowDown" ? 1 : -1));
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				const option = options[activeMentionIndex];
				const profile = mentionProfiles.find(
					(candidate) => String(candidate.id) === option?.dataset.mentionProfileId,
				);
				if (profile) selectMention(profile);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeMentionMenu();
			}
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

		disclosure = window.RuxPopover.createDisclosure(btn, panelEl, {
			placement: "bottom-end",
			beforeOpen: () => Boolean(getCurrentProfile()),
			onOpen: onChatOpen,
			onClose: () => {
				closeMentionMenu();
				updateBadge();
			},
			initialFocus: () => panelEl.querySelector("[data-team-chat-input]"),
		});
		syncComposerState();

		return panelEl;
	}

	// Singleton popover, same idiom as #notifications-menu/#profile-menu —
	// one shared instance reused for both "react to this message" (opened
	// from a message's add-reaction button) and "insert into the message
	// I'm composing" (opened from the input's own emoji button), switching
	// behavior on emojiMenuMode rather than building two separate pickers.
	// role="menuitem" on each emoji gets Escape/outside-click dismissal and
	// arrow-key navigation for free from rux-ui/js/menu.js, and clicking a
	// menuitem auto-closes the menu the same way any other RuxMenu item
	// does — no manual close() call needed.
	function ensureEmojiMenu() {
		if (emojiMenuEl) return emojiMenuEl;
		emojiMenuEl = document.createElement("div");
		emojiMenuEl.className = "rux-menu rux-popover sched-team-chat__emoji-menu";
		emojiMenuEl.id = "team-chat-emoji-menu";
		emojiMenuEl.role = "menu";
		emojiMenuEl.hidden = true;
		emojiMenuEl.innerHTML = EMOJI_CATEGORIES
			.map(
				(category) => `
					<div class="rux-menu__header">${category.label}</div>
					<div class="sched-team-chat__emoji-grid">
						${category.emoji
							.map(
								(emoji) => `<button type="button" class="sched-team-chat__emoji-option" role="menuitem" data-react-emoji="${emoji}">${emoji}</button>`,
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
		syncComposerState();
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

	function renderMessages() {
		const container = ensurePanel().querySelector("[data-team-chat-messages]");
		const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
		if (!messages.length) {
			container.innerHTML = `<p class="sched-team-chat__empty">No Messages Yet</p>`;
			return;
		}
		const myProfileId = String(getCurrentProfile()?.id || "");
		container.innerHTML = messages
			.map((message, index) => {
				const isGrouped = continuesMessageGroup(message, messages[index - 1]);
				const avatar = profileAvatarEl({
					photo_path: message.sender_photo_path,
					avatar_color: message.sender_avatar_color,
					display_name: message.sender_name,
				});
				// Own-message-only, enforced client-side — profiles here aren't
				// real logged-in accounts (no auth.uid() for RLS to check
				// against), so this is the same honor-system trust level the
				// rest of the app already runs on, not a security boundary.
				const isOwnMessage = Boolean(
					myProfileId && String(message.profile_id) === myProfileId,
				);
				const canDelete = isOwnMessage;

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
						return `<button type="button" class="sched-team-chat__reaction-pill${mine ? " is-active" : ""}" data-react-emoji="${emoji}" data-message-id="${message.id}"><span class="sched-team-chat__reaction-emoji">${emoji}</span> ${profileIds.length}</button>`;
					})
					.join("");
				const mentionsCurrentUser = messageMentionsProfile(message, myProfileId);
				return `
					<div class="sched-team-chat__message${isOwnMessage ? " sched-team-chat__message--own" : ""}${isGrouped ? " sched-team-chat__message--grouped" : ""}${mentionsCurrentUser ? " sched-team-chat__message--mentions-current-user" : ""}" data-message-id="${escapeHtml(message.id)}" data-created-at="${escapeHtml(message.created_at)}">
						<span class="sched-team-chat__avatar-slot">${isGrouped ? "" : avatar.outerHTML}</span>
						<div class="sched-team-chat__message-body">
							${!isOwnMessage && !isGrouped ? `<span class="sched-team-chat__message-name">${escapeHtml(message.sender_name)}</span>` : ""}
							<div class="sched-team-chat__message-line">
								<p class="sched-team-chat__message-text">${renderMessageContent(message.body, myProfileId)}</p>
								<span class="sched-team-chat__message-time">${timeLabel(message.created_at)}</span>
							</div>
							${pillsHtml ? `<div class="sched-team-chat__reactions">${pillsHtml}</div>` : ""}
						</div>
						<div class="sched-team-chat__message-actions">
							<button type="button" class="rux-button rux-button--ghost rux-button--icon" data-open-emoji-menu="${message.id}" aria-label="Add reaction">
								<span class="rux-icon" aria-hidden="true">add_reaction</span>
							</button>
							${canDelete ? `
								<button type="button" class="rux-button rux-button--ghost rux-button--icon sched-team-chat__message-delete" data-delete-message="${message.id}" aria-label="Delete message">
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
			btn.classList.remove("has-unread", "has-mention");
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
		const unreadMentions = unread.filter((message) => messageMentionsProfile(message, myProfileId));
		const hasUnread = unread.length > 0;
		badge.hidden = !hasUnread;
		badge.textContent = unreadMentions.length ? "@" : unread.length > 99 ? "99+" : String(unread.length);
		btn.classList.toggle("has-unread", hasUnread);
		btn.classList.toggle("has-mention", unreadMentions.length > 0);
		btn.setAttribute(
			"aria-label",
			hasUnread
				? `Team chat, ${unread.length} unread${unreadMentions.length ? `, ${unreadMentions.length} mention${unreadMentions.length === 1 ? "" : "s"}` : ""}`
				: "Team chat",
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
			const container = ensurePanel().querySelector("[data-team-chat-messages]");
			container.innerHTML = `<p class="sched-team-chat__empty" role="status">Couldn't Load Messages</p>`;
			return;
		}
		renderMessages();
		updateBadge();
	}

	function onChatOpen() {
		const profile = getCurrentProfile();
		if (!profile) return;
		const previousLastReadAt = lastReadAt;
		renderMessages();
		const unreadMention = [...panelEl.querySelectorAll(".sched-team-chat__message--mentions-current-user")]
			.filter((messageEl) => !previousLastReadAt || messageEl.dataset.createdAt > previousLastReadAt)
			.at(-1);
		if (unreadMention) {
			requestAnimationFrame(() => unreadMention.scrollIntoView({ block: "center" }));
		}
		updateBadge();
		lastReadAt = new Date().toISOString();
		markChatRead(profile.id).catch((err) => console.warn("Could not mark chat read:", err));
		refreshMentionProfiles();
	}

	window.addEventListener("rux:profile-changed", async () => {
		selectedMentions.clear();
		closeMentionMenu();
		const profile = getCurrentProfile();
		if (!profile) {
			leaveTypingChannel();
			return;
		}
		joinTypingChannel(profile);
		refreshMentionProfiles();
		try {
			lastReadAt = await fetchLastRead(profile.id);
		} catch (err) {
			console.warn("Could not load chat read state:", err);
		}
		refresh();
	});

	// Create the controlled popover and bind its trigger even when the initial
	// database request fails; disclosure behavior must not depend on data load.
	ensurePanel();
	window.addEventListener("resize", positionMentionMenu);
	subscribeToTeamChat(refresh, renderConnectionStatus);

	(async () => {
		const profile = getCurrentProfile();
		if (profile) {
			joinTypingChannel(profile);
			refreshMentionProfiles();
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
