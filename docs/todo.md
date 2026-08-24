# Engineering To-Do

Defects and violations found in passing, worth fixing, out of scope when found. Recording
them is the point: a violation reported in conversation and not written down is a violation
nobody will act on.

**Route before adding.** A design-rule violation does not belong here. Those go in the
owning `docs/foundations/` document's Known-defects table, where the rule itself lives —
that is what gives a defect a contract version, an amendment log, and precedence over
downstream specifications. This file is for findings with no such home.

| The finding is | It goes |
|---|---|
| a broken design rule | the owning `docs/foundations/*.md` § Known defects |
| a crossed tier boundary | [`portability-audit.md`](portability-audit.md) |
| application code, data, tooling, or release hygiene | here |

Open design-rule defects are rolled up in
[`foundations/README.md`](foundations/README.md) and are deliberately **not** repeated
here — one home per finding, the same rule the foundations run on.

Each entry says what is wrong, how it is known, why it was not fixed on the spot, and what
fixing it costs. **Delete an entry when it is fixed** rather than marking it done: the git
history is the record, and a file of struck-through items stops being read.

---

## Open

### T1 — Four `?v=` versions of `trip-db.js` are live, and three of them are stale

`index.html` imports `./js/data/trip-db.js?v=42` (three sites). But
[`tasks-panel.js:5`](../js/panels/tasks-panel.js:5) imports `?v=24`, and
[`customers-panel.js:44`](../js/panels/customers-panel.js:44),
[`trip-manifest.js:111`](../js/panels/trip-manifest.js:111) and
[`trip-finder.js:372`](../js/panels/trip-finder.js:372) all import `?v=12`.
[`driver-panel.js:1721`](../js/panels/driver-panel.js:1721) imports `driver-db.js?v=4`
against index.html's `?v=8`.

Two consequences, one of them live:

- **Stale code, which is the real one.** A browser that cached `trip-db.js?v=12` months ago
  keeps serving that body at that URL. Those three panels therefore run whatever `trip-db.js`
  was when their cache was filled — which is exactly the failure the `?v=` system exists to
  prevent, happening where the guard cannot see it (T2).
- **Four module instances.** Each distinct URL evaluates separately, so the module-level
  state at `trip-db.js:34-65` — `currentTripId`, `currentLoadedTrip`, `savesInFlight` —
  exists four times over. **This half is not currently a live bug and should not be
  described as one:** `isSaveInFlight()` is wired only from index.html's instance
  (`index.html:10870`), and the panels import functions that never touch that state. It is
  a trap waiting for the first consumer that does.

**Not fixed on the spot** because aligning the numbers is not obviously the fix. Matching
index.html makes them one instance, which is probably right — but it also silently changes
which code four panels run, and that wants its own verification pass rather than riding
along on an unrelated change.

**Cost:** five one-line edits, then a real check that each panel still works against the
current `trip-db.js` — the panels are the risk, not the edit.

### T2 — The cache-buster guard cannot see JS-to-JS imports

`tools/check-cache-busters.sh` scans `*.html` only. A versioned import inside a `.js` file
is invisible to it: the audit never reports it stale, and the pre-commit guard never
requires it bumped. T1 is the accumulated result.

Worse, the two halves interact. `--fix` rewrites `*.html` and nothing else, so on a module
imported from both a page and a script, `--fix` moves the page's number and leaves the
script's behind — **splitting a pair that was previously one URL into two**. That was hit
live on 2026-08-24 with `fleet-db.js` and worked around by hand; the tool's header now
documents the trap, but documenting it is not fixing it.

**Not fixed on the spot** because the fix is a design decision, not a patch: either the
scanner learns to read JS imports (and then owns rewriting them, with the same
resolve-the-path care the `@import` walk already needed), or JS-side versions are declared
a mistake and removed in favour of importing bare. The second is likely correct — bare
imports share one URL and one instance, and the page-level `?v=` already busts the whole
graph — but retiring them touches six call sites and wants its own change.

**Cost:** small if the answer is "remove them", medium if the scanner grows a JS parser.

---

*A third entry — fourteen `trip_ref` values each shared by two active trips — was drafted
here on 2026-08-24 and removed the same day without ever being committed open, because the
investigation it asked for had already run and landed as `8e732ea` and `96dc475`. The
generator counted rows on a start date and that count can go down, so rescheduling freed a
suffix a live trip still carried; it reads the highest number already issued now, and a
replay over all 272 start dates collides on none where the old one collided on fifteen. One
real downstream bug came with it — `maintenance-share` matched change-log rows by ref and
could print another trip's change on a shared page. The fifteen existing pairs are kept
deliberately: each is two genuinely different trips, and nothing matches a trip by ref any
more, which was verified rather than assumed. Recorded here only so the deletion reads as
the discipline working, not as an entry going missing.*
