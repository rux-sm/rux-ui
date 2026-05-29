# Rux — Showcase UI Kit

An example app screen built **entirely** from Rux Design System primitives. No new tokens, no new components.

## What's in it

A dark dashboard for a fictional dispatch app — sidebar, topbar, stat cards, alert banner, two-column layout (data table + status sidebar). Lucide icons throughout.

## Pattern reference

| Pattern | Composed from |
|---|---|
| Sidebar nav item | `.nav-item` + Lucide icon + optional `.nav-item__badge` |
| App brand mark | `<img src="rux-mark.svg">` + bold wordmark |
| Stat card | `.rux-card` + custom `.stat` layout |
| Status badge in a row | `.rux-badge--success.rux-badge--dot` etc. |
| Driver list | `.rux-row` + `.rux-avatar--sm` per item |
| Two-col page | `grid-template-columns: 2fr 1fr; gap: var(--rux-space-5)` |

Every spacing, color, radius, and shadow value resolves through `var(--rux-*)`.
