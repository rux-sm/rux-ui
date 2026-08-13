# Card Components

A card is a single owner of outer chrome: `background`, `border`,
`border-radius`, `box-shadow`. Everything inside it — header, body, footer,
sections — clips to that radius and never redeclares it.

```
.rux-card
  .rux-card__header     — title + trailing actions, bottom border
  .rux-card__body       — content area (add --stack for gapped children)
    .rux-card__section  — full-width content group, border-top only,
                           shared with the next section (no double line)
      .rux-card__section-header   — title + trailing actions row (optional)
        .rux-card__section-title
        .rux-card__section-actions
      [content]
  .rux-card__footer     — actions row, top border
```

## Naming collision — needs a decision

Two components currently share almost-identical names but mean different
things:

| Class | What it is | Chrome |
| --- | --- | --- |
| `.rux-card__section` | BEM **element** of `.rux-card` (card.css:57-63) | None by default — only `--rux-card-section-border` (currently `none`) between siblings |
| `.rux-card-section` | Separate top-level **block**, hyphenated (card.css:67-88), with its own `__header`/`__body` elements | `background: var(--rux-card-section-bg)` (surface-3 tint), optional outline/shadow, full `border-radius` |

`.rux-card__section` (double underscore) and `.rux-card-section` (hyphen) are
one character apart and describe genuinely different visual treatments — a
typo silently swaps a flat divider-only group for a boxed, tinted,
rounded one. This is the kind of collision worth resolving before more
markup depends on either.

**Recommendation:** keep `.rux-card__section` as the canonical name (it's
already a true BEM element — always a child of `.rux-card__body`) and either:
- retire `.rux-card-section` / `.rux-card-section__header` /
  `.rux-card-section__body` once nothing references them, or
- fold the boxed look into `.rux-card__section--boxed` as a modifier, if a
  tinted/rounded section is still needed somewhere.

Not doing this rename yet — flagging it for your call before touching any
markup that references the current names.

## Section header (proposed addition)

Not yet implemented. `.rux-card__section` currently has no header treatment
at all — sections needing a title with a trailing icon button (e.g. "Trip
Contact" with a `+` add button, "Files" with a disabled/upload toggle) need
a new element:

```css
.rux-card__section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--rux-card-content-gap);
	min-height: var(--rux-card-header-height);
	padding: var(--rux-card-header-padding);
	border-bottom: var(--rux-card-section-border);
}

.rux-card__section-actions {
	display: flex;
	align-items: center;
	gap: var(--rux-space-2);
}
```

Reuses `--rux-card-header-height` / `--rux-card-header-padding` (already
shared with `.rux-card__header`) rather than inventing new size tokens.
Deliberately **no background** on the header row — the divider line is the
only seam; a tinted bar would reintroduce the boxed look this structure is
meant to move away from.

A section with no trailing action just omits `.rux-card__section-actions`;
`.rux-card__section-header` still renders with only the title.

## Sibling border, not per-side border

`.rux-card__section` uses `border-top` only, applied via the adjacent
sibling combinator so exactly one line renders at each seam:

```css
.rux-card__section + .rux-card__section {
	border-top: var(--rux-card-section-border);
}
```

`--rux-card-section-border` is currently `none` (tokens.css:660) — nothing
renders it yet. Setting it to a real value (e.g. `1px solid var(--rux-border)`)
is what turns this into the "edge-to-edge, top/bottom border only" layout
discussed for the trip editor.

## Why this replaces panel-inside-card nesting

The trip editor dialog currently stacks three components that each own their
own chrome: `.rux-floating-window` (border/shadow/radius),
`.rux-panel` (tab nav + scrollable body), and a `.rux-card` **per tab pane**
(its own header/body/border/shadow again). That's three overlapping
header/body/footer contracts — `.rux-floating-window__header`,
`.rux-panel__header`, and `.rux-card__header` all exist as separate classes
with overlapping jobs, and the trip editor's actual header combines the
first and third on one element (`rux-floating-window__header
rux-card__header rux-trip-dialog__header`).

The section structure above is meant to let a floating window own its outer
chrome as a single `.rux-card`, with tab panes just holding a flat list of
`.rux-card__section`s — removing the third, nested layer of card chrome per
pane. This doc does not resolve the four-way `__header`/`__body`/`__footer`
overlap between `.rux-card`, `.rux-panel`, `.rux-modal`, and
`.rux-floating-window` — that's a separate, larger naming decision than the
section work above and needs its own review.

## Status

Everything above `.rux-card__section-header` is implemented today. The
section header, the sibling-border activation, and the naming
resolution are proposed and unbuilt — this doc describes the target
shape for review, not shipped behavior. Update this note once the
`pane-trip` prototype lands.
