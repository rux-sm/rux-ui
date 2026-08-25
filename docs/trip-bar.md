# Trip Bar — Design Specification

**Contract version 1.5.0** · rewritten 2026-08-24 · step 18 (rule 2.12 executed) same day

```
Conforms to: Rux UI Foundations — Typography 5.0.0
             Rux UI Foundations — Layout     2.12.0
             Rux UI Foundations — Color      3.0.0
             Rux UI Foundations — State      1.8.1
             Rux UI Foundations — Naming     1.18.0
             Rux UI Foundations — Motion     1.6.0
```

**Status:** 13 done · 4 ready · 1 open · 2 superseded · 5 open questions · 18 known defects (12 resolved: D1–D4, D6, D11–D14, D16–D18; open: D5, D7–D10, D15).

*Correction, 2026-08-24:* the two previous revisions of this line claimed 16 and then 17
resolved, counted by incrementing rather than by recounting — the actual figure was 10, then
10 again (step 11 closed D12, its increment was right, the base was not). This is the same
rollup failure `color.md` step 21 repaired elsewhere, reproduced here by hand. The list
above is now enumerated so the next edit recounts instead of incrementing.

---

## 0. What this document is

The trip bar is the scheduler's densest object: a compact card on the week grid, one per
bus assignment, thirty or more on screen at once. This document is its **downstream
specification** in the sense `foundations/README.md` gives that word — the foundation
documents own the vocabulary and its behavior, and this document owns **the mapping of the
trip bar's own roles onto that vocabulary**. Where the two disagree, the foundation wins and
this file is corrected in the same change.

It states **no design values that a foundation document already publishes.** Where a rule
below carries a number, that number is either a foundation token's name or a measured
consequence of one. A need the foundation vocabulary cannot express is a defect *there*,
fixed by an amendment there — never by this document escaping the scale.

**The previous version of this file was a values table and it went stale.** It published
135px, 4px, 18px, 8px radius and a set of raw `oklch()` literals, and by 2026-08-24 roughly
half of those figures no longer described what rendered — while the 90-line header comment
in `scheduler/css/features/trip-bar.css` had quietly become the real specification. That is
the one-home failure `CLAUDE.md` exists to prevent, observed rather than hypothesized. The
rewrite states **rules and token names**; the CSS keeps its comments as rationale beside the
values they explain.

### 0.1 The specimen

[`trip-bar-specimen.html`](../trip-bar-specimen.html) renders every tone against every state,
in both themes, with no Supabase behind it. **It exists because this document's steps demand
eyeballs and the live board cannot supply them:** a given week shows whatever trips happen to
be booked, so "check all five hues in both themes" was unverifiable in practice, and the
board had never been looked at that way. The first time it was — step 4 — it produced D13.

It is not a gallery entry. `gallery.html` is the contract surface for portable `.rux-*`
blocks and the trip bar is an application block, so this is a feature specimen and lives
beside the page it specimens. Serve with `node tools/serve.mjs` and open
`/trip-bar-specimen.html`. Its stylesheet links carry `?v=` and are managed by
`tools/check-cache-busters.sh` like every other page.

---

---

## 1. Anatomy

An `<article role="button">` built imperatively by `createTripBar()` in
[`js/components/trip-bar.js`](../js/components/trip-bar.js). Styling lives in
[`scheduler/css/features/trip-bar.css`](../scheduler/css/features/trip-bar.css); the
`--sched-trip-bar-*` token block is in
[`scheduler/css/tokens.css`](../scheduler/css/tokens.css); the two density tiers are
modifiers of `.sched-scheduler` and live with that block in `layout/scheduler.css`
(`naming.md` rule 2.1).

### 1.1 The scan rows

Seven rows, top to bottom. Each is one line. Five of the seven are independently
togglable per user preference while the bar is collapsed; **destination and time are never
optional**, and selecting a bar shows all seven regardless of preference.

| # | Row | Element | Carries |
|---|---|---|---|
| 1 | Destination | `__destination` | where the bus is going; `__summary-end` right (paid badge, then the bus reference — step 10) |
| 2 | Client | `__client` | customer, or a passenger count when self-organized |
| 3 | Contact | `__contact` | booking contact name and phone |
| 4 | Notes | `__notes` | free-text operational callout |
| 5 | Reqs | `__reqs` | leg marker left, pending icons right — the bus marker left this row at step 10 |
| 6 | Time | `__time` | departure · spot · return, three grid columns |
| 7 | Drivers | `__drivers` | assigned and unassigned roles |

### 1.2 The parts that are not rows

| Part | Element | Appears |
|---|---|---|
| Action toolbar | `__actions` | on selection — five ghost icon buttons |
| Details drawer | `__details` | on expand — a labelled billing grid |
| Conflict banner | `__conflict` | when the assignment conflicts |
| Stripe layer | `__stripe-layer` | on one-way and split-trip legs |
| Head / tail | `__head`, `__tail` | multi-day only: day-1 card and continuation rail |

### 1.3 The two engines

**Sizing.** Every row reads one size/leading pair. The leading *is* the row height — no
gap, no per-row padding — so collapsed height is
`row-leading × visible-row-count + inset × 2`, where the row count is written by
`recomputeTripBarRowCount()` as the five row preferences toggle. Icons read the same
leading, so an icon is always exactly its row's height.

**Colour.** `--_tone` resolves in three steps: the categorical `data-trip-bar-color` hue if
the trip carries one, else `--sched-trip-bar-unconfirmed-tone` when unconfirmed, else
`--sched-trip-bar-confirmed-tone`. Each of those seven tones is one catalog step per theme
(rule 2.12); the head surfaces read the tone directly, the tail derives by alpha, and the
pointer states composite the published overlays on top.

---

## 2. Rules

### 2.1 Hierarchy is colour. Never weight, never size.

Every string in the bar answers `typography.md` rule 2.12's tree at question 3 — *is it a
single line of UI text?* — so **every row is Label family**. Label is **400 at every rung**
(rule 2.11), and 2.11 is explicit that *"weight MUST NOT be varied to compensate for size;
separating two levels is what the size scale and rule 2.3 are for."*

All seven rows therefore take **one Label rung**, and separation comes from a three-tier
colour ladder:

| Tier | Token | Rows |
|---|---|---|
| Primary | `--rux-fg-on-accent` | destination, time values, driver names, req icons |
| Secondary | `--rux-fg-on-accent-muted` | client, contact, paid label |
| Tertiary | `--rux-fg-on-accent-subtle` — **renders as the secondary tier since step 18** | time separators, empty-value placeholders |

**The ladder is two inks deep, not three, and that is the resolved form of D13.** On the
per-theme rest step rule 2.12 chose, the primary label and the 87% muted tier clear 4.5:1
on every tone in every state; a third, fainter ink does not clear anywhere in light at any
step, so the subtle token stays in the markup but resolves to the muted ink, and the
tertiary voice is carried by position and content instead. The original three-opacity
ladder (75%/55%) cleared AA on **no** fill at 700 — colour-only hierarchy and AA were in
direct tension, and that tension was the cost of Q1's deferral rather than an argument
against it: the size scale separates levels without spending contrast, which is what rule
2.11's evidence says colour cannot do at those opacities.

**Status colour is a fourth channel, not a fourth tier.** Notes take
`--sched-trip-bar-notes-fg`, a per-theme warning ink (amber-900 dark / amber-1000 light —
step 20; they read `--rux-warning-on-vivid` before that, which is the near-black for text
*on* a warning fill, not a warning-coloured ink — D18). Pending icons take
`--sched-trip-bar-{danger,warning,success}-icon`. A status colour says *this needs action*;
a tier says *this is supporting*. Do not use one to do the other's job. **No published rule
yet governs a status mark's contrast on a saturated category fill** — the icon tokens fail
3:1 on every light-theme fill today (D15's family; the standard belongs to `color.md` Q12).

**A bolder destination is prohibited, and this rule exists to say so once.** It was proposed
on 2026-08-24 and rejected against rule 2.11 — the bar's problem is that it has no
hierarchy at all, and weight is the one instrument the foundation forbids for fixing that.
The legal instrument is the size scale, and taking it costs the fixed-row-height engine
(§1.3). That trade is **Q1**, deliberately deferred, not a licence to bold the row instead.

### 2.2 The bar takes the container radius.

`--sched-trip-bar-radius` reads **`--rux-radius-container`**. The trip bar is a card-shaped
surface and takes the same rung every card, panel, button and field in the application took
when `layout.md` step 8 adopted Geist's product default.

**One exception, and it is a join rather than a corner.** A multi-day span that continues
past the window edge zeroes the corners on the continuing side only — `--from-prev` on
inline-start, `--to-next` on inline-end.

**The optical radius system this document used to publish is withdrawn.** It required
*inner = outer − gap* and gave nested elements their own stepped rung. `layout.md` step 8
put `--rux-radius-container` and `--rux-radius-control` on the same 6px value and Geist does
not step there either, so there is no step left to take. A control inside the bar takes
`--rux-radius-control`; the bus pill is a badge and takes `--rux-radius-full`.

### 2.3 The bar is a surface **in** the grid, not above it.

**No shadow.** Elevation is a claim about depth, and a cell inside a grid makes no such
claim. Materials' **Base** preset is the nearest published elevation, and this is a
**deliberate departure from it**: Base is *stroke-only*, and the trip bar takes neither
stroke nor shadow.

**The bar separates by fill.** `--sched-trip-bar-border-width` is **`0px`** by default —
the `--_outline` machinery computes a colour for a border that is not drawn — so a saturated
tone against a neutral grid is the entire separation mechanism, and measurement in both
themes confirms it is sufficient. **The border is a semantic slot, not a default edge:** the
only rule that gives it width is `--partial-po`, at 1px, to warn that authorisation is
incomplete. Adding a resting stroke would spend that channel and leave the warning with
nothing to say.

This rule exists because the opposite was true and nobody noticed: the bar read
`--rux-shadow-3`, which **is Geist's Modal stack**, three layers deep. Thirty
modal-elevation cards on one screen is why the board read heavy.

*Correction, step 3.* Contract 1.0.0 stated this rule as *"Base — stroke only … the bar
already paints a 1px `--_outline` border that carries its edge."* **That was wrong**, and
measuring it during execution is what caught it: the border resolves to `0px` and paints
nothing. The rule's conclusion is unchanged — the shadow still had to go — but its stated
reason was a stroke that does not exist, and a rule defended by a false premise is one
nobody can check.

### 2.4 Fills are opaque.

No alpha on any head surface. `color.md` rule 2.5 describes high-contrast fills as scale
steps, not as a colour diluted over whatever is behind it, and an alpha fill makes every
contrast figure a claim about the backdrop rather than about the surface. The tail is a
different object and §2.5 states its own contract.

### 2.5 The state ladder: rest is one step per theme · hover and pressed are overlays · **selected is not a fill**.

Rest is the tone's per-theme step (rule 2.12 owns which one). **Hover and pressed are not
steps at all**: they composite the published `--rux-state-hover-overlay` and
`--rux-state-active-overlay` over the unmoved rest fill — one token per state, the same
tokens every list row and ghost control already uses. The overlay's direction is the
**theme's** (white lightens in dark, black darkens in light), so the bar moves the way its
surroundings move.

**A per-hue hover step is no longer expressible, by construction.** The paired `-hover`
tokens step 4 introduced are gone; there is no second declaration to drift out of sync, and
"a teal bar hovering to blue" — the failure the pairing existed to prevent — cannot be
written any more.

**Selected is a different axis from hover and MUST NOT be a third fill.** Hover and pressed
are transient pointer feedback; selection is persistent, is written as `aria-pressed`, and
survives the pointer leaving. A selected bar keeps the **rest** fill and gains a 2px inset
ring in the bar's own label colour (`--sched-trip-bar-selected-ring-color`). Expressing both
on the fill is what produced the defect this rule replaces: hover and selected resolved to
the *same* lightness and were told apart only by an alpha step, so a selected trip looked
like a hovered one (D3). A selected bar also takes **no hover overlay** — its fill answers
to its ring, not to the pointer passing over it.

*History.* This rule originally read *"rest 700 · hover 800 · pressed 800"*, taking
`color.md` rule 2.5's fill ladder without rule 2.11's labelled-fill constraint — the wrong
step, recorded as D13, and the hover question it created ("800 rests on its own hover step")
was Q4. Both dissolved when rule 2.12 moved rest to the per-theme step where one label
clears everywhere and the published overlays work unchanged. Step 18 executed that.

**The tail may keep alpha.** The continuation rail exists to read as subordinate to its
day-1 head, and a reduced-alpha fill is the mechanism that says so. It is the one place
transparency does work §2.4's opaque rule would otherwise have to reinvent. The overlay
states composite over head and tail alike, so the two halves of a multi-day bar cannot
desync.

### 2.6 Every type axis comes from a Label role, whole.

A row MUST read `--rux-text-label-{n}-{axis}`, never `--rux-size-*` and `--rux-line-height-*`
directly. `typography.md` rule 2.2: *"a role's metric axes are adopted together"* — taking
size and leading from Tier 0 while a role publishes the same pair is the same defect as a
unitless leading, reached by a different route. That the numbers currently agree is a
coincidence, not conformance: the moment the role moves, a primitive-reading call site
silently stops tracking it.

### 2.7 The leading is the row.

`line-height` is the row height. No per-row padding, no gap between rows, no exceptions.
This is what makes the collapsed height a single multiplication and what keeps every bar on
the board an identical grid regardless of which rows carry data. `typography.md` rule 2.2 —
*"a role's leading is its own row height … type is settled first and boxes conform to it"* —
is the general form; this is the trip bar taking it literally.

An element that renders a **mark** rather than language — an icon, the bus pill's box — is
box geometry and sizes to the row's leading instead of setting its own.

### 2.8 Two density tiers, both on the catalog.

**Compact** (the default, no class) and **Comfortable**
(`.sched-scheduler--trip-bar-size-sm`). Nothing else.

A third tier is not available: `typography.md` Q11 settled that the trip bar keeps **no
sub-catalog density tier**, the catalog floors at 12px, and it publishes exactly one leading
at 12. There is no catalog-legal way to hold a third tier apart on size or leading, which is
why the XXS tier collapsed into the default and became a control that changed nothing.

Density MUST NOT be recovered by an off-catalog type size. If more density is needed, the
instruments are **row count** (the five visibility preferences) and the inset — never the
type scale.

### 2.9 State is aria, and JavaScript writes no inline style.

`state.md` rule 2.1 — aria is the state of record; CSS selects on it and JS writes only it.
The bar's selection is `aria-pressed` and its drawer is `aria-expanded`; a `.is-*` class
duplicating either is a rule-2.2 defect (D9).

**A status colour is a modifier class, never `element.style`.** Driver-role status is
painted by assigning `iconEl.style.color` at runtime (D7), which puts a design value in a
JavaScript file, defeats the cascade, and cannot be themed. The class-based mechanism for it
already exists in the stylesheet and is unreachable.

### 2.10 The bus reference is text on the title row, not a pill on the reqs row.

*Which bus of how many* is a **qualifier on the trip's name**, so it belongs on the row that
carries the name: the destination row, far right, as a `flex: none` sibling of
`__destination` and just outside `__paid-badge`. It renders as **plain text** — no fill, no
radius, no box — taking `label-12` whole at `--rux-fg-on-accent-subtle`.

**It MUST NOT be the loudest thing in the bar.** It is a secondary identity marker on a card
whose primary content is a destination and a set of times, and §2.1's ladder puts it in the
tertiary tier for that reason. A filled marker on a saturated tone outranks every string
around it — including the destination — which is a hierarchy inversion however small the
element is.

**This converges the screen on the print surface, which had it right the whole time.**
`.sched-print-trip__group` renders on the destination row, far right, as plain text in the
faintest ink available, and its stylesheet comment states the same intent the trip bar's own
source does — *a fixed identity marker anchored at the far right edge*. One marker, one
intent, two surfaces; the screen copy drifted into a pill and print did not. Print's weight
is **not** adopted with the placement: it uses an untokenized `700` that `typography.md`
records as the print surface's own debt (S2), and a Label is 400.

**The aria constraint that moved it is about nesting, not about the row.** The marker was
placed on the reqs row because nesting it inside `__pending` would let that span's overriding
`aria-label` swallow its own. As a sibling of `__destination` it is not inside `__pending`,
so the constraint does not apply — but it MUST keep its own `aria-label` naming what the
ratio means, because `1/6` reads as a fraction to a screen reader and means neither.

*History.* Contract 1.0.0 stated this rule as **"the bus pill is a Badge, and a Badge is a
Label"** — a rule about the pill's *type role* that took its pill shape, its white fill and
its position on the reqs row as given, and defended the inversion: *"the pill is a fixed
identity marker, not a status, and inverting it is what stops it reading as another status
icon."* That reasoning answered the wrong question. Distinguishing the marker from a status
icon is real, but a white field on a saturated tone spends the loudest colour in the system
to do it, and moving the marker to the title row separates it from the status icons by
**position**, which costs no contrast at all. Step 10.

### 2.11 Numerals that line up are tabular.

`typography.md` rule 2.9 — a role carrying times, counts, dates or versions MUST set
`font-variant-numeric: tabular-nums`, and setting it globally on `body` is prohibited
because it applies tabular figures to prose, where they are wrong.

Inside the bar that names the **time row, the bus reference, the paid date, the contact
phone, and every numeric field in the details drawer**. Times are the case that motivates
it: three columns of proportional figures on thirty stacked bars do not align down the
board, and a dispatcher scanning a column of departures is doing exactly the comparison
tabular figures exist to support. The bus rail immediately to the left of these bars already
sets it, for the reason its own comment gives — *"tabular figures so a column of them aligns
digit-for-digit."*

Notes and client are prose and take no such setting.

### 2.12 The surface is one step per theme, and the label is one colour per theme.

**Rest is the tone's `500` step in dark and its `600` step in light. The label is white in
dark and near-black (`--rux-fg-on-fill-inverse`) in light, on every tone, in every state.**
Not per hue — per theme, which is how every other surface in this system already behaves.

Neither rung is a preference. **500 is the only rung above the background tints where white
clears 4.5:1 on all seven tones in dark** (600 fails five, 700 fails six, 800 fails amber,
green and teal — `color.md` D19). **600 is the most vivid light rung where near-black clears
on all seven** (700 fails blue at 4.46 and purple at 3.81). Measured 2026-08-24 in the
**sRGB branch**, per `color.md` rule 2.11's worse-gamut clause, on the specimen's own meter:
across every tone, state and tier, dark lands **4.51–11.09** and light **5.17–11.79** — with
the honest caveat that the dark minimum is the 87% tier on a pressed green bar and it sits
**on** the floor, not above it.

*Revision, step 18.* This rule originally put light at 500 as well, for the symmetry of one
rung number — while its own text conceded near-black clears through 600 in light. Taking
that headroom is what keeps the light board's closest hue pair (red/pink) separable: at
light-500 it collapses to roughly half of what 600 gives. A rung that switches with the
theme has precedent — the catalog's own Badge switches on five of seven hues (`color.md`
step 22); this switches once, uniformly.

**The second tier is 87%, not 75%.** The dark overlay lightens, which costs white-text
contrast; 75% drops to **4.11** on hover. 87% is the lowest value that survives every tone in
every state. The third tier (`-subtle`, 55%) clears **nowhere in light theme at any step**;
it is retired for this component and its reads collapse to the muted tier — the tertiary
voice is position and content, not a third ink.

**What this rule buys, stated so a future reader does not re-litigate it:** purple needs no
exception, `--rux-fg-on-accent-muted` is legal again — so rule 2.1's colour hierarchy is
restored rather than dead — and hover is one published token (rule 2.5).

**What it costs:** category separation is far below what 700/800 gave (the dark strip's
closest pair, pink/unconfirmed, measures 33 in specimen sRGB distance against a 40 floor),
and 500/600 are `color.md` rule 2.2's hover- and active-border steps, a departure that
document's D19 records. Whether the separation reads at card size is Q5.

---


## 3. Current state

Measured from source on **2026-08-24**. This section records what renders **before** the §5
steps execute; every row of it that disagrees with §2 is a defect in §4.

| Property | Renders today | §2 says |
|---|---|---|
| Outer radius | **6px** (step 2) | `--rux-radius-container` → 6px (2.2) ✓ |
| Shadow | **none** (step 3) | none (2.3) ✓ |
| Border | `--sched-trip-bar-border-width: 0px` — the `--_outline` colour is computed for a stroke that is never drawn; only `--partial-po` gives it 1px | a warning channel, not an edge (2.3) ✓ |
| Rest fill | **opaque, each tone's 500 step in dark / 600 in light** (step 18) | the per-theme step (2.12) ✓ |
| Label contrast | **4.51–11.79** across every tone, state, theme and tier, specimen meter, sRGB branch | 4.5:1 (`color.md` 2.11) ✓ — D13 closed; the dark floor case (87% tier, pressed green) sits at 4.51 |
| Hover / pressed | **`--rux-state-hover-overlay` / `-active-overlay` over the rest fill** (step 18) | the published overlays (2.5) ✓ |
| Selected | **rest fill + 2px inset ring in the per-theme label** (steps 4, 18) | rest fill + ring (2.5) ✓ |
| Row type | `--rux-size-12` / `--rux-line-height-16` — Tier 0 primitives | `--rux-text-label-12-*` (2.6) |
| Row geometry | leading is the row, 0 gap, 8px inset | conformant (2.7) |
| Icons | `--sched-trip-bar-icon-size` tracks row leading | conformant (2.7) |
| Density tiers | **two — Compact (default) and Comfortable** (step 6) | two (2.8) ✓ |
| Bus marker — placement | **plain text, destination row, far right** (step 10) | conformant (2.10) ✓ |
| Bus marker — type | **12/16/400, `label-12` whole, `-subtle` ink** (step 10) | conformant (2.10) ✓ |
| Tabular figures | **set on the time row, bus label, paid date, phone, and drawer numerics** (step 11); prose rows proportional | conformant (2.11) ✓ |
| Driver status | `element.style.color` at runtime | a modifier class (2.9) |
| Selection state | `aria-pressed` **and** `.is-active` | aria only (2.9) |

**Collapsed height today:** 16px leading × 7 rows + 8px × 2 = **128px** with every row
enabled, down to 48px with only destination and time. The previous version of this document
published a fixed 135px; that figure has not been correct since the row preferences shipped.

---

## 4. Known defects

| # | Defect | Rule | Evidence |
|---|---|---|---|
| **D1** | **Fixed (step 2).** ~~The bar is the only card-shaped surface in the application still at radius 0.~~ | 2.2 | `--sched-trip-bar-radius: var(--rux-radius-0)`, `scheduler/css/tokens.css` |
| **D2** | **Fixed (step 3).** ~~It carries a **modal** shadow.~~ `rux-ui/css/tokens.css` names the trip bar as a `--rux-shadow-3` consumer alongside modals and floating panels — thirty of them per screen. | 2.3 | `tokens.css` SHADOW block comment |
| **D3** | **Fixed (step 4).** ~~Hover and selected resolve to the same lightness~~ (`+4%`), separated only by an alpha step. A selected trip looks hovered. Closing D4 makes them pixel-identical, so the two must be fixed together. | 2.5 | `--sched-trip-bar-hover-bg-lightness` ≡ `--sched-trip-bar-selected-bg-lightness` |
| **D4** | **Fixed (step 4).** ~~Fills carry alpha, and the two themes move it in **opposite** directions on hover — light 68→76% (more opaque), dark 80→70% (more transparent).~~ | 2.4 | `scheduler/css/tokens.css`, `:root` vs `[data-theme="light"]` |
| **D5** | The default tier reads Tier 0 primitives while the XXS tier reads the Label role. Same pixels, one of them conformant. | 2.6 | `tokens.css:116-117` vs `layout/scheduler.css:162-164` |
| **D6** | **Fixed (step 10), by deletion as predicted.** The bus pill renders **12/12**; the catalog publishes one leading at 12 and it is 16. It also takes weight 500 where a Badge is 400. **This is `typography.md` D19** and is that document's to close — fixing it retires `--rux-line-height-12`'s last reader, making the rung a Class C candidate. **Step 10 closes it as a side effect**: the hand-set pill tokens stop existing when the marker becomes plain text on a Label role, so the defect is resolved by deletion rather than by correction. That still leaves the orphaned rung for `typography.md` to retire. | 2.10 | measured live 2026-08-21, 3 pills |
| **D7** | Driver-role status is painted by `iconEl.style.color`. The class-based mechanism exists and is **dead**: `driverStateClass()` is defined and never called, and its three `.sched-trip-bar__driver-dot*` rules have no emitter. | 2.9 | `trip-bar.js:459,1106`; `trip-bar.css:1088-1101` |
| **D8** | `--sched-trip-bar-meta-bg` resolves to **0% alpha in both themes** and `-meta-shadow` to `none`, so the time and driver rows paint a background and a shadow that do not exist. The comment beside them — *"recessed rim, same as input fields"* — describes a treatment that has not rendered for some time. | — | `tokens.css:80,113,213`; read at `trip-bar.css:965-968,1033-1035` |
| **D9** | `.is-active` and `.is-expanded` duplicate `aria-pressed` and `aria-expanded`. This is `state.md` D1's family arriving in the scheduler layer, where D1's count does not reach it. **Belongs to `state.md`**, recorded here as a cross-reference only. | 2.9 | `trip-bar.js:36,1270,1315`; `trip-bar.css:326,344` |
| **D10** | Three dead declarations: an empty `@container (max-width: 24rem) .sched-trip-bar__time {}` rule; `stroke-width: 2` on `__pending-icon`, an SVG property on an icon-font glyph; and `padding-right: var(--rux-space-2)` on the same element, doubling the `gap` its row already sets. | — | `trip-bar.css:1240-1242, 847-851` |
| **D11** | **Fixed (step 10).** The bus reference rendered as a **white-filled pill with black text** — the highest-contrast treatment available on a saturated tone, spent on a secondary identity marker. It outranks the destination, which is white *text* rather than a white *field*. Its 16px box fills the row's full height so it reads as a block, it takes a 30px min-width floor below 14rem, and because it appears only on multi-bus trips the reqs row's left edge differs bar to bar. | 2.1, 2.10 | `trip-bar.css:785-799`; `--sched-trip-bar-bus-label-bg: var(--rux-white)` |
| **D12** | **Fixed (step 11).** ~~The bar sets `font-variant-numeric: tabular-nums` nowhere~~, while rendering times, phone numbers, dates, counts and the bus reference. The time row is the visible cost: three columns of proportional figures across thirty stacked bars do not align down the board. The sticky bus rail immediately beside them already sets it. | 2.11 | 0 hits in `trip-bar.css`; `layout/scheduler.css:451` sets it on `__bus-number` |
| **D13** | **Fixed (step 18)** — rest moved to the per-theme step rule 2.12 chose, one label per theme, muted at 87%, subtle collapsed to muted; every tone, state and surviving tier clears, 4.51–11.79 on the specimen meter. The original finding, kept because its measurements justify the rule: ~~The bar's fills do not clear AA, and the tier ladder cannot.~~ `color.md` rule 2.11 requires a published fill and its label to clear **4.5:1**, and states the answer per hue: the fill is **800**, not 700, and the label is near-black rather than white on amber, green and teal. Step 4 put rest at **700**. Measured on the specimen, dark theme, primary label: accent **4.50**, purple 5.31, unconfirmed 3.97, pink 3.88, green 3.02, teal 2.92, amber **1.86** — five of seven below the floor. **Worse, the tier ladder itself fails everywhere:** `--rux-fg-on-accent-muted` (75%) measures 1.58–3.68 and `-subtle` (55%) 1.39–2.67 across every tone in both themes, so the client, contact and time-label rows do not clear AA on *any* fill, including the ones whose primary label does. That is rule 2.1's mechanism, and it is unbuildable at AA as specified. | 2.1, 2.5 | measured 2026-08-24 on `trip-bar-specimen.html`, canvas-composited sRGB; independently reproduces `color.md` §2.11's own 700 column to within 0.1 |
| **D14** | **Every contrast figure this document carried before 2026-08-24 was measured in the wrong gamut.** They were read from `getComputedStyle` on a **P3** display, so they came from the P3 branch — higher chroma, higher contrast — and were then clipped by an sRGB canvas. `color.md` rule 2.11 evaluates the floor in the **worse** gamut, so the sRGB branch governs and the recorded numbers were inflated by 0.05–0.35. The correction that mattered: the default blue bar at 700 measures **4.44, not 4.50 — it fails**. Recomputed from the sRGB branch directly, the method now reproduces `color.md` §2.11's published table to within 0.03 on all seven hues. `trip-bar-specimen.html` was rewired to parse the branch itself rather than read computed styles, so it reads identically on any display. | fixed same day; see §0.1 |
| **D15** | **The categorical palette was closed against a rule that does not exist.** `js/core/trip-colors.js` states its premise as *"the five catalog hues that are not spoken for — red is danger and blue is the accent."* Only **teal** and **pink** are unspoken for: green is `--rux-success`, amber is `--rux-warning`, purple is `[data-rux-accent="violet"]`. The collision is live inside this component — the bar renders an amber *warning* icon and a green *success* icon on a bar that may itself be tagged amber or green. **This is `color.md` D17/D18 and belongs there**, recorded here because the trip bar is where it shows. | `color.md` D17, D18 |
| **D16** | **Fixed (step 18)** — `--sched-trip-bar-meta-fg` and `--sched-trip-bar-selected-ring-color` now read `--sched-trip-bar-fg`, which is declared per theme at `:root`, so both follow the theme label; the substitution trap is fenced by an assertion in `tests/trip-bar-color.test.mjs`. The finding: ~~`--sched-trip-bar-meta-fg` cannot follow a per-hue label, and every label proposal in this document assumes it will.~~ The time and driver rows read `--sched-trip-bar-meta-fg`, declared at `:root` as `var(--rux-fg-on-accent)`. **A `var()` inside a custom-property declaration is substituted where the DECLARATION sits**, so the token resolves once against the root's white and never again — setting `--rux-fg-on-accent` on a bar moves the destination and leaves the meta rows white. **Observed, not deduced:** on the specimen one bar computed `rgb(0, 98, 209)` on `__destination` and `oklch(1 0 0)` on `__time-value` at the same moment. Nothing overrides `--rux-fg-on-accent` today — it is declared once — so the app renders correctly and the defect is **latent**. It goes live the moment any per-hue or per-theme label ships, which is steps 12, 14 and 15 and specimen options 1 and 2 (post-step-17 numbering). On a pale fill the two rows paint white on near-white and vanish. | `scheduler/css/tokens.css:161`, read at `trip-bar.css:1018`; source at `rux-ui/css/tokens.css:530`; observed 2026-08-24 on `trip-bar-specimen.html` |
| **D17** | **Fixed (step 19)** — ~~the selection ring never rendered on multi-day bars.~~ The ring lives on the article (`.is-active` outline, step 4), but a multi-day article is transparent and `__head`/`__tail` are positioned children at z-index 1+, so the inset outline painted **beneath** the head's opaque fill and showed only as a dim band through the tail's alpha. A selected multi-day trip looked unselected. Present since the ring shipped in step 4; **found by the owner's eyeball on the live board** — the specimen could not have caught it, since it renders no multi-day anatomy. | 2.5 | reported 2026-08-24 from the dark board; occlusion confirmed by computed styles |
| **D18** | **Fixed (step 20)** — ~~the notes row rendered near-black on the dark fills.~~ `__notes` read `--rux-warning-on-vivid`, which resolves to `--rux-fg-on-fill-inverse` — the ink for text **on** a vivid warning fill, near-black in both themes — where rule 2.1 intended a warning-*coloured* ink. On the old 700 fills it sat at ~4.46 in dark and passed by coincidence; step 18's darker 500 fills dropped it to **1.78–2.70** and the owner read it as black text on a red bar. A role misuse that a passing number had been hiding. The dead `__driver-dot` rules read the same role and are left for step 7, which deletes them. | 2.1 | reported 2026-08-24 from the dark board; measured sRGB branch |

---

## 5. Amendment log

**Ordered by dependency, not by number** — step 9 consolidates and therefore runs last
whatever is added after it. Every step records what it deliberately did **not** do. Class
per `foundations/README.md`
§2.1 — **A** additive, **B** an existing declaration's resolved value changes, **C** a
public name is removed or renamed. A Class B step MUST carry before/after resolved values in
px and name the states needing an eyeball (§2.3 there).

| # | Step | State | Notes |
|---|---|---|---|
| 1 | Establish this document; state rules, current state, defects | **done** | Founding entry, 2026-08-24. Replaces a values table that had gone half stale — see §0. **Deliberately did not** move any code: this is a decision document, and every value change below is its own numbered step. **Deliberately did not** claim a foundation amendment for anything here; D6 and D9 are routed to the documents that own them rather than restated as rules of this one. |
| 2 | Radius 0 → `--rux-radius-container` (D1) | **done · Class B** | **Executed 2026-08-24.** **Before → after, resolved:** outer radius **0 → 6px** (`--rux-radius-container` → `--rux-radius-default` → 6px). **Verified in a browser, both themes**, 17 bars on the board: single-day bars `6px` on all four corners; the multi-day junction measured **head `6 0 0 6`, tail `0 6 6 0`, wrapper `6 6 6 6`** — one rounded span with a flat seam, which is the failure case this step named. The `--from-prev`/`--to-next` seam rules had been dormant since the radius went to 0 and reactivated correctly; **no such bar was on screen**, so those two are verified by rule and by the head/tail case, not by observation. The drag ghost reads the same token and follows automatically. **Deliberately did not** touch `--sched-trip-bar-meta-radius`, which is Q3's. |
| 3 | Shadow: Modal → none (D2) | **done · Class B** | **Executed 2026-08-24.** **Before → after, resolved:** `--rux-shadow-3` — `0 1px 1px` / `0 8px 16px -4px` / `0 24px 32px -8px`, Geist's Modal stack — **→ `none`**. **Verified in a browser, both themes:** `boxShadow: "none"` on every `.sched-trip-bar`, `__head` and `__tail`; **0 of 17 bars retain a shadow**. The step's open question — whether a bar still separates from the grid without one — **is answered yes in both themes**, but *not for the reason the rule gave*: the separation is the saturated fill against a neutral grid, because the border is `0px` and paints nothing. **That falsified rule 2.3's premise and the rule was corrected in this step** (see §2.3's correction note) — the conclusion held, the stated reason did not. **Deliberately did not** substitute `--rux-shadow-1`; a smaller shadow is still a depth claim. **Deliberately did not** add a resting 1px stroke to make the bar conform to Materials Base: the border is `--partial-po`'s warning channel, and spending it on decoration would leave the warning mute. That departure is now recorded in 2.3 rather than papered over. **Also updated** `rux-ui/css/tokens.css`, whose SHADOW block listed the trip bar as a `--rux-shadow-3` consumer — a comment this step made false. `--rux-shadow-3` keeps three consumers (modal, floating panel, modal panel) and stays. |
| 4 | Opaque fills and the new state ladder (D3, D4) | **done · Class B — with D13 open against it** | **Executed and verified 2026-08-24, all seven tones, both themes.** **What it did.** Alpha removed from every head surface; each tone now publishes a **rest and a hover step** (`--sched-trip-color-{hue}` / `-hover`) instead of one hue plus a lightness recipe; hover and pressed take the darker step; **selected stops being a fill** and takes a 2px inset `outline` in `--rux-fg-on-accent`, leaving the border channel to `--partial-po`; tails derive from the head surface they accompany, keeping alpha per rule 2.5; amber's lightness exception is deleted. **Before → after, measured.** Every tone previously rendered at **L 0.60 rest / 0.64 hover** *regardless of the step it named* — the recipe overrode the lightness the step carried, which is what made "700 is the convention, not a constraint" true. After: blue .576→.515, teal .649→.575, green .646→.578, purple .555→.486, amber .819→.772, pink .635→.595, unconfirmed .626→.580 — **every tone on its own step, every hover darker**, selected identical to rest. Amber previously hovered from L 0.80 to L 0.64, a 16-point drop in the opposite direction to every other tone; it now drops 4.7 and darkens. **What it got wrong: see D13.** Rest was set to **700**, and `color.md` rule 2.11 — which outranks this document — states that a fill *carrying a label* takes the lightest step whose label clears 4.5:1, which is **800** for six of seven hues. **Deliberately did not** remove `--sched-trip-bar-bg-lightness`/`-bg-opacity`: `.sched-driver-grid__cell--conflict` reads both, so removing them is Class C. **Also updated** `tests/trip-bar-color.test.mjs` — the state test asserted the retired recipe, and the unconfirmed test cited a token this step moved; both now enforce rule 2.5. |
| 5 | Row typography onto the Label role (D5) | **ready · Class A** | Resolved values do not move — 12/16 either way — which is what makes this additive rather than behavioral. The point is that the default tier stops tracking primitives and starts tracking the role, so a future `label-12` amendment reaches it. **Deliberately did not** change any rendered value, so no eyeball is needed. |
| 6 | Retire the XXS density tier (D5's control half) | **done · Class C — executed 2026-08-24 on the owner's explicit go-ahead ("do 6")** | **Removed `.sched-scheduler--trip-bar-size-xxs`**, its control segment, and the stored-preference value. **Grep before:** 1 CSS declaration block (`layout/scheduler.css`), 3 CSS comment mentions (`trip-bar.css`), 5 occurrences in `index.html` (segment markup, class toggle, three preference-validation sites), plus the test tier list — the `typography.md`/`naming.md` step-record mentions are history and stay as written. **Grep after:** zero live-code occurrences; what remains is retirement notes and the two test assertions that enforce absence. **Migration, verified live:** a stored `"xxs"` is rewritten to `"xs"` on load — seeded, reloaded, observed `"xs"` with the default segment pressed; since Q11 the tier rendered pixel-identically to the default, so no user's board changes. The profile-settings path (`tripBarSize`) coerces the same way. **The surviving two segments took §2.8's own names** — S "Compact", L "Comfortable" — replacing the S/M/L ladder that implied a third rung. **Tests:** `TIERS` drops to two, the two Q11 no-op assertions retire with the tier they described, and a new "stays retired" test pins the class, the segment and the migration; 422/422 pass. **Deliberately did not** touch D5's other half — the default tier still reads Tier 0 primitives, which is step 5's. |
| 7 | Driver status onto a modifier class; delete the dead mechanism (D7) | **ready · Class A** | Replaces `iconEl.style.color` with a class, and deletes `driverStateClass()` and the three unreachable `.sched-trip-bar__driver-dot*` rules in the same change — leaving one of the two would recreate the defect. **Deliberately did not** reuse the dead `driver-dot` names: they describe a dot the current design does not draw. |
| 8 | Delete the declarations that paint nothing (D8, D10) | **ready · Class A** | `--sched-trip-bar-meta-bg` / `-meta-shadow` and their four reads, the empty container-query rule, `stroke-width`, and the doubled `__pending-icon` padding. **Open first:** whether the time and driver rows are *supposed* to have a recessed panel — the comment says they were. Deleting the tokens decides "no" by default, which is why this step asks rather than assumes (**Q3**). |
| 10 | Bus reference: pill on the reqs row → text on the destination row (D11, D6) | **done · Class B** | **Before → after, resolved.** Marker moves from `__reqs` (left) to `__summary` (far right, outside `__paid-badge`). Fill `--rux-white` → **none**; text `--rux-black` → `--rux-fg-on-accent-subtle`; radius `--rux-radius-full` → **none**; weight **500 → 400**; leading **12 → 16px** (closes D6/`typography.md` D19); box 16px → the row's own leading; the 30px compact min-width floor is removed. **Keeps** its `aria-label` — `1/6` is not a fraction. **Eyeball:** a multi-bus trip beside a single-bus one at both themes and at the 7rem, 10rem and 14rem container steps, checking that the marker survives destination truncation and that the reqs row now starts at the same x on every bar. **Deliberately did not** adopt print's weight `700`: that is the print surface's own untokenized debt (`typography.md` S2), not a value to copy. **Deliberately did not** retire `--rux-line-height-12` in this step — the rung is orphaned by it, but retiring a published name is Class C and belongs to `typography.md`. **Executed 2026-08-24, as planned plus one anatomy addition.** The marker and `__paid-badge` now share a **`__summary-end`** wrapper span: in centered-heads mode the summary is a three-column grid with the trailing content pinned to column 3, and two trailing *siblings* would auto-place onto a second grid row and grow the bar — the wrapper keeps them one grid item. The spec's "sibling of `__destination`" was layout language, not an a11y constraint (that constraint was only about `__pending`'s swallowing aria-label), and the marker's own `aria-label` survives inside the wrapper. **Removed with the pill:** all eight `--sched-trip-bar-bus-label-*` tokens (tokens.css, the component block, and both tier blocks in `layout/scheduler.css`) — `--rux-line-height-12` now greps to zero readers, so the rung is formally orphaned for `typography.md`. **Tests:** four pill-geometry tests in `tests/trip-bar-size.test.mjs` collapsed into one plain-text-marker test; the white-pill and centered-mode assertions in `tests/trip-bar-color.test.mjs` rewritten; 421/421 pass. **Verified live:** a real `1/6` renders as transparent-backed 12/16/400 tabular text at the far right of the destination row, gone from the reqs row, aria-label intact; centered mode measured with the class forced — summary is a 16px single grid row with `__summary-end` at column 3. **Eyeball owed, as planned:** multi-bus beside single-bus at both themes and the 7/10/14rem container steps — the truncation interaction with a long destination is the case computed styles cannot judge. |
| 11 | Tabular figures on the numeric rows (D12) | **done · Class B** | **Executed 2026-08-24.** `font-variant-numeric: tabular-nums` on `__time`, `__bus-label`, `__status-date`, `__contact-phone`, and the drawer values via `.__detail-field:not(--wrap) .__detail-field-value` — the `--wrap` exclusion is the one refinement on this step as written: the drawer's free-text Notes field is prose, and "the drawer's numeric fields" had no selector until the exclusion gave it one. Glyph *advance* changes, size does not — Class B. **Verified live:** the row font (Geist) carries the `tnum` feature — `11:11` and `00:00` measure an identical 32.37px inside a rendered time value, so a column of departures aligns digit-for-digit. **Deliberately did not** set it on `__client` or `__notes` (prose, rule 2.9) or on `body` (prohibited by the same rule). Enforcement added to `tests/trip-bar-size.test.mjs`, including a does-not-match on the prose rows. **Eyeball owed:** the time row down a full week at both themes, and the drawer's Mi/Qt column at compact width — advance changes can move a truncation point. |
| 12 | Move rest to step 500; one label per theme; second tier at 87% (D13, rule 2.12) | **superseded by step 18** — executed in revised form: dark took 500 as written, light took 600 rather than mirroring, for the separation its own strip evidence showed 500 giving up. Original notes kept below. | **Executes rule 2.12 and closes D13, both halves.** **Before → after, resolved, sRGB branch:** fill `{hue}-700` → **`{hue}-500`**; label per-hue white/near-black → **white in dark, near-black in light**; `--rux-fg-on-accent-muted` **75% → 87%**; `-subtle` **retired for this component** (clears nowhere in light). Primary lands 5.39–13.94 across every tone and state, the second tier 4.51–10.76. Hover and pressed become `--rux-state-hover-overlay` / `-active-overlay`, which is one published token doing what four hand-set lightness/opacity tokens did. **Eyeball:** the board at both themes — and specifically whether **46** separation reads at card size, which is Q5 and the reason this is `ready` rather than done. **Deliberately does not** touch the categorical palette: Q5 and `color.md` Q10/Q11 decide what a category *is*, and choosing the step first is the mistake step 4 already made once. **Deliberately does not** resolve `selected` — but note it may need nothing, since selection already changes the bar's height and reveals the toolbar. |
| 13 | Route the palette collision to `color.md` (D15) | **done · Class A** | **Executed 2026-08-24.** `color.md` gains **D17** (no rule governs what a hue means, only what a step means — five of seven hues carry two or three assignments), **D18** (the collision live inside this component: amber warning icons on amber-tagged bars), **D19** (700/800 admit no uniform label across seven hues), and questions **Q10–Q12** (may a hue carry one meaning; does the document adopt a categorical gap source; does a fill publish its label as a pair). Its step 20 records the finding, step 21 repairs a bookkeeping bug the work exposed — §4's nineteen defect rows were **invisible to the rollup counter**, so the three new ones would have counted zero. **Deliberately did not** answer Q10–Q12 here: each moves published vocabulary and none is the scheduler's to settle. |
| 14 | Standard tones to 800 + white + darkening hover (rule 2.12 revised) | **superseded by step 18** — the owner chose Option 1 (one rule for all seven tones, label per theme) over this model's theme-invariant 800, 2026-08-24. Its evidence stands: 800+white is what `color.md` §2.11 publishes for blue and red, and this remains the fallback if Q5's eyeball rejects the 500/600 board. Original notes kept below. | **The owner settled this 2026-08-24: the board barely uses trip colours, and an override is a transient flag that gets switched back to standard blue once resolved.** That reframes everything steps 4 and 12 were solving — measured live, **17 bars on screen carried 0 category colours**; twelve confirmed, five unconfirmed. Every hard constraint those steps hit came from the five override hues, which are not on the board. **Before → after:** fill `{hue}-700` → **`{hue}-800`**, label **white in both themes**, hover/pressed `color-mix(in oklab, black var(--rux-fill-hover-mix|-active-mix), <rest>)` — the accent button's own published mechanism. **blue 5.73 → 6.95 → 8.19, red 4.74 → 5.85 → 7.04**, sRGB branch, identical in both themes because 700/800 are theme-invariant. **No amendment needed**: 800 + white is exactly what `color.md` §2.11 publishes for blue and red. **This supersedes step 12 and rule 2.12's step-500 answer** for the standard tones — 500 was bought to satisfy hues the board does not render, and it cost 46 separation and an 87% tier to do it. **Blocked only by step 15**, which decides what the three override hues that cannot hold white at 800 do. |
| 15 | Reduce the override palette to the hues that hold a white label (D15) | **open · Class C** | **Proposed 2026-08-24, NOT executed — Class C stops and proposes.** At 800 with white: purple **6.98**, pink **4.52** clear; **teal 4.15, green 4.08, amber 2.14 fail**. The 500 escape is closed for these — 500 with white collapses in light theme (1.42–1.84). **The three that fail are the three already compromised**: green is `--rux-success` and amber is `--rux-warning` (`color.md` D17/D18), so dropping them fixes the contrast failure and the semantic collision in one move. Teal is the only casualty not already compromised, and it misses by 0.35. **Proposal:** overrides become **purple and pink**. **Scope, from the grep:** 4 CSS files per colour, `js/core/trip-colors.js` + `js/panels/print-schedule.js`, 2 picker swatches each in `index.html`, and `tests/trip-colors.test.mjs` which asserts the token set equals `TRIP_COLORS` exactly. **Stored rows are safe** — `normalizeTripColor`'s `RETIRED` map already carries `orange`/`cyan`/`yellow`, so retired names keep rendering and nothing is written to Supabase. **Open sub-question:** where retired names map. `green → blue` and `amber → red` would be semantically wrong; **purple** keeps a tagged trip *flagged* rather than silently turning it into a status colour. **Needs the owner's go-ahead before any edit.** **Premise contested 2026-08-24, see step 16 and `color.md` D19:** this step reads "teal, green and amber cannot hold a white label" as a property of the hues. Measured, it is a property of **800**. The catalog's own Badge holds white on all three by leaving 800 — `green-600`/`teal-600` in dark, `-900` in light — so the option this step rules out is one the reference implementation actually ships. That does not make the proposal wrong; the semantic collision (green is `--rux-success`, amber is `--rux-warning`) stands on its own and is the stronger half of the argument. It does mean **the contrast half no longer supports it**, and a Class C removal should not rest on a reason that has been falsified. **Step 18 narrows this further:** under rule 2.12 as executed, all seven tones clear in both themes, so the contrast argument is gone entirely — what remains open is only the semantic collision (green is `--rux-success`, amber is `--rux-warning`), which `color.md` Q10 owns. |
| 16 | Specimen: the two badge-derived options, and three harness repairs (D16) | **done · Class A** | **Executed 2026-08-24 — `trip-bar-specimen.html` only; no application code, token or rule moved.** **Added** Option 6 (a 100/200 tint carrying the hue's own text step — the pattern Geist's Badge `-Subtle` variant uses, and the one `vercel.com/geist/colors` documents for badges in as many words) and Option 7 (rest at 700 with one pinned label: white, `--rux-text-primary`, near-black). **What they measure.** 100 + **800** text — the combination asked for — fails on six of seven in dark (2.49–4.13; only amber clears, at 8.01) and five of seven in light: 800 is a *fill* step and on a 100 tint it sits too close to its own ground. 100 + **900** clears everywhere (5.75–8.12 dark, 4.82–5.00 light), which is what the real badge uses. Option 7 clears on **no** column in both themes, and its middle column is the useful one — `--rux-text-primary` is the only label that moves when the theme toggles, while 700 does not, which is why a neutral text token cannot serve as an on-fill label. **Three harness repairs, each of which had been making an option look better or worse than it is.** (1) The second tier was computed as a transparency of the label — right for white-on-solid, meaningless for coloured-text-on-tint, and it was reporting **1.12–1.31**; it now measures the neutral secondary step directly, at 5.71–6.76 dark and 7.66–8.02 light. (2) `--sched-trip-bar-meta-fg` is now set explicitly per bar — **this is D16**, and it silently affected **Option 4** as well, whose ratios were right while its rendering was not. (3) Bars are now built with the app's `__body` wrapper, which is where the 8px inset lives (`trip-bar.css:800`); without it every bar sat flush to its edge, so **every option on the page had been judged at the wrong inset** and the specimen measured 80px of collapsed height against the app's 96px. **Deliberately did not** change `--sched-trip-bar-meta-fg` in the application: D16 is latent there, and repointing it belongs to whichever label step ships rather than to a specimen fix. **Deliberately did not** add an eighth option for the per-hue-per-theme map `color.md` D19 now records — that map is an observation of somebody else's component, and building it here would read as adopting it. |
| 17 | Specimen: scrap the seven-option set, seat the three live candidates | **done · Class A** | **Executed 2026-08-24 — `trip-bar-specimen.html` only; no application code, token or rule moved.** The previous options 1–7 had become an archaeology of the decision rather than the decision: four modelled fills (700, 800, 600, the 100 ladder) that D13/D14/D19 had since ruled out or superseded, and their findings are already banked — options 1–5's in D13, D14, Q4 and rule 2.12; options 6–7's in step 16. All seven removed; the page now renders the current state plus three candidates. **Option 1 — rest `{hue}-500` in dark, `{hue}-600` in light, white/near-black label per theme, published overlays, 87% tier.** New finding, full-rung sweep of the sRGB branch: **600 is the most vivid light rung where near-black clears on all seven** (min 7.22, red; 700 fails blue 4.46 and purple 3.81), and rule 2.12's own text already conceded near-black clears through 600 in light — step 12 just didn't take the headroom. Taking it moves the light closest pair (red/pink) from **ΔE(oklab)×1000 ≈ 28 to ≈ 68**, which erases most of the separation cost rule 2.12 recorded. All states clear on the specimen's own meter: **4.51–11.09 dark, 5.17–11.79 light**, every hue, every state, both tiers — with the caveat that the dark minimum is the 87% tier on a pressed green bar and it sits **on** the floor, not above it. **Option 2 — step 12 as written** (500 both themes), kept so the light-theme cost of one rung number is a toggle away rather than an argument. **Option 3 — step 14** (800 + white both themes, `color-mix` darkening), with its three failing hues visible as step 15's evidence. **Deliberately did not** amend rule 2.12 or step 12 to the 500/600 pair: that revision is Class B against this document and waits on the eyeball the specimen now enables — red/pink at card size, amber's identity at 500's chroma. **Deliberately did not** add the per-hue-per-theme Badge map as an option, for step 16's unchanged reason. **Also removed** the specimen's now-dead coloured-second-tier machinery (`mutedColor`), `labelFor()` (the last per-hue label chooser on the page), and the retired options' code outright — the pointer to this step lives in the page's header note, not in a stub. |
| 18 | Execute rule 2.12: rest 500 dark / 600 light, one label per theme, overlay states (D13, D16; supersedes steps 12 and 14) | **done · Class B, with a scoped Class C rider** | **Executed 2026-08-24, owner's decision ("going with option 1").** **Before → after, resolved, sRGB branch.** Rest fill: every tone's `700` (theme-invariant) → its **`500` in dark / `600` in light** — blue oklch(.515…) → .576 dark / .486-ish 600 light per catalog; label: white both themes → **white dark / `--rux-fg-on-fill-inverse` (near-black) light**; hover/pressed: the tone's 800 → **rest + `--rux-state-hover-overlay` / `-active-overlay`**; muted tier 75% → **87%**; subtle → **collapses to muted**; selected ring: root-frozen white → **the per-theme label**. Contrast, specimen meter, every tone/state/tier: **dark 4.51–11.09, light 5.17–11.79**, zero failures (the 700 model failed five of seven at rest). **Names removed (the Class C rider):** `--sched-trip-color-{teal,green,purple,amber,pink}-hover` and `--sched-trip-bar-unconfirmed-tone-hover` — born in step 4 **the same day**, never in a tagged release, zero consumers on the grep outside the trip-bar files and their test. Rider accepted without a stop-and-propose cycle on that evidence plus the owner's execute order. **Names added:** `--sched-trip-bar-confirmed-tone` (the default bar stops falling back to `--rux-accent`, which rests at 800; cost taken deliberately — a `[data-rux-accent]` retint no longer recolours the default bar), `--sched-trip-bar-fg`, `--sched-trip-bar-fg-muted`. **D16 closed** by pointing `-meta-fg` and `-selected-ring-color` at `--sched-trip-bar-fg`. **Found in passing, fixed by scoping:** the article-level `:active` rule outranked the multi-day transparent override on specificity and painted the pressed fill across a multi-day bar's seam gap; the state rules now exclude `--multi-day` explicitly (observed by reading, not rendered). **Ghost action hover wash** moved from a hand-set white 18% to the shared hover overlay, matching the direction the token block's own comment already claimed. **Also unread now:** `-tail-hover-opacity`/`-tail-pressed-opacity`, left declared in step 4's kept-not-removed bucket for step 8. **Tests:** state-model and D16 assertions rewritten/added in `tests/trip-bar-color.test.mjs`; `tests/trip-colors.test.mjs` dedupes per-theme declarations; `tests/ghost-button-hover.test.mjs` follows the wash; **423/423 pass**. **Deliberately did not** touch the categorical palette membership (step 15 stays open on semantic grounds), the status icon tokens (D15/`color.md` D18), or `color.md` itself — its D19 clause "lands on 500" stays as the dated observation it was; the 500/600 mapping is recorded here, where the mapping lives (§0's precedence: the foundation owns the vocabulary, this document owns the mapping). **Eyeball still owed (Q5):** the live board at both themes — red vs pink at card size, amber's identity at 500's chroma, and the 87% tier on a pressed green bar, which rests ON the 4.5 floor. |
| 19 | Selection ring on multi-day bars: overlay pseudo (D17) | **done · patch** | **Executed 2026-08-24.** `.sched-trip-bar--multi-day.is-active::after` draws the ring — same two tokens, same −2px inset, `border-radius: inherit` so it follows the article's corners, which already zero on `--from-prev`/`--to-next`; `z-index: 3` clears the head's 2; `pointer-events: none`. The article's own occluded outline is unset in the same rule rather than left painting invisibly. **Verified live on the board:** computed styles show the pseudo's 2px solid ring spanning the full 880px article (head 208px) with the article outline `none`; a **screenshot could not be taken** because the app's profile gate was up and answering it is the owner's state to set, not this session's. **One ring around the whole span, not one per half** — ringing head and tail separately would double the line at their seam. **Deliberately did not** move the single-day ring onto a pseudo for symmetry: the article outline works there because rows paint no backgrounds over it, and churning a working rule for uniformity is how regressions get in. Test: two assertions added to the ring section of `tests/trip-bar-color.test.mjs`. |
| 20 | Notes onto a per-theme warning ink (D18) | **done · Class B** | **Executed 2026-08-24, owner's decision.** **Before → after, resolved, sRGB branch:** `__notes` colour `--rux-warning-on-vivid` (near-black both themes; **1.78–2.70** on the dark 500 fills, 7.2–11.8 light) → **`--sched-trip-bar-notes-fg`**, a new domain token: `--rux-amber-900` in dark (**4.50–5.26** on blue/red/purple/pink — the same bright amber the warning icon uses), `--rux-amber-1000` in light (**5.01–8.18 on all seven** 600 fills; light's amber-900 is a mid-dark ink that clears nowhere there). **Known residue, accepted:** no warning ink clears on the amber, green or teal *fills* (3.47–4.19 dark) — amber-on-amber is invisible by construction, which is `color.md` D18's semantic collision; those hues render zero bars on the live board and step 15 proposes dropping two of them. **Deliberately did not** touch the pending-icon tokens, though they fail 3:1 on every light fill: colouring status marks on a category fill needs a published rule, that is `color.md` Q12's, and improvising it per component is how D17-there happened. **Deliberately did not** repoint the dead `__driver-dot` rules off the same role — step 7 deletes them. **Verified live, both themes**, computed styles on the board; test assertions added to `tests/trip-bar-color.test.mjs`; 423/423 pass. **Eyeball owed:** a bar with a note beside one without, both themes — amber text is louder than the near-black was, and whether it outranks the destination is rule 2.1's hierarchy question. |
| 9 | **Consolidate** — make the CSS header comment rationale, not specification | **ready · patch** | The closing step, and the one that keeps §0's failure from recurring. The 90-line block at the top of `trip-bar.css` currently states rules; it becomes rationale beside the values it explains, and points here for the rules. `README.md` gets a pointer with no values. **Runs last** by design: stripping the comment before the rules above are settled would delete the only statement of several of them. |

---

## 6. Open questions

**Q1 — Does the destination take a second Label rung, and does the height engine become a
sum?**

The bar has **one** type level across all seven rows, which is the substance of the
complaint that started this document. §2.1 rules out the weight fix permanently; the size
fix is legal — destination to `label-14` (14/20), everything else at `label-12` — and it is
the only legal one.

The cost is structural rather than cosmetic. §1.3's collapsed height is
`leading × row-count`, a single multiplication, and it holds only while every row shares one
leading. A 20px destination over 16px rows makes it a sum, and
`recomputeTripBarRowCount()` — which today writes a count — has to write a height. The
fixed-grid property that every bar on the board is dimensionally identical survives either
way; what does not survive is the arithmetic being readable in one line of CSS.

**Deferred on the owner's decision, 2026-08-24: colour carries the hierarchy for now.** The
three-tier ladder in §2.1 is the current answer, and this question is what to revisit if it
proves too weak in use. Recorded rather than closed, because "the destination does not lead
enough" will come back, and the next person needs to find the analysis rather than reach for
the bold.

**Q2 — Is the categorical hue a component token reading a role, or a scale step read
directly?**

`--sched-trip-color-teal` reads `--rux-teal-700` — a Tier 0 step — and `color.md` rule 1.2
says a component token MUST read a role, never a scale step directly. The five trip hues are
`--sched-*` domain tokens rather than `--rux-*` component tokens, so it is not obvious rule
1.2 reaches them; `color.md` step 17 moved them onto these steps deliberately and did not
treat it as a violation.

The question is whether the trip palette is **a set of roles the scheduler owns** — in which
case each needs a purpose name and the current names are already it — or a direct read that
rule 1.2 forbids. It matters at step 4, which restates the whole ladder in terms of 700 and
800 and would bake in whichever answer is taken. **Route to `color.md`** if the answer is
that rule 1.2 needs a clause for domain tokens.

**Q4 — Where does a labelled fill hover to? — ANSWERED (2026-08-24): the question dissolves
at step 500.** It only existed because the fill was at 700/800, where the seven hues need two
different labels and therefore two different hover directions. Measured both ways: darkening
breaks pink (4.17) and pressed breaks teal and green (4.15, 4.13); lightening breaks red
(4.06). **No uniform fill direction exists while two labels are in play** — that is
arithmetic, not taste. Move the fill to **500**, where one label serves all seven per theme,
and the published `--rux-state-hover-overlay` works unchanged: every tone clears at rest,
hover and pressed, in both themes. See rule 2.5 and Q5.

*Original question, kept because the reasoning is what found step 500.* `color.md` rule 2.5
says fills are 700 hovering to 800; rule 2.11 says a fill carrying a label must be 800.
Together they left a labelled fill resting on its own hover step with nothing published above
it, since 900 and 1000 are the catalog's two **text** steps and rule 2.2 forbids a step
serving two purposes. The system's own answer turned out not to be a ninth step at all:
`--rux-button-accent-background` is `--rux-accent-800` and hovers by
`color-mix(in oklab, black var(--rux-fill-hover-mix), <rest>)`. That is a real mechanism and
it is now **`color.md` D19** — the steps this document was told to use cannot carry one label.

**Q5 — Is the rest step's separation enough, and should a category be a hue at all?**

Rule 2.12 buys a uniform label by leaving the vivid steps, and pays in separation — the
dark strip's closest pair measures 33 against the specimen's 40 floor. Step 18's light-600
revision recovered the light theme's worst pair; dark has no such headroom (600 fails five
tones with white), so dark-500 is the floor case. Whether it reads at card size is an eye
question this document cannot settle, and the specimen exists to answer it. **Step 18
shipped without waiting for that answer** — the owner chose the model; this question is now
about whether the *palette* survives it, and step 14's 800+white model is the recorded
fallback if it does not.

But the more useful finding is that **the trade is structural, not local.** Measured against
[Google Calendar's eleven event colours](https://developers.google.com/apps-script/reference/calendar/event-color),
the largest deployed instance of this exact problem: five need a white label, four need
near-black, and **two — Tangerine (3.48 / 4.41) and Lavender (3.45 / 4.44) — clear neither at
AA**. Their separation is **82**, better than this system manages at 700. They buy it by
letting lightness vary wildly across the set (Banana `#F6BF26` against Basil `#0B8043`), and
that variance is *precisely* what forces a per-colour label. **A systematic scale cannot have
both**: one lightness per step is what makes a uniform label possible and what collapses
separation. Google chose separation and shipped two colours that fail; this document chose
the label. Neither position is available for free.

Which points at the exit both external sources take: **stop asking hue to carry it alone.**
Cloudscape's palette note — *"color should not be used as the only method of communicating
what the data represents"* — and the general calendar-accessibility guidance say the same
thing, and this bar already has an unused channel in `__stripe-layer`, the SVG hatch that
currently marks one-way and split-trip legs. Pattern, or a leading marker, would carry
category identity without competing with status colour, and would make 46 sufficient by
making it do less work. That is a bigger change than a step choice and is why it is a
question rather than a rule.

**Blocked on `color.md` Q10 and Q11**, which decide whether a hue may carry one meaning and
whether this system adopts a categorical source at all. Settling the palette before the step
would be the right order; step 4 ran the other way round and D13 is the receipt.

**Q3 — Were the time and driver rows meant to be a recessed panel?**

D8's tokens are not merely unused; they are *read*, by four declarations, and resolve to
nothing. `--sched-trip-bar-meta-radius` (`--rux-radius-sm`) and `--sched-trip-bar-meta-fg`
are live in the same rules, and the two rows take **opposite corner roundings** — top on
`__time`, bottom on `__drivers` — which is a pair of rules written to make the two rows read
as one recessed block between them.

So the treatment was designed, built, and then had its background and shadow zeroed rather
than removed. **Step 8 must not delete this by default.** Either the recessed meta panel is
wanted, in which case it needs a real value and belongs in §2 as a rule, or it is not, in
which case the corner roundings go with the tokens.
