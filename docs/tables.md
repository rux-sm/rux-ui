# Table Components

> **Tier: component recipe.** This document is the component tier — which class and token
> each part consumes — not a foundation document. The foundation set outranks it wherever
> they touch: [`layout.md`](foundations/layout.md) 2.14.0 (§9.4 density, §9.5 columns),
> [`color.md`](foundations/color.md) 4.10.0, [`typography.md`](foundations/typography.md) 6.1.0,
> [`content.md`](foundations/content.md) 1.0.2, [`composition.md`](foundations/composition.md) 1.10.0
> (§2.3 records, §2.3.1 narrow). Where they disagree, the foundation document wins and this
> file is corrected in the same change. Values below are this component's own contract; each
> was checked against `tokens.css` and the contracts above on 2026-08-26. A sentence here
> that states a shared value or a MUST belongs in a foundation document, per the one-home
> rule.

A table is a scroll wrapper around a plain `<table>`. The wrapper owns the frame — border,
radius, background, and the horizontal scroll — so the table itself owns no edges and can
be swapped without touching the surface it sits in.

```
.rux-table-wrap            — frame, radius, background, overflow-x
  .rux-table              — the table; no border, no radius of its own
    thead > tr > th       — column headers
    tbody > tr > td       — rows and cells
```

---

## 1. Parts and the tokens they consume

| Part | Property | Token |
|---|---|---|
| `.rux-table-wrap` | background | `--rux-table-wrap-bg` |
| | border | `--rux-table-wrap-border` |
| | radius | `--rux-table-wrap-radius` |
| `.rux-table` | background | `--rux-table-bg` |
| | text | `--rux-table-fg` |
| `thead th` | background | `--rux-table-header-bg` |
| | text | `--rux-table-header-fg` |
| | weight | `--rux-table-header-weight` |
| | tracking | `--rux-table-header-tracking` |
| `tbody td` | height | `--rux-table-row-height` → `--rux-row-height-md` |
| | inline padding | `--rux-table-cell-padding-inline` (8px per side) |
| | first/last inline padding | `--rux-table-edge-padding-inline` |
| | font size | `--rux-table-cell-font-size` |
| | weight | `--rux-table-cell-weight` |
| | divider | `--rux-table-border-width` / `--rux-table-border-color` |
| `tbody tr:hover` | background | `--rux-table-row-hover-bg` |
| `tbody tr[aria-current="true"]` | background | `--rux-table-row-selected-bg` |

**Density is not this document's.** Which rung a table takes, and the band paired above it,
are `layout.md` §9.4. A table that needs a rung other than the default sets
`--rux-table-row-height` on its own block:

```css
.driver-roster__table { --rux-table-row-height: var(--rux-row-height-lg); }
```

**Column widths are not this document's either** — `layout.md` §9.5. The idiom for
"shrink to content" on a `<table>` is `width: 1%` plus `white-space: nowrap` on the `<th>`,
which resolves to the widest cell rather than to one percent.

---

## 2. Column headers

Sourced from Carbon's data table, guidance-only, read 2026-08-26.

- A column title is **one or two words** describing that column's data.
- Sentence case (`content.md`), no trailing period.
- A title too long to fit **wraps to two lines and then truncates**, with the full text in a
  tooltip on hover. It does not shrink the column.
- Where a column carries an icon and no visible label, the `<th>` takes an `aria-label`
  rather than a visually-hidden span — this system publishes no visually-hidden utility, and
  inventing one to fit a table is what the `rux-design` skill's "propose, do not add" rule
  exists to stop.

**Filterable and sortable headers** are already published: `th[data-col-filter]` carries the
hover and `.is-filtered` states, and `.rux-col-filter-icon` is its indicator. Both live in
`rux-ui/css/base/table.css`.

---

## 3. Rows as controls

A records table opens its record from the row (`composition.md` §2.3). That makes the row a
control, and it needs the things a control needs:

- A `role` and an accessible name. A bare `<tr tabindex="0">` reads as an anonymous generic
  — and at narrow widths, `display: block` drops the implicit `table`/`row`/`cell` roles
  entirely, so they must be **declared in the markup** (`composition.md` §2.3.1) rather than
  inherited at any width.
- **One delegated listener on `<tbody>`**, not a pair per row rebound on every render.
- Selection is `aria-current="true"` on the row, which is what
  `--rux-table-row-selected-bg` keys off. It is not a class.
- `tbody tr:has(:focus-visible)` already carries the focus treatment, so a focusable cell
  child lights its row without extra work.

**Build cells as nodes, not template strings.** Every value in a table comes from the
database, and an `innerHTML` cell builder is one un-escaped field away from breaking its own
markup. `textContent` closes it by construction.

---

## 4. The toolbar above it

Carbon reserves the table toolbar for **global table actions** — settings, complex filters,
export, edit — and caps it at **five actions**, with the rest behind an overflow menu.

In this system that band is `.rux-workspace__header--table` and its height is paired to the
table's density rung (`layout.md` §9.4). What belongs *in* it is
`composition.md` §2.3.2: controls that determine what the table shows — search, scope, view
switch — live in the band, and a rail holds only configuration a user can leave shut.

---

## 5. Known gaps

| # | Gap |
|---|---|
| T1 | **Numeric alignment is unsourced.** Three feature stylesheets right-align numeric columns; Carbon publishes no alignment guidance and Geist publishes no table layer. `layout.md` Q7 carries it. Until that is answered, a new table right-aligning numerics is following house practice, not a rule. |
| T2 | **No selection, expansion, or batch-action variant.** Carbon publishes all three; this system publishes none, and nothing in the application needs them yet. Recorded so their absence reads as unbuilt rather than forbidden. |
| T3 | **No empty, loading, or error state in the component.** Each consumer hand-rolls one — `driver-app__empty`, `driver-roster__none` — which is two implementations of the same idea and will be three. A shared `.rux-table` state row is the obvious promotion once a third appears. |
| T4 | **`--rux-table-row-height` is a floor, not a height.** A cell taller than the rung grows the row silently: Requests runs 61px against a 40px rung today. That is correct behaviour and worth knowing before reading a rung as a guarantee. |
