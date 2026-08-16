---
name: rux-design
description: Build or revise web interfaces using the current Rux UI design system, component contracts, tokens, content rules, and shared CSS workflow.
user-invocable: true
---

# Rux Design

Use this guide when building a new Rux UI application, extending the
reference application in `index.html`, or creating a prototype that should
look and behave like the existing product.

## Read first

Read `README.md` for the full visual and content rules. Inspect only the files
needed for the task after that:

- `rux-ui/css/rux.css` — single entry point for the full design system
- `rux-ui/css/rux-core.css` — framework-agnostic entrypoint for new applications
- `rux-ui/css/tokens.css` — primitives, semantic tokens, component contracts, and themes
- `rux-ui/css/colors_and_type.css` — webfonts, reset, global element styles, and type utilities
- `rux-ui/css/base/` — reusable BEM-style `.rux-*` components
- `scheduler/css/components.css` — reference-application bundle; includes base, scheduler, and trip features
- `scheduler/css/features/` — product-specific component and panel styles
- `scheduler/css/layout/` — scheduler and application-shell layout styles
- `docs/layout-composition.md` — canonical UI-header, shell, workspace, panel,
  card, spacing, scrolling, and responsive composition contract
- `docs/motion.md` — productive-motion tokens and panel/menu animation contracts
- `rux-ui/js/` — the JS engine behind `rux-ui/css/base/*` components: toasts,
  modals, theme switching, menus, popovers, drawers, floating windows,
  the search-as-you-type dropdown, and the UI-header disclosure controller
- `index.html` — current full application and the best composition reference
- `assets/` — current logos, favicon, profile image, and splash asset

Do not assume that a demo, preview, UI-kit, or root-level `utilities.js` file
exists. The list above reflects the current repository.

## Brand and interface character

Rux UI is clean, compact, and operational: restrained like Apple, dense like
Linear, and energetic like Spotify. Use flat surfaces, hairline borders, a
single accent, deliberate hierarchy, and minimal decoration. The token system
supports light and dark themes through `data-theme`; new work must remain
usable in both unless the user explicitly scopes the task to one theme.

## Building a new application

Copy the complete `rux-ui/` folder as a unit — both `css/` and `js/` — so
relative imports continue to resolve and shared components stay interactive,
not just styled:

```text
rux-ui/
├── css/
│   ├── rux.css
│   ├── rux-core.css
│   ├── tokens.css
│   ├── colors_and_type.css
│   └── base/
└── js/
    ├── utilities.js
    ├── theme.js
    ├── controls.js
    ├── menu.js
    ├── popover.js
    ├── drawer.js
    ├── floating-window.js
    ├── suggestions.js
    └── ui-shell.js
```

Load the shared system before app-specific styles, and the shared scripts
before app-specific scripts:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
<link rel="stylesheet" href="css/app.css" />
<script src="rux-ui/js/utilities.js" defer></script>
<script src="rux-ui/js/controls.js" defer></script>
<!-- plus theme.js, menu.js, popover.js, drawer.js, floating-window.js,
     suggestions.js, ui-shell.js — whichever components the app uses -->
```

Treat `rux-ui/` as read-only in the consuming app. Make shared changes
in the Rux UI source repository, then replace the copied directory as a unit.
Keep layouts, features, and overrides unique to the consuming product in its
own `app.css`/`app.js` or feature files.

Do not use `scheduler/css/components.css` for an unrelated app unless it genuinely needs
the reference-application scheduler, trip bar, itinerary, and trip-panel
styles it imports.

## Building inside the current application

Preserve the existing stylesheet links and load order. Reuse a component from
`rux-ui/css/base/` before adding a feature component. Put application-specific anatomy
in `scheduler/css/features/` and layout behavior in `scheduler/css/layout/`. Do not move or rename
existing files merely to make the new-app structure cleaner.

## Design rules

1. Compose with existing `.rux-*` components before inventing a new component.
   Typical screens combine cards, panels, fields, buttons, menus, stacks, and
   clusters.
2. Use `--rux-*` tokens for color, type, spacing, size, radius, shadow, motion,
   and stacking. Do not hardcode a design value when a suitable token exists.
   This includes third-party guidance: translate any external design
   review or standard into `--rux-*` tokens and existing `.rux-*` components —
   never adopt a foreign token, class, or value wholesale. For color
   specifically, Rux UI follows Vercel Geist's color system as a structural
   reference where it fits — see README.md's "Reference: Vercel Geist
   colors" for the semantic-step model and current alignment.
3. If a reusable value is missing, add a meaningful semantic or component token
   in `tokens.css`. Keep truly feature-only values beside that feature.
4. Follow the BEM contract: `.rux-{block}`, `.rux-{block}__{element}`, and
   `.rux-{block}--{modifier}`. Use `.is-*` or `.has-*` for JavaScript state.
5. Preserve optical radius nesting: nested controls normally step down one
   radius level from their containing surface.
6. Use the current `.rux-icon` contract, which is backed by Material Symbols
   Sharp. Follow existing markup and load the font when the host page does not
   already provide it. Do not use emoji as interface icons.
7. Verify responsive layouts at narrow and wide widths and inspect both light
   and dark themes when changing shared styles.

## Interaction and accessibility rules

Focus and keyboard:

- Every interactive element needs a visible focus state, using `:focus-visible`
  (not bare `:focus`, which also fires on mouse click). Group focus for a
  compound control with `:focus-within`.
- Never remove the default outline without supplying a `:focus-visible`
  replacement.
- A custom interactive element (anything that isn't a native `<button>`,
  `<a>`, or form control) needs an explicit keyboard handler
  (`addEventListener("keydown", …)` for Enter/Space) alongside its click
  handler.

Semantics:

- Use `<button>` for actions and `<a>` for navigation — never a `<div>` or
  `<span>` with a click handler standing in for either.
- Icon-only buttons need `aria-label`. Decorative icons need
  `aria-hidden="true"`.
- Every form control needs a `<label for>` (or `aria-label`); clicking the
  label must activate the control.
- Async UI updates (toasts, inline validation, live status text) need
  `aria-live="polite"` so assistive tech announces them.

Forms:

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

Motion:

- Respect `prefers-reduced-motion` — a nontrivial animation needs a
  reduced-motion fallback or must be skippable.
- Animate only `transform`/`opacity` (compositor-friendly). Never
  `transition: all` — list the exact properties.
- Animations must be interruptible; don't block input while one runs.

Touch and scroll:

- `overscroll-behavior: contain` on any modal, drawer, or scrollable panel
  body, so its own scroll never chains into the page or calendar underneath.
- `touch-action: manipulation` on tappable controls to remove the
  double-tap-zoom delay on mobile.
- Respect safe-area insets (`env(safe-area-inset-*)`) on any full-bleed or
  fixed-position mobile surface.

Content overflow:

- Any text container that might overflow needs an explicit strategy:
  truncate with ellipsis, `line-clamp`, or wrap.
- A flex child that needs to truncate its own text needs `min-width: 0` —
  flex items don't shrink below their content size by default.
- Design empty states explicitly; don't let an empty array or string render
  as broken UI.

Numbers and dates:

- Use `Intl.DateTimeFormat` / `Intl.NumberFormat` for date, time, or number
  formatting — never hand-rolled string formatting.
- Use `font-variant-numeric: tabular-nums` wherever numbers sit in a column
  or get compared side by side (schedule times, counts).

Deep-linking (apply to new work; not retrofitted):

- Stateful UI worth bookmarking or sharing — an open panel, active tab,
  active filter — should reflect in the URL via `URLSearchParams`, the way
  the public share-link pages (`js/pages/driver-share.js`,
  `js/pages/trip-request.js`) already do. The main scheduler app's own
  panels, tabs, and filters don't do this yet.

Large lists (apply to new work; not retrofitted):

- A list that can realistically grow past ~50 rows should use
  `content-visibility: auto` or virtualize. Not currently needed or used
  anywhere in the app — revisit if a dataset grows large enough to matter.

## Application layout

Before creating or modifying an application shell, read
`docs/layout-composition.md`. Use `.rux-ui-header` above the application body,
`.rux-side-nav` for product destinations, one required center `.rux-workspace`,
and optional attached side `.rux-panel` elements. Structural siblings have no
decorative gap. Read `docs/ui-header.md` when changing global navigation.
Read `docs/motion.md` when changing panel, drawer, menu, or shell animation.

A panel must have an identifiable purpose, but its dedicated header is
optional. It may begin with a header, attached tabs, or a header followed by
attached tabs. Do not infer a new shell from a screenshot when the documented
composition solves the task.

Before completing layout work, verify:

- The UI header attaches directly to the shell.
- The workspace occupies the flexible center and panels are attached.
- Every panel has a header, attached tabs, or both, plus an accessible name.
- Panel and workspace bodies own scrolling.
- Cards and card sections follow the tokenized 16px visual rhythm.
- Application drawer, rail, and minimum-width behavior has not leaked into
  reusable shell components.

## Content rules

Read README.md's Content Fundamentals section for the full voice, tone,
casing, punctuation, and numbers/dates/units rules — it is the canonical
source. Do not duplicate that list here; if you find a content rule missing
from README.md, add it there.

## Agent workflow

Before editing:

1. Identify whether the work belongs to the reusable core or one application.
2. Search for an existing component, token, and composition that already solves
   the problem.
3. Inspect `index.html` or the relevant feature markup for the current contract.

After editing:

1. Confirm every CSS import resolves.
2. Check that existing class and token names remain compatible.
3. Run the relevant tests.
4. Render or open the affected interface when visual layout changed, then check
   narrow and wide layouts plus both supported themes.
5. New or changed interactive markup: check it against the Interaction and
   accessibility rules above (focus, keyboard, labels, motion, overflow).

Prefer additive changes to shared styles. Removing or renaming a public token or
`.rux-*` class can break every consuming application and requires an explicit
migration plan.
