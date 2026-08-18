---
name: vendor-rux-ui
description: >-
  Use this skill when the user asks to set up rux-ui in a NEW or existing
  consuming application, vendor/copy/embed the design system, wire up
  stylesheet and script load order, or sync a vendored copy after shared CSS
  changed. Triggers on "vendor", "new app", "copy rux-ui", "VENDORED.md",
  "consuming app", "sync the design system", "bootstrap a page". Do NOT use
  for styling work inside this repository — use rux-design for that.
---

# Vendoring Rux UI into a consuming application

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
    ├── ui-shell.js
    └── view-router.js
```

Load the shared system before app-specific styles, and the shared scripts
before app-specific scripts:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
<link rel="stylesheet" href="css/app.css" />
<script src="rux-ui/js/utilities.js" defer></script>
<script src="rux-ui/js/controls.js" defer></script>
<!-- plus theme.js, menu.js, popover.js, drawer.js, floating-window.js,
     suggestions.js, ui-shell.js, view-router.js — whichever components
     the app uses -->
```

## Rules

- Treat `rux-ui/` as **read-only** in the consuming app. Make shared changes
  in the Rux UI source repository, then replace the copied directory as a
  unit.
- Keep layouts, features, and overrides unique to the consuming product in
  its own `app.css`/`app.js` or feature files.
- Do NOT use `scheduler/css/components.css` for an unrelated app unless it
  genuinely needs the reference-application scheduler, trip bar, itinerary,
  and trip-panel styles it imports.
- When shared CSS changes in this repository, re-sync every vendored copy —
  the copy is a snapshot, not a link.

For the tier boundary between `rux-ui/` and the application layer — what is
portable, what stays, and the migration sequence — read
`docs/portability-audit.md` before moving anything between the two.
