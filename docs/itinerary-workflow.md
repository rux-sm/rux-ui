# Itinerary workflow — what exists, and what does not

**Status doc, not a rule doc.** It says where each piece is and how far it
got. Every rule it touches has a home elsewhere and is linked rather than
restated, per CLAUDE.md's one-home rule. If a value or a MUST appears here, it
is in the wrong file.

Last updated 2026-09-19, when the Grid tab and the Itineraries inbox were
removed ([`itinerary-simplify-plan.md`](itinerary-simplify-plan.md)).

How the old system held together, and the reasoning behind the pieces that are
gone, is [`itinerary-system-audit.md`](itinerary-system-audit.md).

---

## The pipeline

A customer's document becomes a trip two ways, and the first is now the usual one.

**Through the Claude app.** The scheduler's connector, in the `rux-sm.github.io`
repository, reads the document and returns a link that opens that app's trip
editor already filled in, marked field by field. Only a person's Save writes the
trip. Nothing in this repository is involved, and nothing here needs to be.

**Through the workbench.** [`intake.html`](../intake.html) is the operator's own
paste-and-drop bench, for a document that is not going through Claude.

| Step | Owner | State |
|---|---|---|
| Read the document | [`worker/index.js`](../worker/index.js) `/ai/extract` | Written, **not deployed**. |
| Extract to Trip Draft v3 | [`itinerary-prompt.md`](itinerary-prompt.md) + [`trip-import-schema-v3.json`](trip-import-schema-v3.json) | Built. One prompt, model-agnostic. |
| Read v1, v2 or v3 into the editor | [`js/data/trip-import.js`](../js/data/trip-import.js) | Built. `normalizeTripImport` takes all three. |
| Fill the trip | [`js/pages/trip-intake.js`](../js/pages/trip-intake.js) | Built. *Open in trip editor* hands it across through `sessionStorage`. |
| Driver sheet | [`js/panels/driver-sheet.js`](../js/panels/driver-sheet.js) | Built. Prints on the `--print-*` palette. |
| Save to the calendar | [`js/data/trip-db.js`](../js/data/trip-db.js) | Built. Writes both legs into `trip_stops`. |

## Two lanes, and they are not the same

The word "itinerary" covers two different documents, and confusing them is what
the old three-prompt chain got wrong.

**Confirmed itinerary** — a booked trip's schedule, through
`itinerary-prompt.md` and Trip Draft v3. This is the lane everything above
describes.

**Inbound quote request** — a stranger asking for a price. The Worker's `quote`
lane and [`gem-itinerary-prompt.md`](gem-itinerary-prompt.md) still speak v2 for
it. There is no page on that lane.

`normalizeTripImport` reads v1, v2 and v3, so both lanes land in the same editor.

## The yard is the app's, not the document's

[`itinerary-prompt.md`](itinerary-prompt.md) tells a model to omit `yard_origin`
unless the source states a depot departure — the app owns the yard, and a draft
should only report what the customer said. `fromV3` therefore supplies the row on
load, ahead of any leg that starts with a pickup.

It has to be a row rather than a calculation. Routing measures leg *n* from stop
*n−1*, so with nothing before the pickup there is no leg to measure: no mileage,
no drive time, no duty. A missing `return` is *not* supplied the same way: the
prompt mandates that one, so its absence is a broken extraction rather than a
designed omission, and filling it in would hide the difference.

## Storage

`trip_stops` is what every reader uses — print schedules, the trip envelope,
driver share, trip-bar mileage — and `trip-db.js`'s save path is the one writer.

`trip_itineraries` ([`supabase/trip_itineraries.sql`](../supabase/trip_itineraries.sql))
held the Grid's own record: day offsets, activity, address confidence, what the
geocoder matched, and a private `rux_route` annex. **Nothing writes it on a trip
save any more.** Existing rows stand; no new ones arrive that way.

Code must still work when that table is absent. A fresh clone will not have it.

## Retired

- **The Grid tab** and **the Itineraries inbox**, removed 2026-09-19. The Grid's
  paste-a-draft path is what the connector does from a document without the
  pasting, and the inbox is where those documents waited.
- **The `process-itinerary` skill**, whose path ended at the Grid tab.
- **`intake.html`'s *Send to inbox*** and `js/data/itinerary-grid-db.js` with it: the
  button was that module's only caller, and it filed to a view that no longer lists
  anything. The page keeps *Open in trip editor* and *Copy JSON*.
- `gem-itinerary-prompt-1/2/3.md`, superseded and marked so in their own headers.
  Kept because step 1's day-offset and address-confidence rules were the source
  for `itinerary-prompt.md`, and deleting the reasoning would lose it.

## Loose ends from the removal

- **`/ai/extract` lost its in-app caller.** The Grid's *Read it for me* button
  went with the tab; `intake.html` is the only page left that calls the route,
  and the route has still never been deployed.

## Not built

- **In-app extraction.** `POST /ai/extract` exists and has never run — no API
  key, no `wrangler.toml`, never deployed (todo T4, T5).
- **The quote lane's `data_flags`** (todo T7) and **its lane gate** (todo T8).
- **A public enquiry form on the `quote` lane.** The Worker lane exists and
  speaks v2; nothing calls it.
- **The Itinerary tab's rebuild** as the scheduler's six fields, which is step 2
  of [`itinerary-simplify-plan.md`](itinerary-simplify-plan.md). Until then it is
  the classic per-day stop editor, and it is now the only one.
- **Hours-of-service tests.** The classic tab warns at 10h drive and 15h duty and
  segments sessions around off-duty periods. That engine is the app's only one
  and has no behavioural tests (todo T15).
