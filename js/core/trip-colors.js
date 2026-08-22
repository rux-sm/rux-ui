/* ==========================================================================
   TRIP COLORS  ·  the board's categorical palette
   --------------------------------------------------------------------------
   The colours a trip bar and a profile avatar can be tagged with. These are
   CATEGORICAL LABELS, not semantics — the board carries confirmed/pending
   status separately — so the set exists to be told apart at a glance, and its
   only real requirement is that no two members look alike.

   This module is the one home for that set. It existed as four copies of the
   same array literal until orange was retired, in js/components/trip-bar.js,
   js/data/trip-db.js, js/panels/print-schedule.js and js/core/avatar.js — and
   a fifth as swatch markup in index.html. Removing one colour meant finding
   all five, which is the argument for this file.

   ORANGE WAS RETIRED on 2026-08-22 (docs/foundations/color.md Q9, step 16).
   The design system publishes one warm hue where the board used two, and the
   owner chose to drop orange rather than keep a base colour alive for it.

   NOTHING WAS MIGRATED. Rows in Supabase still hold "orange", and
   `normalizeTripColor` is what makes them render — it maps orange to yellow at
   read time. That is deliberate: a data migration to rename a cosmetic label
   is a write against live production data for no functional gain, and this
   mapping costs one lookup. A row keeps its stored value; the board shows
   yellow. If those rows are ever rewritten, this mapping can go with them.
   ========================================================================== */

/** The colours a trip or avatar may be tagged with today. */
export const TRIP_COLORS = ["cyan", "green", "purple", "yellow", "pink"];

/** Retired names, and what each renders as now. */
const RETIRED = { orange: "yellow" };

/**
 * A stored colour -> the colour to render, or "" when there is none.
 * Accepts retired names so existing rows keep a colour instead of losing one.
 */
export function normalizeTripColor(stored) {
	const mapped = RETIRED[stored] ?? stored;
	return TRIP_COLORS.includes(mapped) ? mapped : "";
}
