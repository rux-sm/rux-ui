# Rux UI Foundations — Composition

**Contract version: 1.1.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 2 steps: **2 done**
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
| D4 | **The Game view is a Document column carrying an attached rail**, which no other instance of that archetype has. Either the archetype admits an optional rail or the Game view is non-conformant; §6 Q2. |
| D5 | **Nothing enforces §2.** A view could compose any anatomy and no test would fail. |

---

## 5. Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; publish the four archetypes | **done · Class A** | **Executed 2026-08-23.** Founding entry. Class A throughout: it names a taxonomy that already existed in the application and moves no code, renames nothing, and changes no resolved value. The archetypes are **read off the eight views, not designed** — four of them were already identical, which is what made the set nameable. **Deliberately did not absorb `../layout-composition.md`** (D1): that document's 29 MUSTs are shell containment and ARIA, a different question from which anatomy a view gets, and folding them in during a founding step would mix a relocation with a taxonomy. It is recorded as D1 and left for its own step. **Deliberately did not enforce anything** (D5): a checker would have to decide which archetype a view intends before it can say the view is wrong, and no attribute records that intent yet — §6 Q3. |
| 2 | Adopt Cloudscape as the gap source, guidance-only | **done · Class A** | **Executed 2026-08-23**, at the owner's direction after a sourced comparison. The Carbon residue predates the Geist alignment and is retired as this document's precedent. **Candidates were verified live, not recalled:** Cloudscape's patterns index publishes 59 patterns covering Table view, three Details-page variants, Split view, Secondary panels, Create/Edit/Delete resource, dashboards, Empty states and Density settings — a near-direct map onto §2's archetypes. **Polaris was disqualified by the same check**: its standalone docs now redirect into shopify.dev and `polaris-react` was archived 2026-01, so citing it would inherit its churn. Primer's patterns are interaction/workflow guidance, orthogonal to composition. **Scope of the adoption:** Cloudscape is a *gap* source — consulted only where Geist publishes nothing, guidance-only, translated into `--rux-*` vocabulary, never names or values wholesale. **Deliberately not done:** §2 was not re-audited against Cloudscape's patterns in this step — that audit is real work and is recorded as Q5 rather than rushed into a source-adoption step. No rule, value, or archetype changed. |

---

## 6. Open questions

**Q1 — Does the Viewer archetype survive?** Its only instance is Documents, and the owner
has stated it will become a table plus the existing `RuxDocViewer` floating window — §2.3.
If that lands, §2.6 should be withdrawn rather than kept for a hypothetical, and
`.rux-workspace__title` loses its last caller, which is a **Class C** removal.

**Q2 — Does Document column admit an attached rail?** The Game view has one and Settings
does not. Either the rail is optional in §2.4 or the Game view is non-conformant (D4). It
is also the view with no route control, so the question may be moot.

**Q3 — Should a view declare its archetype?** D5 cannot be enforced without knowing what a
view intends. A `data-archetype` attribute would make §2 checkable, at the cost of a name
in the markup that exists only for the checker. `naming.md` would own the attribute if so.

**Q4 — Where do the component documents go?** D3's four ship with values and no contract.
They could become foundation documents, become pointers into one, or stay as they are with
their status stated. `layout.md` Q5 asks a version of this about cards specifically, and
appears not to know `docs/cards.md` already exists.

**Q5 — Does §2 survive an audit against Cloudscape's patterns?** Step 2 adopted Cloudscape
as the gap source without re-deriving the archetypes from it. The obvious candidates for
that audit: Cloudscape's **Split view** (a collection paired with a split panel) has no
archetype here and the Drivers/Fleet attached rails resemble it; its three **Details page**
variants may inform what replaces §2.6 if the Viewer retires (Q1); and **Density settings**
speaks to `layout.md` §9.2's dense exception. Each finding would be its own classified step.
