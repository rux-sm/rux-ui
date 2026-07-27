/* ==========================================================================
   RUX UI — PROFILE
   --------------------------------------------------------------------------
   Shared "who's currently using this" state for the password-less profile
   picker (index.html). No auth — this only exists so trip history
   attribution and the header avatar can show a real name instead of the
   generic "Dispatcher" fallback. Persists just the selected id locally;
   the profile row itself (display_name, photo_path, settings) lives in
   Supabase via js/data/profile-db.js.
   ========================================================================== */

const STORAGE_KEY = "rux-active-profile-id";

let currentProfile = null;

export function getCurrentProfile() {
	return currentProfile;
}

export function getRememberedProfileId() {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch (_) {
		return null;
	}
}

// profile may be null (the picker's "Not now" / anonymous choice) — clears
// the remembered id so the picker shows again next load instead of "sticking"
// to an anonymous session.
export function setCurrentProfile(profile) {
	currentProfile = profile || null;
	try {
		if (currentProfile) localStorage.setItem(STORAGE_KEY, currentProfile.id);
		else localStorage.removeItem(STORAGE_KEY);
	} catch (_) {}
	window.dispatchEvent(
		new CustomEvent("rux:profile-changed", { detail: { profile: currentProfile } }),
	);
}
