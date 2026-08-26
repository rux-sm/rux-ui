# Rux UI Foundations — Composition

**Contract version: 1.10.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 12 steps: **12 done**
Founding entry. This document answers **what to build**: which **floorplan** a shipped
page takes (§2.9–2.10), and which **anatomy** a view inside the application gets
(§2.1–2.6), given what kind of content each holds. Every other foundation document
answers *what a thing looks like*; none answered *what to build*, and §3's census is
what that omission cost.

**Source: originated here; gap source [Cloudscape](https://cloudscape.design/patterns/),
guidance-only (step 2).** Geist publishes four foundations and 71 component pages and
**no page-composition layer** — the same finding that made `layout.md`'s breakpoints and
`motion.md` originate here rather than adopt. This is the **third**. Where Geist is silent,
**Cloudscape's patterns are the reference this document checks itself against**: 59
published patterns for exactly this genre — dense operational consoles with tables,
editors, and panels — verified live on 2026-08-23. Guidance-only under the standing rule:
its insights are translated into `--rux-*` vocabulary, its names and values are never
adopted, and **Geist still wins wherever it publishes anything**. §2's archetypes remain
read off this application's own views — Cloudscape is the second opinion, not the author.
Nothing in this document is imported.

**The page tier (step 10) keeps the same stance.** Its one borrowed word — *floorplan* —
is SAP Fiori's, whose floorplans name exactly this: a page-level anatomy chosen by what
the page holds. Borrowed as vocabulary only, under the standing guidance-only rule; no
Fiori shape, name, or value is imported. Cloudscape stays the pattern gap source and is
silent here: the 59-pattern index step 2 verified live covers console interiors — tables,
details, create/edit/delete, dashboards — and reaches no standalone page, so the tier
originates in this repository like the archetypes before it.

---

## 1. The vocabulary

A **view** is one destination in the side navigation — one `.rux-app-view`. Exactly one is
visible at a time and the UI header's `<h1>` names it (`typography.md` §3.5).

A view is assembled from four parts, three of them optional:

| Part | Class | Role |
|---|---|---|
| Workspace | `.rux-workspace` | The required centre. One per view. |
| Workspace header | `.rux-workspace__header` | A band above the body for controls and, when the view has one, the record being viewed. |
| Attached panel | `.rux-panel--attached` | A rail docked beside the workspace, sharing its edge. |
| Floating window | `.rux-panel--floating` | A surface above the view, for editing one record. |

An **archetype** is a named combination of those parts, chosen by what the view's body
holds. §2 publishes four.

A **page** is one shipped HTML document. The application is one page among nine; the
rest stand alone — share destinations, redirect stubs, internal specimens. A
**floorplan** is a named page anatomy, chosen by what the page is for, the same way an
archetype is chosen by what a view's body holds. §2.9 publishes four. Print is not a
page — its surfaces live inside the application — and §2.10 governs it as a surface.

---

## 2. Rules

### 2.1 A view picks an archetype; it does not invent anatomy

**Every view MUST be one of the four archetypes in §2.3–2.6.** A view whose content does
not fit one is a defect in this document, fixed by an amendment here — never by the view
composing its own anatomy. That rule exists because the alternative was measured: before the same
day's Settings migration, **92 of 121 framed boxes were hand-rolled** rather than composed
from `.rux-card` (§3 carries the current figures), and three separate hand-built
implementations of "a titled group" existed, none aware of the others.

**Every view MUST declare its archetype: `data-archetype` on the `.rux-app-view`, one of
`records` · `document-column` · `canvas` · `viewer`.** The attribute exists for the
checker — declared intent is what lets `tests/composition-contract.test.mjs` tell a
non-conforming view from a new archetype — and it is deliberately **bare, not
`data-rux-*`**: it is application-layer vocabulary on application markup, the same
standing `data-view` has, and `naming.md` rule 2.5 scopes the `data-rux-*` namespace to
`rux-ui/` only. *(Step 4.)*

### 2.2 Record identity lives in the surface that shows the record

**A floating window's `.rux-panel__title` names the record it holds.** Six of the seven
floating windows already do this, falling back to the type name when empty — "Driver"
until a driver loads, then their name.

**A workspace header MUST NOT restate the module's name** (`typography.md` §3.5). It may
name what is being viewed — a week, a document — and in the records archetype it names
nothing at all, because the table below it is the content and the UI header already says
which table.

### 2.3 Records — a table of many, edited one at a time

The dominant archetype: **four of eight views**, and the target for a fifth.

| | |
|---|---|
| Workspace header | Controls only — a "New …" button, search, scope, view switch, panel toggles. **No title.** |
| Workspace body | A table. Below 720px it becomes a stack — see **2.3.1**. |
| Attached panel | **Optional, and the exception** — secondary configuration only. See **2.3.2**. |
| Floating window | **Required** — the editor, titled with the record. |
| Opening a record | Populates and shows the floating window. It does not navigate. |

**The editor may be a shared, runtime-built window.** Documents' rows open the app-wide
`RuxDocViewer` — the same window the trip panel's Files card uses — rather than a window of
their own. A records view whose editor is shared declares it: `data-editor="shared"` on the
`.rux-app-view`, the same declared-intent mechanism as `data-archetype`, which is what keeps
the enforcement exception-free. And **a records view with no controls may omit the header
band entirely**: Documents' Print and Open-in-new moved into the viewer beside the document
they act on, leaving nothing for a band to hold. *(Step 6.)*

#### 2.3.1 Below 720px a records table becomes a stack, and gives back what `.rux-table` assumes

`layout.md` §1.1 publishes 720px as the width where *"the workspace stops fitting two
columns: side-by-side bodies stack, wide tables shed their money columns."* It says what
changes; it does not say what a **records body** does there, and shedding columns one at a
time is not an answer — it is how Drivers shipped a table whose headers and cells disagreed
(the plan's B1). Four rules, all measured on the Driver Roster specimen at 375px:

- **The header row goes whole, never column by column.** `<thead>` takes `display: none`
  so every cell loses its header at the same moment. A rule that hides one column MUST hide
  its `<th>` and its `<td>` together — key both off the same `[data-col]` — so no cell can
  outlive its header.
- **The four cell properties `.rux-table td` publishes MUST be given back.**
  `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis` and
  `height: var(--rux-table-row-height)` are reasonable under table layout and become hard
  constraints under `display: block`: content cannot wrap, and it truncates *silently*
  rather than showing the ellipsis the property promises. The 36px floor applies per cell
  rather than per row, so an un-reset three-line stack reserves 108px for 20px of text.
- **Roles MUST be declared in the markup.** `display: block` drops the implicit
  `table`/`row`/`cell` roles in every engine. Measured on the specimen at 375px: the
  elements compute to `block`/`grid`/`block`, and the accessible names survive only because
  it carries explicit `role="table"`, `role="row"`, `role="cell"` and
  `role="columnheader"`. Without them the narrow view is a stack of anonymous generics.
- **The band wraps rather than crushing.** `.rux-workspace__toolbar` is `flex-wrap: nowrap`
  by contract, which is right for a desktop table band and unsurvivable at 375px, where
  search, two segmented tracks and a Columns button compress to `Se`, `A`, `Columns`. A
  records band MUST allow its heading and toolbar to take full width and wrap. This lives
  in the view's own block, not `workspace.css`: the shared contract is right for the width
  it was written for, and `.rux-segmented-track`'s `overflow: hidden` (`shell.md` step 5)
  means the failure is silent, so the wrap is what keeps it visible.

The page body MUST NOT scroll sideways. Verified on the specimen at 375px: 0px toolbar
overflow, 0px track clipping, no horizontal document scroll. *(Step 12.)*

#### 2.3.2 A rail holds secondary configuration, never the controls that drive the table

§2.8 says an attached panel is supportive, never essential. In a records view that has a
decidable edge: **controls determining *what the table shows* — search, status scope, the
view switch — belong in the workspace header. A rail may hold only configuration a user
sets rarely and can leave shut**, such as which columns are visible.

The measured failure was Drivers, and it is the same shape as D6: filters lived in a
collapsible rail as nine always-visible radio rows, two of whose options matched zero
records, while the rail was *also* the only home for column configuration — so it could not
simply be closed. With filters in the header the rail has one job left, and one job is a
popover.

**A records view with no rail is the expected case, not a deviation.** Driver Roster ships
with none. *(Step 12.)*

*Checked against Cloudscape's Table view (step 3): its page header **does** carry a title —
the resource-category name — because its chrome is breadcrumbs plus side navigation, with no
persistent module heading. This system's UI header `<h1>` already names the module on every
screen (`typography.md` §3.5), so the same information appears exactly once in both systems.
The divergence is deliberate and stays.*

### 2.4 Document column — a page of settings or prose

| | |
|---|---|
| Workspace header | **None.** The view has no controls of its own and nothing to identify that the UI header does not. |
| Workspace body | A column of `.rux-card`, each one section of the page. |
| Attached panel | None. |
| Floating window | None. |

Settings is the reference. A card here is one framed surface with a header, a body, and a
footer holding its own actions — **not** a section: `.rux-section` titles a *run* of
surfaces, a card titles one (`typography.md` §3.5).

### 2.5 Canvas — one continuous surface you navigate within

| | |
|---|---|
| Workspace header | Controls **and** a live state readout — which slice you are looking at. |
| Workspace body | A custom surface, not a table and not cards. |
| Attached panel | Optional — options for the canvas. |
| Floating window | Required — the editor for whatever the canvas holds. |

The Calendar is the only instance. **Its date range is a readout, not a title**: it carries
`aria-live="polite"` and changes as you page, which is why it does not use
`.rux-workspace__title` and must not be converted to one.

### 2.6 Viewer — WITHDRAWN (step 6; original follows)

| | |
|---|---|
| Workspace header | Controls, and `.rux-workspace__title` naming the record. |
| Workspace body | The rendered record. |

**Withdrawn 2026-08-23 (step 6): the prediction below came true** — Documents became §2.3 and no view declares `viewer`. The section stays as history. Original: this archetype is a candidate for retirement, and §6 Q1 carries the question. Its only
instance is Documents, whose planned move to a table plus the existing `RuxDocViewer`
floating window would make it §2.3 — after which `.rux-workspace__title` has no caller.

### 2.7 Structure that is already published elsewhere

This document owns *which* parts a view gets. It does not restate what those parts are:

- Shell containment, ordering and ARIA — [`shell.md`](shell.md)
- Which title role each container takes — [`typography.md` §3.5](typography.md)
- Insets, the card rhythm, z-index — [`layout.md` §7–§11](layout.md)
- What opens and closes a surface — [`state.md`](state.md)

### 2.8 An attached panel is supportive, never essential

**An attached panel MUST NOT hold the only path to something the view requires.** Adopted
from Cloudscape's Secondary panels — "content must remain secondary, never essential to
task completion" — translated, not copied: their panels are help/drawer/split surfaces, ours
are option rails, but the principle transfers whole. A collapsed rail must cost convenience,
not capability. The census found one violation the day this rule landed: D6.

### 2.9 A page takes a floorplan; only the application composes views

**Every shipped page MUST be one of the four floorplans below.** A page that fits none is
a defect in this document, fixed by an amendment here — never by the page composing its
own anatomy. The same rule as §2.1, one tier up, for the same measured reason: the three
share pages were built with no published anatomy, and §3.1 shows what that cost — three
pages, two header implementations, three answers to where the title lives.

| Floorplan | Pages today | Anatomy |
|---|---|---|
| **Application** | `index.html` | The shell ([`shell.md`](shell.md)): UI header, side navigation, one view visible at a time, each view declaring an archetype (§2.1). Exactly one page carries the view router. |
| **Share** | `request.html` · `driver.html` · `maintenance.html` | One audience, one task, one column: the shared `.rux-ui-header` (brand + the page's name) above a single `<main>`, and nothing beside it — no side navigation, no view router, no attached panels. Floating windows MAY serve documents the page links (`driver.html` carries the shared doc viewer and envelope). The column's measure is the page's own; §3.1 records today's three. |
| **Stub** | `d.html` · `m.html` · `doc.html` | Resolves and leaves: a redirect or a lookup, one status line, no chrome and no design-system obligations. The file SHOULD state its own reason to exist and, where one exists, its deletion condition — `d.html` and `m.html` do; `doc.html` does not (§3.1). |
| **Specimen** | `gallery.html` · `examples/app-layout.html` | Internal references with their own contracts (`tests/gallery-coverage`, the example assertions in `tests/layout-contract.test.mjs`). Not user destinations. Named here so they are exempt from Share rules by classification, not by silence. |

**A share page MUST NOT hand-roll its chrome.** The header is the shared block —
`maintenance.html` composes it with a page variant class, which is the precedent —
because a page a customer or driver reaches from a link is exactly where the product has
one chance to look like itself. `driver.html` violated this from the census until
2026-08-24 — D8, fixed on the `request.html` precedent. Where the page's
`<h1>` lives is genuinely unsettled — three pages, three answers — and is Q6, so this
rule names the block and stops; it does not yet legislate the title's element or
placement.

**A share page whose content loads MUST show a loading state in its `<main>` until it
renders.** Both data-driven pages do — `driver.html` a skeleton of its card anatomy,
`maintenance.html` a spinner with a status line — and `request.html` is static markup
with nothing to wait for. Whether one treatment should be the rule is Q7.

Card discipline inside a share column is deliberately not ruled: `request.html` composes
`.rux-card` sections, `maintenance.html` renders a custom schedule surface the way the
Calendar's canvas legitimately does (§2.5), and one instance each is not a pattern to
read a rule off.

### 2.10 Print is a light-on-paper world

The two print surfaces — the week report `js/panels/print-schedule.js` builds off-screen,
and the trip envelope's printable page — are not pages: both live inside the application
and swap in under `@media print`.

**A print surface MUST publish its own scoped ink palette and MUST NOT consume the
`--rux-` surface tokens.** The screen system is near-black; paper is white, and a print
surface that borrows screen tokens inherits a dark theme it must then fight. Both
instances already conform — `--print-*` scoped to `.sched-print-root`, and the envelope's
equivalent scoped to `.sched-trip-envelope` — so this rule changes nothing rendered; it
gives the discipline a home. The palette *values* stay in the feature CSS where they are
used, and the rationale comments beside them stay what they are: explanation, no longer
the rule's only statement.

---

## 3. Current state

Measured in the browser on 2026-08-23, every view revealed in turn.

| View | Header | Title | Body | Attached | Floating | Archetype |
|---|---|---|---|---|---|---|
| Drivers | ✓ | — | table | 1 | 1 | Records |
| Fleet | ✓ | — | table | 1 | 1 | Records |
| Customers | ✓ | — | table | 0 | 1 | Records |
| Requests | ✓ | — | table | 0 | 1 | Records |
| Settings | — | — | cards | 0 | 0 | Document column |
| Game | — | — | cards | 0 | 0 | Document column *(attached count was 1 at the census — the D7 re-dress on the same day removed it; it was the main surface misdressed, never a rail)* |
| Calendar | ✓ | — | custom | 1 | 1 | Canvas |
| Documents | — | — | table | 0 | shared | Records *(was Viewer at the census — step 6 converted it; the editor is the shared `RuxDocViewer`)* |

**Framed boxes: 118 across the eight views, 83 of them hand-rolled** rather than
`.rux-card`, measured after that day's Settings migration.

| View | Framed | Hand-rolled | `.rux-card` |
|---|---|---|---|
| Calendar | 43 | 23 | 22 |
| Settings | 29 | 21 | 8 |
| Fleet | 18 | 16 | 2 |
| Drivers | 13 | 9 | 4 |
| Game | 6 | 6 | 7 |
| Requests | 4 | 4 | 0 |
| Customers | 3 | 3 | 0 |
| Documents | 2 | 1 | 1 |

That count is the cost of having no §2 — not a tidiness metric, but the number of places
someone had to invent anatomy because none was published. Settings rendered **29 boxes and
zero `.rux-card`** before its migration earlier the same day and is now 21 and 8, which is
the only figure here that moved by intent.

**Two cautions on reading this table.** Calendar's count is **data-dependent** — trip bars
are framed boxes and the number varies with the week on screen, so it is not a stable
baseline. And Game reports 7 `.rux-card` against 6 framed boxes because a bare `.rux-card`
is not a framed card: `card.css` frames only via `:has(> .rux-card__body)`. That mismatch is
D2 made visible in the census itself.

### 3.1 The page census

Read off the files on 2026-08-24 — a static census, unlike §3's live one, because every
fact here is a markup fact: chrome, column, and script list need no runtime state. The
one runtime-shaped claim, what the share scripts build, was checked in the page scripts
themselves.

| Page | Chrome | `<main>` | Measure | Loading | Floorplan |
|---|---|---|---|---|---|
| `index.html` | shell | eight views | fills the viewport | per view | Application |
| `request.html` | `.rux-ui-header`, title in a `<span>`; `<h1>` on the intro | intro, then a form of four `.rux-card` sections, a footer action band, and a hidden success card | 720px, centered | static markup | Share |
| `driver.html` | `.rux-ui-header`; `<h1>` is the header title *(hand-rolled at the census — the D8 fix re-dressed it 2026-08-24)* | JS-built column; shared doc viewer and envelope windows | 520px, centered | skeleton, `aria-busy` | Share |
| `maintenance.html` | `.rux-ui-header` + variant class; `<h1>` is the header title | JS-built schedule surface, hand-rolled boxes | full width, `--rux-space-4` inset | spinner + status line | Share |
| `doc.html` | none | one status line, then `location.replace` to the stored document | — | its status line | Stub |
| `d.html` / `m.html` | none | rename pointers to `driver.html` / `maintenance.html`; deletion condition in a comment | — | — | Stub |
| `gallery.html` | own `gallery-bar` with theme toggle | specimen sections, one per published role | — | — | Specimen |
| `examples/app-layout.html` | the reference shell itself | the smallest complete composition | — | — | Specimen |

Three share pages, two header implementations, three title homes, two loading
treatments plus one static page. This is §3's 83 hand-rolled boxes at the page tier —
caught at three pages instead of 118 boxes. *(As censused. The D8 fix, later the same
day, collapsed the header implementations to one and the title homes to two — Q6 carries
the remaining split.)*

---

## 4. Known defects

| # | Defect |
|---|---|
| D1 | **Fixed (step 8)** — promoted whole to [`shell.md`](shell.md), contract 1.0.0 with its own log; the stale `44px` literal died in the move and `layout.md` §10 claims the token. ~~`../layout-composition.md` holds 29 MUSTs with no contract version and no amendment log~~. |
| D2 | **Fixed (step 9), and one third of it was wrong.** Two rules were homeless and now have homes — the card framing contract in `../cards.md`, the row/cluster choice in the new `../utilities.md`. The third, the itinerary's continuous-surface rule, **was already homed** and this defect misread it: it is rationale beside the code it explains — a legitimate form under the one-home rule — and `../cards.md` already pointed at it as "a deliberate exception, not an oversight". What failed there was reading, not filing. ~~Component anatomy has no documented home.~~ |
| D3 | **Fixed (step 7)** — the four are the **component tier**, each now opening with a governance header: tier statement, the foundation contracts that outrank it with version stamps, and the date its values were checked. ~~`docs/cards.md`, `buttons.md`, `popovers.md`, `ui-header.md` ship to consumers carrying values and no contract version.~~ |
| D4 | **Closed (step 5) — misdescribed, superseded by D7.** ~~The Game view is a Document column carrying an attached rail~~: there is no rail. The census counted `.rux-panel--attached` nodes; the game's one is its **main surface**, not a docked rail, and §2.4 admits no attached panel — the archetype stands unchanged. |
| D7 | **Fixed 2026-08-23, app work.** The surface is a `.rux-card` with card header/body/footer; `tests/composition-contract.test.mjs` now asserts no attached panel in any document column, exception-free. ~~The game's main surface wears `.rux-panel--attached` while docked to nothing.~~ Original: `.flip-seven__panel` sits centered inside `.flip-seven__shell` — `display: grid`, `place-items: center`, `padding: var(--rux-space-6)` — with `max-width: 42rem`. An attached panel's contract is the opposite: docked beside the workspace, sharing its edge, no decorative gutter (`../layout-composition.md`). The vocabulary is borrowed for its chrome — the header band and scrolling body — the same borrowing step 20 unwound when nine `.rux-card__title`s sat in panel headers. The fix is app work: re-dress the surface as a `.rux-card` (header/body/footer — the Hit/Bank bar is a card footer), noting the blast radius: the panel-header tokens give it a 64px band today and a card header floors at 40px, and layout.md step 21's panel sweep counted this header among the eleven it measured. |
| D6 | **Fixed 2026-08-23, app work under §2.8.** ~~The Drivers rail violates §2.8~~: the switch moved into the workspace band beside the panel toggle; the rail keeps its option cards. With the rail closed the view is now both labelled (by the pressed segment) and switchable. Original: the Roster/Workload segmented control — the only way to change which of the two views is active — lives inside the collapsible Table Options rail, and the workspace title that mirrored the active view was removed 2026-08-23 at the owner's direction, with the trade recorded in that commit. With the rail closed, the active view is unlabelled and unswitchable. Fixing it is app work: either the switch moves into the workspace band or the rail stops being the only home. |
| D5 | **Fixed (step 4)** — `tests/composition-contract.test.mjs` enforces the declaration and three decisive anatomy facts per archetype. ~~Nothing enforces §2.~~ A view could compose any anatomy and no test would fail. |
| D8 | **Fixed 2026-08-24, app work — the bare shared header, on the `request.html` precedent.** ~~`driver.html` hand-rolls its chrome: `driver-share-header` with its own `__logo`/`__label` while both sibling share pages compose the shared `.rux-ui-header` (§2.9).~~ The header is now `.rux-ui-header` with brand and `<h1>` title, composed bare. **The prescription's "plus a page variant class" was declined on inspection**: `maintenance.html`'s variant exists to make *its* header sticky over a full-width scroll table, `driver.html`'s centered column needs no page-specific behaviour, a variant class with no rules would fail `tests/class-resolution` — and `trip-request.css`'s own header note had already proved the bare composition (*"nothing about it is specific to this page"*). **Consequences carried**: the title moved from label-18 to the shared `.rux-ui-header__title` (heading-16), so label-18's one app-layer consumer retired and the role returns to published-and-unread — `tests/typography-roles.test.mjs`'s PENDING notes corrected in the same change, `typography.md` steps 27/38/39 left as written, history. The three `--sched-driver-logo-*` tokens died with the hand-rolled block, grepped before (driver.html ×3, driver-share.css rules and tokens, zero js/tests selectors) and after (zero live references; past-tense mentions remain in two test comments and one CSS rationale pointer). The `--sched-driver-page-max-width` the prescription also named is the content column's and survives untouched. **Verified**: served and eyeballed at 375 and desktop in the page's one theme — brand, heading-16 title, hairline seam, the no-token state intact — and 398/398 green with `driver-share.css`'s buster bumped. Evidence corrections in §2.9, §3.1 and Q6 ride with this fix: contract 1.9.0 → **1.9.1**, wording and evidence only. Original prescription: the fix is app work on the `maintenance.html` precedent — the shared block plus a page variant class — and inherits the logo sizing the hand-rolled header carries; Q6 does not block it, because every candidate answer keeps a header. |
| D9 | Nothing enforces §2.9–2.10. A page could compose any anatomy and no test would fail — D5 again, one tier up. Unlike views, pages may need no markup declaration: the file list *is* the census, so a static test can classify by name and assert each floorplan's decisive anatomy (share: shared header, one `<main>`, no view router; stub: no stylesheet; print: no `--rux-` surface token inside the scoped root). That design is this defect's to settle. |
| D10 | `tests/gallery-coverage.test.mjs` reads `gallery.html` alone, but §2 classifies **two** Specimen surfaces and names both contracts in the same row. `examples/app-layout.html` carries specimens for `.rux-app`, `.rux-ui-header`, `.rux-side-nav`, `.rux-workspace` and `.rux-panel` — five of the thirteen that test records as gaps — and it loads `ui-shell.js`, so they behave rather than merely render. The classification and its enforcement therefore disagree, and the disagreement is invisible: a ratchet that under-counts coverage still passes. The census over-states the backlog by five. Fixing it is test work — read both surfaces §2 names, then drop the five from `KNOWN_GAPS`. **Two cautions for whoever takes it.** The panel specimen sets `display: none`, but inside `@media (max-width: 760px)`, so it renders above that and is a real specimen rather than markup that only satisfies a class census — checked, because the two read identically in a grep. And the census is block-level: one instance credits a whole file, so `panel.css`'s `__header`, `__title`, `__footer`, `__tabs` and all four modifiers stay unshown by a passing test. The eight genuine gaps, and R9's unenforced second clause, are process findings and live in `../todo.md` T3 under its routing table. |

---

## 5. Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; publish the four archetypes | **done · Class A** | **Executed 2026-08-23.** Founding entry. Class A throughout: it names a taxonomy that already existed in the application and moves no code, renames nothing, and changes no resolved value. The archetypes are **read off the eight views, not designed** — four of them were already identical, which is what made the set nameable. **Deliberately did not absorb `../layout-composition.md`** (D1): that document's 29 MUSTs are shell containment and ARIA, a different question from which anatomy a view gets, and folding them in during a founding step would mix a relocation with a taxonomy. It is recorded as D1 and left for its own step. **Deliberately did not enforce anything** (D5): a checker would have to decide which archetype a view intends before it can say the view is wrong, and no attribute records that intent yet — §6 Q3. |
| 2 | Adopt Cloudscape as the gap source, guidance-only | **done · Class A** | **Executed 2026-08-23**, at the owner's direction after a sourced comparison. The Carbon residue predates the Geist alignment and is retired as this document's precedent. **Candidates were verified live, not recalled:** Cloudscape's patterns index publishes 59 patterns covering Table view, three Details-page variants, Split view, Secondary panels, Create/Edit/Delete resource, dashboards, Empty states and Density settings — a near-direct map onto §2's archetypes. **Polaris was disqualified by the same check**: its standalone docs now redirect into shopify.dev and `polaris-react` was archived 2026-01, so citing it would inherit its churn. Primer's patterns are interaction/workflow guidance, orthogonal to composition. **Scope of the adoption:** Cloudscape is a *gap* source — consulted only where Geist publishes nothing, guidance-only, translated into `--rux-*` vocabulary, never names or values wholesale. **Deliberately not done:** §2 was not re-audited against Cloudscape's patterns in this step — that audit is real work and is recorded as Q5 rather than rushed into a source-adoption step. No rule, value, or archetype changed. |
| 3 | Q5 answered — §2 audited against Cloudscape's patterns | **done · Class A** | **Executed 2026-08-23**, reading eight pattern pages (Table view, View resources, Split view, the three Details variants, Secondary panels, Density settings). **The archetypes survive; one conjecture in Q5 itself did not.** Q5 guessed the Drivers/Fleet rails "resemble Split view" — they do not: a split panel shows *selected-record details* beside a collection, our rails hold *view options*, which map to Cloudscape's Preferences/drawer. Split view proper — browse-and-compare without opening an editor — has **no instance and no archetype here**, recorded as a recognized absence rather than invented ahead of a need. **One rule adopted, translated:** §2.8, an attached panel is supportive, never essential — and applying it the same day found **D6**, the Roster/Workload switch stranded in a collapsible rail. **Records validated with one explained divergence:** Cloudscape titles its table pages because its chrome has no persistent module heading; ours does, so §2.3's title-less band stands (note added in place). **The Details trio informs Q1 without changing it:** our floating editors are the "Details page with tabs" analog and the trip editor already follows one-tab-one-task; Cloudscape's summary-container-above-tabs — universally relevant info that survives tab switches — is worth weighing when the Documents detail work lands, and is left as an observation, not a rule. **Density: no adoption.** Cloudscape's density is a user-controlled, service-wide preference defaulting comfortable — a product feature. `layout.md` §9.2's dense exception is an author-chosen per-context rule, and its guardrail (never as a general compactness lever) already matches Cloudscape's readability caution. Different mechanisms, both kept. **Deliberately not done:** no Split view archetype, no density feature, and no app change for D6 — the defect is recorded and the fix is its own decision. |
| 4 | Q3 answered — views declare their archetype; §2 becomes enforceable | **done · Class A** | **Executed 2026-08-23.** All eight `.rux-app-view` elements gained `data-archetype`, valued per §3's census: four `records`, two `document-column`, one `canvas`, one `viewer`. **The attribute is bare, and Q3's conjecture that `naming.md` would own it was wrong**: rule 2.5 scopes `data-rux-*` to `rux-ui/`, this is application vocabulary on application markup, and bare `data-view` on the same elements is the standing precedent — recorded here rather than amending a document that has nothing to say. **D5 closes with it**: `tests/composition-contract.test.mjs` asserts the declaration and the decisive anatomy per archetype — only a viewer titles its workspace; records hold a table and a floating editor; a document column has neither header band nor floating window. **The checks carry no exception list** (`CLAUDE.md`: an exception list is not a passing check) — the Game view's stray rail (D4) is *not* asserted against: attached panels are unchecked for document columns until D4 is decided, stated rather than worked around. **The first run of the test caught a real slicer bug**: the last view's segment ran to end-of-file and swallowed the floating surfaces that live outside the views container, flagging Settings for windows it does not contain — the live census had it right, the static slice was wrong, and the test now bounds the final segment. **Verified the test can fail**: flipping one view's archetype fails the suite by name. |
| 5 | Q2 answered, D4 closed — there is no rail | **done · Class A** | **Executed 2026-08-23, at the owner's direction to decide D4.** **The decision: §2.4 stands — a document column admits no attached panel.** No amendment to the archetype, no exception. **D4's premise dissolved under inspection**: the census that raised it counted `.rux-panel--attached` nodes per view and read the game's one as a rail; the markup shows it is the game's **main surface**, centered inside the workspace body and docked to nothing — verified again in this step (exactly one attached panel in the view, zero floating). D4 closes as misdescribed and **D7 records the real defect precisely**: panel vocabulary borrowed un-docked for its chrome. **Unreachability was not used as the answer**: the game has no route control (recorded 2026-08-23 in the flip-seven header commit), but the taxonomy governs shipped markup, not what the navigation happens to expose. **Deliberately not done:** the D7 re-dress — app work with a stated blast radius, its own step — and no test assertion on attached panels in document columns while D7 stands, because a check that needs the game excepted is an exception list, not a rule. Nothing renders differently. |
| 6 | Q1 answered — Documents becomes records; the Viewer archetype retires | **done · Class A** | **Executed 2026-08-23, at the owner's direction** ("a list of all documents … a button to open in a floating window … similar to the envelope and itinerary windows"). The view held **one document** — an iframe stage titled by `.rux-workspace__title`, fed by a menu-in-card in an attached list panel. It is now a `.rux-table` of documents; each row declares its own `data-document-src`/`-title` inline — the markup-only-additions property the old menu had, kept on purpose — and opens the shared `RuxDocViewer`, which gained a **Print** button in its footer for **every** caller (the footer no longer hides when the optional Delete/Replace handlers are absent). Record identity now lives in the floating window's title, as in every other records view. **§2.3 gained two sentences**: the editor may be a shared runtime-built window, declared `data-editor="shared"` — the same declared-intent mechanism as `data-archetype`, so the test's records assertion stays exception-free — and a records view with no controls may omit its header band. **§2.6 is withdrawn** with its text preserved; the enforcement strengthened both ways — `viewer` left the archetype set, and **no view may carry a workspace title now**, asserted for all eight. **Deliberately not done:** `.rux-workspace__title` and the orphaned `.rux-workspace__heading`/`__subtitle` CSS were **not removed** — zero callers makes that Class C, which stops and proposes; the proposal accompanies this step rather than being executed by it. The trip-panel and tasks flows that share the viewer were smoke-checked through the viewer itself, not re-run end to end; the one behavioural change they inherit is the always-present footer, now carrying Print. |
| 7 | Q4 answered — the component docs are a governed tier, not foundations | **done · Class A** | **Executed 2026-08-23.** The architecture already existed and only needed naming: `foundations/motion.md` declares `../motion.md` its **component tier** — recipes consuming the vocabulary, outranked where they touch — and the four D3 documents are the same kind of file. Promoting them to family foundations was declined against `forms.md` Q2's own gate (families earn a foundation document when their **rules** span concerns; these are recipes), and pointer-izing them would delete the only home of legitimate component contracts. **Each now opens with a governance header**: tier, the outranking contracts with versions, and the check date — the version anchor D3 said consumers lacked, without minting four amendment logs. **The stamps were earned, not asserted**: buttons' 32/40/24 heights match `--rux-button-height-*` (44 in the ≤500px block); ui-header's 40/44 match `--rux-ui-header-height` and the touch block; cards' token census names only live tokens; popovers carries no values at all. **One stale value found and removed**: ui-header glossed `--rux-radius-control` as "(4px)", a literal beside a token reference — the one-home failure mode — deleted rather than updated, since the token is the home. **One numbering defect found**: layout.md carried two Q5s (step 26 there). `DOCS_SHIP` is unchanged — the tier ships; that is what the stamps are for. **Deliberately not done**: a deep line-by-line audit of all four against every foundation MUST — the headers make each future reading self-policing, and D1 (`layout-composition.md`, 29 MUSTs) remains open and is not shrunk by this step. |
| 8 | D1 fixed — `layout-composition.md` promotes to `shell.md` | **done · Class A** | **Executed 2026-08-23.** The one-home test decided the direction: 29 MUSTs are foundation material, so the file became a foundation document rather than gaining a tier header — the opposite call from step 7's four, for the stated reason (those are recipes; this is rules). Content moved verbatim; `tests/layout-contract.test.mjs` moved its read path so enforcement never lapsed; the old path is a shipping stub so the twelve referencing files and the vendored consumer keep resolving, with live pointers updated and log history left as written. One correction rode along — the `44px` header literal contradicted `--rux-ui-header-height`'s 40px desktop value (fixed in the move; `layout.md` step 27 claims the token). `shell.md` records its own D1: the example file the contract cites no longer shows the contract's composition. |
| 9 | D2 fixed — two homeless rules get homes; the third never was | **done · Class A** | **Executed 2026-08-23.** **`.rux-card` frames only via `:has(> .rux-card__body)`** — a bare `.rux-card` is an unstyled structural marker — is now stated in `../cards.md`'s anatomy, with the failure mode named: adding the class to a bodyless element produces no visible card, which cost two debugging cycles in one session (the itinerary day group and Settings' "App Updates"). **`.rux-u-row` vs `.rux-u-cluster`** got a home by giving the whole family one: `../utilities.md`, a component-tier document under step 7's governance header, covering all seven `.rux-u-*` classes (36 uses in app markup) — the family had **no document at all**, and `typography.md` §3.3 explicitly scopes them out. It ships with its siblings via `DOCS_SHIP`. **The third rule was already homed, and this defect was wrong about it**: the itinerary's continuous-surface rule is rationale beside the code it explains, which `CLAUDE.md` names a legitimate form, and `../cards.md` already pointed at it. The session that nearly overturned it failed to *read* the file header, not to find a home — recorded rather than fixed, because manufacturing a third relocation to match the defect's count would be worse than correcting the count. **Both CSS comments became pointers**, keeping their explanation and surrendering the rule. |
| 10 | The page tier — four floorplans; the print rule gets its home | **done · Class A** | **Executed 2026-08-24, at the owner's direction** ("draft the page floorplans doc first"). **The home was the first decision**: the ask arrived as a new document, and the one-home rule routed it here — this document already answers *what to build*, and a `floorplans.md` beside it would split one question across two authorities; the same test step 8 ran, landed the other way for the stated reason. **The floorplans are read off the nine shipped pages, not designed** (§3.1): a static census, unlike §3's live pass, because chrome, column, and script list are markup facts — the one runtime-shaped claim, what the share scripts build, was checked in the page scripts themselves. **The word is SAP Fiori's, the taxonomy is not**: *floorplan* names exactly this and is borrowed as vocabulary only under the standing guidance-only rule; Cloudscape stays the gap source and is silent here — the 59-pattern index step 2 verified live is console interiors throughout and reaches no standalone page, so the tier originates like the archetypes before it. **One rule consolidated (§2.10)**: print's light-on-paper discipline was stated only as rationale beside the two scoped palettes in `print-schedule.css` and `trip-envelope.css`; the MUST now has a home, the values stay in the feature CSS, and the comments stay rationale — unedited, because they explain values and no longer carry the rule alone. **Found and recorded, not fixed**: D8, and two divergences no rule can be read off — the title's home (Q6) and the loading treatment (Q7). **Deliberately not done**: no enforcement (D9 — D5's stance repeated, with the design note that a page checker needs no markup declaration because the file list is the census); no card-discipline rule for share columns (one instance each way — §2.9 declines it with the reasons in place); no stub cleanup (`doc.html` states no reason-to-exist while `d.html`/`m.html` do — recorded in §2.9 and §3.1 as a SHOULD gap, below a defect's threshold). Class A throughout: rule text only, nothing renders differently, no name moves. |
| 12 | §2.3 gains a narrow-width contract and a rail test | **done · Class A** | **Executed 2026-08-26**, ahead of the Driver Roster code rather than after it, because four more record views inherit whatever the first one does. Both halves were **built before they were written**: `driver-roster-specimen.html` renders §3 of `../driver-roster-plan.md` against the real stylesheets so the "no new tokens, no new classes" promise could fail rather than be asserted. It failed once — the header band — and that failure was **not** a composition defect but a shell one, fixed as `shell.md` step 5 and deliberately not absorbed here. **2.3.1 — the narrow rule.** `layout.md` §1.1 already published 720px; what a *records body* does there was stated nowhere, and the gap is not academic: Drivers shipped a table that hid `<td>`s by one class and `<th>`s by another, so every column right of Phone rendered one place left of its own header (plan B1, measured six headers against five cells at 375px). Four rules, each measured on the specimen: the header row goes whole; the four properties `.rux-table td` publishes — `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `height: var(--rux-table-row-height)` — are given back, because under `display: block` they stop content wrapping and truncate it **silently** while the 36px floor applies per cell rather than per row; roles are declared in markup, since `display: block` drops the implicit `table`/`row`/`cell` roles and the specimen's elements compute to `block`/`grid`/`block` at 375px; and the band wraps instead of crushing search, two tracks and Columns into `Se`, `A`, `Columns`. Verified at 375px: 0px toolbar overflow, 0px track clipping, no horizontal document scroll. **2.3.2 — the rail test.** §2.8's "supportive, never essential" had no decidable edge, so Drivers put its only filters in a collapsible rail — nine always-visible radio rows, two options matching zero records — while that rail was also the sole home for column configuration, so it could not be closed. The edge is now stated: controls determining what the table shows belong in the header; a rail holds only configuration a user can leave shut. **A records view with no rail is the expected case**, which is what the §2.3 row said backwards by naming which views happen to have one. **Deliberately not done:** the band-wrap rule is scoped to the view's own block rather than patched into `workspace.css` — the shared `flex-wrap: nowrap` is correct for the width it was written for, and widening it would reach every consumer's toolbar. The shipped Drivers, Fleet, Customers and Requests tables are **not** migrated to 2.3.1; the rule binds new work and those four are rebuilt on their own schedule, with B1 patched in place meanwhile. No enforcement written — D5's checker asserts anatomy, not breakpoint behaviour, and a test for this is real work rather than a line. Additive throughout: no rule changed meaning, no name moved, nothing renders differently until a view opts in. Contract 1.9.2 → **1.10.0**. |
| 11 | Record the Specimen census defect (D10) | **done · Class A** | **Executed 2026-08-24.** Wording and evidence only — patch **1.9.1 → 1.9.2**; no rule changes, nothing renders differently, no name moves. §2's Specimen row has named two surfaces and two contracts since it was written, but `tests/gallery-coverage` has only ever read one of them — so the row's classification and its enforcement have disagreed from the start, and nothing could surface it, because a coverage ratchet that under-counts still passes. **Found from outside the document**, checking an external design-system audit's "every component has a specimen" item against this repository; the defect is this document's, but no work inside it would have looked. **Verified rather than reasoned:** the five blocks were read out of `examples/app-layout.html`'s markup, and the panel specimen was checked for *visibility* — its `display: none` sits inside `@media (max-width: 760px)`, so it renders above that. Dead markup that satisfies a class census and a live specimen are indistinguishable to the test, which is the trap this check exists to avoid. **Recorded, not fixed** — the fix is test work carrying a decision (whether the example counts as coverage at all, taken yes on 2026-08-24), and this document moves no code. **Deliberately did not** record the gallery's other two findings here: that the page loads no behavior modules against R9's "with behavior modules loaded", and that `README.md:41` advertises the opposite, are process and tooling findings whose home is `../todo.md` under its own routing table. **Deliberately did not** claim R9 for this document either — `foundations/README.md` §1 routes R9 to `CLAUDE.md`, that pointer is dead, and moving a rule between homes is its own step with its own reasoning, not a rider on recording a defect. |

---

## 6. Open questions

**Q1 — Does the Viewer archetype survive? — ANSWERED: no.** *Answered 2026-08-23 with step 6: Documents is a records view, §2.6 is withdrawn, and `.rux-workspace__title` has zero callers — its removal is Class C and stops for a proposal rather than riding along. Original text follows.*

**Q1 (original) —** Its only instance is Documents, and the owner
has stated it will become a table plus the existing `RuxDocViewer` floating window — §2.3.
If that lands, §2.6 should be withdrawn rather than kept for a hypothetical, and
`.rux-workspace__title` loses its last caller, which is a **Class C** removal.

**Q2 — Does Document column admit an attached rail? — ANSWERED: no, and there is no rail.** *Answered 2026-08-23 with step 5: the premise was a census artifact — the archetype census counted `.rux-panel--attached` nodes and read the game's one as a rail. It is the game's main surface. See D7. Original text follows.*

**Q2 (original) —** The Game view has one and Settings
does not. Either the rail is optional in §2.4 or the Game view is non-conformant (D4). It
is also the view with no route control, so the question may be moot.

**Q3 — Should a view declare its archetype? — ANSWERED: yes, `data-archetype`, bare.** *Answered 2026-08-23 with step 4. One conjecture corrected: `naming.md` did not need to own the attribute — rule 2.5 scopes `data-rux-*` to `rux-ui/`, and this is application vocabulary on the `data-view` precedent. Original text follows.*

**Q3 (original) —** D5 cannot be enforced without knowing what a
view intends. A `data-archetype` attribute would make §2 checkable, at the cost of a name
in the markup that exists only for the checker. `naming.md` would own the attribute if so.

**Q4 — Where do the component documents go? — ANSWERED: they stay, as the component tier, governed.** *Answered 2026-08-23 with step 7. Two corrections to this question's own text: the citation "layout.md Q5" was ambiguous because layout.md carried **two** Q5s — step 17 had appended the cards question under a number §6 already used (now its Q6, answered) — and that question did know the file existed; this question misread it. Original text follows.*

**Q4 (original) —** D3's four ship with values and no contract.
They could become foundation documents, become pointers into one, or stay as they are with
their status stated. `layout.md` Q5 asks a version of this about cards specifically, and
appears not to know `docs/cards.md` already exists.

**Q5 — Does §2 survive an audit against Cloudscape's patterns? — ANSWERED: yes, with one adopted rule (§2.8), one defect (D6), and one refuted conjecture.** *Answered 2026-08-23 with step 3. Original text follows.*

**Q5 (original) —** Step 2 adopted Cloudscape
as the gap source without re-deriving the archetypes from it. The obvious candidates for
that audit: Cloudscape's **Split view** (a collection paired with a split panel) has no
archetype here and the Drivers/Fleet attached rails resemble it; its three **Details page**
variants may inform what replaces §2.6 if the Viewer retires (Q1); and **Density settings**
speaks to `layout.md` §9.2's dense exception. Each finding would be its own classified step.

**Q6 — Where does a share page's `<h1>` live?** Three pages, three answers, measured in
§3.1: `maintenance.html` makes the header title the `<h1>`; `request.html` demotes the
header title to a `<span>` and puts the `<h1>` on the intro ("Tell us about your trip");
`driver.html`'s sits inside its hand-rolled header (D8). [`typography.md`](typography.md)
§3.5 owns the *application* header's `<h1>`; whether that rule extends to a page with no
side navigation and no views is exactly what is undecided. Settling it moves rendered
markup on at least one page, so it is an owner's call, not a census read: header-as-`<h1>`
makes `request.html`'s span the fix; content-as-`<h1>` moves `maintenance.html`'s. There
is also a real argument for the split as it stands — a customer-facing page may want its
heading to speak ("Tell us about your trip") while an operational share page wants it to
name ("Maintenance Schedule") — and if that is the answer, the rule is *which kind of page
gets which*, stated here. Until then §2.9 requires the shared block and stays silent on
the title's element.

*(2026-08-24, after the census: the D8 fix moved `driver.html` onto the shared header
with the `<h1>` as its title — the `maintenance.html` pattern — so the split is now two
operational pages titling the header against `request.html`'s content-`<h1>`. The
question stands, smaller, and the which-kind-gets-which reading gained its second
instance.)*

**Q7 — Is one loading treatment the rule?** The two data-driven share pages load
differently: `driver.html` renders a skeleton of its card anatomy under `aria-busy`,
`maintenance.html` a spinner with a status line. Both are legitimate; three share pages
is early to freeze one, and the answer may be per-content — a skeleton promises a shape,
a spinner promises nothing, and a page whose rendered anatomy is stable enough to
skeleton is a page that has already decided its layout. Blocks nothing today; recorded
so the fourth share page does not invent a third treatment unaware.
