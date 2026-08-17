# Card Components

A card has three parts, or four when it has a footer: outer shell, header,
body, and optional footer. `.rux-card` owns the outer `background`, `border`,
`border-radius`, `box-shadow`, and rounded clip. Its regions remain square and
own only their fill, padding, and shared dividers. That single edge owner
prevents scrolling body content or borders from showing through a rounded
header corner.

```
.rux-card                  — outer frame and rounded clip
  .rux-card__header       — title + trailing actions; bottom divider
  .rux-card__body         — content area (add --stack for gapped children)
  .rux-card__footer       — optional actions row; top divider
.rux-card--elevated        — one relative step lighter than the plain default
.rux-card--recessed        — one relative step darker than the plain default
.rux-card--borderless      — makes the outer frame transparent
```

**One card color, regardless of nesting depth** — see "Reference: Vercel
Geist colors" in `README.md`. Rux UI used to have a numbered
`.rux-card--level-1` through `-4` nesting scale, each level computing one
step darker via relative `oklch`; that system is gone. There are now just
two surfaces app-wide: `--rux-surface-0` (canvas, chrome — shells, panels,
headers, tabs) and `--rux-surface-1` (everything raised off it — cards,
content areas, modals). A card nested inside a card inside a panel reads the
same color at every depth.

`--elevated` and `--recessed` are **dynamic, not token-backed** — each
nudges whatever `--rux-card-body-bg` is already in scope by one relative
step, lighter or darker, for the rare case a specific card needs to stand
out from an identical sibling:

```css
.rux-card--elevated { --rux-card-body-bg: oklch(from var(--rux-card-body-bg) calc(l + 6%) c h); }
.rux-card--recessed { --rux-card-body-bg: oklch(from var(--rux-card-body-bg) calc(l - 6%) c h); }
```

Background only; border/shadow stay untouched — this is just a brightness
nudge, not a new elevation tier.

`rux-ui/css/base/card.css` is the single source of truth; this doc explains
the *why*, not the mechanics — read the file's own comments for those.

## Header behavior

`.rux-card__header` remains in normal document flow. It owns its fill,
padding, title layout, and the divider shared with the body. It owns no outer
border or radius: `.rux-card` clips the header and every other region to the
single shell boundary. The header scrolls with its card rather than sticking
independently inside a panel.

## Repeating list items — plain `.rux-card`, no modifier

Content that repeats (itinerary's day-group children, Fleet's bus-groups,
Billing's payment rows, Tasks' trip cards, History's cards, Trip Finder's
results wrapper) is just a plain `.rux-card` now — the same class, same
color, as a titled top-level card. There used to be a dedicated
`.rux-card--level-2` modifier for this pattern (a fully boxed,
individually-bordered nested item); it's gone along with the rest of the
level system, since there's no longer a darker "nested" tier to step down
to. `.rux-card`'s own base rule carries `min-width: 0` specifically for
this — every one of these consumers is a flex child that needs to
shrink/truncate properly rather than forcing its container wide.

The outer card frame remains the only border and radius at every nesting
depth; nested headers and bodies do not create competing boxes.

**No margin of its own** — deliberately. Consumers fall into two layout
systems and one fixed margin can't serve both:

- **Flex-column consumers** (`.rux-scope-trip__payment-rows`,
  `.rux-scope-trip__bus-groups`) already space their nested cards via their
  own `gap`. Margins never collapse between flex children, so adding margin
  here too would stack on top of that gap instead of replacing it.
- **Plain block-flow consumers** (`.rux-trip-itinerary__day-group`,
  `.rux-trip-history__group`) set `margin: var(--rux-space-4)` directly on
  their nested children — not `margin-bottom` alone. Adjacent siblings are
  normal block elements, so their margins collapse into one gap the standard
  CSS way, and the *first* item in the list gets its own top margin for free
  against whatever precedes it (typically its card header, which has no
  margin of its own to collapse with).

Itinerary's own stops are flat divided rows, not a card at all (see
`itinerary.css`'s own file-header comment) — a deliberate exception, not an
oversight. Driver-share's per-assignment sections use a locally-scoped
`.driver-assignment-card > .rux-card` divider pattern, which only reuses the
bare `.rux-card` class as a structural marker for its own CSS combinator.

## Tokens

```
--rux-card-shell-fg/-bg/-border/-radius/-shadow
                              outer card surface and edge geometry
--rux-card-header-bg/-border/-shadow/-padding/-height/-weight
                              plain header fill, divider, shadow, and inset
--rux-card-body-bg
--rux-card-padding-block/-inline, --rux-card-padding
--rux-card-content-gap
                              content fill, padding, and internal rhythm
--rux-card-footer-bg/-border
                              footer fill and divider shared with body
--rux-card-section-border    generic divider border-top, still used directly
                              by a few flat-divider layouts outside the Card
                              component itself (scheduler-app.css,
                              trip-history.css, trip-envelope.css)
```

The established `--rux-card-fg`, `--rux-card-border-width`, and
`--rux-card-body-border/-radius/-shadow` tokens remain compatibility sources
for the shell aliases, so existing overrides continue to work.
`--rux-card-header-radius` and `--rux-card-footer-radius` also remain defined
for compatibility but the shared regions no longer consume them; the outer
shell is the sole radius owner.

`--elevated`/`--recessed` have no tokens of their own — they're a dynamic
`oklch` adjustment on whatever `--rux-card-body-bg` is already in scope, see
card.css. `--rux-card-level-1..4-*` and `--rux-card-floating-bg/-shadow`
no longer exist — deleted along with the level system and the "floating
windows skip a layer" mechanism they backed (see Panel section below).

## Why this replaced panel-inside-card nesting

The trip editor dialog used to stack three components that each owned their
own chrome: a floating window (border/shadow/radius), `.rux-panel` (tab nav
+ scrollable body), and a `.rux-card` **per tab pane** (its own
header/body/border/shadow again) — three overlapping header/body/footer
contracts for one window. All four trip editor tabs (Details, Billing,
Itinerary, Fleet) now use plain `.rux-card` groups instead — no
separately-boxed nested card remains anywhere inside the trip editor.

The tool panel's four tabs (Calendar, Drivers, Tasks, History) use the same
two components for the same reasons: Tasks' and History's date groups are
`.rux-card` components with repeating trip/history cards nested inside, and
Driver Availability / Calendar Options / Trip Bar Options / the mini calendar
each get their own `.rux-card` for their single titled region. These two panels
(the trip editor and the tool panel) are the reference implementation for any
future addition in the same family.

## Panel — the outer-container primitive

Floating Window, attached (docked) panel, Modal, and Popover-surface/Menu
share one primitive, `.rux-panel` (`rux-ui/css/base/panel.css`), the same way Card
unified the old Section/Embed split. Unlike Card, Panel keeps the
*traditional* "header attached to the box" shape — one bordered unit, not a
floating label above a separate box — since a window/panel/dialog title bar
is supposed to read as part of the chrome. Position is a modifier
(`--attached`, `--floating`, `--modal`, `--anchored`), not a separate
component.

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
```

**Panel shells and panes are surface-0; cards inside them are surface-1** —
uniformly, for every position. `.rux-panel--attached`'s own shell
(`--rux-panel-attached-bg`) and `.rux-panel--floating`'s own shell
(`--rux-panel-floating-bg`) are both `--rux-surface-0` now; a floating
window is chrome, not content, the same as an attached panel.
`--rux-panel-pane-bg` (the content area following an attached tab strip,
and any panel's body with no tabs at all) is also `--rux-surface-0` — the
panel's own backdrop, not a card, whether the panel is attached or
floating. Every panel's actual content — a titled card, or a repeating
list item — reads `--rux-surface-1`/`--rux-card-body-bg` and contrasts
against that shell correctly. There is no floating-specific pane override
of any kind: every floating-window pane (the trip editor's four tabs
included) wraps its content in `.rux-card`, exactly the way an attached
panel's does, so no separate "floating windows skip a layer" mechanism is
needed — floating and attached panels behave identically.

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
directly. `initPanelScrollEdges` and the generic `[data-rux-tabs]` switcher in
`rux-ui/js/controls.js` both key off `.rux-panel`
alone now (not two separate class families), so this same pattern is
available to any future panel with tabs.

**Not yet migrated**: Modal, Popover-surface, Menu — those still use their
original classes/tokens today, though `--rux-panel-modal-*`/
`--rux-panel-anchored-*` already exist in `tokens.css`, ready to receive
them (currently referenced only by `panel.css`'s own unused `--modal`/
`--anchored` position-modifier rules).

**Not yet migrated to the two-surface model**: no full pass has verified
every panel-adjacent surface (menus, popovers, tables, tabs) picked the
right side of the chrome/content split — see README.md's "Reference: Vercel
Geist colors" for the split as it was applied and where it's still
provisional.

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
(`sched-scope-driver`) for the *domain's own* additions, instead of a
completely separate, parallel class family that happened to duplicate most
of the shared component's own rules. Current scopes: `sched-scope-driver`,
`sched-scope-fleet`, `sched-scope-customer`, `sched-scope-trip`,
`sched-scope-right-panel`, `sched-scope-manifest`, `sched-scope-request`,
`sched-scope-trip-finder`.

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
`rux-ui/js/controls.js`) plus `data-scope="fleet"` for the domain's own JS to
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
