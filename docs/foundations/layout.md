# Rux UI Foundations — Layout

**Contract version: 2.2.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 17 steps: **17 done**
This document is canonical for **breakpoints (§1), the space scale (§7), and the radius
scale and Materials presets (§8)**. Steps 4 and 5 brought the last two in, and **step 9
adopted the elevation presets**, which was the last thing §8 had measured but not applied.
Its log has no open step.

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
| D2 | ~~The space scale and radius scale are published from `tokens.css` and governed by no document.~~ | **closed, steps 4, 5** — §7 publishes the space scale, §8 the radius scale and the Materials presets, §10 the fixed dimensions. Elevation is measured but not adopted; that is step 9, not this defect. |
| D3 | ~~`../layout-composition.md` § Responsive Behavior still states four accessibility MUSTs outside a foundation document.~~ **Fully closed 2026-08-22.** § Spacing and the layout half moved in step 6; the accessibility remainder was received by [`state.md`](state.md) step 4 as its rules 2.7–2.10, and that section is now a pointer to both halves. Step 6's refusal to relocate them here — into a home that would have had to hand them back — is what let the second half land in one move instead of two. | **closed** — step 6 and `state.md` step 4 |
| D4 | ~~Nothing enforces §2.4 against the application layer.~~ | **closed, step 3** — the contract test covers both layers |
| D5 | ~~`README.md` § Layout states `--rux-container-xs` (480px) and it has no canonical home — layout does not publish container widths, and whether it should is **Q3**. Not a duplicate, so step 7 left it: the fix is to answer Q3, not to move a value into a document that has not claimed the category. ~~ | **closed, step 10** — §10 publishes it, and Q3 is answered |
| D6 | ~~**Nothing enforces §11**, and two declarations sit outside the scale.~~ **Closed, step 14.** §11.3.3 gave the rule a checkable floor drawn from the scale itself, and `layout-contract` enforces it with no exception list. `.rux-splash`'s `9999` became `--rux-z-splash`, a rung the scale had been missing. `.rux-resize-gutter`'s `10` is **legal and stays** — it is below every global rung, and 11.3.2 leaves that judgement to the author. | **closed, step 14** |

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
| 9 | Adopt the Materials elevation presets (§8.1, D2) | **done · Class B** | **Executed 2026-08-22, after step 12 removed the block.** **Three of the eight presets were adopted, not eight** — this system has three elevation roles and publishing five dead tokens would be inventory, not conformance: **Small → `--rux-shadow-1`** (scrolled panel nav and attached footer), **Menu → `--rux-shadow-2`** (menus, popovers, anchored panels, colour-picker popover), **Modal → `--rux-shadow-3`** (modals, floating panels, trip bar). Base, Tooltip, Medium, Large and Fullscreen stay recorded in §8.1 and unpublished. **Only the shadow layers were taken.** Each Geist preset also bundles a 1px stroke and a backdrop fill into its `box-shadow`; this system paints both with real borders and backgrounds, so adopting them would double every border — §8.1's second table records exactly what was left. **The alphas are Geist's but the colours are not literal.** 2% / 4% / 6% are expressed through `oklch(from var(--rux-neutral) 0% c h / n%)`, because a literal `#0000000a` would reintroduce the blue cast `color.md` rule 2.8 step 12 removed. **BEFORE → AFTER, resolved, both themes.** Dark — `--rux-shadow-1` `inset 0 1px 0 oklch(1 0 0/0)`, `0 1px 1px oklch(0 0 0/.86)`, `0 2px 4px oklch(0 0 0/.28)` → `0 1px 2px oklch(0 0 0/.16)`; `--rux-shadow-2` rim + `0 1px 2px /.86` + `0 6px 14px /.28` → `0 1px 1px /.02`, `0 4px 8px -4px /.04`, `0 16px 24px -8px /.06`; `--rux-shadow-3` rim + `0 2px 4px /.86` + `0 14px 32px /.34` → `0 1px 1px /.02`, `0 8px 16px -4px /.04`, `0 24px 32px -8px /.06`. Light — `--rux-shadow-1` rim + `0 1px 1px oklch(.16 0 0/.7)` + `0 2px 4px oklch(.16 0 0/.1)` → `0 2px 2px oklch(0 0 0/.04)`; `-2` and `-3` land on the same values as dark, because Geist's Menu and Modal stacks are theme-invariant. **This is a large perceptual change and the log should not soften it**: the tight contact layer went from **86% to 2%**. Shadows that used to carry separation now barely register, and every affected surface relies on its border instead — which is the Geist model, and is why the stroke question above mattered. **The rim inset was dropped from all three**, and that part is invisible: `--rux-shadow-rim-color` resolves to **0% alpha in both themes**, measured, so it painted nothing. **The token itself was kept** — `navigation.css:52` uses it as a `background`, and removing a public name would be Class C. `--rux-shadow-pressed` and `--rux-shadow-inset-color` were **not touched**; `pressed` has zero consumers and retiring it is Class C, so it stays. `--rux-shadow-small-color` is **new** (Class A inside this step) and carries the one preset whose geometry, not just colour, varies by theme. Contact, ambient and overlay are now **theme-invariant** — their light overrides were removed rather than repointed, so light shadows moved from `L16%` to pure black at Geist's alphas. **States needing an eyeball, none of them verified visually here:** `.rux-menu` and `.rux-popover`; `.rux-modal` as preferences and profile picker; `.rux-panel--floating` (trip dialog); **`.sched-trip-bar`, the one to check hardest**, since it used the strongest shadow on a busy grid; the driver-app `.rux-alert`; and panel nav + attached footer *while scrolled*, which is the only state `--rux-shadow-1` appears in at all. **Verification.** The numeric before/after was captured live in both themes and matches §8.1 exactly, and the live elements painting each token were confirmed by querying computed `box-shadow`. **The automated pixel check failed** — the full-page screenshot in this environment framed the viewport into a corner — so the visual half went to the owner instead of being skipped. **The named states above were reviewed and accepted by the owner on 2026-08-22**, against a side-by-side of all three recipes, before and after, in both themes, rendered at the real resolved `--rux-surface-*` values, and including the `.sched-trip-bar`-on-grid case this step singled out as the one to check hardest. **They are cleared.** Recorded with the limitation intact rather than smoothed over: that comparison rendered the *recipes* on representative surfaces, not the live composed components, so it answers *is this shadow strong enough against this canvas* and not *does every consumer still lay out correctly* — which the contract suite and the resolved-value capture already cover. **No contract bump for this entry**: accepting a visual review moves no token, rule or value, and a downstream document conforming to 1.8.0 is unaffected. Contract 1.7.0 → 1.8.0. |
| 10 | Answer Q3; publish the fixed dimensions (D5) | **done · Class A** | **Executed 2026-08-22** as §10. Class A: six tokens documented where they already resolve, no value moves. **My first recommendation on Q3 was a flat "no" and measuring proved it wrong.** The portable layer publishes six fixed dimensions — `--rux-container-xs`, `--rux-panel-width-sm`, `--rux-panel-min-width`, `--rux-panel-floating-width` and its safe max, and `--rux-workspace-header-min-height` — so answering "no" would have left all six governed by nothing while closing the question that noticed them. Answering "yes" would have claimed the drawer-width rule, which is not about what a value should be but about **who may state one**. The split is the answer: layout owns the vocabulary, portability owns the layer boundary. **`--rux-drawer-*-default-width` stays `auto`** and appears in §10 only to explain its own absence — that is the portability rule working, not a gap. **Closes D5**, which step 7 opened rather than fix, on the grounds that moving a value into a document that had not claimed the category was worse than recording the gap. That judgement held: the category needed claiming first. **Deliberately did not invent a container scale** — `--rux-container-xs` is alone because app shells have no content max-width and there are no marketing surfaces; the `xs` names a rung, not a family. Contract 1.5.0 → 1.6.0. |
| 11 | Doc sync — close D2; reorder §4 (drift) | **done · Class A** | **Executed 2026-08-22**, alongside `typography.md` step 62 and for the same reason: a review of what remained found this document overstating its debt. **D2 said the space and radius scales were "governed by no document"** — true when written at step 1, when this document covered breakpoints alone. Step 4 gave the space scale §7, step 5 published the radius scale and the Materials presets as §8, step 8 adopted Geist's 6px default, and step 10 added §10. Both scales have been governed for four steps and the row never moved. **Elevation is deliberately not folded in**: §8.1's presets are measured and unadopted, and that is step 9's, not D2's — closing D2 does not close it. **§4's rows also ran D1, D2, D5, D3, D4**, because step 7 inserted D5 in the wrong place; reseated after D4. **Patch, not minor:** a status correction and a row order; no value moves. Contract 1.6.0 → 1.6.1. |
| 12 | Source Geist's light-theme Materials values; correct §8.1 (unblocks 9) | **done · Class A** | **Executed 2026-08-22 as §8.1.1.** §8.1 asserted the light branch was *not obtainable*, and **that assertion was wrong**. It was measured off the rendered specimen boxes, which are pinned to `#0a0a0a` and answer no theme signal — but Geist also publishes the same values as `--ds-shadow-*` custom properties on `:root`, and **those do answer `prefers-color-scheme`**. Reading `getComputedStyle(document.documentElement)` under an emulated light scheme and again under dark returns both branches directly. **The dark figures were confirmed, not replaced** — every one matches the specimen reading to the code value, which is the argument for recording the method and not only the number. Also corrected: §8.1 called the stroke *constant*; it is theme-varying (`rgba(0,0,0,.08)` light against `rgba(255,255,255,.145)` dark), as is the backdrop fill, and both now have their own table. **Class A** — it publishes a source and corrects a record; no token moves and nothing renders differently. **Deliberately did not adopt anything**, which is step 9's job and was left to it even though both landed the same day. Contract 1.6.1 → 1.7.0. |
| 13 | Claim z-index (R6's homeless third) | **done · Class A** | **Executed 2026-08-22 as §11. Claimed, not declined.** The competing claim was `state.md` rule 2.5's layer-promotion helper, and **the code had already settled it**: `promoteLayer()` toggles a `data-rux-modal-layer` attribute and **never writes `z-index`**, while CSS reads that attribute and applies `calc(var(--rux-z-modal) + 1)`. The kernel decides *when* a surface is promoted, the scale decides *how high* — the same division §8 and `state.md` already use for elevation, where this document owns the Materials presets and that one owns what opens. **The rule was restated rather than inherited, because R6's version was false.** *No literal z-index in any rule* is contradicted by the code **43 times** — but **39 of those are 0 to 5**, lifting a pseudo-element over its own parent or ordering two children inside one component, which has nothing to do with whether a modal sits above a drawer. Importing R6 as written would have made this document publish a rule that is violated on arrival and unenforceable, which is the trap `naming.md` step 2 spent its life avoiding. §11.3 splits it: cross-component stacking uses the scale, local stacking does not. **Two real outliers found and recorded rather than fixed** (D6): `.rux-splash` at **9999** is *above everything* written as a magic number, and `.rux-resize-gutter` at **10** seats itself between the base rung and dropdowns with no name for where it sits. **Deliberately did not add rungs for either** — inventing `--rux-z-splash` inside the step that claims the scale would be deciding its shape while writing its charter. **Deliberately did not write a test**: §11.3.2 means a checker must tell local stacking from global, and no regex reads that distinction; D6 records it as needing a definition first. Contract 1.9.0 → 1.10.0. |
| 14 | Give §11 a checkable floor and enforce it (D6) | **done · Class A + Class B** | **Executed 2026-08-22.** Step 13 claimed z-index and deliberately left two things: no test, and two declarations outside the scale. **The blocker was real and is not solved — it is bounded.** A checker still cannot tell 11.3.1's cross-component stacking from 11.3.2's local stacking; that needs the stacking context a selector renders inside, which no regex reads. **What changed is where the line came from.** The obvious move was to fit one to the data — literals cluster at 0–5 with outliers at 10 and 9999, so *≤ 5 is local* looks clean and is **curve-fitting**: the boundary would move the first time a component legitimately needed a sixth layer. The line §11.3.3 takes instead comes from the **scale's own rungs** — 1, 100, 200, 300, 400, 500 — so a literal at or above **100** shares numeric space with the global layers and interleaves with them regardless of intent, while anything below 100 can collide with nothing but base. That holds whatever the code does next. **It is deliberately weaker than the prose it enforces**, and §11.3.3 says so: a floor for the unambiguous case, not the rule made executable. **`.rux-splash` was the only violation**, and it was reaching for `9999` because the scale had no rung for *above everything* — so the fix was to publish one. `--rux-z-splash: 500` is **Class A** (additive) and repointing `.rux-splash` is **Class B** (`9999` → `500`, both above every other layer, so nothing reorders). **`.rux-resize-gutter`'s `10` is legal and stays**, recorded rather than quietly tidied: it sits below every global rung, and 11.3.2 leaves that to the author. **Verified to fail before being accepted** — a planted `z-index: 250` in `popover.css` went red naming the file and the value, and the revert was confirmed clean. Contract 1.10.0 → 1.11.0. |
| 15 | Claim §7's role layer; retire `--rux-section-label-gap` (R7.1b) | **done · Class A + Class C** | **Executed 2026-08-22.** Two halves, and the first is why the second had anywhere to be recorded. **Class A:** the semantic spacing roles were unowned — §7 stopped at the `--rux-space-*` rungs, and a grep of every foundation document for `--rux-stack-gap`, `--rux-control-content-gap` or `--rux-control-padding-inline` returned nothing. §7.1 now claims them, the same move step 13 made for z-index, and states the two rules that make the layer checkable. **Class C:** `--rux-section-label-gap` is removed. Its only reader was `.rux-card--stack > .sched-scope-trip__section-label + *`, deleted the same day as dead CSS — that class had never appeared in markup in the repository's history, so the token had been reachable but unread for as long as it existed. `.rux-u-section-label`, the utility that actually renders section labels, never read it. **The consumer gate was run before and after, not reasoned about:** `tools/check-consumer.mjs --app ../infor-ln-docs/portal --design-system ./rux-ui` reports **`✓ every rux- name this application uses is defined by the copy it ships`** — zero findings, in both states. The consumer's own vendored `tokens.css` carries the declaration, which is a copy of this file rather than a use, and is exactly the distinction that tool exists to draw. **Corrected at 2.0.1:** this step first cited 12 findings, all under the consumer's `_archive/guide_runner/`, and called them pre-existing noise. They were an artefact of passing `--app ../infor-ln-docs` — the repository root — instead of `../infor-ln-docs/portal`, the application. `_archive/` sits beside the app, not inside it, so the gate was correctly reporting names used by files it had been told to treat as application code. §4's own example already says `--app <portal>`. The conclusion never changed; the evidence cited for it was gathered wrongly, and a gate whose output is quoted from the wrong invocation is worth less than one nobody quoted at all. **So no consumer-migration step is owed, and that is why there is not one** — the protocol requires the migration to be recorded as its own step *when there is one to record*. **Deliberately not done:** the other four roles stay. All four are read — `--rux-stack-gap` 5 times, `--rux-stack-gap-tight` 3, `--rux-control-padding-inline` 10, `--rux-control-content-gap` 25 — so R7.1b does not reach them, and removing a role for tidiness is the opposite of what that rule says. **Major, not minor:** README §2.5 — any Class C takes a major, and this document does not adopt the pre-1.0 allowance in `design-system-distribution.md` §1 that would let a minor carry it. Contract 1.11.0 → 2.0.0. |
| 16 | Claim the three field dimensions (`forms.md` Q3) | **done · Class A** | **Executed 2026-08-23**, answering a question `forms.md` opened rather than one found here. That document states no values on purpose and routes each to the concern that owns it — and for `--rux-field-height` and `--rux-textarea-min-height` no concern did. They were stated only in `../../README.md` § Forms, an orientation summary that is supposed to hold none, which meant `forms.md` step 2 could not strip that section without deleting their only statement. §10 is the right home by its own definition: *widths and heights the portable layer publishes as tokens*. **Additive — no value moves.** 36px and 84px are what `tokens.css` already resolves; this records where they are governed. **36px is conformance, not a house number:** measured on [Geist's Input page](https://vercel.com/geist/input) the same day, its default input renders **36px** — 18 of the 22 rendered inputs on that page, against 2 at 32 and 2 at 40. Geist publishes a three-rung ladder there; this system publishes the default rung only, and whether the other two are wanted is not settled here. **The 84px is ours** — Geist's textarea specimen renders at 100px with `min-height: auto`, so it publishes no floor to conform to. `--rux-checkbox-target-height` joins them for the same reason: a published hit-target height, stated only in that same README section, and `forms.md` §2.9 needs somewhere to route it. **Deliberately not done:** `--rux-field-gap` is not listed. It resolves to `--rux-stack-gap`, which §7.1 already claimed in step 15, so listing it here would give one value two homes.  |
| 17 | Adopt Geist's card header: no rule, no separate surface | **done · Class B** | **Executed 2026-08-23**, on the owner's direction to adopt Geist. Measured on [vercel.com/geist/fieldset](https://vercel.com/geist/fieldset) the same day: its header+body region carries **borderTop 0, borderBottom 0** and the same `background-100` as the body, padded 20/20/0/20; only the **footer** is separated, by a 1px top border *and* a darker background. This system did the opposite — a rule under every header and a header background of `--rux-surface-0`, which resolves to pure black against a dark-grey body. **Before → after, resolved, both themes.** Dark: header background `oklch(0 0 0)` → `oklch(0.1457 0 0)`, now identical to the body; header `border-bottom` **1px → 0**. Light: header background → `oklch(1 0 0)`, identical to the body; `border-bottom` **1px → 0**. Header height is unchanged at 40px. **Two token values move, no name does:** `--rux-card-header-border` `1px solid var(--rux-card-border)` → `none`, and `--rux-card-header-bg` `var(--rux-surface-0)` → `var(--rux-card-body-bg)`. Each was declared once with no theme override, and three rules read them — `card.css` plus `trip-manifest.css` and `trip-history.css`, which mirror the component — so the single edit reaches all three consistently. **States needing an eyeball:** every card with a header, which is 47 header instances across 38 cards; checked on screen in both themes for the five cards the scheduler shows at once (Trip Summary, the itinerary day group, the mini calendar, Calendar Options, Trip Bar Options) and all five read as one surface with the title carried by its type. The card still reads as a card: its own border and radius against the page are untouched. **Deliberately not done:** the footer half. Geist recesses its footer background as well as ruling it, and `--rux-card-footer-bg` is still `transparent` here. That is a second Class B and belongs with the itinerary's dwell-summary work, which is what will first depend on it. **Ownership is unresolved and recorded as Q5** — §9.1 governs the header/body *relationship*, so the rule sits here, but the values that express it are colours. |

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

### 7.1 Semantic spacing roles

Above the scale sit a handful of named roles, in `tokens.css` under
`SPACING · shared roles`. Until step 15 no foundation document claimed them: §7 covered
the `--rux-space-*` rungs and stopped there, so the layer built directly on top of it had
no home. This section is that home.

| Role | Resolves to |
|---|---|
| `--rux-stack-gap` | `--rux-space-2` |
| `--rux-stack-gap-tight` | `--rux-space-px` |
| `--rux-control-padding-inline` | `--rux-space-2` |
| `--rux-control-content-gap` | `--rux-space-2` |

Two rules, and both are about keeping the layer honest rather than adding to it:

**R7.1a — a role MUST resolve to a rung, never to a literal.** The point of the layer is to
name *why* a gap exists while the scale keeps saying *how big* it is. A role holding its own
px value is a second scale wearing a first scale's clothes.

**R7.1b — a role with no consumer is removed, not kept for symmetry.** A named role is a
claim that some recurring need exists; when the last reader goes, the claim is false, and an
unread token that still ships is something a downstream author can adopt in good faith and
be broken by later. Removing one is Class C and takes the full protocol — see step 15, which
is the worked example.

---

## 8. Geist Materials — measured

Source: [vercel.com/geist/materials](https://vercel.com/geist/materials). **Values are not
published**; every figure below was read off the rendered specimens on 2026-08-22, the
method `typography.md` §3 and `color.md` §3.1 establish.

### 8.1 The eight presets

Each bundles a radius, a fill, a 1px stroke, and a shadow stack.

**Both themes are recorded** — see the correction in §8.1.1. The stroke and the backdrop fill
are theme-varying; the shadow stacks are theme-invariant except for **Small** and **Medium**.

| Preset | Radius | Shadow stack — light | Shadow stack — dark |
|---|---|---|---|
| **Base** | 6px | none — stroke only | none — stroke only |
| **Small** | 6px | `0 2px 2px rgba(0,0,0,.04)` | `0 1px 2px rgba(0,0,0,.16)` |
| **Tooltip** | 6px | `0 1px 1px rgba(0,0,0,.02)`, `0 4px 8px rgba(0,0,0,.04)` | *identical* |
| **Medium** | 12px | `0 2px 2px rgba(0,0,0,.04)`, `0 8px 8px -8px rgba(0,0,0,.04)` | `0 2px 2px rgba(0,0,0,.32)`, `0 8px 8px -8px rgba(0,0,0,.16)` |
| **Large** | 12px | `0 2px 2px rgba(0,0,0,.04)`, `0 8px 16px -4px rgba(0,0,0,.04)` | *identical* |
| **Menu** | 12px | `0 1px 1px rgba(0,0,0,.02)`, `0 4px 8px -4px rgba(0,0,0,.04)`, `0 16px 24px -8px rgba(0,0,0,.06)` | *identical* |
| **Modal** | 12px | `0 1px 1px rgba(0,0,0,.02)`, `0 8px 16px -4px rgba(0,0,0,.04)`, `0 24px 32px -8px rgba(0,0,0,.06)` | *identical* |
| **Fullscreen** | 16px | identical to Modal | identical to Modal |

**The two layers that are not shadow**, carried by every preset and theme-varying:

| Layer | Light | Dark |
|---|---|---|
| Stroke | `0 0 0 1px rgba(0,0,0,.08)` | `0 0 0 1px rgba(255,255,255,.145)` |
| Backdrop fill | `0 0 0 1px hsl(0 0% 98%)` | `0 0 0 1px hsl(0 0% 0%)` |

#### 8.1.1 Correction — light *is* obtainable

**This section previously stated that light values were not obtainable, and that was wrong.**
The original note read: *"The specimens are pinned to a `#0a0a0a` fill and did not respond to
`prefers-color-scheme` or to a `data-theme` attribute, so the light-theme variants are not
obtainable from this page."*

**The specimens do not respond; the token layer does.** The measurement was taken from the
rendered specimen boxes, which are pinned. Geist's Materials values are also published as
`--ds-shadow-*` custom properties on `:root`, and those *do* answer `prefers-color-scheme`.
Reading `getComputedStyle(document.documentElement)` under an emulated light scheme and again
under dark returns both branches directly. Measured 2026-08-22, step 11.

**The original dark figures were confirmed, not replaced.** Every dark value in the table
above matches what the specimens gave, to the code value — Small's `#00000029` is 16.1%,
Medium's `#00000052` is 32.2%. Measuring the same thing two ways and getting the same answer
is the reason to record the method rather than only the number.

**What this cost:** step 9 was blocked on this for no reason, and the block was self-imposed
by measuring only one surface. The lesson is in the method note, not the values: **when a
specimen will not answer, check whether the system publishes the value as a token.**
`color.md` §3.1 already did it that way; this section did not, and should have.

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

**A header is not a separate surface.** Header and body are one region: the header carries
no rule beneath it and no background of its own. Geist's Fieldset separates only the
**footer**, and earns it with a top border *and* a recessed background — a card that
separates its header instead is spending contrast where Geist spends none. Step 17.

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
| `--rux-field-height` | 36px | a single-line form control |
| `--rux-textarea-min-height` | 84px | the floor a textarea may be resized to |
| `--rux-checkbox-target-height` | 32px | the hit target a checkbox or switch fills |

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

---

## 11. Stacking order

**Claimed 2026-08-22 by step 13**, routed here from `../audit/design-system-audit.md` §5's
R6 after `motion.md` step 3 took that rule's duration and easing half and found this third
belonging to nobody.

### 11.1 The scale

| Token | Value | For |
|---|---:|---|
| `--rux-z-base` | 1 | a component lifted within its own container |
| `--rux-z-dropdown` | 100 | menus, popovers, suggestion lists |
| `--rux-z-sticky` | 200 | sticky headers and column headers |
| `--rux-z-overlay` | 300 | scrims and drawers |
| `--rux-z-modal` | 400 | modals, and the kernel's promoted layer at `+ 1` |
| `--rux-z-splash` | 500 | a boot screen, which covers the application entire |

Hundred-step gaps so an application can seat something between two rungs without a rename.

### 11.2 Why this document and not `state.md`

`state.md` rule 2.5 gives the overlay kernel a **layer-promotion helper**, which reads like a
competing claim and is not one. **The code already splits it, cleanly**: `promoteLayer()` in
`rux-ui/js/overlay.js` toggles a `data-rux-modal-layer` attribute and **never writes
`z-index`**; CSS reads that attribute and applies `calc(var(--rux-z-modal) + 1)`.

The kernel decides **when** a surface is promoted. The scale decides **how high**. That is
the same division this document and `state.md` already use for elevation — §8 owns the
Materials presets, `state.md` owns what opens and closes — and z-index is the ordering half
of what those presets express visually.

### 11.3 The rule, restated rather than inherited

**R6 said *no literal duration, easing, or z-index in any rule*. The z-index third of that
was never true and could not have been enforced.** Measured across both layers: **22**
declarations go through the scale and **43** are literals — but **39 of those 43 are 0 to
5**, and they are lifting a pseudo-element over its own parent's background, seating a
`::before` marker, or ordering two children inside one component. That has nothing to do
with whether a modal sits above a drawer.

**11.3.1 A rule that stacks against another component uses the scale.** Anything that has to
resolve against a menu, a scrim, a drawer, a sticky header, or a modal reads a `--rux-z-*`
token.

**11.3.2 Local stacking inside a component's own stacking context is not the scale's
business.** A small integer ordering one component's own children needs no token and gets
none. Requiring one would grow the scale by a rung per component and make it mean nothing.

**11.3.3 The checkable floor.** A checker cannot tell 11.3.1 from 11.3.2 — that needs to know
which stacking context a selector renders inside, and no regex reads it. What **is** decidable
comes from the scale rather than from the shape of today's code: the rungs are 1, 100, 200,
300, 400, 500, so **a literal `z-index` at or above 100 sits in the same numeric space as the
global layers** and will interleave with them whether its author meant it or not. Below 100 a
literal cannot collide with any rung but base.

This is **deliberately weaker than 11.3.1**, and the weakness is stated rather than hidden: it
is a floor that catches the unambiguous case, not the whole rule made executable.
`.rux-resize-gutter`'s `z-index: 10` stays legal under it, and that is a judgement 11.3.2
leaves to the author.

*(Enforced: `tests/layout-contract.test.mjs`.)*

**Q5 — Does a `cards.md` want to exist?** Step 17 states a card rule in §9.1 because that
section already governs the header/body relationship, but the values expressing it are
colours, and §9 is a spacing section. `forms.md` established that a component family may
have its own document when its rules span concerns, and cards are the second family to hit
that shape — after empty states, which found no home at all. The question is not whether §9.1
is a bad home for one rule; it is whether the card's contract, which reaches into colour,
spacing and elevation at once, is better read in one place.
