# Trip Bar — Layout & Design Rules

> **Colour values below are the trip bar's own mapping, not design-system vocabulary.**
> [`docs/foundations/color.md`](foundations/color.md) owns the scales and the roles; a
> scheduler feature owns which of them its objects take, and the trip bar's tone recipes are
> exactly that (its rule 1.3). **Several literals here have already drifted from the CSS** —
> the interactive overlay is documented at `0.2` where `trip-bar.css` renders `0.24`, and the
> notes/pending-icon values do not appear in the stylesheet at all. Treat every raw `oklch()`
> in this file as presumed stale and read the CSS. Recorded rather than repaired at
> `color.md` step 8: rewriting a feature's colour tables is the scheduler's work, not a
> consolidation pass's.

The trip bar is a compact Gantt-style card on the scheduler grid. Each bar represents a single bus assignment for a trip. This document defines the layout rules, sizing, typography, and color system.

---

## Dimensions

| Property | Value | Notes |
|---|---|---|
| Collapsed height | **135px** | Exact fit for 7 rows + gaps + padding |
| Body padding | **4px all sides** | `space-1` uniform |
| Row gap | **1px** | `--sched-trip-bar-tight-gap` |
| Icon size (all icons) | **18px** | Scoped `--sched-trip-bar-icon-size` on `.sched-trip-bar` |
| Day minimum width | **13rem (208px)** | Set on `.sched-app__grid` |

---

## Row Layout (top to bottom)

All rows use `line-height: 1.3` (`--rux-leading-snug`) unless noted. All rows have `min-height` set so they **always reserve space** even when empty — every bar is an identical fixed grid.

| # | Row | Class | Font size | Weight | Min-height | Content |
|---|---|---|---|---|---|---|
| 1 | Destination + bus pill | `__destination` | 14px (`text-sm`) | bold | 20px | Destination left, bus pill right (if multi-bus) |
| 2 | Client | `__client` | 12px (`text-xs`) | medium | 16px | Customer name |
| 3 | Contact | `__contact` | 12px (`text-xs`) | regular | 16px | Name + phone (4px gap, no dot separator) |
| 4 | Notes | `__notes` | 12px (`text-xs`) | medium italic | 16px | Yellow text, operational callout |
| 5 | Reqs + pending icons | `__reqs` | 18px icons | — | 18px | Req icons left, pending icons right |
| 6 | Times (D / S / A) | `__time` | 12px (`text-xs`) | bold values | 16px | D/S/A labels at 55% opacity |
| 7 | Drivers + expand | `__drivers` | 14px (`text-sm`) | semibold | 19px | Driver names + expand chevron |

### Height calculation

```
  Padding top:     4px
  Row 1:          20px
  Gap:             1px
  Row 2:          16px
  Gap:             1px
  Row 3:          16px
  Gap:             1px
  Row 4:          16px
  Gap:             1px
  Row 5:          18px
  Gap:             1px
  Row 6:          16px
  Gap:             1px
  Row 7:          19px
  Padding bottom:  4px
  ─────────────────────
  Total:         135px
```

### Fixed grid rules
- **All 7 rows always reserve space** via `min-height`, even when empty
- **No spacer** — content flows top to bottom, no flex push
- **Empty rows** hold their height — every bar is identical regardless of data

---

## Optical Radius System

All nested elements follow the optical radius formula: `inner radius = outer radius - gap`.

| Element | Radius | Calculation |
|---|---|---|
| Trip bar (outer) | **8px** (`--rux-radius-md`) | Base |
| Action toolbar | **4px** | 8px - 4px margin |
| Bus pill | **4px** | 8px - 4px padding |
| Expand chevron button | **4px** | 8px - 4px padding |
| Interactive overlay bg | `oklch(0% 0 0 / 0.2)` | Shared across action bar, bus pill, expand button |

### Rule
Any element nested inside the trip bar with a background uses:
- **4px border-radius** (outer 8px minus 4px body padding)
- **20% black overlay** (`oklch(0% 0 0 / 0.2)`) for background

---

## Action Toolbar

Appears above the body when the trip bar is selected (`.is-active`).

| Property | Value |
|---|---|
| Layout | `grid: repeat(5, 1fr)` |
| Gap | 0 |
| Padding | 0 (buttons fill edge-to-edge) |
| Margin | 4px (`space-1`) — creates floating inset |
| Background | `oklch(0% 0 0 / 0.2)` — 20% black overlay |
| Border radius | 4px (optical: 8px outer - 4px margin) |
| Overflow | hidden (clips button hover to rounded corners) |

### Buttons (left to right)

| # | Icon | Label | Action |
|---|---|---|---|
| 1 | `add` | Open trip | Opens trip in the panel |
| 2 | `swap_vert` | Change bus | Opens bus picker |
| 3 | `attach_file` / `upload` | View/Upload Itinerary | Opens doc if exists, uploads if not |
| 4 | `mail` | Trip envelope | Email action |
| 5 | `more_horiz` | Other | Additional options |

All buttons are `rux-button--ghost rux-button--icon` with `width: 100%; min-width: 0` to fill their grid cell.

---

## Bus Pill

Shows which bus in a multi-bus trip (e.g. "1/2", "2/2"). Only appears when trip has multiple assignments.

| Property | Value |
|---|---|
| Position | Row 1, right-aligned next to destination |
| Height | 20px |
| Padding | 0 4px |
| Font size | 10px |
| Font weight | bold |
| Background | `oklch(0% 0 0 / 0.2)` |
| Border radius | 4px |
| Color | `--rux-fg-on-accent` (white) |

---

## Color System

### Background (status-driven)

| State | Variable | Value |
|---|---|---|
| Default (confirmed) | `--_tone` | `--rux-accent` (blue) |
| Unconfirmed | `--_tone` | `--rux-danger` (red) |
| Surface | `--_surface` | `oklch(from tone 60% 0.24 h)` |
| Hover | `--_surface-hover` | `oklch(from tone 58% 0.24 h)` |
| Active/selected | `--_surface-active` | `oklch(from tone 55% 0.24 h)` |

All surfaces are **fully opaque** — no alpha transparency.

### Text hierarchy (background-agnostic)

All text uses white with opacity tiers. Works on any status background color.

| Tier | Token | Opacity | Used for |
|---|---|---|---|
| Primary | `--rux-fg-on-accent` | 100% | Destination, times, driver, bus label |
| Secondary | `--rux-fg-on-accent-muted` | 75% | Client, contact, late times |
| Tertiary | `--rux-fg-on-accent-subtle` | 55% | Time labels (D/S/A), separators |

### Special colors

| Element | Color | Notes |
|---|---|---|
| Notes text | `oklch(90% 0.15 90)` | Yellow — stands out as operational callout |
| Pending icons | `oklch(85% 0.2 24)` | Bright red — action needed indicators |
| Req icons | `--rux-fg-on-accent` | Full white |

---

## Pending Indicators (row 5, right-aligned)

Icons that flag missing data. Sit on the requirements row, pushed right via `margin-left: auto`. Disappear when the condition is resolved.

| Key | Icon | Condition |
|---|---|---|
| Itinerary | `attach_file` | No "Itinerary" document uploaded |
| Trip contact | `phone_enabled` | No trip contact name or phone |
| Contract | from billing config | Payment status is "pending" |
| PO | `request_quote` | Payment status is "contract_signed" (needs PO) |
| Invoice | `receipt` | Invoice status is "pending" |

---

## Expanded Details (below driver row)

Shown when the expand chevron (`keyboard_arrow_down`) is clicked. Requires `.is-active`.

| Property | Value |
|---|---|
| Expand button bg | `oklch(0% 0 0 / 0.2)` |
| Expand button radius | 4px |

| Label | Field |
|---|---|
| D1 | Driver 1 pay |
| D2 | Driver 2 pay |
| MI | Estimated miles |
| QT | Quoted price |
| PO | PO number (full width) |
| ACT | Actual miles |
| INV | Invoice number |
| PMT | Payment detail (full width) |

Values truncate with ellipsis — no wrapping.

---

## Multi-day Modifiers

| Modifier | Effect |
|---|---|
| `--multi-day` | Body/actions constrained to first day column width |
| `--from-prev` | No left radius, diagonal stripe on left edge |
| `--to-next` | No right radius, diagonal stripe on right edge |
| `--has-conflict` | Adds conflict banner row height (multi-day only) |

---

## Animations

| Trigger | Animation | Duration |
|---|---|---|
| Bus swap | FLIP slide from old row to new row | `--rux-duration-slow` (360ms) |
| Trip deletion | Fade out + scale(0.9) + translateY(-8px) | `--rux-duration-base` (220ms) |
| Hover | Background color shift | `--rux-duration-fast` (140ms) |
| Select/deselect | Height change (action bar reveal) | `--rux-duration-base` (220ms) |
| Expand/collapse details | Height change | `--rux-duration-base` (220ms) |
| Click-away close (expanded) | Staged: collapse details (220ms) → then deactivate | Sequential, not simultaneous |

---

## Grid Placement

Trip bars are `position: absolute` inside `.sched-scheduler__track`. Placement is calculated in JS (`placeInline` and `layoutTrack`).

### Insets

All insets use `--rux-space-2` (8px) as the base, with 1px border compensation.

| Side | Inset | Border | Visual gap |
|---|---|---|---|
| Left | 8px | none | 8px |
| Right | 8px + 1px border-width subtracted from width | 1px `border-inline-end` on day column | 8px |
| Top | 8px | none | 8px |
| Bottom | 8px + 1px added to row height | 1px `border-block-end` on track | 8px |

### Horizontal formula

```
left:  calc(startPct% + var(--rux-space-2))
width: calc(spanPct% - var(--rux-space-4) - var(--rux-border-width))
```

The width subtracts `16px + 1px` — the extra 1px accounts for the day column's right border so left and right gaps are visually equal.

### Vertical formula

```
top:        inset (8px) for first lane, cumulative for subsequent lanes
row-height: content height + inset + 1px (border compensation)
lane-gap:   var(--rux-space-2) (8px) between stacked bars
```

### Key dependencies

Changing any of these requires updating the placement math:
- `--rux-space-2` — base inset value
- `--rux-border-width` — grid line thickness
- `--sched-trip-bar-collapsed-height` — affects row height calculation

---

## Icon Rules

- **Inside trip bars**: all icons are **18px** (scoped `--sched-trip-bar-icon-size`)
- **Everywhere else in UI**: all icons are **20px** (global `--rux-icon-md: 20px`)
- **Icon font**: Material Symbols Outlined
- **Font variation**: `FILL 1, wght 400, GRAD 0, opsz 24`
