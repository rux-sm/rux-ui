# Rux UI Foundations — State

**Contract version: 1.0.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 5 steps: **1 done · 4 open**
This document is canonical for **how a component expresses that it is in a state** — which
attribute carries it, which class may substitute, who may bind a dismiss listener, and where
a focus ring is required. It is the home `README.md` §1 routes **R3, R7 and R8** to.

**It was founded to fix an inversion, not to invent rules.** R3 and R8 have been enforced by
`tests/state-contract.test.mjs` and `tests/focus-contract.test.mjs` since 2026-08-20, and R7
has never been enforced at all. Two live rules whose only statement was a test, and one
stated nowhere and checked by nothing — which is the same defect `layout.md` step 1 was
written to correct, standing in three more places.

---

## 1. The vocabulary

### 1.1 Aria is the state of record

Where an aria attribute expresses the state, **CSS selects on it and JS writes only it**.
The portable layer already works this way; these are the attributes its stylesheets select
on, with the number of rules that do:

| Attribute | Rules | Expresses |
|---|---|---|
| `[aria-disabled="true"]` | 25 | not operable |
| `[aria-pressed="true"]` | 12 | a toggle is on |
| `[aria-selected="true"]` | 11 | chosen within a set |
| `[aria-expanded="true"]` | 7 | a trigger's surface is open |
| `[aria-invalid="true"]` | 6 | a field failed validation |
| `[aria-current="page"]` | 3 | the active destination |
| `[aria-checked="true"]` | 1 | a checkbox or switch is on |

`[hidden]` carries presence. It is an attribute, not a class, for the same reason: one
writer, one reader, and assistive technology gets the state without a second channel.

### 1.2 `.is-*` is the exception, not the alternative

`.is-*` is reserved for **states no aria attribute expresses** — `is-dragging`,
`is-scrolled`, `is-resizing`. It is not a second way to say `aria-expanded`.

Fifteen `.is-*` classes exist in `rux-ui/css`. Eleven are uncontroversial by that test:
`is-closing`, `is-collapsing`, `is-dragging`, `is-filtered`, `is-placeholder`,
`is-resizing`, `is-scrolled`, `is-sort-asc`, `is-sort-desc`, `is-unread`, and the
`is-balance-*` family, which are categorical data values rather than interface states.
**Four are not**, and §4 D1 records them.

### 1.3 What state is not

- **Not a BEM modifier.** `--open`, `--active`, `--hidden`, `--selected` and their kin are
  prohibited. A modifier names a *variant* — what a component permanently is — and a state
  is what it is right now. Two accepted exceptions are recorded as debt in §4 D4.
- **Not a write with no reader.** JS MUST NOT write a class or attribute no stylesheet
  reads. An unread write is either a missing rule or a dead line, and both are defects.

---

## 2. Rules

**2.1 Aria is the state of record.** Where an aria attribute expresses the state, CSS
selects on it and JS writes only it. *(R3. Enforced: `tests/state-contract.test.mjs`.)*

**2.2 `.is-*` only where no aria attribute expresses the state.** A `.is-*` class whose
state has an aria equivalent is a defect, not a style choice. *(R3's second half. **Not
enforced** — see §4 D1.)*

**2.3 A BEM modifier never expresses a state.** *(R3. Enforced.)*

**2.4 JS never writes what nothing reads.** *(R3. Enforced, for both classes and
`data-rux-*` attributes.)*

**2.5 One overlay kernel.** Dismissible surfaces register with the shared dismiss manager in
`rux-ui/js/overlay.js` — one singleton, one outside-`pointerdown`, one Escape policy, one
focus trap and restore helper, one layer-promotion helper. **No module binds its own
document-level dismiss listener.** *(R7. **Not enforced** — see §4 D2.)*

**2.6 Focus is visible everywhere.** Every base file that styles an interactive selector
carries a `:focus-visible` rule keyed to `--rux-accent-ring`. A rule that suppresses the
ring without drawing one is a defect. *(R8. Enforced: `tests/focus-contract.test.mjs`.)*

---

## 3. Current state

**R3 — holds, with two recorded exceptions.** `state-contract` runs four checks: no BEM
state modifier, every `.is-*` written by `rux-ui/js` is read by a stylesheet, no
`data-rux-*` is written and read by nothing, and the accepted list stays honest. The
unread-attribute list is **empty**. The state-modifier list holds **two** entries, both
recorded as pending renames (§4 D4).

**R7 — the kernel exists and is complete; nothing checks that it is the only one.**
`overlay.js` provides a stack, `register`, `dismissAbove`, `trapFocus` with
`previousFocus` restore, and `promoteLayer`. Five document-level listeners are bound outside
it. **Three are not dismiss listeners** and do not engage 2.5: `controls.js` delegates
`[data-rux-toggle]` clicks and segmented-control arrow keys, and `utilities.js` delegates
`[data-rux-set-accent]` clicks. **Two are `menu.js`'s**, and its own comment says the
outside-dismiss and Escape paths live in the kernel while "what stays here is
menu-specific" — the roving arrow keys, Home/End, Tab-closes, and close-on-item-click.
Tab-closes and close-on-activation *are* dismissals, so whether 2.5 holds depends on whether
it governs all dismissal or only outside-dismissal. §6 Q2.

**R8 — holds completely.** `focus-contract` runs four checks and its
`ACCEPTED_HOVER_WITHOUT_FOCUS` allowlist is **empty**: no base file styles `:hover` on an
interactive selector without also styling `:focus-visible`.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | Four `.is-*` classes name states aria already expresses — `.is-open` (drawer, side-nav), `.is-active` (side-nav, ui-header, navigation, menu), `.is-selected` (table), `.is-visible` (drawer, side-nav). Rule 2.2 forbids this and **nothing checks it**: `state-contract` verifies a `.is-*` class *resolves*, never that it is *justified*. Q1 must be answered first — `aria-expanded` describes the trigger, not the surface, so some of these may be legitimate. | step 3, gated on Q1 |
| D2 | Rule 2.5 (R7) has no test. It is the only one of R3/R7/R8 that has never been enforced, and §3 shows the answer is not obvious by inspection. | step 2 |
| D3 | Four accessibility MUSTs — Escape dismissal, focus restoration, accessible names, dialog behaviour, resize-separator ARIA — still live in `../layout-composition.md` § Responsive Behavior, outside a foundation document. `layout.md` D3 records the other half of this and is **blocked on this document existing**. | step 4 |
| D4 | Two BEM state modifiers accepted as debt: `.rux-button--loading` (would become `[aria-busy]`) and `.rux-splash--hidden` (would become `[hidden]`). Each is a public rename and belongs in `../portability-audit.md`, not a drive-by. | recorded in `state-contract`; needs a rename step |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R3, R7 and R8 as canonical | **done · Class A** | Founding entry, 2026-08-22. **Nothing was invented and nothing resolves differently** — this is a relocation of authority. R3 and R8 were already enforced by `state-contract` and `focus-contract`; what they lacked was a section to cite, which `CLAUDE.md`'s one-home rule says an enforcement test SHOULD have. R7 lacked both. §1 and §3 are **measured, not asserted**: the aria table counts rules in `rux-ui/css`, the fifteen `.is-*` classes were enumerated from it, and the five document-level listeners were read individually rather than counted — which is what separated the three that are activation delegation from the two that are menu-specific. **Deliberately did not fix D1**, because Q1 is genuinely open and a document that resolves a question by acting on it has skipped the argument. **Deliberately did not write the R7 test** (step 2): §3 shows 2.5's scope is ambiguous, and a test written before Q2 is answered would pin the ambiguity rather than the rule. **Deliberately did not take `layout.md` D3's four MUSTs yet** (step 4) — they arrive once this document has rules to hang them on, not merely a file to hold them. **Deliberately did not claim R4 or R5**, which `README.md` §1 routes to `naming.md`; `state-contract` happens to enforce parts of both, and a test's file name is not a claim of ownership. |
| 2 | Answer Q2, then enforce rule 2.5 (D2) | **[open]** | The R7 test. Scope depends on Q2: if 2.5 governs all dismissal, `menu.js`'s Tab-closes and close-on-activation must move into the kernel or be recorded as exceptions; if it governs outside-dismissal only, the rule needs rewording and the test is a narrow check that only `overlay.js` binds document-level `pointerdown` and Escape. **Do not write the test first** — it would freeze whichever reading the author happened to hold. |
| 3 | Answer Q1, then reconcile the four `.is-*` classes (D1) | **[open]** | Class B if any class is replaced by an attribute: CSS selectors change and JS writes change with them. Gated on Q1. Whatever the answer, rule 2.2 gains a test — either the four are justified and the test allows exactly them, or they are not and the test forbids the category. |
| 4 | Receive `../layout-composition.md`'s accessibility MUSTs (D3) | **[open]** | Closes `layout.md`'s D3 remainder, which is explicitly waiting on this document. The four MUSTs are dialog and assistive-technology behaviour and belong here, not in layout. **Gated on steps 2 and 3**: three of the four are about dismissal and focus restoration, which is rule 2.5's territory, and moving them before 2.5 is settled would import them into a rule that is still changing shape. |
| 5 | **Consolidate** — strip duplicated state rules elsewhere; convert them to pointers | **[open]** | The closing step. In scope: `../audit/design-system-audit.md` §5's R3, R7 and R8 entries, which its own status note commits to move; the `rux-design` skill's state and focus guidance; `README.md` wherever it states a focus or state rule; and any CSS comment that states a MUST rather than explaining a value. **Blocked on steps 2–4** — converting a section to a pointer before the rule it points at is settled deletes the only statement of it, which is the trap `typography.md` step 16 records. |

---

## 6. Open questions

**Q1 — Is `.is-open` a defect, or the only honest option?** `aria-expanded` belongs on the
**trigger** and describes the trigger. The surface it controls — a drawer, a side nav — has
no aria attribute of its own that says "I am open"; `[hidden]` says *absent*, which is not
the same as closed-but-animating, and `.is-closing` exists precisely because that gap is
real. So `.is-open` on a surface may be correct and `.is-active` on a nav item may be
`aria-current` in disguise. *Answering it means looking at each of the four against its own
markup, not reasoning about the category. Blocks step 3.*

**Q2 — Does rule 2.5 govern all dismissal, or only outside-dismissal?** R7's wording is "no
module binds its own document-level dismiss listeners," and `menu.js` binds two that include
Tab-closes and close-on-item-click. Under the broad reading it is in breach; under the
narrow one — the kernel owns the *policies that must be singular*, outside-`pointerdown` and
Escape, because those are the ones that misfire when two modules both bind them — it is
conformant, and `menu.js`'s own comment reads as though the narrow one was intended.
*Blocks step 2. The narrow reading is the one the code was written against; the broad one is
what the sentence says, and a rule that does not match its own implementation is worth
resolving in writing rather than by precedent.*

**Q3 — Does this document own focus *management*, or only focus *visibility*?** R8 is
visibility: every interactive selector draws a ring. But `overlay.js` owns trap and restore,
step 4 is about to import "focus restoration" as a MUST, and neither is a ring. *Blocks
nothing today; it decides whether step 4's arrivals are rules 2.7+ here or a separate
document later.*
