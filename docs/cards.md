# Card Components

A card is a header that floats above its own content, unboxed, plus a body
that owns the actual chrome: `background`, `border`, `border-radius`,
`box-shadow`. The header sits flush against the body (zero gap) but is never
a descendant of the boxed element — it's a sibling in front of it, which is
the only way it can visually sit outside the box while the box still clips
its own content to `overflow: hidden`.

```
.rux-card
  .rux-card__sentinel (optional) — zero-height marker, opts the header
                                    below into sticky/full-padding treatment
  .rux-card__header      — title + trailing actions, floats above the body
  .rux-card__body         — content area (add --stack for gapped children)
  .rux-card__footer      — actions row, shares a seam with the body
.rux-card--recessed        — repeating list item nested in a card: own
                              border/bg/shadow, darker than its ambient card
.rux-card--elevated         — lighter body (one elevation tier up), used by
                              floating surfaces
```

`rux-ui/css/base/card.css` is the single source of truth; this doc explains
the *why*, not the mechanics — read the file's own comments for those.

## One header, two behaviors, chosen by structure not a modifier

`.rux-card__header` on its own is the plain default: not sticky, asymmetric
left-only padding (leans on an ambient pane/card padding), a tinted
background (`--rux-card-header-bg`).

`.rux-card__sentinel + .rux-card__header` — a header immediately preceded by
a zero-height sentinel `<div>` — gets the "was section" treatment instead:
full inline padding (it now runs edge-to-edge with no ambient padding to
lean on), an opaque background matching the body (`--rux-card-body-bg`), and
`position: sticky` so it docks to the top of its scroll container until the
next card's header reaches the same spot.

This is a **structural signal, not a class modifier**, deliberately: every
card built or converted as part of the Card/Surface restructure already has
a sentinel as its header's preceding sibling, so it opts in automatically.
Plain `.rux-card` usage that predates the restructure (Driver panel's View
Options/Filters cards, the passenger editor, the components catalog) has no
sentinel, so it keeps its original non-sticky, tinted-header look with zero
markup changes and zero risk of a silent regression.

The sticky mechanism itself: `initStickySectionHeaders` in
`js/core/controls.js`, auto-run for every `.rux-panel` at `DOMContentLoaded`.
An `IntersectionObserver` watches each `.rux-card__sentinel`, toggling
`.is-stuck` (which adds `--rux-shadow-1`) on `entry.target.nextElementSibling`
the instant it docks — the standard workaround for "which sticky element is
actually pinned right now" since there's no shipped `:stuck` pseudo-class. A
`MutationObserver` re-scans for new sentinels as dynamically-rendered content
(itinerary day groups, Tasks/History date groups, all rebuilt via
`innerHTML`) appears, so nothing needs its own wiring per consumer.

`z-index: var(--rux-z-sticky)`, not a bare `1` — ordinary in-flow content
(e.g. `.rux-button--segment` in `controls.css`) can also claim `z-index: 1`
without establishing its own stacking context, and a tied z-index falls back
to DOM order. The shared sticky token — the same one the scheduler's own
sticky row/column headers use — reliably outranks that instead of guessing.

## Recessed — the boxed, repeating-item variant

`.rux-card--recessed` is the opposite design to a plain nested card: a fully
boxed, individually-bordered item for content that repeats (itinerary stops,
bus assignment rows, payment rows, tasks-panel trip cards, trip-history
cards). Its header never gets the sentinel-gated sticky treatment — an
individual item sticking inside a long list would be noise — and its header
background stays transparent so the body's own inset shadow reads through
instead of being covered by a duplicate paint layer.

**Background is relative, not a fixed surface index.** `--rux-card-recessed-bg`
computes as `oklch(from var(--rux-card-body-bg) calc(l - 6%) c h)` — six
percent darker than whatever `--rux-card-body-bg` is actually in scope,
because the same `.rux-card--recessed` sits inside an ordinary card in some
places and an elevated floating-surface card in others, and a fixed value
can only be "one step darker" correctly in one of those two contexts. The
same relative technique, inverted (`calc(l + 6%)`), is how a plain
`.rux-card` lightens relative to its own ambient body background — see
`.rux-card`'s own rule in `card.css`.

**No margin of its own** — deliberately. Consumers fall into two layout
systems and one fixed margin can't serve both:

- **Flex-column consumers** (`.rux-trip-panel__payment-rows`,
  `.rux-trip-panel__bus-groups`) already space their recessed cards via their
  own `gap`. Margins never collapse between flex children, so adding margin
  here too would stack on top of that gap instead of replacing it.
- **Plain block-flow consumers** (`.rux-trip-itinerary__day-group`,
  `.rux-trip-history__group`) set `margin: var(--rux-space-4)` directly on
  their recessed children — not `margin-bottom` alone. Adjacent siblings are
  normal block elements, so their margins collapse into one gap the standard
  CSS way, and the *first* item in the list gets its own top margin for free
  against whatever precedes it (typically a sentinel-gated header, which has
  no margin of its own to collapse with).

Current consumers: itinerary stops and dwell cards, payment rows (trip panel
+ trip manifest), tasks-panel trip cards and post-trip cards, trip-history
cards, driver-share's per-assignment sections (via a locally-scoped
`.driver-assignment-card > .rux-card` divider pattern, not recessed — that
component owns its own box chrome separately and only reuses the bare
`.rux-card` class as a structural marker for its own CSS combinator).

## Elevation

One numbered tier per "how far this container sits above the canvas,"
defined once in the primitives section of `tokens.css` and paired 1:1 with
`--rux-shadow-1/2/3` by index:

```
--rux-elevation-0-bg   Canvas
--rux-elevation-1-bg   Panel — structural, attached
--rux-elevation-2-bg   Card — default, sits inside a panel
--rux-elevation-3-bg   Elevated card / floating surface — no panel wall
--rux-elevation-4-bg   Modal — topmost, screen-blocking
```

Component tokens (`--rux-panel-bg`, `--rux-card-body-bg`,
`--rux-card-elevated-bg`, `--rux-modal-bg`) alias these instead of reaching
into `--rux-surface-N` directly, so "a floating surface is one tier above an
ordinary card" is a readable relationship, not a coincidence of two
components happening to reference the same raw surface index.

Floating surfaces skip a layer on purpose: `.rux-surface--floating`'s
background claims elevation-3 directly, the tier a panel-nested card would
have had to pass through, rather than sitting at elevation-2 alongside cards
that *do* have that structural context.

A plain nested `.rux-card` is not its own tier — it has no background of its
own beyond lightening relative to whatever ambient `--rux-card-body-bg` it
inherits. `.rux-card--recessed` goes the opposite direction from
Panel→Card→Elevated (which get lighter): it's computed *darker* than its own
ambient card, because it reads as a sunken well rather than something
raised.

## Tokens

```
--rux-card-header-bg/-border/-radius/-shadow/-padding
                              plain (non-sentinel-gated) header's own look
--rux-card-body-bg/-border/-radius/-shadow
                              the box every card actually owns
--rux-card-footer-bg/-border/-radius/-shadow
                              footer's own look, shares a seam with body
--rux-card-elevated-bg/-shadow
                              what .rux-card--elevated feeds into
                              --rux-card-body-bg/-shadow
--rux-card-recessed-bg/-border/-shadow
                              .rux-card--recessed's own body look —
                              -bg is computed relative to --rux-card-body-bg,
                              not a fixed surface index; no separate -radius,
                              inherits --rux-card-body-radius
--rux-card-section-border    generic divider border-top, still used directly
                              by a few flat-divider layouts outside the Card
                              component itself (scheduler-app.css,
                              trip-history.css, trip-envelope.css)
```

## Why this replaced panel-inside-card nesting

The trip editor dialog used to stack three components that each owned their
own chrome: a floating window (border/shadow/radius), `.rux-panel` (tab nav
+ scrollable body), and a `.rux-card` **per tab pane** (its own
header/body/border/shadow again) — three overlapping header/body/footer
contracts for one window. All four trip editor tabs (Details, Billing,
Itinerary, Fleet) now use plain `.rux-card` groups (sentinel-gated, sticky
headers) instead, with `.rux-card--recessed` for their own repeating lists
(bus assignments, itinerary stops/day-groups) — no separately-boxed nested
card remains anywhere inside the trip editor.

The tool panel's four tabs (Calendar, Drivers, Tasks, History) use the same
two components for the same reasons: Tasks' and History's own date groups
are sentinel-gated `.rux-card` with their repeating trip/history cards as
`.rux-card--recessed`, and Driver Availability / View Options / the mini
calendar each get a sentinel-gated `.rux-card` for their single titled
region. These two surfaces (the floating surface and the tool panel) are the
reference implementation for any future addition in the same family.

## Surface — the outer-container primitive

Floating Window, Modal, and Popover-surface/Menu share one primitive,
`.rux-surface` (`css/base/surface.css`), the same way Card unified the old
Section/Embed split. Unlike Card, Surface keeps the *traditional* "header
attached to the box" shape — one bordered unit, not a floating label above a
separate box — since a window/panel/dialog title bar is supposed to read as
part of the chrome. Position is a modifier (`--attached`, `--floating`,
`--modal`, `--anchored`), not a separate component.

**Done**: all six floating windows (trip editor, manifest, request inbox,
trip finder, doc viewer, trip envelope) are `.rux-surface--floating` now —
`floating-window.css` is gone, its rules folded into `surface.css`. The Card
family rename (Section → plain `.rux-card`, Embed → `.rux-card--recessed`)
described above is also done.

**Not yet migrated**: Panel, Modal, Popover-surface, Menu — those still use
their original classes/tokens today.
