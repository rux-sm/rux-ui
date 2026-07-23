/* Shared "which document" rule for trip_documents rows carrying the same
   label (e.g. a re-uploaded Itinerary) — the newest upload wins everywhere
   a single doc is shown: trip bar shortcut, Driver Link preview, and the
   public driver schedule. */

export function latestDocument(docs, label) {
	const matches = (docs || []).filter(
		(doc) => String(doc.label || "").toLowerCase() === label.toLowerCase(),
	);
	if (!matches.length) return null;
	return matches.reduce((newest, doc) =>
		new Date(doc.created_at || 0) > new Date(newest.created_at || 0) ? doc : newest,
	);
}
