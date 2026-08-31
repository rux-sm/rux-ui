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

### T3 — The gallery is eight specimens short, and R9's second clause has never been true

`tests/gallery-coverage.test.mjs` records 13 of 23 base components as having no specimen in
`gallery.html`. **Five of those are not gaps** — the census reads one Specimen surface where
`composition.md` §2 classifies two. That half is a design-rule defect and lives where the
rule does, as [`foundations/composition.md`](foundations/composition.md) **D10**. This entry
is the remaining eight and the two process findings around them.

**Eight components genuinely have no specimen**, and they split by CSS positioning, which is
what decides the work:

| | Components | Why they group |
|---|---|---|
| Flow-positioned | `table`, `menu`, `notifications`, `preferences`, `profile-picker` | No `position: fixed`. Static markup in a gallery section works as-is — `table`'s sort and filter states are attribute-driven (`[data-sort]`, `.is-filtered`) and show without script. |
| `position: fixed` | `popover`, `suggestions`, `drawer` | They escape any gallery card. These need the behavior modules and real triggers, not markup. |

**R9's second clause has never been true.** [`audit/design-system-audit.md`](audit/design-system-audit.md)
§5 R9 reads: every base block appears in `gallery.html`, *with behavior modules loaded*,
before it ships. `gallery.html:7` loads `rux-ui/css/rux.css` and nothing else. The test
checks the first half and is silent on the second, so the 10 components counted as covered
are covered against half a rule. `README.md:41` advertises the opposite property — "no app
boot required" — so the two statements of R9 contradict each other and always have.

**R9 has no home.** `foundations/README.md:81` routes R9 to `CLAUDE.md`, on the grounds that
the gallery-as-contract-surface is a process rule rather than a design rule. `grep -c gallery
CLAUDE.md` returns **0**. So R9 is stated in the audit document, claimed to live somewhere
that does not mention it, and enforced by a test that cites no section — the one-home rule
broken three ways at once.

**How it is known:** the gap list is the test's own `KNOWN_GAPS`, run 2026-08-24; the
positioning split is grepped from `rux-ui/css/base/*.css`; the stylesheet claim is
`gallery.html:7`; the CLAUDE.md count is the grep above. The test's own comment says
"thirteen of twenty-two" and is stale — there are 23 base files, and `README.md:42`'s "10 of
23" is right.

**Why it was not fixed on the spot:** building specimens is design work rather than a
mechanical fix, and two parts needed decisions before anything could be written. Both were
taken 2026-08-24 and are recorded here so the work resumes anywhere: **the example counts as
coverage** (widen the census — composition.md D10), and **the gallery loads behavior
modules** (live triggers for the three fixed-position overlays, which makes R9's second
clause true rather than amending it away).

**Cost**, in the order the phases land, each committable alone:

1. **Census** — small, test-only. Widen `gallery-coverage` to both Specimen surfaces, drop
   the five from `KNOWN_GAPS`, correct the stale count in the test comment. Closes D10.
2. **Five flow-positioned specimens** — medium, design work. `table` first: it is the largest
   of the eight and the table-page floorplan will want it anyway.
3. **Three overlays, live** — medium, and the only risky phase. Loading `overlay.js`,
   `popover.js`, `drawer.js` and `suggestions.js` into a page that has never booted them can
   surface init assumptions; `tests/ui-shell-init-idempotence.test.mjs` and
   `boot-contract.test.mjs` exist because that has bitten before. `KNOWN_GAPS` and its two
   guard tests delete at the end of it. Two consequences ride along and belong in the same
   change: `README.md:41` stops being true, and the gallery's inline theme toggle hand-rolls
   a contract `theme.js` does not share — academic while nothing else is loaded, live once
   its siblings are.
4. **Home R9** — small, Class A. `composition.md` is the candidate: it already owns the
   Specimen archetype and already names `tests/gallery-coverage` as its contract. Taking it
   also corrects `foundations/README.md:81`'s "deliberately absent" claim.

**Not in scope:** the 10 existing specimens; the audit's inert-tabs finding; and
`panel.css`'s `__header`, `__title`, `__footer`, `__tabs` and four modifiers, which stay
unshown because the ratchet is block-level by design and one instance credits a whole file.

### T4 — The extraction route exists in the repository but has never run

[`worker/index.js`](../worker/index.js) adds `POST /ai/extract`, and
[`intake.html`](../intake.html) calls it. Neither has been exercised end to end: the route
needs an `ANTHROPIC_API_KEY` secret, an `ALLOWED_USER_ID`, and a single Supabase auth user,
none of which existed when it was written.

How it is known: the signed-out path was verified in a browser (Process correctly disabled,
no console errors, the paste-and-preview path unchanged) and the schema conversion is
covered by [`tests/worker-schema.test.mjs`](../tests/worker-schema.test.mjs). The signed-in
path was not, because it cannot be from a checkout.

Why it was not finished on the spot: creating the auth user and holding the API key are the
owner's to do, not an agent's.

The specific risk is the schema. Structured outputs accepts a subset of JSON Schema, and
the Worker reshapes `trip-import-schema-v2.json` to fit — inlining `$ref`s, flattening
`allOf`, dropping rejected keywords. The tests assert the *shape* of that conversion; no
test can assert the API *accepts* it. The first real call is the first proof. The Worker
logs the upstream error body, so a rejection names the offending construct.

Cost to close: create the user, set the secret and the three vars, set a spend limit in the
Anthropic Console, deploy, and run one real document through it.

Note that nothing depends on it. The itinerary workflow was built to work without it — see
[`itinerary-workflow.md`](itinerary-workflow.md) — so this buys convenience on the quote
lane rather than unblocking anything.

### T5 — The Worker has no `wrangler.toml`, and its deployed copy is not this one

`worker/index.js` was reconstructed from the source pasted out of the Cloudflare dashboard.
Until it is deployed from here, the live Worker and this file are two independent copies,
and nothing detects them diverging.

There is also no `wrangler.toml`, so `wrangler deploy` will not work from a clean clone —
the Worker predates the directory.

Why it was not fixed on the spot: writing a deploy config for an account whose settings
(name, routes, compatibility date, existing vars) cannot be read from here would be
guessing at values that must match what is already live.

Cost to close: one `wrangler.toml` written against the account's actual settings, then a
deploy from the repository so this copy becomes the deployed one.

### T6 — The Supabase proxy answers every origin with `Access-Control-Allow-Origin: *`

[`worker/index.js`](../worker/index.js) sets a wildcard CORS header on the proxy branch, so
any website can reach the Supabase project through it using the anon key that ships in page
source. This predates the extraction work and is unchanged by it; `/ai/extract` scopes its
own CORS to `APP_ORIGIN`.

How it is known: read while adding the new route.

Why it was not fixed on the spot: tightening it is a behavioural change to every existing
page, including the public `request.html` and the share pages, and it wants its own
verification pass rather than riding along with an unrelated feature.

Cost to close: decide the allowed origins, scope the header, then check the scheduler, the
driver and maintenance share pages, and the public request form still load.

### T7 — The quote-request prompt still has no `data_flags`

The itinerary lane has this now: [`itinerary-prompt.md`](itinerary-prompt.md) asks for
`data_flags`, [`trip-import-schema-v3.json`](trip-import-schema-v3.json) declares it, and
`normalizeTripImport` surfaces each one as an "Ask the customer:" warning. The reading is
version-agnostic — it fires on any payload carrying the array.

[`gem-itinerary-prompt.md`](gem-itinerary-prompt.md), the **quote-request** lane the intake
workbench and the Worker use, still does not ask for it, and
[`trip-import-schema-v2.json`](trip-import-schema-v2.json) sets `additionalProperties: false`
at its root, so a v2 draft that volunteered the array would fail structured-output validation
before it ever reached the importer. The lane that produces the most uncertainty — an inbound
quote from a stranger — is the one still throwing it away.

How it is known: a real inbound quote request (a camp trip, 2026-08-27) produced five things
worth asking about — an unresolved pickup address, an ambiguous return time, and a
split-versus-held-bus decision that changes the price more than any other field. None had
anywhere to go in a v2 draft. That is still true.

Why it was not fixed alongside v3: the quote lane is a different document type with a
different prompt (T8), and repointing it is a behavioural change to the intake page rather
than a field addition. The cheap version is to move that lane onto v3 as well, since v3 is a
superset of v2 — but that is the Worker's `PROMPT_URL`/`SCHEMA_URL` pair
([`worker/index.js:42`](../worker/index.js:42)), and the Worker has never run at all (T4).

Cost to close: one array in the quote prompt, one root property in v2 — or repoint the
quote lane at v3 and delete the divergence. Plus the intake preview rendering the flags as
an "Ask the customer" card with a copy-as-email action, which is still unbuilt.

### T8 — The quote lane still has no lane gate

**Half of this is closed.** The Grid tab has a "Copy prompt + document" button that
assembles [`itinerary-prompt.md`](itinerary-prompt.md) with whatever is pasted, so the
prompt ships with the app instead of being hand-copied — for the *confirmed itinerary*
lane. [`intake.html`](../intake.html) still has no equivalent for the quote lane.

The lane confusion is also smaller than when this was written. It said two documents
arrive at intake.html and the page cannot tell them apart; a confirmed itinerary now goes
to the Grid tab instead, so intake.html is unambiguously the quote lane. What remains is
that nothing on the page says so, and a confirmed itinerary pasted there still produces a
parse error that names neither lane.

See [`itinerary-workflow.md`](itinerary-workflow.md) § Two lanes for which document goes
where.

How it is known: reviewing the page against two real documents of different kinds, and
then building the other lane around it.

Cost to close: a line of copy on intake.html saying what it is for, or the same
"Copy prompt + document" button pointed at `gem-itinerary-prompt.md`. The
`.rux-tabs--attached` lane picker originally proposed is probably now over-built for one
remaining lane.

### T9 — README's load-order snippet is a contract with no test, and it was wrong

The snippet under § Index is what someone copies to stand a new page up. Until
2026-08-28 it omitted `overlay.js` and `boot.js` entirely, and stated that
"only `utilities.js` is strictly required".

Both halves were false. `overlay.js` is the dismiss kernel, and the dependency
is hard rather than graceful — `menu.js`, `popover.js`, `suggestions.js` and
`utilities.js` all call `window.RuxOverlay.register(...)` unguarded, so a page
built from the snippet threw on its first menu, popover, dropdown or modal.
Only `drawer.js` and `ui-shell.js` use `?.`. `utilities.js` was not
self-sufficient either: `Rux.openModal` registers with the kernel.

`tools/vendor-into.sh` has carried the correct rule in its stamp since the
kernel landed ("`overlay.js` first, since the other behaviors delegate
outside-press and Escape to it"). So the repository knew, in one place, and the
README disagreed in another — the one-home rule broken between a script and a
document rather than between two documents.

The prose is fixed. **What is not fixed is that nothing would have caught it.**
Four other counts in the same block had drifted the same way and were corrected
in the same pass: `features/` said 30 against 33 on disk, the skills list was
missing `ponytail-review`, the `rux-ui/js/` list was missing two modules, and
the `js/` tree showed one of its five subdirectories.

How it is known: read while checking the README after a pull.

Cost to close: one test that parses the snippet out of README.md and asserts
every `rux-ui/js/*.js` file appears in it, that `overlay.js` precedes every
module naming `RuxOverlay`, and that the directory counts in the same block
match a `find`. The counts are the cheap half and would have caught four of
the five.


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
