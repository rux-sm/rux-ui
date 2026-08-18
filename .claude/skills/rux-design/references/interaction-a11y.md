# Interaction and accessibility rules

Read this file when adding or changing interactive markup — buttons, links,
forms, panels, menus, animations, or anything with a click or keyboard
handler. Skip it for pure token, color, or static-layout changes.

## Focus and keyboard

- Every interactive element needs a visible focus state, using `:focus-visible`
  (not bare `:focus`, which also fires on mouse click). Group focus for a
  compound control with `:focus-within`.
- Never remove the default outline without supplying a `:focus-visible`
  replacement.
- A custom interactive element (anything that isn't a native `<button>`,
  `<a>`, or form control) needs an explicit keyboard handler
  (`addEventListener("keydown", …)` for Enter/Space) alongside its click
  handler.

## Semantics

- Use `<button>` for actions and `<a>` for navigation — never a `<div>` or
  `<span>` with a click handler standing in for either.
- Icon-only buttons need `aria-label`. Decorative icons need
  `aria-hidden="true"`.
- Every form control needs a `<label for>` (or `aria-label`); clicking the
  label must activate the control.
- Async UI updates (toasts, inline validation, live status text) need
  `aria-live="polite"` so assistive tech announces them.

## Forms

- Set `autocomplete` and a meaningful `name`/`id` on every input.
- Use the correct `type` (`email`, `tel`, `date`, `number`, …) and
  `inputmode`.
- Never block paste on an input.
- A checkbox/radio and its label share one hit target — no dead zone between
  them.
- Keep submit enabled until the request actually starts, then show a
  pending/spinner state — don't disable pre-emptively.
- Show errors inline next to the field that caused them, and move focus to
  the first error on a failed submit.
- A form with pending edits must warn before the user discards them —
  closing the panel/dialog, pressing Escape, or navigating away with unsaved
  changes needs a confirmation. Apply this to new or touched editor work
  going forward; existing editors (Trip, Driver, Fleet) are not yet
  retrofitted.

## Motion

- Respect `prefers-reduced-motion` — a nontrivial animation needs a
  reduced-motion fallback or must be skippable.
- Animate only `transform`/`opacity` (compositor-friendly). Never
  `transition: all` — list the exact properties.
- Animations must be interruptible; don't block input while one runs.

## Touch and scroll

- `overscroll-behavior: contain` on any modal, drawer, or scrollable panel
  body, so its own scroll never chains into the page or calendar underneath.
- `touch-action: manipulation` on tappable controls to remove the
  double-tap-zoom delay on mobile.
- Respect safe-area insets (`env(safe-area-inset-*)`) on any full-bleed or
  fixed-position mobile surface.

## Content overflow

- Any text container that might overflow needs an explicit strategy:
  truncate with ellipsis, `line-clamp`, or wrap.
- A flex child that needs to truncate its own text needs `min-width: 0` —
  flex items don't shrink below their content size by default.
- Design empty states explicitly; don't let an empty array or string render
  as broken UI.

## Numbers and dates

- Use `Intl.DateTimeFormat` / `Intl.NumberFormat` for date, time, or number
  formatting — never hand-rolled string formatting.
- Use `font-variant-numeric: tabular-nums` wherever numbers sit in a column
  or get compared side by side (schedule times, counts).

## Deep-linking (apply to new work; not retrofitted)

- Stateful UI worth bookmarking or sharing — an open panel, active tab,
  active filter — should reflect in the URL via `URLSearchParams`, the way
  the public share-link pages (`js/pages/driver-share.js`,
  `js/pages/trip-request.js`) already do. The main scheduler app's own
  panels, tabs, and filters don't do this yet.

## Large lists (apply to new work; not retrofitted)

- A list that can realistically grow past ~50 rows should use
  `content-visibility: auto` or virtualize. Not currently needed or used
  anywhere in the app — revisit if a dataset grows large enough to matter.
