# Rux UI Foundations — Naming

**Contract version: 1.0.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 5 steps: **1 done · 4 open**
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
| Emphasis | `--ghost`, `--solid`, `--default`, `--accent` |
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
   neutral filled variant on `.rux-button` and `.rux-panel`; `--solid` is the filled variant
   on `.rux-badge` and `.rux-output`.
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
| D2 | Rule 2.4 (R2) has no test. The audit specified a synonym denylist; it was never written, and §3 records four drifts it would have caught. | step 3, gated on Q1 and Q2 |
| D3 | `.rux-panel--default-size` is a size modifier outside the size vocabulary. | step 3 |
| D4 | `--solid` carries two concepts (`.rux-badge` fills; `.rux-card` adopts shell chrome), and `--default` may be a third name for the first of them. Resolving either is a public rename and belongs in `../portability-audit.md`. | step 3, gated on Q2 |
| D5 | R2's canonical list names `--md`, which no block defines. Rule or practice is wrong and this document does not yet say which. | Q1 |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R1, R2, R4 and R5 as canonical | **done · Class A** | Founding entry, 2026-08-22, and the last of `README.md` §1's routing table to land. **Nothing was invented and nothing resolves differently.** R4 and R5 were already enforced by `prefix-contract` and `class-resolution`; R1 was half enforced by `naming-contract`; R2 was never enforced at all. §1's tables and §3's four drifts are **measured** — the 38 modifiers were enumerated from `rux-ui/css`, and the two synonym findings came from reading what `--solid` and `--default` actually do in each block rather than from the names. **Deliberately did not fix D3, D4 or D5**, all of which are public renames: `CLAUDE.md` prohibits a rename outside a document that authorizes it, and the authorizing document for a public name is `../portability-audit.md`, not this one. **Deliberately did not write the denylist** (step 3) — Q1 and Q2 decide what belongs on it, and a denylist written first would encode whichever reading its author held, the same trap `state.md` step 1 recorded for R7. **Deliberately did not claim `.is-*` / `.has-*`**, which `state.md` owns: `naming-contract` happens to check their shape, and a test's file name is not a claim of ownership. **Deliberately did not restate `../portability-audit.md`'s rename process**, which stays the one home for how a public name changes. |
| 2 | Give rule 2.1 a testable definition, then enforce it (D1) | **[open]** | The blocker is not the test, it is the definition: "sibling blocks for parts of one component" needs a machine-readable statement of which blocks are parts of which component. Options are a declared manifest, or inferring it from co-location in one CSS file — the second is free and probably close enough, since the portable layer is already one file per component. **Do not skip to the test**: an inferred rule that is wrong in a few places will be silenced with exceptions until it means nothing. |
| 3 | Answer Q1 and Q2, then enforce rule 2.4 (D2, D3, D4, D5) | **[open]** | The synonym denylist R2 asked for. Scope depends on both questions. Any rename it implies is Class C and goes through `../portability-audit.md` first, with the grep protocol `CLAUDE.md` requires — `--solid` alone spans four blocks in three files. |
| 4 | Move R1, R2, R4 and R5 out of `../audit/design-system-audit.md` §5 | **[open]** | That section's own status note commits each rule to move as its foundation document lands. With this document written, all four of its rules can go, leaving the test mapping. **Gated on steps 2 and 3** — converting a rule to a pointer before it is settled deletes the only statement of it, which is the trap `typography.md` step 16 records. |
| 5 | **Consolidate** — strip duplicated naming rules elsewhere; convert them to pointers | **[open]** | The closing step. In scope: the `rux-design` skill's BEM and prefix rules, `README.md` wherever it states a naming rule, `../audit/design-system-audit.md` §4's naming glossary, and `CLAUDE.md`'s own naming guidance. **Blocked on steps 2–4.** |

---

## 6. Open questions

**Q1 — Should `--md` exist, or is an unmodified block the middle size?** R2's canonical list
names `--sm/--md/--lg`, and no block defines `--md`: `.rux-avatar` and `.rux-button` carry
`--sm` and `--lg` around an unmodified default. Publishing `--md` would make the set
symmetrical and every size explicit at the call site; leaving it out keeps the common case
shortest and is what every consumer already writes. *Blocks step 3, because the denylist has
to know whether `--md` is required, permitted, or forbidden. Whichever way it goes, D5 and
`--default-size` (D3) resolve with it.*

**Q2 — Is `--solid` one concept or two, and is `--default` a third name for it?** On
`.rux-badge` and `.rux-output` it means *filled*. On `.rux-card` it means *adopt the shell's
chrome* — a different idea that happens to look similar. `.rux-button--default` and
`.rux-panel--default` are the neutral filled variant, which is `--solid`'s first meaning
under another name. So the vocabulary may be carrying one synonym pair and one collision at
once. *Blocks step 3. Answering it means deciding which of the three names survives in which
family — a public rename either way, so `../portability-audit.md` owns the execution.*

**Q3 — Does the modifier vocabulary have families, or is it flat?** §1.2 groups 38 modifiers
into eight families to make them legible, but nothing enforces that a new modifier joins
one, and the grouping was written for this document rather than derived from a rule. If the
families are real, a new modifier outside them is a defect and the denylist can say so; if
they are only a reading aid, §1.2 should say that plainly. *Blocks nothing. It decides
whether step 3's test is a denylist of known synonyms or an allowlist of sanctioned families
— a much stronger rule, and a much easier one to get wrong.*
