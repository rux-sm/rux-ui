import { supabase } from "./supabase.js";

export async function fetchProfiles() {
	const { data, error } = await supabase
		.from("profiles")
		.select("id, display_name, photo_path, avatar_color, settings, created_at")
		.order("display_name");
	if (error) throw error;
	return data ?? [];
}

export async function createProfile({ display_name, avatar_color }) {
	const { data, error } = await supabase
		.from("profiles")
		.insert({ display_name, avatar_color })
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function updateProfile(id, fields) {
	const { data, error } = await supabase
		.from("profiles")
		.update(fields)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function deleteProfile(id) {
	const { data: existing } = await supabase
		.from("profiles")
		.select("photo_path")
		.eq("id", id)
		.single();
	if (existing?.photo_path) {
		await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
	}
	const { error } = await supabase.from("profiles").delete().eq("id", id);
	if (error) throw error;
}

/* ── Photos ─────────────────────────────────────────────────────────────── */

const PHOTO_BUCKET = "profile-photos";

export function getProfilePhotoUrl(photoPath) {
	if (!photoPath) return null;
	const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photoPath);
	return data?.publicUrl || null;
}

export async function uploadProfilePhoto(profileId, file) {
	const ext = file.name.split(".").pop() || "jpg";
	const photoPath = `${profileId}/photo-${Date.now()}.${ext}`;

	const { data: existing } = await supabase
		.from("profiles")
		.select("photo_path")
		.eq("id", profileId)
		.single();
	if (existing?.photo_path) {
		await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
	}

	const { error: uploadErr } = await supabase.storage
		.from(PHOTO_BUCKET)
		.upload(photoPath, file);
	if (uploadErr) throw uploadErr;

	const { error: updateErr } = await supabase
		.from("profiles")
		.update({ photo_path: photoPath })
		.eq("id", profileId);
	if (updateErr) throw updateErr;

	return photoPath;
}

export async function removeProfilePhoto(profileId) {
	const { data: existing } = await supabase
		.from("profiles")
		.select("photo_path")
		.eq("id", profileId)
		.single();
	if (existing?.photo_path) {
		await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_path]);
	}
	const { error } = await supabase
		.from("profiles")
		.update({ photo_path: null })
		.eq("id", profileId);
	if (error) throw error;
}
