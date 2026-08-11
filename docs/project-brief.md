# Project Brief — Rux UI

> A short description of what this project is and how work is usually done here.

## What this project is

**Rux UI** is a lightweight, theme-aware **design system** — shared CSS and
small vanilla-JS helpers with no framework dependency — plus the **reference
application** that consumes it. It was distilled from the **TripBoard**
codebase (a fleet/dispatch scheduling app) into a reusable system with one
flat namespace of `--rux-*` design tokens, a BEM-style component library
(`.rux-card`, `.rux-button`, …), and a shared `SKILL.md` that tells AI coding
agents how to build with it.

Two things live side by side in this repo:

1. **The design system**
   - `css/tokens.css` — all `--rux-*` design tokens (color, type, space,
     radius, motion, component contracts)
   - `css/colors_and_type.css` — webfonts + global element styles
   - `css/rux-core.css` — framework-agnostic entrypoint for new applications
   - `css/components.css` — full TripBoard-oriented bundle (base + scheduler + trips)
   - `css/base/`, `css/features/`, `css/layout/` — component and layout partials
   - `js/core/` — shared toast, modal, theme, and accent helpers

2. **The reference application** (TripBoard)
   - `index.html` — the full app (scheduler, trip panel, fleet, dispatch) and
     the canonical composition reference
   - `js/data/*` — Supabase data layer
   - `supabase/*.sql` — schema/migration patches
   - `examples/`, `demos/` — preview pages

**Design personality:** restrained like Apple, dense like Linear, energetic
like Spotify. Near-black surfaces, hairline borders, a single accent color,
`oklch()` colors, Material Symbols Sharp icons (no emoji), light/dark/system
themes via `data-theme`.

## The typical workflow

Agents (Cline, Claude Code, Codex — or a human) drive most of the work here:

1. **Read the source of truth first.** Read `README.md` and `SKILL.md` before
   touching anything, then inspect only the files the task needs. Don't assume
   a demo, UI-kit, or root `utilities.js` exists — the listed structure is
   authoritative.

2. **Compose before inventing.** Reuse an existing `.rux-*` component or
   `--rux-*` token before creating anything new. If a token is genuinely
   missing, add a semantic one in `tokens.css` rather than hardcoding a value.

3. **Keep shared changes additive.** Prefer adding to shared styles over
   removing/renaming public tokens or classes, which would break every
   consuming app. Put feature-specific styles in `css/features/` and layout in
   `css/layout/`.

4. **Validate.** Confirm every CSS import resolves, classes and token names
   stay compatible, run the tests (`node --test`), and check narrow + wide
   layouts plus both light and dark themes when layout changes.

5. **Refine the visual contract.** Iterate on optical details (radii nesting,
   spacing rhythm, card/panel anatomy), verify by screenshot, and commit clean,
   focused changes.

**Day-to-day work** is design-system + dispatch-app feature work: tweaking
tokens and component styles, building scheduler/trip/fleet UI in `index.html`,
wiring Supabase queries via `js/data/*`, adding SQL patches under `supabase/`,
and keeping the docs (`README.md`, `SKILL.md`, `docs/`) in sync with the code.
