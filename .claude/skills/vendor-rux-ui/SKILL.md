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

Do not hand-copy files, and do not reimplement the export set in the consuming
application. This repository owns what leaves it. Run the canonical exporter:

```bash
tools/vendor-into.sh --dest <app>/design-system --profile css-only
```

It replaces the destination as a unit, classifies which docs ship, verifies
every `@import` in `css/rux.css` resolves, strips the `?v=N` cache-busters a
bundler cannot resolve, and writes a `VENDORED.md` stamped with `git describe`.
It refuses a dirty source tree, because an untraceable snapshot defeats the
point of stamping it.

A consuming application keeps a thin wrapper script that supplies its own
destination and profile and then proves its own build still passes. It does not
copy this logic.

## Profiles

Pick by whether the application owns its own DOM.

**`--profile full`** — plain-HTML applications that run the shared behaviors.
Vendors `css/` and `js/`.

```html
<link rel="stylesheet" href="design-system/css/rux.css" />
<link rel="stylesheet" href="css/app.css" />

<!-- overlay.js first: it is the overlay kernel that owns outside-press,
     Escape, and focus trapping. menu, popover, drawer, suggestions, and
     ui-shell all delegate to it and no longer handle dismissal themselves. -->
<script src="design-system/js/overlay.js" defer></script>
<script src="design-system/js/utilities.js" defer></script>
<script src="design-system/js/controls.js" defer></script>
<!-- plus theme.js, menu.js, popover.js, drawer.js, floating-window.js,
     suggestions.js, ui-shell.js, view-router.js — whichever the app uses -->
<script src="js/app.js" defer></script>
```

**`--profile css-only`** — framework applications (React, Svelte, …). Vendors
`css/` alone. A framework owns the DOM, so a vanilla script mutating
`aria-expanded` or `inert` fights hydration and loses; such an application
reimplements the behaviors natively instead. Vendoring behavior JS it never
loads is dead weight re-reviewed on every sync.

The tradeoff is real and must be managed: the reimplementation is a second copy
of a shared contract with nothing linking it back. Cite the module it mirrors in
a comment, and re-read that module whenever the behavior contract changes.

## Rules

- Treat the vendored folder as **read-only**. Make shared changes in this
  repository, then re-run the consumer's sync — never edit the copy.
- Keep layouts, features, and overrides unique to the consuming product in its
  own `app.css`/`app.js`, under its own prefix. Never add new names in the
  `rux-` namespace outside this repository.
- Do NOT vendor `scheduler/css/components.css` into an unrelated app unless it
  genuinely needs the reference-application scheduler, trip bar, itinerary, and
  trip-panel styles it imports.
- Tag this repository before vendoring. A copy stamped with a version is one a
  consumer can reason about; a copy stamped with a bare hash is not.
- The copy is a snapshot, not a link. When shared CSS changes, re-sync every
  consumer — and prefer a scheduled CI job that opens the drift as a pull
  request over remembering to do it by hand.

For the tier boundary between `rux-ui/` and the application layer — what is
portable, what stays, and the migration sequence — read
`docs/portability-audit.md` before moving anything between the two.
