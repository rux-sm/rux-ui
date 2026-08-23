# Rux UI Foundations — Naming

**Contract version: 1.18.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 15 steps: **15 done**
This document is canonical for **what things are called** — the class shape, the modifier
vocabulary, the namespaces a portable layer may use, and the requirement that a name in
markup resolves to a rule. It is the home `README.md` §1 routes **R1, R2, R4 and R5** to,
and the last of that table's rules to get one.

**It does not own renaming.** `../portability-audit.md` does: prefix is truth, and its ledger
is how a public name changes. This document says what a name must look like; that one says
what it takes to change one. A rename proposed here without a ledger entry there is not a
rename, it is a suggestion.

**It does not own state.** `--open`, `--hidden`, `--loading` and their kin are prohibited by
[`state.md`](state.md) rule 2.3, which owns the aria-versus-class question entirely. This
document governs **variant** modifiers — what a component permanently is.

---

## 1. The vocabulary

### 1.1 The class shape

`.rux-{block}`, `.rux-{block}__{element}`, `.rux-{block}--{modifier}`. One block per
component: a component's container, its elements, and its modifiers share a single block,
and **sibling blocks for parts of one component are prohibited**. `.is-*` and `.has-*` carry
JavaScript state, under [`state.md`](state.md)'s rules rather than this document's.

### 1.2 The modifier vocabulary

The portable layer defines **38 distinct modifiers**. The audit's R2 named six as canonical
— `--sm`, `--md`, `--lg`, `--block`, `--ghost`, `--solid`, `--danger` — and §3 records where
practice and that list disagree. The families actually in use:

| Family | Modifiers |
|---|---|
| Size | `--sm`, `--lg`, and `--default-size` |
| Emphasis | `--ghost`, `--solid`, `--default` (button only), `--accent` |
| Intent | `--danger`, `--warning`, `--success`, `--info` |
| Placement | `--attached`, `--floating`, `--anchored`, `--overlay`, `--modal` |
| Surface depth | `--surface`, `--elevated`, `--recessed` |
| Layout | `--block`, `--stack`, `--flush-end`, `--right`, `--responsive`, `--safe-viewport` |
| Composition | `--icon`, `--prefix`, `--suffix`, `--dot`, `--segment`, `--segment-icon`, `--toggle`, `--action`, `--tab-tip`, `--module`, `--theme` |
| **State — prohibited** | `--hidden`, `--loading` |

### 1.3 The namespaces

Only `rux-ui/` may use them, and it must use them for everything it publishes:

| Kind | Namespace |
|---|---|
| Attributes | `data-rux-*` |
| Public custom properties | `--rux-*` |
| Private custom properties | `--_*` — one convention, not two |
| Custom events | `rux:` with a past-tense verb |
| Keyframes | `rux-` |

---

## 2. Rules

**2.1 One block per component, declared in one home.** A component's container, elements and
modifiers share one BEM block, and sibling blocks for parts of one component are prohibited.

A block is **owned** by the layer that declares its bare `.block` rule. Its parts — every
`.block__element` and `.block--modifier` — MUST be declared in **one file of that owning
layer**. Two patterns look like violations under a naive reading and are explicitly **not**
violations:

- **Another layer extending the block.** The application declaring `.rux-card__header` does
  not split `.rux-card`; the portable layer owns it and the application is composing with
  it. That relationship is governed by `../portability-audit.md`, not by this rule.
- **A rule shared between blocks.** A grouped selector such as
  `.rux-u-section-label, .rux-menu__header` is one declaration serving two blocks — the
  opposite of a block split.
- **A rule scoped by another block.** `.rux-drawer .rux-panel > .rux-panel__footer` is the
  *drawer's* rule about panels inside it, and belongs in the drawer's file. A rule whose
  selector is scoped by a different block is that block's **contextual override**, owned by
  the scoping block, not a split of the subject. This is the same principle as ownership,
  applied within a layer instead of across two.

The rule reads the **subject** of a selector, not every class in it: `.rux-text-copy-14
:is(strong, b)` is a rule about `strong`, not a declaration of `.rux-text-copy-14`.

*(R1. **Enforced: `tests/block-ownership.test.mjs`.** Defined by step 2, corrected by step 13,
made executable by step 14 — with no exception list.)*

**2.2 Every class follows `block__element--modifier`.** *(R1. Enforced:
`tests/naming-contract.test.mjs`.)*

**2.3 Every modifier belongs to a block that exists.** *(R1. Enforced.)*

**2.4 One modifier vocabulary.** A concept has one modifier name across every block, and a
modifier name means one concept across every block. A new modifier name requires a ledger
entry in `../portability-audit.md`. *(R2. **Not enforced** — see §4 D2.)*

**2.5 Namespace everything portable.** `data-rux-*`, `--rux-*`, `--_*`, `rux:` past-tense
events, `rux-` keyframes — all only in `rux-ui/`. *(R4. Enforced:
`tests/prefix-contract.test.mjs`.)*

**2.6 Every emitted class resolves.** Any `rux-*` class in markup or written by JS is
defined in a stylesheet or explicitly registered as a markup hook. *(R5. Enforced:
`tests/class-resolution.test.mjs`.)*

---

## 3. Current state

**R1 — the shape holds, and the substance is now checked too.**
`naming-contract` verifies that every class matches the BEM pattern and that no modifier
orphans its block. It still does **not** check the sentence R1 turns on. What changed on
2026-08-22 is that the sentence became checkable: rule 2.1 now states **ownership**,
**subject**, and **contextual override**, the three concepts its original wording lacked.
Under that definition the repository has **zero** splits — the two it found,
`.sched-scheduler` (3 files) and `.sched-scope-right-panel` (2), were consolidated by step
13, and step 14 shipped `tests/block-ownership.test.mjs` **with no exception list**, which
was the point of doing the consolidation first. **R1 is the last of the audit's rules to
stop being a sentence somebody has to remember.**

**R2 — unenforced, and practice has drifted from the rule in four distinct ways.** There is
no denylist; the audit proposed one and it was never written. Measured against R2's own list
of canonical modifiers:

1. **`--md` does not exist.** Sizes are `--sm` and `--lg` on `.rux-avatar` and `.rux-button`,
   with the middle size unmodified. Either the rule is wrong or two components are.
2. **`--default-size` is an off-vocabulary size name**: `.rux-panel--default-size`, which
   the stylesheet only ever compounds with `.rux-panel--floating`.
3. **`--default` and `--solid` may be one concept under two names.** `--default` is the
   neutral filled variant, on `.rux-button` **only**; `--solid` is the filled variant on
   `.rux-badge` and `.rux-output`. *(An earlier draft of this section said `--default` was
   on `.rux-panel` too. It is not — `.rux-panel--default-size` is a different modifier, and
   a greedy pattern read its prefix as one. The denylist in step 3 caught it, which is the
   argument for writing the test rather than trusting the survey that motivated it.)*
4. **`--solid` means two different things.** On `.rux-badge` it fills the background; on
   `.rux-card` it opts the block into the shell's chrome. One name, two concepts — which
   R2 forbids in the direction people forget to look.

`--hidden` and `--loading` also appear, and are [`state.md`](state.md) D4's recorded debt
rather than this document's.

**R4 — holds, with ten recorded exceptions.** `prefix-contract` runs seven checks across
attributes, public and private custom properties, events and keyframes. Its accepted-bare
lists hold **seven attributes** (`data-placement`, `data-tooltip`, `data-sort`, `data-col`,
`data-col-filter`, `data-dismiss`, `data-priority`) and **three custom properties**
(`--drawer-width`, `--drawer-open-width`, `--mobile-drawer-translate-x`), each with a reason
and an audit reference. `data-dismiss` is the interesting one: it cannot simply become
`data-rux-dismiss`, because that name already means something else.

**R5 — holds completely.** `class-resolution`'s accepted-unresolved list is **empty**: every
`rux-*` class in markup or written by JS resolves to a rule.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | ~~Rule 2.1's operative half has no definition and no test.~~ **Closed 2026-08-22.** Defined by step 2 (ownership, subject) and corrected by step 13 (contextual override); the two splits it found were consolidated; `tests/block-ownership.test.mjs` enforces it with an empty exception list. | **closed** — steps 2, 13, 14 |
| D2 | ~~Rule 2.4 (R2) has no test.~~ **closed, step 3.** The audit specified a synonym denylist; it was never written, and §3 records four drifts it would have caught. | **closed, step 3** |
| D3 | `.rux-panel--default-size` is a size modifier outside the size vocabulary. | **portability-audit.md** entry 22 |
| D4 | `--solid` carries two concepts (`.rux-badge` fills; `.rux-card` adopts shell chrome), and `.rux-button--default` may be a third name for the first of them. Resolving either is a public rename and belongs in `../portability-audit.md`. | **portability-audit.md** entry 22 |
| D6 | ~~`fleet-app` was declared in two files.~~ | **closed, step 4** |
| D5 | ~~R2's canonical list names `--md`, which no block defines.~~ | **closed, step 3** — Q1: the rule was wrong |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R1, R2, R4 and R5 as canonical | **done · Class A** | Founding entry, 2026-08-22, and the last of `README.md` §1's routing table to land. **Nothing was invented and nothing resolves differently.** R4 and R5 were already enforced by `prefix-contract` and `class-resolution`; R1 was half enforced by `naming-contract`; R2 was never enforced at all. §1's tables and §3's four drifts are **measured** — the 38 modifiers were enumerated from `rux-ui/css`, and the two synonym findings came from reading what `--solid` and `--default` actually do in each block rather than from the names. **Deliberately did not fix D3, D4 or D5**, all of which are public renames: `CLAUDE.md` prohibits a rename outside a document that authorizes it, and the authorizing document for a public name is `../portability-audit.md`, not this one. **Deliberately did not write the denylist** (step 3) — Q1 and Q2 decide what belongs on it, and a denylist written first would encode whichever reading its author held, the same trap `state.md` step 1 recorded for R7. **Deliberately did not claim `.is-*` / `.has-*`**, which `state.md` owns: `naming-contract` happens to check their shape, and a test's file name is not a claim of ownership. **Deliberately did not restate `../portability-audit.md`'s rename process**, which stays the one home for how a public name changes. |
| 2 | Give rule 2.1 a testable definition | **done · Class A** | **Executed 2026-08-22 — the definition only. Enforcement split out to steps 13 and 14**, because the step's own warning was *do not skip to the test*, and shipping one now would take six allow-list entries. **The abandoned attempt recorded here in August was right about the diagnosis and one concept short of the cure.** It found that R1 could not distinguish *splitting* a block from *overriding* one across a tier boundary. Re-measuring showed a layer-aware rule alone is still wrong: it flags `.rux-card` because seven `scheduler/` files declare `.rux-card__*`, which is the application composing with a portable block — known `../portability-audit.md` debt, not an R1 defect. **The missing concept is ownership.** A block belongs to the layer that declares its bare `.block` rule, and only files of *that* layer can split it. With ownership added, `.rux-card`'s seven application files stop being violations without any exception being written for them, which is the test of a definition: it disposes of the hard case by *reasoning*, not by listing it. **Subject-only and ungrouped are the second half**, both inherited from the earlier attempt's refinements: a rule about `strong` inside `.rux-text-copy-14` does not declare that block, and a grouped `.rux-u-section-label, .rux-menu__header` is a rule *shared* rather than a block split. **That second clause resolves a discrepancy with the earlier finding rather than hiding it** — August's list named `.rux-menu` as a violation, and under this definition it is not, because its only other declaration is exactly such a shared group. The earlier count applied refinement (iii) to the reasoning but not to `.rux-menu`. **Measured result at the time: six splits.** **Corrected the same day to two — see the amendment note below.** **A third clause was missing and step 13 found it within the hour.** Consolidating the six meant reading them, and three of the portable ones turned out to be rules like `.rux-drawer .rux-panel > .rux-panel__footer`, `.rux-ui-header .rux-button--lg` and `.rux-notifications__item-main .rux-badge--dot` — one block styling another *inside its own context*. That is composition, and it is the same relationship ownership already excused across a tier boundary, appearing again **within** a layer. Rule 2.1 gained **contextual override**: a rule whose selector is scoped by a different block belongs to the scoping block. It reclassified **57 rules** and took the violation count from six to **two**, both in the application layer — `.sched-scheduler` and `.sched-scope-right-panel`. **The definition was published one clause short, and the clause was found by trying to act on it**, which is the same way the August attempt found the ownership gap. A definition that has never been executed against is a hypothesis. Contract 1.10.0 → 1.11.0 carries the fix. **Nothing renders differently and no code moved**; this step changes what the rule *says*, which is why six previously unadjudicable cases are now violations on paper. **Deliberately did not write the test** (step 14) and **deliberately did not consolidate anything** (step 13) — bundling either into the step that defines the rule would make it impossible to review the rule on its own. **Deliberately did not adopt a manifest**, the other option this step named: a declared list of which blocks belong to which component is a second source of truth that has to be maintained by hand, and ownership derives the same answer from the CSS itself. Contract 1.9.0 → 1.10.0. |
| 3 | Answer Q1–Q3; enforce rule 2.4 (D2, D5) | **done · Class A** | **Executed 2026-08-22.** All three questions answered by the owner, and `tests/modifier-vocabulary.test.mjs` written against the answers. **Q1: no `--md`** — the middle size is an unmodified block, and `--md` is *forbidden* rather than absent, since publishing it would make every call site restate the default. R2's canonical list was wrong, not the two components. **Q3: the eight families are a reading aid**, so the test is a **denylist**, not an allowlist of sanctioned families — the allowlist would have to be right about all 38 modifiers on the day it lands, and every miss becomes an exception that makes it mean less. Sizes are the one family checked as an allowlist, because Q1 settled them. **Q2: `--solid` means filled, everywhere**; `.rux-card`'s chrome meaning and `.rux-button--default` both rename. **The test caught an error in the survey that motivated it.** §3 and §1.2 claimed `--default` was on `.rux-button` *and* `.rux-panel`. It is not: `.rux-panel--default-size` is a different modifier, and the greedy pattern in the founding scan read its prefix as a bare `--default`. The pending-rename list failed on the phantom class the first time it ran. Both sections are corrected, and this is the argument for writing the test rather than trusting the survey. **Closes D2** (2.4 had no test) **and D5** (R2's list named a `--md` nothing defines). **Deliberately did not execute the three renames** — Class C, and `CLAUDE.md` sends them to `../portability-audit.md`, now **entry 22**, which is where entry 19 did the same job on 2026-08-20. D3 and D4 stay open against that entry. **Deliberately did not check for *new* collisions**: one name carrying two concepts needs a human to read what a modifier does, so the test pins the one we found and asserts a second needs a defect entry rather than a list entry. Contract 1.0.0 → 1.1.0. |
| 4 | Move R1, R2, R4 and R5 out of `../audit/design-system-audit.md` §5 | **done · Class A** | **Executed 2026-08-22**, once steps 2 and 3 had settled the rules it was gated on. All four entries are now **pointers**: they name the rule, link the section of this document that states it, keep the test mapping, and **state no values** — the form `CLAUDE.md` § One home per rule requires, and the form R6's colour half already took when `color.md` claimed it. **The gate was worth waiting for, because rule 2 had already drifted.** §5's entry published the modifier vocabulary as `--sm/--md/--lg`, and step 3 had since answered Q1 the other way: `--md` is **forbidden**, not canonical, because publishing it makes every call site restate the default. Converting that entry to a pointer **deletes a statement that was actively wrong**, which is the argument for one home stated more sharply than any rationale could put it. **Two corrections came free and were taken in the same edit, because leaving known-false text in a list I was already rewriting is worse than the scope discipline of not touching it.** §5's legend said rules marked ★ are *tests worth writing* — all four are written (`state-contract`, `focus-contract`, `motion-contract`, `gallery-coverage`), so every ★ in the rule list is spent; the marker survives only inside §6's struck-through history, where it is a record. And R4's and R5's entries still described their tests as unwritten blind spots. **Deliberately did not move R3, R7 or R8**, which `state.md` has claimed and will move on its own consolidation step — moving another document's rules would be this step making a decision that is not its own. **Deliberately did not touch R9 or R10**: `README.md` §1 records that their homes are `CLAUDE.md` and `../portability-audit.md` rather than any foundation document, and naming them absent is what makes that routing exhaustive. **Nothing renders differently and no test changed.** Contract 1.13.0 → 1.14.0. |
| 5 | **Consolidate** — strip duplicated naming rules elsewhere; convert them to pointers | **done · Class A** | **Executed 2026-08-22.** The closing step, and the last of the four locations it named is now a pointer or a record. **`rux-design` skill:** item 0 stated the namespaces and item 4 stated the class shape; both now name the rule, cite `naming.md` §1.3 / §1.1 and rules 2.1–2.5, list the suites that enforce them, and **state no values**. Its header also still said `naming.md` and `state.md` were *to follow* — both have existed for a day, and only `motion.md` is still unwritten. **`README.md`:** its Conventions block published the BEM shape with three example classes; that is now a pointer. **`../audit/design-system-audit.md` §4:** the naming glossary is a *dated audit*, which `CLAUDE.md` explicitly calls a legitimate non-canonical form, so it was not stripped — it gained a status note marking it historical and pointing at this document. **One row in it is now actively wrong and was left visible on purpose:** *Size scale* recommends `--sm/--md/--lg`, and Q1 later answered that `--md` is **forbidden**. Striking it silently would delete the evidence of exactly the drift a second home produces; the note names it instead. **`CLAUDE.md` was checked and nothing moved** — recorded because a consolidation step that visits a file and changes nothing should say so rather than leave the reader wondering whether it was missed. Its only `--rux-*` mention is *reuse before inventing*, which is project policy, not a statement of the naming vocabulary; its rename protocol belongs to `../portability-audit.md`, which §Preamble already says this document does not own. **Deliberately did not move the `.is-*` / `.has-*` statements** in either the skill or `README.md` beyond pointing them at `state.md`. That vocabulary is `state.md`'s, its own consolidation step will sweep it, and doing it here would be this document consolidating another's rules. **Every naming rule now has exactly one home**, and the four non-canonical forms `CLAUDE.md` permits — pointer, enforcement, rationale, dated audit — are the only shapes left anywhere else. Contract 1.14.0 → 1.15.0. |
| 6 | Give `fleet-app` one home (D6) | **done · Class B** | **Executed 2026-08-22.** The block was declared in **two** files — 14 selectors in `fleet-panel.css`, 12 in `fleet-app.css` — and they were not panel-versus-view variants but **different elements of the same table**: `__equipment-cell` in one, `__vehicle-cell` in the other. **It had already cost something.** `.fleet-app__order` was declared in both at identical specificity; `fleet-app.css` loads later, so it won, and the panel's copy was **dead** — all four of its declarations restated verbatim by the winner, which also added the `width: 2rem` the panel's version lacked. Nobody noticed, because neither file's author could see the whole block. That is R1's failure mode, observed rather than hypothesised. **What was done:** the dead `.fleet-app__order` deleted, the other 13 rules moved into `fleet-app.css`, `fleet-panel.css` left owning only `sched-scope-fleet` plus a comment pointing at the new home. **Verified by measurement, not argument:** the 19 resolved `fleet-app__*` selectors were hashed across 23 computed properties each with the original files in place, then again after the move — **identical to the digit** (`-170764937`), and the block now resolves from one file. Safe by construction too: only `customer-panel.css` loads between the two and it never mentions `fleet-app`. **The whole tree is now 0 split blocks of 112** in `scheduler/css/features`. **Deliberately did not ship the test** that would have caught this — see step 2, where the attempt is recorded. Contract 1.1.0 → 1.2.0. |

### 5.1 The Geist conformance program

**Opened 2026-08-22 by the owner. Step 7 has landed; the source is measured.** The stated
goal: *simplify the component set, retire what is obsolete, replace it with a Geist-style
selection, and normalize the names of what survives closer to Geist.*

**One clause of that goal is now bounded by measurement.** "Normalize the names" can only
mean **component names**, because §7.2 found Geist publishes no class vocabulary to
normalize toward. §1.1's class shape is this system's own and stays.

This is the shape `typography.md` §5.1 used for the same kind of work, and it is here rather
than in a new document for the reason that program demonstrated: retiring a rung and
renaming it are **one decision**, and splitting them across two documents means reading two
logs to reconstruct one change. Inventory and naming travel together. *(If the inventory
section outgrows this document later, it splits out as a numbered step — cheaper than
guessing now.)*

**The order is deliberate and it is not the intuitive one.** Simplify first, rename second.
Renaming a component that is about to be deleted is pure waste, and it is the easy drift,
because renaming feels more tractable than deciding what to cut.

**This document now has what typography's program ran on.** Typography could execute
because its §3 held a **measured catalog** — 29 styles read off rendered specimens, so every
later step was a mapping against a fixed source. `naming.md` had no equivalent when this
program opened: §1 recorded this system's own vocabulary and nothing recorded **what Geist
calls its components**. Renaming toward a target held only in someone's head cannot be
reviewed and cannot be recorded, so measuring it was step 7 and everything else waited on
it. **§7 is that catalog**, and every later step reads it rather than the site.

| # | Step | Status | Notes |
|---|---|---|---|
| 7 | Measure and publish Geist's component vocabulary | **done · Class A** | **Executed 2026-08-22; published as §7.** The census is the site's own sidebar in its own grouping — **72 component entries**, 71 pages plus `Pill`, which is a section of Badge the sidebar promotes — with each entry's definition taken from the page's own `meta description`, fetched for all 71 rather than transcribed. Mapped against the portable layer's **102 blocks**, **57** of them components once typography roles, `rux-u-*` utilities and base text are set aside. **The arithmetic closes on both sides** — 15 already-Geist names + 8 rename candidates + 34 with no counterpart = 57, and 23 matched + 49 unmatched = 72 — checked by script rather than by reading, because a mapping table that silently drops an entry looks exactly like one that does not. **The load-bearing finding is §7.2: Geist publishes a component vocabulary and no class vocabulary.** Its specimens carry Tailwind utilities; the only semantic names in the DOM are sparse `data-geist-*` attributes and a `geist-new-{variant}` / `-fill` variant set. So **adopting Geist wholesale cannot touch §1.1's class shape** — there is nothing on the other side to adopt — and the rename target is component names only. Two side findings came free, and **the first of them is a correction to my own first reading**: `geist-new-{v}` and `geist-new-{v}-fill` appear **on the same button simultaneously**, so `-fill` is a companion class naming one half of a variant's paint, **not** Geist's word for `--solid`. The tempting rename that reading suggested is unsupported, and **D4 stays open**. Second, Geist's own variant vocabulary is **not uniform** — Button is intent-named, Badge is hue-named with `-subtle` — so §1.2's Emphasis/Intent split cannot be resolved by copying it. **`switch`/`toggle` cross**: both names exist in both systems with opposite referents, `.rux-switch` being a boolean (Geist's Toggle) and `.rux-segmented-track` the option set (Geist's Switch); `drawer` crosses too, since Geist's Drawer is not the Sheet `.rux-drawer` maps to. §7.3 records that these move together or not at all. **Deliberately did not rename, retire, or decide anything** — §5.1 orders simplify before rename, and both later steps read this table. **Deliberately did not measure props, sizes or anatomy**: Badge documenting a Medium size does **not** reopen Q1, because a React prop and a CSS modifier are different artifacts and §7.2 records that Geist ships no modifier classes at all. **Deliberately did not fix the eight sibling-block pairs the census surfaced** (`.rux-tab`/`.rux-tabs`, the three scrims, `.rux-table-wrap`, the four `.rux-color-*`, and more) — those are **rule 2.1** candidates and **D1**'s untestable case, recorded in §7.4 as a finding for step 2, because settling R1's open question as a side effect of a naming census is precisely the accident this document has avoided. **Corrected the same day, in the open:** table D first listed **Theme Switcher** as unanswered. It is not — `.rux-switch--theme` is one. The census enumerated *blocks*, so an answer carried by a **modifier** was invisible to it, and the fix is the blind-spot note now in §7.3 rather than a quieter edit to the list. Geist-side arithmetic is now 23 by block + 1 by modifier + 48 unmatched = 72. `.rux-u-cols-2` was examined as a possible second case and **rejected**: a two-column utility is not an answer to **Grid**. Nothing renders differently; no code moved. Contract 1.3.0 → 1.4.0. |
| 8 | Audit the component set for retirement candidates | **done · Class A** | **Executed 2026-08-22; published as §8.** The *simplify* half of §5.1, and it moved no name. Usage was counted as **markup and JavaScript only** — a block's own stylesheet is its definition, not evidence anyone uses it — across this repository and across the consuming portal **excluding its vendored `design-system/` copy**, which is this repository's CSS copied back and would otherwise report every block as used. **Of 57 component blocks, 53 are live, 2 are gallery-only, and 2 are used nowhere.** **Gallery-only is deliberately not treated as a retire finding**: a design system publishes components its own reference app does not use, and recording `.rux-progress` and `.rux-section` here stops a later reader assuming the audit missed them. **`.rux-app-shell` is the clean candidate** — already deprecated in place at `app-shell.css:62`, superseded by `.rux-app__body`/`.rux-app-view` in `../portability-audit.md` step 10, zero uses here, and the two downstream matches are a changelog line saying the portal dropped it and an archived `guide_runner` page. Its only live dependency is **a test**: `tests/layout-contract.test.mjs:30–32` asserts on the deprecated alias, which is why the block survived, and is worth saying plainly — the suite was holding the name alive. **`.rux-color-picker` is proposed rather than recommended.** It is unused by any markup or script, but it is fully built — 7 elements, 43 rules, **20 public tokens** — and the hypothesis that `.rux-color-swatch` superseded it is consistent with the evidence without being proven by it. The cost of being wrong is asymmetric, so the owner decides. **A method error is recorded rather than hidden:** the first pass required a word boundary after the block name, which misses every `block__element` form and made `.rux-app-shell` look like it had consumers it does not; the counts here are from the corrected pattern. **`.rux-tag` moved category** — §7.3 called it a probable duplicate, but it has three real uses, so it is a **merge** candidate, and a merge must answer what its call sites become before anything is deleted. **Deliberately did not retire anything** (Class C, step 9), **did not audit tokens** (`--rux-shadow-pressed`'s zero consumers are recorded in `layout.md` step 9, because a dead token and an obsolete component are different retirements), and **did not touch the 39 `sched-*` blocks**, which are domain. One finding it was not looking for: **38 of 57 blocks appear in no gallery page**, which is an R9 contract-surface gap, not a retirement, and bears on step 9 — a component with no gallery entry has no rendered reference to check a rename against. Contract 1.4.0 → 1.5.0. |
| 9 | Retire the deprecated `.rux-app-shell` aliases | **done · Class C** | **Executed 2026-08-22 on the owner's approval**, recorded as `../portability-audit.md` **entry 23**, which owns the execution. Split from the `.rux-color-picker` decision at the owner's direction — take (a), hold (b) — and step 10 carries the held half. **The retirement closed a condition rather than overruling one.** Entry 10 kept these aliases *until the vendored consumers sync*, and entry 16 confirmed at commit `157b427` that the consumers still used them; both were correct when written, and the portal's 2026-08-19 rebuild dropped the aliases while `guide_runner` went to its archive. **The grep protocol is what made this safe, and it changed the plan twice.** First: §8.2 and this step both said the three `layout-contract` assertions would *move* onto `.rux-app-view`. They were **deleted** — the successors were already asserted four lines earlier, so repointing would have duplicated live coverage to keep a dead name company. An `assert.doesNotMatch` guard replaced them so the name cannot return by accident. Second, and more important: the grep reached `docs/` and `.claude/`, and found **three documents asserting these aliases must stay** — `layout-composition.md`'s MUST-NOT-USE rule, `audit/design-system-audit.md` H2 listing the block as a deliberate keep *because* consumers used it, and `.claude/skills/ponytail-review/SKILL.md`, which used it as its worked **classC** example under the promise that *every example is a real finding checked at the line cited*. All three were corrected in the same change; the skill's example moved to `.rux-color-picker`, verified at `rux-ui/css/base/form.css:642`, which is the better illustration now anyway — it is the candidate that was **held**. **A code-only rename would have left the repository contradicting itself in three places**, and none of them are CSS. **Cost:** 4 rules, no tokens. Contract 1.5.0 → 1.6.0. |
| 10 | Decide `.rux-color-picker` | **done · Class C** | **Decided 2026-08-22: retire.** Executed as `../portability-audit.md` **entry 24**, which owns Class C. **Held for a day on purpose, and the wait did its job.** §8.2 recorded it as *proposed rather than recommended* because *unused* and *obsolete* are different claims and only the first was measured; the cost of being wrong was asymmetric — 15 rules and 20 public tokens are cheap to keep and expensive to rebuild. **What settled it was mapping the three live colour sites**, prompted by the owner asking about `.rux-color-swatch`, not by counting references again. The block's anatomy — `__trigger` / `__preview` / `__popover` / `__option` — is a preset palette behind a popover, and both halves of that job ship elsewhere: `.rux-color-swatches` does the palette **inline** at `index.html:562` and `:1355`, `.rux-color-input` does **freeform entry** at `:3267`. A live component occupies each half of its design, which is what supersession looks like and what never-wired-up does not. **A number here was wrong and entry 24 corrects it**: §8.2 said 43 rules, which was `grep -c` counting occurrences; the block was **15**. §7.3's table C loses one block (34 → 33) and its arithmetic closes at 15 + 8 + 33 = 56. **Deliberately did not touch `.rux-color-swatch`, `.rux-color-swatches` or `.rux-color-input`** — the owner's question was whether the *swatch* could go, and measuring answered no: it is live in two features, and `index.html:557` records a deliberate decision that the avatar palette stay preset *"not a freeform picker"*. Retiring the picker is the opposite finding from the one the question went looking for. **§8.1's *used nowhere* row is now empty**, and with it this document has no open step. Contract 1.15.0 → 1.16.0. |
| 11 | Publish `.rux-radio`; fold the hand-rolled radio patterns onto it | **done · Class A — nothing was published, and that is the finding** | **Executed 2026-08-22, and it stopped before writing a line of CSS.** The step was planned on a premise the CSS does not support. **The three patterns are not three radios; they are two components, and neither is a plain radio.** `.trip-request-option` (`scheduler/css/features/trip-request.css:113`) hides its input with `position:absolute; opacity:0` and paints a **bordered card carrying a label and a hint**, selected via `:has(input:checked)` on the card. That is not Radio — it is Geist's **Choicebox**, *"a larger form of Radio or Checkbox, where the user has a larger tap target and more details"* (§7.1's measured description). `.rux-color-swatch` also hides its input, but paints a `__dot` whose whole purpose is a colour; §7.3 already placed the `.rux-color-*` family in table C as this system's own. **Same technique, different components** — a hidden input under a custom visual is how you build any styled control, and it is not evidence that two controls are the same one. **So `.rux-radio` would have shipped with zero consumers**, which is precisely the defect §8 identified two steps earlier in `.rux-color-picker`; publishing it here would have manufactured a fresh instance of the thing this program exists to remove. It stays unpublished and stays a gap. **This corrects a claim I made when the step was opened.** Step 11's plan called the swatches *"already a styled radio"* and Radio's *"natural first variant"*. That is wrong: the swatch is a colour component that happens to use a radio input for its grouping semantics, not a radio wearing colour. Folding it onto a future `.rux-radio` would put the palette decision recorded at `index.html:557` inside the wrong block. **§7.3's gap line is corrected with it.** **What the step produced instead is a better-shaped successor** — see step 12, where the same measurement found a real gap with **three live consumers** rather than none. **Deliberately did not publish anything anyway** to close the step tidily; a step that ends *do not build this* is worth more than one that ends with a dead block and a green checkmark. Contract 1.7.0 → 1.8.0. |
| 12 | Publish `.rux-choicebox`; retire `.trip-request-option` onto it | **done · Class A** | **Executed 2026-08-22.** `.rux-choicebox` is published in `rux-ui/css/base/form.css` with `__label` and `__hint`, **12 `--rux-choicebox-*` tokens**, and Geist's name. `.trip-request-option` is gone — **9 markup occurrences** converted in `request.html`, its 4 rules deleted from `scheduler/css/features/trip-request.css`. **Not Class C**: that class lived only in `scheduler/`, appeared nowhere in `rux-ui/`, and no vendored consumer could see it, so no public name was removed. It also clears the prefix drift step 11 recorded — the class was in neither namespace. **The port fixed an accessibility defect rather than reproducing it.** The application version hid its input with `opacity:0` and styled **no focus at all**, so a keyboard user selecting a trip type saw nothing move. `state.md` **R8** requires focus be visible everywhere, and a hidden input cannot show it, so the card carries it: `:has(input:focus-visible)` paints the standard `--rux-accent-ring`, and a compound rule keeps the focus ring legible **on top of** the checked inset ring rather than replacing it. **Verified by driving it, not by reading it.** Programmatic `focus()` does not trigger `:focus-visible`, so the check used a real ArrowRight through the radiogroup: the focused card resolved `inset 0 0 0 1px accent, 0 0 0 3px accent-ring` — both layers — selection moved to `one_way`, and the other two cards released their rings. Geometry is unchanged from the version it replaced (12px padding, 8px radius, accent border plus inset ring when checked), confirmed by computed style in **light** (`request.html`) and **dark** (`gallery.html`), with the three-across grid still collapsing at 500px. **A gallery specimen was added in the same change**, because §8.4 measured that 38 of 57 blocks have no entry and publishing a new public component without one widens the gap it records. **Deliberately did not add a disabled state** — no call site needs one, and §8 had just finished establishing that unused surface is the defect, so shipping a state on spec would have contradicted the audit two steps later. **Deliberately left `.trip-request__type-row` in the application layer**: a three-across row collapsing at 500px is that form's decision, not the component's, and a portable block that dictated its own grouping layout would be the mistake `layout.md` §9 warns about. **Still open and untouched:** `.rux-radio` proper, which still has no call site (step 11), and `.rux-color-swatch`, which is a colour component and not a candidate to fold into this or into Radio. Contract 1.8.0 → 1.9.0. |
| 13 | Consolidate the R1 splits rule 2.1 found | **done · Class A** | **Executed 2026-08-22, and it corrected the rule before it moved a line.** The step was written to consolidate six; reading them showed three were `.rux-drawer .rux-panel > .rux-panel__footer` and its kin — one block styling another inside its own context. Rule 2.1 gained **contextual override** (step 2 carries the correction), the count fell to **two**, and only then was anything moved. **Three moves, all within the application layer.** `.sched-scope-right-panel__footer-group` ×3 left `driver-week-info.css` for `scheduler-app.css`, which declares the bare block. `.sched-scheduler--trip-bar-size-xxs` and `--trip-bar-size-sm` left `trip-bar.css`, and the `.sched-scheduler__pull-hint` family left `scheduler-app.css`, both for `scheduler.css`, which owns `.sched-scheduler`. Each departure left a comment naming the new home, because a reader who knows the old location is the person most likely to be lost. **Verified by measurement, not argument, per step 6's template:** ten synthetic probes covering the moved selectors and their modifier and state variants — including the drawer-and-panel ancestor chain the footer group actually renders inside — were hashed across **1,517 computed properties each**, before and after, and **all ten are identical to the digit**. Cascade risk was the reason: `driver-week-info.css` loads *after* `scheduler-app.css`, so that move made three rules earlier, and the pull-hint move made six rules earlier still. Nothing shifted. **The moves broke six tests, and both causes were worth finding.** `trip-bar-size.test.mjs` read the size tiers out of `trip-bar.css` by path; the assertions are about typography rungs and the file was incidental, so it was repointed at `scheduler.css`. **The second cause is the real find.** With the tier blocks gone, that suite's whole-file regex stopped matching the XXS tier when it asked for the *default* tier — which is what it had silently been doing. Its assertion *the bus pill's box fits its own leading* had therefore been reporting agreement it never checked, while `typography.md` **D19** records that exact disagreement — the pill renders **12/12 in a 16px box**, measured live 2026-08-21. **The defect was open the whole time; only the coverage is new.** D19 is now **pinned rather than skipped**: the test asserts the known-bad pair, so fixing D19 fails it and forces the exception out, which a skip would not. That is not an allow-list — it is one named defect with an owning document, the same shape as `prefix-contract`'s accepted-bare entries. **Deliberately did not fix D19**: it is `typography.md`'s defect, it is Class B, and fixing it orphans `--rux-line-height-12` and turns that rung's retirement into a Class C question — three decisions that do not belong in a naming consolidation. **Deliberately did not touch the 57 contextual overrides**; they are correct as they stand. **Result: zero R1 violations**, which is step 14's acceptance criterion rather than a nice-to-have. Contract 1.11.0 → 1.12.0. |
| 14 | Enforce rule 2.1 | **done · Class A** | **Executed 2026-08-22 as `tests/block-ownership.test.mjs`, and it ships with no exception list** — the acceptance criterion, not a nice-to-have. *(This row previously said shipping early would cost **six** allow-list entries. That number was stale before it was ever true: six became two when step 13 added the contextual-override clause, then zero once the two were consolidated.)* The test carries the rule's three clauses and says so at the top, because each one exists because an earlier attempt lacked it: **ownership** (without it `.rux-card` looks split across seven `scheduler/` files), **subject** (`.rux-text-copy-14 :is(strong, b)` is a rule about `strong`), and **contextual override** (`.rux-drawer .rux-panel > `.rux-panel__footer` is the drawer's rule). **It was verified to fail before being accepted**, the discipline `../portability-audit.md` step 21 recorded: a deliberate `.rux-badge__deliberate-split` was added to `card.css`, the suite went red naming the block, its owning layer and both files, and the revert was confirmed clean. A contract test that cannot fail protects nothing. **A second test keeps the first one's escape hatch shut.** The main check can only adjudicate a block whose owner it can determine, so an undecidable block would drop out silently; the second asserts there are none. Writing it surfaced that **five app blocks** — `.sched-tasks`, `.sched-print`, `.sched-dev-notes`, `.sched-team-chat`, `.sched-scope-request` — style only their elements and never their container. **That is not a violation and was not made into one**: rule 2.1 does not require a container to carry CSS, so ownership falls back to the single layer their parts live in, which is decidable rather than assumed. Asserting a bare rule must exist would have been the test inventing a rule the document does not state. **`naming-contract.test.mjs`'s header was corrected in the same change** — it had said rule 2.1's operative half has no test, and pointing it at the new file keeps the pair honest about which suite owns what. **The blind spot is carried forward deliberately and written into the test**: grouped selectors are skipped, so a split hidden inside one escapes. The alternative flags every shared declaration in the layer. **D1 closes with this step**, and R1 is the last of the audit's rules to stop being a sentence somebody has to remember. Contract 1.12.0 → 1.13.0. |
| 15 | `.rux-menu` is a list surface with a menu's name | **done · Class A — the rename is declined, and that is the decision** | **Measured 2026-08-22, then declined.** The defect is real and this step still states it: `.rux-menu` carries four roles and **every one of `menu.css`'s 18 rules is pure surface styling** — `__item`, `__divider`, `__header`, hover, focus, disabled, checked, current, placement, hidden. **Nothing is menu-specific.** **That measurement is what killed the fix.** Two shapes were considered. An *extract* — publish a neutral surface and let `.rux-menu` compose it — was the appealing one, and it collapses on the same finding: with no menu-specific rule to keep, `.rux-menu` would be left with **zero rules of its own**, so the extract is a **127-occurrence Class C rename wearing a friendlier word**. A straight rename is the same cost stated honestly. **What the cost buys is naming accuracy and nothing else** — no behaviour changes, no consumer is affected (**zero** consumer-owned references; the portal's 133 hits are all inside its vendored copy), and no test gets easier to write. **It also fights §7.3.** Table A lists `.rux-menu` among the fifteen names *already Geist's*, and for its menu uses that is true — Geist publishes `Menu`. **§7.3 is corrected rather than overruled**: the mapping was right about the name and overclaimed *fixed point*, because Geist's Menu maps to a **subset** of what this block does. **Declining is the decision, not a deferral**, and the step closes so the log stops implying work is coming. What stays true and is now stated in §7.3: composing a block named for a *semantic* role into a `<nav>` reads as a lie in markup, where composing `.rux-card` or `.rux-panel` does not, because those names are neutral. **If this is ever revisited it should be inside a change that has another reason to touch those 127 sites** — riding along is what makes a rename affordable. |

**Next, in this order**, each opened as its own numbered step once the one before it
lands. **Step 8 landed — §8 is the audit, and it found two candidates, not the one §7.3
predicted.** `.rux-tag` turned out to have real call sites and moved to the merge pile;
`.rux-app-shell` and `.rux-color-picker` are the blocks nothing uses. **Step 9 retired the
first** on the owner's approval (`../portability-audit.md` entry 23); **step 10 holds the
second**, because unused and obsolete are not the same claim. Then: **rename** the
survivors onto Geist's vocabulary (Class C likewise, and the grep protocol applies to each —
with §7.3's warning that `switch`/`toggle` move together or not at all); **migrate** call
sites and the gallery. **D7 is absorbed here** — `.rux-menu` and `.sched-scheduler` are merge decisions
that the retire-and-rename pass reaches anyway, and fixing them first would risk merging a
block that is about to be retired.

---

## 6. Open questions

**Q1 — Should `--md` exist, or is an unmodified block the middle size? — ANSWERED: no
`--md`.** The middle size is an unmodified block, and `--md` is **forbidden** rather than
merely absent — publishing it would make every call site restate the default. R2's canonical
list was wrong, not the two components, and §1.2 is corrected. `.rux-panel--default-size`
(D3) resolves with it: a size modifier outside the size vocabulary, renamed or dropped.
*Answered 2026-08-22 with step 3.* Original text follows.

**Q1 — Should `--md` exist, or is an unmodified block the middle size?** R2's canonical list
names `--sm/--md/--lg`, and no block defines `--md`: `.rux-avatar` and `.rux-button` carry
`--sm` and `--lg` around an unmodified default. Publishing `--md` would make the set
symmetrical and every size explicit at the call site; leaving it out keeps the common case
shortest and is what every consumer already writes. *Blocks step 3, because the denylist has
to know whether `--md` is required, permitted, or forbidden. Whichever way it goes, D5 and
`--default-size` (D3) resolve with it.*

**Q2 — Is `--solid` one concept or two, and is `--default` a third name for it? —
ANSWERED: two concepts, and yes.** `--solid` means **filled**, everywhere. `.rux-badge` and
`.rux-output` already use it that way and keep it. `.rux-card--solid` means *adopt the
shell's chrome*, which is a different idea wearing the same word, and it is the one that
renames. `.rux-button--default` is the neutral filled variant — `--solid`'s first meaning
under another name — and it renames too.

Both are public renames, so `../portability-audit.md` owns the execution and step 3 records
them as pending rather than doing them. *Answered 2026-08-22 with step 3.* Original text
follows.

**Q2 — Is `--solid` one concept or two, and is `--default` a third name for it?** On
`.rux-badge` and `.rux-output` it means *filled*. On `.rux-card` it means *adopt the shell's
chrome* — a different idea that happens to look similar. `.rux-button--default` is the
neutral filled variant, which is `--solid`'s first meaning under another name. So the
vocabulary may be carrying one synonym pair and one collision at once. *Blocks step 3.*

**Q3 — Does the modifier vocabulary have families, or is it flat? — ANSWERED: a reading
aid.** §1.2's eight families stay as a way to read 38 modifiers and are **not** a rule. Step
3's test is therefore a **denylist** of what is known to be wrong, not an allowlist of
sanctioned families.

The allowlist is the stronger rule and the wrong one to write first: it would have to be
right about all 38 modifiers on the day it lands, and every miss becomes an exception entry
that makes it mean less. One family is checked as an allowlist — **sizes**, because Q1
settled it. *Answered 2026-08-22 with step 3.* Original text follows.

**Q3 — Does the modifier vocabulary have families, or is it flat?** §1.2 groups 38 modifiers
into eight families to make them legible, but nothing enforces that a new modifier joins
one, and the grouping was written for this document rather than derived from a rule. If the
families are real, a new modifier outside them is a defect and the denylist can say so; if
they are only a reading aid, §1.2 should say that plainly. *Blocks nothing. It decides
whether step 3's test is a denylist of known synonyms or an allowlist of sanctioned families
— a much stronger rule, and a much easier one to get wrong.*

---

## 7. Geist's component vocabulary

**Measured 2026-08-22 from [vercel.com/geist](https://vercel.com/geist) at 1440×900**, step 7
of §5.1. This section is the program's fixed source, the equivalent of what §3 is to
`typography.md`: everything that follows — retire, rename, migrate — reads this table rather
than someone's recollection of the site.

**Method.** The component list is the site's own sidebar, taken in its own grouping, not a
reading of which pages looked component-shaped. Each entry's one-line definition is the
page's own `meta description`, fetched same-origin for all 71 pages rather than transcribed.
The class-name observations in §7.2 were read off rendered specimens on the Button and Badge
pages. **No values were read** — this is a name census, and `README.md`'s note that Geist
does not publish its numbers is unaffected by it.

### 7.1 What Geist publishes

**Four foundations** — Introduction, Colors, Typography, Materials — and **72 component
entries**, of which 71 are pages; `Pill` is a section of the Badge page (`/geist/badge#pill`)
that the sidebar promotes to a sibling. The sidebar's third group, Brands, is asset
downloads and not a component vocabulary.

**Three of those four are rule sources this repository has already routed against** —
Colors, Typography and Materials; Introduction is orientation and carries no rules. There is
still **no breakpoint page**, which is why `layout.md` records breakpoints as originated
here rather than adopted.

### 7.2 How Geist names things — the finding that bounds this program

**Geist publishes a component vocabulary, not a class vocabulary.** Its components are React
components, and the rendered specimens carry Tailwind utilities. Measured on `/geist/button`:
427 distinct class tokens on the page, of which the semantic ones are

- **`data-geist-*` attributes** — `data-geist-button`, `data-geist-kbd`,
  `data-geist-textarea-wrapper`. These are the closest thing to a component identity in the
  DOM, and they are **sparse**: the Badge page emits no `data-geist-badge`, only the three
  above, which come from the page's own chrome rather than from the specimens.
- **a variant vocabulary**, carried by **15 elements on the Button page, every one of them
  a `<button>` inside `[data-geist-button]`**. Each carries **three** classes together:
  `geist-new-themed` — which is on all 15, so it is a base rather than a variant — plus a
  pair, `geist-new-{variant}` *and* `geist-new-{variant}-fill`. Four variants appear:
  **default, tertiary, warning, error**.

**Three consequences, and they are the reason this step came before any renaming.**

1. **There is no Geist class shape to converge on.** `.rux-{block}__{element}--{modifier}`
   has no counterpart, and adopting Geist "wholesale" cannot mean adopting its markup
   convention, because it does not publish one. §1.1 is unaffected by this program, and the
   rename target is **component names only**.
2. **`-fill` is a companion class, not a "filled" variant — and it does *not* settle D4.**
   The measurement is that `geist-new-error` and `geist-new-error-fill` appear **on the same
   button at the same time**, so `-fill` names one half of a variant's paint (the filled
   surface) rather than a variant meaning *filled*. That is a different construct from
   `.rux-badge--solid`, which is a variant. The tempting reading — *Geist calls it `fill`, so
   rename `--solid`* — **is not supported by what was measured**, and settling D4 needs the
   Button page's own variant semantics read, which this step did not do. D4 stays open
   against `../portability-audit.md` entry 22.
3. **Geist's own variant vocabulary is not uniform.** Button is intent-named (default,
   tertiary, warning, error — measured above) while Badge is hue-named (`Gray`, `Blue`, `Amber`, `Red`, each
   with a **`-subtle`** counterpart). §1.2 splits Emphasis from Intent and is closer to
   Button's model. A single vocabulary for both cannot be taken from Geist because Geist
   does not have one.

### 7.3 The mapping

Measured against the portable layer's **102 blocks** in `rux-ui/css`. Of those, 29 are
typography roles (`typography.md`'s, not components), 13 are `rux-u-*` utilities, two are
legacy colour utilities and one is base `.rux-text` — leaving **57 component blocks**, every
one of which appears in exactly one table below. The arithmetic closes on both sides: 15 + 8
+ 33 = 56 blocks — 57 at the census, less `.rux-color-picker` — and 23 matched by a block + 1 matched by a modifier + 48 unmatched = 72
Geist entries.

> **The census counts blocks, and that is a known blind spot.** An answer that exists as a
> **modifier** or a **utility** rather than a block is invisible to it. One was found by
> re-reading: Geist's **Theme Switcher** is answered by `.rux-switch--theme`, which table D
> listed as unanswered until this correction. `.rux-u-cols-2` is a thin partial for **Grid**
> and is *not* counted as an answer — a two-column utility is not a grid system. Anyone
> extending this table should search modifiers and `rux-u-*` before recording a gap.

**A — the name is already Geist's (15).** Nothing to do.

> **One correction, from step 15.** These were called *the program's fixed points*, which
> overclaimed. `.rux-menu` is Geist's name **for the menu it publishes**, and this block does
> four jobs — `role="menu"`, `role="dialog"`, `role="radiogroup"` and a bare `<nav>`. The
> name matches a **subset** of its uses. Step 15 measured the rename that would fix it,
> priced it at 127 occurrences of pure naming accuracy, and **declined**. A name being
> Geist's is not the same as a block being only what Geist means by it.

`.rux-avatar` · `.rux-badge` · `.rux-button` · `.rux-checkbox` · `.rux-input` · `.rux-menu` ·
`.rux-modal` · `.rux-progress` · `.rux-select` · `.rux-slider` · `.rux-table` · `.rux-tabs` ·
`.rux-textarea` · `.rux-toast` · `.rux-tooltip`

**B — a counterpart under a different name (8).** The rename candidates. Every one is a
public name, so every one is Class C and executes through `../portability-audit.md`.

| This system | Geist | Fit | Note |
|---|---|---|---|
| `.rux-alert` | **Note** | exact | *"Display text that requires attention or provides additional information."* Already the mapping `README.md` records |
| `.rux-switch` | **Toggle** | exact | **Crossing — see the warning below.** `.rux-switch` is a `<label>` over a hidden checkbox with `__track` and `__thumb`: a boolean. Geist's Toggle *"displays a boolean value"* |
| `.rux-segmented-track` | **Switch** | exact | **Crossing.** Geist's Switch *"choose between a set of options"* — which is `.rux-segmented-track` + `.rux-button--segment`, not `.rux-switch` |
| `.rux-drawer` | **Sheet** | partial | Geist's Sheet *"slides in from the edge of the screen"*. `.rux-drawer` animates `width` in flow on desktop (it pushes, it does not overlay) and only becomes `position: fixed` at the mobile breakpoint. Same role, different mechanics |
| `.rux-priority-dot` | **Status Dot** | exact in form | Geist's is deployment status; this one is trip priority. The shape is the same, the domain is not |
| `.rux-popover` | **Context Card** | partial | *"A floating card that appears on hover or focus. Capable of showing more complex UI than a tooltip"* |
| `.rux-suggestions` | **Combobox** | partial | *"Filters large lists to selectable options based on the matching query"* |
| `.rux-tag` | **Pill** | probable duplicate | `.rux-tag` is **one rule**, used in **one place** (`js/panels/driver-panel.js:665`, a CDL chip) and **zero times** in `index.html`. A retire-into-`.rux-badge` candidate, not a rename candidate |

> **The `switch`/`toggle` crossing is the most dangerous rename in this program.** Both names
> exist in both systems with **opposite** referents. A migration that renames one and
> not the other produces a repository where `.rux-switch` means a boolean in some files and a
> segmented control in others, and every grep for either word returns a mixture. If these are
> taken, they are taken **in one step, or not at all** — and the step needs the §5.1 grep
> protocol run for both names at once.
>
> **And the target name is not free.** `.rux-button--toggle` already exists — an
> `aria-pressed` button, 23 occurrences, with its own test in
> `tests/panel-toggle.test.mjs`. Renaming `.rux-switch` to `.rux-toggle` would put **two
> different concepts** under the word *toggle* in one system: a boolean switch widget and a
> pressed-state button. That is drift #4 in §3 — one name, two concepts — created
> deliberately, in the document whose job is to prevent it. Whoever opens the rename step
> owns this collision before the first `sed`.

**C — this system's own, no Geist counterpart (33; 34 at the census, less `.rux-color-picker`, retired by step 10).** Geist publishes no generic **Card**;
its card-like pages are Context Card, Error Card and Entity, all specific. `.rux-card` — 49
selectors, this layer's most-used structural block — therefore has **nothing to converge
on**, and neither does the entire application-shell family. These are not gaps.

- **Shell and layout (9)** — `.rux-app` · `.rux-app-shell` · `.rux-app-view` ·
  `.rux-ui-header` · `.rux-workspace` · `.rux-panel` · `.rux-side-nav` · `.rux-splash` ·
  `.rux-skip-link`
- **Structure (9)** — `.rux-card` · `.rux-section` · `.rux-field` · `.rux-input-group` ·
  `.rux-tab` · `.rux-table-wrap` · `.rux-icon` · `.rux-output` · `.rux-status-text`
- **Scrims and gutters (6)** — `.rux-side-nav-scrim` · `.rux-modal-scrim` ·
  `.rux-drawer-scrim` · `.rux-drawer-gutter` · `.rux-resize-gutter` · `.rux-toast-host`
- **Application furniture (9)** — `.rux-view-options` · `.rux-preferences` ·
  `.rux-profile-picker` · `.rux-number-stepper` · `.rux-notifications` ·
  `.rux-col-filter-icon` · `.rux-color-swatch` · `.rux-color-swatches` ·
  `.rux-color-input` *(`.rux-color-picker` was here until step 10 retired it)*

The application layer's **39 `sched-*` blocks** are all domain — trip, driver, fleet,
manifest, itinerary — and are out of this program's scope entirely. A trip bar has no Geist
equivalent and never will.

**D — Geist publishes it and this system has no answer (48).**

Banner · Book · Breadcrumbs · Browser · Calendar · Choicebox · Clearable Input · Code · Code
Block · Collapse · Command Menu · Context Menu · Copy Button · Description · Destructive
Action Modal · Dots Menu · **Drawer** · Empty State · Entity · Error · Error Card · Feedback ·
Fieldset · File Tree · Gauge · Grid · JSON View · Keyboard Input · Label · Load More Button ·
Loading Dots · MiddleTruncate · Multi Select · Pagination · Phone · Project Banner · **Radio** ·
Relative Time Card · Scroller · Search Input · Separator · Show more · Skeleton · Snippet ·
Spinner · Split Button · Text With Copy Button · Video

**This list is not a backlog.** Much of it is Vercel's domain and not this one: Book,
Browser, Phone and Video are marketing frames; Code, Code Block, Snippet, JSON View and File
Tree are developer-tool surfaces. **Drawer** appears here because Geist's Drawer is a
separate view from the current context, a different component from the Sheet that
`.rux-drawer` maps to — the name is taken in both systems for different things, which is the
second crossing and the reason B's warning is not paranoia.

**Two entries are real gaps, and a third was hiding behind one of them.** **Radio** — the
repository renders **15 `type="radio"` inputs** and publishes no portable radio block, but
step 11 measured the CSS and found **none of them is a plain radio**: twelve wear
`.rux-color-swatch`, a colour component that uses a radio input for grouping, and three wear
`.trip-request-option`, which is a **Choicebox** by Geist's own definition. So Radio has no
call site waiting for it, and **Choicebox is the gap with live consumers** — step 12 carries
it. **Separator** — dividers are open-coded as borders. *(Two earlier drafts of this line were
wrong: the first said "the one radio in the system", undercounting by measuring a single site;
the second called the swatches Radio's natural first variant, which confuses a shared
technique — a hidden input under a custom visual — with a shared component.)*

### 7.4 What this step deliberately did not do

**No renames, and no retire decisions.** §5.1 orders the program simplify-first precisely so
that a name is not moved onto a component that is about to be deleted, and this step
publishes the table both of those later steps read. Table B is a list of *candidates* — the
word is load-bearing. Nothing in §1, §2 or §3 changes.

**Did not measure Geist's props, sizes or anatomy.** Only names. Badge documents Small,
Medium and Large, and it is tempting to read that as reopening Q1's answer that the middle
size is unmodified — it does not, because a React prop `size="medium"` and a CSS modifier
`--md` are different artifacts, and §7.2 records that Geist ships no modifier classes at all.
Q1 stands. Reopening it would need a measurement this step did not make.

**Did not resolve the sibling-block pairs the census surfaced.** Building table C put them
in one place for the first time: `.rux-tab`/`.rux-tabs`, `.rux-toast`/`.rux-toast-host`,
`.rux-table`/`.rux-table-wrap`, `.rux-modal`/`.rux-modal-scrim`,
`.rux-side-nav`/`.rux-side-nav-scrim`, `.rux-drawer`/`.rux-drawer-gutter`/`.rux-drawer-scrim`,
`.rux-app`/`.rux-app-shell`/`.rux-app-view`, and the four `.rux-color-*` blocks. Each is a
candidate violation of **rule 2.1** — sibling blocks for parts of one component — and they
are exactly the cases **D1** records as untestable because nothing declares which blocks
belong to which component. This is a **finding for step 2**, recorded here and fixed there.
Renaming them inside a Geist conformance step would settle R1's open question by accident, in
the one document that has been careful not to.

---

## 8. The retire audit

**Measured 2026-08-22**, step 8 of §5.1, and the first half of the program's *simplify*
phase. §7 asked what Geist calls things; this section asks **what this system still needs**.
It publishes findings and **retires nothing** — retirement moves public names, which is
Class C and belongs to step 9 and `../portability-audit.md`.

**Method.** Usage was counted as **markup and JavaScript only**, never CSS: a block's own
stylesheet is its definition, not evidence that anyone uses it. Each of §7.3's **57 component
blocks** was counted across this repository's pages, `js/`, `rux-ui/js/`, `scheduler/`, and
`examples/`, and separately across the consuming portal at `~/Developer/infor-ln-docs`
— **excluding its vendored `design-system/` copy**, which is this repository's own CSS
copied back and would otherwise report every block as used. Element and modifier forms
(`block__element`, `block--modifier`) count as uses of the block; an early pattern that
required a word boundary after the block name missed them, which is why `.rux-app-shell`
first appeared to have consumers it does not.

### 8.1 The three categories

| Category | Count | Meaning |
|---|---|---|
| **Used by an application** | 53 | Live. Not candidates. |
| **Gallery-only** | 2 | `.rux-progress`, `.rux-section` — demoed on the contract surface, used by no app |
| **Used nowhere** | 2 | `.rux-app-shell`, `.rux-color-picker` — the only retire candidates. **Both retired**, by steps 9 and 10; this row is now empty |

**Gallery-only is not a retire finding, and this section will not treat it as one.** A design
system publishes components its own reference application happens not to use; that is what
being a design system means. `.rux-progress` and `.rux-section` are demoed, documented and
reachable. They are recorded here so that a later reader does not rediscover them and assume
the audit missed them.

### 8.2 The two candidates

**`.rux-app-shell` — retire. The evidence is unusually clean.**

- **Already deprecated in place.** `rux-ui/css/base/app-shell.css:62` calls it and its
  `__workspace` / `__panel` elements *"the pre-2026-08 aliases"*, superseded by
  `.rux-app__body` and `.rux-app-view` in `../portability-audit.md` step 10.
- **Zero uses here** — not in any page, not in `js/`, not in `examples/`.
- **Zero live uses downstream.** Two portal files match, and **neither is live code**: one is
  a changelog line in `index.md` recording that the portal *"dropped the deprecated
  `.rux-app-shell` aliases"*, and the other is `_archive/guide_runner/index.html`, in the
  archive since 2026-08-19. The consumer migrated off this block on its own.
- **Cost:** 4 CSS rules. **No `--rux-app-shell-*` tokens exist**, so nothing else travels
  with it.
- **One live dependency, and it is a test.** `tests/layout-contract.test.mjs:30–32` asserts on
  `.rux-app-shell` and `.rux-app-shell__workspace`. Retiring the block means those assertions
  move to `.rux-app-view` or go.
- **Outcome — retired 2026-08-22**, step 9 and `../portability-audit.md` entry 23. They
  **went** rather than moved: the successors were already asserted four lines earlier. The
  grep protocol also found three documents asserting these aliases must stay, all corrected
  in the same change — see step 9. **A test asserting on a deprecated alias is the reason this
  block survived**, and worth saying plainly: the suite was holding the name alive.

**`.rux-color-picker` — propose to retire, but this one needs the owner, not the data.**

- **Zero uses here and downstream.** The only two textual matches are a *comment* in
  `scheduler/css/features/trip-request.css:62` and §7.3's own table in this document. The
  portal's 66 matches are all inside its vendored copy of `form.css` — the block's own
  definition, travelling as part of the stylesheet.
- **It is fully built:** a container plus **7 elements** (`__trigger`, `__preview`, `__label`,
  `__chevron`, `__popover`, `__option`, and the check), 43 CSS rules, and **20 public
  `--rux-color-picker-*` tokens**.
- **The likely story, offered as a hypothesis rather than a finding:** the application *does*
  pick colours — `.rux-color-swatch` has 12 uses in `index.html` and `.rux-color-swatches`
  three — so this looks like a **superseded earlier implementation** that the swatch approach
  replaced without anyone deleting it. That is consistent with the evidence and is **not
  proven by it**. A component built to this depth and never wired up may equally be waiting
  for a use nobody got to.
- **Because the cost of being wrong is asymmetric** — 20 public tokens and 43 rules are
  cheap to keep and expensive to reconstruct — **this one is proposed, not recommended.**

### 8.3 `.rux-tag`, re-examined

§7.3 called it a *probable duplicate* of `.rux-badge`. With usage counted it is **not a
zero-use block**: three occurrences, in `gallery.html` and at
`js/panels/driver-panel.js:665`, where it renders a CDL chip. So it is a **merge** candidate,
not a retire candidate, and the distinction matters because a merge has to answer *what the
call sites become* before anything is deleted. Its single rule is a padded label; `.rux-badge`
already carries a size and variant vocabulary that would have to absorb it. Recorded, and
left to step 9.

### 8.4 A finding this audit was not looking for

**38 of the 57 blocks appear in no gallery page** — including `.rux-panel`, `.rux-menu`,
`.rux-modal`, `.rux-popover`, `.rux-drawer`, `.rux-switch`, `.rux-table` and the entire
application-shell family. The gallery demos 19.

That is a **contract-surface gap, not a retirement finding**, and it belongs to **R9** — *the
gallery as contract surface* — whose home `README.md` §1 records as `CLAUDE.md` rather than
any foundation document. **R9 is not unenforced, and this section should not be read as
saying so:** `tests/gallery-coverage.test.mjs` ships as a **ratchet** — it records today's
missing specimens, forbids a new component without one, and requires the list to shrink. It
counts the 22 components of `rux-ui/css/base/`, a different population from the 57 blocks
counted here, which is why the two numbers do not meet. It is recorded here because this audit is what measured it, and
because it bears on step 9: a component with no gallery entry has no rendered reference to
check a rename against.

### 8.5 What this step deliberately did not do

**It retired nothing.** Both candidates are public names, so both are Class C: they stop and
propose, and `../portability-audit.md` executes. Step 9 carries the proposal.

**It did not audit tokens.** `--rux-shadow-pressed` was found to have **zero consumers**
while step 9 of `layout.md` was measuring elevation, and it is recorded there rather than
swept up here. A dead *token* and an obsolete *component* are different retirements with
different blast radii, and §5.1's program is about the component set.

**It did not extend to the application layer.** The 39 `sched-*` blocks are domain, out of
this program's scope, and were not counted.
