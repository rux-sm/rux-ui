# Rux UI Foundations — State

**Contract version: 1.3.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 7 steps: **5 done · 2 open**
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

**2.5 One overlay kernel owns the policies that must be singular.** Dismissible surfaces
register with the shared dismiss manager in `rux-ui/js/overlay.js`, which is the **only**
module that may bind a document-level outside-`pointerdown` or consume Escape at the
document level. It also publishes the one focus trap and restore helper and the one
layer-promotion helper.

**Two policies, not every path that closes a surface.** Outside-press must be singular
because two modules deciding what counts as "outside" is how a click lands on nothing;
Escape must be singular because two handlers consuming one keypress closes two surfaces. A
menu closing itself on Tab, or on its own item being activated, is neither — that is the
surface's own business and stays with the surface. *(R7, narrowed by Q2. Enforced:
`tests/overlay-kernel.test.mjs`.)*

**2.6 Focus is visible everywhere.** Every base file that styles an interactive selector
carries a `:focus-visible` rule keyed to `--rux-accent-ring`. A rule that suppresses the
ring without drawing one is a defect. *(R8. Enforced: `tests/focus-contract.test.mjs`.)*

**2.7 An overlay drawer is dismissible, named, and restores focus.** It MUST support Escape
dismissal, focus restoration, an accessible name, and an operable close control. *(R7/R3.
Escape and focus restoration are rule 2.5's kernel; the name and the close control are the
surface's own. **Not enforced.**)*

**2.8 A modal drawer implements complete dialog behavior.** A non-modal drawer SHOULD remain
a complementary `<aside>` region rather than borrowing dialog semantics it does not honour.
*(R3. **Not enforced.**)*

**2.9 A resize separator is keyboard operable and describes what it controls.** It MUST
expose orientation, current value, minimum, maximum, and the panel it controls. *(R3.
Implemented in `rux-ui/js/drawer.js`; **not enforced** — see §4 D5.)*

**2.10 A resize separator exists only while its panel is open.** It MUST be visible and
operable only while the panel it controls is open, and MUST NOT double as that panel's
disclosure control. *(R3/R7. A separator that also opens the thing it resizes is a second
disclosure channel, which is rule 2.1's problem wearing different clothes. **Not
enforced.**)*

---

## 3. Current state

**R3 — holds, with two recorded exceptions.** `state-contract` runs four checks: no BEM
state modifier, every `.is-*` written by `rux-ui/js` is read by a stylesheet, no
`data-rux-*` is written and read by nothing, and the accepted list stays honest. The
unread-attribute list is **empty**. The state-modifier list holds **two** entries, both
recorded as pending renames (§4 D4).

**R7 — holds, and is enforced since step 2.**
`overlay.js` provides a stack, `register`, `dismissAbove`, `trapFocus` with
`previousFocus` restore, and `promoteLayer`. Five document-level listeners are bound outside
it. **Three are not dismiss listeners** and do not engage 2.5: `controls.js` delegates
`[data-rux-toggle]` clicks and segmented-control arrow keys, and `utilities.js` delegates
`[data-rux-set-accent]` clicks. **Two are `menu.js`'s**, and its own comment says the
outside-dismiss and Escape paths live in the kernel while "what stays here is
menu-specific" — the roving arrow keys, Home/End, Tab-closes, and close-on-item-click.
Tab-closes and close-on-activation *are* dismissals, which is what made Q2 real. It is
answered narrow, and the evidence was in the codebase rather than in the argument: **six
modules already carry a comment deferring outside-click and Escape to the kernel** —
`menu.js`, `drawer.js`, `popover.js`, `suggestions.js`, `ui-shell.js` and `utilities.js`.
R7's sentence was broader than its own implementation, and rule 2.5 now matches what was
built.

**R8 — holds completely.** `focus-contract` runs four checks and its
`ACCEPTED_HOVER_WITHOUT_FOCUS` allowlist is **empty**: no base file styles `:hover` on an
interactive selector without also styling `:focus-visible`.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | ~~**Two** `.is-*` classes name states aria already expresses~~ **Half closed, step 6** — `.is-active` is retired from the navigation channel. `.is-selected` and two further instances the retirement measured are step 7's. Original: **Two** `.is-*` classes name states aria already expresses — `.is-open` (drawer, side-nav), `.is-active` (side-nav, ui-header, navigation, menu), `.is-selected` (table), `.is-visible` (drawer, side-nav). Rule 2.2 forbids this and **nothing checks it**: `state-contract` verifies a `.is-*` class *resolves*, never that it is *justified*. Q1 must be answered first — `aria-expanded` describes the trigger, not the surface, so some of these may be legitimate. | step 6 — Q1 answered, and cleared two of the four |
| D2 | ~~Rule 2.5 (R7) has no test.~~ | **closed, step 2** — `tests/overlay-kernel.test.mjs` |
| D3 | ~~Four accessibility MUSTs still live in `../layout-composition.md` § Responsive Behavior, outside a foundation document.~~ **Closed, step 4** — received as rules 2.7–2.10; that section is now a pointer, and `layout.md`'s D3 closes with it. | **closed, step 4** |
| D5 | Rules 2.7–2.10 arrived **unenforced**. `drawer.js` implements the separator ARIA (2.9) and the overlay kernel covers Escape and focus restoration (2.7), but no suite asserts any of the four, and 2.8 and 2.10 have no reader at all. They were received as stated rather than as tests, because writing four tests inside the step that relocates them would bundle two decisions — but a rule whose only statement is prose is the inversion this document was founded to fix. | needs its own step |
| D4 | Two BEM state modifiers accepted as debt: `.rux-button--loading` (would become `[aria-busy]`) and `.rux-splash--hidden` (would become `[hidden]`). Each is a public rename and belongs in `../portability-audit.md`, not a drive-by. | recorded in `state-contract`; needs a rename step |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R3, R7 and R8 as canonical | **done · Class A** | Founding entry, 2026-08-22. **Nothing was invented and nothing resolves differently** — this is a relocation of authority. R3 and R8 were already enforced by `state-contract` and `focus-contract`; what they lacked was a section to cite, which `CLAUDE.md`'s one-home rule says an enforcement test SHOULD have. R7 lacked both. §1 and §3 are **measured, not asserted**: the aria table counts rules in `rux-ui/css`, the fifteen `.is-*` classes were enumerated from it, and the five document-level listeners were read individually rather than counted — which is what separated the three that are activation delegation from the two that are menu-specific. **Deliberately did not fix D1**, because Q1 is genuinely open and a document that resolves a question by acting on it has skipped the argument. **Deliberately did not write the R7 test** (step 2): §3 shows 2.5's scope is ambiguous, and a test written before Q2 is answered would pin the ambiguity rather than the rule. **Deliberately did not take `layout.md` D3's four MUSTs yet** (step 4) — they arrive once this document has rules to hang them on, not merely a file to hold them. **Deliberately did not claim R4 or R5**, which `README.md` §1 routes to `naming.md`; `state-contract` happens to enforce parts of both, and a test's file name is not a claim of ownership. |
| 2 | Answer Q2, then enforce rule 2.5 (D2) | **done · Class A** | **Executed 2026-08-22.** Q2 answered **narrow**, and the argument did not need to be made — it was already in the codebase. **Six modules carry a comment deferring outside-click and Escape to the kernel**: `menu.js`, `drawer.js`, `popover.js`, `suggestions.js`, `ui-shell.js` and `utilities.js`. R7's sentence was broader than its own implementation, so rule 2.5 is reworded to match what was built: the kernel owns **outside-`pointerdown`** and **Escape** — the two policies that must be singular — plus the focus trap/restore and layer-promotion helpers. Tab-closes and close-on-activation stay with the surface. `tests/overlay-kernel.test.mjs` enforces it in four checks, and the third is the one that matters: it asserts the kernel **does** bind both, so the other two mean *exactly one* rather than *at most one* — a kernel that stopped binding them would otherwise turn the suite green. Proved to bite by injecting a second Escape handler into `menu.js`. **Deliberately did not widen the rule to element-level listeners**: a drag handle's `pointerdown` and a roving arrow-key pattern are not dismissal and never were. **Closes D2.** |
| 3 | Answer Q1; triage the four `.is-*` classes (D1) | **done · Class A** | **Executed 2026-08-22.** Q1 answered by looking at each of the four against its own markup rather than at the category, and they split **two and two**. **The principle**: a surface MAY carry a class for a state its *trigger* expresses in aria, because `aria-expanded` describes the trigger and nothing describes the surface — but it MAY NOT when the element itself already carries the aria attribute. **Legitimate: `.is-open`** on `.rux-drawer` and `.rux-side-nav--overlay`. No aria attribute means "open" on a surface; `aria-hidden` is about assistive-technology exposure, not visual state, and coupling a transform to it would be wrong — the drawer writes both and they mean different things. **Legitimate: `.is-visible`** on the two scrims, which are decorative and have no state to expose. **Defect: `.is-active`** — `view-router.js` **already writes `aria-current="page"` on the same element**, and `side-nav.css` and `ui-header.css` **already select on it**. Two writers and two readers for one state, which rule 2.1 forbids outright. **Defect: `.is-selected`** on `tr` — `aria-selected` is the channel, and `role="grid"` is already in use in `index.html`, so it is valid here rather than merely nicer. **Deliberately did not remove either defect in this step** (step 6): both change CSS selectors and JS writes together, one of them in the application layer, and bundling a decision with its migration is what makes a log unreadable later. |
| 4 | Receive `../layout-composition.md`'s accessibility MUSTs (D3) | **done · Class A** | **Executed 2026-08-22**, once steps 2 and 3 had settled rule 2.5's scope — which was the whole reason for the gate, since three of the four turn on dismissal and focus restoration and importing them into a rule still changing shape would have meant restating them later. **Received verbatim as rules 2.7–2.10**, one rule per MUST rather than one merged clause, so each can be cited on its own. `../layout-composition.md` § Responsive Behavior is now a pointer that states none of them. **This closes `layout.md`'s D3**, which had been *partly closed* since its step 6 and explicitly waiting on this document to exist — the second half of a move that step deliberately refused to complete into a home that would have had to hand it back. **What arrived is prose, and §4 D5 records that plainly.** `drawer.js` implements the separator ARIA and the overlay kernel already owns Escape and focus restoration, but **no suite asserts any of the four**, and 2.8 and 2.10 have no reader at all. **Deliberately did not write those tests here**: bundling four new suites into the step that relocates the rules would merge two decisions, and this document's own founding entry says a rule whose only statement is a test is an inversion — the mirror of that, a rule whose only statement is prose, deserves its own step rather than being quietly tolerated. D5 carries it. **Deliberately did not touch the motion paragraph** that follows them in that section: it states no MUST and cites `motion.md`, so it passes `CLAUDE.md`'s test as written. Contract 1.1.0 → 1.2.0. |
| 5 | **Consolidate** — strip duplicated state rules elsewhere; convert them to pointers | **[open]** | The closing step. In scope: `../audit/design-system-audit.md` §5's R3, R7 and R8 entries, which its own status note commits to move; the `rux-design` skill's state and focus guidance; `README.md` wherever it states a focus or state rule; and any CSS comment that states a MUST rather than explaining a value. **Blocked on steps 2–4** — converting a section to a pointer before the rule it points at is settled deletes the only statement of it, which is the trap `typography.md` step 16 records. |
| 6 | Retire `.is-active` from the navigation channel (D1) | **done · Class B** | **Executed 2026-08-22 — and only half of what the step was written to do, because the grep protocol showed the other half is not safe yet.** **What was retired:** `view-router.js` wrote `.is-active` *and* `aria-current="page"` on the same button (lines 103–105), and `side-nav.css` and `ui-header.css` each selected *both*. Two writers and two readers for one state. The class is gone from the writer, from both stylesheets, and from `examples/app-layout.html`, which carried the redundant pair in static markup. **Proved by measurement, not argument.** Seven probes hashed over every computed property **plus `::before`**, which is where the side-nav's active marker lives: before the change `aria-current`, `.is-active` and *both* resolved to **one identical hash** per block — the redundancy, demonstrated rather than asserted. After it, `aria-current` and *both* are **unchanged to the digit**, and `.is-active` alone collapses to exactly the plain-link hash, which is the intended behavioural change and the reason this is Class B rather than Class A. Confirmed live too: the real side-nav destination still paints its active background and `::before` marker, and **zero** nav items still carry the class. **`.is-selected` was NOT done, and the reason is a finding.** The step required the customers table confirmed as a `role="grid"` table first. It is not one — `index.html`'s two `role="grid"` elements are the mini calendar and the driver grid, while the customers table is a plain `<table class="rux-table customer-app__table">` with no role set in markup or at runtime. Step 3's *"`role="grid"` is already in use in `index.html`, so it is valid here"* was true of the repository and **false of this table**. Writing `aria-selected` onto rows of a plain table is invalid ARIA — strictly worse than the class it would replace — and claiming the grid role brings arrow-key obligations that are not a drive-by. **Two further instances turned up while measuring, and are recorded rather than swept in:** the right-panel tabs at `index.html:9843–9847` write `.is-active` *and* `aria-selected` with `navigation.css` reading both — the same defect on a different channel; and `.rux-menu__item` carries both `.is-active` and `aria-current="page"` while `menu.css` reads `.is-active` and `[aria-checked]` but **not** `[aria-current]`, so that one needs a selector *added* before the class can go, which is the opposite shape from the nav case. **Deliberately did not expand into any of the three.** Step 3's evidence covered the `aria-current` navigation case and nothing else; acting on cases it never adjudicated would be this step making three decisions it was not given. Step 7 carries them. Contract 1.2.0 → 1.3.0. |
| 7 | Finish D1 — `.is-selected`, the right-panel tabs, and the menu item | **[open]** | **Opened 2026-08-22 by step 6's measurements**, three instances of one defect that step deliberately left alone. **(a) `.is-selected`** on the customers roster is **blocked on a decision, not on work**: the table needs `role="grid"` before `aria-selected` is valid on its rows, and taking that role means owing grid keyboard navigation. Adding the attribute without the behaviour is worse than the class. Its writer is `js/panels/customers-panel.js`, in the **application** layer, so this also crosses the tier boundary. **(b) The right-panel tabs** (`index.html:9843–9847`) write `.is-active` alongside `aria-selected`; `navigation.css` already reads both, so this is the same shape as step 6's nav case and should be as cheap — delete the class write and the `.is-active` half of the selectors. **(c) `.rux-menu__item`** is the awkward one and must not be batched with (b): the markup carries `aria-current="page"` but `menu.css` reads `.is-active` / `[aria-checked="true"]`, so the class cannot be removed until the stylesheet learns the aria selector. That is an **addition first**, then a removal — two changes, and reversing the order breaks the menu. **Each owes the grep protocol**, because `.is-*` classes are live query hooks and no suite covers HTML class attributes. |

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
