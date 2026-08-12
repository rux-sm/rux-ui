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
- `js/core/utilities.js` — shared toast, modal, clipboard, and accent helpers
- `js/core/theme.js` — light, dark, and system-theme behavior
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

Copy the complete shared style tree so relative imports continue to resolve:

```text
rux-ui/
└── css/
    ├── rux.css
    ├── rux-core.css
    ├── tokens.css
    ├── colors_and_type.css
    └── base/
```

Load the shared system before app-specific styles:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
<link rel="stylesheet" href="css/app.css" />
```

Treat `rux-ui/` as read-only in the consuming app. Make shared changes
in the Rux UI source repository, then replace the copied directory as a unit.
Keep layouts, features, and overrides unique to the consuming product in its
own `app.css` or feature stylesheets.

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
3. If a reusable value is missing, add a meaningful semantic or component token
   in `tokens.css`. Keep truly feature-only values beside that feature.
4. Follow the BEM contract: `.rux-{block}`, `.rux-{block}__{element}`, and
   `.rux-{block}--{modifier}`. Use `.is-*` or `.has-*` for JavaScript state.
5. Preserve optical radius nesting: nested controls normally step down one
   radius level from their containing surface.
6. Use the current `.rux-icon` contract, which is backed by Material Symbols
   Sharp. Follow existing markup and load the font when the host page does not
   already provide it. Do not use emoji as interface icons.
7. Preserve semantic HTML, accessible names, keyboard interaction, visible
   focus, reduced-motion behavior, and ARIA state for custom controls.
8. Verify responsive layouts at narrow and wide widths and inspect both light
   and dark themes when changing shared styles.

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

- Use direct, calm, plain language.
- Use Title Case for buttons, headings, menu items, labels, and short toasts,
  matching the current product convention.
- Use verb-first action labels where possible.
- Do not add exclamation marks or emoji.
- Do not put periods on button labels, menu items, field labels, table headers,
  short toasts, or single-line tooltips.
- Use `…` for actions that open a follow-up step, such as `Export…`.
- Error copy should say what happened and what the user can do next.

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

Prefer additive changes to shared styles. Removing or renaming a public token or
`.rux-*` class can break every consuming application and requires an explicit
migration plan.
