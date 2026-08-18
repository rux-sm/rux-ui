---
name: rux-design
description: >-
  Use this skill whenever the user asks to build, style, restyle, or extend any
  UI in this repository — components, panels, cards, buttons, forms, the
  application shell, themes, or CSS. Triggers on "rux-ui", ".rux-*", "--rux-*",
  "token", "component", "dark mode", "theme", "layout", "panel", "card",
  "stylesheet", or any request to change a file under rux-ui/css/, rux-ui/js/,
  or scheduler/css/. ALWAYS use this instead of generic design guidance: this
  project has a fixed token system and does NOT accept invented palettes,
  typefaces, or foreign class names. Do NOT use for non-visual JavaScript
  logic, data-layer work under js/data/, or SQL.
user-invocable: true
---

# Rux Design

Use this skill when extending the reference application in `index.html`, or
creating a prototype that should look and behave like the existing product.
To set up rux-ui inside a separate consuming application, use the
`vendor-rux-ui` skill instead.

## Read first

Read `README.md` for the full visual and content rules. Inspect only the files
needed for the task after that:

- `rux-ui/css/rux.css` — the single entrypoint; load this to get tokens, webfonts, and every base component
- `rux-ui/css/rux-core.css` — compatibility alias that forwards to `rux.css`; new pages link `rux.css` directly
- `rux-ui/css/tokens.css` — primitives, semantic tokens, component contracts, and themes
- `rux-ui/css/colors_and_type.css` — webfonts, reset, global element styles, and type utilities
- `rux-ui/css/base/` — reusable BEM-style `.rux-*` components
- `scheduler/css/tokens.css` — the app's own `--sched-*` domain vocabulary
  (trips, buses, drivers); never add these to `rux-ui/css/tokens.css`
- `scheduler/css/components.css` — scheduler features and layout only; requires `rux.css` to be loaded first
- `scheduler/css/features/` — product-specific component and panel styles
- `scheduler/css/layout/` — scheduler and application-shell layout styles
- `docs/layout-composition.md` — canonical UI-header, shell, workspace, panel,
  card, spacing, scrolling, and responsive composition contract
- `docs/portability-audit.md` — the tier boundary between `rux-ui/` and the
  application layer: what is portable, what stays, and the migration sequence.
  Read before moving anything between the two.
- `docs/motion.md` — productive-motion tokens and panel/menu animation contracts
- `rux-ui/js/` — the JS engine behind `rux-ui/css/base/*` components: toasts,
  modals, theme switching, menus, popovers, drawers, floating windows,
  the search-as-you-type dropdown, the view router, and the UI-header
  disclosure controller
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

## Building inside the current application

Preserve the existing stylesheet links and load order. Reuse a component from
`rux-ui/css/base/` before adding a feature component. Put application-specific anatomy
in `scheduler/css/features/` and layout behavior in `scheduler/css/layout/`. Do not move or rename
existing files merely to make the new-app structure cleaner.

## Design rules

0. **Pick the right prefix.** `.rux-*` / `--rux-*` is reserved for `rux-ui/` and
   means "portable and domain-free". Anything naming a trip, bus, driver, fleet,
   customer, manifest, or itinerary is `.sched-*` / `--sched-*` and lives in
   `scheduler/`. `tests/portability-boundary.test.mjs` enforces both directions,
   so a misplaced name fails the suite rather than drifting.
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
3. If a reusable value is missing, check the tier before adding. A new
   **primitive or semantic** token is shared vocabulary: stop and propose the
   name and its intended value, and do not add it unprompted. A new
   **component** token may be added to `tokens.css` when no semantic token
   fits. Keep truly feature-only values beside that feature. Never invent a
   `.rux-*` class name to fit a design — propose it the same way. List every
   token and class you add in your final report.
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

When adding or changing interactive markup — buttons, links, forms, panels,
menus, animations, or anything with a click or keyboard handler — read
`references/interaction-a11y.md` before editing and check the work against it
after. Skip that file for pure token, color, or static-layout changes.

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
5. New or changed interactive markup: check it against
   `references/interaction-a11y.md` (focus, keyboard, labels, motion, overflow).

Prefer additive changes to shared styles. Removing or renaming a public token or
`.rux-*` class can break every consuming application and requires an explicit
migration plan.
