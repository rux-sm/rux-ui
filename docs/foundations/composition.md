# Rux UI Foundations — Composition

**Contract version: 1.4.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 5 steps: **5 done**
Founding entry. This document answers **which anatomy a view gets**, given what kind of
content it holds. Every other foundation document answers *what a thing looks like*;
none answered *what to build*, and §3's census is what that omission cost.

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
| Workspace header | Controls only — a "New …" button, panel toggles. **No title.** |
| Workspace body | A table. |
| Attached panel | **Optional** — table/view options. Present on Drivers and Fleet, absent on Customers and Requests. |
| Floating window | **Required** — the editor, titled with the record. |
| Opening a record | Populates and shows the floating window. It does not navigate. |

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

### 2.6 Viewer — one record rendered whole

| | |
|---|---|
| Workspace header | Controls, and `.rux-workspace__title` naming the record. |
| Workspace body | The rendered record. |

**This archetype is a candidate for retirement**, and §6 Q1 carries the question. Its only
instance is Documents, whose planned move to a table plus the existing `RuxDocViewer`
floating window would make it §2.3 — after which `.rux-workspace__title` has no caller.

### 2.7 Structure that is already published elsewhere

This document owns *which* parts a view gets. It does not restate what those parts are:

- Shell containment, ordering and ARIA — [`../layout-composition.md`](../layout-composition.md)
- Which title role each container takes — [`typography.md` §3.5](typography.md)
- Insets, the card rhythm, z-index — [`layout.md` §7–§11](layout.md)
- What opens and closes a surface — [`state.md`](state.md)

### 2.8 An attached panel is supportive, never essential

**An attached panel MUST NOT hold the only path to something the view requires.** Adopted
from Cloudscape's Secondary panels — "content must remain secondary, never essential to
task completion" — translated, not copied: their panels are help/drawer/split surfaces, ours
are option rails, but the principle transfers whole. A collapsed rail must cost convenience,
not capability. The census found one violation the day this rule landed: D6.

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
| Game | — | — | cards | 1 | 0 | Document column (with a stray rail) |
| Calendar | ✓ | — | custom | 1 | 1 | Canvas |
| Documents | ✓ | ✓ | document | 1 | 0 | Viewer |

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

---

## 4. Known defects

| # | Defect |
|---|---|
| D1 | **`../layout-composition.md` holds 29 MUSTs with no contract version and no amendment log**, while shipping to consumers and calling itself canonical. It is more rule-bearing than any foundation document and is governed by none of the machinery. It also states a value — the `44px` header-control contract at its line 59 — which `CLAUDE.md`'s one-home test forbids outside a foundation document. |
| D2 | **Component anatomy has no documented home.** Of six structural rules surfaced on 2026-08-23, **three exist only as code comments**: that `.rux-card` frames only via `:has(> .rux-card__body)`, that a day group reads as one continuous surface rather than boxed rows, and that `.rux-u-row` is the non-wrapping counterpart to `.rux-u-cluster`. The first cost two debugging cycles in one session — the class was right and the box did not appear. |
| D3 | **`docs/cards.md`, `buttons.md`, `popovers.md`, `ui-header.md` ship to consumers carrying values and no contract version.** Same governance gap as D1, smaller blast radius. |
| D4 | **Closed (step 5) — misdescribed, superseded by D7.** ~~The Game view is a Document column carrying an attached rail~~: there is no rail. The census counted `.rux-panel--attached` nodes; the game's one is its **main surface**, not a docked rail, and §2.4 admits no attached panel — the archetype stands unchanged. |
| D7 | **The game's main surface wears `.rux-panel--attached` while docked to nothing.** `.flip-seven__panel` sits centered inside `.flip-seven__shell` — `display: grid`, `place-items: center`, `padding: var(--rux-space-6)` — with `max-width: 42rem`. An attached panel's contract is the opposite: docked beside the workspace, sharing its edge, no decorative gutter (`../layout-composition.md`). The vocabulary is borrowed for its chrome — the header band and scrolling body — the same borrowing step 20 unwound when nine `.rux-card__title`s sat in panel headers. The fix is app work: re-dress the surface as a `.rux-card` (header/body/footer — the Hit/Bank bar is a card footer), noting the blast radius: the panel-header tokens give it a 64px band today and a card header floors at 40px, and layout.md step 21's panel sweep counted this header among the eleven it measured. |
| D6 | **Fixed 2026-08-23, app work under §2.8.** ~~The Drivers rail violates §2.8~~: the switch moved into the workspace band beside the panel toggle; the rail keeps its option cards. With the rail closed the view is now both labelled (by the pressed segment) and switchable. Original: the Roster/Workload segmented control — the only way to change which of the two views is active — lives inside the collapsible Table Options rail, and the workspace title that mirrored the active view was removed 2026-08-23 at the owner's direction, with the trade recorded in that commit. With the rail closed, the active view is unlabelled and unswitchable. Fixing it is app work: either the switch moves into the workspace band or the rail stops being the only home. |
| D5 | **Fixed (step 4)** — `tests/composition-contract.test.mjs` enforces the declaration and three decisive anatomy facts per archetype. ~~Nothing enforces §2.~~ A view could compose any anatomy and no test would fail. |

---

## 5. Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; publish the four archetypes | **done · Class A** | **Executed 2026-08-23.** Founding entry. Class A throughout: it names a taxonomy that already existed in the application and moves no code, renames nothing, and changes no resolved value. The archetypes are **read off the eight views, not designed** — four of them were already identical, which is what made the set nameable. **Deliberately did not absorb `../layout-composition.md`** (D1): that document's 29 MUSTs are shell containment and ARIA, a different question from which anatomy a view gets, and folding them in during a founding step would mix a relocation with a taxonomy. It is recorded as D1 and left for its own step. **Deliberately did not enforce anything** (D5): a checker would have to decide which archetype a view intends before it can say the view is wrong, and no attribute records that intent yet — §6 Q3. |
| 2 | Adopt Cloudscape as the gap source, guidance-only | **done · Class A** | **Executed 2026-08-23**, at the owner's direction after a sourced comparison. The Carbon residue predates the Geist alignment and is retired as this document's precedent. **Candidates were verified live, not recalled:** Cloudscape's patterns index publishes 59 patterns covering Table view, three Details-page variants, Split view, Secondary panels, Create/Edit/Delete resource, dashboards, Empty states and Density settings — a near-direct map onto §2's archetypes. **Polaris was disqualified by the same check**: its standalone docs now redirect into shopify.dev and `polaris-react` was archived 2026-01, so citing it would inherit its churn. Primer's patterns are interaction/workflow guidance, orthogonal to composition. **Scope of the adoption:** Cloudscape is a *gap* source — consulted only where Geist publishes nothing, guidance-only, translated into `--rux-*` vocabulary, never names or values wholesale. **Deliberately not done:** §2 was not re-audited against Cloudscape's patterns in this step — that audit is real work and is recorded as Q5 rather than rushed into a source-adoption step. No rule, value, or archetype changed. |
| 3 | Q5 answered — §2 audited against Cloudscape's patterns | **done · Class A** | **Executed 2026-08-23**, reading eight pattern pages (Table view, View resources, Split view, the three Details variants, Secondary panels, Density settings). **The archetypes survive; one conjecture in Q5 itself did not.** Q5 guessed the Drivers/Fleet rails "resemble Split view" — they do not: a split panel shows *selected-record details* beside a collection, our rails hold *view options*, which map to Cloudscape's Preferences/drawer. Split view proper — browse-and-compare without opening an editor — has **no instance and no archetype here**, recorded as a recognized absence rather than invented ahead of a need. **One rule adopted, translated:** §2.8, an attached panel is supportive, never essential — and applying it the same day found **D6**, the Roster/Workload switch stranded in a collapsible rail. **Records validated with one explained divergence:** Cloudscape titles its table pages because its chrome has no persistent module heading; ours does, so §2.3's title-less band stands (note added in place). **The Details trio informs Q1 without changing it:** our floating editors are the "Details page with tabs" analog and the trip editor already follows one-tab-one-task; Cloudscape's summary-container-above-tabs — universally relevant info that survives tab switches — is worth weighing when the Documents detail work lands, and is left as an observation, not a rule. **Density: no adoption.** Cloudscape's density is a user-controlled, service-wide preference defaulting comfortable — a product feature. `layout.md` §9.2's dense exception is an author-chosen per-context rule, and its guardrail (never as a general compactness lever) already matches Cloudscape's readability caution. Different mechanisms, both kept. **Deliberately not done:** no Split view archetype, no density feature, and no app change for D6 — the defect is recorded and the fix is its own decision. |
| 4 | Q3 answered — views declare their archetype; §2 becomes enforceable | **done · Class A** | **Executed 2026-08-23.** All eight `.rux-app-view` elements gained `data-archetype`, valued per §3's census: four `records`, two `document-column`, one `canvas`, one `viewer`. **The attribute is bare, and Q3's conjecture that `naming.md` would own it was wrong**: rule 2.5 scopes `data-rux-*` to `rux-ui/`, this is application vocabulary on application markup, and bare `data-view` on the same elements is the standing precedent — recorded here rather than amending a document that has nothing to say. **D5 closes with it**: `tests/composition-contract.test.mjs` asserts the declaration and the decisive anatomy per archetype — only a viewer titles its workspace; records hold a table and a floating editor; a document column has neither header band nor floating window. **The checks carry no exception list** (`CLAUDE.md`: an exception list is not a passing check) — the Game view's stray rail (D4) is *not* asserted against: attached panels are unchecked for document columns until D4 is decided, stated rather than worked around. **The first run of the test caught a real slicer bug**: the last view's segment ran to end-of-file and swallowed the floating surfaces that live outside the views container, flagging Settings for windows it does not contain — the live census had it right, the static slice was wrong, and the test now bounds the final segment. **Verified the test can fail**: flipping one view's archetype fails the suite by name. |
| 5 | Q2 answered, D4 closed — there is no rail | **done · Class A** | **Executed 2026-08-23, at the owner's direction to decide D4.** **The decision: §2.4 stands — a document column admits no attached panel.** No amendment to the archetype, no exception. **D4's premise dissolved under inspection**: the census that raised it counted `.rux-panel--attached` nodes per view and read the game's one as a rail; the markup shows it is the game's **main surface**, centered inside the workspace body and docked to nothing — verified again in this step (exactly one attached panel in the view, zero floating). D4 closes as misdescribed and **D7 records the real defect precisely**: panel vocabulary borrowed un-docked for its chrome. **Unreachability was not used as the answer**: the game has no route control (recorded 2026-08-23 in the flip-seven header commit), but the taxonomy governs shipped markup, not what the navigation happens to expose. **Deliberately not done:** the D7 re-dress — app work with a stated blast radius, its own step — and no test assertion on attached panels in document columns while D7 stands, because a check that needs the game excepted is an exception list, not a rule. Nothing renders differently. |

---

## 6. Open questions

**Q1 — Does the Viewer archetype survive?** Its only instance is Documents, and the owner
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

**Q4 — Where do the component documents go?** D3's four ship with values and no contract.
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
