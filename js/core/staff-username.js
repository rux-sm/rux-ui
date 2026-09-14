/* ==========================================================================
   RUX UI — STAFF USERNAME
   --------------------------------------------------------------------------
   Staff sign in with a short username; the account behind it is that name
   on the staff domain, a reserved name nobody can own, so no email is ever
   sent to it. A full email address is used as typed, for accounts that
   have a real one.
   ========================================================================== */

export const STAFF_EMAIL_DOMAIN = "staff.invalid";

export function usernameToEmail(input) {
	const value = String(input ?? "").trim().toLowerCase();
	if (!value) return null;
	if (value.includes("@")) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
	}
	return /^[a-z0-9._-]{1,40}$/.test(value) ? `${value}@${STAFF_EMAIL_DOMAIN}` : null;
}
