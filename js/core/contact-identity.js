/* ==========================================================================
   RUX UI — CONTACT IDENTITY
   --------------------------------------------------------------------------
   Shared, side-effect-free identity matching for trip/contact linking.
   A saved link is trusted when at least one populated identity field agrees.
   ========================================================================== */

function normalizedText(value) {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, " ");
}

function normalizedPhone(value) {
	const digits = String(value ?? "").replace(/\D/g, "");
	return digits.length === 11 && digits.startsWith("1")
		? digits.slice(1)
		: digits;
}

export function contactsShareIdentity(left = {}, right = {}) {
	const comparisons = [
		[normalizedPhone(left.phone), normalizedPhone(right.phone)],
		[normalizedText(left.email), normalizedText(right.email)],
		[normalizedText(left.name), normalizedText(right.name)],
	];
	return comparisons.some(([a, b]) => Boolean(a && b && a === b));
}
