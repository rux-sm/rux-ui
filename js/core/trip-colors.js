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

   ORANGE WAS RETIRED on 2026-08-22 (docs/foundations/color.md Q9, step 16),
   and step 17 moved the rest onto the catalog's own hues: cyan became teal and
   yellow became amber, while green, purple and pink already matched. The five
   are now the five catalog hues that are not spoken for — red is danger and
   blue is the accent — so the set is closed by the palette rather than chosen.

   NOTHING WAS MIGRATED. Rows in Supabase still hold "orange", "cyan" and
   "yellow", and `normalizeTripColor` is what makes them render — it maps each
   retired name to its replacement at read time. That is deliberate: a write
   against live production data to rename a cosmetic label buys nothing, and this
   mapping costs one lookup. A row keeps its stored value; the board shows the
   new colour. If those rows are ever rewritten, this mapping can go with them.
   ========================================================================== */

/** The colours a trip or avatar may be tagged with today. */
export const TRIP_COLORS = ["teal", "green", "purple", "amber", "pink"];

/** Retired names, and what each renders as now. */
const RETIRED = { orange: "amber", cyan: "teal", yellow: "amber" };

/**
 * A stored colour -> the colour to render, or "" when there is none.
 * Accepts retired names so existing rows keep a colour instead of losing one.
 */
export function normalizeTripColor(stored) {
	const mapped = RETIRED[stored] ?? stored;
	return TRIP_COLORS.includes(mapped) ? mapped : "";
}
