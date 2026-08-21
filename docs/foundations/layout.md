# Rux UI Foundations — Layout

**Contract version: 1.0.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 7 steps: **2 done · 5 open**
This document is canonical for **breakpoints only**. The set of four was already closed and
enforced in `tests/breakpoint-contract.test.mjs`; step 1 gave it a home to be canonical in
and step 2 pointed the enforcement at that home. Everything else layout owes — the space
scale, radius, the elevation presets, and the rule content in `../layout-composition.md` —
is recorded in §5 as an open step and is **not** governed here yet.

**Where to pick up.** Nothing is blocked on a decision.

1. **Step 3 — the application layer.** Nine widths outside the set, seven boundaries.
   Mechanical, reversible, and the largest single reduction in drift available here.
2. **Steps 4 and 5 — the scales.** `--rux-space-*` and `--rux-radius-*` exist in
   `tokens.css` and are governed by nothing. Step 5 is where Geist Materials gets measured.
3. **Step 6 — `../layout-composition.md`.** Its § Spacing and § Responsive Behavior state
   values and MUSTs, which by `CLAUDE.md`'s one-home test makes them rules with no
   canonical home. They move here or become pointers.

Derived from §5; `tests/foundations-contract.test.mjs` fails if this line disagrees with
the log.

This document is canonical for layout in Rux UI. **Today that means breakpoints and
nothing else** — a scope this narrow is stated plainly rather than implied, because a
foundation document that looks broader than it is invites downstream authors to assume it
already answered a question it has not reached.

**Authority.** Per `CLAUDE.md` § Foundation Work, this document authorizes its own
amendments. A change to the breakpoint set is legal when it is a numbered step in §5, and
is otherwise prohibited.

**Precedence.** This document outranks every downstream specification that lays out Rux UI,
in this repository or any other — but only on what §1 actually governs. On the space scale,
radius, and elevation it currently governs nothing, and `../layout-composition.md` remains
the operative statement until step 6 moves it.

**Scope of that precedence.**

- **This document owns the vocabulary and its behavior** — which widths exist, what each is
  for, and what it takes to add one.
- **A downstream specification owns the mapping** — which of *its* layout changes happen at
  which published width. It may not introduce a width the set does not publish.
- A downstream need the vocabulary cannot express is a defect **here**, fixed by an
  amendment in §5 — never by the downstream escaping the set.

**Its source is not Geist.** `typography.md` was measured off Geist's rendered specimens
and `color.md` and the materials work will be too. Breakpoints are the first foundation
rule this repository **originates**: `vercel.com/geist` publishes four foundations
(Introduction, Colors, Typography, Materials) and **none of them is about breakpoints**.
Recorded because a rule with no cited source reads later like an oversight rather than a
decision.

**This document moves no code.** Execution runs against §5.

**Enforcement.** `tests/breakpoint-contract.test.mjs` checks §1.1 and §1.2 against the
portable layer and cites this section.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required, preferred,
optional, and prohibited behavior.

---

## 1. Breakpoints

### 1.1 The set

The portable layer publishes **four** widths. This is a closed set.

| Width | What changes there | Where |
|---|---|---|
| **500px** | The shared mobile breakpoint — touch-target minimums, and the drawer's mobile mode | `tokens.css`, `drawer.css` |
| **580px** | Phones get one floating-window frame contract regardless of contents | `panel.css` |
| **620px** | The header brand sheds its dividers and caps the logo | `ui-header.css` |
| **760px** | The header drops nav, responsive utilities, and active profiles | `ui-header.css` |

**500px is the general-purpose one.** The other three are specific to a component's own
geometry. A rule that needs "narrow" without a component-specific reason MUST use 500.

A boundary MAY be expressed as either side — `max-width: 500px` and `min-width: 501px` are
the same decision, and both count as the 500 boundary rather than as two breakpoints.

### 1.2 The ratchet

Adding a fifth width MUST be a numbered step in §5, and MUST record what changes there and
in which file — the same two facts every row of §1.1 carries.

Reusing one of the four costs nothing and needs no step.

This is deliberately asymmetric. A breakpoint is a design decision, not a local detail:
every one added is a width at which some consumer's layout changes without them asking for
it, and they multiply quietly because adding one is always the smallest fix in front of
you. §3 is what that looks like when nothing stops it.

### 1.3 What a breakpoint is not

- **Not a container query.** A rule that depends on a component's own width rather than the
  viewport's is not a breakpoint and is not governed by §1.1.
- **Not a spacing value.** Widths at which layout *changes* live here; the scale of the gaps
  themselves does not, and does not live anywhere yet (step 4).
- **Not a device.** The set names what changes, never a phone or a tablet.

---

## 2. Rules

**2.1** The portable layer MUST use only the widths in §1.1. Enforced.

**2.2** A rule needing a general "narrow" MUST use **500px** rather than minting a width
near it.

**2.3** A breakpoint MUST be a viewport media query. Component-width-dependent behavior is
out of scope (§1.3).

**2.4** The application layer SHOULD converge on the same set. It is not enforced today —
see §3 and step 3.

---

## 3. Current state

**The portable layer is clean.** `rux-ui/css/` uses exactly the four, and nothing else.

**The application layer is not.** `scheduler/css/` uses **eleven distinct widths**
expressing **nine boundaries**, of which **two are on the set and seven are not**:

| Boundary | On the set? |
|---|---|
| **359px** | no |
| **420px** | no |
| **479 / 480px** | no |
| **500 / 501px** | **yes** — the shared mobile breakpoint |
| **560px** | no |
| **580px** | **yes** — the floating-window frame contract |
| **640px** | no |
| **700px** | no |
| **720px** | no |

Several are a few pixels apart, and none of the seven is a decision anybody remembers
making. That is the §1.2 failure mode, observed rather than hypothesized.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | The application layer holds seven boundaries off the set (§3). | step 3 |
| D2 | The space scale and radius scale are published from `tokens.css` and governed by no document. | steps 4, 5 |
| D3 | `../layout-composition.md` § Spacing and § Responsive Behavior state values and MUSTs outside a foundation document. | step 6 |
| D4 | Nothing enforces §2.4 against the application layer, so D1 can grow while D1 is open. | step 3 |

---

## 5. Amendment log

Ordered by dependency and blast radius. Every step records what it deliberately did **not**
do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt the breakpoint set as canonical | **done · Class A** | Founding entry, and the correction typography step 35 called for. The set was **not invented here** — all four widths, and the purpose of each recorded in §1.1, were already closed and enforced in `tests/breakpoint-contract.test.mjs`, which predates this document. What was missing was a *home*: `CLAUDE.md`'s one-home rule says an enforcement test SHOULD cite the section it enforces, and that test cited nothing because no section existed, leaving the rule stated **only** in enforcement. Nothing resolves differently and no CSS moves — this is a relocation of authority, not a change to it. **Deliberately did not widen the scope to the space scale, radius, or the elevation presets** (steps 4, 5): a document that claims a scale it has not verified is worse than one that says it does not cover it, which is why the Status block and §1 both state the narrow scope outright. **Deliberately did not answer typography's Q6.** This step hands Q6 a published width to map onto; *which* roles step down and to which rung remains a design decision that document owns. **Deliberately did not name the document `spacing.md`**, which was README §1's plan of record: a breakpoint is a width at which layout changes, not a spacing value, and `../layout-composition.md`'s responsive MUSTs will need this home at step 6. README §1 is corrected in the same change, per the rule that the index is derived. |
| 2 | Cite this section from `tests/breakpoint-contract.test.mjs` | **done · Class A** | Completes step 1: enforcement SHOULD cite the section it enforces, and until it does, a reader of the test cannot tell whether the set is a rule or a convention someone froze. Comment-only; no assertion, width, or CSS changes, and the suite's behavior is byte-identical. **Corrected a defect in the test's own rationale while there:** it said the application layer used "eleven distinct widths" and then listed **ten**, omitting **501px** — the `min-width` companion to the `max-width: 500px` boundary. The count was right and the list was short by one. The rewritten comment states eleven widths and nine boundaries, and §1.1 now records that either side of a boundary is the same decision, which is what made the omission easy to miss. **Deliberately did not add an assertion against the application layer** — that is step 3, and asserting a rule the codebase violates 7 times turns the suite red for a known, recorded defect (D1) rather than a regression. **Deliberately did not change the ratchet's mechanics**: the allow-list stays the enforcement, this document stays the rule. |
| 3 | Bring the application layer onto the set (D1, D4) | **[open]** | Seven boundaries in `scheduler/css/` to reconcile (§3). Each needs a decision, not a find-and-replace: 479/480 and 560 plausibly collapse into 500, but 640/700/720 are workspace-width decisions that may justify a fifth published width under §1.2 rather than being forced onto an existing one. Extend `breakpoint-contract.test.mjs` to cover the application layer once the count reaches zero — asserting earlier just pins the defect. **Class B in effect**: every collapsed boundary re-renders something at some width, so it owes before/after widths and named states per README §2.3. |
| 4 | Give the space scale a canonical home (D2) | **[open]** | 15 `--rux-space-*` tokens in `tokens.css`, 4px-gridded with one deliberate half-step at 6px and a 1px hairline off the grid. Documenting what exists is Class A; the log MUST state plainly that these were never measured against Geist, unlike the type ramp. Gated on nothing, but SHOULD land with step 5 so the measurement happens once. |
| 5 | Adopt Geist Materials — radius and the elevation presets (D2) | **[open]** | 7 `--rux-radius-*` tokens plus the semantic three (`container`, `control`, `input`). The source is [vercel.com/geist/materials](https://vercel.com/geist/materials): eight elevation presets bundling radius, fill, stroke and shadow. **Values are not published** — they must be read off the rendered specimens in a browser, the way every figure in `typography.md` was, and the step MUST say so. Expect Class B: `tokens.css` already cites the Materials modal tier at 12px, so some of this is adopted informally and may not survive measurement. |
| 6 | Relocate `../layout-composition.md`'s rule content (D3) | **[open]** | Its § Spacing states values (16px rhythm, the 8px scheduler inset, the 40px toggle row) and its § Responsive Behavior states MUSTs, which by `CLAUDE.md`'s test makes both rules living outside a foundation document. They move here or become pointers. **Gated on steps 4 and 5**: converting a section to a pointer before the rule it points at is settled deletes the only statement of it — the same trap typography step 16 records. |
| 7 | **Consolidate** — strip duplicated layout rules elsewhere; convert them to pointers | **[open]** | The closing step. In scope: `README.md` § Visual Foundations wherever it states a width or a spacing value, the `rux-design` skill's layout rules, and any `tokens.css` comment that states a MUST rather than explaining a value. **Blocked on steps 3–6.** |

---

## 6. Open questions

**Q1 — Should the application layer share one set with the portable layer, or publish its
own?** Step 3 assumes one shared set. The alternative is that `scheduler/` is a consumer
like any other and may declare its own widths, in which case §2.4 is wrong and the honest
rule is that the portable layer's four are a floor, not a ceiling. *Does not block step 3
— it changes what "done" means for it, and the answer will be clearer once the seven
boundaries have been looked at individually.*

**Q2 — Is 620 a real breakpoint or an accident?** 620 and 760 both exist for `ui-header.css`
alone, and 620 sits 120px from 500 with no stated reason for that distance. It may be a
genuine measurement of when the brand stops fitting, or it may be the same drift §3
documents, caught earlier. *Answering it requires measuring the header, not reasoning about
it. Blocks nothing.*

**Q4 — Does `spacing.md` still need to exist?** README §1 plans it as a separate document
sourced from Geist Materials, but this document's steps 4 and 5 already claim the space
scale, radius, and the eight elevation presets — which is most of what it was for. Either
`spacing.md` is never written and layout owns measurement entirely, or it is written and
steps 4 and 5 move to it, leaving this document to breakpoints and composition alone.
*Blocks nothing until step 4 starts; deciding it late costs a document rename, which is why
it is written down now rather than discovered then.*

**Q3 — Does layout own the shell's fixed dimensions?** Rail widths, drawer widths, and panel
minimums are layout decisions that live in `tokens.css` today and are called "application
variants, not base-shell defaults" by `../layout-composition.md`. Whether that stays true
or they become published vocabulary is not decided. *Gates nothing until step 6.*
