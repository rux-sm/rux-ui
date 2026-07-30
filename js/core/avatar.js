import { getProfilePhotoUrl } from "../data/profile-db.js";

// Preset background colors for the initials avatar (no freeform picker) —
// same palette/tokens as the Trip Bar Color swatches, so avatars stay
// visually consistent with the rest of the app.
const AVATAR_COLOR_TOKENS = {
	cyan: "--rux-trip-color-cyan",
	green: "--rux-trip-color-green",
	purple: "--rux-trip-color-purple",
	yellow: "--rux-trip-color-yellow",
	orange: "--rux-trip-color-orange",
	pink: "--rux-trip-color-pink",
};

export function avatarColorValue(key) {
	const token = AVATAR_COLOR_TOKENS[key];
	return token ? `var(${token})` : "";
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
