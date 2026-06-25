# Trip Bar — Layout & Design Rules

The trip bar is a compact Gantt-style card on the scheduler grid. Each bar represents a single bus assignment for a trip. This document defines the layout rules, sizing, typography, and color system.

---

## Dimensions

| Property | Value | Notes |
|---|---|---|
| Collapsed height | **134px** | Exact fit for 7 rows + gaps + padding |
| Body padding | **4px top/bottom, 8px left/right** | `space-1` vertical, `space-2` horizontal |
| Row gap | **1px** | `--rux-trip-bar-tight-gap` |
| Icon size (all icons) | **18px** | Scoped `--rux-icon-md: 18px` on `.rux-trip-bar` |
| Day minimum width | **13rem (208px)** | Set on `.scheduler-app__grid` |

---

## Row Layout (top to bottom)

All rows use `line-height: 1.3` (`--rux-leading-snug`) unless noted.

| # | Row | Class | Font size | Weight | Height |
|---|---|---|---|---|---|
| 1 | Destination + pending icons | `__destination` | 14px (`text-sm`) | bold | 19px |
| 2 | Client | `__client` | 12px (`text-xs`) | medium | 16px |
| 3 | Contact name + phone | `__contact` | 12px (`text-xs`) | regular | 16px |
| 4 | Notes | `__notes` | 12px (`text-xs`) | medium italic | 16px (0 if empty) |
| 5 | Requirement icons | `__reqs` | 18px icons | — | 18px (0 if none) |
| 6 | Times (D / S / A) | `__time` | 12px (`text-xs`) | bold values | 16px |
| 7 | Driver + expand chevron | `__driver` | 14px (`text-sm`) | semibold | 19px |

### Height calculation

```
  Padding top:     4px
  Row 1:          19px
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
  Total:         134px
```

### Empty rows
- **Notes** (row 4): collapses to 0 when empty, no min-height
- **Requirements** (row 5): not rendered when no reqs are active
- **Client/Contact** (rows 2-3): collapse to 0 when empty, no min-height
- Trips with fewer rows will have dead space at the bottom (fixed height)

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
| Border radius | `--rux-radius-md` |
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

## Pending Indicators (row 1, right side)

Icons that flag missing data. Disappear when the condition is resolved.

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

---

## Grid Placement

Trip bars are `position: absolute` inside `.rux-scheduler__track`. Placement is calculated in JS (`placeInline` and `layoutTrack`).

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
- `--rux-trip-bar-collapsed-height` — affects row height calculation

---

## Icon Rules

- **Inside trip bars**: all icons are **18px** (scoped `--rux-icon-md: 18px`)
- **Everywhere else in UI**: all icons are **20px** (global `--rux-icon-md: 20px`)
- **Icon font**: Material Symbols Outlined
- **Font variation**: `FILL 1, wght 400, GRAD 0, opsz 24`
