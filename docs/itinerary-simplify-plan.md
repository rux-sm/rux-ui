# Itinerary — simplify to match the scheduler

Status: **in progress**, written 2026-09-19. No questions open.

Replaces the trip panel's Itinerary tab with the six fields the scheduler's Route tab now
asks for, and removes the Grid tab. Both apps then describe a trip's route the same way and
write the same `trip_stops` rows, so a trip reads the same whichever one opened it.

## The shape, mirrored from the scheduler

Six typed fields, the same six on every trip, in one section:

| | |
| :--- | :--- |
| Pickup location | a name anyone would recognise the place by |
| Pickup address | a place search; the drive is measured from it |
| Drop-off location | as the pickup |
| Drop-off address | defaults to the pickup address |
| Group departs | when the bus leaves the pickup |
| Group arrives | when the trip ends at its last stop |

Three more times are worked out and shown, never typed. The labels name who moves, which is
also the rule for what is typed: the group's two times are typed, the bus's three follow.

| | |
| :--- | :--- |
| Yard depart | worked out |
| Bus arrives | worked out — Group departs less 15 minutes |
| Group departs | typed |
| Group arrives | typed |
| Yard return | worked out |

The scheduler's `docs/plans/scheduler-route-tab.md`, in the `rux-sm.github.io` repository,
is where this shape was decided and where its reasoning lives. This file states it because
the two repositories cannot link to each other; if they disagree, that one is right.

**A drop-off equal to the pickup writes no drop-off row**, because that is what a round trip
already stores. Without this the always-filled field would give every round trip a stop it
has never had, and the scheduler would see it.

## What goes

- `js/components/itinerary-grid.js`, the Grid tab, and its script tag and tab markup in
  `index.html`. 2,604 lines.
- `js/panels/itinerary-inbox.js` and the inbox view, 494 lines and its markup. rux does not
  use it, and its job -- a customer's document before it is a trip -- is what the
  connector does from the Claude app now.
- Most of `js/components/itinerary.js`, the per-day stop builder, replaced by the six
  fields. 2,473 lines today.
- `tests/itinerary-grid.test.mjs`.
- The `process-itinerary` skill. Its path — read a document, extract Trip Draft v3, paste
  the JSON into the Grid tab — ends at a tab that no longer exists, and the scheduler's
  Claude connector does the same job without the pasting.

**Trip Draft v3 stays**, with `docs/itinerary-prompt.md`, `docs/gem-itinerary-prompt*.md`
and `docs/trip-import-schema-v3.json`. The Grid was one consumer, not the format's owner:
`worker/index.js`'s extract route still answers in v3, `intake.html` still feeds it, the
schema is published at a public URL, and `tests/trip-import.test.mjs` reads the prompt's
worked example. Deleting them would have broken a passing test.

## What stays, and why

- `js/data/itinerary-grid-db.js`, because `intake.html` saves drafts through it and is a
  page of its own, not a tab.
- `docs/itinerary-system-audit.md`, as the record of what the old system was.

## What the Grid's four calls actually do

`js/data/trip-db.js` calls `ItineraryGrid.clear`, `hydrate`, `persist` and
`mirrorToItinerary`, which looks like the save path but is not. `trip_stops` is written by
trip-db's own code from the Itinerary tab; `persist` runs after that, as its own comment
says, and writes the Grid's extra record — day offsets, activity, address confidence, what
the geocoder matched — to `trip_itineraries`. `hydrate` reads it back, and the other two are
tab-to-tab plumbing.

So removing the Grid drops that extra record and nothing else. No trip loses a stop, and the
four calls are optional-chained, so they need no edit for the app to keep running — they are
deleted as dead code rather than re-pointed.

The inbox mounts a **second** `ItineraryGrid` as its record editor and reads mileage back
through it, so the two have to come out together. They are, because rux does not use the
inbox.

## Old stops are kept, and not editable

Trips already in the database carry day rows and mid-trip stops that only the Grid tab and
the old Itinerary tab could edit. Both apps keep every one of them, say how many a leg has,
and edit none: the driver sheet and the envelope still read them, and nothing anyone typed
is thrown away. The scheduler's tab already behaves this way, so the two agree.

## Steps

1. Remove the Grid tab and the inbox together: both modules, their script tags, their
   markup, their tab and view entries, trip-db's four dead calls, and the Grid's test.
2. Replace the Itinerary tab's body with the six fields and the worked-out times, writing
   the same rows the scheduler writes.
3. Settle `intake.html`'s *Send to inbox*, which now files a row nothing can read: either
   drop the action or let the page list its own drafts. See
   [`itinerary-workflow.md`](itinerary-workflow.md) § Loose ends.
4. Grep `Grid`, `itineraryGrid` and `itinerary-grid` across `index.html`, `js/`, `tests/`,
   `docs/` and the CSS, and report the count before and after, as the rename protocol asks.
5. rux enters a route on a real trip in each app and checks the other shows the same times.
