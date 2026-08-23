# Rux UI Foundations — Typography

**Contract version: 4.11.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 63 steps: **59 done · 1 deferred · 3 withdrawn**
The type system conforms to the measured Geist catalog end to end, in its **values** and now
in its **names**: the ladder sits on the catalog (24), roles own their leading and carry a
family (25, 26), tracking follows the curve (27), every overridden heading is paired (29),
the small end is on the catalog with nothing derived (30), the utilities apply their roles
(22), and step 31 renamed all three tiers to the catalog's `text-{family}-{size}` shape under
this system's prefix. That closed **D2, D3, D4, D6, D7, D12, D13, D14** and two of D11's
three halves; step 9 retired the third emphasis tier that was only ever documented, closing
**D5**. **Q1–Q5 and Q7–Q9 are answered** (§6).

**Where to pick up.** Nothing is open or ready. **The system is the catalog under its
prefix:** all 29 styles published with a utility each (50, 51; Q12), the element defaults on
catalog rungs — `code` on `copy-13-mono`, lists on the base leading (52, 53) — and both of
the catalog's modifiers, Strong at 550 in Copy and Subtle in Heading (54), on a webfont
import that declares Geist's variable range. Every value was measured off the rendered
specimens on 2026-08-21 (49). **What is left is not conformance:** D19 (the trip-bar pill's
12/12 default tier, app tier) and D22 (a literal `12px` in `maintenance-share.css`) are
app-tier defects awaiting their owner; steps 4, 23, 32, 34 and 46 wait on a consumer.
**Next: `color.md`**, by the same method.

1. **Q6 — Is there a responsive story? — ANSWERED (step 7): no.** The census behind steps
39–43 measured every rendered element across seven surfaces at 375px and 500px and found
**one** case of narrow-width pressure in the entire application: `text-heading-40` on
`maintenance.html`'s status heading, wrapping to two lines at 97% of its container, in an
**error state**, with **no overflow**. In the populated state that page renders nothing above
16px. Every other surface was comfortable — `text-heading-24` peaked at 81% on one line.
A responsive rung would have been a permanent rule in the type system serving a single error
message, which is the failure mode `layout.md` §1.2 names for breakpoints. The mechanism
stays as measured — the scale never moves and a call site picks a different published rung —
and **no role takes a small-screen variant**. The one pressured element is an unclassed `h1`
falling through to the largest rung by accident rather than by choice; classing it is a
mapping fix, not a responsive one. *Original text follows.*

**Q6 — the original question, and only its *mapping*.** The mechanism is settled: the
   scale never moves, and a call site picks a *different published rung* at a breakpoint
   (`md:text-heading-40` — a class that now exists, since step 31). What is undecided is
   **which roles get a small-screen rung, and which rung** — two variables, not three: the
   *widths* are already a closed set of four, enforced by
   `tests/breakpoint-contract.test.mjs`, with **500** the standing candidate. What they lack
   is a canonical home — now provided by [`layout.md`](layout.md) §1.1, which publishes the
   set and makes **500** citable (steps 35, 36). *Gates step 7.*
2. **The rename is finished.** Step 33 removed every superseded name — 52 declarations and
   4 selectors — at contract 4.0.0; `tests/typography-roles.test.mjs` holds the twelve
   retired names as a ratchet. *(This item said the aliases were still published until
   step 49 corrected it.)*
3. **The consumer-migration steps are deferred, not done.** Steps 32, 34 and 46 record what
   a consumer would have to do; step 48 took consumers out of scope. They stay on the log
   because the obligation is real if anything is ever re-vendored from an older tag.
4. **Deferred for want of a consumer:** steps 4 and 23. Step 23's three rungs now have
   consumers waiting in the log — `13` and `18` land with step 52 (`code` is the named
   consumer), `36` with step 50 — so it closes through them rather than on its own.
   Steps 11 and 16 are **done** (this item said otherwise until step 49).

**Next foundation documents.** `colors.md`, `materials.md` and the component specs are the
stated direction, with the catalog's own pages as the source — see `README.md` §1. Derived from
§5; `tests/foundations-contract.test.mjs` fails if this line disagrees with the log.

This document is canonical for type in Rux UI: the scale, the roles, the utilities, and
the rules that govern all three. It states the current contract, records the known
defects in it, and sequences the amendments that resolve them.

**Authority.** Per `CLAUDE.md` § Foundation Work, this document authorizes its own
amendments. A change to a type token, a type rule, or a published type utility is legal
when it is a numbered step in §5 — and is otherwise prohibited, the same way
`docs/portability-audit.md` governs renames. `README.md` § Typography is the orientation
summary; where the two disagree, this document wins and README is corrected in the same
step.

**Precedence.** This document outranks every downstream specification that renders Rux UI
type, in this repository or any other — including `infor_ln_docs/_standards/guide-markup.md`
and any stylesheet that implements it. Where they conflict on type, this document wins.

**Scope of that precedence.** It is deliberately narrow, because unbounded authority would
let a type document decide things that are not type:

- **This document owns the vocabulary and its behavior** — which sizes, weights, leadings,
  and trackings exist, what each means, and how they combine.
- **A downstream specification owns the mapping** — which of *its* roles takes which item
  from that vocabulary. `guide-markup.md` decides that a gap marker is amber and a session
  code is a filled badge. It does not decide what amber is, and it may not introduce a
  size the scale does not publish.
- A downstream need that the vocabulary cannot express is a defect **here**, and is fixed
  by an amendment in §5 — never by the downstream document escaping the scale.

**This document moves no code.** Execution runs against §5.

**Enforcement.** `tests/typography-roles.test.mjs` already checks four of the rules below
and predates this document: every role carries all five axes (rule 1.1), a role aliases the
scale and never states a literal (§1), no role is defined but unused, and a recurring
size+leading recipe goes through a role rather than the raw scale (rule 1.2). New rules that
can be checked SHOULD extend that file rather than starting a second suite.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required, preferred,
optional, and prohibited behavior.

---

## 1. The three tiers

Type is expressed in three tiers, and a call site MUST consume the highest one that fits.

| Tier | What it is | Named by | Lives in |
|---|---|---|---|
| **0 · Primitives** | `--rux-size-*`, `--rux-line-height-*`, `--rux-weight-*`, `--rux-tracking-*` | its **value** (`14`, `24`, `400`) | `rux-ui/css/tokens.css` |
| **1 · Roles** | `--rux-text-copy-14-*`, `--rux-text-heading-16-*` — a complete five-axis recipe | its **family and size** (`copy-14`, `label-13-mono`) | `rux-ui/css/tokens.css` |
| **2 · Utilities** | `.rux-text-label-12`, `.rux-u-section-label` — one class that applies a whole role | its role, or its **object** where it adds anything beyond the role | `rux-ui/css/` |

**Both tiers are named by number, and the tiers are still distinct** (step 31; before it,
Tier 1 was named by intent — `body`, `caption`, `eyebrow`). What separates them is not the
naming scheme but what the name promises: a primitive is **one measurement**, a role is a
**complete five-axis recipe** for one of rule 2.12's families at one size. `--rux-size-14`
is a length; `--rux-text-copy-14-*` is a length, a weight, a leading, a tracking and a
colour that agree with each other.

Two rules survive the rename unchanged, and they are the ones that carry the guarantees. A
primitive MUST NOT be named for a role, because that is what lets a fourteenth size be
recognised as a fourteenth size rather than as "the size the new thing needed." A role MUST
NOT introduce a number, only alias one, because that is what lets every caption in the
system be restyled at once — a rule about *values*, which a numeric *name* does not touch.

**What the rename costs, recorded because it is a real loss.** `caption` said what the text
was for; `label-12` says what it measures. A call site that knows it wants supporting text
must now know that supporting text is label at 12. The catalog accepts that trade — it has
no intent-named type style anywhere — and §2.12's four-family question is what replaces the
lost hint: the family is in the name, so the reader is choosing a size within a family
rather than choosing blind.

**Rule 1.1** — A role MUST carry all five axes: size, weight, line-height, tracking,
color. A call site that has to reach past a role to Tier 0 for one axis is a defect in
the role, not in the call site.

**The fifth axis is this system's extension, not the catalog's** (step 49). A Geist text
style sets exactly four properties — size, leading, tracking, weight — and its colour comes
from the page. Re-measured 2026-08-21: the grey on the catalog's specimens is demo
scaffolding, not a property of the style — every row carrying a Strong renders its base in
`gray-900` so the modifier reads, while `copy-13` and `label-18` render `gray-1000`. The
colours in §3.2 are therefore **this system's mappings** — `copy-16` and `label-12` are
secondary because they were the lead and the caption before the rename — and a reader
comparing against Geist must not take them as measured. Kept, because the rule's reason
stands on its own: a role a call site has to leave for its colour is half a role. A mono
role additionally carries a **sixth axis, `-family`**, because the catalog's `-mono` styles
differ from their sans siblings in nothing else (steps 50, 52).

**Rule 1.2** — A recipe used by exactly one component is not a role. It belongs in that
component's own token block, beside `--rux-field-label-*` and `--rux-button-font-*`.

**Rule 1.3** — Every published role SHOULD have a Tier 2 utility. A call site applying
five `var()` references by hand can forget one; a class cannot.

---

## 2. Rules

**2.1 Sizes are rem, never px.** The scale is authored in `rem` so a reader who raises
their browser's default font size gets a larger interface. A `px` type size in any
stylesheet is a defect.

**2.2 Leading is a property of the role at a size, and the pair is a length.** Line-heights
are declared in `rem`, not as unitless ratios, so every size/leading box lands on the 4px
grid and no consumer re-derives leading by multiplying. A unitless `line-height` on a type
role is a defect.

**Leading does not follow from size alone.** Two roles at the same size take different
leading when they behave differently: measured on the Geist catalog, `label-16` is 16/20
where `copy-16` is 16/24, and `label-18` is 18/20 where `copy-18` is 18/28. A single
size→leading pairing cannot say that, so `--rux-line-height-*` is **not** a 1:1 partner of
`--rux-size-*`; it is a set of lengths that roles draw from. This is the metric expression
rule 2.6 says the Copy/Label split lacks — it lacks it at 14, where both are 20, and gains
it at 16 and above. *(Amended in step 22-decisions; executes as step 25.)*

**A role's leading is its own row height.** Where a container cannot fit the leading its
role declares, the container is what changes. Type is settled first and boxes conform to
it — never the reverse.

**One exception: a glyph box is not a type role.** An icon, an emoji, a count badge, or a
`::after` marker sets `line-height: 1` to collapse its line box onto its glyph box, so the
mark centres inside a fixed circle or square. That is box geometry, not leading, and it is
the *only* place `line-height: 1` is legitimate. The test that enforces this rule carries
the closed list — `tests/no-literals.test.mjs`, which cites this paragraph. A site enters
that list by being a mark rather than a word; anything that renders as language does not
qualify, however short. *(Added in step 57.)*

**A role's metric axes are adopted together.** A role is five axes, and four of them —
size, weight, leading, tracking — were measured as a set. Taking some while hand-rolling the
rest is the same defect as a unitless leading, reached by a different route, and it is the
more common route: the axis dropped is almost always leading, because a size looks like it
names a rule on its own and leading looks like a detail. Reading `--rux-text-label-12-size`
and then writing `line-height: 1` beside it states a role and then contradicts it.

**Colour is the fifth axis and does not travel with the other four.** A role's `-color` is
its default, not a mandate: the system publishes `--rux-text-primary`, `-secondary` and
`-disabled` as semantic choices precisely so an element can take a role's metrics and set
its own emphasis. `.rux-u-subtitle` is the pattern — `copy-14`'s size, weight, leading and
tracking, with `--rux-text-secondary` for colour. Requiring all five would make that a
defect, and it is not one.

Where an element's metrics match no published role, **the element changes** — it takes the
nearest role and accepts the imperfection. That is `README.md` §2.6, and it is the default.
A missing role is the rare case, and claiming it means showing the catalog is genuinely
short: a need that recurs, that no role can express, and that a downstream would hit too.
An element being unusual is not that. What is never correct is the third option — adopting
part of a role at the call site and improvising the rest.
*(Added in step 57; the colour clause corrected in step 59; the closing default corrected in
step 60, which had it backwards — it read an unmatched element as evidence against the
catalog rather than against the element.)*

**2.3 Hierarchy comes from size, weight, and space — never from family.** Three families
exist: `--rux-font-sans` (Geist), `--rux-font-sans-condensed` (aliases sans; Geist has no
condensed cut), `--rux-font-mono` (Geist Mono). There is no fourth. No display serif, no
script.

**2.4 Mono holds its size, and inline code is `copy-13-mono`.** A mono role takes its
sans sibling's size: the catalog's `label-14-mono` is 14px, `copy-13-mono` is 13px (Q9).
Inline code — `code`, `kbd`, `samp` — and block code — `pre` — read **`text-copy-13-mono`
whole**, 13/18 mono 400, which is the catalog's inline-code style by its own usage line
(*"Used for inline code mentions"*). Inside a line of 14px copy the 18px leading is inert —
the line box is the copy's — and `pre` takes it as a block. Mono size MUST come from a role
or `--rux-size-*`, never from a proportional `em` — a proportional shrink lands off the
scale at every call site and produces fractional pixels.

*History.* Until step 52 this rule said inline mono **steps down one rung** from the sans
around it, on the reasoning that a monospace face reads larger at matched nominal size, and
`code` rendered 12px — with Q9 recording that the catalog had no inline-code style to
compare against. Step 49 found that it has one (D20), and step 52 adopted it. The
step-down was a departure, not a gap; it is recorded here because a reader who remembers
"code is one rung down" should find where that went.

**2.5 Emphasis is a modifier, not a role.** Weight and color modifiers MUST NOT change
size. A modifier that also sets `font-size` is a token wearing a modifier's name, and MUST
be promoted to a role.

**2.6 Copy and Label split by block behavior, not by meaning.** Copy runs to several lines
and takes the taller leading. Label runs to one line and sits level with an icon. A
one-line table cell is a Label even though it reads as prose. **At the 14px base this
distinction has no metric expression** — Copy and Label resolve to the same recipe, because
the grid offers 20 or 24 and 24 is prose leading. The two roles are kept apart anyway: they
name different intents, three components read `text-label-14`, and they would move
independently the moment a surface with real prose gets its own base. A convergence that is
recorded is not a defect; an undocumented one is (Q2, step 12).

*Corrected by the ramp decision: the divergence does not wait for a new base. It appears at
**16 and 18**, where the catalog gives Label 20 and Copy 24/28 at the same size. The 14px
convergence is a coincidence of that one rung, not a property of the split.*

**2.7 Every rule states both themes.** A type rule naming a color MUST name a semantic
token, never a lightness. The relationship inverts under `data-theme`, so a literal that
is correct in one theme is wrong in the other by construction.

**2.8 Measure is derived, not chosen.** Prose is capped near 70–78 characters at the base
size; tables break out because three columns cannot live in a prose measure. Both are
expressed in `rem` so they track the scale. *(No measure token exists yet — see D8.)*

**2.9 Tabular numerals are a stated property of a role, not a global.** A role that
carries step numbers, times, counts, versions, or dates MUST set
`font-variant-numeric: tabular-nums`. Setting it on `body` is prohibited: it applies
tabular figures to prose, where they are wrong.

**2.10 No unnamed off-grid value.** The 4px grid has named exceptions —
`--rux-space-px` (1px) and `--rux-space-1-5` (6px). An off-grid value that is not one of
them is the error. Absolutism here is false comfort: every real system accumulates two or
three principled exceptions, and the useful rule is that each one is *named*.

**2.11 Weight is a property of the role, not of the size.** Four weights are published
for application use: **400** for copy and labels, **500** for controls and for inline
emphasis inside a Label, **550** for inline emphasis inside Copy, **600** for headings.
**Two modifiers, both the catalog's** (step 54): **Strong** — a `<strong>` — is 550 inside
Copy and 500 inside Label; **Subtle** — a `<strong>` inside a Heading — is 500 at the
secondary colour. 500 is the element default because a dense UI's strings are Labels by
rule 2.12; `p` and the `text-copy-*` and `text-heading-*` utilities opt their `<strong>`
into the other two. A component that reads a Copy role through its own class and wants
550 sets it, the way six components pin 400 today (step 6). **A badge is a Label and takes 400**, per 2.12's tree, which lists it
there — this clause read "controls, badges, and inline emphasis" until step 41 and so put
badges at 500 while 2.12 put them at 400 (D16). A heading takes 600 at every size it appears at — a 14px
heading is 600 exactly as a 72px heading is — and copy takes 400 at every size. Weight MUST
NOT be varied to compensate for size; separating two levels is what the size scale and rule
2.3 are for. Nothing above 600 is published: the only heavier weights in the codebase are
the untokenized `700`/`800` literals in the print surface (S2), which §7.3 records as
needing its own answer rather than a louder version of this one.

This follows the Geist catalog the system's face comes from, not an independent judgement —
`text-heading-*` is 600 at all ten published sizes from 14 to 72, `text-button-*` is 500,
`text-copy-*` and `text-label-*` are 400, and its Strong measures **550** inside Copy.

*History.* Until step 54 this paragraph said 550 was a value "a ladder stepping in 100s
cannot say" and 500 was the adopted rung for `strong` (D2, Q3). Step 49 re-measured and
found the 550 was only half the story — Strong is 550 inside Copy and 500 inside Label, and
Geist has a second modifier, Subtle, that this system had never adopted (D21). Step 54
adopted both: `--rux-weight-550` exists, and the webfont import declares Geist's variable
range so it renders as a real instance. "Cannot say 550" was true of the names and of the
`@font-face` the discrete import produced, not of the face.

**2.14 Twelve is the floor.** Nothing below 12px is published, and no call site may mint
one. That is the Geist type catalog's own floor. The curve is therefore **0 at 12–20 for
non-headings, and −0.02 → −0.06em for headings as they grow** (2.13) — flat at the small
end, with no positive branch.

*Rule 2.14 previously read "below 14px, tracking turns positive" and required
`--rux-tracking-dense` (+0.02em) there — the compensation a sub-catalog rung needs to stay
legible. Step 37 corrected its threshold to 12, having found it demanded +0.02em at 12px
while citing the Geist measurement that records 0 there. Steps 42 and 43 then removed every
sub-12 consumer, and **step 45 deleted the rule and its token**: a positive tracking branch
exists only to prop up rungs below the catalog floor, and there are none. The floor moved
from 11 to 12 in the same step — 11 was Geist's floor only once its **components** were
counted rather than its type catalog, which is the distinction Q7 turned on and Q11
settled against.*

**2.12 Four role families, and the object decides which.** Every type role belongs to one
of four families, taken from the Geist catalog this system's face comes from: **heading**
(names a region — 600, tracking on the 2.13 curve), **button** (a control's own label —
500, tracking 0), **label** (a single-line UI string — 400, flat leading), and **copy**
(prose that wraps — 400, leading that grows with size). Nothing outside the four is
published.

A call site chooses by asking four questions **in order** and stopping at the first yes:

1. Does it name a region? → **heading**
2. Is it a control's own label — the text `--rux-button-*` sizes? → **button**
3. Is it a single line of UI text? (badge, cell, chip, field label, eyebrow) → **label**
4. Does it wrap as prose? → **copy**

The questions are about *behavior*, not importance. A one-line table cell is a Label even
though it reads as prose (rule 2.6), and a badge does not become a heading because the
thing it labels matters. Two call sites cannot disagree about the same object.

**Interactivity alone does not answer Q2.** A menu item, a navigation destination and a
clickable list row are all interactive and all take **label** — `.rux-menu__item` and
`.rux-side-nav__item` have read `--rux-text-label-14-*` since before this tree was written.
The `button` family is what the `--rux-button-*` control contract reads, so Q2 asks whether
the text *is a control's own label*, not whether something around it responds to a click.

The published sizes per family, and the leading each takes:

| Family | Weight | Tracking | Sizes / leading |
|---|---|---|---|
| `heading` | 600 | 2.13 curve | 14/20 · 16/24 · 20/26 · 24/32 · 32/40 · 40/48 |
| `button` | 500 | 0 | 12/16 · 14/20 · 16/20 |
| `label` | 400 | 0 | 12/16 · 13/16 · 14/20 · 16/20 · 18/20 · 20/32 — mono: 12/16 · 13/**20** · 14/20 |
| `copy` | 400 | 0 | 13/18 · 14/20 · 16/24 · 18/28 · 20/36 · 24/36 — mono: 13/18 |

The table is the catalog, re-measured in full on 2026-08-21 (step 49): 29 styles, and since
step 50 this system publishes **all 29** (§3.2). The heading family also runs to **48/56 ·
56/56 · 64/64 · 72/72**, all 600 at −0.06em. Mono styles hold their sans sibling's size and
weight and differ only in family — except `label-13-mono`, which takes 20 where `label-13`
takes 16 (Q9).

**No departure stands.** Until step 50 one did — heading stopped at 40, button at 14, label
lacked 20/16/13 and every mono rung, copy lacked 24/20/18/13 — because §7.3's named-consumer
rule kept out every rung no call site read. Q12 settled that the adopted catalog is itself
that consumer, and step 50 published the sixteen. What remains between this system and the
catalog is behavioral, not vocabulary: inline `code` (D20, step 52) and the emphasis
modifiers (D21, step 54).

**A second departure is withdrawn.** Until step 49 this paragraph read *"`label-20` takes
24, not Geist's 32 … the one place this system judges the catalog inconsistent with
itself."* The specimen re-measured **20/32** on 2026-08-21, the judgement was this system's
taste set against its source, and the program's stated goal is to conform exactly — so the
rung is recorded at the catalog's 32 and nothing moves, because `label-20` is unpublished
until step 50. The objection is kept on record: 32 is 1.6 leading on a one-line role and
breaks the flat-leading pattern every smaller Label rung follows. It is still the catalog's
number.

**2.13 Only Heading tracks, and it tracks on a curve.** Optical tracking tightens as size
grows, but it is not a property of size alone — measured on the Geist specimens, **Button,
Label and Copy track 0 at every size they publish**, including `copy-24`. Only Heading
carries a curve:

| Heading size | 14 | 16 | 20 | 24 | 32 | 40+ |
|---|---|---|---|---|---|---|
| Tracking | −0.02em | −0.02em | −0.02em | −0.04em | −0.04em | −0.06em |

A single flat token cannot serve both ends: at `text-heading-40` the −0.02em that served it
until step 27 was two steps too loose, which was D7. **There is no named exception any
more.** Until step 40 this paragraph named one — `text-label-12-wide`, positive tracking for
uppercase labels. Step 40 dropped the uppercase and step 47 retired the role, so Label
tracks 0 everywhere it renders. *Re-measured 2026-08-21 (step 49):* the catalog's own
`label-12` specimen carries capitals from its data — *"AND CAPS"* — at tracking **0** with
no transform, which is the evidence Q10 recorded as missing.

---

## 3. Current state

Re-verified against `rux-ui/css/tokens.css` and `rux-ui/css/colors_and_type.css` on
**2026-08-21** (step 49), after eight steps had moved the code without moving this section,
and measured live on `index.html` where a value depends on the cascade. Values are px
equivalents at a 16px root.

### 3.1 Tier 0 — primitives

Sizes and line-heights are named by the px they resolve to at a 16px root (step 31);
tracking is not, because it is an em ratio with no px to name it by, and its names state
position on the 2.13 curve.

| Size | Line-height | Tracking | |
|---|---|---|---|
| `12` | `12` | `tight` | −0.02em |
| `13` | `16` | `tighter` | −0.04em |
| `14` | `18` | `tightest` | −0.06em |
| `16` | `20` | `normal` | 0 |
| `18` | `24` | `wide` | 0.04em — print only |
| `20` | `26` | `widest` | 0.1em — print only |
| `24` | `28` | | |
| `32` | `32` | | |
| `40` | `36` | | |
| `48` | `40` | | |
| `56` | `48` | | |
| `64` | `56` | | |
| `72` | `64` | | |
| | `72` | | |

**Thirteen** sizes, **fourteen** line-heights — every size the catalog uses and every
leading it pairs one with, since step 50 (`13`, `48`–`72`, and leadings `18`, `36`,
`56`–`72`). `18` is off the 4px grid the way `26` is: both are catalog values, named per
rule 2.10. Earlier history: the rename collapsed `lg` and `xl`, which were both 1.75rem — a
ladder cannot name one length twice and still say which rung a role meant; step 7 minted
`26` for `heading-20`; step 45 retired `11` and its `dense` tracking. That left `12` with no
size to pair with and **one reader**, the trip-bar pill's default tier, which is D19. `wide`
and `widest` survive only as print vocabulary (`trip-envelope.css`, step 44); no screen role
reads either. *(This table listed `11` and `dense` until step 49, and stopped at 40 until
step 50.)*

Weights `--rux-weight-100` … `--rux-weight-900` exist as a complete ladder; rule 2.11
publishes 400, 500 and 600 for application use and nothing above. (Before step 6 this
paragraph cited a §2 rule that did not exist — 2.11 is now that rule.)

**Nothing separates this ladder from the catalog's** (step 24 closed the heading end at 40;
step 27 added the tracking rungs; step 30 put the small end on the catalog and step 31
removed the duplicate leading; step 45 put the floor at 12; step 50 published the rest).
Every rung is a catalog value, named by its number per Q8. The one rung the catalog does
not have is `12` on the leading ladder, which D19 will orphan.

### 3.2 Tier 1 — roles

Every role carries its **family** (rule 2.12), and since step 31 the family is *in the name*
— `text-{family}-{size}`, the catalog's shape under this system's prefix. Step 26 had
deliberately left the intent names in place; step 31 is where that reversed, because Q8's
answer made a numeric Tier 0 and an intent-named Tier 1 read as two systems.

| Role | Was | Family | Size | Weight | Leading | Tracking | Color |
|---|---|---|---|---|---|---|---|
| `text-heading-40` | `heading-page` | heading | 40 | 600 | 48 | tightest | primary |
| `text-heading-24` | `heading-section` | heading | 24 | 600 | 32 | tighter | primary |
| `text-heading-16` | `heading-panel` | heading | 16 | 600 | 24 | tight | primary |
| `text-copy-16` | `text-lead` | copy | 16 | 400 | 24 | normal | secondary |
| `text-copy-14` | `text-body` | copy | 14 | 400 | 20 | normal | primary |
| `text-label-12` | `text-caption` | label | 12 | 400 | 16 | normal | secondary |
| `text-label-14` | `label-control` | label | 14 | 400 | 20 | normal | primary |
| `text-button-14` | — *new (38)* | button | 14 | 500 | 20 | normal | primary |
| `text-button-12` | — *new (38)* | button | 12 | 500 | 16 | normal | primary |
| `text-label-18` | — *new (38)* | label | 18 | 400 | 20 | normal | primary |
| `text-heading-32` | — *new (7)* | heading | 32 | 600 | 40 | tighter | primary |
| `text-heading-20` | — *new (7)* | heading | 20 | 600 | 26 | tight | primary |
| `text-heading-14` | — *new (7)* | heading | 14 | 600 | 20 | tight | primary |
| `text-heading-48` | — *new (50)* | heading | 48 | 600 | 56 | tightest | primary |
| `text-heading-56` | — *new (50)* | heading | 56 | 600 | 56 | tightest | primary |
| `text-heading-64` | — *new (50)* | heading | 64 | 600 | 64 | tightest | primary |
| `text-heading-72` | — *new (50)* | heading | 72 | 600 | 72 | tightest | primary |
| `text-button-16` | — *new (50)* | button | 16 | 500 | 20 | normal | primary |
| `text-label-20` | — *new (50)* | label | 20 | 400 | 32 | normal | primary |
| `text-label-16` | — *new (50)* | label | 16 | 400 | 20 | normal | primary |
| `text-label-13` | — *new (50)* | label | 13 | 400 | 16 | normal | primary |
| `text-label-14-mono` | — *new (50)* | label · mono | 14 | 400 | 20 | normal | primary |
| `text-label-13-mono` | — *new (50)* | label · mono | 13 | 400 | 20 | normal | primary |
| `text-label-12-mono` | — *new (50)* | label · mono | 12 | 400 | 16 | normal | primary |
| `text-copy-24` | — *new (50)* | copy | 24 | 400 | 36 | normal | primary |
| `text-copy-20` | — *new (50)* | copy | 20 | 400 | 36 | normal | primary |
| `text-copy-18` | — *new (50)* | copy | 18 | 400 | 28 | normal | primary |
| `text-copy-13` | — *new (50)* | copy | 13 | 400 | 18 | normal | primary |
| `text-copy-13-mono` | — *new (50)* | copy · mono | 13 | 400 | 18 | normal | primary |

**Twenty-nine roles — the catalog entire — every one byte-identical to its Geist specimen
on the four axes the catalog sets**, re-measured 2026-08-21 (steps 49, 50). The Color column
is this system's own (rule 1.1); the sixteen published by step 50 take primary throughout.
Mono roles carry a sixth axis, `-family`, reading `--rux-font-mono`. **No metric moved in
the rename**; the Was column is the whole diff, and step 33 removed the aliases. The
sixteen are held in `tests/typography-roles.test.mjs`'s `PENDING` list until a component
adopts one — published, complete, and provably read by nothing but their own utility.

**`text-label-12-wide` is gone** (step 47). It was the eyebrow — label at 12 with open
tracking, suffixed the way the catalog suffixes `label-13-mono` — until step 40 zeroed the
tracking and left two names for one recipe. *(Listed here as live until step 49.)*

### 3.3 Tier 2 — published utilities

**Every role has a utility, and they live in one file** (steps 50, 51): `.rux-text-{family}-
{size}` in `rux-ui/css/base/text.css`, 29 classes, each applying its role's axes by reading
the role's tokens and nothing else, imported **last** by `rux.css` so a utility placed on a
component element wins over the component's own type rule at equal specificity. Rule 1.3 is
satisfied in full. Until step 51 the three that existed lived beside whichever component
first needed them, which is why this section was an index; it is now a rule.

**Which utilities took a shape name.** A class takes its role's name only when it applies
**that role and nothing else**. Add anything — a transform, a divider, a colour that
differs from the role's — and it is describing an *object*, not a role, so it keeps an
object name. A `.rux-text-label-12` that also uppercased would be a class doing something
its name does not say, which is the defect this rename exists to remove.

| Utility | Defined in | Applies | Beyond the role |
|---|---|---|---|
| `.rux-text-{family}-{size}` × 29 | `base/text.css` | the role's five axes, six for `-mono` | — |
| `.rux-u-section-label` | `base/utils.css` | `--rux-text-label-12-*`, **all five** | a padded bottom divider |
| `.rux-u-subtitle` | `base/card.css` | `--rux-text-copy-14-*`, four axes | colour is `--rux-text-secondary`, **not** the role's primary |

History of the three that predate `text.css`: `.rux-text-heading-16` was `.rux-u-panel-title`
and shared a rule in `card.css` with the card, panel and workspace titles, which still read
the role there; `.rux-text-label-14` was `.rux-u-label` in `preferences.css`, likewise;
`.rux-text-label-12` was `.rux-u-caption`, and merged `.rux-u-hint` (step 31) and
`.rux-u-eyebrow` (step 47), in `form.css`. Step 33 removed the superseded selectors; step
51 moved the three rules, and measured that nothing resolved differently. *(This table
listed `.rux-u-eyebrow` and an uppercase section label until step 49.)*

`gallery.html` carries one specimen per class, in the catalog's own four families and with
its modifiers (`<strong>` is Subtle inside a heading and Strong elsewhere), so the whole
ramp can be eyeballed in both themes — `tests/gallery-coverage.test.mjs` required it, as it
requires a specimen of every base file.

Two more carry a single property and are not role applications: `.rux-u-mono`
(family) and `.rux-u-muted` (colour), both in `colors_and_type.css`. Five are layout, not
type, and are out of scope here: `.rux-u-cluster`, `.rux-u-row`, `.rux-u-stack`,
`.rux-u-spacer`, `.rux-u-record-list`.

### 3.4 Element defaults

Measured on bare probes injected into `index.html`, 2026-08-21, so the element default is
read rather than a class override.

- `body` is **14/20/400** at tracking 0 (step 8); `p` is **14/20** (step 41 — the 24px
  exception Q2 named is gone).
- `h1`–`h6` read the six heading roles one for one (step 7): **40/48 · 32/40 · 24/32 ·
  20/26 · 16/24 · 14/20**, all 600, each level stating its own tracking from the 2.13 curve
  because `h1` and `h5` are three steps apart on it (step 27). `h6` is a Heading like the
  rest; `<h6>` has zero occurrences in the repository.
- `strong, b` is **500 at primary** by default — a Label's Strong. Inside `p` or a
  `text-copy-*` utility it is **550** (Copy's Strong); inside `h1`–`h6` or a
  `text-heading-*` utility it is **500 at secondary** (Subtle). Step 54.
- `small` is 12px secondary and inherits its context's leading: **12/20** in body.
- `code, kbd, samp, pre` read `text-copy-13-mono` whole: **13/18** mono 400 (step 52).
  Inline, the 18 is inert and the line box stays the copy's; `pre` takes it as a block.
- `ul, ol` inherit the base leading, so list items render **14/20** (step 53).
- Nothing renders below 12px (steps 42–45).

*This section was stale twice: until step 6 it described the 16/24 body and `0.92em` code
that steps 8 and 10 had replaced, and until step 49 it described `h4` at 18/28, `h6` as a
12px uppercase label and `p` at 14/24, all of which steps 7 and 41 had moved. §3 is
verified against source, so a stale line here is the same defect class as a stale comment
(D3) — and the second lapse is the evidence that "verified at the date of this document"
was never a standing guarantee. Step 49 dates the verification instead.*

---

## 4. Known defects

Each was verified at the cited line. None is fixed by this document; each is resolved by a
step in §5.

| # | Defect | Evidence |
|---|---|---|
| **D1** | **Resolved (step 12) — not a defect.** `label-control` is byte-identical to `text-body`. Recorded as intentional convergence at the 14px base rather than faked apart or deleted; see rule 2.6. | `tokens.css` role block |
| **D2** | **Fixed (step 6).** `strong, b` set `--rux-weight-400`, so emphasis markup produced no weight change at all. Now `--rux-weight-500`. Six component-level pins keep their own 400 and are named in step 6 — those are mapping decisions their components own. | `colors_and_type.css:136` |
| **D3** | **Fixed (step 2, executed inside step 17).** The comment said "semibold by default" over a rule setting 400. Only the *description* was wrong, and step 2 corrected it to match the rule; **step 6 then moved both to 600**, so the block states the weight it sets either way. The two-regime divergence it sat next to is D4, closed by that same step. | `colors_and_type.css:85` |
| **D4** | **Fixed (step 6).** Two heading-weight regimes coexisted: element defaults rendered 400 while the `heading-section` / `heading-panel` roles specified 600, so which one a title got depended on whether it went through a component. Rule 2.11 settles both at 600, and `heading-page` — the one role that contradicted the policy at 400 — moved with them. | `colors_and_type.css` heading block vs `tokens.css:383` |
| **D5** | **Fixed (step 9).** `--rux-text-muted` and `--rux-text-faint` both aliased `--rux-text-secondary`, in **both** themes — the system documented three emphasis tiers and shipped two. Both are retired; the tier that was never real is gone rather than forwarded. | `tokens.css:260`, `:1536` |
| **D6** | **Fixed (step 10).** `code { font-size: 0.92em }` violated 2.4 — it yields 12.88px inside body copy and 14.72px at 16px. Fractional at every call site. | `colors_and_type.css:134` |
| **D7** | **Fixed (step 27).** One flat `--rux-tracking-tight` (−0.02em) served both 36px and 16px. Optical tracking must scale with size; 36px is under-tracked and 16px over-tracked by the same token. **Measured against the Geist catalog during step 6:** its headings step −0.06em at 40–72px, −0.04em at 32px, and −0.02em at ≤20px. So the current token is correct at the small end and roughly two-and-a-half times too loose at `heading-page` — the defect is real but narrower than "one token serves everything" implied. **Curve measured in full (step 22-decisions), by reading computed styles off the rendered specimens rather than the docs, which do not publish numbers:** −0.02em at 14/16/20, −0.04em at 24/32, −0.06em at 40/48/56/64/72, and 0 below 14. Stated as rule **2.13**; closes at step 27. | `tokens.css` tracking block; Geist published specimens, measured |
| **D8** | No measure token exists. Rule 2.8 has nothing to point at. | `tokens.css` |
| **D9** | **Fixed (step 11).** `font-feature-settings: "cv11", "ss03"` with the comment "Inter alt 1, alt g" — but the loaded face was Geist. These are Inter's axes; on Geist they are inert at best. | `colors_and_type.css:63` |
| **D10** | The nine Tier 2 utilities are defined beside whichever component first needed each one. There is no single published index, so a call site cannot discover them. | §3.3 |
| **D12** | **Fixed (step 22).** Only one of the seven type utilities applied its role's complete recipe. `.rux-u-caption` and `.rux-u-hint` bypass the type roles entirely and read the `--rux-field-label-*` component tokens instead — so the utility named "caption" does not use `--rux-text-caption-*`. Four more apply a partial subset. Rule 1.3 exists because "a call site applying five `var()` references by hand can forget one"; the utilities are the call sites that forgot. | §3.3 |
| **D13** | **Fixed (step 30).** `--sched-trip-bar-bus-label-font-size` was `clamp(9px, calc(var(--sched-trip-bar-row-font-size) * 0.85), 13px)` — a proportional shrink with `px` bounds. It resolves to **10.2px** in the running app. This is D6's defect surviving in the scheduler tier: literal `px` type sizes against rule 2.1, a proportional shrink against 2.4, and an unnamed off-grid result against 2.10. Step 10's "the portable tier now contains zero raw type values" was scoped to the portable tier and still holds. | `scheduler/css/features/trip-bar.css:152`, measured live |
| **D14** | **Fixed (step 29).** A component that overrode a heading's size did not override its leading, so the element default's leading outlives the size it was paired with. Measured live: **6 on `index.html`, 3 on `driver.html`** — `.rux-preferences__heading` at **14/40**, two bare `h3` at **14/32**, `.sched-scope-request__dialog-title` at **24/40**, and `.driver-assignment-card__date-range` at **16/19**, whose fractional leading means a unitless `line-height` and is a rule 2.2 defect outright. Two were fixed in step 24 because it would have worsened them; the rest are step 29. **The audit criterion changes under rule 2.2**: `.driver-share-header__label` at 18/20 reads as unpaired against the size ladder but is exactly `label-18`, so step 26 will reclassify some of these as correct rather than fix them. | measured on `index.html` and `driver.html` |
| **D11** | **Fixed (step 7).** The element scale and the role scale diverged: `h2` is 30px, but no role is 30px; `h3` is 24px/400 while `heading-section` is 24px/600. The same visual level has two definitions. **Two of three halves closed; the third is open.** The **weight** half closed at step 6 (`h3` and `heading-section` both read 600). The **off-catalog** half closed at step 24: 30 and 36 were not on the Geist catalog at all — it steps 24 → 32 → 40 — so the two rungs with no role were exactly the two the face's own system never published, and they now sit at 32 and 40. **What remains:** `h2` is 32px and `h4` is 18px, and **no role token exists at either size**. The role set is `heading-page` (40), `heading-section` (24), `heading-panel` (16). The difference step 24 made is that 32 and 18 are now sizes rule 2.12 *publishes*, so a role can be minted for them — 30 never could be. Minting one needs a named consumer (§7.3), so it waits for a component that wants it. | §3.2 vs §3.4 |
| **D17** | `.sched-scheduler__time-ticks` sets `display: none` in its base rule and `display: none` **again** under `.sched-scheduler--time-aligned` — the selector whose whole purpose is to reveal it. No JS overrides either. The result is **42 DOM nodes unreachable in every state**, carrying markup, three `nth-child` position rules and, until step 42, a hardcoded 9px font size. Found by toggling Time-aligned mode in a live browser to verify D15 and finding every span still `0×0`. Not a type defect and not fixed by step 42: flipping that `none` would reveal 42 elements nobody has seen, which is a behavior change. Belongs to whoever owns the time-aligned feature. |
| **D16** | **Fixed (step 41).** Rule 2.11 put badges at weight **500** while rule 2.12's own decision tree lists "badge, cell, chip, field label, eyebrow" under **Label**, which 2.11's second paragraph puts at **400** on the catalog's authority. A badge was therefore both 500 and 400 in the same section. `.rux-badge` rendered 500 and `tests/badges.test.mjs` asserted it, so the contradiction was executable in one direction only. Resolved toward the catalog: a badge is not interactive, so it is not a Button; it is a Label at 400. Same defect class as 2.14's threshold (step 37) and the unpublished Button family (step 38) — a rule disagreeing with the evidence or the table beside it. |
| **D15** | **Fixed (step 42).** `.sched-scheduler__time-ticks > span` rendered at **9px** — below the 11px floor rule 2.14 records, below the catalog's own 12, and off the size ladder entirely, which publishes no 9 rung. Found by probing selectors for step 39 rather than by the census, which never sampled it. Its tracking is deliberately left at `+0.04em` there, because the correct value follows from whatever size it lands on and changing it twice is churn. Belongs to the size migration, not the tracking one. |
| **D18** | **Fixed (steps 52, 53).** Two element defaults pair a published size with a leading no catalog rung gives it.** `ul, ol { line-height: var(--rux-line-height-24) }` renders every list item at **14/24** — 20 `li` on `index.html`, all at 24 — where the 14px rung is 20 in every family. `pre { line-height: var(--rux-line-height-28) }` renders block code at **12/28**, a leading the ladder pairs with 18 and 20. Both predate this document and survived steps 8 and 41 because those swept `body` and `p`, not the list and code blocks. Resolved by steps 53 and 52 respectively. | `colors_and_type.css` lists and `pre` blocks; measured live 2026-08-21 |
| **D19** | **The trip-bar pill at the default density tier renders 12/12** — `--sched-trip-bar-bus-label-line-height` reads `--rux-line-height-12` in `scheduler/css/tokens.css` and only the XXS and SM tiers override it to 16. The catalog publishes one leading at 12 and it is 16. The glyphs sit in a 16px box (`--sched-trip-bar-bus-label-height` *is* 16) and centre by flex, so nothing clips — but step 43 recorded the default tier as "12/16" and that figure was the **row**, not the pill; the pill was never measured. This is also `--rux-line-height-12`'s **only reader** since step 45 retired `--rux-size-11`: fix the pill and the rung is dead, which makes its retirement a Class C candidate. | `scheduler/css/tokens.css` pill block; measured live 2026-08-21, 3 pills, `line-height: 12px`, box 16px |
| **D20** | **Fixed (step 52).** Rule 2.4's inline step-down is a departure the catalog contradicts, recorded as though the catalog were silent.** Q9 says "the catalog has no inline-code style to compare against"; `text-copy-13-mono`'s usage line is *"Used for inline code mentions"*, at **13/18**. Inline `code` renders 12px here. Resolved by step 52. | vercel.com/geist/typography, Copy table, measured 2026-08-21 |
| **D22** | `scheduler/css/features/maintenance-share.css:29` sets `font-size: 12px` as a literal on `.maintenance-trip :is(strong, span, small)` — a rule 2.1 defect in the app tier, found by step 52's grep for rules naming `strong`. One token swap (`--rux-text-label-12-size`) with no render change; recorded rather than swept because it is outside the step that found it. | `maintenance-share.css:29` |
| **D21** | **Fixed (step 54).** Strong is one notch light in Copy, and Subtle does not exist. Geist's `<strong>` measures **550** inside every Copy rung and **500** inside every Label rung; inside a Heading it is Geist's *Subtle* modifier, **500 at the secondary colour**. This system renders `strong` at 500 everywhere and leaves its colour alone, so it matches Label exactly, misses Copy by 50, and gives a heading's `<strong>` the Subtle weight without the Subtle colour. Step 6 deliberately did not mint 550 because "a ladder stepping in 100s cannot say it"; the served file can (step 54). | Geist specimens, every `strong` measured 2026-08-21; bare `<h2><strong>` probe on `index.html` renders 500 at primary |

---

## 5. Amendment log

Ordered by dependency and blast radius. A later session MAY start at step *n* without
re-deriving anything above it. Every step records what it deliberately did **not** do.

Steps marked **[open]** are not yet authorized — they turn on a §6 question and MUST NOT
be executed until that question is answered here. Steps marked **[ready]** are additive or
reversible and execute under standing authority.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; state tiers, rules, current state, defects | **done** | Founding entry. Records the system as it is, not as it should be — every §3 value was read from source, and no §4 defect was fixed in passing. |
| 2 | Correct the stale heading comment (D3) | **done** | Class A, comment-only — and **already executed inside step 17**, which corrected this comment in passing while converting competing rule statements to pointers. The block then read "All headings: tight tracking, weight 400. Override per-context." above a rule that set 400 — **text step 6 has since replaced**, so what this step landed is no longer at `colors_and_type.css:85`. Left as a record of what step 2 did rather than rewritten to describe the file today (step 21). Recorded here rather than left **[ready]**: the log *is* this document's todo list (`README.md` §3), so a step still advertising itself as pending after its work has shipped is exactly the drift the log exists to prevent. Deliberately did **not** change the weight the comment describes — that was step 6, and it turned on Q3 — and deliberately does **not** renumber or fold the row into 17, because a later session is entitled to find step 2 where step 2 was. |
| 3 | Add optical tracking steps per size rung (D7) | **done** | Was **[ready]**; downgraded by §7.3. Additive and safe in itself — new rungs keyed to the display sizes, existing values untouched — but §7.3 established that *a new rung needs a named consumer before it is added*, and this would land five tokens nothing reads. Do it **with** the role that adopts it (step 7), not before. **Closed by step 27**, which had both the named consumer this lacked and the measured curve (2.13). Left in place rather than renumbered or deleted: a later session is entitled to find step 3 where step 3 was, and the reason it was deferred — no consumer — is the reason 27 could do it. |
| 4 | Add `--rux-measure-prose` and `--rux-measure-wide` (D8) | **[deferred]** | Was **[ready]**; downgraded on the same §7.3 grounds that deferred step 3, and by the precedent **Q2** set when it declined to mint `--rux-line-height-prose`. A measure is prose vocabulary, and prose is **S3's surface, which is not in this repository** — nothing under `rux-ui/css/` caps a measure today, so both tokens would land unread. The step's own note said so ("nothing consumes them until a component opts in"); after §7.3 that is the disqualifying condition, not a reassurance. Land them with the portal's foundation pass, beside the role that adopts them. **A constraint found while deferring, recorded so the step need not re-derive it:** rule 2.8 says the measures are expressed in `rem` "so they track the scale", but nothing sets `html { font-size }` — `rem` is the 16px root while the base is 14px on `body`, so a measure derived from a 14px character width and written in `rem` tracks the root, not the base it came from. Whichever unit the step lands on, it MUST say which of the two it follows. Deliberately did **not** take the other route to closing D8 — amending rule 2.8 so it stops promising a token that does not exist. That option was weighed and rejected in favour of deferral, so 2.8 keeps its `(No measure token exists yet — see D8)` pointer and **D8 stays open**. |
| 5 | Publish the Tier 2 utility index (D10) | **done** | Class A, documentation only — §3.3 is now the index. Writing it surfaced **D12**, which is the more serious half of D10: the layer is not merely undiscoverable, it is inconsistent, and two utilities bypass their own role for component tokens. Deliberately **moved no definition and renamed nothing** — both were in scope for this step and both were dropped, because relocating a utility is churn until D12 says where it should live, and renaming is Class C. |
| 6 | Settle the weight policy (D2, D3, D4) | **done · Class B** | Q3 answered: the ceiling is 600 and weight belongs to the role, not the size — recorded as rule 2.11, read from the Geist catalog rather than decided independently. **Four declarations moved, before → after:** `strong, b` **400 → 500** (D2); the `h1`–`h6` element default **400 → 600** (D4); `--rux-heading-page-weight` **400 → 600**, the one role that contradicted the new policy; and `.rux-ui-header__badge-count` **600 → 500** at 10px, ending a one-job-two-answers split against `--rux-badge-font-weight`. `h6` keeps its explicit 400 as a label. **Blast radius measured in a live browser, not reasoned about — but on the *visible* DOM of `index.html` only, which this row did not say. Corrected by step 21: 12 elements move across the four pages, 3 of them visible on load.** As measured here: on `index.html` exactly **one visible element re-rendered** — the badge count — because 37 of 43 headings already read a role at 600 and the remaining 6 are pinned at component level (`.rux-alert__title`, `.components-app__button-example strong`, `.driver-app__workload-through strong`, `.sched-trip-itinerary__idle-day strong`). The claim that *every* `<strong>` on the page is pinned was **wrong**: `.flip-seven__turn-status strong` and `.flip-seven__messages strong` pin no weight and both moved. That the app had locally pinned its way around D4 everywhere is why the two regimes never looked broken. Confirmed the defaults did change by injecting classless probes into the live document: a bare `<h2>` now resolves 30px/600 and a bare `<strong>` 500. **Eyeballed on `index.html` in both themes** — but only `index.html`, which is the gap step 21 closes; `gallery.html` measured byte-identical in distribution before and after (400×74, 500×13, 600×16). 331/331 green — the suite pins role→rung references and does not assert this one. Cache-busters bumped (`tools/check-cache-busters.sh --fix`), without which a warm browser keeps the old CSS. Deliberately **did not** unpin the six component overrides: a component using `<strong>` as a label and choosing 400 is a mapping decision it owns, and reversing four of them is not what "settle the weight policy" authorizes. Deliberately **did not** touch the element *size* scale — `h2` at 30px still has no role — that is step 7, which now turns on **Q6** alone. Deliberately **did not** mint a 550 rung to match Geist's Strong exactly. Contract 1.2.1 → **1.3.0**. |
| 7 | Reconcile element scale with role scale (D11) | **done · Class A + B** | **Closes D11 and answers it 1:1.** The catalog's Heading family publishes **exactly six rungs** — 14/20 · 16/24 · 20/26 · 24/32 · 32/40 · 40/48 — and HTML has exactly six heading levels. The element ladder now maps onto them one for one, with tracking from 2.13's curve at every rung. **Measured after, on injected bare probes so the element defaults are read rather than a class override:** `h1` **40/48/600 −0.06em**, `h2` **32/40/600 −0.04**, `h3` **24/32/600 −0.04**, `h4` **20/26/600 −0.02**, `h5` **16/24/600 −0.02**, `h6` **14/20/600 −0.02**, `p` **14/20/400 0**. Page overflow 0.

**This row was stale and is corrected here.** It said *"`h2` at 30px has no role"*; `h2` has been **32** since step 6 moved the element defaults, and 32/40 is a catalog rung — the dilemma it posed (mint a 30 rung or collide with `h3`) had already dissolved. It also said the step turns on **Q3**, which was answered long ago.

**Three rungs published, all the catalog's own:** `text-heading-32` (32/40), `text-heading-20` (20/26), `text-heading-14` (14/20). Each has a named consumer per §7.3 — the element default that reads it. **One primitive minted:** `--rux-line-height-26`, because the catalog's Heading rung at 20 is **20/26** and this ladder had no 26. That is adopting a catalog value, not inventing one.

**Blast radius: two definitional changes, both inert, and it was measured rather than assumed.** `h2`, `h3` and `h5` were already at their rung and merely stop restating the recipe (rule 1.2) — **no-ops**. `h4` moves **18/28 → 20/26**, and 18 was never a Heading rung at all; **all six `<h4>` in the repository carry a class that overrides the element default** (five `.rux-card__title`, one `.rux-text-heading-16`), so nothing renders it. `h6` moves **12/16/400 secondary → 14/20/600**, reversing step 6's decision to style it as a Label; `<h6>` has **zero occurrences**, so nothing renders that either. **D11 existed precisely because the element scale had no consumers to keep it honest** — which is also why closing it is safe.

**One stale comment corrected in passing (D3 class):** the note above `p` still said it "keeps the 24px leading rather than the base's 20 … the one place the base's size and leading are not a matched pair". Step 41 put `p` on copy-14's own leading, so it **is** a matched pair and the exception it named no longer exists. 337/337 green. Contract 4.0.1 → **4.1.0**. |
| 8 | Settle the base size (Q1) and the prose leading (Q2) | **done · Class B** | The widest-blast-radius step in the log. Changes `body`, every element default, and both measures. Do not start before Q1 and Q2 are answered here. **Known cost, measured in advance:** the suite asserts role→rung *references*, not px, so a Class B value change survives it — but repointing a role breaks it. `tests/driver-assignment-card.test.mjs` pins `var(--rux-size-md)` and `var(--rux-size-2xl)` on four selectors, and `tests/badges.test.mjs` pins `--rux-badge-font-size`. Budget for updating them; they are doing their job. **Outcome:** `body` **16/24 → 14/20**. Blast radius measured in a live browser before and after rather than reasoned about — of 671 visible elements on `index.html`, only 5 kinds rendered at 16px and 3 of those set it explicitly (`.rux-ui-header__title`, `.rux-card__title`, `.rux-icon`, which resolves `--_icon-size` and was the one that could have silently shrunk 51 icons). **Two elements actually moved**: `.rux-profile-picker__name` (7 instances) and `.rux-skip-link`, both 16/24 → 14/20, plus bare `<p>` and `.rux-status-text` in the gallery. Verified after the change: `body` 14/20, the three explicit titles unchanged at 16/24, and **type identical in both themes** — as it must be, since no type token is theme-scoped. The predicted test breakage did **not** occur: the suite pins role→rung references and no role was repointed. 331/331 green. |
| 9 | Give `--rux-text-faint` a real third value, or collapse to two tiers (D5) | **done** | **Q4 answered: collapse to two — executed 2026-08-21 under explicit authorization.** Both names are gone from both theme blocks. `--rux-text-default` and `--rux-text-heading` stay published: they are the other two superseded names, and this step did not touch them. **The grep protocol corrected this step's own recorded cost.** The proposal said `--rux-text-muted` had **six consumers**; the six are **two definitions and four rationale comments**, and `var(--rux-text-muted)` appears **nowhere in the repository**. Nothing repointed, because nothing consumed it — the count that made muted look like the riskier of the two names was counting occurrences, not consumers. Both had zero. **Renders identically, and now provably so:** no rule read either token, so no rule changed what it resolves to. **Class C regardless** — two published names disappeared, and a consumer on an older tag loses them at upgrade; that migration is step 32. **What else moved, because a retired name may not be left cited as though it were live:** four rationale comments (`menu.css`, `form.css`, `trip-bar.css` ×2) now name `--rux-text-secondary` and mark the retirement; `README.md`'s TripBoard migration table pointed `--rux-text-2` at a token that no longer exists, and its Geist mapping paragraph claimed all four superseded names stay published — false as of this step, and README is a pointer, so it is corrected here (CLAUDE.md § One home per rule). `menu.css`'s comment was **stale twice over**: it also claimed a color for `.rux-menu__header`, a rule that sets padding only. **Enforcement:** `tests/text-roles.test.mjs` now splits `DEPRECATED` (still published, still asserted present) from `RETIRED` (must not be defined again) and adds a test for the second, so re-adding either as a convenience alias fails. Suite 333 → 334, green. **Deliberately not done: keeping them as forwarding aliases.** That is precisely what let the defect live — an alias resolving to secondary renders a stale consumer reference plausibly instead of failing its name check, which is how three documented tiers shipped as two without anyone noticing. |
| 10 | Fix inline code sizing (D6) | **done · Class B** | Unblocked by step 8. `code, kbd, samp, pre` **0.92em → `--rux-size-xs`** (12px, one rung below the 14px base per rule 2.4). The proportional shrink had produced 12.88px at every call site. `kbd`'s own `0.8em` override was removed rather than re-tokenized — it was a second proportional shrink stacked on the first, and nothing distinguishes a `kbd` from a `code` at this scale. **The portable tier now contains zero raw type values.** |
| 11 | Resolve the font-feature-settings mismatch (D9) | **done · Class B** | **Closes D9 and the last open step.** `html` carried `font-feature-settings: "cv11", "ss03"` under the comment *"Inter alt 1, alt g"* — a setting inherited from a previous typeface and never re-checked against Geist. **Both removed.**

**`cv11` is inert, confirmed two ways.** Geist publishes **no character-variant features at all**; its documented set is `ss01`–`ss09` plus numerics and ligature control. And empirically it produced **no metric change** at 400px — against a `tnum` control that *did* change, every digit equalising from proportional widths to 240.008px, which proves the measurement was sensitive rather than merely quiet.

**`ss03` is real, and is not what the comment believed.** Geist's `ss03` is **rounder punctuation**. The tag matching the recorded intent — alternate `a` and `g` — is **`ss01`**. So the declaration was applying a stylistic set nobody chose while failing to apply the one that was meant. Removed rather than corrected to `ss01`: restoring an inherited preference for single-storey alternates is a **design decision** for this typeface, not a bug fix, and this step is explicitly the kind that "is not a design decision". `ss01` is named here so the choice is available deliberately later.

**Verification limits, stated rather than glossed.** Metric comparison cannot detect a same-width substitution, and stylistic alternates are same-width by design — so it can prove `cv11` inert only in combination with the documentation, and it can prove **nothing** about `ss03`. Two attempts at pixel comparison failed: an SVG `foreignObject` rasterisation cannot load a webfont, and a side-by-side on-page render returned a stale screenshot frame twice. **Whether `ss03` was visibly rounding this application's punctuation is therefore unconfirmed** — the case for removal rests on intent and documentation, not on a measured delta.

**States needing an eyeball** (§2.3): any dense punctuation — the trip bar's time strings, the itinerary, the maintenance change log — in both themes. If nothing looks different, `ss03` was doing nothing visible and the removal costs nothing; if punctuation looks slightly sharper, that is the accident being undone.

**Verified as safe in a live browser:** `font-feature-settings` resolves to `normal` on both `html` and `body`, and **84 elements still render tabular figures** — those come from `font-variant-numeric`, an independent property this change does not touch. Page overflow 0. 337/337 green. Contract 4.1.0 → **4.2.0**. |
| 12 | Give `label-control` its distinguishing leading, or retire it (D1) | **done** | Q2 answered 20px, so Copy and Label converge exactly as anticipated. **Neither branch taken.** Retiring `label-control` was the option this step named, and it was rejected: three components read it, it names a different intent from body copy, and it would diverge the moment a prose surface declares its own base — so deleting it would destroy a distinction that is real but currently unexpressed. Faking a difference by nudging its leading off-grid was equally rejected. Rule 2.6 now records the convergence instead. **No Class C removal**, so nothing was proposed. |
| 13 | Inventory surface demand; record §7 and revise Q1 | **done** | Measured, not assumed: every figure in §7.2 was counted from source. Found four surfaces where the doc assumed two, and four inter-document contradictions (§7.4). Deliberately **did not** resolve X1–X4 — three of the four are `guide-markup.md`'s to settle, not this document's, and X1 is a direct conflict between two specs that needs an owner before it needs a fix. Deliberately **did not** delete the under-used rungs: a system ships whole ladders. |
| 14 | Resolve X1: inline markers take the step's own size and weight | **done** | Decided by the precedence rule above. The finding is that the *type system* was wrong and `guide-markup.md` §2.2 was right, so nothing downstream changes — the 13px chip and weight-500 value are dropped from the proposal before adoption. Deliberately **did not** touch X2/X3: those are colour mappings, out of scope per the precedence note. |
| 15 | Establish the evolution contract (§8) and stamp version 1.0.0 | **done** | Written against the real gap: `docs/design-system-distribution.md` §4's three gates are all name-based, so they catch removals and renames and are **blind to a changed value**. Class B exists to cover exactly that blind spot. Deliberately **did not** invent a new automated gate — the honest mechanism today is the version stamp plus a named visual check, and claiming enforcement that does not exist would be worse than naming the gap. |
| 16 | **Consolidate** — strip duplicated type rules elsewhere; convert them to pointers | **done** | The closing step: this document is not canonical while a second statement of the same rule exists. Measured scope: `README.md` § Visual Foundations carries **81 hardcoded values** and ships to consumers — the vendored copy at `v0.1.3` carries all 81. Also in scope: the `rux-design` skill's design rules, the type-bearing prose in `docs/layout-composition.md`, and any `tokens.css` comment that states a MUST rather than explaining a value. **Was blocked on Q1–Q6**: converting a section to a pointer before the rule it points at is settled deletes the only statement of it. **The block was evaluated at execution time rather than assumed, and did not bite** — Q6 governs a responsive story, and no prose outside this document ever stated one. Before stripping anything, each rule was checked to exist here first: §1 states the typefaces and the no-fourth-family rule, and 2.11, 2.12 and §3.2 state the Button weight. Nothing became the only statement of itself.

**This row's scope was overstated and is corrected here.** The *"81 hardcoded values"* figure counted **all** of `README.md` § Visual Foundations. Most of those are colour and spacing, which `color.md` and `layout.md` will own — **this document cannot consolidate rules it does not own**, and doing so would have moved values into a section that has no authority over them. The type-bearing subset was **six bullets and one MUST**.

**Two of the six had gone stale, which is the one-home failure observed rather than hypothesized.** § Typography still described tracking as flat `-0.02em` on display sizes when rule 2.13 puts Heading on a **curve**; and it still published *"wide on overlines (`0.04em`)"*, a rule steps 40 and 47 retired outright. A reader following `README.md` would have letter-spaced an overline this system no longer letter-spaces. **The MUST was worse:** § Buttons instructed *"use `--rux-weight-400` … for button labels"*, which step 41 superseded when it adopted the Button family at **500**. That is a second statement of a rule actively contradicting the first, in the file a new contributor reads before any other.

**Both are now pointers** — the section names what is ruled and where, and states no values. Each carries a short note recording what it used to say and which step superseded it, so the correction is visible rather than silent.

**Three of the four scope items needed no work, verified rather than assumed:** the `rux-design` skill was already converted to a pointer by **step 17**; `docs/layout-composition.md`'s values are all **spacing** (the 16px rhythm), which is `layout.md`'s to consolidate, not this document's; and the single `MUST` in `tokens.css` comments is about layout, not type.

**Residue, stated so it is not mistaken for completeness:** six `--rux-size-*` / `--rux-weight-*` references remain in README's **component API tables** — button sizing, field label, help and error text. Those document a component's own tokens rather than restating a type rule, so they belong to a components document. Recorded rather than swept, because sweeping them would put component API in a type document. 337/337 green. Contract 4.0.0 → **4.0.1**. |
| 20 | Put the trip-bar bus label on the scale (D13) | **done** | **Executed as step 30**, on the footing Q7 gave it rather than the one this row proposed — the original premise is left below because it is the reason the step could not run. **Was `[ready]`; attempted, and it did not execute as written. Turned on Q7.** The premise — "`--rux-size-xxs` (10px) is the rung the clamp already sits nearest at its measured 10.2px" — was measured in the running app, which sits at the **XS** density tier. The token is not one value: `--sched-trip-bar-bus-label-font-size` tracks `--sched-trip-bar-row-font-size` × 0.85, and the trip-bar size control drives that across three tiers, so it resolves **9px (XXS) / 10.2px (XS) / 11.9px (SM)**. Pinning it to `--rux-size-xxs` collapses all three to 10px, which (a) reinstates the exact regression the comment above the declaration records as fixed — XXS and XS resolving pixel-identical, so two of the three settings produce the same pill — and (b) puts the XXS pill's text at 10px against 10px row text, when the pill MUST stay quieter than the row beside it. **Verified by applying it and running the suite, not by reasoning:** `tests/trip-bar-size.test.mjs` fails at load — it asserts the token *is* a `clamp()`, then that the pill font differs at all three tiers and rises monotonically with the row text. Reverted; no CSS changed. **The blocking fact:** `--rux-size-xxs` (10px) is the *smallest rung on the scale*, and the XXS tier needs type below its own 10px row text. There is nowhere on the scale for it to go. So D13 cannot be closed by "put it on the scale" — the scale does not reach. That is Q7. Deliberately **did not** execute it anyway and update the test: the test encodes a shipped design fix and three assertions about what the control must do, and a step that rewrites its own verification to pass is not conformance. Deliberately **did not** pick a branch for Q7 here — minting a sub-10px rung is Class A on shared vocabulary and outside what "put this label on the scale" authorizes. **Worth naming:** this is the same defect as the one step 21 corrects in step 6 — a value measured in one state and recorded as though it covered every state. Both were written in the same commit. |
| 19 | Extract the shared mechanism to `README.md`; add a derived Status block | **done** | Class A. §8 was 68 lines of machinery of which five mentioned type — generic, and guaranteed to be duplicated the moment a second foundation document landed. It now lives in `README.md` §2 and §8 is a pointer. Answers the "should each document carry a todo list" question: **no** — the amendment log already is one, and a second statement of status drifts. What was missing was a *glance*, so each document gains a Status block derived from its log, rolled up in `README.md` §1, with `tests/foundations-contract.test.mjs` failing when the two disagree. Deliberately **did not** add a TODO or status file, and **did not** fold `../motion.md` in — that is its own decision. |
| 17 | Convert competing rule statements to authority pointers | **done** | Class A. The problem step 16 solves is duplication; this solves *precedence* now, without waiting on Q1–Q6. `README.md` § Visual Foundations, the `rux-design` skill's design rules, and `docs/audit/design-system-audit.md` §5 each gained a note naming `docs/foundations/` as canonical. Deliberately **stripped nothing** — the 81 values stay until step 16, because deleting a rule before its replacement is settled loses it. Also corrected two stale comments in `colors_and_type.css`: the heading block said "semibold by default" over a rule setting 400 (D3), and the `font-feature-settings` line now flags that its axes are Inter's while the loaded face is Geist (D9), without changing the declaration — that half is Class B and needs verification first. |
| 18 | Pair the notifications title's leading with its size (rule 2.2) | **done · Class B** | `.rux-notifications__item-title` held the only unitless leading on real text in the portable tier. **Before 18.9px** (14 × 1.35 — fractional and off the 4px grid), **after 20px** (`--rux-line-height-sm`, the pair for `--rux-size-sm`). Safe ahead of Q1/Q2 because the element pins `--rux-size-sm` explicitly, so it follows whatever that rung's pair becomes. **Verified by reading the constraint chain, not by rendering:** nothing between `.rux-notifications__item-title` and the menu root pins a height, sets `overflow: hidden`, or clamps lines — the only overflow control is the menu's own `max-height: 70vh; overflow-y: auto`, which absorbs the growth by scrolling. A two-line title therefore grows its row ~2.2px and nothing clips. A visual pass was **not** possible in this environment (`python3 -m http.server` fails under the sandbox at `os.getcwd()`), so the theme eyeball is still owed if wanted; the token is theme-independent, so it is a low-value check. Contract version 1.0.0 → 1.1.0. Applying this exposed that §8.1's Class B definition was too narrow — it named only token-value changes, and this is a rule moving from a literal to a token — so the definition was widened in the same step. |
| 21 | Correct step 6's blast-radius record (D3, D4 rows; rule 2.11 placement) | **done** | Class A, and **patch 1.3.0 → 1.3.1** — wording, evidence and a corrected citation; no token, rule, or value moves, and nothing re-renders. Step 6 measured its Class B blast radius on the *visible* DOM of `index.html` and recorded the result as though it covered the change: "exactly one element re-rendered" and "*every* `<strong>` on the page" pinned. Re-measured by A/B — injecting the pre-step-6 element defaults at equal specificity and diffing computed weights on all four pages — **12 elements move, 3 visible on load**. `index.html` **8**: `.rux-ui-header__badge-count` ×3 600→500 (one visible), the Flip Seven `h3`s *Take a seat* / *Players* / *Scoreboard* 400→600, `.flip-seven__turn-status strong` 400→500, `.sched-scope-request__dialog-title` 400→600. `driver.html` **2**: `.driver-share-status__title` 400→600 (**visible**), `.driver-share-dialog__title` 400→600. `request.html` **1**: `.trip-request__success-title` 400→600. `maintenance.html` **1**: the unclassed `h1` in `.maintenance-share__status` 400→600 (**visible**). `gallery.html` moves nothing, as step 6 said. **Every one of these is what rule 2.11 asks for, so nothing is reverted** — what was defective is the record. §2.3 requires a Class B step to name *the states that need an eyeball*, and a list that omits three pages defeats the review the class exists to trigger. **Eyeball now done for the two visible states:** `driver.html` and `maintenance.html` both pin `color-scheme: dark` and have no light theme, so "both themes" does not apply to either — recorded because a missing check and an inapplicable one read the same in a log. At 375px the `maintenance.html` `h1` wraps to two lines at 351px inside a 375px viewport with **no horizontal overflow** (`scrollWidth` 375 = `clientWidth` 375); it is tight, and 600 makes the same string wider than 400 did. That is **evidence for Q6**, not a defect of this step. **Still owed an eyeball:** the six states that need interaction to reach — the Flip Seven view, the scope-request dialog, the driver decline dialog, and the request success card. Measured, not seen. **Still unmeasured:** `.maintenance-trip :is(strong, span, small)` sets size only, so those render 500 once a real schedule loads; the page was in its invalid-link state. Also corrected here: the **D3** row said the comment "now states 400" after step 6 had moved it to 600, and called D4 "still open" one row above marking it fixed; **step 2**'s row quoted comment text step 6 had already deleted. Both went stale inside step 6's own commit — the same defect class as D3 itself. Rule **2.11** moved to sit after 2.10 instead of between 2.9 and 2.10. Deliberately **did not** rewrite step 6 to read as though it had been right: the original claim stays with the correction beside it, because a log that quietly edits its own history is worth less than one that shows the correction. Deliberately **did not** touch any CSS — every value step 6 landed is correct. |
| 22 | Make the type utilities apply their roles (D12) | **done · Class B** | **The branch chosen was "utilities adopt their roles", not "rename them to what they are"** — the second is Class C and is now step 31, staged behind this one rather than bundled into it. **Four utilities completed, none renamed.** `.rux-u-caption` and `.rux-u-hint` are **split out of the field-component declarations they shared** and now read `--rux-text-caption-*`: the utility named "caption" was the one utility not using the caption role, which is D12's more serious half. The two token sets **resolve identically** — 12px, 400, 16px leading, secondary — so this changes nothing rendered and everything about which token owns the answer. A component reading its own component tokens is correct; a *utility* doing it is the defect. `.rux-u-label` gains tracking and `.rux-u-subtitle` gains weight and tracking, both of which already resolved to the stated values by inheritance — declaring them is what stops the next context from changing them. **Measured on `index.html` after:** `.rux-u-caption` ×25 at 12/16/400, `.rux-u-label` ×24 at 14/20/400, `.rux-u-subtitle` and `.rux-card__subtitle` at 14/20/400 — **all unchanged from before**, as predicted. **One change is unverified and named as such:** `.rux-u-hint` had no leading at all and inherited its context's, so it gains 16px — but no `.rux-u-hint` renders on any page in the current data, so this is reasoned from the cascade, not seen. **Noticed and deliberately left:** `.rux-field__help` renders 12px text on a **24px** inherited leading, and `.rux-field__label` resolves 12/12 with wide tracking from a rule outside these declarations. Both are components, not utilities, and both predate this step — D14's pattern surviving in the component tier. They need their own row, not a quiet fix inside D12's. **Original note retained:** Added by step 21 because D12 had no step. It was surfaced *by* step 5, described there as "the more serious half of D10", and then never given a row — so the log, which `README.md` §3 calls this document's todo list, silently dropped a defect it had itself found. The work: five of seven Tier 2 utilities apply a partial recipe, and `.rux-u-caption` and `.rux-u-hint` bypass the type roles entirely for `--rux-field-label-*` — so the utility named "caption" does not read `--rux-text-caption-*`. **Needs a decision before it can execute**, which is why it lands `[open]` rather than `[ready]`: completing a partial recipe is Class B on every call site of that utility, and repointing `.rux-u-caption` at its own role changes what renders wherever it is used. Whether the fix is *utilities adopt their roles* or *the two misnamed ones are renamed to what they actually are* is the open question — the second branch is Class C. Deliberately **not** folded into step 16: consolidation strips duplicated rule *statements*, and this is a defect in what the utilities *resolve to*. |
| 23 | Name and land the off-ladder rungs | **done · superseded by step 50** | **Reclassified 2026-08-22 by step 62, not re-executed.** This row was deferred on the grounds that none of the three rungs had a consumer — *"no role sits at 13, and no copy role sits at 20 or 24."* **Step 50 landed all three** when it published the whole catalog: `--rux-size-13`, `--rux-line-height-18` and `--rux-line-height-36` exist, and so do `copy-13`, `copy-20` and `copy-24`, the roles the note said did not. The work happened; the row was never updated. Original note follows, kept because it was accurate when written. | **Downgraded from [open], and Q8 is no longer what blocks it.** Checked the consumer question before answering the naming one, and **none of the three rungs has a consumer today**: no role sits at 13, and no *copy* role sits at 20 or 24, so `copy-13`'s 18 and `copy-20`/`copy-24`'s 36 are leadings for roles that do not exist. §7.3's rule — a new rung needs a named consumer before it is added — is the same one that deferred steps 3 and 4 and that step 26 applied again to `--rux-line-height-xl`. Landing three primitives nothing reads, under names that are Class C to undo, is precisely what that rule exists to prevent. **Lands with the role that adopts it**, at which point Q8 is answered for one rung against a real call site rather than for three in the abstract. Deliberately **did not** answer Q8 first and land them anyway. Original note retained: **Turns on Q8.** Rule 2.12 needs three values the t-shirt ladder has no slot for: the **13px size** (between `xs` 12 and `sm` 14) and the **18** and **36** leadings. Everything else the catalog needs is reachable by moving an existing rung (step 24). Class A once named — additive, nothing resolves differently. Left **[open]** rather than [ready] precisely because naming is the whole of it: inventing `--rux-size-xs-plus` in passing would put a name in the vendored surface that no one chose, and a primitive name is Class C to undo. |
| 24 | Move the ladder rungs onto the catalog | **done · Class B** | **Three of the four planned moves landed, before → after:** `--rux-size-3xl` **30 → 32px**, `--rux-size-4xl` **36 → 40px**, `--rux-line-height-4xl` **40 → 48px**. No name moved, so nothing is Class C and 30/36 are not "retired" — they simply cease to be what the names resolve to. **D11's cause closes**: `h2` and `heading-page` now sit on rungs the catalog publishes. **Blast radius A/B-measured on all five pages** by injecting the old token values at `:root` and diffing every element's computed size and leading: `index.html` **0**, `gallery.html` **0**, `request.html` **0**, `driver.html` **2**, `maintenance.html` **1**. The only visible move is `maintenance.html`'s status `h1`, **36/40 → 40/48**, eyeballed at desktop and at 375px, where it wraps to two lines at 351px inside a 375px viewport with no horizontal overflow — the same 351px it occupied at 36px, so the container absorbed it. Both pages pin `color-scheme: dark`, so "both themes" does not apply (as step 21 recorded). Two consumers were **not** exercised by the current data — `.sched-trip-envelope__day` (36 → 40) and `.driver-share__title` (leading 40 → 48, its size is already a `clamp(36px, 7vw, 40px)`) — and are named here as owed. **The fourth move was dropped, deliberately:** `--rux-line-height-xl` **28 → 26** was in the plan and has **zero consumers** — the grep found only its own definition. Moving a token nothing reads to an off-grid value (26 is not on the 4px grid) ahead of the role that wants it is exactly what §7.3 forbids, and it would have needed a named 2.10 exception minted for no one. It lands with step 26, beside `heading-20`. **Surfaced D14 and fixed two instances of it**, because this step would otherwise have made one worse: `.driver-share-status__title` and `.driver-share-dialog__title` set `--rux-size-2xl` (24px) and inherited the `h1`/`h2` element leading of 40px; the 4xl move would have taken the first to **24/48**. Both now pair at **24/32** (`--rux-line-height-2xl`). Cache-busters bumped (6 references). 331/331 green. Contract 1.4.0 → **1.5.0**. |
| 25 | Roles own their leading | **done · no-op** | **Audited all eight roles against their family in rule 2.12 and every one already carried its family's size and leading**, so this step moved nothing and needed no Class B treatment. Read from `tokens.css`, not assumed: `heading-section` 24/32 ✓, `heading-panel` 16/24 ✓, `text-lead` 16/24 ✓ (copy@16), `text-body` 14/20 ✓, `text-caption` 12/16 ✓ (label@12), `label-control` 14/20 ✓, `label-eyebrow` 12/16 ✓; `heading-page` 40/48 ✓ as of step 24. **The reason is that the Label/Copy divergence appears at 16 and 18 in the Label family, and no published role sits there** — `heading-panel` is the only 16px role and it is a heading, which takes 24 either way. The rule was still necessary: it is what stops the *next* role from being wrong, and D1's convergence is now explained rather than merely recorded. Deliberately **not** marked `[ready]`-then-skipped: a step whose audit found nothing is a result, and leaving it open would mean auditing again. Dependency on step 23 never materialised, because the 18 and 36 leadings are needed by roles that do not exist yet. |
| 26 | Classify the roles into the four families | **done · Class A** | Documentation only in the end, because step 25's audit had already established that no metric disagreed: §3.2 gains a **Family** column and every published role is assigned — `heading-page`/`-section`/`-panel` to **heading**, `text-lead` and `text-body` to **copy**, `text-caption`, `label-control` and `label-eyebrow` to **label**. The one that is not obvious is `text-caption`: it is named "text" but is 12/16 single-line, so it is **label**, and its name is now the misleading part. Renaming the roles to `heading-40`/`copy-16` was considered and **rejected** — it breaks every vendored consumer for a naming preference, and 2.12 governs which recipe a role takes, not what it is called. **No role is in the button family**, because none exists; buttons read `--rux-button-*` component tokens. That gap is real and is not invented here. Also deliberately **not** done: `--rux-line-height-xl` **28 → 26**, deferred here from step 24 and deferred again — it still has no consumer, since no role sits at 20px. It lands with the first `heading-20`, and until then `lg`/`xl` stay a recorded duplicate. |
| 27 | Apply the tracking curve | **done · Class B** | Executes rule 2.13, **closes D7** and with it the long-deferred step 3. Two rungs added (Class A half): `--rux-tracking-tighter` **−0.04em** and `--rux-tracking-tightest` **−0.06em**, named to the ladder's existing convention so no naming question arises — unlike Q8, `tight`/`tighter`/`tightest` has one obvious answer. **Moved, before → after:** `--rux-heading-page-tracking` **−0.02em → −0.06em**; `--rux-heading-section-tracking` **−0.02em → −0.04em**; and each heading level now states its own tracking, because one shared value cannot serve h1 at 40 and h5 at 16 — `h2` and `h3` **−0.02em → −0.04em**, `h4` and `h5` **0 → −0.02em** (they were off the curve at `normal`). **A/B-measured on every page** by replaying the pre-step cascade at matched specificity: `index.html` **8** (all h2/h3 −0.02 → −0.04, **none visible**), `gallery.html` **0**, `request.html` **0**, `maintenance.html` **1 visible** — the 40px status `h1`, −0.8px → −2.4px, which **narrowed the line from 240px to 222px** and so relieves rather than worsens the 375px pressure recorded under Q6 — and `driver.html` **3**. **The first A/B attempt was wrong and is recorded as such:** it reverted with `!important`, which stomped component-level tracking the real prior CSS never touched, and reported 14 moves including an `h3` going *positive*. Replayed at matched specificity the true count was 8. A revert probe MUST match the specificity of what it replaces. **Caught a regression this step introduced, in the same defect class as step 24's:** two `h1` elements on `driver.html` override h1's *size* but not its tracking, so putting the element default on the 40px rung leaked −0.06em onto an 18px and a 24px heading. `.driver-share-status__title` and `.driver-share-dialog__title` are pinned to `tighter` (−0.04em, their own 24px rung) and `.driver-share-header__label` to `tight`, which **preserves its existing render** — whether it is heading-18 or `label-18` (which would track 0) is step 26's classification question for app-tier elements, and both readings agree it is not −0.06em. Re-measured after: driver.html shows **0** element-default leakage. Eyeballed on `maintenance.html` and `driver.html`, both dark-only. 331/331 green. Cache-busters bumped. Contract 1.5.0 → **1.6.0**. |
| 29 | Pair the remaining overridden headings with their own leading (D14) | **done · Class B** | **Closes D14**, and is the first real exercise of rule 2.12's selection rule on live objects — which was half the point of running it now: seven elements is a cheap place to find out whether the four questions actually decide anything. They did; only two needed a human call. **Eight declarations, before → after.** *Portable tier:* the eyebrow block (`.rux-u-eyebrow`, `.rux-u-section-label`, `.rux-menu__header`) gains the role's **16px** leading and `.rux-u-section-label` loses `line-height: 1` — unitless on real text, a flat 2.2 defect; `.rux-u-label`/`.rux-preferences__heading`/`.rux-preferences__label` gain `--rux-label-control-line-height`, so `.rux-preferences__heading` goes **14/40 → 14/20** (it is an `h2`, and three of the four label axes were already there — the fourth was simply missing). *App tier:* `.sched-scope-request__dialog-title` **24/40 → 24/32** (heading@24); `.components-app__button-sections h3` **14/32 → 14/20** (label@14); `.flip-seven__scoreboard … h3` **16/32 → 16/24** (heading@16); `.driver-assignment-card__date-range` **16/19.2 → 16/20**, replacing a unitless `1.2`. *Specimen:* `gallery.html`'s ten section headers **12/40 → 12/16** and **weight 600 → 400**, now reading `--rux-label-eyebrow-*` whole instead of restating four of its axes. **Two calls were the author's, not derived:** the gallery headers adopting the eyebrow's 400 rather than keeping 600 (they are the most visible change here — ten headers, all above the fold), and `.driver-assignment-card__date-range` classed **label** rather than heading, on the grounds that it is grey, one line, never wraps, and sets tabular figures. **Verified by re-running the audit that found them:** `index.html`, `driver.html` and `gallery.html` each report **0 unpaired and 0 fractional** headings, against 6, 3 and 10 before. Eyeballed on `gallery.html` and `index.html`. Deliberately **did not** take D12's other axes while in the same rules — `.rux-u-label` still applies no tracking and `.rux-u-caption` still reads `--rux-field-label-*` — because "which recipe should this utility read" is step 22's question and one of its branches is Class C. Only the leading axis, which is D14's, was touched. 331/331 green. Contract 1.6.2 → **1.7.0**. |
| 30 | Put the small end on the catalog and stop deriving the trip-bar pill (Q7, D13) | **done · Class B** | **Four parts.** **(1)** `--rux-size-xxs` **10px → 11px** — Geist's Badge Small rung. Four consumers, no rename. **Verified free before committing to it:** the trip bar's row height is `line-height × row-count` and font size appears nowhere in that math, so the densest tier loses no rows; and the XXS row already clipped 1px at 10px and clips the same 1px at 11px, because a 12px box and a 13px glyph box are what produce it either way. **(2)** Rule **2.14** and `--rux-tracking-dense` (+0.02em), applied to the four sub-14 consumers: the header badge count, the header's second 11px element, the side-nav count, and the XXS row (whose `letter-spacing: 0` became `--sched-trip-bar-row-tracking` so a tier can set it). **(3)** Both trip-bar `clamp()`s deleted. Before, the pill's size, leading and box each came from a *different* expression — `row-font × 0.85`, `line-height: 1`, and `row-line-height − 4px` — so none landed on the scale, two resolved fractional (**10.2px**, **11.9px**), and the box was computed from a term the text never saw, which is why it clipped its own glyphs. After, three hand-set specs: **XXS 11/12 in a 12px box · XS 11/12 in a 12px box · SM 12/16 in a 16px box**, every value a named rung. **(4)** The pill weight moves **600 → 500** — a filled chip carrying a bus number is a badge, and rule 2.11 puts badges at 500; this is the same one-job-two-answers split step 6 closed on `.rux-ui-header__badge-count`, found in the other half of the system. At XXS the pill now matches the row's 11px and separates by that weight plus its fill, per rule 2.3. **A cascade bug caught by measuring rather than by reading:** the three new pill tokens were first declared on `.sched-trip-bar`, and the SM tier silently did not apply — a custom property resolves from the *nearest* ancestor that declares it, and `.sched-trip-bar` is a descendant of the `.sched-scheduler--trip-bar-size-*` class trying to override it. The row tokens never had this problem only because they were already declared further up. Moved to `scheduler/css/tokens.css`; **a token a tier is meant to override MUST be declared above that tier's class in the ancestor chain**, and that is now stated in the code beside it. **`tests/trip-bar-size.test.mjs` rewritten**, deliberately and not to make this pass: its parser read `clamp()` and its assertions encoded "the pill is strictly smaller at every tier", which is the rule part (4) supersedes. The replacement asserts the *new* contract and is stricter — no `clamp`/`calc` in any of the three declarations, box and leading must agree, the pill may equal the row's size only if its weight differs, and sub-14 rows must carry the dense rung. 4 tests → 6, 333/333 green. **Known and not fixed:** 11px text in a 12px box clips ~1px at XXS and XS. The row itself has always done this at every tier; it is the box being 12 where the glyph box is 13, which is a container question and belongs to `spacing.md` under the precedence that type is settled first. Named here so it is not rediscovered as new. Contract 1.8.0 → **1.9.0**. |
| 31 | Rename the type classes and the primitive ladder to the Geist shape, keeping the `rux-` prefix | **done · Class C** | **Executed 2026-08-21 under explicit authorization, with Q8 folded in.** Primitives are named by the px they resolve to, roles by `text-{family}-{size}`, and the three utilities that apply exactly one role take that role's name. The full map is the **Was column in §3.2**; §3.1 and §3.3 carry the other two tiers. **No value moved** — this step changes names and only names, which is why step 22 completed the recipes *in place* first. If something looks wrong after this step, it is not this step. **Grep protocol, before:** 307 CSS · 3 HTML · 11 test · 39 doc occurrences of the primitive ladder; 134 CSS · 4 test · 16 doc of the role tokens; 16 CSS · 18 HTML · 10 JS · 41 doc of the utilities — ≈596 in all. **After:** 292 primitive reads and 143 role reads repointed, 15 markup and JS class references rewritten, and **zero** old names left outside the alias block and the historical record. **Aliases, not a hard break.** All 18 primitive names, all 40 role names and all three class names stay published for one release, as this step's original terms required — a consumer that upgrades finds its names still resolving, and `design-system-distribution.md` §4's middle gate is what tells it to move. `tests/typography-roles.test.mjs` now asserts both halves: every superseded name forwards to its replacement, **and nothing in this repository reads one**. That second test is what makes step 33 a deletion rather than a migration, and it is the lesson of D5 made executable — an alias with an internal consumer never gets removed. **Two merges fell out of the rename.** `--rux-line-height-lg` and `-xl` were both 1.75rem, so nine leading rungs became eight: a ladder cannot name one length twice and still say which rung a role meant. `.rux-u-caption` and `.rux-u-hint` were byte-identical after step 22, so two published names for one recipe became `.rux-text-label-12`. Both merges are why this step retires more names than it renames. **Which classes did not move, and the rule that decides it:** a class takes its role's name only when it applies that role and nothing else. `.rux-u-eyebrow` adds `text-transform`, `.rux-u-section-label` adds a divider, `.rux-u-subtitle` overrides the role's colour — all three describe an object, keep an object name, and are recorded as such in §3.3. **The consumer's own namespace is untouched:** `.sched-scheduler--trip-bar-size-xxs` keeps its t-shirt label, because step 31's scope is the `rux-` vocabulary. **Fixed in passing:** three source comments cited "D12, step 31" for work **step 22** did (`preferences.css`, `form.css`, `card.css`), pointing a reader at an unexecuted rename. **§1's naming contract changed and says so** — Tier 1 was named by intent before this step, and the paragraph that justified two naming schemes now records what numeric naming costs. **Names in §5, §6 and §7 are left as written**: they record what was true when each step ran, and §3.2's Was column is the map. Suite 334 → 336, green. **Deliberately not done:** a hard rename with no alias window (it is the `v0.1.0` incident by design); renaming the tracking ladder, which is an em ratio with no px to name it by; and renaming `.rux-u-mono` / `.rux-u-muted` or the layout utilities, which carry no role. **Needs an eyeball** — nothing should differ, so the check is that nothing does: a card and panel header, a preferences row, a field caption and hint, an eyebrow and a section label, in both themes. |
| 33 | Remove the superseded type names | **done · Class C** | Deletes the 18 primitive aliases, the 40 role aliases and the three class selectors step 31 published, leaving one name per thing. **Was blocked on step 34**, not on a decision: the aliases existed so consumers had somewhere to go, and removing them before they had gone is the rename with the window taken out. **Step 48 released that gate** by taking consumers out of scope, so this step is now executable on its own — the alias window has no one left to protect. **Preconditions, both already enforced:** `tests/typography-roles.test.mjs` proves nothing here reads a superseded role, and the same must be confirmed for the primitives at execution time. **Also in scope:** `docs/portability-audit.md` §4 names `.rux-u-caption`, `.rux-u-hint`, `.rux-u-panel-title` and `.rux-u-label` as a record of an extraction that happened — accurate today, dangling once the selectors go, so it needs a pointer rather than a rewrite. **Executed 2026-08-21.** **Removed: 52 token declarations and 4 class selectors.** 35 role aliases and 17 primitive aliases — 8 `--rux-size-*` and 9 `--rux-line-height-*` t-shirt names. The row's original counts said 40 and 18; steps 45 and 47 had already taken `--rux-size-xxs`, `--rux-label-eyebrow-*` and `--rux-text-label-12-wide-*`, and the two figures reconcile exactly. Classes: `.rux-u-panel-title` (card.css), `.rux-u-label` (preferences.css), `.rux-u-caption` and `.rux-u-hint` (form.css), each of which shared a rule with its shape-named replacement, so removal was deleting a selector line rather than a rule.

**Preconditions re-verified at execution time, as this row required.** No reader of any `--rux-size-*` t-shirt name, any `--rux-line-height-*` t-shirt name, or any superseded role name — all three greps clean before the deletion.

**And the preconditions were still incomplete.** They verified *tokens*; they said nothing about *classes*. `tests/class-resolution.test.mjs` failed the moment the selectors went, on **three live `.rux-u-hint` references in `request.html`** — markup this row had not accounted for and the token greps could not see. That test exists precisely because, as `CLAUDE.md` puts it, the suite does not otherwise read HTML class attributes. It earned its place twice now: once in step 19, once here. The three are on `.rux-text-label-12` and render **12/16/400**, unchanged.

**The alias machinery in `tests/typography-roles.test.mjs` is inverted rather than deleted.** It asserted that every superseded name *forwards* to its replacement — the guarantee an alias window exists to give. With the window gone that assertion is meaningless, so it becomes a **`RETIRED` ratchet**: twelve names that must be **neither defined nor read**, covering this step's seven plus the five steps 45 and 47 retired. An alias with an internal consumer can never be removed, which is how D5 survived five releases; this is the guard against a repeat. Verified to fail when violated. The tokens.css slicing step 41 added is also gone — it existed only to cut the alias block out of the corpus, and there is no block. Suite 338 → **337**.

**`docs/portability-audit.md` §4 got a pointer, not a rewrite**, as this row specified: a note recording that four of the six utilities it names no longer exist and where each went. The paragraph itself is left alone — it records what step 3 did, which is still true of step 3, and a record corrected into the present tense stops being a record.

**Two stale comments corrected in passing (D3 class).** `scheduler-app.css` and `tasks-panel.css` both said *"Type comes from `.rux-u-panel-title` in the markup"* — a claim about live behavior, not history, naming a class that no longer exists. Both now name `.rux-text-heading-16`, which the markup does use.

**Post-edit grep:** every retired token and class is **css 0 · html 0 · js 0** outside comments; the remaining CSS hits are five historical narrative lines and the test hits are the `RETIRED` list itself. Verified live: four sampled retired names report `(undefined)`, page overflow 0. **Class C takes a major** (§2.5). Deliberately **not** folded into step 31: publishing and removing in one step is a hard break wearing a deprecation window's clothes. Contract 3.0.1 → **4.0.0**. |
| 34 | Migrate the vendored consumers onto the shape names | **[withdrawn]** | **Withdrawn 2026-08-22 by the owner.** The vendoring process will be restarted from scratch as the last piece of this programme, and the one other project consuming this system is having every page and document redesigned regardless — so there is no consumer to migrate off the old role names. A migration step whose destination no longer exists is not deferred work, it is finished thinking, and leaving it as `[deferred]` made the Status block claim pending work that will never be done. **Not deleted:** the row records why the rename in step 33 shipped without a migration, which is the question a later reader will actually have. `tests/foundations-contract.test.mjs` gains a `withdrawn` state in the same change. |
| 32 | Migrate the vendored consumers off `--rux-text-muted` / `--rux-text-faint` | **[withdrawn]** | **Withdrawn 2026-08-22 by the owner.** The vendoring process will be restarted from scratch as the last piece of this programme, and the one other project consuming this system is having every page and document redesigned regardless — so there is no consumer to migrate off `--rux-text-muted` / `--rux-text-faint`. A migration step whose destination no longer exists is not deferred work, it is finished thinking, and leaving it as `[deferred]` made the Status block claim pending work that will never be done. **Not deleted:** the row records why the rename in step 31 shipped without a migration, which is the question a later reader will actually have. `tests/foundations-contract.test.mjs` gains a `withdrawn` state in the same change. |
| 28 | Decide the fate of the 10px rung and the 9px pill (Q7, D13) | **done · moot** | **Closed without executing, because Q7's answer removed the question.** This step existed to decide whether `--rux-size-xxs` should be *retired* — Class C, four consumers, a consumer-migration step. Q7 moved the rung from 10px to 11px instead, which is Class B and touches no name, so nothing is removed and no consumer migrates. Recorded rather than deleted: the Class C proposal was real when it was written, and the reason it evaporated — that a rung can be *moved onto* the catalog instead of *removed from* the scale — is the useful part. | **Turns on Q7, reframed by the ramp decision.** The catalog floors at 12: `--rux-size-xxs` (10px) has no Geist counterpart, and the trip-bar's 9px pill is two rungs below anything published. That does not make 10px wrong — S1 is denser than vercel.com and §7.3 already says the base is a property of the surface — but it does mean the branch "mint a 9px rung" can no longer claim the catalog as evidence, which is what it was leaning on. Retiring `--rux-size-xxs` is **Class C** and would stop and propose; it has four consumers. Nothing here executes until Q7 is answered on its new footing. |
| 35 | Correct Q6's breakpoint claim (Status item 1; §6 Q6) | **done** | Class A, and **patch 1.13.0 → 1.13.1** — wording, evidence and a corrected citation; no token, rule, or value moves, and nothing re-renders. Both the Status block and §6 Q6 asserted that this system "has no breakpoint vocabulary," and on that basis deferred the whole of Q6's third variable to an unwritten `spacing.md`. `README.md` §1's source table carried the same claim a third time and is corrected in the same change, per the rule that README is fixed alongside the document it summarizes. **The claim was false.** `tests/breakpoint-contract.test.mjs` has recorded a **closed set of four** since before this document existed — **500** (shared mobile: touch-target minimums in `tokens.css`, the drawer's mobile mode), **580** (the floating-window frame contract on phones), **620** and **760** (both `ui-header.css`) — each with its purpose stated and an explicit ratchet requiring a fifth to be added on purpose. Q6 therefore narrows from three undecided variables to **two: which roles get a small-screen rung, and which rung.** **500** is the standing candidate for the width, and the test's own note that reusing one costs nothing means the mapping decision need not open the set. Step 21's Q6 evidence reads against it directly: the `maintenance.html` `h1` measured at 375px sits below 500. **What `spacing.md` actually owes Q6** is not the vocabulary but a **canonical home** for it. CLAUDE.md's one-home rule says an enforcement test SHOULD cite the section it enforces; this one cites nothing because no section exists, leaving the rule stated *only* in enforcement — the inverse of step 16's problem, where a rule is stated in `README.md` with no canonical home yet. **Deliberately did not answer Q6:** the mapping is a design decision this step has no authority over, and step 7 stays gated. **Deliberately did not write `spacing.md` or relocate the breakpoint set** — moving a rule into a document that does not exist is how a set ends up stated twice, which is the failure the one-home rule exists to prevent. **Deliberately did not add a citation to `breakpoint-contract.test.mjs`:** there is no section to cite until `spacing.md` is written, and a citation to a future anchor is worse than none. **Deliberately touched no CSS, token, or class.** Recorded as its own numbered step rather than folded into a later one, following **step 21**: a log that quietly edits its own history is worth less than one that shows the correction. |
| 36 | Repoint Q6's breakpoint citation at `layout.md` | **done** | Class A, and **patch 1.13.1 → 1.13.2** — a corrected citation; no token, rule, or value moves, and nothing re-renders. Step 35 established that Q6's missing piece was a canonical home for the breakpoint set and named `spacing.md` as the likely owner, hedged with "or a `layout.md`". That was settled in favour of **`layout.md`**, which now exists at contract 1.0.0 and publishes the set as its §1.1 — so this document's two forward references were pointing at a document that will not own the rule. Both are repointed: the Status block's item 1 and §6 Q6's closing paragraph. **The substance of Q6 is unchanged** — the mechanism was already settled, the width was already decided, and what remains open is still the mapping: which roles take a small-screen rung, and which rung. What changed is that **500px is now a citable published width** rather than a number recovered from a test's allow-list, which is the whole point of step 35. **Deliberately did not rewrite step 35's own notes**, which still name `spacing.md`: that entry is history and was accurate when written, and a log that edits its own past silently is worth less than one that shows the correction — the same reasoning step 21 records. **Deliberately did not close Q6 or unblock step 7.** **Deliberately did not touch any CSS, token, or class.** |
| 37 | Correct rule 2.14's tracking threshold from 14 to 12 | **done · Class A** | **The rule contradicted its own evidence.** 2.14 required `--rux-tracking-dense` (+0.02em) on *any type below 14px*, two sentences after citing the measurement that justifies it — Geist's Badge Small at 11px with +0.2px tracking **while its 12px and 14px sizes track 0**. 12 is below 14, so the MUST demanded +0.02em exactly where the cited evidence records 0. Three other statements already sided with the evidence and against the MUST: **§3.2** publishes `text-label-12` at tracking `normal`; **step 30**, which introduced the rule, applied dense to *four 11px consumers only*; and a full census of the rendered app finds **367 elements at 12px tracking 0 or wide** and none at +0.02em. The threshold was off by one rung, and "11px is the floor" two paragraphs below already implied it. **Nothing re-renders.** All four `--rux-tracking-dense` consumers were verified to be 11px before the edit — `.rux-ui-header__badge-count` (`ui-header.css`), `.rux-side-nav__badge` (`side-nav.css`), `--sched-trip-bar-bus-label-tracking` and the XXS row tracking (`scheduler/css`) — and 11 is below 12, so every one still satisfies the corrected rule. Three source comments reading "11px is sub-14" were updated to "sub-12" in the same change, since each cites this rule by number and a comment citing a corrected rule with the old number is the D3 defect class. **Deliberately did not retire the rule**, which is where it ends up: the conformance program retires the 11px rung, after which 2.14 has no consumer and goes with `--rux-tracking-dense`. That is Class C and belongs with the other removals, not here. **Deliberately did not touch any token or value.** Contract 1.13.2 → **1.14.0**. |
| 38 | Publish the button family and `text-label-18` | **done · Class A** | **Three rungs, all of them the catalog's own — nothing is invented here.** Rule 2.12's family table already lists `button` at **12/16 · 14/20 · 16/20, weight 500, tracking 0** and `label` at **18/20**; §3.2 simply never published them, which is why rules 2.11 and 2.12 have named a button family since they were written while no button role existed. **Published:** `--rux-text-button-14-*` (14/20/500/0), `--rux-text-button-12-*` (12/16/500/0), `--rux-text-label-18-*` (18/20/400/0), each carrying all five axes per rule 1.1. **16/20 is deliberately not published** — §7.3's named-consumer rule holds that a rung the catalog offers still needs a consumer here, and the census found none; the same reasoning already stops heading at 40. **Nothing re-renders: no call site reads any of the three.** That is the Class A contract in §2.1 — "none until a consumer opts in" — and the opting in is the Class B migration, where 74 elements take `text-button-14`, 8 take `text-button-12`, and `driver-share-header__label` takes `text-label-18`. **The leading is the catalog's, not the app's.** Every control in this app sets leading equal to its size (14/14, 12/12) to keep its box tight, and no rung in any Geist family does that. These roles therefore do **not** match what buttons render today: adopting them adds 4–6px of leading and a weight step to every button, tab and tag. Recorded here so the migration is not mistaken for a no-op. **`text-label-18` takes `--rux-line-height-20`, not `-28`.** The ladder comments pair 18 with 28, but that pairing serves Copy, whose leading grows with size; Label is flat by rule 2.12, and the catalog's Label rung at 18 is 18/20. **Not yet enforced, on purpose.** `tests/typography-roles.test.mjs` fails a role that is defined and unread, which is §7.3 made executable — so the three are registered in a new **PENDING** list that asserts completeness *and* asserts they are still unread, and fails the moment one gains a consumer without being promoted to `ROLES`. That is the ACCEPTED-list-plus-honesty-test mechanism `portability-audit.md` step 21 established, applied to a role that is published ahead of its adoption. **Deliberately did not migrate a single call site** — that is Class B, it re-renders, and §2.3 requires it batched with before/after px and named states. **Deliberately did not add a utility class** for any of the three; §3.3's rule is that a class takes a role's name only when it applies that role and nothing else, and no such call site exists yet. **Verified in a live browser, not reasoned about:** all three resolve on `gallery.html` — `0.875rem/500/1.25rem/0`, `0.75rem/500/1rem/0`, `1.125rem/400/1.25rem/0`, each on `--rux-text-primary` — and a re-census of that page returns the **same 13 specifications** it returned before the edit, which is the Class A claim made falsifiable rather than asserted. **Cache-busters deliberately not bumped.** A warm browser holding the previous CSS renders this page identically, because a custom property no rule reads cannot change a computed value; the bump belongs to the migration step, where the call sites and the tokens must arrive together. Noted because steps 6, 27 and 30 all bumped, and a reader comparing them should see a decision rather than an omission. **Found while checking that:** `tools/check-cache-busters.sh` reports **34 stale entries in the committed state**, none of them from this step — assets whose last commit is newer than the last commit that touched their `?v=`. A returning browser is being served stale files against new HTML on the reference pages today. Out of scope here and recorded so it is not rediscovered as new. Contract 1.13.2 → **1.14.0**, shared with step 37. |
| 39 | Bring tracking onto the catalog — the unambiguous half (Class B batch 1) | **done · Class B** | **315 elements, tracking only. No size, leading or weight moves anywhere in this step.** Rule 2.13 holds that Button, Label and Copy track **0 at every size they publish**, measured on the Geist specimens; every element here was escaping that. **Before → after, resolved, in px.** `.sched-scheduler__day-month` **14** at 14px `+0.56 → 0`; `.sched-scheduler__corner-label` **1** at 14px `+0.56 → 0`; `.sched-scheduler__bus-number` **11** at 12px `+0.48 → 0`; `.sched-trip-bar__status` **1** at 12px `+0.48 → 0`; `.sched-trip-bar__detail-field-label` **129** at 12px `+0.48 → 0`; `.sched-scope-trip .rux-field__label` **38** at 12px `+0.48 → 0`; `.sched-trip-bar__contact-phone` **17** at 12px `−0.24 → 0`; `.sched-trip-bar__time-value` **54** and `__time-suffix` **48** at 12px `−0.24 → 0`; `.trip-request__page-title` **1** at 24px `−0.48 → −0.96` (the 2.13 curve gives 24px `tighter`, not `tight`); `.driver-share-header__label` **1** at 18px `−0.36 → 0`, its rendered width **125px → 130px**. **Two hardcoded literals removed.** `letter-spacing: -0.02em` appeared twice in `trip-bar.css`. `.sched-trip-bar__contact-phone` takes `--rux-tracking-normal`; `.sched-trip-bar__time` takes `var(--sched-trip-bar-row-tracking, var(--rux-tracking-normal))` so it follows its density tier the way the row already does at `:836` — a flat `normal` there would have put 11px text at tracking 0 in the XXS tier and broken rule 2.14. **Two roles adopted rather than restated.** `.trip-request__page-title` now reads `--rux-text-heading-24-*` instead of restating the recipe (rule 1.2), which is what corrects its tracking. `.driver-share-header__label` reads `--rux-text-label-18-*`, **answering the question step 27 left open in a source comment** — "whether it is heading-18 or label-18 — which would track 0 — is step 26's call". It is label-18. It deliberately keeps `color: var(--rux-text-secondary)` over the role's primary, the allowance §3.3 already grants `.rux-u-subtitle`. **States eyeballed, all at 1280 and 375, overflow 0 at both:** `index.html` scheduler in **dark and light**; `maintenance.html` **populated with real data through a share link**, dark-only by `color-scheme`; `request.html`; `driver.html`, dark-only. **Not eyeballed:** every interaction-gated surface — menus, dialogs, drawers, the notifications, tasks and team-chat panels — which is the same coverage gap the census carries and is not closed here. **Deliberately excluded: the ten uppercase call sites.** `h6`, `.flip-seven__eyebrow`, `.sched-trip-envelope__*`, `.sched-trip-history__group-title`, `.sched-tasks__requirements-title`, `.sched-mini-cal__day-names`, `.sched-driver-week-info__month`, `.sched-scope-trip__driver-row--head span`, and `.rux-u-eyebrow` through the role. Rule 2.13's measurement was taken on Geist's specimens, and **whether Geist publishes an uppercase label at all is not recorded** — so zeroing tracking on uppercase text would apply the rule past its evidence, which is precisely the defect step 37 corrected in 2.14. Tracking on uppercase is a legibility convention, not decoration: uppercase has no ascender or descender variation to carry word shape. That question is **Q10**, and the ten sites wait on it. **Deliberately excluded: `.sched-scheduler__time-ticks > span`.** Measured at **9px** — below the 11px floor, below the catalog's 12, and a size the census never caught. Its correct tracking depends on what size it ends up at, so changing it here would mean changing it twice. Recorded as **D15**. **Cache-busters bumped**, unlike step 38: this step re-renders, so a warm browser holding the previous CSS would show the old tracking against new HTML. `--fix` moved **34 references across four pages**, which is more than this step dirtied — it also cleared the pre-existing staleness step 38 recorded, since the tool corrects every reference behind its asset rather than only the ones you touched. Verified before committing that the HTML diff is **version numbers and nothing else**: stripping `?v=` from both sides of the diff leaves two identical sets. 338/338 green. Contract 1.14.0 → **1.15.0**. |
| 40 | Drop uppercase from labels; sentence case at tracking 0 (Q10 answered) | **done · Class B** | **Q10's third branch, the only one needing no departure.** Rule 2.13 holds that Label tracks 0 at every size it publishes. An overline that is uppercased *and* tracked out is two departures from the catalog at once; dropping the uppercase removes both, where keeping it would have required recording a third named exception in §2.12. **Removed 15 `text-transform: uppercase` declarations** and zeroed the tracking that accompanied them. **Before → after, resolved:** `--rux-tracking-wide` **+0.04em** → `normal`, which is `+0.48px` at 12 and `+0.56px` at 14, at seven call sites; `--rux-tracking-widest` **+0.1em → 0** (`+1.2px` at 12) at `.flip-seven__eyebrow`; and `--rux-text-label-12-wide-tracking` **wide → normal**, which reaches `.rux-u-eyebrow`, `.rux-u-section-label`, `.rux-menu__header` and two `settings-app` rules through the role. **That token change makes the role's own name a misnomer** — `text-label-12-wide` no longer tracks wide, and now resolves identically to `text-label-12`. Retiring the duplicate is Class C and is not done here; the value moves, the name does not, which is what keeps this step Class B. **Five source strings sentence-cased**, because the transform sat on Title Case text and removing it yields Title Case, not sentence case: `Move to Bus → Move to bus`, `Trip Contact → Trip contact`, `Recent Changes → Recent changes`, `Trip Status → Trip status`, `To Do → To do`. Single-word labels are unaffected. **`.rux-u-section-label`'s own texts were already sentence case** — *Compliance*, *Assigned trips*, *Emergency contact* — so the codebase was already inconsistent with itself, which is evidence for the rule rather than against it. **`README.md`'s casing rule is corrected in the same change**, as its own precedence note requires. Its third bullet read *"UPPERCASE only for overlines and badges … track them out (`letter-spacing: 0.04em`)"* and directly sanctioned what this step removes; it is withdrawn, with the reason and the date recorded beside it. **Badges are untouched and were never in scope:** nothing uppercases them in CSS, and their caps come from the data. Genuine acronyms — `CDL`, `VIN`, `ZIP` — keep their caps, and the amended rule says so. **Deliberately excluded: all nine `trip-envelope.css` sites.** That file is a **printable dispatch document** — its own header calls it "a deliberate light-on-paper world", it carries an `@media print` block, and R6 already excepts print stylesheets from the token rules. Uppercase on a printed form is a document convention, not screen labelling, and Geist's label rules were measured on screen specimens. Its four `wide`/`widest` reads stay for the same reason. **Deliberately excluded: `Time Off`.** It renders through `.rux-button__label` and `.rux-tab__label` — a **control**, where README's Title Case rule is correct and unchanged. Checked rather than assumed, because a blanket sentence-case pass would have taken it. **Verified:** `.maintenance-changes__title` renders `text-transform: none`, `letter-spacing: normal`, text *Recent changes*, page overflow 0, on the populated share page with real data. Eyeballed at 1280 and 375. **Not verified — and this is the largest gap in the step:** most affected labels live on interaction-gated surfaces never opened here — the tasks, settings, trip, driver-week, trip-finder, team-chat and bus-picker panels, the menu header, and the Flip Seven view. **Twelve of the fifteen sites were changed without being seen.** 338/338 green, but the suite does not render. Cache-busters bumped (16 references). Contract 1.15.0 → **1.16.0**. |
| 41 | Adopt the Button family and correct leading and weight (Class B batch 2) | **done · Class B** | **Before → after, resolved.** `.rux-button` **14/14/400 → 14/20/500**, box **32px unchanged**; `.rux-button--sm` **12/12/400 → 12/16/500**, box **24px unchanged**; `.rux-badge` **12/12/500 → 12/16/400**, box **20px unchanged**; `.rux-tag` **12/12/400 → 12/16/400**, box **20px → 24px**; `p` **14/24 → 14/20**; `.sched-scheduler__day-month` and `__corner-label` **14/14/400 → 14/20/400**; `__day-number` **14/14/500 → 14/20/400**; `__bus-number` **12/20/500 → 12/20/400**. **The prediction this step was scoped against was wrong, and measuring is what showed it.** The conformance plan said adopting the Button family would make every control taller, because no catalog rung sets leading equal to size. It does not: `.rux-button` and `.rux-badge` set an explicit `height` and centre with flex, so leading changes inside a fixed box. The scheduler header was the case most likely to move — `.sched-scheduler__day-head` carries `min-height: 32px` over a label stacking two 14px lines — and it did not move either, because `.sched-scheduler__day-label` sets an explicit 28px. **Measured after: day-label 28px, day-head 32px, grid 818px, all three unchanged; page overflow 0.** The one box that did grow is `.rux-tag`, from **20px to 24px**, because it is padding-driven with no fixed height. So the visible change in this batch is **weight, not size** — buttons heavier, badges and day-numbers lighter — and the layout question the plan raised for `layout.md` does not arise. **Four literals retired.** `line-height: 1` was stated raw on `.rux-button`, `.rux-badge`, `.rux-tag` and three scheduler header cells; each now reads its role's leading. **Caught by measuring, not reading:** `.rux-button--sm` overrode the size but not the leading, so 12px compact text briefly took the 14px rung's 20px leading. It now sets `--rux-button-line-height-compact`. That is exactly the defect **D14** records for headings, found in the control tier. **D16 fixed in the same step.** Rule 2.11 put badges at **500** while 2.12's tree lists "badge, cell, chip, field label, eyebrow" under **Label**, which 2.11's own second paragraph puts at **400** on the catalog's authority — so a badge was both weights in one section, and `tests/badges.test.mjs` made the 500 half executable. Resolved toward the catalog: a badge is not interactive, so it is not a Button. The test now asserts the **role reference** rather than the raw rung, which is rule 1.2 applied to a test. **`tests/typography-roles.test.mjs` had a blind spot this step exposed.** Its consumer corpus was `base/*.css` plus `colors_and_type.css`, so a role adopted through the **component-token tier** — `--rux-button-font-weight: var(--rux-text-button-14-weight)`, which is the documented shape — looked unread, and both the used-check and the PENDING honesty test stayed silent. `tokens.css` is now in the corpus, with the superseded-alias block sliced out so a role cannot satisfy the check through its own deprecated alias. **Verified to fail when violated** before being accepted. `text-button-14` and `-12` are promoted from PENDING into ROLES; `text-label-18` stays pending, its only consumer being outside the corpus. **States eyeballed:** `gallery.html` — 0 controls overflowing their box, page overflow 0 — and `index.html` at 1280. **Step 40's twelve unseen panel states were confirmed by the user** in the same session, closing that step's recorded gap. **Deliberately not done:** the 11px and 9px size moves (D15 and the 11px tier), which are size rather than leading or weight and belong to their own batch; and the Class C retirements. Cache-busters bumped. 338/338 green. Contract 1.16.0 → **1.17.0**. |
| 42 | Retire the 11px rung outside the density tiers; close D15 (size batch, part 1) | **done · Class B** | **The catalog floors at 12 and this repo floored at 11.** Q7 settled 11 on Geist's *Badge component*, which its own type catalog does not publish — a component-tier floor, not a scale rung. Every 11px consumer that had no density reason moves up. **Before → after, resolved.** `.rux-ui-header__badge-count` **11/11/500 with +0.22px tracking → 12/12/400 at 0**; the header's second 11px element **11 → 12**; `.rux-side-nav__badge` **11px/400 dense → 12/400 normal**; `gallery.html`'s mono label **11 → 12/16**, keeping `--rux-font-mono` — **mono is a face, not a rung**, so no 13 rung is minted and §7.3's named-consumer rule is not tested. `gallery.html` now renders **zero elements below 12px**; page overflow 0. **The count badge also drops to weight 400**, following D16. Its own comment said "a count badge is a badge: 500, the same weight `--rux-badge-font-weight` carries" — true when written, stale the moment step 41 moved `.rux-badge` to 400. Corrected with the element rather than left to rot, which is the D3 defect class. **At 12px rule 2.14 no longer applies**, so the dense rung comes off both badges; `--rux-tracking-dense` is now down to the two trip-bar consumers. **D15 closed, and it was not what it looked like.** `.sched-scheduler__time-ticks > span` carried a hardcoded `font-size: 9px` — no token, below every floor. It now reads label-12. **But the change is inert, because the element never renders:** `.sched-scheduler__time-ticks` is `display: none` in its base rule *and* `display: none` again under `.sched-scheduler--time-aligned`, the selector that exists to reveal it. No JS touches either. Verified by toggling Time-aligned mode on in a live browser and finding all 42 spans still `0×0`. **Recorded as D17** — 42 DOM nodes unreachable in every state, and a rule that reads as a copy-paste of the one it was meant to override. **Deliberately not fixed here:** changing that `none` would *reveal* 42 elements no one has seen, which is a behavior change and not a type conformance step. **Deliberately not done — and it needs a decision, not a step.** The trip-bar density tiers still read 11px: **XXS** row 11/12 and **XS** bus-label 11/12. Retiring the rung there **collapses XXS into XS** — XXS row 11/12 becomes 12/16, which is exactly what XS already is — so the scheduler loses its densest view, and the XS pill stops being quieter than its row. That is a product decision about a shipped density control, not a typography one, and it is **Q11**. 338/338 green. Cache-busters bumped. Contract 1.17.0 → **1.18.0**. |
| 43 | Collapse the density tiers onto the catalog floor (Q11 answered; size batch, part 2) | **done · Class B** | **Q11 answered: no departures.** The trip bar's last two 11px consumers move to label-12. **Before → after, resolved:** the **XXS** tier row **11/12 → 12/16** with its dense tracking dropped; its bus label **11/12 → 12/16**; the **default** tier's bus label **11/12 → 12/16**. Verified in a live browser across all three tiers: default **12/16**, XXS **12/16**, SM **14/20**, and the scheduler now renders **zero elements below 12px**, page overflow 0. **XXS is now byte-identical to the default tier, and that is the answer rather than a bug.** The catalog publishes exactly **one leading at 12px** — 16 — so once 11 is gone there is no catalog-legal way to hold a third tier apart on size or leading. **What it costs, measured rather than estimated:** collapsed trip-bar height is `row-line-height × visible-row-count`, so at 7 rows this tier rendered **12 × 7 = 84px** against the default's **16 × 7 = 112px**. That **25% density gain no longer exists**. The tier is kept as a no-op class so a stored preference still resolves; **retiring the option itself is a product change and is not done here**. **The pill still separates from its row, and by the axis step 30 chose.** At 12px the pill matches the row's size exactly, so the distinction is weight — `--sched-trip-bar-bus-label-weight` stays **500** against the row's 400 — which is precisely the fallback step 30 designed when it wrote "a 12px row leaves no room for two legible sizes, so the separation comes from weight and the pill's own fill instead". That reasoning was written for XXS at 11px and now carries the tier at 12. **`tests/trip-bar-size.test.mjs` needed three corrections, and one of them was a rule that had already moved.** (1) Its resolver accepted only **primitives**, by design — step 30's point was that the trip bar states rungs rather than deriving them. Rule 1.2 asks a recurring recipe to go through a **role**, and a role is itself a named rung, so `pxOf` now follows `var()` chains and the clamp/calc assertion is what still forbids arithmetic. (2) Its rule-2.14 test asserted the **old** threshold, *below 14* — **it should have failed at step 37 and did not**, only because nothing had yet dropped the dense rung; corrected to *below 12*, where it is now vacuous and kept as a ratchet. (3) The tier test pinned literal token **spellings** (`var(--rux-size-11)`), which would have read a conformance step as a regression; it now asserts **resolved px**. Each was verified to fail when violated. **Five published names now have zero consumers** and become Class C candidates: `--rux-size-11`, `--rux-size-xxs`, `--rux-tracking-dense`, `--rux-tracking-wide`, `--rux-tracking-widest`. Rule **2.14** likewise has no consumer left. None is removed here — that is Class C and stops to propose first. 338/338 green. Cache-busters bumped. Contract 1.18.0 → **1.19.0**. |
| 44 | Bring table headers onto the Label tracking rule | **done · Class B** | **Class B, and a miss this program made rather than inherited.** `.rux-table th` reads `letter-spacing: var(--rux-table-header-tracking)`, which resolves to `--rux-tracking-wide` (**+0.04em**). A table header is a Label by rule 2.12's tree — a single line of UI text — and rule 2.13 holds that Label tracks **0** at every size it publishes. **Steps 39 and 40 both missed it** because they swept call sites reading the *primitive* directly, and this one reads it through a **component token**. That is the same indirection that blinded `tests/typography-roles.test.mjs` until step 41 widened its corpus — a second instance of one cause, which is why it is recorded rather than quietly fixed. **One line:** `--rux-table-header-tracking` → `--rux-text-label-12-tracking`. **Before → after, resolved:** `--rux-table-header-tracking` **+0.04em → 0**, which at the header's 14px is **+0.56px → 0px**, across **40 rendered `th` elements** on `index.html` — measured live, not estimated. Their spec is otherwise unchanged at **14/20/400**. The count is what makes this a real miss rather than a theoretical one. **Gated step 45 and now releases it:** the only `--rux-tracking-wide` and `-widest` reads left in the repository are the **four** in `trip-envelope.css`, the print document step 40 deliberately excluded — verified by grep after the edit, per the rename protocol. Those two primitives are therefore **print vocabulary, not dead vocabulary**, and step 45 does not touch them. **Not eyeballed:** the tables live behind the fleet panel and `index.html`'s own markup; the computed values were read from 40 live elements but the rendered result was not looked at. 338/338 green. Contract 1.19.1 → **1.20.0**. |
| 45 | Retire the sub-catalog rungs and rule 2.14 | **done · Class C** | Removes `--rux-size-11`, `--rux-size-xxs` and `--rux-tracking-dense`, and deletes **rule 2.14** with them. **Grep protocol run at proposal time**, working tree at step 43: `--rux-size-11` css **2** (its own definition and the `xxs` alias), html 0, js 0, tests 0, docs 2; `--rux-size-xxs` css **1**, html 0, js 0, tests 0, docs **11**; `--rux-tracking-dense` css **1**, html 0, js 0, tests **2**, docs 5. **No occurrence outside CSS is a live read** — the doc hits are history and rationale, the test hits assert the rule this step deletes. **Rule 2.14 is the unusual half:** removing it invalidates no conforming markup, because nothing renders below 12 after step 43, so it does not carry the risk the token removals do. **Executed 2026-08-21 under explicit authorization.** **Post-edit grep, per the rename protocol:** all three are **css 0 · html 0 · js 0**. The one remaining test hit is a comment recording this history; every remaining docs hit is a step record or Q7's original text. `tests/tokens-contract.test.mjs` passes, so no rule reads a name that no longer resolves. **Verified in a live browser:** all three report `(undefined)`, `--rux-size-12` and both surviving tracking rungs still resolve, the scheduler renders **zero elements below 12px**, page overflow 0. **Nothing re-rendered** — the three had no consumer left after steps 42, 43 and 44.

**Rule 2.14 is replaced rather than merely deleted.** It now reads *"Twelve is the floor"* and states the one thing still worth enforcing: nothing below 12px is published and no call site may mint one. The positive tracking branch is gone, because a branch that opens small letters exists only to prop up rungs beneath the catalog floor, and there are none. The **"11px is the floor"** paragraph is folded into it — 11 was Geist's floor only once its *components* were counted rather than its type catalog, which is the distinction Q7 turned on and Q11 settled against. `tests/trip-bar-size.test.mjs` was repointed from asserting the retired tracking branch to asserting the floor itself, and verified to fail when violated.

**The sequencing claim in this row's proposal was wrong and is corrected here.** It said step 46 must migrate consumers first. It need not, and the reason is not that a gate protects them: `design-system-distribution.md` §4 makes the consumer name check a **SHOULD**, not a MUST. What makes removal safe today is that **consumers pin a tag rather than tracking `main`**, so nothing breaks until one chooses to upgrade. A consumer that upgrades *with* the check gets a loud failure; one *without* it gets an unresolved `var()` and degraded rendering — visible, but not a build error. **Step 46 stays open** as the tracking entry for that migration, which is now a follow-up rather than a precondition. Deliberately **not** folded into step 43: publishing and removing in one step is a hard break wearing a deprecation window's clothes, which is step 31's recorded lesson. **Class C takes a major** (§2.5). Contract 1.20.0 → **2.0.0**. |
| 46 | Migrate the vendored consumers off the sub-catalog rungs | **[withdrawn]** | **Withdrawn 2026-08-22 by the owner.** The vendoring process will be restarted from scratch as the last piece of this programme, and the one other project consuming this system is having every page and document redesigned regardless — so there is no consumer to migrate off the sub-catalog rungs. A migration step whose destination no longer exists is not deferred work, it is finished thinking, and leaving it as `[deferred]` made the Status block claim pending work that will never be done. **Not deleted:** the row records why the rename in step 45 shipped without a migration, which is the question a later reader will actually have. `tests/foundations-contract.test.mjs` gains a `withdrawn` state in the same change. |
| 47 | Retire `text-label-12-wide` and the eyebrow aliases | **done · Class C** | Since step 40 zeroed its tracking, `--rux-text-label-12-wide-*` resolves **identically** to `--rux-text-label-12-*` — two published names for one recipe, which §3.3 and step 31's merge precedent both forbid. **Grep protocol at proposal time:** `rux-text-label-12-wide` css **30**, html **5**, js 0, tests **2**, docs 4; `rux-label-eyebrow` css **5**, html 0, js 0, tests **1**, docs 1. **Occurrences outside CSS, listed:** `gallery.html` lines 37–42 read all five axes in an inline style block; `tests/typography-roles.test.mjs` line 57 lists the role in `ROLES` and line 100 maps the `--rux-label-eyebrow` alias. **Call sites:** `.rux-u-eyebrow`, `.rux-u-section-label`, `.rux-menu__header` (one shared rule in `utils.css`) and two `settings-app` rules. **A class question rides along:** `.rux-u-eyebrow` now applies exactly one role and nothing else, which by §3.3 means it should become `.rux-text-label-12` — and that reaches **6 JS references** in `bus-picker.js`, `driver-assignment-card.js` (×4) and `maintenance-share.js`. `.rux-u-section-label` keeps its object name because it adds a divider. **Executed 2026-08-21 under explicit authorization.** **Removed:** the five `--rux-text-label-12-wide-*` tokens, the five `--rux-label-eyebrow-*` aliases, and the `.rux-u-eyebrow` class. **Repointed to `--rux-text-label-12-*`:** `utils.css` (the shared rule), `settings-app.css` (7), `gallery.html` (5), `trip-panel.css` (4), `trip-finder.css` (4). **Six JS references** swapped `rux-u-eyebrow` → `rux-text-label-12` in `bus-picker.js`, `driver-assignment-card.js` (×4) and `maintenance-share.js`.
| 48 | Take the vendored consumers out of scope | **done** | **A scoping decision by the owner, recorded because it changes what three open steps mean.** Consumers are to be rebuilt and their templates redesigned, so migrating them off names this program retired is work that will be thrown away. **Steps 32, 34 and 46 move to `[deferred]`** — the same state steps 4 and 23 already carry for want of a consumer. **Deliberately not deleted:** each records what a consumer must do if one is ever re-vendored from a tag older than 3.0.1, and a step recording a real obligation is worth more deferred than erased. **What this releases:** step 33 was blocked on step 34 and is now executable. It removes **61 published names** — 18 primitive aliases, 40 role aliases and 3 class selectors — which is the largest single cleanup left in this document, and the alias window it was protecting now has no one behind it. **What this does not release:** step 7 still turns on Q6, step 11 still needs external verification of a font-feature mismatch, and step 16 still waits on everything. None of those was ever about consumers. **Standing risk, stated once rather than repeated per step:** this document's contract has moved **1.13.2 → 3.0.1** across steps 37–48, with two Class C majors in it. Anything re-vendored from an older tag needs the deferred steps read, not skipped. No token, rule, or value moves here. Contract 3.0.0 → **3.0.1**. |

**Nothing re-renders from the repointing.** Both roles carry `--rux-text-secondary`, and since step 40 zeroed the wide tracking every other axis was already identical — two published names for one resolved recipe, which is exactly why §3.3 forbids it. Verified live: `.maintenance-changes__title` renders **12/16/400**, tracking normal, transform none, both retired tokens `(undefined)`, page overflow 0.

**`.rux-u-eyebrow` is merged, not aliased.** It applied one role and nothing else, so by §3.3 it *is* that role's utility under a second name; `.rux-text-label-12` already published it in `form.css`. Same call step 31 made for `.rux-u-caption` and `.rux-u-hint`. `.rux-u-section-label` keeps its object name because it adds a divider, and `.rux-menu__header` is a component's own class.

**This row's own grep under-enumerated the call sites, and a test caught it.** The proposal listed `utils.css` and two `settings-app` rules; `trip-panel.css` and `trip-finder.css` read the role too, 8 declarations between them. `tests/tokens-contract.test.mjs` failed on eight unresolved properties the moment the tokens were deleted — the count in the proposal (css 30) was right, the *enumeration* under it was not, and reading a total without listing what composes it is how that happens.

**A third instance of one cause.** `gallery.html`'s inline `<style>` block still carried `text-transform: uppercase` from before step 40, because that step swept `.css` files and this lives in HTML. Step 44 found the same blind spot behind a component token. The sweeps were scoped to file type and to indirection depth, and both scopings leaked; folded in here rather than left for a fourth discovery. **That half is a visible change** — the gallery's section headings are now sentence case; eyeballed at 1280.

**Post-edit grep, per the rename protocol:** `rux-text-label-12-wide` **css 0 · html 0 · js 0 · tests 0**; `rux-label-eyebrow` **css 0 · html 0 · js 0 · tests 0**; `rux-u-eyebrow` **css 1** — the comment recording its retirement — **html 0 · js 0 · tests 0**. Remaining docs hits are step records. `class-resolution` passes, so every swapped JS class resolves. **Still owed a consumer-migration step**, which this row does not pre-empt: a consumer reading `--rux-label-eyebrow-*` or emitting `.rux-u-eyebrow` must move to `text-label-12`, and both substitutions render identically. **Class C takes a major** (§2.5). 338/338 green. Contract 2.0.0 → **3.0.0**. |

### 5.1 The conformance program, second pass

Opened 2026-08-21 by the owner's restated goal: *conform to Geist exactly, under this
system's prefix.* Step 49 re-measured the catalog and re-verified §3 against source; the
five steps after it are what "exactly" still requires. Ordered by dependency: 49 first, then
51–54 in any order, then 50 once Q12 is answered.

| # | Step | Status | Notes |
|---|---|---|---|
| 49 | Re-verify §3 against source and the catalog; correct the drift (doc sync) | **done · Class A** | **What had drifted, listed so the size of the lapse is on record.** The Status block's pick-up list said step 33 was pending, step 11 needed verification and step 16 was waiting — all three were done in the preceding five commits. §1's tier table cited `.rux-u-eyebrow` (retired 47). Rule 2.13 still named `text-label-12-wide` as a live uppercase exception (retired 40, 47). §3.1 listed `11` and `dense` (retired 45) and said nine sizes, eight leadings (it is eight and nine). §3.2 listed `text-label-12-wide` and lacked `heading-32`, `-20`, `-14` (step 7). §3.3 listed `.rux-u-eyebrow` and an uppercase section label. §3.4 had `h4` at 18/28, `h6` as a 12px uppercase label and `p` at 14/24 (steps 7, 41). The Known-drift section described README's pre-step-16 state. Eight steps had moved the code and none re-read §3. **Everything is now re-verified against source, dated, and where a value depends on the cascade, measured live on `index.html`.** **The catalog was re-measured in full the same day** — all 29 styles, computed styles read off vercel.com's rendered specimens — and the thirteen roles this system publishes are **byte-identical to their specimens on size, leading, weight and tracking**. Four findings from that pass change the record: **(1)** `label-20` is **20/32**; rule 2.12's "24, not Geist's 32" departure is withdrawn. **(2)** `text-copy-13-mono` is the catalog's inline-code style (its usage line says so, 13/18), so Q9's "no inline-code style" was false and rule 2.4's step-down is a departure — **D20**. **(3)** Strong is **550 in Copy and 500 in Label**, and **Subtle** (a `strong` inside a Heading) is 500 at the secondary colour — **D21**. **(4)** A Geist style sets **four** properties; the colour on the specimens is demo scaffolding, so rule 1.1's fifth axis is recorded as this system's extension. Two more, recorded because they were open: Q10's missing evidence — the `label-12` specimen carries capitals from its data at tracking 0 — and step 11's external check: vercel.com applies `"calt" 0, "rlig", "ss11"` globally, Geist Sans publishes **nine** style sets per vercel.com/font, so `ss11` is inert on it and `rlig` is default-on; the only live difference from this system's `normal` is `calt 0`, which is not adopted. **Measured live on `index.html`, bare probes and real elements:** pill **12/12** in a 16px box at the default tier (**D19** — step 43's "default 12/16" was the row); `ul`/`ol` **14/24** across 20 items and `pre` **12/28** (**D18**); `code` 12 inheriting 20; `small` 12/20; `strong` inside `h2` **500 at primary**; **0** elements below 12px. **Corrected in the same change:** rule 2.12's family table (label-20, the mono rungs, the display headings), rule 1.1, rule 2.4, rule 2.11, rule 2.13, §3.1–3.4, §4 (D18–D21 added), §6 (Q12 opened; Q9 and Q10 annotated), Known drift, and two stale comments in `tokens.css` — the size-ladder note still said "11 is the floor" and cited the retired positive-tracking branch, and `--rux-line-height-12` still said "pairs with size-11". `README.md` index row updated. **Deliberately not done:** no token, class or value moved — every finding became a defect row or a step, not a fix; `--rux-line-height-12` was not retired (Class C, and its one reader is D19's to remove first); §5 and §6 history is untouched — every correction sits beside the text it corrects, per step 21; no prose test was added for the Status list or §3, because a test that parses rule prose is a second statement of the rule — the Known-drift section records the convention that replaces it. 337/337 green. Class A, because rule text changed (2.12's label row, 1.1's extension, 2.4's and 2.11's corrections) with no token or value moving. Contract 4.2.0 → **4.3.0**. |
| 50 | Publish the rest of the catalog (Q12) | **done · Class A** | **Q12 answered yes by the owner on 2026-08-21; executed the same day.** The system now publishes the whole catalog under its prefix: **29 roles, 13 sizes, 14 leadings**, every value read off the rendered specimens. **Primitives, 10:** `--rux-size-13` (0.8125rem), `-48`, `-56`, `-64`, `-72`; `--rux-line-height-18` (1.125rem, off the 4px grid the way `26` is — a catalog value, named per rule 2.10), `-36`, `-56`, `-64`, `-72`. **Roles, 16:** `text-heading-48` 48/56, `-56` 56/56, `-64` 64/64, `-72` 72/72, all 600 at `tightest`; `text-button-16` 16/20/500; `text-label-20` 20/**32**, `-16` 16/20, `-13` 13/16; `text-label-14-mono` 14/20, `-13-mono` 13/**20**, `-12-mono` 12/16; `text-copy-24` 24/36, `-20` 20/36, `-18` 18/28, `-13` 13/18, `-13-mono` 13/18 — labels and copy 400, tracking 0. **The mono roles carry a sixth axis, `-family`**, reading `--rux-font-mono`; rule 1.1 now says so, and a new test asserts it. **Colour is primary throughout.** The catalog's usage lines hint that `label-13` and `copy-13` are "secondary" text, and that was weighed and **not adopted**: colour is this system's mapping (rule 1.1), the two secondary-by-default roles today are the pre-rename lead and caption, and a third chosen from a usage hint rather than a measurement would be a new kind of decision made in passing. A component that wants a muted 13 sets its own colour, the allowance §3.3 already grants. **Rule text:** 2.12's last departure is withdrawn; §3.1 and §3.2 list every rung; **§7.3 is amended** — a rung the adopted catalog publishes has a named consumer, the catalog; locally invented rungs still need one. **Enforcement:** the 16 join `PENDING` in `tests/typography-roles.test.mjs`, published, complete, and provably read by nothing but their own utility — which required the corpus change step 51 records. **Verified, not assumed:** all 29 classes probed on `gallery.html` resolve to their catalog values, 29 of 29; A/B on every page, 0 differences (see 51). **Deliberately not done:** adopting any of the sixteen at a call site — Class B, and it belongs to whichever component wants the rung; moving `code` onto `copy-13-mono`, which is step 52; `md:` variants (Q6 answered no); retiring `--rux-line-height-12` (Class C, D19 first). **One stale comment removed in passing** (D3 class): `tokens.css` still carried the heading "Eyebrow — uppercase category/section markers" over nothing, the role having gone at step 47. Cache-busters bumped with step 51. Contract 4.3.0 → **4.4.0**, shared with step 51. |
| 51 | Publish a utility for each role, in one file | **done · Class A** | **`rux-ui/css/base/text.css`: 29 `.rux-text-{family}-{size}` classes**, one per role, each reading its role's tokens and nothing else — 26 new, and the three that existed (`.rux-text-heading-16` from `card.css`, `.rux-text-label-14` from `preferences.css`, `.rux-text-label-12` from `form.css`) moved in. The component classes that shared those rules (`.rux-card__title`, `.rux-panel__title`, `.rux-workspace__title`, `.rux-preferences__heading`, `.rux-preferences__label`) stay where they were and keep reading the same role, so the move is a selector leaving a rule, not a rule changing. **Imported last by `rux.css`**, and the position is a decision: a utility placed on a component element now wins over the component's own type rule at equal specificity, which is what a call site reaching for a utility is asking for. Moving three existing rules to the end of the cascade could in principle change who wins on an element carrying both classes, **so it was measured rather than reasoned:** every element's computed size, leading, weight, tracking, family and colour was snapshotted on all five pages before the change and diffed after — `index.html` 5,250 elements, `gallery.html` 196, `request.html` 118, `driver.html` 19, `maintenance.html` 9 — **0 differences**. `driver.html` and `maintenance.html` were in their no-data states, so their interaction-gated content is not covered; `index.html` was populated. **`tests/typography-roles.test.mjs` had to learn the difference between a publication and a consumer.** Its corpus is every `base/*.css`, so the moment `text.css` existed every role was "read" and both the used-check and the `PENDING` honesty test went blind — the mirror image of the blind spot step 41 fixed. `text.css` is now excluded from the corpus, with the reason beside it, and two tests were added: every published role has a utility that applies it whole, axis by axis, through the role's own tokens (rule 1.3 made executable), and every mono role carries `-family`. **`tests/gallery-coverage.test.mjs` failed on the new file, correctly** — a base file nobody can see — and the fix was a specimen, not a `KNOWN_GAPS` entry: `gallery.html` now opens with the full ramp, all four families, with `<strong>` inside headings and labels so Subtle and Strong can be eyeballed (and step 54's change seen when it lands). Eyeballed in both themes at 1280. **Cache-busters:** `tools/check-cache-busters.sh --fix` bumped `rux.css` on four pages; the inner `@import "…?v="` lines for `tokens.css`, `card.css`, `form.css` and `preferences.css` were bumped by hand, because the tool tracks page-level references only and a warm browser re-fetching `rux.css` would otherwise re-use the four cached partials — harmless for the three moved rules (a duplicate definition), but the new roles in `tokens.css` would not resolve. `README.md`'s index counts corrected (23 base files, 10 with specimens). **Deliberately not done:** a class per modifier — Strong, Subtle and tabular are `<strong>` and `font-variant-numeric` on the element, as the catalog does them; renaming `.rux-u-section-label` or `.rux-u-subtitle`, which add something beyond their role and keep object names by §3.3's rule. 339/339 green. Contract 4.3.0 → **4.4.0**, shared with step 50. |
| 52 | Put inline code on the catalog's inline-code style (D20, D18 half) | **done · Class B** | **Executed 2026-08-21, batched with 53 and 54 under one minor bump (§2.3.4).** The Class A half this row planned — `--rux-size-13`, `--rux-line-height-18`, `--rux-text-copy-13-mono-*` — had already landed with step 50, so this is the Class B half alone. **`code, kbd, samp, pre` read `text-copy-13-mono` whole** — six axes, family included — and `code`'s own `color` and `pre`'s own `line-height: 28` go, since the role carries both. **Before → after, resolved, measured on `index.html`:** `pre` **12/28 → 13/18** (1); unpinned `code` **12 → 13** (2, inside that `pre` and one example); **8 `code` stay at 12**, pinned by `.components-app__button-example code` in the app tier — their inherited leading moves 20 → 18, which is inert on an inline element. **That pin is left alone on purpose:** it is the components app's own mapping (a 12px caption and a 12px code string aligned in one example row), made when the default was 12 and restating it; whether it should follow the default is that app's call, and it is recorded here so it is not mistaken for a miss. `gallery.html` gains an inline-code specimen in a `copy-14` line, so the element default has a visible consumer: **13/18 inside a 20px line box, the line box unchanged**. **Rule 2.4 rewritten** — the step-down sentence is history now, kept as such; Q9 annotated. **`--rux-text-copy-13-mono` promoted from `PENDING` to `ROLES`**, and the promotion exposed a regex flaw: the test matched a read of `--rux-text-copy-13` against `--rux-text-copy-13-mono-*`, name-plus-dash being a prefix of both. Reads are now matched as name-dash-axis (`READ`), verified to fail on the old pattern. **`pre` takes 18, the Copy leading**, because block code wraps as prose; `label-13-mono`'s 20 was the alternative and is named so a code-block component can revisit it. **Found, not fixed — D22:** `scheduler/css/features/maintenance-share.css:29` sets `font-size: 12px` as a literal on `.maintenance-trip :is(strong, span, small)`, a rule 2.1 defect in the app tier; outside this step's scope and recorded rather than swept. **States eyeballed:** the gallery, dark, at 1280. **Not eyeballed:** the components app's code samples — the 8 pinned `code` did not move, and the one `pre` and two `code` that did live behind the components view. **Deliberately not done:** `kbd`'s colour and padding (component styling); giving `pre` a background change; publishing a code-block component. Contract 4.4.0 → **4.5.0**, shared with 53 and 54. |
| 53 | Pair lists with the base leading (D18, the other half) | **done · Class B** | **Executed 2026-08-21.** `ul, ol` no longer set `--rux-line-height-24`; lists inherit `body`'s 14/20. **Before → after, resolved: 14/24 → 14/20**, and the blast radius was measured rather than assumed by diffing every element's computed type on every page. **`index.html`, 38 of the batch's 43 signature changes:** `.rux-side-nav__item` ×11 and both `.rux-side-nav__list`s; `.rux-notifications__list`; `.sched-dev-notes__list` and its empty item; `.sched-scope-trip__doc-list` and its empty item; `.rux-u-record-list` ×3; `.driver-assignment-card__crew-list` ×2 with their crew-member, identity, actions and body descendants; `.flip-seven__roster` and its empty item; `.flip-seven__scores` and four score items — every one **24 → 20**. **`request.html`:** `.trip-request__file-list` 24 → 20. `gallery.html`, `driver.html`, `maintenance.html`: 0. **What that means on screen is smaller than the count:** the side-nav link inside each item already read `label-14` at 20, so the item's box was the link's and its own leading was inert; the 4px loss is real only where the `li` holds bare text — the empty-state items and the Flip Seven scores. **States eyeballed:** `index.html` at 1280, dark, side-nav visible. **Not eyeballed:** notifications, dev-notes, scope-trip documents, crew lists, Flip Seven — all interaction-gated; `request.html`'s file list populated. Named as owed. **Deliberately not done:** `small` — inline, inherits its line's leading by design, no catalog counterpart; `li + li` margin, which is spacing and `layout.md`'s. Contract 4.4.0 → **4.5.0**, shared. |
| 54 | Strong at 550 in Copy; Subtle in Heading (D21) | **done · Class A + B** | **Executed 2026-08-21.** **Class A half:** `--rux-weight-550: 550` in the ladder; rule 2.11's "nothing above 600" untouched. **The import now declares the range:** `Geist:wght@400;500;600;700` → `Geist:wght@100..900`. Verified twice — the served CSS carries `font-weight: 100 900` once per subset (5 faces, where the discrete form wrote 20), and in the live page `document.fonts` reports every Geist face at `100 900` with `document.fonts.check("550 16px Geist")` true. Same files, zero added bytes. Geist Mono stays discrete: its Strong was never measured. **Class B half — the shape chosen is "default 500, Copy and Heading opt in", and the census decided it:** all 15 `<strong>` on `index.html` are component-pinned (14 at 400, the Flip Seven turn status at 500) and none sits in a `p` or a heading, so a 550 default would have changed nothing there while promising the wrong thing for the dense UI, whose strings are Labels. Rules: `strong, b` **500 at primary**; `p :is(strong, b)` and `.rux-text-copy-* :is(strong, b)` **550**; `:is(h1…h6) :is(strong, b)` and `.rux-text-heading-* :is(strong, b)` **500 at `--rux-text-secondary`**. Specificities (0,0,2) and (0,1,1), so the six component pins step 6 left at 400 keep winning — verified by the A/B. **Before → after, measured on `gallery.html`:** Copy `strong` ×5 (24, 20, 18, 16, 14) **500 → 550**; Heading `strong` ×4 (32, 24, 20, 16) colour **primary → secondary**, weight 500 unchanged; Label `strong` ×4 unchanged at 500. **`index.html`: 0 elements moved**, as the census predicted. **Rule 2.11 amended.** **Components that read a Copy role through their own class** (`.rux-alert`, `.rux-toast`, `.rux-u-subtitle`) do **not** get 550 by this step: they opt in the way the six opt out, and none has a `<strong>` today. **States eyeballed:** the gallery ramp, dark, at 1280 — every modifier visible in one section. **Not eyeballed:** light theme (the Browser pane was not displayed; values confirmed by computed style), the Flip Seven view. **Deliberately not done:** 550 as the default; `font-synthesis` tricks; touching the 400 pins; renaming anything. Contract 4.4.0 → **4.5.0**, shared with 52 and 53. **A caveat on the batch's A/B that applies to all three rows:** `request.html`, `driver.html` and `maintenance.html` were measured in background tabs with a **0-width viewport**, so their narrow media queries were active and page overflow could not be read there; the before and after snapshots were taken under the same condition, so the diffs are sound, but "no overflow" is claimed only for `index.html` and `gallery.html` at 1280. |
| 55 | Pair the application tier's last unitless leadings with their sizes (rule 2.2) | **done · Class B** | **Executed 2026-08-22.** Step 18 fixed the only unitless leading in the *portable* tier and called it the last one; it was the last one **there**. A full-tree scan for this step found six more in `scheduler/css/features/`, every one of them already pinning a correct `--rux-size-*` and then re-deriving its leading by hand — so one size rendered at three different leadings across five panels. **Before → after, in px:** `dev-notes.css:54` `.sched-dev-notes__item-text` 1.35 → **18.9 → 20**; `team-chat.css:229` `.sched-team-chat__message` 1.4 → **19.6 → 20**; `tasks-panel.css:119` `.sched-tasks__trip-title` 1.4 → **19.6 → 20**; `contact-info.css:20` textarea 1.5 → **21 → 20**; `driver-week-info.css:205` textarea 1.5 → **21 → 20**. The sixth is on a different rung and was nearly mis-paired: `tasks-panel.css:126` `.sched-tasks__trip-customer` pins `--rux-size-12`, not 14, so it takes `--rux-line-height-16` — 1.4 → **16.8 → 16**. Each lands on the Tier 0 pair the scale already documents for its size. **Verified in a browser, not owed as an eyeball.** Served on `node tools/serve.mjs` and each edited rule probed by instantiating its own selector, so the measurement reads the cascade as it resolves rather than trusting the token: `.sched-dev-notes__item-text` **14/20**, `.sched-team-chat__message` **14/20**, `.sched-tasks__trip-title` **14/20**, `.sched-tasks__trip-customer` **12/16**, and both mono previews — `.sched-contact-info-modal__preview` and `.sched-driver-week-info__preview` — **14/20** in Geist Mono. All six match the after column exactly; console clean. Leading is theme-independent here, so no light/dark pass was owed. **What a computed-style probe cannot settle** is the aesthetic call in real content: the two textareas *lost* 1px and the tasks-panel rows moved in opposite directions, so those are the three places worth a human look at real text before this is called good. **Deliberately not done:** (a) the four non-mono sites were **not** converted to read `--rux-text-copy-14-*` roles. They pin Tier 0 sizes, so pairing at Tier 0 keeps both axes on one tier; adopting the role would also move weight, tracking and colour, which is a larger change with its own blast radius and belongs in its own step. (b) The two mono textareas were **not** given a `copy-14-mono` role — Geist publishes no such style, and inventing one to satisfy this repair would breach the conformance goal §5.1 restated. `label-14-mono` already carries the identical 20px leading, so nothing was needed. (c) `line-height: 1` (~30 sites) and `letter-spacing: 0` (5 sites) were **not** touched: the first is a glyph-box collapse on badges, emoji and icons rather than a leading on a type role, and the second is `--rux-tracking-normal`'s computed value under another spelling. Both are now recorded in step 56's allowlist so the claim is testable rather than assumed. Contract version 4.5.0 → 4.6.0. |
| 56 | Enforce the two rules nothing was checking (rules 2.1, 2.2) | **done · Class A** | **Executed 2026-08-22.** `tests/no-literals.test.mjs`. Every other suite in this repository verifies that something **is** what it should be — a token resolves, a scale has ten steps, a pair clears AA. None of them can see a declaration that never reached for a token at all, which is why the six leadings in step 55 survived 54 steps here and 18 in `color.md` untouched: each step verified what it named, and no step had named them. The test walks all of `rux-ui/css` and `scheduler/css` and fails any `font-size`/`line-height`/`font-weight`/`letter-spacing`/`font` declaration whose value is not a `var()`, with four exempt files and a short allowlist, each carrying its reason in the file. **Exempt:** both `tokens.css` files (Tier 0 is where a literal is the point) and the two print surfaces, which §7.3 S2 already records as owed their own answer and which keep their literals behind `--print-*` and `--env-*` so they cannot reach a screen. **Allowed:** `line-height: 1`, `letter-spacing: 0`, and the single `font-weight: normal` in the Material Symbols block, which pairs with `font-style: normal` as a ligature reset while the real weight rides `font-variation-settings`' `wght` axis. **Deliberately not done:** the two remaining raw px sizes are listed as pending, not fixed — `trip-list.css`'s `14px` and `trip-request.css`'s `40px` both size an **icon**, and sizing a glyph off the type scale is the wrong axis. The icon scale that exists is 18/20/22px (`--rux-icon-sm/md/lg`), so 14 is below its floor and 40 far above its ceiling; publishing an `--rux-icon-xs` and a display size is `layout.md`'s call while that document still has the scale open. The allowlist is keyed to file and value, so the count cannot grow quietly in the meantime. |
| 57 | Give rule 2.2 the two clauses it was missing | **done · Class A** | **Executed 2026-08-22.** Step 56's allowlist described ~30 `line-height: 1` sites as "badges, emoji and icons". Auditing them for this step found **41 sites: 19 print (already exempt), 12 genuine glyph boxes, and 10 real text** — so the description was accurate for 12 and wrong for 10, and the wrong ones were hidden by it. Worse, the exception existed **only in a test's allowlist** and nowhere in this document, which is exactly the inverse-of-one-home failure **step 35** already recorded: a rule stated only in enforcement, with no canonical home to cite. Rule 2.2 gains both missing clauses. **(a) "A glyph box is not a type role"** — an icon, emoji, count badge or `::after` marker collapses its line box onto its glyph box so the mark centres in a fixed circle; that is box geometry, and it is the only legitimate `line-height: 1`. A site qualifies by rendering a **mark, not a word**. **(b) "A role's axes are adopted together"** — a role is five axes, and taking some while hand-rolling the rest is the same defect as a unitless leading reached by another route. It is the more common route: `.sched-scope-trip__section-label` reads `--rux-text-label-12-size`, `-weight`, `-color` and `-tracking`, then writes `line-height: 1` beside them, stating a role and contradicting it in one rule. `tests/no-literals.test.mjs` is rewritten to cite this paragraph and to key its exceptions **by selector instead of by value**: a closed `GLYPH_BOX` of 12, and a `PENDING_TEXT_RESET` of 4 that a new test asserts can only shrink. **Deliberately not done:** the two lists were **not** merged for convenience — keeping them separate is the entire repair, since one list is what let text hide among marks. |
| 58 | Pair the six text resets whose boxes are pinned (rule 2.2) | **done · Class B** | **Executed 2026-08-22.** The six of step 57's ten whose leading cannot move anything, because a fixed or minimum height already pins the box. **Three are one decision, already half-made:** `.rux-tab`, `.sched-mini-cal__date` and `.driver-assignment-card__response-state` are button-shaped controls — button font size, button height, button radius — that took `--rux-button-font-size` and stopped. `--rux-button-line-height` already existed, resolved to 20px, and was used on exactly one selector (`.rux-button`); these three now finish the pairing they started rather than adopt a newly-chosen value. `.sched-driver-grid__day-label` takes the same token. `.rux-input-group__suffix` and `.sched-scope-trip__po-coverage` take the Tier 0 pair `--rux-line-height-20`. **Before → after:** all six move from `line-height: 1` (14px) to **20px**. **Measured after the change, in a browser:** every one computes `line-height: 20px` inside a box of 32–44px — `.rux-tab` 44, `.sched-driver-grid__day-label` 40, `.rux-input-group__suffix` 40, `.sched-scope-trip__po-coverage` 36 (`--rux-field-height`), `.driver-assignment-card__response-state` 32 (`--rux-button-height-standard`) — so a 20px line box cannot force any of them taller. **No state needs an eyeball:** the visual result is unchanged by construction, which is why these six were separated from the four that move. **One measurement caveat:** `.sched-mini-cal__date` reported its box at 40px rather than its real 28px cell, because `--sched-mini-cal-cell-size` is scoped above the synthetic probe; 20px clears 28px either way, so the conclusion holds but the figure is not from its real context. **Deliberately not done:** the four sites that actually reflow are **not** in this step — see step 59. Splitting them is what lets this step claim "nothing renders differently" and mean it. Contract version 4.6.0 → 4.7.0. |
| 59 | Pair the three reflowing text resets; correct 2.2's colour clause | **done · Class B + Class A** | **Executed 2026-08-22.** Unblocked by the owner, on the grounds that containers will be brought to Geist standards anyway — which is **rule 2.2's own third paragraph**, written before this session: *where a container cannot fit the leading its role declares, the container is what changes.* The reflow was never a reason to hesitate; it is the rule working. **Class A first — the colour clause was wrong.** Step 57 wrote "a role is five axes" and required all five to travel together. `.rux-u-subtitle` in `rux-ui/css/base/card.css` takes `copy-14`'s size, weight, leading and tracking with `--rux-text-secondary` for colour, and is correct code; the clause as written made it a defect. Corrected to **four metric axes travel together, colour is separately selectable** — a role's `-color` is its default, not a mandate, which is why the system publishes `--rux-text-primary/-secondary/-disabled` at all. **Class B — three sites.** (a) `.sched-scope-trip .rux-field__label` was **deleted entirely**, not repaired: all four of its other declarations resolved to exactly what the base `.rux-field__label` already resolves to (`--rux-field-label-size` → size-12, `-weight` → 400, `-fg` → text-secondary, and a no-op `tracking-normal`), so the rule's only *effect* was the `line-height: 1` that broke the base's correct `--rux-line-height-16`. (b) `.sched-scope-trip__section-label` already read four label-12 axes and now takes the fifth. (c) `.sched-trip-itinerary__source` hand-rolled label-12's metrics in raw Tier 0 tokens and now reads the role for all four, keeping `--rux-text-disabled` — a deliberate emphasis choice the corrected clause permits, with the reason recorded beside it. **Before → after:** all three move from `line-height: 1` (12px) to **16px**. **Measured after the change:** each computes 12px / 16px / weight 400 / tracking normal — label-12's metrics exactly — with `.sched-trip-itinerary__source` retaining `oklch(1 0 0 / 0.28)` and the other two at `oklch(0.7079 0 0)`, confirming the deletion in (a) changed nothing but the leading. **States needing an eyeball:** the trip panel's section headings and field labels, and an itinerary stop's source line — each gains 4px per line, and the section label carries a `border-bottom`, so the rule beneath it drops with it. **Deliberately not done:** `.driver-assignment-card__time` is **not** in this step — see step 60. Contract 4.7.0 → 4.8.0. |
| 60 | A 24px tabular readout adapts to copy-24; record the standing default | **done · Class A + Class B** | **Executed 2026-08-22.** Answered by the owner as a standing instruction, not a one-off: *adapt content to the foundations; where a current element has no close match, pick a good option from the foundation and change it — this applies to all work going forward.* **Class A — the default is now written down**, as `README.md` **§2.6**, because it governs every foundation document and not just this one: an element whose values match no published option **changes to the nearest option**; it is not evidence the catalog is short. The reasoning on record: a foundation document is written against a measured source, an element against whatever was needed that afternoon, so on disagreement the element is the weaker claim — and *"this one is special"* is what every element says. Claiming a genuinely missing role now requires showing a need that **recurs**, that no published option can express, and that a downstream would hit too. This **corrected rule 2.2's closing sentence**, which had the default backwards: step 57 wrote that an unmatched element is evidence the catalog is missing a role. It usually is not. **Class B — the element moved.** `.driver-assignment-card__time` was 24px / weight 400 / `tracking-tight` / `line-height: 1`, which is `copy-24` on three metric axes and an improvisation on the fourth; it now reads the role whole. **Before → after:** size **24 → 24** and weight **400 → 400** (unchanged); leading **24 → 36px**; tracking **-0.02em → 0**. Note the leading delta is **+12px, not the +8** step 58's notes recorded — that figure came from pointing at `heading-24`, which is weight-600 and was the wrong role. `font-variant-numeric: tabular-nums` is **kept**: digit alignment in a column is not one of the five axes and no role speaks to it. **Measured after the change:** 24px / 400 / 36px / `normal` / `tabular-nums`, colour unchanged at `oklch(0.9466 0 0)`. **Also removed:** `--sched-driver-time-size`, whose only consumer was this rule — verified dead with a `background-color` probe rather than `color`, since `color` inherits and would have reported the token as still resolving. Not Class C: `tools/vendor-into.sh` ships only `rux-ui/css` and `rux-ui/js`, so no `--sched-*` name reaches a consumer. `tests/driver-assignment-card.test.mjs` pinned that alias and is **repointed at the role**, per its own comment's intent that the size be tokenised. **This closes the ten.** `PENDING_TEXT_RESET` is now empty and stays in the test as a place to argue a regression rather than quietly widen `GLYPH_BOX`: every `line-height: 1` left on screen is a mark, not a word. **States needing an eyeball:** the driver assignment card's time readout — it gains 12px of leading and loses its tightening, the largest single change in steps 55–60. Contract 4.8.0 → 4.9.0. |
| 61 | Put print's weights on the catalog; narrow the exemption (§7.3 S2) | **done · Class B** | **Executed 2026-08-22**, on the owner's direction that print is not permanently excepted — it must keep working as it does, but its elements map to the closest foundation options. **§7.3 S2 was wrong about the hard part.** It recorded print's 700/800 weights as "untokenized literals needing their own answer." There was no question to answer: `--rux-weight-500`, `-700` and `-800` have been published in Tier 0 all along, so all **14 sites** in `print-schedule.css` (eleven weights, three `14px`) became token references with **byte-identical computed values** — verified in the browser at 14px/700, 800 and 500 against the literals they replaced, with `--rux-size-14` resolving 0.875rem → 14px since print sets no root override. **The exemption is now narrowed rather than lifted.** `tests/no-literals.test.mjs` stops skipping the two print files wholesale: only `font-size`, `line-height` and colour remain permitted there, so **a literal `font-weight` on paper now fails like anywhere else** — verified by injecting one and watching the suite fail on it. **The three axes still open, and why each is open on the merits rather than by default:** (a) **`font-size`** — `print-schedule.css` uses `10px` in eleven places and the catalog floors at 12, so §2.6's "element adapts" means a **20% size increase on a dense printout**, which can change pagination — the one thing that must not change; and `trip-envelope.css`'s 7–32**pt** may be *more* correct than `rem`, since rule 2.1's stated justification is that a reader can raise their browser default and **paper has no such control**. (b) **`line-height`** — print sets `1` in 19 places never sorted into marks and words the way screen's 22 were. (c) **colour** — the `--print-` and `--env-` palettes are a deliberate two-stop ink system (every `-line` at `55% 0.12 h`, every `-tint` at `96% 0.025 h`) and remapping them onto the catalog's light-theme steps is a Class B change to every printed page. It also still carries **`--print-cyan-line`, a hue `color.md` step 17 retired**. **Deliberately not done:** none of (a)-(c) were attempted, because **this environment cannot verify printed output** — no preview, no paper — and ink density and pagination are exactly what a screen probe cannot see. Doing the provable part and stopping is the honest split. Contract 4.9.0 → 4.10.0. |
| 62 | Doc sync — reclassify step 23 (drift) | **done · Class A** | **Executed 2026-08-22.** A review of what remained across the set found this document overstating its own debt. **Step 23 was deferred for a reason that stopped being true.** Its blocker was that the three off-ladder rungs had no consumer; **step 50 published all three** eleven steps later, along with the `copy-13`, `copy-20` and `copy-24` roles the note said did not exist — verified against `tokens.css` rather than inferred. The step's work was done by a later step and the row was never reclassified, so the Status block read **2 deferred** when only step 4 still is. **Step 4 was re-checked in the same pass and its premise holds**: nothing in `rux-ui/css` caps a prose measure and `--rux-measure-*` has no consumer, so it stays deferred correctly. **Recorded as a numbered step rather than a quiet edit**, per step 21 — a log that silently corrects its own history is worth less than one that shows the correction — and step 23's original note is kept beside its new status for the same reason. **Patch, not minor:** no token, rule or value moves and nothing re-renders; this is a status correction. Contract 4.10.0 → 4.10.1. |
| 63 | Correct rule 2.12's Q2 — interactivity is not the button test | **done · Class A** | **Executed 2026-08-22.** Found by acting on the rule rather than reading it: the trip-panel type pilot reached `.sched-scope-trip__doc-name`, which sits inside a `<button>`, and Q2 ("Is it interactive?") fires before Q3, so the tree as published sent it to **button-14 at weight 500**. **Two shipped components already contradicted that.** `.rux-menu__item` and `.rux-side-nav__item` are both interactive, both keyboard-operable, and both read `--rux-text-label-14-*` — weight **400** — and have since before this tree was written. So the tree disagreed with the system it describes, and the system was right: the `button` family is what the `--rux-button-*` control contract reads (`tokens.css:1405-1407`, `1529-1530`), i.e. a control's *own* label, not any text with a clickable ancestor. Q2 now asks that, and the paragraph below the list names the three interactive cases that still take **label**. **Nothing re-renders:** no token, value or class moves, and the two components already matched the corrected rule — this brings the *document* to the code, not the code to the document. **Deliberately not done:** (a) `.rux-menu__item` and `.rux-side-nav__item` were **not** changed — they were never wrong, and "fix the components to match the tree" would have pushed two core components to weight 500 on the authority of a sentence nobody had tested; (b) no `control-label` family or fifth question was added — §2.12 publishes four families and the correction needs no fifth, only a sharper Q2; (c) the `button` family's own values were **not** touched. **Minor, not patch:** unlike step 62 this moves a rule's meaning for every future call site, even though it moves no pixel. Contract 4.10.1 → 4.11.0. |

---

## 6. Open questions

**Q12 — Does the adopted catalog count as a named consumer? — ANSWERED (step 50): yes.**
Branch (a), by the owner, 2026-08-21. §7.3 is amended, and step 50 published the sixteen
styles the rule had kept out. Original text follows.

**Q12 — Does the adopted catalog count as a named consumer?** §7.3 holds that a new rung
needs a named consumer before it is added, and it has done its job: it stopped 30, 36, a
10px rung and a 9px pill. It has also stopped **16 of the catalog's 29 styles** — heading
48–72, button-16, label 20/16/13, every mono rung, copy 24/20/18/13 — because no call site
here reads them (rule 2.12, step 49). The owner's stated goal on 2026-08-21 is to conform to
Geist **exactly** under this prefix, and "exactly" and §7.3 cannot both hold. **Two
branches.** *(a)* Amend §7.3: a rung the adopted catalog publishes has a named consumer —
the catalog — and publishing it is adoption, not invention; locally invented rungs still
need one. Step 50 executes, Class A, nothing re-renders, and the `PENDING` mechanism holds
the unread roles honest. *(b)* Keep §7.3 as written, record the system as *exact on the
thirteen it publishes*, and close step 50 as declined. **Recommendation: (a).** A consumer
that vendors this system and reaches for `text-heading-48` should find it, and the cost —
roughly 90 unread custom properties — is the catalog's own size, not this system's
invention. *Blocks step 50.*

**Q11 — Does the trip bar keep a sub-catalog density tier? — ANSWERED (step 43): no.**
No departures are permitted, so 11px goes and XXS collapses into the default tier. The 25%
density gain is gone and the cost is recorded in step 43. Original text follows.

**Q11 — Does the trip bar keep a sub-catalog density tier?** The catalog floors at 12 and
step 42 moved every other 11px consumer up, leaving two: the **XXS** row (11/12) and the
**XS** bus label (11/12). Retiring the rung there is not a like-for-like substitution —
**XXS row 11/12 becomes 12/16, which is precisely what XS already is**, so the densest view
disappears and the three-tier density control becomes two. The XS pill, at 12, also stops
being quieter than its own 12px row, which is the separation step 30 built it for.
**Three branches:** collapse XXS and accept two tiers; keep 11 for the density tiers alone
and record it as a **named departure** in §2.12, the way heading-stops-at-40 is; or keep the
tier and find its separation in weight and fill rather than size, which is what step 30
already did for the pill at XXS. This is a **product decision about a shipped control**, not
a typography one — the scale can express any of the three. *Blocks the second half of the
size batch and the Class C retirement of `--rux-size-11` / `--rux-size-xxs`.*

**Q10 — Does rule 2.13's "track 0" govern uppercase labels? — ANSWERED (step 40).**
The question is moot for screen UI: the uppercase itself was dropped, so no uppercase label
remains to govern. The branch taken was the third, sentence case, because it is the only one
that needs no departure. Print keeps its uppercase as a document convention, scoped to
`trip-envelope.css` and recorded in step 40. *The first branch's evidence arrived anyway
(step 49): the catalog's `label-12` specimen reads "Label 12 with Strong, AND CAPS" — the
capitals are in the data, `text-transform` is `none`, tracking is 0. Geist tracks its
uppercase at 0, so the answer taken would have been conformant either way.* Original text
follows.

 The rule was measured on the
Geist specimens, and **whether the catalog publishes an uppercase label at all is not
recorded** — so applying it to uppercase text extends it past its evidence, which is the
defect step 37 had to correct in 2.14. Tracking on uppercase is a legibility convention
rather than decoration: uppercase letterforms carry no ascender or descender variation, so
word shape does less work and the letters need opening. Ten call sites wait on this, listed
in step 39. **Three branches:** confirm by measuring whether Geist ships uppercase labels and
what they track; keep the tracking and record it as a **third named departure** in §2.12
beside heading-stops-at-40 and label-20-takes-24; or drop the uppercase itself and take
sentence-case labels, which is the only branch that needs no departure at all. *Blocks the
uppercase half of the tracking migration and the Class C retirement of
`text-label-12-wide`.*

These are design decisions, not engineering ones. Each blocks at least one §5 step. Answer
them **in this document** — an answer recorded anywhere else does not authorize anything.

**Q1 — How does a surface declare its base size?** *(revised by §7.3)* `body` is 16px; `text-body` is 14px and is described as
"one step below the document base." In practice buttons, inputs, table cells, menu items,
and labels are all 14, so the 16px default is inherited by almost nothing dense — §7.2
measures 89% of the app on 14 and 12. But the portal reads 16 nearly as often as 14, and
print runs at 10. A single global base is false for at least two of the four surfaces. The
real question is what mechanism lets a surface declare its base, and which roles ride that
base rather than pinning an absolute rung.

> **Answered — 14px is the base; no new mechanism.** The role layer had already decided
> this: `--rux-text-body` has been 14/20 since before this document, described as "one step
> below the document base." Setting `body` to 14/20 makes the document base and the dense-UI
> base the same number, which is what 92 explicit `--rux-size-sm` declarations already
> assumed. A surface needing a different base overrides `body` — the portal already does
> this by reaching for `--rux-size-md` where it renders prose, and print (S2) gets its own
> document. **No `--rux-base-*` indirection was introduced**: it would have been vocabulary
> with one consumer, which §7.3 forbids. Executed as step 8.

**Q2 — What is the prose leading at 14px?** This is a genuine conflict between two rules,
and one of them must give:

- **20px** keeps rule 2.2's 4px grid intact and reaches a 44px row on-grid (12+20+12), but
  1.43 is tight for multi-line paragraphs.
- **22px** is comfortable for prose at 1.57, but is off-grid and forces an off-grid 11px
  row padding to reach the same 44px row.
- **24px** stays on-grid and comfortable at 1.71, but is loose for dense UI and equals the
  16px role's leading, flattening the distinction between them.

> **Answered — 20px, and the Copy/Label distinction is recorded as having no metric
> expression at this base.** 1.43 is correct for dense UI and is what `--rux-line-height-sm`
> already is; true multi-line prose lives at 16/24 on the portal, not in the scheduler. The
> one exception is a bare `<p>`, which keeps the 24px leading — it is prose, not chrome — so
> `p` renders 14/24 and is the single place the base's size and leading are not a matched
> pair. That is **named in the stylesheet as an exception**, per rule 2.10. Deliberately did
> **not** mint a `--rux-line-height-prose` (22px) rung: §7.3 requires a named consumer, and
> the consumer is the portal, which has not had its foundation pass yet.

*Blocked steps 8 and 12 — both now closed.*

**Q3 — Is the weight ceiling 500 or 600?** Two weights (400/500) is the tighter system and
matches `--rux-badge-font-weight`. 600 is what the heading roles specify today. Whichever
wins, both the element defaults and the role tokens must state it.

> **Answered — 600, and weight is a property of the role rather than of the size.** Three
> weights are published: 400 for copy and labels, 500 for controls, badges and inline
> emphasis, 600 for headings. This was settled by reading the **Geist catalog** the system's
> own face comes from, on Vercel's published specimens: `text-heading-*` resolves to 600 at
> **all ten sizes from 14 to 72** — a 14px heading is 600 exactly as a 72px heading is —
> while `text-button-*` is 500 and `text-copy-*` and `text-label-*` are 400 at every size.
> `heading-section` and `heading-panel` were already conformant; `heading-page` at 400 was
> the outlier and moved. Recorded as rule 2.11. **Deliberately not adopted:** a 500 ceiling,
> which was the proposal on the table before the catalog was read and which the 24px and
> 16px comparison had made look cleaner — the catalog is evidence about the face this system
> actually renders in, and an eye preference is not. Also not adopted: vercel.com's own
> 400/450/500 homepage usage, which carries no 600 at all but is a marketing surface rather
> than the system, and which uses intermediate weights (450, 550) that only a variable axis
> can express. **Worth recording for any future rung question:** Geist on Google Fonts is a
> single variable file with a continuous `wght` 100–900 axis, so requesting more weights
> costs **zero additional bytes** — all four of this project's requested weights resolve to
> the same `.woff2`. Payload is therefore not an argument for or against any ceiling; only
> restraint is. Executed as step 6.

*Blocked steps 6 (done) and 7 — which now turns on **Q6** alone.*

**Q4 — Two emphasis tiers or three?** Three (primary / muted / faint) is documented; two
are implemented. Adding the third means specifying a real lightness in both themes and
verifying contrast at the small sizes that would use it.

> **Answered — two.** Settled the same way Q3 and Q5 were, by measuring the catalog rather
> than choosing. **Geist's colour scale publishes exactly two text colours**: step **9 is
> "secondary text and icons"** and step **10 is "primary text and icons"**. The other eight
> steps are backgrounds (1–3), borders (4–6) and high-contrast backgrounds (7–8) — none is a
> third text tier. Measured on the dark theme: `--ds-gray-900` is **L63** and
> `--ds-gray-1000` is **L93**, against this system's secondary **L60** and primary **L90**,
> so the two systems already agree to within three points and the third tier was never
> anything but documentation. **The code was right and the docs were wrong**, which is the
> reverse of the usual direction and worth stating plainly. Deliberately **not** adopted:
> inventing a real value for `faint`, which would have meant specifying a lightness and
> proving contrast at the small sizes for a tier the reference system does not have.
> Executes as step 9, which is **Class C** — see its note for the migration. *Blocks step 9.*

**Q5 — Does the scale gain a 13px rung?** There is no 13px today; the scale steps 12 → 14.
A 13px rung is useful for route lines, chip text, and step numbers, but it is a permanent
addition to shared vocabulary and it narrows the gap that makes 12 and 14 distinguishable.

> **Answered — yes.** Decided by the catalog, not by taste: Geist publishes **`label-13`
> (13/16)**, **`copy-13` (13/18)**, and mono variants of both, measured off the rendered
> specimens. §7.3 weakened the case "unless S4 produces a consumer"; the face's own system
> produces one, and the rung is part of the ramp this document adopted rather than an
> invention. **What is still open is only its name** — the ladder has no slot between `xs`
> (12) and `sm` (14). That is **Q8**, and it gates step 23. Deliberately **not** adopted:
> the argument that 13 narrows the 12/14 gap. It does, and the catalog ships it anyway,
> because Label and Copy at 13 differ in leading (16 vs 18) where 12 and 14 differ in size —
> the gap is carried by the role, not by the rung.

*Blocked nothing; now lands with step 23.*

**Q6 — Is there a responsive story?** The scale is fixed at all viewport widths today. A
36px page heading at 375px is a decision no one has made explicitly. Options: fixed and
the layout reflows; a single step-down at a breakpoint; or fluid via `clamp()`. *Blocks
step 7 and any future heading work.* **Evidence added by step 21:** at 375px the
`maintenance.html` `h1` renders 36/600 across two lines at 351px inside a 375px viewport —
no overflow, but no margin either, and 600 makes that string wider than 400 did.

> **The mechanism is answered; the mapping is not.** Measured rather than read, because the
> catalog has no page on this — `vercel.com/geist` publishes four foundations
> (Introduction, Colors, Typography, Materials) and **none of them is about breakpoints**,
> which is itself the first half of the answer.
>
> **The scale does not move.** Every published class resolves **byte-identically at 280px
> and at 1440px** — `text-heading-72` is 72px at both, `text-copy-16` is 16/24 at both.
> There is no `clamp()`, no `vw`, and no media query anywhere in the type system.
>
> **The call site moves instead.** The page carries breakpoint-scoped classes —
> `md:text-heading-40` and `md:text-copy-20` — so an element renders one *published rung*
> below the breakpoint and a *different published rung* above it. The token never changes;
> the choice of rung does. That is option (b) of the three above, implemented at the call
> site rather than inside the token, and it is strictly better than the other two: a 40px
> rung stays 40px everywhere, so nothing downstream has to ask "40 at which width".
>
> **Only display type carries variants.** The responsive classes found are on the large end
> (`heading-40`, `copy-20`); `label-14` and `copy-16` have none. UI chrome is fixed at every
> width and only display type steps down.
>
> **What is left to decide** is therefore not the mechanism but the *mapping*: which roles
> get a small-screen rung, and which rung.
>
> **The third variable — at what breakpoint — is not open**, and this section's earlier
> claim that the system has no breakpoint vocabulary was wrong (step 35).
> `tests/breakpoint-contract.test.mjs` records a **closed set of four**, each with its
> purpose stated and an explicit ratchet requiring a fifth to be added on purpose: **500**
> (the shared mobile breakpoint — touch-target minimums and the drawer's mobile mode),
> **580** (the floating-window frame contract on phones), **620** and **760** (both header
> work). **500 is the standing candidate** for any type step-down, and the test's own note
> that reusing one costs nothing means the mapping decision need not open the set.
>
> What the set lacks is a **canonical home**. Per `CLAUDE.md`'s one-home rule an enforcement
> test SHOULD cite the section it enforces; this one cites nothing, because no section
> exists — the rule's only statement is a test. So what `spacing.md` (or a `layout.md`) owes
> Q6 is a *home for a set that already exists*, not the set itself. That is a smaller debt
> than this section previously claimed — and it is now paid: [`layout.md`](layout.md) §1.1
> publishes the set, and `tests/breakpoint-contract.test.mjs` cites it. **500px is a citable
> published width**, so the mapping decision has one to name. *Still blocks step 7, on the
> mapping rather than the question.*

**Q7 — Does the scale reach below 10px, and if not, what may a density tier do?**
`--rux-size-xxs` (10px) is the smallest rung. The trip-bar's XXS density tier sets 10px row
text and needs a pill quieter than it, which the scale cannot express — so the tier derives
`row-font-size × 0.85` and lands on 9px, off the scale and off the grid (D13). Three
branches, and they are not equivalent: **mint a sub-10px rung**, which is Class A but adds
shared vocabulary for one consumer and invites 8px next; **name the exception**, amending
rule 2.4 so a density tier MAY derive proportionally within a stated floor, which keeps the
scale honest about what it does not cover; or **drop the requirement**, letting the XXS
pill match its row text and accepting that the smallest tier has less hierarchy than the
other two. The third is the only one that changes what renders. *Blocks step 20; D13 stays
open until it is answered.*

> **Reframed, not answered, by the ramp decision.** The adopted catalog **floors at 12**.
> `--rux-size-xxs` (10px) has no Geist counterpart and the 9px pill is two rungs below
> anything published, so branch A can no longer cite the catalog — which was the evidence it
> leaned on. This does not make 10px wrong: §7.3 already holds that the base is a property of
> the surface, and S1 is denser than the marketing site the catalog was drawn from. It does
> mean the question is now **"does S1 get a documented sub-catalog floor, or does the density
> control stop below 12"**, and that retiring `--rux-size-xxs` is Class C with four
> consumers. Carried by step 28.
>
> **Complicating evidence, measured on the Badge page (not in the type catalog).** Geist's
> own components go **below** the catalog floor: `Badge` at size Small renders **11px/20 at
> weight 500 with +0.2px tracking** — a rung the type scale does not publish, with positive
> tracking added to hold it legible. Medium is 12/24 and Large is 14/20, both on-catalog. So
> "the catalog floors at 12" is true of the **type scale** and not of the **components**, and
> the reference system's actual practice is that a dense component may go under the scale
> **with compensating tracking, named at the component**. That does not vindicate the trip
> bar's `clamp()` — a proportional shrink yielding 10.2px and 11.9px is off-grid and
> fractional whatever the floor is — but it does mean a 10px chrome rung and a sub-12
> component value are not automatically off-system. They have to be *named*, as Geist names
> its badge.
>
> **Answered — the floor is 11, and nothing derives.** Four parts, executed as step 30.
> **(1)** `--rux-size-xxs` moves **10px → 11px**, which is exactly Geist's Badge Small rung;
> no name changes, so no Class C, and `--rux-size-xxs` stops being a rung the catalog has
> never heard of. **(2)** Rule **2.14**: below 14px, positive tracking is mandatory. **(3)**
> The trip bar's `clamp()`s are deleted and replaced by **three hand-set specs**, one per
> density tier — the shape Geist publishes for Badge rather than one formula evaluated three
> times. **(4)** At the XXS tier, where a 12px row leaves no room for two legible sizes, the
> pill matches the row's size and separates by **weight and its own fill** instead, which
> rule 2.3 already licenses. **The branch that removed a published token was never needed**:
> `--rux-size-xxs` was moved, not retired, so step 28's Class C proposal is moot.

**Q8 — What are the off-ladder rungs called?** Rule 2.12 needs a **13px size** and **18** and
**36** leadings. The t-shirt ladder has no slot between `xs` (12) and `sm` (14), and none
between `2xl` (32) and `3xl` (40). Three options, none free: extend the ladder with compound
names (`xs-plus`), which is ugly but local; renumber to px-derived names matching the catalog
(`size-13`, `size-18`), which is honest and **Class C on every existing name**; or keep
t-shirt names where they exist and use px names only for the new rungs, which is a mixed
convention and the worst of both. A primitive's name is Class C to undo, so this is decided
before step 23 executes, not during. *Blocks nothing today: step 23 is deferred for want of a
consumer, and step 25 turned out not to need the 18 and 36 leadings, because no role sits
where they would apply. Answer this with the first role that wants one of the three rungs, not
before.*

> **Answered — numeric, and it is not a separate decision.** The catalog names **everything**
> by number: type classes are `text-heading-72`, `text-copy-13`, `text-label-13-mono`, and
> the colour tokens are `--ds-gray-100` … `--ds-gray-1000`, `--ds-blue-700`,
> `--ds-background-100`. There is **no t-shirt name anywhere in Geist**. So "what is the 13px
> rung called" has the answer **13**, and the three options above collapse: option 2 is what
> the reference system does.
>
> **This makes Q8 part of step 31 rather than a question of its own.** Step 31 already
> renames the type *classes* to `text-{family}-{size}`; a numeric primitive ladder
> (`--rux-size-13`, `--rux-size-18`) is the same decision applied one tier down, and doing
> half of it would leave numeric classes reading t-shirt tokens. **Both are Class C on every
> existing name**, which is why they belong in one proposal and one migration. Step 23 stays
> deferred regardless: naming it is no longer the blocker, having a consumer still is.

**Q9 — Does mono step down a rung, or hold its size?** Rule 2.4 says mono steps down one rung
from the sans beside it, on the reasoning that a monospace face reads larger at matched
nominal size. The catalog disagrees: `label-14-mono` is **14px**, `label-13-mono` is 13px,
`copy-13-mono` is 13px — mono holds its sibling's size and, at 13, takes *more* leading (20
against Label's 16). Both may be right about different objects: 2.4 governs inline `code`
**inside** running copy, where the surrounding size is the reference, while the catalog's mono
styles are **standalone** labels with no sans beside them. If that is the resolution then 2.4
is not wrong, only under-scoped, and it should say so. *Blocks nothing today; blocks any mono
role.*

> **Answered — that is the resolution.** Rule **2.4 is under-scoped, not wrong**, and now
> says so: it governs `code` **inside running copy**, where the surrounding size is the
> reference and a same-size mono reads too large. A **standalone** mono role — a mono label
> or mono copy with no sans beside it — holds its sibling's size, as the catalog does
> (`label-14-mono` is 14px, `copy-13-mono` is 13px). Deliberately **not** adopted: changing
> the inline-code rule to match the catalog. The catalog has no inline-code style to compare
> against, so it is silent on that case rather than contradicting it.
>
> **The last sentence was wrong (step 49).** The catalog's `text-copy-13-mono` carries the
> usage line *"Used for inline code mentions"* — 13/18 — so it is not silent, it
> contradicts. The standalone half of the answer stands; the inline half was D20, and step
> 52 brought `code` onto the catalog's rung.

---

## 7. Surface demand

Rules must answer to real surfaces. This section inventories what the consuming surfaces
actually ask for, measured rather than assumed. It is evidence, not decision — §6 is where
the decisions go.

### 7.1 There are four surfaces, not two

| # | Surface | Character | Renders |
|---|---|---|---|
| **S1** | Scheduler — screen | Dense operational UI | `index.html`, `scheduler/css/` |
| **S2** | Scheduler — print | Schedules on paper | `scheduler/css/features/print-schedule.css` |
| **S3** | LN portal — screen | Document reading + interactive guide runner | `infor_ln_docs/portal`, vendored `rux-ui/` |
| **S4** | LN documents — export | Markdown → HTML/PDF | `_standards/`, `render-style.css` |

The screen/paper split is a real axis and neither the scale nor the roles acknowledge it.
S2 and S4 are the two surfaces where the reader cannot zoom, cannot toggle a theme, and
where physical size — not rem — is what matters.

### 7.2 Measured demand

**S1 · Scheduler screen.** Of ~167 tokenized `font-size` declarations in `scheduler/css/`:

| Rung | Uses | | Rung | Uses |
|---|---|---|---|---|
| `sm` 14 | 92 | | `xl` 20 | 3 |
| `xs` 12 | 56 | | `lg` 18 | 1 |
| `md` 16 | 8 | | `4xl` 36 | 1 |
| `2xl` 24 | 5 | | `xxs` 10 | 1 |

**Two rungs carry 89% of the app.** `3xl` (30) has no app consumer at all. Weight is
effectively single-valued: 103 uses of `--rux-weight-400` against 2 of 500 and 2 of 600.

**S2 · Scheduler print.** Fully untokenized: 11 literal `10px`, 3 literal `14px`, and
**all ten** of the app's raw `font-weight: 700`/`800` declarations live in this one file.
Every weight escape above the ceiling in the entire application is print. The type system
has never served this surface, so it built its own.

**S3 · LN portal.** Consumes `--rux-size-*` properly. Demand is flatter than the app's —
roughly 12 uses of `xs` (12), 13 of `sm` (14), 10 of `md` (16), 5 of `xxs` (10). It also
carries its own markup vocabulary the design system does not publish: `ln-session-code`,
`ln-status`, `ln-gap`, `ln-record`, `ln-branch`, `step-control--button`,
`step-control--menu`, `step-control__where`.

**S4 · LN documents.** Governed by `_standards/guide-markup.md`, which specifies nine
inline roles plus status and gap, on two independent axes (colour = what to do with it,
form = what kind of thing it is).

### 7.3 What the demand implies

**The base size is a property of the surface, not of the system.** S1 is a 14/12 system
where the 16px `body` default is inherited by almost nothing. S3 reads 16 nearly as often
as 14, because it renders prose rather than chrome. S2 is a 10px system. A single global
base cannot be true for all of them, and asserting one is what forces every surface that
disagrees to escape the scale — which is exactly what S2 did. This revises **Q1**: the
question is not "14 or 16" but "what is the mechanism by which a surface declares its
base, and which roles ride it."

**Nine rungs serve a four-rung reality.** 14, 12, 16, and 24 cover essentially everything
on screen. 18 and 30 have almost no consumer. This is not an argument to delete rungs — a
system ships whole ladders — but it is an argument that new rungs need a named consumer
before they are added, and it weakens the case for a 13px rung (**Q5**) unless S4 produces
one.

*Amended by Q12 (step 50).* **A rung the adopted catalog publishes has a named consumer —
the catalog.** Publishing it is adoption, not invention, and "a system ships whole ladders"
is the sentence above applied to the ladder this system adopted. The rule still governs
everything the catalog does not publish: a locally invented rung, leading, or role needs a
call site that reads it before it is added, and the `PENDING` list in
`tests/typography-roles.test.mjs` keeps the published-but-unread roles honest.

**Print needs its own answer, not a smaller copy of the screen answer.** Paper has no
theme, no zoom, and a fixed physical size, so `rem` buys nothing and `pt` is the honest
unit. Whatever S2 and S4 get, they should get deliberately.

### 7.4 Contradictions the mapping surfaced

These are between existing documents, and predate this one.

| # | Contradiction |
|---|---|
| **X1** | **Resolved — see below.** `guide-markup.md` §2.2 requires that a marker "never changes the face, the size or the weight" — every fragment keeps the step's 14px regular. The proposed type system sets button, route, and status chips at **13px** and run-record values at **weight 500**. |
| **X2** | `guide-markup.md` §2.1 assigns **amber** to gaps and prerequisites and states that **red is deliberately unassigned**, reserved for a genuinely destructive warning. Both renderers use **red** for the gap marker (`--red`, `--warning`), and the proposed type system additionally renders Prerequisite in **green** — a colour §2.1 assigns to confirmed status. |
| **X3** | Neither renderer defines an amber token at all. The colour axis `guide-markup.md` specifies cannot be expressed by either stylesheet that renders it. |
| **X4** | The nine `guide-markup.md` inline roles are implemented three times independently — as `.m-*` classes in the proposed type system, as `ln-*`/`step-control*` components in the portal, and as unstyled markdown in the export. Three implementations of one spec, and §7.4 X1–X3 show they have already drifted. |

**X1 is resolved: this document wins, and what it says is what `guide-markup.md` already
said.** The rule "a marker never changes the size or the weight" is a statement about type
behavior, so it falls inside this document's scope — and it is rule 2.5 restated for inline
markers. Both specs agree; the **proposed type system was the party in the wrong**. Inline
markers therefore take the step's own size and weight, and the 13px chip text and
weight-500 run-record value do not survive into the adopted system. Recorded as step 14.

**X2 and X3 are not this document's to resolve.** Which colour a gap marker takes is a
mapping, and `guide-markup.md` owns it — it says amber, and it is right that red should
stay reserved. That amber does not exist as a token is a defect in the **colour**
vocabulary, and it belongs to `docs/foundations/color.md` when that document is written.
Logged here only so the finding is not lost.
---

## 8. Controlled evolution

The amendment classes (A · additive, B · behavioral, C · breaking), the Class B protocol,
the conformance line, and the versioning rules are **shared by every foundation document**
and live in [`README.md`](README.md) §2. This document follows them without exception, and
deliberately does not restate them — §2 is 68 lines of machinery of which five mention type
at all, so a copy here would be duplication by construction.

---

## Known drift

- `README.md` § Typography has been a pointer since step 16 — it names what is ruled and
  states no values, so it can no longer drift on a value. *(Until step 49 this bullet still
  described its pre-step-16 state, in which it published a flat display tracking and a wide
  overline tracking this document had since retired.)*
- **This document's own §3 is the drift risk now.** Steps 7, 33, 40, 41, 45 and 47 each
  moved code and none re-read §3; `tests/foundations-contract.test.mjs` counts log states
  and reads no prose, so nothing fails when §3 or the Status block's pick-up list goes
  stale. Step 49 re-dated the verification rather than adding a prose test, because a test
  that parses rule prose is a second statement of the rule. The honest control is the
  convention step 49 sets: **a step that moves a value §3 states edits §3 in the same
  change**, the way README is corrected in the same step.
- `docs/audit/design-system-audit.md` § 5 rule 6 ("Tokens only, both themes") and rule 10
  ("Docs cite tokens, not numbers") both apply to type and are not restated here. That
  document remains canonical for enforcement tests; this one is canonical for the rules
  those tests enforce.
