const root = document.querySelector('.scheduler-app__module[data-module="game"]');
if (!root) throw new Error("Flip 7 module root not found");

let supabase;
try {
	({ supabase } = await import("../data/supabase.js"));
} catch (error) {
	const status = root.querySelector("#game-status");
	const message = root.querySelector("#game-join-error");
	if (status) status.textContent = "Game client failed to load";
	if (message) {
		message.textContent = error?.message || "Reload the page and try again";
		message.hidden = false;
	}
	console.error("Flip 7 client failed to load:", error);
	throw error;
}

const els = Object.fromEntries([
	"status", "leave", "lobby", "join-form", "player-name", "player-count",
	"lobby-players", "start", "table", "scores", "deck-count", "active-player",
	"turn-note", "hand", "round-score", "hit", "bank", "reset", "join-error",
	"join-button", "lobby-reset", "messages", "message-form", "message-input",
	"message-send",
].map((key) => [key, root.querySelector(`#game-${key}`)]));

let state = { status: "lobby", current_player_id: null, deck: [] };
let players = [];
let cards = [];
let messages = [];
let busy = false;
let refreshPromise = null;
let refreshQueued = false;
let playerId = null;
try {
	playerId = localStorage.getItem("rux.flipSeven.playerId");
} catch (_) {
	// Private browsing can disable storage. The game still works for this page.
}

function notify(message, type = "danger") {
	window.Rux?.toast?.(message, { variant: type });
}

function setJoinError(message = "") {
	els["join-error"].textContent = message;
	els["join-error"].hidden = !message;
}

async function call(action, args = {}, fallbackArgs = null) {
	if (busy) return;
	busy = true;
	render();
	try {
		let { error } = await supabase.rpc(action, args);
		const missingSignature = error?.code === "PGRST202" || error?.message?.includes("schema cache");
		if (error && missingSignature && fallbackArgs) {
			({ error } = await supabase.rpc(action, fallbackArgs));
		}
		if (error) throw error;
		if (action === "hit_flip_seven_v2" || action === "bank_flip_seven") {
			state.current_player_id = null;
			render();
		}
		await refreshLatest();
	} catch (error) {
		const message = error?.message || "Game action failed";
		notify(message);
		console.error(`Flip 7 ${action} failed:`, error);
	} finally {
		busy = false;
		render();
	}
}

function refresh() {
	if (refreshPromise) {
		refreshQueued = true;
		return refreshPromise;
	}

	refreshPromise = (async () => {
		const [stateResult, playersResult, cardsResult, messagesResult] = await Promise.all([
			supabase.from("game_state").select("*").eq("id", 1).maybeSingle(),
			supabase.from("game_players").select("*").order("joined_at"),
			supabase.from("game_cards").select("*").order("drawn_at"),
			supabase.from("game_messages").select("*").order("created_at").limit(100),
		]);
		const error = stateResult.error || playersResult.error || cardsResult.error;
		if (error) {
			els.status.textContent = "Couldn't sync the game";
			console.warn("Flip 7:", error.message);
			return;
		}
		state = stateResult.data || state;
		players = playersResult.data || [];
		cards = cardsResult.data || [];
		messages = messagesResult.error ? [] : messagesResult.data || [];
		if (playerId && !players.some((player) => player.id === playerId)) {
			playerId = null;
			try { localStorage.removeItem("rux.flipSeven.playerId"); } catch (_) {}
		}
		render();
	})().catch((error) => {
		els.status.textContent = "Couldn't sync the game";
		console.warn("Flip 7 sync failed:", error);
	}).finally(() => {
		refreshPromise = null;
		if (refreshQueued) {
			refreshQueued = false;
			queueMicrotask(refresh);
		}
	});

	return refreshPromise;
}

async function refreshLatest() {
	if (refreshPromise) await refreshPromise;
	await refresh();
}

function render() {
	const current = players.find((player) => player.id === state.current_player_id);
	const me = players.find((player) => player.id === playerId);
	const host = players[0];
	const isHost = host?.id === playerId;
	const activeCards = cards.filter((card) => card.player_id === state.current_player_id);
	const inLobby = state.status === "lobby";
	const finished = state.status === "finished";
	const myTurn = state.status === "playing" && state.current_player_id === playerId && !busy;

	els.lobby.hidden = !inLobby;
	els.table.hidden = inLobby;
	els.leave.hidden = false;
	els["join-form"].hidden = !!me;
	els.start.disabled = !isHost || players.length === 0 || busy;
	els["lobby-reset"].hidden = !inLobby || players.length === 0;
	els["lobby-reset"].disabled = busy;
	els.reset.hidden = inLobby;
	els.reset.disabled = busy;
	els.hit.hidden = finished;
	els.bank.hidden = finished;
	els.hit.disabled = !myTurn;
	els.bank.disabled = !myTurn || activeCards.length === 0 || !!current?.is_bust;
	els["message-input"].disabled = !me || busy || inLobby;
	els["message-send"].disabled = !me || busy || inLobby;

	els.status.textContent = inLobby
		? `${players.length} ${players.length === 1 ? "player" : "players"} at the table`
		: finished ? "Match complete" : `${current?.name || "Player"} is drawing`;
	els["player-count"].textContent = String(players.length);
	els["deck-count"].textContent = `${state.deck?.length || 0} cards`;
	els["active-player"].textContent = finished ? `${current?.name || "Player"} wins` : current?.name || "Waiting for player";
	els["turn-note"].textContent = finished
		? "First to 200 points wins the match."
		: myTurn ? "Your turn. Draw or bank your points." : "Controls unlock on your turn.";
	els["round-score"].textContent = String(current?.round_score || 0);

	els["lobby-players"].innerHTML = players.length
		? players.map((player) => `<li>${escapeHtml(player.name)}${player.id === playerId ? " (you)" : ""}</li>`).join("")
		: '<li class="flip-seven__empty">No players yet</li>';
	const rankedPlayers = [...players].sort((a, b) => b.total_score - a.total_score || a.joined_at.localeCompare(b.joined_at));
	els.scores.innerHTML = Array.from({ length: 4 }, (_, index) => {
		const player = rankedPlayers[index];
		if (!player) {
			return '<li class="flip-seven__score flip-seven__score--empty" aria-hidden="true"></li>';
		}
		return `
			<li class="flip-seven__score${player.id === state.current_player_id ? " is-active" : ""}${player.is_bust ? " is-bust" : ""}">
				<span class="flip-seven__score-rank">${index + 1}</span>
				<span class="rux-avatar rux-avatar--sm" aria-hidden="true">${escapeHtml(initials(player.name))}</span>
				<span class="flip-seven__score-name">${escapeHtml(player.name)}${player.id === playerId ? ' <span class="rux-badge rux-badge--accent">You</span>' : ""}</span>
				<span class="flip-seven__score-round">${player.is_bust ? "Bust" : player.round_score}</span>
				<strong class="flip-seven__score-total">${player.total_score}</strong>
			</li>`;
	}).join("");

	const seatOrder = me
		? [me, ...players.filter((player) => player.id !== me.id)]
		: [...players];
	const positionsByPlayerCount = {
		1: ["bottom"],
		2: ["bottom", "top"],
		3: ["bottom", "left", "right"],
		4: ["bottom", "left", "top", "right"],
	};
	const seatPositions = positionsByPlayerCount[Math.min(seatOrder.length, 4)] || [];
	const playersByPosition = new Map(seatPositions.map((position, index) => [position, seatOrder[index]]));
	els.hand.dataset.playerCount = String(seatOrder.length);
	els.hand.innerHTML = ["bottom", "left", "top", "right"].map((position) => {
		const player = playersByPosition.get(position);
		if (!player) {
			return `<section class="rux-card flip-seven__player-hand flip-seven__player-hand--${position} is-empty" aria-hidden="true"></section>`;
		}
		const playerCards = cards.filter((card) => card.player_id === player.id);
		const latestCardId = playerCards.at(-1)?.id;
		const isActive = player.id === state.current_player_id;
		const isMe = player.id === playerId;
		const seatLabel = `${player.name}${isMe ? ", you" : ""}: ${player.is_bust ? "bust" : `${player.round_score} round points`}`;
		return `
			<section class="rux-card flip-seven__player-hand flip-seven__player-hand--${position}${isActive ? " is-active" : ""}${player.is_bust ? " is-bust" : ""}${isMe ? " is-me" : ""}" aria-label="${escapeHtml(seatLabel)}">
				<header class="flip-seven__player-hand-header">
					<span class="rux-avatar" aria-hidden="true">${escapeHtml(initials(player.name))}</span>
					<span class="flip-seven__player-hand-name">${escapeHtml(player.name)}${isMe ? ' <span class="rux-badge rux-badge--accent">You</span>' : ""}</span>
					<span class="flip-seven__player-hand-score">${player.is_bust ? "Bust" : `${player.round_score} pts`}</span>
				</header>
				<div class="flip-seven__player-cards">
					${playerCards.length
						? playerCards.map((card) => `<div class="flip-seven__card${card.id === latestCardId ? " is-latest" : ""}${player.is_bust && card.id === latestCardId ? " is-bust-card" : ""}" aria-label="Card ${card.card_value}">${card.card_value}</div>`).join("")
						: '<span class="flip-seven__hand-empty">No cards</span>'}
				</div>
			</section>`;
	}).join("");

	const wasNearBottom = els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 32;
	const messageMarkup = messages.length
		? messages.map((message) => `<p><strong>${escapeHtml(message.player_name)}:</strong> ${escapeHtml(message.body)}</p>`).join("")
		: '<p class="flip-seven__messages-empty">No messages yet</p>';
	if (els.messages.innerHTML !== messageMarkup) {
		els.messages.innerHTML = messageMarkup;
		if (wasNearBottom) els.messages.scrollTop = els.messages.scrollHeight;
	}
}

function escapeHtml(value) {
	const node = document.createElement("span");
	node.textContent = value;
	return node.innerHTML;
}

function initials(name) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase() || "")
		.join("");
}

async function joinGame(event) {
	event?.preventDefault();
	const name = els["player-name"].value.trim();
	if (!name) {
		setJoinError("Enter a player name");
		els["player-name"].focus();
		return;
	}
	if (busy) return;
	if (players.some((player) => player.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
		setJoinError("That name is already at the table");
		return;
	}
	setJoinError();
	busy = true;
	els["join-button"].disabled = true;
	els["join-button"].textContent = "Joining…";
	try {
		const { data, error } = await supabase.from("game_players").insert({ name }).select("id").single();
		if (error) throw error;
		playerId = data.id;
		try { localStorage.setItem("rux.flipSeven.playerId", playerId); } catch (_) {}
		els["player-name"].value = "";
		await refresh();
	} catch (error) {
		const message = error?.message || "Couldn't join. Check your connection and try again.";
		setJoinError(message);
		notify(message);
		console.error("Flip 7 join failed:", error);
	} finally {
		busy = false;
		els["join-button"].disabled = false;
		els["join-button"].textContent = "Join game";
		render();
	}
}

els["join-form"].addEventListener("submit", joinGame);
// Some embedded previews do not dispatch form submission reliably. Keep the
// primary action directly wired as well; the busy guard prevents double joins.
els["join-button"].addEventListener("click", joinGame);

els.leave.addEventListener("click", async () => {
	if (busy) return;
	if (playerId) {
		busy = true;
		try {
			let { error } = await supabase.rpc("leave_flip_seven", { acting_player: playerId });
			const missingFunction = error?.code === "PGRST202" || error?.message?.includes("schema cache");
			if (error && missingFunction && state.status === "lobby") {
				({ error } = await supabase.from("game_players").delete().eq("id", playerId));
			}
			if (error) throw error;
			playerId = null;
			try { localStorage.removeItem("rux.flipSeven.playerId"); } catch (_) {}
			await refresh();
		} catch (error) {
			const missingFunction = error?.code === "PGRST202" || error?.message?.includes("schema cache");
			notify(missingFunction ? "Leave-game SQL is not installed" : error?.message || "Couldn't leave the table");
			busy = false;
			render();
			return;
		} finally {
			busy = false;
		}
	}
	document.querySelector('.scheduler-app__module-button[data-module="calendar"]')?.click();
});
els.start.addEventListener("click", () => call("start_flip_seven", { acting_player: playerId }, {}));
els.hit.addEventListener("click", () => call("hit_flip_seven_v2", { acting_player: playerId }));
els.bank.addEventListener("click", () => call("bank_flip_seven", { acting_player: playerId }));
els["message-form"].addEventListener("submit", async (event) => {
	event.preventDefault();
	const body = els["message-input"].value.trim();
	if (!playerId || !body || busy) return;
	els["message-input"].value = "";
	await call("send_flip_seven_message", { acting_player: playerId, message_body: body });
});
els["lobby-reset"].addEventListener("click", () => {
	if (!window.confirm("Remove everyone from the lobby and start fresh?")) return;
	call("reset_flip_seven", { acting_player: playerId }, {});
});
els.reset.addEventListener("click", () => {
	if (!window.confirm("Reset the entire game and return everyone to the lobby?")) return;
	call("reset_flip_seven", { acting_player: playerId }, {});
});

const channel = supabase.channel("flip-seven")
	.on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, refresh)
	.on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, refresh)
	.on("postgres_changes", { event: "*", schema: "public", table: "game_cards" }, refresh)
	.on("postgres_changes", { event: "*", schema: "public", table: "game_messages" }, refresh)
	.subscribe((status) => {
		if (status === "SUBSCRIBED") refresh();
		if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
			console.warn(`Flip 7 Realtime status: ${status}. Polling remains active.`);
		}
	});

// Realtime is the primary path. Polling covers local proxies and networks that
// block or interrupt the Realtime WebSocket connection.
const syncTimer = window.setInterval(() => {
	if (!document.hidden) refresh();
}, 2000);
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) refresh();
});
window.addEventListener("focus", refresh);
window.addEventListener("beforeunload", () => {
	window.clearInterval(syncTimer);
	supabase.removeChannel(channel);
});
root.dataset.gameReady = "true";
refresh();
