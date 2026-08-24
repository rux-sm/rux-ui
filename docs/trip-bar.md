# Trip Bar — Design Specification

**Contract version 1.4.0** · rewritten 2026-08-24

```
Conforms to: Rux UI Foundations — Typography 5.0.0
             Rux UI Foundations — Layout     2.12.0
             Rux UI Foundations — Color      3.0.0
             Rux UI Foundations — State      1.8.1
             Rux UI Foundations — Naming     1.18.0
             Rux UI Foundations — Motion     1.6.0
```

**Status:** 5 done · 9 ready · 1 open · 5 open questions · 15 known defects.

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
| 1 | Destination | `__destination` | where the bus is going; `__paid-badge` right |
| 2 | Client | `__client` | customer, or a passenger count when self-organized |
| 3 | Contact | `__contact` | booking contact name and phone |
| 4 | Notes | `__notes` | free-text operational callout |
| 5 | Reqs | `__reqs` | bus marker and leg marker left, pending icons right — the bus marker leaves this row at step 10 |
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
the trip carries one, else `--rux-danger` when unconfirmed, else `--rux-accent`. Every
surface derives from `--_tone` by a relative-colour recipe.

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
| Tertiary | `--rux-fg-on-accent-subtle` | time separators, empty-value placeholders |

**The three tiers do not clear AA on a saturated fill, and this is unresolved (D13).**
Measured across all seven tones in both themes: `-muted` lands 1.58–3.68 and `-subtle`
1.39–2.67, against a 4.5:1 floor. Every row this rule assigns to the lower two tiers —
client, contact, time labels — is below it on every tone. Colour-only hierarchy and AA are
in direct tension here, and that tension is the cost of Q1's deferral rather than an
argument against it: the size scale separates levels without spending contrast, which is
what rule 2.11's evidence says colour cannot do at these opacities.

**Status colour is a fourth channel, not a fourth tier.** Notes take
`--rux-warning-on-vivid`; pending icons take `--sched-trip-bar-{danger,warning,success}-icon`.
A status colour says *this needs action*; a tier says *this is supporting*. Do not use one
to do the other's job.

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

### 2.5 The state ladder: rest 700 · hover 800 · pressed 800 · **selected is not a fill**.

`color.md` rule 2.5 — high-contrast fills are **700, hovering to 800, and 800 is darker**.
`--_tone` is already a 700 step for every one of the five categorical hues, for `--rux-accent`
and for `--rux-danger`, so the ladder is a step selection rather than a lightness recipe.

**Hover darkens.** A hover that lightens is off the model — `color.md` D7 records exactly
that — and it is the direction every button in the application already moves.

**Selected is a different axis from hover and MUST NOT be a third fill.** Hover and pressed
are transient pointer feedback; selection is persistent, is written as `aria-pressed`, and
survives the pointer leaving. A selected bar keeps the **rest** fill and gains an
`--rux-accent-ring` outline. Expressing both on the fill is what produced the defect this
rule replaces: hover and selected resolved to the *same* lightness and were told apart only
by an alpha step, so a selected trip looked like a hovered one (D3).

**Rest is 700 in this rule and that is under correction (D13).** `color.md` rule 2.11 owns
the step a *labelled* fill takes, and it is not the same question rule 2.5 answers: 2.5 says
what a high-contrast fill **means**, 2.11 says which step one **carrying text** may use, and
its own words are that *"no fill clears at 700 except purple."* The published answer is 800,
with a near-black label on amber, green and teal. This rule read 2.5 without 2.11 and picked
the wrong step — the precedence rule working exactly as §0 describes, with the foundation
catching the downstream. **The correction is not executed**, because it is not only a step
change: moving rest to 800 leaves hover with nowhere above it to go, which is **Q4**.

**The tail may keep alpha.** The continuation rail exists to read as subordinate to its
day-1 head, and a reduced-alpha fill is the mechanism that says so. It is the one place
transparency does work §2.4's opaque rule would otherwise have to reinvent.

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

### 2.12 The surface is one step, and the label is one colour per theme.

**Rest is the tone's `500` step. The label is white in dark and near-black in light, on every
tone, in every state.** Not per hue — per theme, which is how every other surface in this
system already behaves.

500 is not a preference. It is **the most vivid step at which white clears 4.5:1 on all seven
tones in dark** (minimum 7.30, on green); 600 fails on amber at 2.28 and 700 at 1.80. Light
theme mirrors it — near-black clears through 600 — so 500 is the one step that satisfies both
directions at once. Measured 2026-08-24 in the **sRGB branch**, per `color.md` rule 2.11's
worse-gamut clause.

| | dark, white | light, near-black |
|---|---|---|
| primary, rest → pressed | 11.09 → 5.39 | 13.94 → 8.64 |
| second tier at 87%, rest → pressed | 8.76 → 4.51 | 10.76 → 7.16 |

**The second tier is 87%, not 75%.** The dark overlay lightens, which costs white-text
contrast; 75% drops to **4.11** on hover. 87% is the lowest value that survives every tone in
every state. The third tier (`-subtle`, 55%) clears **nowhere in light theme at any step** and
is not published for this component.

**What this rule buys, stated so a future reader does not re-litigate it:** purple needs no
exception, `--rux-fg-on-accent-muted` is legal again — so rule 2.1's colour hierarchy is
restored rather than dead — and hover can go back to being one published token.

**What it costs:** category separation falls from **80** at step 700 to **46** at 500. That
is the trade, it is not recoverable within a systematic scale, and Q5 is where it goes.

---


## 3. Current state

Measured from source on **2026-08-24**. This section records what renders **before** the §5
steps execute; every row of it that disagrees with §2 is a defect in §4.

| Property | Renders today | §2 says |
|---|---|---|
| Outer radius | **6px** (step 2) | `--rux-radius-container` → 6px (2.2) ✓ |
| Shadow | **none** (step 3) | none (2.3) ✓ |
| Border | `--sched-trip-bar-border-width: 0px` — the `--_outline` colour is computed for a stroke that is never drawn; only `--partial-po` gives it 1px | a warning channel, not an edge (2.3) ✓ |
| Rest fill | **opaque, each tone's own 700 step** (step 4) | 800, per `color.md` 2.11 — **not yet** (D13) |
| Label contrast | **1.86–5.31** primary, 1.39–3.68 on the lower tiers | 4.5:1 (`color.md` 2.11) — **five of seven tones fail** (D13) |
| Hover | **the tone's 800 step, opaque** (step 4) | 800 — darker (2.5) ✓ |
| Selected | **rest fill + 2px inset white ring** (step 4) | rest fill + ring (2.5) ✓ |
| Row type | `--rux-size-12` / `--rux-line-height-16` — Tier 0 primitives | `--rux-text-label-12-*` (2.6) |
| Row geometry | leading is the row, 0 gap, 8px inset | conformant (2.7) |
| Icons | `--sched-trip-bar-icon-size` tracks row leading | conformant (2.7) |
| Density tiers | three published; **XXS and XS resolve pixel-identical** | two (2.8) |
| Bus marker — placement | white-filled pill, **reqs row, left** | plain text, **destination row, right** (2.10) |
| Bus marker — type | 12px on **12px** leading, weight **500** | `label-12` whole — 12/16/400 (2.10) |
| Tabular figures | set **nowhere** in the bar | times, bus marker, paid date, phone, drawer numerics (2.11) |
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
| **D6** | The bus pill renders **12/12**; the catalog publishes one leading at 12 and it is 16. It also takes weight 500 where a Badge is 400. **This is `typography.md` D19** and is that document's to close — fixing it retires `--rux-line-height-12`'s last reader, making the rung a Class C candidate. **Step 10 closes it as a side effect**: the hand-set pill tokens stop existing when the marker becomes plain text on a Label role, so the defect is resolved by deletion rather than by correction. That still leaves the orphaned rung for `typography.md` to retire. | 2.10 | measured live 2026-08-21, 3 pills |
| **D7** | Driver-role status is painted by `iconEl.style.color`. The class-based mechanism exists and is **dead**: `driverStateClass()` is defined and never called, and its three `.sched-trip-bar__driver-dot*` rules have no emitter. | 2.9 | `trip-bar.js:459,1106`; `trip-bar.css:1088-1101` |
| **D8** | `--sched-trip-bar-meta-bg` resolves to **0% alpha in both themes** and `-meta-shadow` to `none`, so the time and driver rows paint a background and a shadow that do not exist. The comment beside them — *"recessed rim, same as input fields"* — describes a treatment that has not rendered for some time. | — | `tokens.css:80,113,213`; read at `trip-bar.css:965-968,1033-1035` |
| **D9** | `.is-active` and `.is-expanded` duplicate `aria-pressed` and `aria-expanded`. This is `state.md` D1's family arriving in the scheduler layer, where D1's count does not reach it. **Belongs to `state.md`**, recorded here as a cross-reference only. | 2.9 | `trip-bar.js:36,1270,1315`; `trip-bar.css:326,344` |
| **D10** | Three dead declarations: an empty `@container (max-width: 24rem) .sched-trip-bar__time {}` rule; `stroke-width: 2` on `__pending-icon`, an SVG property on an icon-font glyph; and `padding-right: var(--rux-space-2)` on the same element, doubling the `gap` its row already sets. | — | `trip-bar.css:1240-1242, 847-851` |
| **D11** | The bus reference renders as a **white-filled pill with black text** — the highest-contrast treatment available on a saturated tone, spent on a secondary identity marker. It outranks the destination, which is white *text* rather than a white *field*. Its 16px box fills the row's full height so it reads as a block, it takes a 30px min-width floor below 14rem, and because it appears only on multi-bus trips the reqs row's left edge differs bar to bar. | 2.1, 2.10 | `trip-bar.css:785-799`; `--sched-trip-bar-bus-label-bg: var(--rux-white)` |
| **D12** | **The bar sets `font-variant-numeric: tabular-nums` nowhere**, while rendering times, phone numbers, dates, counts and the bus reference. The time row is the visible cost: three columns of proportional figures across thirty stacked bars do not align down the board. The sticky bus rail immediately beside them already sets it. | 2.11 | 0 hits in `trip-bar.css`; `layout/scheduler.css:451` sets it on `__bus-number` |
| **D13** | **The bar's fills do not clear AA, and the tier ladder cannot.** `color.md` rule 2.11 requires a published fill and its label to clear **4.5:1**, and states the answer per hue: the fill is **800**, not 700, and the label is near-black rather than white on amber, green and teal. Step 4 put rest at **700**. Measured on the specimen, dark theme, primary label: accent **4.50**, purple 5.31, unconfirmed 3.97, pink 3.88, green 3.02, teal 2.92, amber **1.86** — five of seven below the floor. **Worse, the tier ladder itself fails everywhere:** `--rux-fg-on-accent-muted` (75%) measures 1.58–3.68 and `-subtle` (55%) 1.39–2.67 across every tone in both themes, so the client, contact and time-label rows do not clear AA on *any* fill, including the ones whose primary label does. That is rule 2.1's mechanism, and it is unbuildable at AA as specified. | 2.1, 2.5 | measured 2026-08-24 on `trip-bar-specimen.html`, canvas-composited sRGB; independently reproduces `color.md` §2.11's own 700 column to within 0.1 |
| **D14** | **Every contrast figure this document carried before 2026-08-24 was measured in the wrong gamut.** They were read from `getComputedStyle` on a **P3** display, so they came from the P3 branch — higher chroma, higher contrast — and were then clipped by an sRGB canvas. `color.md` rule 2.11 evaluates the floor in the **worse** gamut, so the sRGB branch governs and the recorded numbers were inflated by 0.05–0.35. The correction that mattered: the default blue bar at 700 measures **4.44, not 4.50 — it fails**. Recomputed from the sRGB branch directly, the method now reproduces `color.md` §2.11's published table to within 0.03 on all seven hues. `trip-bar-specimen.html` was rewired to parse the branch itself rather than read computed styles, so it reads identically on any display. | fixed same day; see §0.1 |
| **D15** | **The categorical palette was closed against a rule that does not exist.** `js/core/trip-colors.js` states its premise as *"the five catalog hues that are not spoken for — red is danger and blue is the accent."* Only **teal** and **pink** are unspoken for: green is `--rux-success`, amber is `--rux-warning`, purple is `[data-rux-accent="violet"]`. The collision is live inside this component — the bar renders an amber *warning* icon and a green *success* icon on a bar that may itself be tagged amber or green. **This is `color.md` D17/D18 and belongs there**, recorded here because the trip bar is where it shows. | `color.md` D17, D18 |

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
| 6 | Retire the XXS density tier (D5's control half) | **ready · Class C** | **Removes `.sched-scheduler--trip-bar-size-xxs`** — a public class, so this stops and proposes before executing, follows `CLAUDE.md`'s rename grep protocol across `index.html`, `js/`, `tests/`, `docs/` and all CSS, and reports hit counts before and after. Also removes one segment from the "Trip bar size" control and needs a migration for any stored preference holding `xxs`. **The tier already renders identically to the default** — `tests/trip-bar-size.test.mjs:209` asserts it — so this removes a control that lies, not a capability. |
| 7 | Driver status onto a modifier class; delete the dead mechanism (D7) | **ready · Class A** | Replaces `iconEl.style.color` with a class, and deletes `driverStateClass()` and the three unreachable `.sched-trip-bar__driver-dot*` rules in the same change — leaving one of the two would recreate the defect. **Deliberately did not** reuse the dead `driver-dot` names: they describe a dot the current design does not draw. |
| 8 | Delete the declarations that paint nothing (D8, D10) | **ready · Class A** | `--sched-trip-bar-meta-bg` / `-meta-shadow` and their four reads, the empty container-query rule, `stroke-width`, and the doubled `__pending-icon` padding. **Open first:** whether the time and driver rows are *supposed* to have a recessed panel — the comment says they were. Deleting the tokens decides "no" by default, which is why this step asks rather than assumes (**Q3**). |
| 10 | Bus reference: pill on the reqs row → text on the destination row (D11, D6) | **ready · Class B** | **Before → after, resolved.** Marker moves from `__reqs` (left) to `__summary` (far right, outside `__paid-badge`). Fill `--rux-white` → **none**; text `--rux-black` → `--rux-fg-on-accent-subtle`; radius `--rux-radius-full` → **none**; weight **500 → 400**; leading **12 → 16px** (closes D6/`typography.md` D19); box 16px → the row's own leading; the 30px compact min-width floor is removed. **Keeps** its `aria-label` — `1/6` is not a fraction. **Eyeball:** a multi-bus trip beside a single-bus one at both themes and at the 7rem, 10rem and 14rem container steps, checking that the marker survives destination truncation and that the reqs row now starts at the same x on every bar. **Deliberately did not** adopt print's weight `700`: that is the print surface's own untokenized debt (`typography.md` S2), not a value to copy. **Deliberately did not** retire `--rux-line-height-12` in this step — the rung is orphaned by it, but retiring a published name is Class C and belongs to `typography.md`. |
| 11 | Tabular figures on the numeric rows (D12) | **ready · Class B** | Adds `font-variant-numeric: tabular-nums` to `__time`, `__bus-label`, `__status-date`, `__contact-phone` and the details drawer's numeric fields. Nothing else changes; glyph *advance* changes, so a value's rendered width moves even though its size does not — which is why this is Class B and not additive. **Eyeball:** the time row down a full week at both themes, which is the whole point — a column of departures should align digit-for-digit with the bus rail beside it. **Deliberately did not** set it on `__client` or `__notes`: those are prose, and rule 2.9 prohibits the global that would have caught them. **Deliberately did not** set it on `body`, for the same reason. |
| 12 | Move rest to step 500; one label per theme; second tier at 87% (D13, rule 2.12) | **ready · Class B** | **Executes rule 2.12 and closes D13, both halves.** **Before → after, resolved, sRGB branch:** fill `{hue}-700` → **`{hue}-500`**; label per-hue white/near-black → **white in dark, near-black in light**; `--rux-fg-on-accent-muted` **75% → 87%**; `-subtle` **retired for this component** (clears nowhere in light). Primary lands 5.39–13.94 across every tone and state, the second tier 4.51–10.76. Hover and pressed become `--rux-state-hover-overlay` / `-active-overlay`, which is one published token doing what four hand-set lightness/opacity tokens did. **Eyeball:** the board at both themes — and specifically whether **46** separation reads at card size, which is Q5 and the reason this is `ready` rather than done. **Deliberately does not** touch the categorical palette: Q5 and `color.md` Q10/Q11 decide what a category *is*, and choosing the step first is the mistake step 4 already made once. **Deliberately does not** resolve `selected` — but note it may need nothing, since selection already changes the bar's height and reveals the toolbar. |
| 13 | Route the palette collision to `color.md` (D15) | **done · Class A** | **Executed 2026-08-24.** `color.md` gains **D17** (no rule governs what a hue means, only what a step means — five of seven hues carry two or three assignments), **D18** (the collision live inside this component: amber warning icons on amber-tagged bars), **D19** (700/800 admit no uniform label across seven hues), and questions **Q10–Q12** (may a hue carry one meaning; does the document adopt a categorical gap source; does a fill publish its label as a pair). Its step 20 records the finding, step 21 repairs a bookkeeping bug the work exposed — §4's nineteen defect rows were **invisible to the rollup counter**, so the three new ones would have counted zero. **Deliberately did not** answer Q10–Q12 here: each moves published vocabulary and none is the scheduler's to settle. |
| 14 | Standard tones to 800 + white + darkening hover (rule 2.12 revised) | **ready · Class B** | **The owner settled this 2026-08-24: the board barely uses trip colours, and an override is a transient flag that gets switched back to standard blue once resolved.** That reframes everything steps 4 and 12 were solving — measured live, **17 bars on screen carried 0 category colours**; twelve confirmed, five unconfirmed. Every hard constraint those steps hit came from the five override hues, which are not on the board. **Before → after:** fill `{hue}-700` → **`{hue}-800`**, label **white in both themes**, hover/pressed `color-mix(in oklab, black var(--rux-fill-hover-mix|-active-mix), <rest>)` — the accent button's own published mechanism. **blue 5.73 → 6.95 → 8.19, red 4.74 → 5.85 → 7.04**, sRGB branch, identical in both themes because 700/800 are theme-invariant. **No amendment needed**: 800 + white is exactly what `color.md` §2.11 publishes for blue and red. **This supersedes step 12 and rule 2.12's step-500 answer** for the standard tones — 500 was bought to satisfy hues the board does not render, and it cost 46 separation and an 87% tier to do it. **Blocked only by step 15**, which decides what the three override hues that cannot hold white at 800 do. |
| 15 | Reduce the override palette to the hues that hold a white label (D15) | **open · Class C** | **Proposed 2026-08-24, NOT executed — Class C stops and proposes.** At 800 with white: purple **6.98**, pink **4.52** clear; **teal 4.15, green 4.08, amber 2.14 fail**. The 500 escape is closed for these — 500 with white collapses in light theme (1.42–1.84). **The three that fail are the three already compromised**: green is `--rux-success` and amber is `--rux-warning` (`color.md` D17/D18), so dropping them fixes the contrast failure and the semantic collision in one move. Teal is the only casualty not already compromised, and it misses by 0.35. **Proposal:** overrides become **purple and pink**. **Scope, from the grep:** 4 CSS files per colour, `js/core/trip-colors.js` + `js/panels/print-schedule.js`, 2 picker swatches each in `index.html`, and `tests/trip-colors.test.mjs` which asserts the token set equals `TRIP_COLORS` exactly. **Stored rows are safe** — `normalizeTripColor`'s `RETIRED` map already carries `orange`/`cyan`/`yellow`, so retired names keep rendering and nothing is written to Supabase. **Open sub-question:** where retired names map. `green → blue` and `amber → red` would be semantically wrong; **purple** keeps a tagged trip *flagged* rather than silently turning it into a status colour. **Needs the owner's go-ahead before any edit.** |
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

**Q5 — Is 46 enough separation, and should a category be a hue at all?**

Rule 2.12 buys a uniform label by moving to 500 and pays **46** for it where 700 gives 80.
Whether that reads at card size is an eye question this document cannot settle, and the
specimen exists to answer it.

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
