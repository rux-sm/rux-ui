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
.rux-card--level-1..4      — ordinal nesting depth, whole-card modifiers
.rux-card--elevated        — one relative step lighter than whatever's there
.rux-card--recessed        — one relative step darker than whatever's there
```

`--level-1` through `--level-4` are **whole-card modifiers**, not per-part —
each just feeds `--rux-card-body-bg`/`-border`/`-shadow`, the same three
custom properties `.rux-card__body` already reads directly for its own
background/border/box-shadow, so a level is nothing more than three token
values, no separate rule needed per level. Level 1 aliases the plain
default exactly (a visual no-op) — it exists so a card's own depth is
always explicit in markup instead of "no class" silently meaning level 1.
Each level after 1 computes one step darker than the level before it via
relative `oklch`, so nesting deeper always reads as sinking further rather
than picking arbitrary colors by hand. Header goes transparent at levels
2–4 (the "nested card" look); level 1 keeps the plain header's own tint,
since it's the outermost tier, not something nested.

`--elevated` and `--recessed` are **dynamic, not token-backed** — each
nudges whatever `--rux-card-body-bg` is already in scope (from a level, or
the plain default if none is set) by one relative step, lighter or darker:

```css
.rux-card--elevated { --rux-card-body-bg: oklch(from var(--rux-card-body-bg) calc(l + 6%) c h); }
.rux-card--recessed { --rux-card-body-bg: oklch(from var(--rux-card-body-bg) calc(l - 6%) c h); }
```

Because they're self-referencing and declared *after* the level rules in
`card.css`, they compose with any level: `.rux-card--level-3.rux-card--elevated`
reads as "level 3, one step lighter," not a fixed color — CSS resolves a
self-reference against whatever lower-priority declaration set that same
property on the same element, which is exactly whichever level class is
also present. Background only; border/shadow stay purely level-driven.

`rux-ui/css/base/card.css` is the single source of truth; this doc explains
the *why*, not the mechanics — read the file's own comments for those.

## One header, two behaviors, chosen by structure not a modifier

`.rux-card__header` on its own is the plain default: not sticky, asymmetric
left-only padding (leans on an ambient pane/card padding), a tinted
background (`--rux-card-header-bg`).

`.rux-card__sentinel + .rux-card__header` — a header immediately preceded by
a zero-height sentinel `<div>` — gets the "was section" treatment instead:
full inline padding (it now runs edge-to-edge with no ambient padding to
lean on), its own background/border (`--rux-card-header-sticky-bg/-border`,
defaulting to an opaque fill matching the body with no border, but
independently overridable), and `position: sticky` so it docks to the top of
its scroll container until the next card's header reaches the same spot.

This is a **structural signal, not a class modifier**, deliberately: every
card built or converted as part of the Card/Panel restructure already has
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

## Levels — ordinal nesting depth

A numbered scale instead of a separate semantic name for every possible
nesting depth. `.rux-card--level-2` is a fully boxed, individually-bordered
item for content that repeats (itinerary's day-group children, Fleet's
bus-groups, Billing's payment rows, Tasks' trip cards, History's cards, Trip
Finder's results wrapper) — what used to be the fixed, standalone
`.rux-card--recessed`. Its header never gets the sentinel-gated sticky
treatment — an individual item sticking inside a long list would be noise —
and stays transparent so the body's own inset shadow reads through instead
of being covered by a duplicate paint layer.

**Each level's background is computed relative to the level before it**,
`oklch(from var(--rux-card-level-N-1-bg) calc(l - 6%) c h)` — level 2 is six
percent darker than level 1, level 3 six percent darker than level 2, and so
on, rather than every level picking an arbitrary color by hand. Level 1
itself aliases the plain `--rux-card-body-*` defaults exactly. `--rux-shadow-inset`
(levels 2+) is what actually sells the sunken read — a flat darker fill
alone communicates a color difference, not depth — and it's inset-only
(contained within the element's own box), so applying it directly to
`.rux-card__body` carries no shadow-bleed risk the way a real drop-shadow
would (see the floating-card shadow note below for what that risk actually
looks like).

**No margin of its own** — deliberately. Consumers fall into two layout
systems and one fixed margin can't serve both:

- **Flex-column consumers** (`.rux-trip-panel__payment-rows`,
  `.rux-trip-panel__bus-groups`) already space their level-2 cards via their
  own `gap`. Margins never collapse between flex children, so adding margin
  here too would stack on top of that gap instead of replacing it.
- **Plain block-flow consumers** (`.rux-trip-itinerary__day-group`,
  `.rux-trip-history__group`) set `margin: var(--rux-space-4)` directly on
  their level-2 children — not `margin-bottom` alone. Adjacent siblings are
  normal block elements, so their margins collapse into one gap the standard
  CSS way, and the *first* item in the list gets its own top margin for free
  against whatever precedes it (typically a sentinel-gated header, which has
  no margin of its own to collapse with).

Current consumers, all `--level-2`: Fleet's bus-groups, Billing's payment
rows (trip panel + trip manifest + trip-db.js), Tasks' trip cards and
post-trip cards, History's cards, Trip Finder's results wrapper.
`--level-3`/`--level-4` and `--elevated`/`--recessed` composed with any
level are available but have no consumer yet — reach for them when a
genuinely deeper nesting shows up instead of inventing a new name for it.
Itinerary's own stops are flat divided rows now, not a level at all (see
`itinerary.css`'s own file-header comment) — a deliberate exception, not an
oversight. Driver-share's per-assignment sections use a locally-scoped
`.driver-assignment-card > .rux-card` divider pattern, not a level either —
that component owns its own box chrome separately and only reuses the bare
`.rux-card` class as a structural marker for its own CSS combinator.

## Elevation

One numbered tier per "how far this container sits above the canvas,"
defined once in the primitives section of `tokens.css` and paired 1:1 with
`--rux-shadow-1/2/3` by index:

```
--rux-elevation-0-bg   Canvas
--rux-elevation-1-bg   Panel — structural, attached
--rux-elevation-2-bg   Card — default, sits inside a panel
--rux-elevation-3-bg   Elevated card / floating panel — no panel wall
--rux-elevation-4-bg   Modal — topmost, screen-blocking
```

Component tokens (`--rux-panel-bg`, `--rux-card-body-bg`, `--rux-panel-modal-bg`)
alias these instead of reaching into `--rux-surface-N` directly, so "a
floating window is one tier above an ordinary card" is a readable
relationship, not a coincidence of two components happening to reference the
same raw surface index.

Floating windows skip a layer on purpose: `.rux-panel--floating`'s
background (`--rux-panel-floating-bg`) claims elevation-3's own raw value
directly, the tier a panel-nested card would have had to pass through,
rather than sitting at elevation-2 alongside cards that *do* have that
structural context.

This ladder is a separate axis from the card level scale above — elevation
is about which *component* (Panel/Card/floating window/Modal) sits at which
tier; levels are about how many cards deep *within* the card system a given
card is nested. Level 1 (`--rux-card-level-1-bg: var(--rux-surface-2)`)
aliases the same raw primitive `--rux-elevation-2-bg` does — level 1 and the
plain default (`--rux-card-body-bg`) both land on elevation-2's own value,
which is the "visual no-op" property levels are built around — but it's a
flat value, not a `var(--rux-elevation-2-bg)` reference; levels 2–4 compute
relative to level 1 from there, independent of whatever elevation tier the
card's ambient panel happens to be at.

**A floating window's first nested card starts at level 2, not level 1** —
this follows directly from the layer-skip above. A `.rux-panel--attached`'s
own background sits at elevation-1; a level-1 card inside it (elevation-2)
reads as one clear step up, real contrast. A `.rux-panel--floating`'s own
background already sits at elevation-3 — the tier a level-1 card would
occupy — so a level-1 card dropped straight into a floating window would sit
at the *same or a lower* tier than its own shell and read as recessed, not
elevated. Start floating-window content at level 2 instead, which computes
one step past the floating shell's own elevation-3 value, preserving the
same "genuinely elevated above its container" contrast a level-1 card gets
inside an attached panel.

## Tokens

```
--rux-card-header-bg/-border/-radius/-shadow/-padding
                              plain (non-sentinel-gated) header's own look
--rux-card-header-sticky-bg/-border
                              sentinel-gated header's own look — independent
                              of the plain header tokens above; defaults to
                              matching --rux-card-body-bg with no border
--rux-card-body-bg/-border/-radius/-shadow
                              the box every card actually owns — also what
                              .rux-card--level-N feeds via these same three
                              custom properties
--rux-card-footer-bg/-border/-radius/-shadow
                              footer's own look, shares a seam with body
--rux-card-level-1..4-bg/-border/-shadow
                              what .rux-card--level-N each read — level 1
                              aliases --rux-card-body-* directly; each level
                              after computes one step darker than the level
                              before it (see Levels above); no separate
                              -radius, inherits --rux-card-body-radius.
                              --elevated/--recessed have no tokens of their
                              own — they're a dynamic oklch adjustment on
                              whichever level's --rux-card-body-bg is
                              already in scope, see card.css
--rux-card-floating-bg/-shadow
                              the ambient default applied automatically to a
                              plain card (no level, no --elevated/--recessed)
                              dropped into a .rux-panel--floating — see
                              card.css
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
headers) instead, with `.rux-card--level-2` for Fleet's own repeating bus
assignments (Itinerary's own stops are flat divided rows, not a level — see
Levels above) — no separately-boxed nested card remains anywhere inside the
trip editor.

The tool panel's four tabs (Calendar, Drivers, Tasks, History) use the same
two components for the same reasons: Tasks' and History's own date groups
are sentinel-gated `.rux-card` with their repeating trip/history cards as
`.rux-card--level-2`, and Driver Availability / Calendar Options / Trip Bar
Options / the mini calendar each get a sentinel-gated `.rux-card--level-1`
for their single titled region — explicit, not the bare `.rux-card` these
used to be, now that a plain `.rux-panel--attached` body already reads as
level 1 on its own (see Panel below) and an explicit level 1 on top of that
would collide with it. These two panels (the trip editor and the tool
panel) are the reference implementation for any future addition in the same
family.

## Panel — the outer-container primitive

Floating Window, attached (docked) panel, Modal, and Popover-surface/Menu
share one primitive, `.rux-panel` (`css/base/panel.css`), the same way Card
unified the old Section/Embed split. Unlike Card, Panel keeps the
*traditional* "header attached to the box" shape — one bordered unit, not a
floating label above a separate box — since a window/panel/dialog title bar
is supposed to read as part of the chrome. Position is a modifier
(`--attached`, `--floating`, `--modal`, `--anchored`), not a separate
component; `--elevated` is a standalone-lift appearance modifier for a
`.rux-panel` with no position context.

```
.rux-panel
  .rux-panel__header    — title + trailing actions, attached to the box
  .rux-panel__nav       — tabs-as-header slot (optional; --attached style
                           modifier for the flush, edge-to-edge look)
  .rux-panel__body      — scrollable content
  .rux-panel__pane       — one per tab, hidden via [hidden] when inactive
  .rux-panel__footer    — actions row, shares a seam with the body
  .rux-panel__tabs      — tab-strip-specific chrome; no consumer yet, every
                           panel today puts its tabs directly in __nav
.rux-panel--attached      docked/sidebar panel (Calendar Tools, Fleet,
                           Driver, Customer editors)
.rux-panel--floating      draggable window (Trip editor, Manifest, Request
                           inbox, Trip Finder, Doc viewer, Trip envelope)
.rux-panel--modal         screen-blocking dialog
.rux-panel--anchored      popover / menu surface
.rux-panel--elevated      standalone lift, no position context
```

An attached panel's body reads as level 1 on its own, no wrapper needed —
`.rux-panel--attached > .rux-panel__body`'s own background is
`--rux-card-level-1-bg` directly. A panel that subdivides its body into
titled cards (the tool panel's mini calendar / Calendar Options / Trip Bar
Options, each their own single-titled-region card) needs each of those to
be `--level-2`, one step deeper than that backdrop, or they'd blend into it
— see the "Levels" section above and the Elevation section's floating-window
note for the equivalent floating-window rule (start nested cards at level 2
there too, for the same "already-elevated shell" reason).

**Done**: all consumers listed above are on `.rux-panel` — `surface.css` is
gone, its rules folded into `panel.css`, which now also absorbed the
handful of tokens (`--rux-panel-bg`, `--rux-panel-fg`, the rail-state
tokens) that predated the merge and used to sit in a second, disconnected
"COMPONENT · panel" section of their own. Every token in that section is
`--rux-panel-*` now — no more parallel `--rux-surface-*` family carrying the
same information under a different name for tokens whose class is
`.rux-panel`. The trip editor no longer nests a whole second `.rux-panel`
just to get tabs + scrollable body + footer inside its floating window — it
uses `.rux-panel__nav--attached` (a style modifier on `.rux-panel__nav`)
directly. `initPanelScrollEdges`/`initStickySectionHeaders` and the generic
`[data-rux-tabs]` switcher in `js/core/controls.js` all key off `.rux-panel`
alone now (not two separate class families), so this same pattern is
available to any future panel with tabs.

**Not yet migrated**: Modal, Popover-surface, Menu — those still use their
original classes/tokens today, though `--rux-panel-modal-*`/
`--rux-panel-anchored-*` already exist in `tokens.css`, ready to receive
them (currently referenced only by `panel.css`'s own unused `--modal`/
`--anchored` position-modifier rules).

**Known dead code, not yet removed**: `.rux-panel--attached.is-rail` (the
collapsed desktop rail state) reads real, live tokens
(`--rux-panel-rail-bg/-border/-radius/-shadow`), but nothing in the app ever
adds the `.is-rail` class to an element — the actual, live rail-collapse
mechanism is `.scheduler-app__drawer--railable` in `scheduler-app.css`,
which reads the same four tokens independently. Left in place rather than
deleted since the tokens themselves are genuinely used elsewhere, just not
by this particular rule.

## Naming system

Three prefixes, chosen by what a class or attribute actually is:

```
rux-<name>        component — reusable, owns visual style, never
                   domain-specific (rux-panel, rux-card, rux-button, ...)
rux-u-<name>       utility — a single reusable layout/spacing rule with no
                   domain owner (rux-u-cols-2, rux-u-section-label,
                   rux-u-trip-list — utils.css)
rux-scope-<name>   scope — a hook for one domain's own overrides only;
                   never re-declares a component's own elements (__body,
                   __pane, __header, __footer stay on the component)
```

`rux-scope-<name>` replaced the old pattern of a domain baking its own name
into a BEM block prefix (`rux-driver-panel__body`, `rux-trip-panel__pane`,
...) — every element still needing domain-specific styling now carries the
shared component's own part class (`rux-panel__body`) plus a scope class
(`rux-scope-driver`) for the *domain's own* additions, instead of a
completely separate, parallel class family that happened to duplicate most
of the shared component's own rules. Current scopes: `rux-scope-driver`,
`rux-scope-fleet`, `rux-scope-customer`, `rux-scope-trip`,
`rux-scope-right-panel`, `rux-scope-manifest`, `rux-scope-request`,
`rux-scope-trip-finder`.

Not every domain-prefixed class from before this system existed was safe to
delete outright, even when its own CSS turned out to be a pure duplicate of
the shared component's rule — several are still queried directly by that
domain's own JS (pane-switching, form resets, drag-handle attachment,
scroll-to-top-on-tab-switch) and have to keep their own class as a query
hook regardless of whether their CSS carries anything unique. Check both
the CSS *and* a repo-wide grep for the class in `js/` before assuming a
domain-prefixed class is safe to fold into a scope or utility.

Data attributes follow the same idea. A domain-specific tab-strip hook like
`data-fleet-tabs` is now the generic `data-rux-tabs` (already shared,
already read by the generic `[data-rux-tabs]` switcher in
`js/core/controls.js`) plus `data-scope="fleet"` for the domain's own JS to
find *its* tab strip specifically. The same pattern applies to
domain-owned toggle buttons — `data-rux-domain-toggle` plus `data-scope`,
**not** the pre-existing `data-rux-toggle="#target"` attribute already used
by `controls.js` for a different, unrelated click-to-open/close-a-target
pattern (same word, different mechanism — collapsing them would make a
domain's plain presence-marker toggle also match the generic target-toggle
click handler). When one domain owns *multiple* distinct toggle buttons for
different purposes (Driver's own editor-drawer toggle vs. its separate
Table-Options-drawer toggle), the scope value has to be specific enough to
tell them apart — `data-scope="driver-editor"` and
`data-scope="driver-tools"`, not both just `"driver"`, or one domain's two
buttons become indistinguishable and both click handlers fire on both.
