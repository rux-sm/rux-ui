# Driver Roster — rebuild plan

Status: **in progress**, written 2026-08-26. **Done:** 0 (ID strip), 1 (B1), 2 (status fold),
3 — all three amendments, 4 (the view), 5 (the table, including the Columns popover).
**Not started:** 6 (Workload on its own table), 7 (the editor), 8 (the two tests), 9 (cut over).

Rebuilds the Drivers module (`index.html`, `data-view="drivers"`) as a new view,
`driver-roster`, beside the current one rather than in place of it. The current module keeps
working until the replacement is accepted; step 9 is the only breaking step.

**Driver Roster is the reference, not a conformant sibling.** Fleet, Customers, Requests and
Documents are rebuilt after it, so "what Fleet does today" is not an argument here — it is a
thing that changes later. That is why steps 3's amendments come before any code: four more
record views inherit whatever this one decides.

The specimen this plan was probed against, `driver-roster-specimen.html`, **graduated on
2026-08-26** into [`examples/records-view.html`](../examples/records-view.html) — the
reference composition for the records archetype, checked by
`tests/records-example.test.mjs` against the sections it demonstrates. A probe and a
reference are different jobs, and keeping both would have been two artifacts drifting.

Working document with the full review, the mockup and the rejected alternatives:
the *Driver Roster Rebuild* artifact (private). This file is the operative summary.

---

## 1. What the review found

Measured in the browser on 2026-08-26 against the live project, at 1440×900 and 375×812,
both themes. The module already conforms to `foundations/composition.md` §2.3 — right
archetype, controls-only header, editor titled with the record, D6 already fixed. The shell
is not the problem; the information design and three defects are.

### Verified defects

| # | Defect | Where |
|---|---|---|
| B1 | At ≤720px the Phone `<td>` hides via `.col-phone` but its `<th>` carries only `data-col="phone"` and stays — six headers, five cells. Every column right of Phone is shifted one to the left. Reproduced at 375px. | `driver-app.css:244`, `driver-panel.js:649,666` |
| B2 | `drivers.status` holds three values — `active` (25), `inactive` (9), `inactive_historical` (6) — and the filter offers All / Active / On leave / Inactive with an equality compare. The six historical records match no option but "All", and render as the word "Inactive". | `driver-panel.js:215,1606–1611,1631` |
| B3 | The "Next trip" column is `defaultOn: true` and renders a literal em-dash for every driver in every state. | `driver-panel.js:750–755` |
| B4 | **Two disjoint populations both mean "legacy import placeholder", and they disagree.** Six rows were `status = 'inactive_historical'` and carry no short name, hire date, notes or expiry dates — structural stubs. A *different* five rows carry notes reading "Inactive historical placeholder created for the … legacy import" and do have short names. The sets do not overlap, and **one of the five is `status = 'active'`** — a record whose own notes call it an inactive placeholder while it sits in the roster's default Active scope. No false expiry alerts result (`notification-db.js:22` returns false on a null date), so the effect is confined to the roster count. Found 2026-08-26 while verifying step 2. | `drivers.notes` / `drivers.status` |

### System conformance

| # | Finding | Rule |
|---|---|---|
| S1 | Roster cells interpolate raw database text into `innerHTML`. `escapeHtml` is applied to the name and nothing else; the workload renderer at `:396` escapes everything, so the two paths disagree about the same data. | — |
| S2 | `driver-app__driver-name`, `driver-app__row` and `driver-app__workload-row` are written by JS and defined in no stylesheet. The notes cell borrows `fleet-app__truncate` from another block. `class-resolution.test.mjs` enforces this rule but reads only `.rux-*`, so app-tier blocks pass it. | `naming.md` R1, R5 |
| S3 | `floating-window.js` never calls `RuxOverlay.register`, so Escape does not dismiss and focus is not trapped. Verified: `hidden === false` after Escape. **All seven floating editors share this** — shared-tier, fixed separately. | `state.md` R7 |
| S4 | Rows are `<tr tabIndex=0>` with a click and keydown pair each, re-bound every render, and read as bare `generic` nodes in the accessibility tree. The priority indicator is a colour dot labelled only by `title`. | — |
| S5 | Filter lists put `role="menuitemradio"` children inside a `role="radiogroup"` container. | — |
| S6 | Four error paths write `style="color:var(--rux-danger)"` inline and hardcode `colspan="6"` while the real count is `2 + activeCols.length`. | project policy |
| S7 | The driver save catches errors into `console.error` and nothing else — no toast, no message, dialog stays open. **A failed save is indistinguishable from a successful one.** | `driver-panel.js:1219–1221` |

### Information design

- **No search** over 40 records. `rux-ui/js/suggestions.js` already ships and nothing here uses it.
- **Filters are permanent rail furniture** — nine always-visible radio rows, two of whose options (Contract, Seasonal) match zero records. In Workload the Filters card is hidden entirely, so that view cannot be filtered at all.
- **Employment carries almost nothing** — 28 full-time, 12 part-time, plus a colour dot labelled only by `title`.
- **Notes carries three unmodelled things** — see §2.
- **Workload is a wall of warning triangles** — 603 assignments have no pay and 405 trips no mileage, so nearly every cell renders `— ⚠` while the footer alert already states both totals once. Both views also share one `<table>` node, each rebuilding the other's `<thead>`.

---

## 2. `drivers.notes`

The column is absorbing three unrelated things with three different sensitivities and three
different lifecycles: identity data, termination records, and legacy-import provenance.

The identity half is governed by `CLAUDE.md` § Data and Risk (decided 2026-08-21) and is
being remediated separately — `supabase/drivers-notes-id-strip.sql`, which the owner runs.
**That patch is remediation, not the fix.** The fix is structural and belongs to step 7:
model what the column is carrying so nobody has a reason to type an identifier into a
textarea again. **B4 is the sharpest case for that work**: provenance is currently asserted
in two places that name different records, and step 2 removed the status half without
reconciling them — deliberately, since reconciling them is modelling, not a status fold. Until then, treat every column this client reads as public — the app
authenticates as `anon` with the key in page source and has no authentication of any kind.

---

## 3. The design

Same archetype, same components. **No new `--rux-*` primitive or semantic token and no new
`.rux-*` class.**

1. **Search is the primary control** — `.rux-input` in the workspace header over name, short name, phone and licence number.
2. **Status becomes a scope with counts** — `.rux-segmented-track` in the header. Two scopes plus All, since step 2 folded the third bucket rather than naming it; labels the current scope without a title, defaults to 25 rows instead of 40.
3. **One compliance column, always on** — nearest of CDL and medical expiry, using the warning/danger treatment `licExpiryClass` already writes. Today it is off by default while Licence # is on.
4. **Employment and priority fold into one "Standing" cell, with words** — not a tooltip-only dot.
5. **Notes leaves the roster** — indicator only; text lives in the editor.
6. **No attached rail** — filters move to the header, column config becomes a `.rux-menu` popover. The drawer, resize gutter, mobile toggle and open-on-desktop rule all retire with it.
7. **A real layout below 720px** — two-line rows, not a horizontal scroller.

### Column plan

| Today | Proposed | Why |
|---|---|---|
| Driver | Driver + short name | Short name is how drivers are referred to; it was an off-by-default column. |
| Employment *(fixed)* | Standing *(fixed)* | Employment tag + labelled priority in one cell. |
| Phone | Phone | Unchanged. Hidden by `[data-col]` on mobile so the header goes with it. |
| Licence # | **Compliance** | Nearest of CDL / medical expiry. The number moves to optional. |
| Notes | Notes indicator | Text moves to the editor. |
| Email | Email *(optional)* | Present on 11 of 40. |
| Next trip *(stub)* | Next trip — **only if built** | Needs a join on `trip_drivers`. Ship it working or not at all. |

### Anatomy, against `foundations/composition.md` §2.3

| Part | Contents |
|---|---|
| `workspace__header` | New Driver · search · status scope · Roster/Workload · Columns |
| `workspace__body` | One `.rux-table`, two-line rows below 720px. Workload gets its own table element. |
| `panel--attached` | **None.** |
| `panel--floating` | Rebuilt in phase 2. |

---

## 4. Sequence

Amendment classes are `foundations/README.md` §2.1.

| # | Step | Class |
|---|---|---|
| 0 | Run `supabase/drivers-notes-id-strip.sql`. Owner-run; it deletes data. **Done 2026-08-26.** Verified from the `anon` position: 0 notes match the ID pattern, 0 carry any nine-digit run, and the `private` backup is unreachable over REST (`PGRST205`). Section 5 — dropping that backup — is still pending and deliberate. | — |
| 1 | Patch B1 in the current module — hide by `[data-col]` so header and cell go together. **Done 2026-08-26.** `driver-app.css` now keys the ≤720px rule off `[data-col]`, and the dead `.col-phone` / `.col-expiry` classes are gone from `driver-panel.js` — they existed only for that selector and resolved to no rule once it changed. Verified at 375px against live data: five visible headers, five visible cells, same columns in the same order. | A |
| 2 | Settle the status vocabulary. **Answered 2026-08-26 by the owner: `inactive_historical` folds into `inactive`** — two values, so the scope control is All / Active / Inactive. Patch written, owner-run: `supabase/drivers-status-historical-fold.sql`. | data |
| 3 | **Three** amendments, **before any code**. (iii) landed first because the specimen forced it. **(i) pending** — what a records table does below 720px; `layout.md` §1.1 publishes the width but nothing states what changes there for a records body. **(ii) pending** — the attached rail's status, since `composition.md` §2.3 calls it "Optional" and cites Drivers and Fleet as having one. **(iii) done 2026-08-26** — the table band sizes its heading to content so the toolbar takes the rest: `shell.md` step 5, contract 1.2.1 → **1.3.0**, Class B. Found by building the specimen, not by reading the CSS. Both halves carried `flex: 1 1 auto`, so at 1440px the heading took 761px to hold 122px and the specimen's 801px toolbar lost 103px and 66px off its two tracks — silently, because `.rux-segmented-track` is `overflow: hidden`. Measured across all four shipped `--table` bands: Fleet and Customers have no `__heading` and are untouched; Drivers and Requests resize and **no toolbar child moves a pixel**. Requests was 58px from the same clip. | A + **B** |
| 4 | Scaffold the view — `scheduler/css/features/driver-roster.css`, `js/panels/driver-roster-panel.js`, block `driver-roster`. Side-nav item, `data-archetype="records"`, router `allow`, lazy boot. | A |
| 5 | **Phase 1 — the table.** Header band, narrow layout, Columns popover. Cells via `textContent` (closes S1 by construction), one delegated `<tbody>` listener, real row semantics (S4). Editor markup copied across as scaffolding only. | A |
| 6 | Workload on its own table element; missing-data warning moves from the cells to the column header. | A |
| 7 | **Phase 2 — the editor.** Opens with §2's modelling question, then the layout: thirteen fields in one Profile pane, five tabs, and S7's silent save. | A |
| 8 | Two tests: widen `class-resolution` past `.rux-*` to app-tier blocks (would have caught S2); assert every `[data-col]` hides as a header/cell pair (would have caught B1). | A |
| 9 | Cut over and delete `driver-app`. **Stops and proposes first**, rename grep protocol, own recorded step. | **C** |

Not in this plan: **S3**, the `RuxOverlay` registration for floating windows. It is shared-tier
and affects all seven editors; slipping it into an app-tier rebuild is how a behavioural change
reaches the vendored consumers having tripped nothing.

### Blast radius

Measured 2026-08-26. Assignments live in `trip_drivers.driver_id → drivers.id`; **629 rows total**
— 546 held by the 25 active drivers, 68 by the 9 inactive, **15 by the 6 `inactive_historical`**.

Nothing gates assignment eligibility on `drivers.status`; the only reader outside
`driver-panel.js` is `notification-db.js:96`, which uses `status === "active"` for licence and
medical expiry warnings, and every candidate answer to step 2 keeps those six non-active.

**Those six records are not deletable.** Step 2 folded them into `inactive` rather than naming
them — a status change, never a removal, or past trips lose their driver. What that fold costs
is recorded in the patch: the six are import stubs, carrying a name and a `driver_ref` and
nothing else (no short name, hire date, notes, or expiry dates, where the other 34 all carry
some), and after the fold that distinction survives only as an absence of data rather than as a
fact. Modelling it properly, if it is worth keeping, is step 7's question alongside notes.

Steps 1, 3–6, 8 and 9 touch CSS, markup and rendering only — no data path. Step 2 and step 7's
notes modelling are data migrations and need the same preview-and-rollback treatment as step 0.

---

## 5. Rejected

- **Card grid instead of a table.** §2.3 puts a table in a records body, and dispatch compares across rows. Rejecting this is the point of having the archetype.
- **Workload as its own view.** Defensible — it is a date-ranged report, not a roster — but its rows open the driver editor, so it is a records body by the archetype's own test. Its own table element solves the actual coupling.
- **Promoting the editor to a shared window during phase 1.** §2.3 publishes the vocabulary (`data-editor="shared"`), but it means editing the module being replaced. Temporary duplication that dies at cutover is the lower-risk trade.
- **A `CHECK` constraint on `notes` now.** The only mechanical control available while the app is unauthenticated, and it would have caught the original entry — but S7 means a rejected save looks exactly like a successful one. Written into the patch, left commented, waits on step 7.
- **Deleting the `notes` column outright.** Closes the exposure in one line and destroys the termination records and import provenance, which are wanted — just unmodelled.
- **Standing up authentication as a response to the above.** The only thing that would let this app legitimately hold sensitive fields, and weeks of work across every table. It deserves deciding on its own merits, not under pressure from an incident with a cheaper correct answer.
