# Utilities

> **Tier: component recipe.** This document is the component tier — which class and token
> each part consumes — not a foundation document. The foundation set outranks it wherever
> they touch: [`layout.md`](foundations/layout.md) 2.12.0 (§7 the space scale, §7.1 the
> spacing roles), [`typography.md`](foundations/typography.md) 5.0.0 (the label role
> `.rux-u-section-label` reads), [`naming.md`](foundations/naming.md) 1.18.0 (the `rux-u-`
> prefix). Where they disagree, the foundation document wins and this file is corrected in
> the same change. Values below are these utilities' own contract; each was checked against
> `rux-ui/css/base/utils.css` on 2026-08-23 (`composition.md` step 9). A sentence here that
> states a shared value or a MUST belongs in a foundation document, per the one-home rule.

A utility is **one rule, no elements, no modifiers** — which is why it carries the `rux-u-`
prefix rather than a block name (`naming.md` rule 2.5). Reach for a component first; a
utility is for the layout or spacing that no component owns.

## Choosing between them

| Utility | Shape | Use when |
|---|---|---|
| `.rux-u-cluster` | flex row, **wraps**, `--rux-space-3` gap | a group of controls that MAY fall to a second line when the container narrows |
| `.rux-u-row` | flex row, **does not wrap**, `--rux-space-3` gap | items that must stay on one line — a label beside an action cluster |
| `.rux-u-spacer` | `flex: 1 1 auto` | pushing two siblings apart inside a row, without margin-auto |
| `.rux-u-stack` | flex column, `--rux-stack-gap` | vertical rhythm where the gap replaces margins |
| `.rux-u-cols-2` | 2-column grid, collapses at a 360px container | a two-column form grid |
| `.rux-u-section-label` | the 12px label role **plus a divider beneath** | an eyebrow heading that divides content inside one surface |
| `.rux-u-record-list` | flex column, `--rux-space-2` gap, unstyled list | a compact list of related records inside an editor |

**`.rux-u-row` and `.rux-u-cluster` differ in exactly one declaration — `flex-wrap` — and
picking the wrong one fails in opposite directions.** A cluster given items that must not
wrap drops them to a second line and grows its container; a row given items that should
wrap overflows instead. The flip-seven panel header hit the first case on 2026-08-23: its
title's neighbour was a cluster, so at 375px the action buttons wrapped and the 64px header
band grew to 80. Swapping to `.rux-u-row` fixed the height — and then required
`min-width: 0` on the row, because a bare flex row keeps `min-width: auto` and refuses to
shrink, so the status text's own ellipsis never engaged.

**Typography-only utilities are not here.** `.rux-text-*` publishes one class per type role
(`typography.md` §3.3); `.rux-u-section-label` appears above only because it adds a divider
to that role rather than restating it.
