# Itinerary — simplify to match the scheduler

Status: **not started**, written 2026-09-19. One open question, below, blocks step 1.

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
- Most of `js/components/itinerary.js`, the per-day stop builder, replaced by the six
  fields. 2,473 lines today.
- `tests/itinerary-grid.test.mjs`.
- The `process-itinerary` skill, and `docs/itinerary-prompt.md`,
  `docs/gem-itinerary-prompt*.md` and `docs/itinerary-workflow.md` with it. That whole
  path — read a document, extract Trip Draft v3, paste JSON into the Grid tab — is what
  the scheduler's Claude connector now does without the pasting, and keeping two ways to do
  one job is how they drift.

## What stays, and why

- `js/data/itinerary-grid-db.js`, because `intake.html` saves drafts through it and is a
  page of its own, not a tab.
- The Itinerary inbox. It is its own view in `index.html`, not a Grid feature.
- `docs/itinerary-system-audit.md`, as the record of what the old system was.

## Open question

**A trip whose stops neither app can then edit.** Trips already in the database carry day
rows and mid-trip stops that only the Grid tab and the old Itinerary tab could edit. Once
both apps ask for six fields, those stops are kept and shown but no longer editable
anywhere. Is that accepted, or should the tab offer to clear the extra stops on a trip it
opens?

## Steps

1. Replace the Itinerary tab's body with the six fields and the worked-out times, writing
   the same rows the scheduler writes.
2. Remove the Grid tab, its module, its script tag, its markup and its test.
3. Retire the `process-itinerary` skill and the prompt documents, leaving the audit.
4. Grep `Grid`, `itineraryGrid` and `itinerary-grid` across `index.html`, `js/`, `tests/`,
   `docs/` and the CSS, and report the count before and after, as the rename protocol asks.
5. rux enters a route on a real trip in each app and checks the other shows the same times.
