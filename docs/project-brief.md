# Project Brief — Rux UI

> A short description of what this project is and how work is usually done here.

## What this project is

**Rux UI** is a lightweight, theme-aware **design system** — shared CSS and
small vanilla-JS helpers with no framework dependency — plus the **reference
application** that consumes it. It was distilled from the **TripBoard**
codebase (a fleet/dispatch scheduling app) into a reusable system with one
flat namespace of `--rux-*` design tokens, a BEM-style component library
(`.rux-card`, `.rux-button`, …), and a shared `rux-design` skill that tells AI coding
agents how to build with it.

Two things live side by side in this repo:

1. **The design system** (`rux-ui/`)
   - `rux-ui/css/rux.css` — single entry point for the complete visual system
   - `rux-ui/css/tokens.css` — all `--rux-*` design tokens (color, type, space,
     radius, motion, component contracts)
   - `rux-ui/css/colors_and_type.css` — webfonts + global element styles
   - `rux-ui/css/rux-core.css` — compatibility alias that forwards to `rux.css`
   - `rux-ui/css/base/` — 21 reusable BEM components
   - `rux-ui/js/` — shared toast, modal, theme, accent, menu, popover, drawer,
     floating-window, suggestions, controls, ui-shell, and view-router helpers

2. **The reference application** (`scheduler/`)
   - `scheduler/css/components.css` — full reference-application bundle (base + scheduler + trips)
   - `scheduler/css/features/` — 30 scheduler-specific panels and components
   - `scheduler/css/layout/` — scheduler grid and application shell
   - `index.html` — the full app (scheduler, trip panel, fleet, dispatch) and
     the canonical composition reference
   - `js/data/*` — Supabase data layer
   - `supabase/*.sql` — schema/migration patches
   - `examples/` — reference layout page

**Design personality:** restrained like Apple, dense like Linear, energetic
like Spotify. Near-black surfaces, hairline borders, a single accent color,
`oklch()` colors, Material Symbols Sharp icons (no emoji), light/dark/system
themes via `data-theme`.

## The typical workflow

Agents (Cline, Claude Code, Codex — or a human) drive most of the work here:

1. **Route to the source of truth.** Read `README.md` for project orientation.
   Load the `rux-design` skill only for UI/frontend work, then inspect only the files the
   task needs. Don't assume a demo, UI-kit, or root `utilities.js` exists — the
   listed structure is authoritative.

2. **Compose before inventing.** Reuse an existing `.rux-*` component or
   `--rux-*` token before creating anything new. If a token is genuinely
   missing, add a semantic one in `tokens.css` rather than hardcoding a value.

3. **Keep shared changes additive.** Prefer adding to shared styles over
   removing/renaming public tokens or classes, which would break every
   consuming app. Put feature-specific styles in `scheduler/css/features/` and layout in
   `scheduler/css/layout/`.

4. **Validate.** Confirm every CSS import resolves, classes and token names
   stay compatible, run the tests (`node --test`), and check narrow + wide
   layouts plus both light and dark themes when layout changes.

5. **Refine the visual contract.** Iterate on optical details (radii nesting,
   spacing rhythm, card/panel anatomy), verify by screenshot, and commit clean,
   focused changes.

**Day-to-day work** is design-system + dispatch-app feature work: tweaking
tokens and component styles, building scheduler/trip/fleet UI in `index.html`,
wiring Supabase queries via `js/data/*`, adding SQL patches under `supabase/`,
and keeping the docs (`README.md`, `.claude/skills/`, `docs/`) in sync with the code.
