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
const ACTIVITY_KEY = "rux-profile-last-active";

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

// Call whenever the current profile is actively confirming it's still them
// (selecting a profile, or ongoing use — see index.html's activity listener).
// A remembered profile only auto-continues silently across reloads while
// its activity is fresh; once it goes stale (isProfileStale), the picker
// re-prompts instead of silently trusting a possibly-stale identity (e.g. a
// personal device left signed in long after the person stepped away).
export function touchProfileActivity() {
	try {
		localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
	} catch (_) {}
}

export function isProfileStale(maxIdleMs) {
	let lastActive = 0;
	try {
		lastActive = Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
	} catch (_) {}
	return !lastActive || Date.now() - lastActive > maxIdleMs;
}

// profile may be null (cleared when the active one gets deleted) — clears
// the remembered id so the picker shows again next load instead of "sticking"
// to a profile that no longer exists.
export function setCurrentProfile(profile) {
	currentProfile = profile || null;
	try {
		if (currentProfile) {
			localStorage.setItem(STORAGE_KEY, currentProfile.id);
			touchProfileActivity();
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch (_) {}
	window.dispatchEvent(
		new CustomEvent("rux:profile-changed", { detail: { profile: currentProfile } }),
	);
}
