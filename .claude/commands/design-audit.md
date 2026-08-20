---
description: Full-repo audit of architecture, naming, file structure, and design-system consistency
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Design System & Codebase Audit

You are auditing this repository. **Do not change any code.** Produce a written report only.
The only file you may create is the report itself.

## Project context

- **Domain:** charter trip scheduling — trips, trip requests, itineraries, drivers and
  assignments, buses/fleet, maintenance, customers and passengers, manifests, documents,
  billing, driver workload and availability.
- **UI layer:** Rux UI — a framework-free, CSS-first design system in this repository.
  Flat `--rux-*` token namespace in `rux-ui/css/tokens.css`, BEM `.rux-*` components in
  `rux-ui/css/base/`, vanilla-JS behaviors in `rux-ui/js/`. No React, no TypeScript, no
  build step, no bundler, no dependencies. Consumed by the reference application:
  `index.html` + `scheduler/css/` + `js/`.
- **Existing architectural contract:** `docs/portability-audit.md` defines a four-tier
  model (0 tokens → 1 base components → 2 behaviors → 3 app compositions) and the rule
  that a tier MUST NOT depend upward. Several contract tests already enforce parts of
  this: `tests/naming-contract.test.mjs`, `tests/tokens-contract.test.mjs`,
  `tests/portability-boundary.test.mjs`, `tests/layout-contract.test.mjs`,
  `tests/typography-roles.test.mjs`, `tests/motion-contract.test.mjs`,
  `tests/text-roles.test.mjs`.
- **Goal of this audit:** the codebase should feel like one person wrote it on one day.
  Find every place where it doesn't.

Read `docs/portability-audit.md` before judging any placement question. Where it already
records a violation, cite the row rather than re-reporting it as a new discovery — the
finding is "still open / regressed / newly introduced outside the ledger," which is a
different and more useful claim.

## Phase 1 — Recon (do this before judging anything)

1. Read the root context: `package.json`, `CLAUDE.md`, `README.md`,
   `docs/portability-audit.md`, `.claude/skills/rux-design/`, and the CSS entrypoints
   (`rux-ui/css/rux.css`, `scheduler/css/components.css`).
2. Map the directory tree, depth 3–4. Note where the real weight is — largest folders,
   largest files, and how much of the application lives inside `index.html`.
3. Inventory the UI layer and separate it into the tiers the repo already defines:
   **tokens** (`rux-ui/css/tokens.css`, `scheduler/css/tokens.css`), **base components**
   (`rux-ui/css/base/*` + `rux-ui/js/*`), **domain components** (`js/components/`,
   `scheduler/css/features/`), **panels/pages** (`js/panels/`, `js/pages/`, the standalone
   `*.html` files), and **data** (`js/data/`, `supabase/`).
4. Sample-read at least 15 files spread across layers — don't audit from filenames alone.
   Include at least: two `rux-ui/css/base/` partials, two `rux-ui/js/` behaviors, two
   `scheduler/css/features/` files, two `js/panels/`, one `js/components/`, one `js/core/`,
   one `js/data/`, one standalone page (`driver.html`, `request.html`, `maintenance.html`),
   and a substantial slice of `index.html` including its inline `<script>` blocks.
5. Grep for the tells and count them:
   - inline `style="` in HTML and in JS template strings
   - raw color literals (`#hex`, `rgb(`, `hsl(`) outside `rux-ui/css/tokens.css` and
     `scheduler/css/tokens.css`
   - hardcoded `px` where a space/radius/type token exists
   - `!important`, and literal `z-index:` numbers not sourced from a token
   - `console.log`, `// TODO`, `// HACK`, `debugger`, commented-out blocks
   - `innerHTML =` with interpolated values, and any unescaped user data in templates
   - duplicated helpers across `js/` (date formatting, escaping, currency, id generation)

State what you found in a short "what this codebase actually is" paragraph before moving on.

## Phase 2 — Audit areas

Score each area **Solid / Needs work / Broken** and back every claim with `file:line`
references. No vague criticism.

### A. File structure and tier boundaries

- Is the organizing principle consistent — by feature, by type, or a mix (a mix is the
  finding)? Compare `js/` (by type: components/core/data/pages/panels) against
  `scheduler/css/` (by feature) and say whether the split is deliberate or drift.
- Does every CSS file have exactly one obvious home, and does the `rux-ui/` ↔ `scheduler/`
  split hold? List any Tier 1/2 unit that names a domain concept (trip, bus, driver,
  schedule, customer, fleet, manifest, itinerary), and any Tier 3 unit that is actually
  domain-free and belongs in `rux-ui/`.
- Do imports cross layers they shouldn't — a `rux-ui/js/` behavior reaching into app
  globals, a `js/core/` module importing from a panel, a panel importing another panel's
  internals?
- Are the standalone pages (`driver.html`, `request.html`, `maintenance.html`, `doc.html`,
  `d.html`, `m.html`, `gallery.html`) consistent with each other and with `index.html` in
  stylesheet/script load order? Which are live, which are stubs?
- How much application logic lives inside `index.html`'s inline `<script>` blocks versus
  in `js/` modules, and is the boundary principled or historical?
- Are tests, docs, and styles co-located or scattered? Pick the dominant pattern and flag
  the deviants.

### B. Naming

Check for a single convention per category and list every violation:

- Files: `kebab-case.js` across `js/` and `rux-ui/js/`, `kebab-case.css`,
  `*.test.mjs` in `tests/`. Flag anything off-pattern.
- CSS: BEM `rux-{block}__{element}--{modifier}`. `tests/naming-contract.test.mjs` already
  enforces the shape — audit what it does *not* catch: blocks that are near-duplicates
  (`rux-card` vs `rux-panel` vs `rux-surface`), modifiers meaning different things on
  different blocks, elements orphaned from any block, and app classes in `scheduler/css/`
  that borrow the `rux-` prefix they shouldn't.
- Custom properties: `--rux-*` naming groups (color/space/radius/type/motion). Flag tokens
  that don't fit their group's pattern, and app-level properties that squat the `--rux-`
  namespace.
- JS: exported function and factory names, `init*` / `mount*` / `create*` / `render*` verb
  choice, handlers (`handleX` vs `onX`), booleans (`isX` / `hasX` / `canX`), event names,
  and `data-*` attribute contracts between CSS and behavior modules.
- **Domain vocabulary — this one matters most.** Is a scheduled charter journey called a
  `trip`, a `job`, a `run`, a `booking`, a `request`, and a `reservation` in six different
  files? Same for bus/vehicle/coach/unit, driver/operator/chauffeur, customer/client/
  account/passenger, assignment/dispatch/allocation, document/attachment/file. Build a
  **glossary table** of every domain term found, its variants, and where each appears —
  including database column names in `js/data/` and `supabase/`, which may disagree with
  the UI vocabulary. Recommend one canonical term per concept and note where the DB name
  is fixed and only the UI-side name can move.
- Constants and configuration: naming and location (`js/core/billing-config.js` and
  friends) — one pattern or several?

### C. Design tokens

Find the source of truth for each and report whether it exists, is complete, and is
actually used:

- Color, including semantic roles: surface, border, muted, accent, destructive, and status
  colors for trip/assignment state (confirmed, pending, cancelled, unassigned, conflict)
- Spacing scale
- Typography scale (family, size, weight, line-height) and the text-role system the
  `typography-roles` / `text-roles` tests describe
- Border radius (including the optical-radius math the README references), shadows,
  z-index layers, breakpoints, motion durations and easings
- Theme strategy: how light/dark is expressed, and whether every token has both values

Then count and list every **hardcoded value that should be a token**, grouped by type,
with a rough number — "37 raw hex colors across 14 files" is more useful than "some
hardcoded colors." Separate three cases, because their fixes differ: values in
`scheduler/css/` (app CSS that should reference tokens), values inside `index.html` and
inline `style="` attributes, and values baked into JS template strings.

Also report on the two-file token setup: what `scheduler/css/tokens.css` adds over
`rux-ui/css/tokens.css`, whether any token is defined in both, and whether any app token
should be promoted into the portable layer or vice versa.

### D. Component API consistency

For each Rux UI base component, tabulate its public contract: block class, elements,
modifiers, required markup structure, the `data-*` attributes its behavior module reads,
its initialization entry point, and how it handles state (open/closed, selected, loading,
disabled, error, empty).

Flag every inconsistency, e.g.:

- `--primary` on one block but `--accent` on another for the same visual role
- `--sm|--md|--lg` in one place, `--small|--medium|--large` in another
- Some behaviors auto-initialize on `DOMContentLoaded`, others require an explicit call
- Some components are configured by `data-*`, others by JS options objects, others by
  class alone
- Disabled/loading expressed as a class on one component and an attribute on another
- Duplicate components that should be one (e.g. overlapping responsibilities across
  `popover.js`, `menu.js`, `drawer.js`, `floating-window.js` — say which distinctions are
  real and which are accidental)

Also flag domain components in `js/components/` and `scheduler/css/features/` that
reimplement a base component instead of composing it, and any base component that only
exists to serve one caller.

Check the documented contracts in `docs/` (`buttons.md`, `cards.md`, `popovers.md`,
`ui-header.md`, `trip-bar.md`, `driver-assignment-card.md`, `layout-composition.md`,
`motion.md`) against the CSS and JS as built. Documentation that has drifted from the
implementation is a finding, and say which side is wrong.

### E. Domain modeling (scheduling specific)

- **Time:** are trip times stored and passed as UTC with explicit timezone handling, or as
  naive local strings? There is no date library — audit how consistently native `Date` and
  `Intl` are used, whether formatting helpers are duplicated across panels, and whether
  multi-day trips, overnight segments, and durations are modeled explicitly or reconstructed
  ad hoc at render time.
- **Repetition:** how are repeating or multi-leg trips represented? Is the rule duplicated
  between UI code and the data layer?
- **Core entities:** is there one canonical shape per entity (Trip, TripRequest, Driver,
  Assignment, Bus/Fleet unit, Customer, Passenger, Document, Maintenance record), or
  parallel near-duplicate shapes for the Supabase row, the model module, and the render
  layer? Map each entity to its `js/data/` module, its model module if any, and its
  consumers.
- **Conflict and business rules** (double-booked driver, overlapping assignments, vehicle
  availability, driver workload and rest limits, billing rules): where do they live?
  Business logic inside panel render functions is a finding; `js/core/` modules that hold
  it are the pattern to standardize on — say which rules are already there and which are not.
- **Validation:** one validation layer, or ad-hoc checks per form? Where does trip import
  validation live relative to `docs/trip-import-schema-v2.json`?

### F. State & data flow

- Server state vs client/UI state — clearly separated or tangled? How much state lives on
  the DOM versus in modules versus in globals on `window`?
- Data fetching pattern consistency across `js/data/*-db.js`: same client usage, same error
  shape, same return convention (throw vs null vs `{data, error}`)? Duplicated query logic?
- Module-to-module communication: direct imports, custom events, globals — one pattern or
  several? Depth of coupling between panels.
- Loading / empty / error states: handled uniformly through shared markup, or does each
  panel invent its own? Same for toasts and confirmation dialogs.
- Caching, refetch, and reload behavior (`js/core/app-reload.js`) — is invalidation
  centralized or per-panel?

### G. Accessibility & UX rules

- Keyboard navigation on the scheduling UI: the schedule grid, trip bars, drag/resize
  interactions, pickers, and the trip finder. Is anything mouse-only?
- Focus management in modals, drawers, popovers, menus, and floating windows: initial
  focus, focus trap, restore on close, `Escape` handling — consistent across all of them?
- `:focus-visible` styling: present on every interactive surface, or missing on custom ones?
- Labels on form controls, `aria-*` on custom widgets (segmented controls, suggestions,
  toggles), and whether generated markup preserves them.
- Color contrast of status colors in both themes; is trip/assignment status conveyed by
  color alone?
- `prefers-reduced-motion` — respected everywhere motion is defined, or only in some files?
- Semantic structure of the standalone share pages (`driver.html`, `request.html`,
  `maintenance.html`), which are the pages most likely to be opened on a phone by someone
  outside the office.

### H. Consistency hygiene

Duplicated utilities across `js/` and `rux-ui/js/`, dead CSS (classes with no markup) and
dead JS exports, live query hooks that look dead (classes referenced only by JS selectors
or HTML attributes — check before calling anything unused), commented-out blocks, mixed
module styles (`import` vs global script vs inline), inconsistent error handling, silent
`catch` blocks, `console.log` left in, and duplicated markup between `index.html` and the
standalone pages.

Also audit the test suite as a system: which contracts are mechanically enforced, which
are only documented in `docs/` or the `rux-design` skill and therefore drift freely, and
which enforced contracts have accumulated an `ACCEPTED`/allowlist that is growing rather
than shrinking.

## Phase 3 — Output

Write the report to `docs/audit/design-system-audit.md` with this structure:

1. **Verdict** — 5 sentences max. The state of the codebase and the single biggest problem.
2. **Scorecard** — table of the eight areas above with a rating each.
3. **Findings** — grouped by area. Each finding gets: a one-line title, severity
   (`Critical` / `High` / `Medium` / `Low`), evidence with `file:line`, why it hurts, and
   the fix. Mark each finding as already-tracked in `docs/portability-audit.md` or new.
4. **Domain glossary** — the canonical-term table from B, including the UI ↔ database
   name mismatches and which side is immovable.
5. **Proposed design rules** — the ruleset this codebase *should* follow, written as short
   imperative rules that could be pasted into `CLAUDE.md` and enforced in review. Cover:
   file structure and tier placement, naming (CSS, tokens, JS, domain vocabulary), token
   usage, component contract, and where business logic is allowed to live. Prefer rules
   that an existing contract test could be extended to enforce, and say which test.
6. **Remediation plan** — ordered, in phases. Each item: what changes, which files, rough
   effort (S/M/L), and whether it's mechanical (scriptable) or requires judgment. Highest-
   leverage-lowest-risk first. Any rename must be sequenced with the grep-before/grep-after
   discipline `CLAUDE.md` requires, and must note that HTML class attributes and JS
   selectors are not covered by the test suite.
7. **Open questions** — anything you had to guess about; ask rather than assume.

## Rules for you

- Evidence or it didn't happen. Every claim cites files.
- Severity is about impact on velocity and correctness, not taste. Don't inflate.
- If something is genuinely good, say so and name it — it becomes the pattern to
  standardize on. This repo already has real strengths; a report that finds only problems
  is a bad report.
- Prefer "adopt the existing majority pattern" over "introduce a new pattern," unless the
  majority pattern is actively harmful.
- Respect the repository policy: no renames proposed outside `docs/portability-audit.md`
  without flagging them as requiring explicit approval.
- No code edits, no refactors, no new files other than the report. Stop and report.
