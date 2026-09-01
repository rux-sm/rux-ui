# Itinerary system audit — 2026-09-01

**Audit document, not a rule doc.** It records what the itinerary system is
today, where the seams are, and what a redesign has to decide. It states no new
rules and moves no code. Rules it touches live elsewhere and are linked rather
than restated, per CLAUDE.md's one-home rule.

Companion to [`itinerary-workflow.md`](itinerary-workflow.md), which says what
each piece *is*. This says how well it holds together, and §6 sequences the work
that follows.

Scope: everything between a customer's document and a driver holding paper.
Read-only pass — no application, configuration or SQL file was modified.

---

## 1. The headline

There are **two itinerary editors on adjacent tabs of the same trip, built on
opposite time models, and neither is a superset of the other.** Everything
else in this audit follows from that.

| | Itinerary tab | Grid tab |
|---|---|---|
| File | [`itinerary.js`](../js/components/itinerary.js) | [`itinerary-grid.js`](../js/components/itinerary-grid.js) |
| Size | 2,473 lines | 2,604 lines |
| Time model | "the journey to get here" — `departPrev` + `arrive` | "what the document says" — `arrive` + `depart` |
| Dates | **typed**, two date inputs per stop | **derived** from time monotonicity |
| Address entry | live autocomplete + saved-locations search | plain text box |
| Hours of service | 10h drive / 15h duty warnings, off-duty sessions, 8h restart | **none** |
| Routing | per-leg estimate | full resolve pass, saved directory, tie-break scoring |
| Document import | no | Trip Draft v3 |
| Behavioural tests | **essentially none** (28-line regex file) | 1,391 lines |

Each tab holds something the other needs. A dispatcher cannot get both at
once, and nothing on screen says so.

The workflow doc already lists *"Retiring the classic Itinerary tab"* under
**Not built**, framed as "a decision, not a leftover." This audit's position is
that the decision is now overdue, because the split has started costing
correctness rather than just duplication — see §3.

## 2. The surface map

Nine places touch an itinerary. Six can create or change one.

**Write surfaces**

| # | Surface | Where | What it is |
|---|---|---|---|
| W1 | Itinerary tab | `pane-itinerary` | Stop-timeline editor, HOS-aware |
| W2 | Grid tab | `pane-itinerary-grid` | Document-shaped editor, routing-aware |
| W3 | Itineraries inbox | `data-view="itineraries"` | List + **a second Grid instance** in a floating window |
| W4 | Intake workbench | [`intake.html`](../intake.html) | Standalone page, paste/drop → v3 draft, three exits |
| W5 | Request inbox | `data-view="requests"` | Quote lane; triages into the trip editor |
| W6 | Public request form | [`request.html`](../request.html) | Customer-facing enquiry |

**Read surfaces**

| # | Surface | Reads from |
|---|---|---|
| R1 | Driver sheet | the Grid's in-memory payload |
| R2 | Trip envelope | `trip_stops` |
| R3 | Print schedule | `trip_stops` |
| R4 | Driver share ([`driver.html`](../driver.html)) | `trip_stops` |

Three of the four outputs read the mirrored table; the fourth reads the live
editor. That is why an unsaved Grid can print a driver sheet for a route no
other output can see.

**Storage** is two tables by design — `trip_stops` (every downstream reader)
and `trip_itineraries` (the v3 document plus the private `rux_route` annex).
That duplication is deliberate and documented; it is not a finding.

## 3. Findings

Ordered by consequence. Each states how it is known.

### A1 — The Grid tab has no hours-of-service check, and it is the tab the whole pipeline funnels into

`itinerary.js` warns at `driveForWarn > 10 * 60` and `dutyForWarn > 15 * 60`
([`itinerary.js:552`](../js/components/itinerary.js:552)), segments duty into
sessions bounded by off-duty periods, and treats 8 consecutive hours off as a
restart. `itinerary-grid.js` computes `dutyByDay` and renders the result as a
neutral statistic — **"Longest day 17h"** — with no threshold, no colour, and
no comparison to any limit
([`itinerary-grid.js:1485`](../js/components/itinerary-grid.js:1485)). The
comment directly above that line reads *"the worst day is the number that
decides whether this trip is legal."* The code knows what the number means and
prints it bare anyway.

The retired prompt chain had `hos_flags`, described in
[`gem-itinerary-prompt-3.md`](gem-itinerary-prompt-3.md) as "the ones that stop
a trip." The single-prompt replacement dropped them, and nothing took over the
job.

How it is known: three consecutive real TAMIU itineraries were processed on
2026-09-01 — Oct 3, Oct 9–10, Oct 17. All three run past the 15-hour federal
on-duty limit once the deadhead between the McAllen yard and Laredo is counted;
the Oct 3 trip passes it on passenger time alone. The app displayed **17h**,
**12h** and **10h 30m**, in the same grey as Miles and Drive, and raised
nothing. The over-hours finding reached the operator only because it was
written into `data_flags` in prose by the extractor.

The second and third figures carry a further problem worth separating out.
**Duty is computed only from legs that measured.** All three trips end at
"TAMIU KCB", an address the geocoder cannot resolve, so the two legs home
contributed nothing — and the Oct 17 trip, whose real day approaches 24 hours,
reported 10h 30m. An unroutable address therefore does not just shorten the
mileage total, which the status line does say; it silently *flatters* the
legality figure, which nothing says. A missing address makes the trip look
safer than it is.

This is the most consequential gap in the system. It is also the one a redesign
is most likely to lose again, because the arithmetic already exists and looks
finished.

### A2 — Projecting the Grid into the Itinerary tab silently destroys duty segmentation

`toEditorStops` writes **`dwellStatus: "on"` as a literal** on every projected
row ([`itinerary-grid.js:911`](../js/components/itinerary-grid.js:911)), and
`fromEditorStops` never reads the field back
([`itinerary-grid.js:803`](../js/components/itinerary-grid.js:803)).

`dwellStatus` is the per-stop `on` / `off` / `sleeper` flag the HOS engine runs
on — it is what ends a duty session
([`itinerary.js:390`](../js/components/itinerary.js:390)). It has a column,
`trip_stops.dwell_status`, and survives a normal save
([`trip-db.js:629`](../js/data/trip-db.js:629)).

So: a dispatcher marks an overnight rest **Off Duty** in the Itinerary tab,
opens the Grid tab, presses *Pull from Itinerary*, saves — and `mirrorToItinerary`
writes every stop back as on-duty. A legal two-session trip becomes one
continuous illegal session in the older editor's own math, with no warning and
no undo.

How it is known: read directly from the projection. Not reproduced against a
live trip, because reproducing it means saving one.

**This is a live defect independent of any redesign.**

### A3 — The v3 document cannot express off-duty, so the round trip cannot be lossless

The schema's stop types are `yard_origin`, `pickup`, `stop`, `sleeper`, `day`,
`return` ([`trip-import-schema-v3.json`](trip-import-schema-v3.json)). There is
a `sleeper` *stop*, but no way to mark an ordinary stop's dwell as off duty.
The Itinerary tab's three-state `dwellStatus` has no v3 equivalent.

A2 is therefore not just a missing line of mapping code — there is nowhere in
the document for the value to go. Any redesign that keeps v3 as the storage
format has to extend it first. That is a schema amendment with a version
implication, not a patch.

### A4 — The Grid does not use the app's own address autocomplete

`rux-ui/js/suggestions.js` is a shared component. `trip-panel.js` and
`itinerary.js` both use it — Mapbox `searchbox/v1/suggest` plus a search of the
saved-locations directory, rendered as a dropdown
([`itinerary.js:1767`](../js/components/itinerary.js:1767)).

The Grid's address cell is a bare `<input type="text">`
([`itinerary-grid.js:1253`](../js/components/itinerary-grid.js:1253)). You type
a string blind, press **Resolve & route**, and find out afterwards where it
went — and per **T12** in [`todo.md`](todo.md), sometimes not even then.

This is the single clearest answer to "it should be easier to add addresses,"
and the cheapest to close: the component exists, it is already wired in the
sibling tab, and the Grid is the tab everything else funnels into.

### A5 — A trip cannot record its driving or on-duty hours

`trip-db.js` reads and writes `driving_hours` and `on_duty_hours` from
`#tp-drive-hr` and `#tp-duty-hr`
([`trip-db.js:443`](../js/data/trip-db.js:443)). **Neither element exists in
`index.html`.** `optionalNumVal` returns `undefined` for a missing field, so
the write path is a silent no-op and the two columns are permanently null.

Meanwhile the Grid computes duty per day and has nowhere to put it, and the
driver sheet prints it from a payload that is never persisted. The number the
business runs on is calculated, displayed, printed, and then discarded.

How it is known: grepped both ids across `index.html` and `js/` — four hits in
`trip-db.js`, zero in markup.

### A6 — The classic Itinerary tab is effectively untested

[`itinerary-segmented.test.mjs`](../tests/itinerary-segmented.test.mjs) is 28
lines and asserts markup contracts with regex against the source text. It
executes none of the module. [`locations.test.mjs`](../tests/locations.test.mjs)
touches it only to check it reads the saved directory.

That leaves ~2,470 lines — including every line of the HOS engine, the only
implementation of it in the app — with no behavioural coverage. The Grid, by
contrast, has 1,391 lines of tests exercising real functions.

The asymmetry matters for the redesign in a specific way: **the tab that is
safest to delete is the one with the tests, and the tab holding the
irreplaceable logic is the one nobody can refactor safely.**

### A7 — Ten controls stand between a blank Grid and a routed trip

The Grid's control surface: *Add stop*, *Load JSON*, *Upload JSON*, *Copy
prompt + document*, *Copy as JSON*, *Pull from Itinerary*, *Read it for me*,
*Attach*, *Load from inbox*, *Resolve & route*, *Driver sheet*
([`itinerary-grid.js:1823`](../js/components/itinerary-grid.js:1823) onward).

They are not badly built, and each has a reason. But five of them are *import*
variants, and the two most-used paths — typing a trip by hand, and pasting a
draft — are not visually privileged over the eight that are occasional. *Read
it for me* is wired to a route that has never run (**T4**), and *Copy prompt +
document* exists to drive an external model by hand because of it.

This is the concrete shape of "cluttered": the tab presents the whole history
of how documents have ever arrived, flat, at equal weight.

### A8 — Four import surfaces, one of them a page of its own

W2, W3, W4 and W5 all turn an outside document into a draft. W4
([`intake.html`](../intake.html)) is a separate HTML document that cannot reach
`window.TripEditor` and hands work over through `sessionStorage`
([`index.html:11259`](../index.html:11259)).

The inbox's one-way-in discipline (`saveItineraryDraft`) is genuinely good and
should survive any redesign. The question is whether the *workbench* needs to
be a separate page at all, given that its distinguishing feature — server-side
extraction — has never run.

### A9 — The Grid's own document is the only place several values can live

`toV3` carries the private `rux_route` annex; `toCleanV3` strips it. Measured
mileage, drive time, coordinates and geocoder matches exist **only** in the
annex, because v3's `distance_miles` means "the source stated it."

The workflow doc already warns that saving `toCleanV3` "loses the entire
routing pass silently." That is a sharp edge sitting one wrong function call
away, in a system where two other places (`Copy as JSON`, the importer)
legitimately want the clean form. Worth a type-level or naming-level guard in
any rewrite rather than a comment.

## 4. What is right, and should survive the redesign

Listing this is not politeness. These were expensive to learn and a rewrite
will re-lose them by default.

- **Dates are derived, not typed** (Grid). This is the single biggest entry
  improvement over the Itinerary tab and the reason the Grid exists.
- **The saved-locations directory is checked before Mapbox**, matches on place
  *name* as well as address, and compounds with use. It has already overruled a
  wrong-town extraction.
- **The inbox's one way in.** Every feed is a client of `saveItineraryDraft`,
  so feeds can be added or dropped without touching the inbox.
- **`attachDraftToTrip` moves the row** rather than copying it, so an itinerary
  never exists twice.
- **Advisories are offered, never applied.** The yard roll, the spot time and
  now the derived arrival all render as a suggestion with a *Use it* button.
- **The traffic buffer is used to judge, never stored.** The record keeps what
  Mapbox measured.
- **`data_flags` as a first-class output.** The questions to put back to the
  customer travel with the document.
- **Nothing saves without a per-trip go-ahead.**

## 5. What the redesign has to decide

These are decisions, not tasks — they are the open questions a redesign answers,
and §6 is sequenced so the first four steps do not need them answered.

1. **One editor or two?** If one, which time model wins — and where does the
   HOS engine live afterwards? Deleting `itinerary.js` deletes the only
   implementation of it.
2. **Does v3 grow an off-duty representation** (A3), or does duty status stop
   living in the document and stay a `trip_stops` concern?
3. **Where do computed hours land?** A5's two columns are the obvious home, but
   that makes a derived value durable and therefore staleable.
4. **Is the workbench a page or a panel?** (A8)
5. **What is the default path for a hand-typed trip?** Today there isn't one —
   the Grid opens as an import surface with a scaffold behind it.

## 6. Sequenced plan

Ordered so that **nothing early depends on an answer to §5.** Steps 1–4 are
worth doing whichever editor eventually wins, and each is independently
shippable. Steps 5 onward are gated on a decision and are deliberately not
costed in detail, because costing them would smuggle the decision in.

Sizes are relative — S is an afternoon, M is a day or two, L is a week of
evenings. They assume the existing test discipline, not a rewrite.

### Ungated — do these regardless

**Step 1 · Characterise the HOS engine before anything touches it — M**

`itinerary.js` holds the only implementation of duty segmentation, the 10h/15h
thresholds and the 8-hour restart, and has no behavioural coverage (A6). Extract
`dutyIntervalData`, `sessionOnDutyThroughWindow`, `sessionDriveThroughWindow`
and the warn thresholds onto the module's published API the way
`itinerary-grid.js` publishes its pure half, and write tests against them.

*Why first:* every other step in this plan either moves this logic, copies it,
or depends on it being right. Today nobody can change it safely, and that — not
the duplication — is what makes the two-editor split expensive.

*Done when:* the duty math is exercised by tests that fail if a threshold moves,
and a session that crosses midnight is covered.

**Step 2 · Wire the shared autocomplete into the Grid's address cell — S**

A4. `rux-ui/js/suggestions.js` exists, is already used by `itinerary.js` and
`trip-panel.js`, and searches the saved-locations directory alongside Mapbox.
The Grid's cell is a bare text input.

*Why here:* it is the largest daily-friction win in the audit, it is confined to
one render function and one listener, and it partly pre-empts T12 — an operator
who picks a suggestion never types the bare venue name that suppresses the
substitution warning.

*Done when:* typing in a Grid address cell offers saved locations first, then
Mapbox, and taking a suggestion fills the address and coordinates without a
separate Resolve pass.

**Step 3 · Make the duty figure tell the truth — S/M**

A1, in two parts, and the second matters more than the first.

- *The threshold.* "Longest day" gets the same over-limit treatment
  `itinerary.js` already gives its own stats. The thresholds live in one place,
  imported by both, not retyped.
- *The honesty.* Duty computed from a route with unmeasured legs must not be
  presented as a duty figure. The Oct 17 trip reported **10h 30m** for a day
  approaching 24 because the legs home never resolved. Until every leg measures,
  the number is a floor and should say so.

*Done when:* an over-limit day is visually distinct, and a trip with any
unmeasured leg cannot display a bare duty total.

**Step 4 · Stop the silent `dwellStatus` reset — S**

A2. `toEditorStops` hardcodes `dwellStatus: "on"`. The fix is not to invent a
value: it is to stop asserting one. Carry the existing status through
`fromEditorStops` → state → `toEditorStops` as an opaque passenger, and where
the Grid genuinely has nothing to say, leave the editor's own value alone rather
than overwriting it.

*Why after step 1:* the test that proves this fixed is a duty test, and step 1
is what makes it writable.

*Done when:* an Off Duty stop marked in the Itinerary tab survives a pull,
a save and a reload, with a test asserting it.

### Gated on §5

**Step 5 · Give duty status a home in the document — M, gated on §5.2**

A3. The v3 schema cannot express off-duty, so step 4 protects the value in
memory but not through the inbox or `trip_itineraries`. Closing it properly is a
schema amendment with a version bump and a migration for stored documents —
which is only worth doing if duty status is agreed to belong in the document at
all, rather than staying a `trip_stops` concern.

**Step 6 · Decide where computed hours land — S, gated on §5.3**

A5. `driving_hours` and `on_duty_hours` are columns with no UI and no writer.
Either give them a writer or drop them; leaving a column the app cannot fill is
what made this invisible for as long as it was.

**Step 7 · Consolidate the control surface — M, gated on §5.5**

A7. Eleven controls at equal weight. The work is deciding which two paths are
primary — hand-typed and pasted-draft — and demoting the other nine, not
deleting them. *Read it for me* should not be visible while T4 is open.

**Step 8 · The one-editor question — L, gated on §5.1**

A1 through A6 all get cheaper after steps 1–4 and none of them force this
answer. Take it last, with tests in place and the friction already reduced, when
the remaining difference between the tabs is a genuine preference rather than a
pile of missing features.

### What this plan deliberately does not do

- **It does not start with the redesign.** Steps 1–4 make the current system
  honest and safe to change. A redesign begun before them inherits an untested
  HOS engine and re-loses the same things.
- **It does not touch the quote lane.** W5 and W6 were out of scope for this
  audit (§7) and should get their own pass before anyone merges the two lanes.
- **It does not schedule T4.** Deploying the extraction route is the owner's to
  do and nothing here depends on it.

## 7. Method, and what was not checked

Read-only inspection of `js/components/`, `js/panels/`, `js/data/`, `js/pages/`,
`index.html`, `supabase/`, `docs/` and `tests/`, plus three real customer
itineraries processed end to end through the live app on 2026-09-01.

Not checked, and worth its own pass:

- The quote lane (W5, W6) beyond its overlap with the itinerary lane.
- `trip-panel.js` (1,465 lines) except where it touches itinerary fields.
- Any live-data question — no query was run against the Supabase project.
- Whether A2 reproduces against a saved trip. Confirming it means saving one.
- Accessibility and keyboard paths through either editor.
- Mobile and narrow-width behaviour of the Grid.

Related open items already recorded elsewhere and deliberately not repeated
here: **T4** (extraction never run), **T5** (Worker not deployed from the
repo), **T10** (a wrong saved-directory hit outlives its fix), **T11** (detour
check false-positives), **T12** (a bare venue name suppresses the substitution
warning) — all in [`todo.md`](todo.md).
