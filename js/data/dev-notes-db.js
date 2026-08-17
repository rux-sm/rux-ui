import { supabase } from "./supabase.js";

export async function fetchNotes() {
	const { data, error } = await supabase
		.from("dev_notes")
		.select("*")
		.order("done", { ascending: true })
		.order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}

export async function addNote(text) {
	const trimmed = text.trim();
	if (!trimmed) return;
	const { error } = await supabase.from("dev_notes").insert({ text: trimmed });
	if (error) throw error;
}

export async function toggleDone(id, done) {
	const { error } = await supabase
		.from("dev_notes")
		.update({ done, done_at: done ? new Date().toISOString() : null })
		.eq("id", id);
	if (error) throw error;
}

export async function deleteNote(id) {
	const { error } = await supabase.from("dev_notes").delete().eq("id", id);
	if (error) throw error;
}

export function subscribeToNotes(onChange) {
	return supabase
		.channel("dev-notes")
		.on("postgres_changes", { event: "*", schema: "public", table: "dev_notes" }, onChange)
		.subscribe();
}
