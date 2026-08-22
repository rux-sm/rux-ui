import { getProfilePhotoUrl } from "../data/profile-db.js";
import { normalizeTripColor } from "./trip-colors.js";

// Preset background colors for the initials avatar (no freeform picker) —
// same palette/tokens as the Trip Bar Color swatches, so avatars stay
// visually consistent with the rest of the app.
export function avatarColorValue(key) {
	/* The palette is js/core/trip-colors.js — one set, shared deliberately so an
	   avatar and a trip bar tagged the same colour look the same. The token name
	   follows the colour name, so the map this used to keep was a second copy of
	   the list; retiring orange is what made that a liability. A profile still
	   holding "orange" renders yellow rather than losing its colour. */
	const color = normalizeTripColor(key);
	return color ? `var(--sched-trip-color-${color})` : "";
}

export function driverInitials(name) {
	const parts = (name || "").split(" ");
	return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export function profileAvatarEl(profile, extraClass = "") {
	const el = document.createElement("span");
	el.className = extraClass ? `rux-avatar ${extraClass}` : "rux-avatar";
	const url = profile?.photo_path ? getProfilePhotoUrl(profile.photo_path) : null;
	if (url) {
		const img = document.createElement("img");
		img.src = url;
		img.alt = "";
		el.appendChild(img);
	} else {
		el.style.backgroundColor = avatarColorValue(profile?.avatar_color);
		el.textContent = driverInitials(profile?.display_name || "");
	}
	return el;
}
