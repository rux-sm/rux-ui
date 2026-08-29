# Itinerary workflow — what exists, and what does not

**Status doc, not a rule doc.** It says where each piece is and how far it
got. Every rule it touches has a home elsewhere and is linked rather than
restated, per CLAUDE.md's one-home rule. If a value or a MUST appears here, it
is in the wrong file.

Last updated 2026-08-28.

---

## The pipeline

A customer's document becomes a trip in six steps. Each is owned by one file.

| Step | Owner | State |
|---|---|---|
| Read the document | [`.claude/skills/process-itinerary`](../.claude/skills/process-itinerary/SKILL.md) | Built. Carries a PDF text extractor for machines without poppler. |
| Extract to Trip Draft v3 | [`itinerary-prompt.md`](itinerary-prompt.md) + [`trip-import-schema-v3.json`](trip-import-schema-v3.json) | Built. One prompt, model-agnostic. |
| Load and fill the trip | [`js/components/itinerary-grid.js`](../js/components/itinerary-grid.js) | Built. Fills stops **and** the trip's blank Details. |
| Resolve and route | same | Built. Saved locations first, then Mapbox; town fallback when there is no street address. |
| Confirm addresses | same | Built. Confirming writes to the saved-locations directory. |
| Driver sheet | [`js/panels/driver-sheet.js`](../js/panels/driver-sheet.js) | Built. Prints on the `--print-*` palette. |
| Save to the calendar | [`js/data/trip-db.js`](../js/data/trip-db.js) | Built. Mirrors into `trip_stops`; the Grid's own document goes to `trip_itineraries`. |

## Two lanes, and they are not the same

The word "itinerary" covers two different documents, and confusing them is
what the old three-prompt chain got wrong.

**Confirmed itinerary** — a booked trip's schedule. Goes to the **Grid tab**,
through `itinerary-prompt.md` and Trip Draft v3. This is the lane everything
above describes.

**Inbound quote request** — a stranger asking for a price. Goes to
[`intake.html`](../intake.html), through
[`gem-itinerary-prompt.md`](gem-itinerary-prompt.md) and Trip Draft v2. Still
v2 on purpose: v3 is a superset, but repointing that lane is a behavioural
change to a page that has never run its extraction route at all (todo T4).

`normalizeTripImport` reads v1, v2 and v3, so both lanes land in the same
editor.

## Storage

`trip_stops` remains what every other reader uses — print schedules, the trip
envelope, driver share, trip-bar mileage. The Grid writes it through the
existing save path rather than a second one.

`trip_itineraries` (one jsonb document per trip,
[`supabase/trip_itineraries.sql`](../supabase/trip_itineraries.sql), applied
2026-08-28) holds the four things `trip_stops` has nowhere to put: day offsets,
activity, address confidence, and what the geocoder matched. Plus a private
`rux_route` annex carrying measured mileage and its source — v3's
`distance_miles` means "the source stated it", so measured values cannot travel
there without becoming un-refreshable.

Code must still work when that table is absent. A fresh clone will not have it.

## Retired

`gem-itinerary-prompt-1/2/3.md` are superseded and marked as such in their own
headers. Step 2 asked a model for mileage the app measures properly; step 3
asked it to hand-write HTML that is now the driver sheet. They are kept because
step 1's day-offset and address-confidence rules were the source for
`itinerary-prompt.md`, and deleting the reasoning would lose it.

## Not built

- **Split trips.** The Grid reads `legs.outbound` only. A `dropoff_pickup`
  needs the classic Itinerary tab, which handles both legs. **The gap is one
  component, not the stack:** `trip_stops.leg` exists, `js/core/bus-slots.js`
  publishes `legOf` / `legsForTrip` / `assignmentsOnLeg`, the classic tab has
  `setActiveLeg`, and v3 already carries `legs.return`. Only
  `js/components/itinerary-grid.js` assumes one leg.

  **Loading a split trip is no longer lossy** (2026-08-28). `toV3` used to
  hard-code `type: "round_trip"` and write only `legs.outbound`, so a
  Drop-off / Pick-up draft came out of the Grid as a *different trip* — return
  leg deleted, type rewritten — with nothing reported. The Grid now carries
  `trip.type`, `trip.service_type` and `legs.return` through unchanged and
  shows a warning saying it is not editing the return leg. It still cannot
  edit or route that leg; it no longer destroys it. Pinned by five cases in
  `tests/itinerary-grid.test.mjs`, each verified to fail without the guard.
- **In-app extraction.** `POST /ai/extract` exists and has never run — no API
  key, no auth user, no `wrangler.toml`, never deployed (todo T4, T5). The
  workflow is built to not need it.
- **The quote lane's `data_flags`** (todo T7) and **its lane gate** (todo T8).
- **Retiring the classic Itinerary tab.** Both tabs edit the same trip. Whether
  the Grid replaces it is a decision, not a leftover.

## Verified

Against the live project on 2026-08-28, with a real customer PDF:

- The full round trip through `trip_itineraries` — save, clear, hydrate —
  keeping measured mileage and leaving it refreshable rather than manual.
- Routing against the live Mapbox token, including a tight leg the schedule
  genuinely could not make.
- The saved-locations directory resolving 3 of 3 stops with no geocoding call,
  and overruling an extraction that had guessed the wrong town.
- The driver sheet in both themes, at 480px, 600px and 860px.

Six colour-scale tests failed on `main` when this was written, unrelated to any of
this. They were fixed on 2026-08-28 by `color.md` steps 47-48 and `trip-bar.md` step
21; the suite is 544/544. Left here rather than deleted because the original
sentence was the reason nobody chased them.
