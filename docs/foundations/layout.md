# Rux UI Foundations — Layout

**Contract version: 1.6.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 10 steps: **9 done · 1 open**
This document is canonical for **breakpoints (§1), the space scale (§7), and the radius
scale and Materials presets (§8)**. Steps 4 and 5 brought the last two in. What layout still
owes — reconciling the application layer's seven off-set widths, *adopting* the measured
Materials values, and the rule content in `../layout-composition.md` — is recorded in §5 as
an open step and is **not** governed here yet.

**§8's radius is adopted (step 8); its elevation presets are not (step 9).** The radius
scale now carries Geist's 6px default and the semantic three read it. The eight shadow
stacks in §8.1 remain measured-only, and only in dark.

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
| **420px** | The narrow-phone tier below the mobile breakpoint: compact page gutter and logo, grids drop to one column | `driver-share.css`, `flip-seven.css`, `tasks-panel.css` |
| **500px** | The shared mobile breakpoint — touch-target minimums, and the drawer's mobile mode | `tokens.css`, `drawer.css` |
| **580px** | Phones get one floating-window frame contract regardless of contents | `panel.css` |
| **620px** | The header brand sheds its dividers and caps the logo | `ui-header.css` |
| **720px** | The workspace stops fitting two columns: side-by-side bodies stack, wide tables shed their money columns | `driver-week-info.css`, `flip-seven.css`, `comp-*.css`, `maintenance-share.css` |
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

**2.4** Both layers use the same set. One vocabulary, and a published width is available to
either, not required of either. Enforced for both since step 3 — see §3. *(Was a SHOULD
scoped to the application layer until Q1 was answered.)*

---

## 3. Current state

**Both layers are on the set.** The portable layer always was — `rux-ui/css/` uses exactly
500, 580, 620 and 760. The application layer was not, and step 3 reconciled it: it now uses
**420, 500/501, 580/581 and 720**, every one of them §1.1's.

`tests/breakpoint-contract.test.mjs` covers **both layers** as of step 3, so §2.4 is enforced
rather than aspirational.

**What §3 used to say, kept because it is the argument for §1.2.** The application layer held
eleven distinct widths expressing nine boundaries, seven of them off the set: 359, 420,
479, 480, 560, 640, 700 and 720. Several sat a few pixels apart — 479 and 480 were the same
boundary spelled two ways, and `trip-request.css` alone carried 480, 560 and 580, with 560
and 580 twenty pixels apart in one file. None of the seven was a decision anybody remembered
making. That is what §1.2's asymmetry exists to prevent, observed rather than hypothesised.

**Container queries are not part of this.** The application layer has twelve, at 320, 340,
359, 400, 420, 450, 460, 479, 520, 640, 700 and 800 — several of them the same numbers step 3
retired as *breakpoints*, which is not a contradiction: §1.3 puts them outside the set
because they measure a component's own width, not the viewport's. They are untouched and
correctly so.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | ~~The application layer holds seven boundaries off the set.~~ | **closed, step 3** |
| D2 | The space scale and radius scale are published from `tokens.css` and governed by no document. | steps 4, 5 |
| D5 | ~~`README.md` § Layout states `--rux-container-xs` (480px) and it has no canonical home — layout does not publish container widths, and whether it should is **Q3**. Not a duplicate, so step 7 left it: the fix is to answer Q3, not to move a value into a document that has not claimed the category. ~~ | **closed, step 10** — §10 publishes it, and Q3 is answered |
| D3 | `../layout-composition.md` § Responsive Behavior still states four accessibility MUSTs outside a foundation document. **§ Spacing and the layout half moved in step 6**; the remainder is dialog and assistive-technology behaviour, which is `state.md`'s and cannot move until it exists. | **partly closed, step 6** — moves at [`state.md`](state.md) step 4 |
| D4 | ~~Nothing enforces §2.4 against the application layer.~~ | **closed, step 3** — the contract test covers both layers |

---

## 5. Amendment log

Ordered by dependency and blast radius. Every step records what it deliberately did **not**
do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt the breakpoint set as canonical | **done · Class A** | Founding entry, and the correction typography step 35 called for. The set was **not invented here** — all four widths, and the purpose of each recorded in §1.1, were already closed and enforced in `tests/breakpoint-contract.test.mjs`, which predates this document. What was missing was a *home*: `CLAUDE.md`'s one-home rule says an enforcement test SHOULD cite the section it enforces, and that test cited nothing because no section existed, leaving the rule stated **only** in enforcement. Nothing resolves differently and no CSS moves — this is a relocation of authority, not a change to it. **Deliberately did not widen the scope to the space scale, radius, or the elevation presets** (steps 4, 5): a document that claims a scale it has not verified is worse than one that says it does not cover it, which is why the Status block and §1 both state the narrow scope outright. **Deliberately did not answer typography's Q6.** This step hands Q6 a published width to map onto; *which* roles step down and to which rung remains a design decision that document owns. **Deliberately did not name the document `spacing.md`**, which was README §1's plan of record: a breakpoint is a width at which layout changes, not a spacing value, and `../layout-composition.md`'s responsive MUSTs will need this home at step 6. README §1 is corrected in the same change, per the rule that the index is derived. |
| 2 | Cite this section from `tests/breakpoint-contract.test.mjs` | **done · Class A** | Completes step 1: enforcement SHOULD cite the section it enforces, and until it does, a reader of the test cannot tell whether the set is a rule or a convention someone froze. Comment-only; no assertion, width, or CSS changes, and the suite's behavior is byte-identical. **Corrected a defect in the test's own rationale while there:** it said the application layer used "eleven distinct widths" and then listed **ten**, omitting **501px** — the `min-width` companion to the `max-width: 500px` boundary. The count was right and the list was short by one. The rewritten comment states eleven widths and nine boundaries, and §1.1 now records that either side of a boundary is the same decision, which is what made the omission easy to miss. **Deliberately did not add an assertion against the application layer** — that is step 3, and asserting a rule the codebase violates 7 times turns the suite red for a known, recorded defect (D1) rather than a regression. **Deliberately did not change the ratchet's mechanics**: the allow-list stays the enforcement, this document stays the rule. |
| 3 | Bring the application layer onto the set (D1, D4) | **done · Class A + Class B** | **Executed 2026-08-22.** Nine boundaries to seven to four. **Closes D1 and D4.** The step warned this was a set of decisions rather than a find-and-replace, and it was — the seven off-set widths turned out to be three different problems. **(i) Drift, collapsed onto published widths at no cost (§1.2: reusing one needs no step).** 479 and 480 were one boundary spelled two ways, both → **500**; `trip-request.css` carried 480, 560 *and* 580, with 560 twenty pixels from a 580 in the same file — that 560 → **581**, which is 580's `min-width` companion the way 501 is 500's. **(ii) A tier below the set.** 359 and 420 were both narrow-phone widths and the set's floor was 500, so there was nothing to reuse; 359 folded into **420**, minted as the fifth width. **(iii) A band with nothing near it.** 640 (5 uses), 700 (2) and 720 (2) all mean *the workspace stops fitting two columns*, and the nearest published widths are 620 and 760 — but §1.1's rows say what changes at each, and 620's says the header sheds its dividers. Forcing a table onto a width measured for the header would make that row false, so **720** is minted as the sixth. **Collapsed upward on purpose:** narrow treatment applying *earlier* can never overflow, only the reverse can, so 640 → 720 moves seven sites in the safe direction while 720's own two sites do not move at all. **Class B, states needing an eyeball:** anything between 641 and 720 now gets the narrow treatment — the components gallery, settings, fleet and trip-list demos, and `maintenance-share`; and 360–420 now gets `driver-share`'s compact gutter and logo. **Verified:** the browser resolves the application layer's CSS to exactly 420/500/580/720, and neither 420 nor 700 produces horizontal page overflow. **The comp-* gallery surfaces were not individually eyeballed** — the direction is provably safe, but that is an argument, not a look. **Enforcement extended:** `breakpoint-contract.test.mjs` now walks both layers, resolves N+1 to N, and was proved to bite by injecting a 665px query into the application layer. **Deliberately did not touch the twelve container queries** — several use the very numbers this step retired as breakpoints, and §1.3 puts them outside the set on purpose. **Deliberately did not mint a width per cluster**: 640 and 720 as separate published widths would have been the smallest local fix and exactly the multiplication §1.2 exists to stop. Contract 1.2.0 → 1.3.0. |
| 4 | Give the space scale a canonical home (D2) | **done · Class A** | 15 `--rux-space-*` tokens in `tokens.css`, 4px-gridded with one deliberate half-step at 6px and a 1px hairline off the grid. Documenting what exists is Class A; the log MUST state plainly that these were never measured against Geist, unlike the type ramp. Gated on nothing, but SHOULD land with step 5 so the measurement happens once. | **Executed 2026-08-22** as §7. Class A and it moves no code: the fifteen tokens are documented where they already resolve, nothing renders differently. **The step required this said plainly and here it is: the space scale was never measured against Geist.** Every figure in `typography.md` §3 and `color.md` §3.1 was read off a rendered specimen; these fifteen values are this system's own, adopted before any foundation document existed. That is not a defect — **Geist publishes no spacing page**, so there is no specimen to measure against, and §7 records which scales are conformance and which are ours so a reader is not misled by the company they keep. Both departures from the 4px grid are recorded with their reasons: `--rux-space-px` (1px hairline, which must not scale with a reader's font size, and so is the one space token not in `rem`) and `--rux-space-1-5` (6px, the single half-step, because 4px is tight and 8px loose for control padding). **Deliberately did not change a value or add a rung.** **Deliberately did not write a MUST** about which rung to use where — that is composition, and it arrives with step 6. |
| 5 | Measure Geist Materials; publish radius and the elevation presets (D2) | **done · Class A** | 7 `--rux-radius-*` tokens plus the semantic three (`container`, `control`, `input`). The source is [vercel.com/geist/materials](https://vercel.com/geist/materials): eight elevation presets bundling radius, fill, stroke and shadow. **Values are not published** — they must be read off the rendered specimens in a browser, the way every figure in `typography.md` was, and the step MUST say so. Expect Class B: `tokens.css` already cites the Materials modal tier at 12px, so some of this is adopted informally and may not survive measurement. | **Executed 2026-08-22** as §8. **The step's own prediction held.** It warned that `tokens.css` cites the Materials modal tier at 12px, that some of this was adopted informally, and that it might not survive measurement. 12px and 16px survived — `--rux-radius-lg` and `-xl` match Geist exactly. **8px did not.** Geist's small-surface radius is **6px** across Base, Small and Tooltip; this system has no 6px rung, and its `--rux-radius-md` at 8px has no Geist counterpart. `md` is what both `--rux-radius-container` and `--rux-radius-input` resolve to, so it is on nearly every card, panel and field in the application — **the widest blast radius in this document**. All eight presets are recorded in §8.1 with their full shadow stacks; the 1px stroke is constant across all eight, so only radius and shadow vary. **Retitled from "Adopt" to "Measure … publish"**, because the document is a decision document and this step moved no code: the adoption is now **step 8**, gated on two things this step could not supply. **Deliberately did not adopt anything**, for those two reasons: (a) the specimens are pinned to a `#0a0a0a` fill and answered neither `prefers-color-scheme` nor a `data-theme` attribute, so **only dark values were obtainable** — and a `rgba(255,255,255,0.145)` stroke plainly is not the light value, so light exists somewhere unmeasured; (b) moving `md` 8px → 6px re-renders nearly every surface and needs before/after and named states per README §2.3. **Deliberately did not measure buttons or inputs**: Materials covers elevated surfaces, and those have their own Geist pages — which is why `xs` and `sm` show no counterpart in §8.2 rather than being called orphans. |
| 6 | Relocate `../layout-composition.md`'s rule content (D3) | **done · Class A** | **Executed 2026-08-22** as §9. Class A: rules move to their canonical home, nothing renders differently and no token moves. **§ Spacing moved wholesale** — the 16px card rhythm and its nine-relationship table (§9.1), the dense repeating-row exception with its 40px row height and 8px scheduler inset (§9.2), and the MUST that a consumer reach for the component token rather than a literal `16px`. It belongs here because step 4 gave the space scale a home in §7: §7 is the vocabulary, §9 is which rung applies to which relationship. **§ Responsive Behavior split, and only half moved.** The layout half is §9.3 — panels attached at wide widths, drawers at narrow, rails and drawer widths as application variants — plus the touch-target SHOULD, which belongs to layout because §1.1's 500px boundary is what switches it on. **The other half deliberately did not move**, and this is the substance of the step rather than an omission: four MUSTs about Escape dismissal, focus restoration, accessible names, dialog behaviour and resize-separator ARIA are **not layout rules**. `README.md` §1 routes them to `state.md` (R3, R7, R8), which is not written. Relocating them here would put them in a home that has to hand them back — a second move, and a worse one, since by then something would cite this document for them. **D3 therefore partly closes and stays open on the remainder**, which is the honest state: the rules are still outside a foundation document, and the reason is that the right one does not exist yet. **Deliberately did not touch § Scrolling**, which the step did not name and which states no px value and no MUST — it says a component MAY own scrolling. It passes `CLAUDE.md`'s test as written. **Enforcement repointed rather than relaxed:** `layout-contract.test.mjs` pinned the table's first row in its old home. It now asserts **both halves of the one-home rule** — that §9.1 carries the row, and that what was left behind states no values and links here. A pointer that quietly regrows a table is exactly the drift the rule exists to catch, and nothing was checking for it. Contract 1.3.0 → 1.4.0. |
| 7 | **Consolidate** — strip duplicated layout rules elsewhere; convert them to pointers | **done · Class A** | **Executed 2026-08-22.** The closing step, and it was **re-scoped first**: the step's scope list was written at step 1, when this document owned breakpoints alone. It now owns the space scale, radius, Materials and composition, so the sweep was larger than the list anticipated. **What it found, worst first. (a) `README.md` § Optical radius was a second authority stating the whole primitive scale, and it was wrong** — it published `--rux-radius-sm` as **6px** when that rung has always been **4px**, an error that predates this document, and its role mappings had gone stale at step 8 on top of that. Two ways to be wrong in one section is the argument for the one-home rule in miniature. **(b) `README.md` § Spacing** restated the entire space scale, every rung with its value — a straight second copy of §7. **(c) `README.md` § Layout** stated the desktop/mobile section gutters, and § Buttons stated `--rux-space-3`'s value in parentheses. All four are now pointers on the shape § Typography already used: they name what is ruled, never what the rules say. **(d) The `rux-design` skill broke its own rule.** Two lines below *"Do not restate a value here"* it stated the tokenized **16px** rhythm; that is now a pointer. Its routing line was stale (`typography.md` today; spacing, colour and motion to follow) and now names the three documents that exist, the three that do not, and why there is no `spacing.md`. **(e) A rule the skill stated was falsified by step 8 and nobody noticed** — *nested controls step down one radius level from their containing surface.* Since container and control both took Geist's default rung they are the **same value**, so a control inside a card does not step down, and Geist does not step there either. The rule now says where the scale still steps and where it does not. **(f) `navigation.css` cited `../layout-composition.md` for the 0-gap header-to-shell and panel-to-workspace values**, which step 6 moved; repointed at §9.1. **(g) Step 6's own overreach, corrected.** §9.3 had taken *collapsed rails and drawer widths are application variants* — but `../layout-composition.md` still states that rule, it is a **portability** rule about which layer may define a value, and **Q3 is the open question of whether layout owns those dimensions at all**. Moving it here answered Q3 by accident. The duplicate is removed and §9.3 records why. **Deliberately did not move `--rux-container-xs`**, which `README.md` states with no canonical home: it is not a duplicate, and relocating it would claim a category Q3 has not settled. Recorded as **D5** instead — a gap on the books beats a value moved into the wrong document. **Deliberately did not touch the two `MUST NOT` bullets in `../layout-composition.md` §§ Application Anatomy and UI Header**, for the same reason as (g): both are portability rules, and `tokens.css` and `side-nav.css` cite them and still resolve. Contract 1.4.0 → 1.5.0. |
| 8 | Publish Geist's 6px default radius; repoint the semantic three (§8.2) | **done · Class A + Class B** | **Executed 2026-08-22** on the owner's decision, of the two §8.2 offered. **Measuring Geist's Button page first changed the shape of the change.** §8.2 read the disagreement as "Geist uses 6px where we use 8px," implying 8px was simply wrong. It is not: Geist scales control radius with height — measured **24px→4px, 32px→6px, 36px→6px, 40px→8px** — and its tokens name **`--geist-radius: 6px`** as the product default against **`--geist-marketing-radius: 8px`**. So 8px is a real Geist value reserved for other surfaces, and what this system lacked was only the middle rung. **Our height ladder already matches Geist's exactly** — `--rux-button-height-compact` 24, `-standard` 32, `--rux-field-height` 36, `-header` 40 — so `sm` 4px was already correct for compact controls and `md` 8px already correct for 40px headers and tabs. That turned a sweeping change into a surgical one. **Class A:** `--rux-radius-default: 6px`, named rather than numbered because it is not a size step between `sm` and `md` — it is the default, which is how Geist names it, and the ladder already mixes non-size names (`0`, `full`). **Class B — before → after:** `--rux-radius-container` **8 → 6px** (cards, anchored panels; 8 call sites), `--rux-radius-control` **4 → 6px** (every button; 14 sites), `--rux-radius-input` **8 → 6px** (inputs). **Measured after the change:** a freshly built standard button is 32px tall at **6px**, matching Geist's 32px specimen exactly; card and input both 6px; `--rux-modal-radius` and `--rux-panel-floating-radius` **unchanged at 12px**, which already conformed to Materials' Medium/Large/Menu/Modal tier. **States needing an eyeball:** cards, buttons and inputs throughout — the change is 2px in both directions and shows most at small control sizes. **Deliberately did not** move `md` from 8px: it is Geist's value for 40px controls and this system's 40/44px header buttons and tabs read it. **Deliberately did not** give buttons a per-height radius (see Q5) — that is a component API change, not a scale change, and nobody asked for it. **Deliberately did not** touch the ghost icon buttons that render at 0px; that is a pre-existing component decision, unaffected here. Contract 1.1.0 → 1.2.0. |
| 9 | Adopt the Materials elevation presets (§8.1, D2) | **[open]** | Class B. What step 8 left: the eight shadow stacks, against this system's current shadow tokens, which §8 has not yet compared. **Gated on a value that does not exist yet** — §8.1 records that the specimens are pinned to a `#0a0a0a` fill and answered neither `prefers-color-scheme` nor a `data-theme` attribute, so only dark was obtainable, and a `rgba(255,255,255,0.145)` stroke is plainly not the light value. Light must be sourced before adoption or explicitly substituted, and this step must say which. Owes before/after and named states per README §2.3. |
| 10 | Answer Q3; publish the fixed dimensions (D5) | **done · Class A** | **Executed 2026-08-22** as §10. Class A: six tokens documented where they already resolve, no value moves. **My first recommendation on Q3 was a flat "no" and measuring proved it wrong.** The portable layer publishes six fixed dimensions — `--rux-container-xs`, `--rux-panel-width-sm`, `--rux-panel-min-width`, `--rux-panel-floating-width` and its safe max, and `--rux-workspace-header-min-height` — so answering "no" would have left all six governed by nothing while closing the question that noticed them. Answering "yes" would have claimed the drawer-width rule, which is not about what a value should be but about **who may state one**. The split is the answer: layout owns the vocabulary, portability owns the layer boundary. **`--rux-drawer-*-default-width` stays `auto`** and appears in §10 only to explain its own absence — that is the portability rule working, not a gap. **Closes D5**, which step 7 opened rather than fix, on the grounds that moving a value into a document that had not claimed the category was worse than recording the gap. That judgement held: the category needed claiming first. **Deliberately did not invent a container scale** — `--rux-container-xs` is alone because app shells have no content max-width and there are no marketing surfaces; the `xs` names a rung, not a family. Contract 1.5.0 → 1.6.0. |

---

## 6. Open questions

**Q1 — Should the application layer share one set with the portable layer, or publish its
own? — ANSWERED: one shared set.** The question said the answer would be clearer once the
seven boundaries had been looked at individually, and it was. Two of the three groups needed
no new vocabulary at all — they were drift, and collapsed onto widths the portable layer had
already published. The third needed two widths the portable layer does not use today (420
and 720), and adding them to §1.1 costs it nothing: a published width is available, not
required. A separate application set would have had to publish those same two widths anyway,
and would then own the question of what happens when the two sets disagree about 500.

§2.4 is therefore upgraded from SHOULD to enforced — `breakpoint-contract.test.mjs` covers
both layers as of step 3. *Answered 2026-08-22 with step 3.*

**Q2 — Is 620 a real breakpoint or an accident?** 620 and 760 both exist for `ui-header.css`
alone, and 620 sits 120px from 500 with no stated reason for that distance. It may be a
genuine measurement of when the brand stops fitting, or it may be the same drift §3
documents, caught earlier. *Answering it requires measuring the header, not reasoning about
it. Blocks nothing.*

**Q4 — Does `spacing.md` still need to exist? — ANSWERED: no.** Steps 4 and 5 executed
here, so this document now owns the space scale (§7), the radius scale and the eight
Materials presets (§8) alongside breakpoints (§1). `spacing.md` is **never written**, and
README §1's index drops it.

The deciding argument is that the split had no seam. Radius and elevation arrive from the
same Geist page, and a "spacing" document that owned the space scale while layout owned
radius would put two halves of one measurement in two places — the drift `CLAUDE.md`'s
one-home rule exists to prevent. The alternative was live until this step: had step 4 found
that spacing needed rules of its own substantial enough to crowd this document, the split
would have paid for itself. It did not — §7 is one table and two recorded departures.

*Answered 2026-08-22 with steps 4 and 5, which is when it needed answering: the question
recorded that deciding late costs a document rename, and deciding it at the moment the
content landed cost nothing.*

**Q5 — Should control radius scale with control height?** Geist's does: measured on its
Button page, 24px controls take 4px, 32px and 36px take 6px, and 40px takes 8px. This system
has **one** `--rux-button-radius`, reading `--rux-radius-control`, shared by every button
size — so step 8 made the 32px case exact and left the 24px and 40px cases at 6px where
Geist would give 4px and 8px. Closing that means either three radius tokens keyed to the
height ladder, or accepting one radius as a deliberate simplification. *Blocks nothing.
Recorded because it was measured, not because it is a defect — a single radius across sizes
is a defensible choice, but it should be a choice on record rather than an accident.*

**Q3 — Does layout own the shell's fixed dimensions? — ANSWERED: split, and the split is
the answer.** Layout owns the **vocabulary** of dimensions the portable layer publishes —
§10 now lists all six. `../portability-audit.md` and `../layout-composition.md` own the
separate rule about **which layer may define a product dimension**, which is why
`--rux-drawer-*-default-width` resolves to `auto` and appears in §10 only as an explanation
of its own absence.

A flat "no" was the tempting answer and it was wrong: the portable layer plainly does
publish fixed dimensions, and calling them all portability's would have left six live tokens
governed by nothing. A flat "yes" would have claimed the drawer-width rule, which is not
about what a value should be but about who may state one. *Answered 2026-08-22 with step 10,
which closes D5.* Original text follows.

**Q3 — Does layout own the shell's fixed dimensions?** Rail widths, drawer widths, and panel
minimums are layout decisions that live in `tokens.css` today and are called "application
variants, not base-shell defaults" by `../layout-composition.md`. Whether that stays true
or they become published vocabulary is not decided. *Gates nothing until step 6.*

---

## 7. The space scale

Fifteen tokens in `rux-ui/css/tokens.css`, on a **4px grid** with two deliberate departures.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--rux-space-0` | 0px | | `--rux-space-5` | 20px |
| `--rux-space-px` | **1px** — hairline, off-grid | | `--rux-space-6` | 24px |
| `--rux-space-1` | 4px | | `--rux-space-8` | 32px |
| `--rux-space-1-5` | **6px** — the one half-step | | `--rux-space-10` | 40px |
| `--rux-space-2` | 8px | | `--rux-space-12` | 48px |
| `--rux-space-3` | 12px | | `--rux-space-16` | 64px |
| `--rux-space-4` | 16px | | `--rux-space-20` | 80px |
| | | | `--rux-space-24` | 96px |

The rung number is quarter-rems: `--rux-space-4` is `1rem`. Values are `rem` for the same
reason type sizes are — see `typography.md` rule 2.1 — except `--rux-space-px`, which is a
hairline and must not scale with a reader's font size.

**Two departures, both deliberate.** `--rux-space-px` is a 1px border-like inset that has no
business on the grid. `--rux-space-1-5` at 6px is the single half-step, and it exists
because 4px is too tight and 8px too loose for control padding.

**This scale was never measured against Geist.** Unlike the type ramp in
`typography.md` §3 and the colour scales in `color.md` §3.1 — every figure of which was read
off a rendered specimen — these fifteen values are this system's own, adopted before this
document existed. Geist publishes a Materials page (§8) covering radius and elevation and
**no spacing page**, so there is no specimen to measure against. Recording that plainly is
the point of this section: a reader comparing this system to Geist should know which scales
are conformance and which are ours.

---

## 8. Geist Materials — measured

Source: [vercel.com/geist/materials](https://vercel.com/geist/materials). **Values are not
published**; every figure below was read off the rendered specimens on 2026-08-22, the
method `typography.md` §3 and `color.md` §3.1 establish.

### 8.1 The eight presets

Each bundles a radius, a fill, a 1px stroke, and a shadow stack. Every preset carries the
same stroke — `rgba(255,255,255,0.145) 0 0 0 1px` over `#000 0 0 0 1px` — so the stroke is
constant and only radius and shadow vary.

| Preset | Radius | Shadow beyond the stroke |
|---|---|---|
| **Base** | 6px | none — stroke only |
| **Small** | 6px | `0 1px 2px rgba(0,0,0,.16)` |
| **Tooltip** | 6px | `0 1px 1px rgba(0,0,0,.02)`, `0 4px 8px rgba(0,0,0,.04)` |
| **Medium** | 12px | `0 2px 2px rgba(0,0,0,.32)`, `0 8px 8px -8px rgba(0,0,0,.16)` |
| **Large** | 12px | `0 2px 2px rgba(0,0,0,.04)`, `0 8px 16px -4px rgba(0,0,0,.04)` |
| **Menu** | 12px | `0 1px 1px rgba(0,0,0,.02)`, `0 4px 8px -4px rgba(0,0,0,.04)`, `0 16px 24px -8px rgba(0,0,0,.06)` |
| **Modal** | 12px | `0 1px 1px rgba(0,0,0,.02)`, `0 8px 16px -4px rgba(0,0,0,.04)`, `0 24px 32px -8px rgba(0,0,0,.06)` |
| **Fullscreen** | 16px | identical to Modal |

**Measured in dark only.** The specimens are pinned to a `#0a0a0a` fill and did not respond
to `prefers-color-scheme` or to a `data-theme` attribute, so the light-theme variants are
not obtainable from this page. A `rgba(255,255,255,0.145)` stroke cannot be the light value,
so light values exist somewhere and are **not recorded here**. Step 8 must find them before
adopting, or state what it substitutes.

### 8.2 Geist uses three radii; this system publishes six

| Geist Materials | This system (`--rux-radius-*`) |
|---|---|
| — | `0` |
| — | `xs` 2px |
| — | `sm` 4px |
| **6px** — Base, Small, Tooltip | — **no rung** |
| — | `md` **8px** — no Geist counterpart |
| **12px** — Medium, Large, Menu, Modal | `lg` 12px |
| **16px** — Fullscreen | `xl` 16px |
| — | `full` 9999px |

**The two scales disagree at the tier that matters most.** Geist's small-surface radius is
**6px**; this system's is **8px** (`--rux-radius-md`), and `md` is what
`--rux-radius-container` and `--rux-radius-input` both resolve to — so it is on nearly every
card, panel and field in the application. Adopting Geist's 6px is a Class B change with the
widest blast radius in this document, which is why §5 step 5 records the measurement and
**step 8 owns the adoption**.

`12px` and `16px` already match, so `lg` and `xl` are conformant today. `xs` and `sm` have
no Materials counterpart because Materials covers elevated surfaces; buttons and inputs are
governed by their own Geist pages and were not measured here.

---

## 9. Composition

§7 publishes the space scale; this section says which rung applies to which
relationship. Relocated from `../layout-composition.md` by step 6, where it stated
values and a MUST outside a foundation document.

### 9.1 The card rhythm

**Rux uses a 16px visual content rhythm — `--rux-space-4` — for card- and panel-level
relationships.** This describes *relationships*, not unconditional padding on every edge,
and it is not the only rhythm in the app: §9.2 records the dense exception.

| Relationship | Contract |
|---|---|
| UI header to app shell | `0` |
| Panel to workspace | `0` |
| Panel pane content inset | `16px`, adjusted when attached navigation owns the top seam |
| Sibling cards in a pane | `16px` |
| Card header inset | `16px` |
| Headered card body | `0 16px 16px` |
| Headerless card body | `16px` on all sides |
| Content rows inside a stacked card body | `16px` |
| Card-section regions | same visual rhythm as cards |

**A consumer MUST use the component tokens rather than a hardcoded `16px`.** A header's
bottom padding and a following body's top padding must not accidentally combine into a
`32px` seam — which is what happens when both are typed as literals by different hands.

### 9.2 The dense exception

A few contexts deliberately run tighter than 16px, because a list of many short, similar
rows — a settings toggle list, a scheduler grid — reads better dense than at card rhythm.

| Context | Contract |
|---|---|
| Repeating settings-toggle rows (`.rux-view-options__row`) | `0` gap, fixed `40px` row height — the rhythm is the row height, not a gap |
| Scheduler grid row inset (`--sched-scheduler-row-block-inset`) | `8px` (`--rux-space-2`) |

**The 16px rhythm is the default for any new titled group or content block.** Reach for the
dense rhythm only for a genuinely dense, repeating list of short rows — never as a general
"make it more compact" adjustment.

### 9.3 Responsive composition

These are the layout half of `../layout-composition.md` § Responsive Behavior. **The
accessibility half did not move** — see step 6 and D3.

- Wide layouts SHOULD keep panels attached beside the workspace.
- At narrow widths, panels MAY become overlay drawers or move into normal content flow.
  Which widths are narrow is §1.1's to say, not this section's.
- Interactive rail controls SHOULD meet conventional touch-target minimums, which is what
  §1.1's 500px boundary exists to switch on.

**Rails, drawer widths and workspace minimums are not here**, though step 6 briefly put them
here. `../layout-composition.md` already states that rule — *the shared shell MUST NOT define
product drawer widths, collapsed rails, feature breakpoints, or a workspace content minimum
width* — and it is a **portability** rule about which layer may define a value, not a layout
rule about what the value is. **Q3 is the open question of whether layout owns those fixed
dimensions at all**, so moving the rule here would have answered Q3 by accident. Step 7
removed the duplicate.

---

## 10. Published fixed dimensions

Widths and heights the **portable layer publishes** as tokens. §1 governs the widths at
which layout *changes*; this section governs the widths layout *is*.

| Token | Value | What it sizes |
|---|---|---|
| `--rux-container-xs` | 480px | the one container max-width — narrow dialogs and forms |
| `--rux-panel-width-sm` | 280px | a small docked panel |
| `--rux-panel-min-width` | 224px | the floor a panel may be resized to |
| `--rux-panel-floating-width` | `min(600px, 100vw − 2 × --rux-space-4)` | a floating window's default |
| `--rux-panel-floating-safe-max-width` | 64rem | its ceiling |
| `--rux-workspace-header-min-height` | 40px, 44px at §1.1's 500 | the workspace header band |

**There is no container scale**, and `--rux-container-xs` is deliberately alone: app shells
have no content max-width — the workspace fills available width — and Rux UI has no
marketing surfaces to need a wider one. The `xs` suffix names the rung it would occupy if a
scale ever existed, not a family that does.

**Why the drawer widths are absent.** `--rux-drawer-left-default-width` and its right twin
resolve to `auto`, and that is the rule working rather than a gap: `../layout-composition.md`
holds that *the shared shell MUST NOT define product drawer widths, collapsed rails, feature
breakpoints, or a workspace content minimum width*. That is a **portability** rule about
which layer may define a value, and it is not this document's — see §6 Q3. An application
sets those on its own shell, the same way it sets `--rux-app-view-padding`.
