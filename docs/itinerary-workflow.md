# Itinerary workflow — what exists, and what does not

**Status doc, not a rule doc.** It says where each piece is and how far it
got. Every rule it touches has a home elsewhere and is linked rather than
restated, per CLAUDE.md's one-home rule. If a value or a MUST appears here, it
is in the wrong file.

Last updated 2026-08-31.

---

## The pipeline

A customer's document becomes a trip in six steps. Each is owned by one file.

| Step | Owner | State |
|---|---|---|
| Read the document | [`worker/index.js`](../worker/index.js) `/ai/extract`, or [`.claude/skills/process-itinerary`](../.claude/skills/process-itinerary/SKILL.md) | The in-app route is written and **not deployed**; the skill is built and is the working path today. |
| Extract to Trip Draft v3 | [`itinerary-prompt.md`](itinerary-prompt.md) + [`trip-import-schema-v3.json`](trip-import-schema-v3.json) | Built. One prompt, model-agnostic. |
| Load and fill the trip | [`js/components/itinerary-grid.js`](../js/components/itinerary-grid.js) | Built. Fills stops **and** the trip's blank Details. |
| Resolve and route | same | Built. Saved locations first, then Mapbox; town fallback when there is no street address. |
| Confirm addresses | same | Built. Confirming writes to the saved-locations directory. |
| Driver sheet | [`js/panels/driver-sheet.js`](../js/panels/driver-sheet.js) | Built. Prints on the `--print-*` palette. |
| Wait for a decision | [`js/panels/itinerary-inbox.js`](../js/panels/itinerary-inbox.js) | Built and verified live 2026-08-31. Optional — an itinerary that has no trip yet waits here. |
| Save to the calendar | [`js/data/trip-db.js`](../js/data/trip-db.js) | Built. Mirrors both legs into `trip_stops`; the Grid's own document goes to `trip_itineraries`. |

## Split trips

Built 2026-08-28. The Grid is a per-leg editor: `state.legs` holds `outbound`
and `return`, `state.activeLeg` says which is on screen, and a leg picker
appears only when there are two. Each leg carries its own start date, stops,
routing and driver sheet, because a Drop-off / Pick-up's two legs are days
apart and separately crewed.

What that means in practice:

- The summary reports the **leg you are editing**, plus a **Both legs** mileage
  figure, because the quote is both and the screen is one.
- Resolve & route measures the active leg and says which one it measured.
- The driver sheet prints the active leg and names it on the page.
- `rux_route` is keyed by leg. A flat array — the shape saved before there were
  two legs — still reads as the outbound leg's annex.
- `mirrorToItinerary` writes both legs, so `collectStops` sees what the Grid
  actually holds rather than a half-replaced trip.

This replaced the carried-through guard from earlier the same day, which kept
`legs.return` verbatim and warned that the Grid could not show it. Carrying was
right while the leg could not be rendered; once it can, couriering would make
the second leg the only part of a trip nobody could fix.

## The inbox

Built 2026-08-31. The Grid tab can only be reached with a trip already open,
which is the wrong way round for how the work arrives: a customer's itinerary
turns up before anyone has decided whether it is a new trip, an update to one
already booked, or a quote that never becomes either. Making the trip a
prerequisite forced that decision first. The Itineraries module
(`data-view="itineraries"`) is where one waits while it is made.

What lands there is **already processed** — stops, per-leg mileage, drive
times, day offsets, and the questions to put back to the customer. An unrouted
queue item tells a dispatcher nothing.

- **One way in:** `saveItineraryDraft(document)`. Every feed is a client of it,
  so a feed can be added or dropped without touching the inbox.
- **The editor is the Grid**, mounted a second time in the module's floating
  window with `{ hostId, publishHooks: false, standalone: true }`. Same
  routing, address checking and driver sheet, with no trip in existence.
  `standalone` is what stops it reading and writing `#tp-*`, which are the one
  trip form's global ids; `publishHooks: false` keeps a trip save pointed at
  the tab's instance.
- **Out to a new trip:** `TripEditor.openFromDraft`, same bridge the request
  inbox uses. Nothing is saved — the dispatcher saves.
- **Out to a trip that exists:** *Load from inbox* in the **Grid tab**, not in
  the inbox. The target trip is then the one already open on screen, so the
  only question asked is "which itinerary?". On save the row **moves** —
  `attachDraftToTrip` sets `trip_id` — so the document never exists twice. A
  trip already holding an itinerary refuses the move and keeps its own; the
  inbox copy is closed rather than deleted.

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

[`supabase/trip_itineraries_inbox.sql`](../supabase/trip_itineraries_inbox.sql)
makes that table able to hold a row with no trip: `trip_id` becomes nullable,
the row gets a `uuid` primary key of its own, and a partial unique index keeps
"a trip has at most one itinerary". Applied 2026-08-31.

**Storing an itinerary means storing `toV3`, never `toCleanV3`.** The clean
export is what `trip-import-schema-v3.json` describes and is for handing out —
Copy as JSON, the importer. It strips the private `rux_route` annex, which is
the only place measured mileage, drive time, coordinates and geocoder matches
live. The Grid instance exposes both as `getDocument` (clean) and
`getStoredDocument` (annex); a save that picks the first loses the entire
routing pass silently.

Code must still work when that table is absent. A fresh clone will not have it.

## Retired

`gem-itinerary-prompt-1/2/3.md` are superseded and marked as such in their own
headers. Step 2 asked a model for mileage the app measures properly; step 3
asked it to hand-write HTML that is now the driver sheet. They are kept because
step 1's day-offset and address-confidence rules were the source for
`itinerary-prompt.md`, and deleting the reasoning would lose it.

## Reading a document in the app

Wired 2026-08-31, **not deployed**. `POST /ai/extract` on the Worker takes the
pasted email and any attached PDFs or photos, calls Claude server-side with
`itinerary-prompt.md` and the v3 schema, and returns a draft. The Grid's intake
box calls it as **Read it for me**, in the trip editor and in the inbox alike.

- The Anthropic key lives on the Worker as a secret. A browser holding it would
  ship it in page source, which is tolerable for the Supabase anon key only
  because that key is meant to be public.
- The gate is a shared passphrase in `X-Rux-Extract-Key`, held in the browser's
  `localStorage` — deliberately not in the `settings` table, which the anon
  client reads. See [`worker/README.md`](../worker/README.md) § The gate for
  what that buys and what it does not.
- The button hides itself until the passphrase is set, so it is never a control
  whose only outcome is an instruction.
- The live Worker still answers that path with the proxy's 404, so the client
  says "not deployed yet" rather than passing PostgREST's wording along.

Two things stand between this and working: `wrangler deploy` from `worker/`,
and the two secrets. Set a spend limit in the Anthropic Console at the same
time — that limit, not any code here, is the ceiling on what a leaked
passphrase can cost.

## Not built

- **Routing the return leg from one press.** Resolve & route measures the leg
  on screen. The other one is one toggle and a second press away, and the
  status says which leg it just measured, but there is no route-both button.
- **In-app extraction.** `POST /ai/extract` exists and has never run — no API
  key, no auth user, no `wrangler.toml`, never deployed (todo T4, T5). The
  workflow is built to not need it.
- **The quote lane's `data_flags`** (todo T7) and **its lane gate** (todo T8).
- **`intake.html` feeding the inbox.** It produces a v2 draft and still
  dead-ends; `ItineraryInbox.add` is the one call it needs. The Worker's
  `quote` lane is ready for it.
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

Before the inbox patch was applied, on 2026-08-31: the module routes and
lists, stands itself down to its empty state with one console line when the
table is missing, mounts its second Grid without touching the trip form's own
fields (checked with a sentinel in `#tp-customer`), stacks its three footer
actions one per row at 375px in both themes, and shows *Load from inbox* in the
Grid tab but not in the standalone instance.

After the patch, against the live table with a real 16-stop three-day quote —
and with every row deleted afterwards, leaving `trip_itineraries` empty:

- Add, list, open, route, save, reload, status, filters, driver sheet, delete.
- Routing measured 1,111.2 miles and 18h 18m, resolving one address from the
  saved directory with no geocoding call.
- The routed document survived save and reload with its annex intact — 13 drive
  legs, 15 of 16 coordinates — and the list row reported `≈ 1111 mi · 18h 18m`.
- `attachDraftToTrip` moved the row onto a trip, which then read back all 16
  stops; a second draft aimed at the same trip was refused as `occupied`
  without writing.
- `TripEditor.openFromDraft` accepts an annex-carrying document unchanged.

**Not** verified: pressing Save in the trip editor after *Load from inbox*.
That saves a trip, and a trip is only ever saved on a per-trip go-ahead.

Six colour-scale tests failed on `main` when this was written, unrelated to any of
this. They were fixed on 2026-08-28 by `color.md` steps 47-48 and `trip-bar.md` step
21; the suite is 544/544. Left here rather than deleted because the original
sentence was the reason nobody chased them.
