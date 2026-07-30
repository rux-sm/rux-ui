import { supabase } from "./supabase.js";

export async function fetchMessages() {
	const { data, error } = await supabase
		.from("team_messages")
		.select("*")
		.order("created_at")
		.limit(100);
	if (error) throw error;
	return data ?? [];
}

export async function sendMessage(body, profile) {
	const trimmed = body.trim();
	if (!trimmed) return;
	const { error } = await supabase.from("team_messages").insert({
		profile_id: profile.id,
		sender_name: profile.display_name,
		sender_photo_path: profile.photo_path,
		sender_avatar_color: profile.avatar_color,
		body: trimmed,
	});
	if (error) throw error;
}

export async function fetchLastRead(profileId) {
	const { data, error } = await supabase
		.from("team_chat_reads")
		.select("last_read_at")
		.eq("profile_id", profileId)
		.maybeSingle();
	if (error) throw error;
	return data?.last_read_at ?? null;
}

export async function markChatRead(profileId) {
	const { error } = await supabase
		.from("team_chat_reads")
		.upsert(
			{ profile_id: profileId, last_read_at: new Date().toISOString() },
			{ onConflict: "profile_id" },
		);
	if (error) console.warn("Could not mark chat read:", error);
}

export function subscribeToTeamChat(onChange) {
	return supabase
		.channel("team-chat")
		.on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, onChange)
		.subscribe();
}
