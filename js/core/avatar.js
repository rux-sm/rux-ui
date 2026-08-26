import { getProfilePhotoUrl } from "../data/profile-db.js";
import { normalizeTripColor } from "./trip-colors.js";

// Preset background colors for the initials avatar (no freeform picker) —
// the same five labels as the Trip Bar Color swatches, on the categorical
// fill band.
export function avatarColorValue(key) {
	/* The palette is js/core/trip-colors.js — one set, so an avatar and a trip
	   bar offer the same five choices. The token name follows the colour name,
	   so the map this used to keep was a second copy of the list; retiring
	   orange is what made that a liability. A profile still holding "orange"
	   renders amber rather than losing its colour.

	   THE RUNG IS 500, NOT THE TRIP BAR'S 400, AND THE SPLIT IS THE POINT.
	   Until step 38 this read --sched-trip-color-*, so an avatar and a bar were
	   the same token. They are not the same FUNCTION: a trip bar carries a white
	   label AND a 900 status icon, so it answers to color.md rule 2.14's F1 and
	   F2 together and 400 is the last rung where the icon clears. An avatar
	   carries initials and nothing else — F1 alone — so it takes the rung its
	   own function allows. Sharing one token forced the avatar to spend
	   headroom on a mark it does not have.

	   docs/foundations/color.md rule 2.14, §5 step 38. */
	const color = normalizeTripColor(key);
	return color ? `var(--rux-${color}-fill-control)` : "";
}

/* Paint an element as a coloured avatar, or clear it back to the default.
   THE FILL AND ITS LABEL MOVE TOGETHER, which is why this is a function and not
   two assignments at each call site (color.md rule 2.14: a fill publishes its
   label so the pairing cannot be got wrong). On the 500 rung the default label
   is NOT safe — .rux-avatar's --rux-text-primary is gray-1000, which measures
   4.16 on teal-500 and misses the 4.5 floor, where the published white label
   measures 4.86. Clearing the colour hands both properties back to the
   stylesheet, where the uncoloured avatar is gray with primary text. */
export function applyAvatarColor(el, key) {
	const fill = avatarColorValue(key);
	el.style.backgroundColor = fill;
	el.style.color = fill ? "var(--rux-on-fill-control)" : "";
	return fill;
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
		applyAvatarColor(el, profile?.avatar_color);
		el.textContent = driverInitials(profile?.display_name || "");
	}
	return el;
}
