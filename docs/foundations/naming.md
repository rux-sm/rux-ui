# Rux UI Foundations — Naming

**Contract version: 1.7.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 11 steps: **6 done · 5 open**
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

**2.1 One block per component.** A component's container, elements and modifiers share one
BEM block. Sibling blocks for parts of one component are prohibited. *(R1. **Half
enforced** — see §3 and §4 D1.)*

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

**R1 — the shape holds; the substance is unchecked.** `naming-contract` verifies that every
class matches the BEM pattern and that no modifier orphans its block. It does **not** check
the sentence R1 actually turns on — *sibling blocks for parts of one component are
prohibited* — because that requires knowing which blocks are parts of which component, and
nothing declares that. The rule with the teeth is the one with no test.

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
| D1 | Rule 2.1's operative half — no sibling blocks for one component — has no test, because nothing declares which blocks belong to which component. `naming-contract` checks the pattern and the orphan case only. | step 2 |
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
| 2 | Give rule 2.1 a testable definition, then enforce it (D1) | **[open]** | **Attempted 2026-08-22 during step 4 and deliberately abandoned — the attempt is the finding.** This step named two options, a declared manifest or inferring component membership from co-location in one CSS file, and warned: *do not skip to the test; an inferred rule that is wrong in a few places will be silenced with exceptions until it means nothing.* Co-location was tried and **is not sufficient**, across three successive refinements. **(i)** Counting any top-level `.block` selector gave **28** violations — because `.rux-text-copy-14 :is(strong, b)` is a *descendant* rule, and the pattern read the space as part of a declaration. Seventeen of the 28 were that one bug. **(ii)** Counting only `.block__element` and `.block--modifier` gave **6** — better, but `card.css` deliberately shares one rule across `.rux-card__title, .rux-panel__title, .rux-workspace__title`, which is a rule *shared*, the opposite of a block split. **(iii)** Ignoring grouped selectors gave **5**, and there it stopped improving: `.rux-card`, `.rux-drawer` and `.rux-panel` are split between the portable layer and `scheduler/`, which is an **application composing with a portable block** — governed by `../portability-audit.md`, not by R1 — while `.rux-menu` (`menu.css` + `utils.css`) and `.sched-scheduler` (three files) look like real within-layer splits. **What the definition still needs**: R1's sentence does not distinguish *splitting a block* from *overriding one across a tier boundary*, and no amount of pattern-fitting recovers a distinction the rule never made. A manifest, or a layer-aware rule, or an amendment to R1 itself. **A test was written and deleted rather than shipped with five allow-list entries** — which is precisely the outcome this step was written to prevent, and it would have been easy to talk myself into. |
| 3 | Answer Q1–Q3; enforce rule 2.4 (D2, D5) | **done · Class A** | **Executed 2026-08-22.** All three questions answered by the owner, and `tests/modifier-vocabulary.test.mjs` written against the answers. **Q1: no `--md`** — the middle size is an unmodified block, and `--md` is *forbidden* rather than absent, since publishing it would make every call site restate the default. R2's canonical list was wrong, not the two components. **Q3: the eight families are a reading aid**, so the test is a **denylist**, not an allowlist of sanctioned families — the allowlist would have to be right about all 38 modifiers on the day it lands, and every miss becomes an exception that makes it mean less. Sizes are the one family checked as an allowlist, because Q1 settled them. **Q2: `--solid` means filled, everywhere**; `.rux-card`'s chrome meaning and `.rux-button--default` both rename. **The test caught an error in the survey that motivated it.** §3 and §1.2 claimed `--default` was on `.rux-button` *and* `.rux-panel`. It is not: `.rux-panel--default-size` is a different modifier, and the greedy pattern in the founding scan read its prefix as a bare `--default`. The pending-rename list failed on the phantom class the first time it ran. Both sections are corrected, and this is the argument for writing the test rather than trusting the survey. **Closes D2** (2.4 had no test) **and D5** (R2's list named a `--md` nothing defines). **Deliberately did not execute the three renames** — Class C, and `CLAUDE.md` sends them to `../portability-audit.md`, now **entry 22**, which is where entry 19 did the same job on 2026-08-20. D3 and D4 stay open against that entry. **Deliberately did not check for *new* collisions**: one name carrying two concepts needs a human to read what a modifier does, so the test pins the one we found and asserts a second needs a defect entry rather than a list entry. Contract 1.0.0 → 1.1.0. |
| 4 | Move R1, R2, R4 and R5 out of `../audit/design-system-audit.md` §5 | **[open]** | That section's own status note commits each rule to move as its foundation document lands. With this document written, all four of its rules can go, leaving the test mapping. **Gated on steps 2 and 3** — converting a rule to a pointer before it is settled deletes the only statement of it, which is the trap `typography.md` step 16 records. |
| 5 | **Consolidate** — strip duplicated naming rules elsewhere; convert them to pointers | **[open]** | The closing step. In scope: the `rux-design` skill's BEM and prefix rules, `README.md` wherever it states a naming rule, `../audit/design-system-audit.md` §4's naming glossary, and `CLAUDE.md`'s own naming guidance. **Blocked on steps 2–4.** |
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
| 10 | Decide `.rux-color-picker` | **[open]** | **Held by the owner 2026-08-22**, and held is the correct state rather than a stalled one. §8.2 records why: the block is unused by any markup or script in either repository, but it is fully built — 7 elements, 43 rules, **20 public `--rux-color-picker-*` tokens** — and the hypothesis that `.rux-color-swatch` superseded it is *consistent with* the evidence without being *proven by* it. The cost of being wrong is asymmetric: keeping it costs 43 rules, and reconstructing it costs the design work. **What would settle it** is not more grepping — it is the owner confirming whether the swatch UI replaced this picker or the picker was never wired up. Until then it stays published, and it is now the `ponytail-review` skill's worked example of exactly this situation. **Evidence recorded 2026-08-22, and it favours supersession.** Mapping the three live colour sites showed the held block's job is fully covered by two components that shipped: `.rux-color-picker`'s anatomy is `__trigger` / `__preview` / `__popover` / `__option` — **a preset palette behind a popover** — and `.rux-color-swatches` now does that palette **inline** in two places (avatar colour at `index.html:562`, trip bar colour at `:1355`), while `.rux-color-input` does **freeform entry** for vehicle colour at `:3267` with a swatch button, a visually-hidden native `<input type="color">` and a 7-character hex field. Between them there is no colour interaction left for the popover version to serve. **This is still evidence and not a decision** — it establishes that nothing *needs* the block, which was never in doubt; what it adds is that a live component occupies each half of its design, which is what supersession looks like and what never-wired-up does not. The owner still decides. |
| 11 | Publish `.rux-radio`; fold the hand-rolled radio patterns onto it | **[open]** | **Planned 2026-08-22, deliberately not started.** §7.3 records **Radio** as one of two real gaps against Geist, and measuring the markup made it sharper: the repository renders **15 radio inputs across three hand-rolled patterns** and publishes **no portable radio block at all**. `index.html` has 12 — six `name="profileAvatarColor"` and six `name="tripBarColor"`, both wearing `.rux-color-swatch`, which is therefore **already a styled radio** that happens to render as a colour dot. `request.html` has three more on `.trip-request-option` (`scheduler/css/features/trip-request.css:113`), a trip-type selector that is a plain radio group with no colour in it. **A third finding came free and is recorded rather than acted on:** `.trip-request-option` carries **neither the `rux-` nor the `sched-` prefix**, and no contract test catches it because `prefix-contract` and `naming-contract` are scoped to `rux-*`. That is an application-layer naming drift, adjacent to `../portability-audit.md` step 5 but not the same thing — that step renames `.rux-*` elements to `.sched-*`, while this class is in neither namespace. **Shape, not design:** publishing `.rux-radio` is **Class A**, purely additive, and can land whenever something needs it. **Folding the existing patterns onto it is Class C** — `.rux-color-swatch` is a public name with 24 occurrences — and would need its own proposal, its own ledger entry and the grep protocol. **The two must not be bundled**, which is the whole reason this is recorded as one step with two classes named rather than as a single rename. **Do not treat the swatches as merely unstyled radios.** `index.html:557` records a deliberate decision — the avatar palette is preset *"not a freeform picker, so avatars stay visually consistent with the rest of the app"* — so any fold has to preserve a constrained palette as a first-class variant, not flatten it into a generic radio. |

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
+ 34 = 57 blocks, and 23 matched by a block + 1 matched by a modifier + 48 unmatched = 72
Geist entries.

> **The census counts blocks, and that is a known blind spot.** An answer that exists as a
> **modifier** or a **utility** rather than a block is invisible to it. One was found by
> re-reading: Geist's **Theme Switcher** is answered by `.rux-switch--theme`, which table D
> listed as unanswered until this correction. `.rux-u-cols-2` is a thin partial for **Grid**
> and is *not* counted as an answer — a two-column utility is not a grid system. Anyone
> extending this table should search modifiers and `rux-u-*` before recording a gap.

**A — the name is already Geist's (15).** Nothing to do; these are the program's fixed
points.

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

**C — this system's own, no Geist counterpart (34).** Geist publishes no generic **Card**;
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
- **Application furniture (10)** — `.rux-view-options` · `.rux-preferences` ·
  `.rux-profile-picker` · `.rux-number-stepper` · `.rux-notifications` ·
  `.rux-col-filter-icon` · `.rux-color-picker` · `.rux-color-swatch` · `.rux-color-swatches` ·
  `.rux-color-input`

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

**Two entries are real gaps.** **Radio** — the repository renders **15 `type="radio"` inputs
across three hand-rolled patterns** and publishes no portable radio block: twelve wear
`.rux-color-swatch` (avatar and trip-bar colour), and three wear the unprefixed
`.trip-request-option`. *(An earlier draft of this line said "the one radio in the system,"
which undercounted by measuring one site; step 11 carries the corrected census and the plan.)*
**Separator** — dividers are open-coded as borders. Both are Class A additions whenever
something needs them, and neither blocks this program.

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
| **Used nowhere** | 2 | `.rux-app-shell`, `.rux-color-picker` — the only retire candidates |

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
any foundation document. It is recorded here because this audit is what measured it, and
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
