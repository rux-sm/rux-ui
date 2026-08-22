# Rux UI

A lightweight, theme-aware design system for Rux UI. Shared CSS, small vanilla-JS helpers, and one naming convention.

> **Philosophy**: clean, minimalist, modern. Think the restraint of Apple, the density of Linear, the energy of Spotify. Near-black surfaces, hairline borders, single accent color, no decoration that doesn't earn its place.

## Sources

This system was distilled from the historical **TripBoard** codebase, which originated a heavier 3-tier `--rux-*` token system across ~12 CSS files. This rebuild consolidates tokens into one flat namespace and exposes one component entrypoint that imports focused component partials.

The reference application in `index.html`, its styles under `scheduler/css/`, and the documents under `docs/` are the reference for advanced patterns such as the schedule grid, trip bar geometry, and optical-radius math.

---

## Setup on a new machine

Run once per clone, so the versioned hooks are active:

```bash
git config core.hooksPath .githooks
```

Then check the machine can actually build and test:

```bash
tools/check-env.sh
```

It reports Node's presence and version and whether hooks are enabled, in pure
bash — a check that needed Node could not report Node's own absence. After that
it runs automatically on every `git pull` (warn-only; the merge has already
happened) and before `npm test`.

---

## Index

```
.
├── README.md              ← you are here
├── gallery.html           ← component specimens, both themes, no app boot required
│                            (9 of 22 base components so far — tests/gallery-coverage
│                             records the gaps and stops new ones appearing)
├── .claude/skills/        ← Claude Code skills: rux-design, vendor-rux-ui, verify
├── CLAUDE.md              ← concise Claude Code repository policy
├── docs/ai/               ← human-facing AI workflow and model routing
├── rux-ui/
│   ├── css/
│   │   ├── rux.css            ← single entry point for the full design system
│   │   ├── tokens.css         ← all design tokens: color, type, space, radius, motion
│   │   ├── colors_and_type.css ← webfonts (text + icon faces) + global element styles
│   │   ├── rux-core.css       ← compatibility alias, forwards to rux.css
│   │   └── base/              ← 21 reusable BEM components
│   └── js/                    ← the JS engine behind rux-ui/css/base/* components:
│                                 utilities.js (toast/modal/copy/accent), theme.js,
│                                 menu.js, popover.js, drawer.js, floating-window.js,
│                                 suggestions.js, controls.js, ui-shell.js,
│                                 view-router.js
├── scheduler/
│   └── css/
│       ├── components.css     ← scheduler bundle (features + layout; needs rux.css)
│       ├── features/          ← 30 scheduler-specific panels and components
│       └── layout/            ← scheduler grid and application shell
├── js/
│   └── core/               ← scheduler business logic (billing, trip requests,
│                              driver workload, contacts) — not part of the
│                              portable design system, stays with this app
├── index.html             ← current full application and composition reference
├── assets/                ← logos, favicons
└── tests/                 ← component and application contract tests
```

Human-facing AI references: start with the [AI Coding Quick Reference](docs/ai/AI_CODING_CHEAT_SHEET.md), then use the [full operating guide](docs/ai/AI_AGENT_WORKFLOW.md) when a task needs more detail.

To use the complete reference-application bundle in an existing page:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
<link rel="stylesheet" href="scheduler/css/components.css" />
<script src="rux-ui/js/utilities.js" defer></script>
<script src="rux-ui/js/theme.js" defer></script>
<script src="rux-ui/js/menu.js" defer></script>
<script src="rux-ui/js/popover.js" defer></script>
<script src="rux-ui/js/drawer.js" defer></script>
<script src="rux-ui/js/floating-window.js" defer></script>
<script src="rux-ui/js/suggestions.js" defer></script>
<script src="rux-ui/js/controls.js" defer></script>
<script src="rux-ui/js/ui-shell.js" defer></script>
<script src="rux-ui/js/view-router.js" defer></script>
```

Only `utilities.js` is strictly required for the reference-app bundle to run
without errors; the rest wire up specific components (menus, popovers,
drawers, floating panels, the search dropdown, tab/toggle declarative
controls, the header disclosure button, the show-one-view router) — include
whichever ones the page actually uses.

For a new application, drop the second line — `rux.css` alone is the whole
design system:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
```

`rux.css` is the single entry point for the complete Rux visual system: tokens,
webfonts (including the Material Symbols face behind every `.rux-icon`), global
type styles, and all reusable base components. It deliberately excludes the
scheduler and reference-application feature styles, which `components.css`
adds on top — that bundle now contains _only_ those features and requires
`rux.css` to be loaded first.

`rux-core.css` remains as a compatibility alias that forwards to `rux.css`; it
used to carry a second, byte-identical copy of the import list. New pages
should link `rux.css` directly.

### Using Rux UI in another project

The `rux-ui/` folder is self-contained — no relative path inside it escapes the
folder, and the webfonts load from the Google Fonts CDN. Copying `rux-ui/` into
another project and linking `rux-ui/css/rux.css` is enough to get the full
system. `utilities.js` is the only script needed for toasts and modals; add the
others as the page uses those components.

Once a second project depends on it, prefer installing from a git tag over
keeping two copies in sync:

```bash
npm install github:<owner>/rux-ui#v1.0.0
```

See [Portability Audit](docs/portability-audit.md) for the tier boundary — which
units are portable, which stay with the application, and the sequence for moving
the rest. `tests/portability-boundary.test.mjs` enforces it.

### Application composition

Rux applications place a full-width UI header above the application body. The
header may control product side navigation, while view-specific controls remain
in the workspace header. Attached application shells contain one required
center workspace and may include side panels with no decorative gaps between
structural siblings.

See [Application Layout](docs/layout-composition.md) for the complete UI-header,
workspace, panel, card, spacing, scrolling, responsive, and accessibility
contract. See [UI Header](docs/ui-header.md) for the lightweight component
standard, [Rux Popovers](docs/popovers.md) for header tab-tip and interactive
popover rules, and [the reference layout](examples/app-layout.html) for copyable
markup.

---

## Content Fundamentals

### Voice & tone

- **Direct.** Short sentences. Verb-first when you can.
- **Active voice.** "Save the trip" over "The trip will be saved." A control says exactly what happens when it's used.
- **Calm.** No exclamation marks, no urgency unless it's truly urgent (a destructive action, an error).
- **Plain.** Plain words over technical ones. "Delete trip" over "Remove record". "Couldn't connect" over "Connection failure occurred".
- **Trustworthy.** Tell the user what happened and what they can do. Never blame them.
- **Consistent through a flow.** An action keeps the same name end to end — a
  "Publish" button produces a "Published" toast, not "Success" or "Done."

### Person & pronouns

- **You** addresses the user directly. "You haven't saved this trip yet."
- **We** is the product team, used sparingly and only for product communication ("We're updating the schedule format"). Never in UI labels.
- **Never "I"** in UI copy.

### Casing

Casing follows what an element *is*, not where it sits. A control is a thing
you act on and reads as a label; a heading, a field label, and body copy are
read as language.

- **Title Case** for **controls**: buttons, menu items, navigation destinations, tabs, toasts.
    - ✅ `New Trip`, `Save Changes`, `Send Trip Request`
    - ❌ `New trip`, `Save changes`, `Send trip request`
- **Sentence case** for **headings, form field labels, radio/checkbox/switch option labels, and body copy**.
    - ✅ `Day of the trip`, `Pickup address or venue`, `Round trip`, `I am the day-of contact`
    - ❌ `Day Of The Trip`, `Pickup Address Or Venue`, `Round Trip`
- **No UPPERCASE, and no tracking on labels.** Overlines and section labels are
  **sentence case at the label role's own tracking (0)**, like every other label.
    - ✅ `Recent changes`, `Trip contact`, `Move to bus`
    - ❌ `RECENT CHANGES`, `TRIP CONTACT`
    - Acronyms that are genuinely acronyms keep their caps — `CDL`, `VIN`, `ZIP`.

  This bullet read *"UPPERCASE only for overlines and badges … track them out
  (`letter-spacing: 0.04em`)"* until 2026-08-21. It was withdrawn because rule 2.13 in
  `docs/foundations/typography.md` holds that Label tracks **0 at every size it publishes**,
  measured on the Geist specimens — so an overline that is uppercased *and* tracked out is
  two departures from the catalog at once. Of the three ways to resolve that, dropping the
  uppercase is the only one needing no departure at all, and it is the one taken
  (typography.md §5 step 40, Q10). Badges were never affected: nothing uppercases them in
  CSS, and their caps come from the data.

The split is deliberate. Title Case makes a control read as one named thing,
which is why it earns its place on buttons and menu items. Field labels are
often phrases rather than names — `Pickup address or venue`, `Day-of contact
phone` — and Title Case fights their legibility, which matters most on
customer-facing pages such as `request.html`.

This rule was Title Case for everything until 2026-08-18. Vercel Geist, the
structural reference elsewhere in this document, publishes **no** casing rule
and its own docs are inconsistent — `Upload` and `Sign Up` on buttons, but
`Prefix and suffix` and `All Types and Sizes in comparison` as headings. So
this is our own position rather than one inherited, and the "follow Geist"
heuristic does not settle it.

### Punctuation

- No trailing periods on **button labels**, **menu items**, **field labels**, **table headers**, **toasts**, or **single-line tooltips**.
- Periods **are** used in full sentences inside body copy, modal descriptions, and multi-sentence help text.
- Ellipsis (`…`, the actual character, not three dots) for actions that open a follow-up step (`Export…`, `Delete trip…`) and for in-progress states (`Saving…`, `Loading…`).
- Curly quotes (“Delete”) rather than straight quotes ("Delete") in copy.

### Numbers, dates, units

- Use real characters: `–` for ranges (`Mon–Fri`), `×` for dimensions, `′″` for feet/inches if needed.
- Times: lowercase `am`/`pm`, no space. `9:00am`, `3:30pm`.
- Dates in UI lists: `Tue, Mar 12`. Full dates: `March 12, 2026`.
- Money: `$1,240` not `$1240.00` unless cents matter.
- Use numerals for counts: `8 trips`, not `eight trips`.
- Use a non-breaking space between a number and its unit, or inside a
  keyboard shortcut, so they never wrap apart: `10&nbsp;mi`, `⌘&nbsp;K`.
- Use `Intl.DateTimeFormat` / `Intl.NumberFormat` for date, time, and number
  formatting — never hand-rolled string formatting.
- Use `font-variant-numeric: tabular-nums` wherever numbers sit in a column
  or get compared side by side (schedule times, counts).

### Emoji

**Do not use emoji** in Rux UI surfaces. Status is communicated by color, a Material Symbols icon, and the badge component. Emoji are inconsistent across platforms and clash with the minimalist tone.

### Example copy

| Context     | Good                                                  | Bad                                                 |
| ----------- | ----------------------------------------------------- | --------------------------------------------------- |
| Empty state | `No trips this week`                                  | `Looks like you don't have any trips yet! 🚌`       |
| Error       | `Couldn't save. Check your connection and try again.` | `Oops! Something went wrong saving your trip!`      |
| Confirm     | `Delete this trip?` `This can't be undone.`           | `Are you sure you want to permanently delete this?` |
| Toast       | `Trip Saved`                                          | `Trip successfully saved.`                          |
| Button      | `Save` `Delete Trip…`                                 | `save trip` `DELETE`                                |

---

## Visual Foundations

> **Orientation summary — not the authority.** The canonical statement of each design rule,
> with its values, lives in `docs/foundations/`: one document per section, each carrying a
> contract version and its own amendment log. `typography.md` is landed; spacing, colour,
> and motion follow. Where this section and a foundation document disagree, **the
> foundation document wins**. Values repeated below are convenience copies, are presumed
> stale, and are being converted to pointers section by section as each foundation document
> settles. Cite the foundation document, never this list.

### Backgrounds

Two surfaces only, following the Vercel Geist model (see "Reference: Vercel
Geist colors" below):

| Token             | Use for                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `--rux-surface-0` | Chrome — app canvas, panel/floating-window shells, headers, tabs, controls  |
| `--rux-surface-1` | Content — cards, tables, menus, popovers, dialogs, anything holding content |

The rule of thumb: if it's a container that _holds_ content, it's
`--rux-surface-1`; if it's UI furniture around that content, it's
`--rux-surface-0`. Since the 2026-08 flatten this is literal: `html`/`body`,
the app shell (`--rux-shell-bg`), the UI header, and the splash all paint
`--rux-surface-0` — one continuous canvas — and `.rux-workspace` paints
nothing (`--rux-workspace-bg: transparent`), so the only raised layers are
the surface‑1 content containers themselves, exactly Geist's
`background-100`/`-200` model. `--rux-bg-hover` / `--rux-bg-active` are direct values
(not aliased to a surface step) for interactive list-item states — a
different axis from the two-surface scale, layered onto whichever surface
the interactive element sits on rather than replacing it.

**No gradients** except `--rux-overlay-scrim` (a flat 60% black scrim for modals). No full-bleed imagery as background. No textures, patterns, grain. Surfaces are flat color separated by hairlines.

### Color

One accent (`--rux-accent`, `var(--rux-blue)` — `oklch(60% 0.28 255)` — by default) used sparingly — primary actions, active states, links, focus rings. Status colors (`--rux-success`, `--rux-warning`, `--rux-danger`, `--rux-info`) for semantic feedback only — never decorative.

All colors are `oklch()` so chroma stays perceptually balanced if you retheme.

#### Reference: Vercel Geist colors

As of 2026-08-16, Rux UI follows [Vercel Geist's color system](https://vercel.com/geist/colors)
as a **structural** model where it fits — not a literal palette to copy.
That page doesn't publish raw hex/oklch values; what it documents is a
10-step neutral scale (`--ds-gray-100` through `--ds-gray-1000`) with a
fixed semantic role per step:

| Step | Role                           |
| ---- | ------------------------------ |
| 100  | Default background             |
| 200  | Hover background               |
| 300  | Active background              |
| 400  | Default border                 |
| 500  | Hover border                   |
| 600  | Active border                  |
| 700  | High-contrast background       |
| 800  | Hover high-contrast background |
| 900  | Secondary text/icons           |
| 1000 | Primary text/icons             |

Geist repeats this same 10-step shape for every other scale (blue, red,
green, amber, teal, purple, pink), plus two dedicated `background-100`/
`-200` tokens for the page canvas.

Follow the **progression** (subtle → strong, one role per step), not the
token names or exact numbers — per the Design rules in the `rux-design` skill, external
guidance always gets expressed through `--rux-*` tokens, never imported
directly. Current rux-ui alignment with this shape:

- `--rux-grid-guide` / `--rux-card-border` / `--rux-card-border-hover` /
  `--rux-card-border-active` mirrors the border/border-hover/border-active
  triad (steps 400/500/600).
- `--rux-surface-0` / `--rux-surface-1` mirrors Geist's own dedicated
  `background-100`/`-200` pair more directly than the 10-step gray scale
  does — Rux UI collapsed its former 8-step surface ladder (and the whole
  card-level/elevation-tier system built on it) down to exactly two
  surfaces for this reason: chrome, and everything raised off it. See
  Backgrounds above and [Cards](docs/cards.md) for what that collapse
  actually changed.
- `--rux-bg-hover` / `--rux-bg-active` are a separate axis (interactive
  list-item states, not depth) — no direct Geist background-hover/-active
  equivalent has been mapped yet.
- `--rux-text-primary` / `-secondary` maps directly onto the primary-text /
  secondary-text pair (1000/900). This was five levels (`-heading` /
  `-default` / `-muted` / `-faint` / `-disabled`) until 2026-08-18; `-heading`
  and `-default` forward to the pair and stay published for the vendored
  consumers, while `-muted` and `-faint` were retired outright — see
  `docs/foundations/typography.md` §5 step 9. `--rux-text-disabled` deliberately stayed outside it: Geist's
  scale has no disabled-text step, because a state that must read as "you
  cannot use this" is not one of the two content levels. Collapsing the five
  also moved placeholder and field-help text off the disabled value, where
  they had been rendering at 2.27:1 — below AA — onto secondary at 7.9:1.

This mapping is a reference point for future token work. The text scale has
had its pass (above); the remaining roles have not been audited against
Geist's shape.

#### Swappable accent — JS wiring exists, CSS side does not yet

`rux-ui/js/utilities.js` fully implements the _switching_ mechanism:

```js
Rux.setAccent("green"); // sets <html data-rux-accent="green">, persists to localStorage
Rux.getAccent(); // reads it back
```

```html
<!-- click a swatch -->
<button data-rux-set-accent="amber" aria-label="Amber">…</button>
```

`Rux.ACCENTS` lists four names (`blue`, `violet`, `green`, `amber`), and the
attribute gets set and restored correctly on load. **But no CSS anywhere
reads `[data-rux-accent="…"]`** — `--rux-accent` is a single flat value
(`var(--rux-blue)`) with no per-theme override block, so switching accent
today changes the attribute with no visible effect. Treat this as a real
gap, not documentation drift: wiring it up means adding a
`[data-rux-accent="violet"] { --rux-accent: var(--rux-violet); }`-shaped
rule (and equivalents) somewhere the theme tokens live, plus deciding
whether `--rux-violet`/`--rux-green`/`--rux-amber` primitives should be
added alongside the existing `--rux-blue`.

### Typography

- **Geist Sans** (Vercel's typeface) for UI text (loaded as Google Font). System sans fallback (`-apple-system`, `Segoe UI`) is acceptable when offline.
- **Geist Sans** for the trip bar too — Geist has no condensed cut, so `--rux-font-sans-condensed` aliases `--rux-font-sans` rather than loading a second family.
- **Geist Mono** for code and monospaced data.
- **No fourth family.** No display serif, no script. Hierarchy comes from size and weight, not font choice.
- Tight tracking on display sizes (`-0.02em`), normal at body, wide on overlines (`0.04em`).

### Spacing

A 4px grid: `--rux-space-1` (4px) through `--rux-space-6` (24px) step by their
own index, then `--rux-space-8` (32px), `-10` (40px), `-12` (48px), `-16` (64px),
`-20` (80px), and `-24` (96px). Two steps sit off the grid on purpose:
`--rux-space-px` (1px) for hairlines and `--rux-space-1-5` (6px), the single
half-step. **Do not invent new values** — propose the name and value instead.
Dense UIs use `--rux-space-2` and `--rux-space-3`; section gaps use
`--rux-space-5` or `--rux-space-6`.

### Buttons

Buttons use explicit size roles instead of inheriting the height of form controls.
See [Button Components](docs/buttons.md) for composition examples and usage rules.

| Control                |                                Height |                                    Font |                            Horizontal padding |                             Icon/text gap |
| ---------------------- | ------------------------------------: | --------------------------------------: | --------------------------------------------: | ----------------------------------------: |
| `.rux-button`          | `--rux-button-height-standard` `32px` |                  `--rux-size-14` | `--rux-button-padding-inline-standard` `12px` | `--rux-button-content-gap-standard` `8px` |
| `.rux-button--icon`    |                resolved button height |                      role-specific icon |                                           `0` |                                       n/a |
| `.rux-button--header`  |   `--rux-button-height-header` `44px` |  `--rux-button-icon-size-header` `24px` |      standard padding or square with `--icon` |                                     `8px` |
| `.rux-button--compact` |  `--rux-button-height-compact` `28px` | `--rux-button-icon-size-compact` `18px` |                 `8px` or square with `--icon` |                                     `4px` |
| `.rux-segmented-track` |      `--rux-input-height` outer track |                                   track |               `--rux-segmented-track-padding` |            `--rux-segmented-track-radius` |
| `.rux-button--segment` |         `--rux-segment-height` `28px` |                  `--rux-size-14` |                `--rux-segment-padding-inline` |                    `--rux-segment-radius` |

- Use `--rux-weight-400` (the default weight) for button labels — Rux buttons
  get their emphasis from fill and color, not bold text.
- Icon-only buttons are square: width equals the resolved button height.
- UI-header actions use the same `.rux-button--header.rux-button--icon`
  composition as other 44px header controls.
- Use `.rux-button--header` for persistent workspace and card-header controls.
- Use `.rux-button--compact` only for dense embedded actions such as trip bars.
- Destructive actions use solid `.rux-button--danger` or quiet
  `.rux-button--ghost.rux-button--danger`. Rux does not use danger outline.
- Toggle buttons use `.rux-button--toggle` with `aria-pressed`. They look like default buttons at rest, then press in and switch to the primary accent when active.
- Button rows use `.rux-cluster`, which spaces adjacent controls by `--rux-space-3` (`12px`) and wraps on small screens.
- Segmented controls use a shallow recessed `.rux-segmented-track` around `.rux-button--segment` items. The selected indicator uses `--rux-segment-active-background` and is the strip's only raised layer.
- Keep labels short, Title Case, and action-oriented.

### Forms

Forms are data-entry surfaces, not action controls. They use the same type scale and radius family as buttons, but they sit slightly lower in the interface: sunken background, visible hairline edge, and an inset field shadow.

| Element                     |                                                                                      Token / value | Rule                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------: | ------------------------------------------------- |
| `.rux-input`, `.rux-select` |                                                                        `--rux-field-height` `36px` | Standard text-entry height                        |
| `.rux-textarea`             |                                                                 `--rux-textarea-min-height` `84px` | Minimum height; vertical resize allowed           |
| `.rux-field`                |                                                                         `gap: --rux-space-2` `8px` | Space between label, control, and help/error text |
| `.rux-field__label`         | `--rux-field-label-size` (`--rux-size-12`), `--rux-field-label-weight` (`--rux-weight-400`) | Muted, Title Case, no trailing period             |
| placeholder                 |                                                                              `--rux-text-disabled` | Hint only; never required information             |
| help text                   |                                                             `--rux-size-12`, `--rux-field-help-fg` | One short sentence when useful                    |
| error text                  |                                                            `--rux-size-12`, `--rux-field-error-fg` | Direct recovery instruction                       |

- Field height remains `36px`, standard action buttons are `32px`, and persistent header actions are `44px`. Choose the semantic size role instead of forcing adjacent controls to match.
- Labels sit above fields. Do not use placeholder text as the only label.
- Labels use Title Case and no trailing punctuation: `Driver Name`, not `Driver name`.
- Placeholder text describes format or an example value. Keep it short: `Ada Lovelace`, `name@example.com`, `Anything to remember…`.
- Help text appears below the control and should explain how the value is used, not repeat the label.
- Invalid fields use `aria-invalid="true"`, which switches the border to `--rux-input-invalid-border`. The error message belongs directly under the field.
- Focus rings compose with the inset field shadow. A focused field should still read as recessed, not lifted.
- Inputs and selects use `--rux-well-bg`, `--rux-input-border` (`--rux-card-border`), `--rux-input-border-radius`, and `--rux-size-14`.
- Checkboxes and switches are 32px target-height controls so they align with button rows and repeated settings lists.

### Optical radius

Use component semantic tokens in component CSS; use the primitive scale only when defining those tokens:

```
--rux-radius-0       0px
--rux-radius-xs      2px
--rux-radius-sm      6px
--rux-radius-md      8px
--rux-radius-lg     12px
--rux-radius-xl     16px
--rux-radius-full 9999px
```

Panels, cards, buttons, and fields each route their own radius through one of
two shared roles — `--rux-radius-container` (panels, cards, calendar) or
`--rux-radius-control` (buttons, swatches, fields) — rather than a
single `--rux-panel-radius`/`--rux-card-radius`/`--rux-button-radius` token
apiece.

**Badges are the exception, and deliberately so.** `.rux-badge` takes
`--rux-radius-full`, not `--rux-radius-control`. A badge is a label applied to
something else, not a control you can press, and the pill shape is what says so
at a glance — the same split Vercel Geist draws between its Badge and its
Button. Sizing follows: `--rux-badge-height` is its own 20px value rather than
`--rux-control-height`, so a badge fits inside a `--rux-table-row-height` row
instead of setting it. Following Vercel Geist's Materials page (its "everyday surface"
tier — see "Reference: Vercel Geist colors" above for the general approach
of following Vercel's structure, not literal values): `--rux-radius-container`
is `--rux-radius-md` (8px, the roomier step for bigger boxes), `--rux-radius-control`
is `--rux-radius-sm` (6px, the tighter step for smaller controls). Floating
and overlay surfaces (menus, popovers, modals, floating windows) use a
separate, more elevated step, `--rux-radius-lg` (12px), matching Materials'
own floating-element tier — see each component's own token
(`--rux-menu-radius`, `--rux-popover-surface-radius`, `--rux-modal-radius`,
`--rux-panel-floating-radius`). `--rux-radius-full` remains reserved for
elements that need full rounding by definition, such as the switch
thumb/track. A future radius change to either shared role is a two-token
edit, not a per-component hunt. A drawer shell may override the outer panel
radius at a viewport edge; that is layout behavior, not a new panel variant.

### Surface depth

`--rux-surface-0` and `--rux-surface-1` are the whole depth scale (0 is canvas, 1 is everything raised off it) — see Backgrounds above. There is no deeper nesting tier: a card inside a card inside a panel is the same color at every depth. `--rux-surface-contrast` is reserved for light elements such as switch thumbs; it is not another surface step.

### Borders & shadows

Borders are **hairlines** (always 1px) from one family: `--rux-grid-guide`
for grid/table lines, then `--rux-card-border` → `--rux-card-border-hover` →
`--rux-card-border-active` as increasing intensities for everything else.
Solid buttons, segmented controls, and base cards keep a transparent border
slot so hover, focus, and active states never shift layout. Shadows are
reserved for floating surfaces and subtle tactile lift on buttons.

The active shadow recipes are intentionally small:

- `--rux-shadow-1` / `-2` / `-3` — elevation-indexed rim + contact + ambient
  recipes for floating surfaces (panels, menus, modals), by index rather than
  by role
- `--rux-shadow-pressed` — tactile control pressed state (an inset shadow)

Floating surfaces remain flat. Add a new elevation token only when a rendered component actually needs it.

Use inset shadows only when they describe state or material: form fields are permanent recessed containers; pressed toggle buttons are latched controls. Do not add decorative bevels to cards or generic surfaces.

### Cards

```css
background: var(--rux-card-body-bg);
border: var(--rux-card-body-border);
border-radius: var(--rux-card-body-radius);
padding: var(--rux-card-padding);
```

One card color regardless of nesting depth — no level system (see
"Reference: Vercel Geist colors" above). `--rux-card--elevated` /
`--rux-card--recessed` still nudge a specific card one relative step
lighter or darker when it needs to stand out from an identical sibling —
see [Cards](docs/cards.md).

Interactive cards can add a `border-color` shift on hover (`--rux-card-border-hover`) and a slight background lift to `--rux-bg-hover`. Never use a colored left border to denote category — use a `.rux-badge` instead.

### Panels

A panel is modular: header, navigation, body panes, and footer are independently optional. Panel chrome and pane insets use `--rux-panel-padding`; sibling sections or cards use `--rux-panel-content-gap`.

Cards may group distinct content inside a panel, but do not wrap every field or section by default. Resizing belongs to the drawer or workspace shell containing the panel, not to `.rux-panel` itself.

### Hover & press

- **Surface hover** raises background brightness one step (a surface's own
  background → `--rux-bg-hover`) or shifts border up one intensity. Never
  opacity (looks washed out on dark).
- **Default controls** are solid neutral fills, not outlined buttons. The fill does the affordance work; borders stay transparent unless the control is a container like tabs or an icon group.
- **Button hover and pressed states** are defined per emphasis: solid buttons shift their fill lightness, while ghost buttons use shared 10%/20% state washes.
- **Ghost buttons** keep a transparent base and reveal those state overlays on interaction.
- **Press / active** drops to the active color (`-10L` for filled controls) and translates `1px` down for buttons. Subtle, but visible.
- **Disabled** uses `--rux-text-disabled` for text and removes border emphasis. Cursor `not-allowed`.

### Motion

Repeated shell interactions use productive motion rather than hardcoded values.
The hamburger icon switches immediately, menus use `110ms` fast-02, the UI-shell
side navigation uses a `110ms` fixed-position clipping reveal, and other
frequently used structural panels use `150ms` moderate-01. Side-navigation
scrims begin after `70ms`, fade to 65% black over `200ms`, and disappear
immediately on close.

Component CSS consumes semantic `--rux-menu-*`, `--rux-panel-*`, and
`--rux-side-nav-*` motion tokens. Existing general-purpose `--rux-duration-*`
and `--rux-ease-*` tokens remain available for established non-structural
interactions.

`prefers-reduced-motion` is respected globally through `rux-ui/css/base/utils.css`, part of the shared base bundle every entry point loads.
See [Productive Motion](docs/motion.md) for the token table, component contracts,
implementation examples, and verification checklist.

### Transparency & blur

Used for modal and blocking-layer scrims (`--rux-overlay-scrim`, 60% black + `backdrop-filter: blur(4px)`). Everywhere else, surfaces are opaque. No glass cards, no frosted panels, no translucent sidebars — they create ambiguity about what's a layer and what's a state.

### Imagery

When imagery appears (avatars, logos, attachments), it sits inside hairline-bordered containers with `--rux-radius-md` corners. Photos are not desaturated, not duotoned, not tinted — they're shown as-is. The dark canvas already unifies them.

### Layout

- App shell uses fixed positioning for the top bar (`--rux-z-sticky`) and side rail.
- No content max-width for app shells — the workspace fills available width.
  `--rux-container-xs` (480px) exists for narrow dialogs/forms; there is no
  larger container scale today, since Rux UI has no marketing-page surfaces.
- Section gutters: `--rux-space-6` (24px) desktop, `--rux-space-4` (16px) mobile.
- Vertical rhythm is enforced by `.rux-stack` flex containers with `gap`, never margins.

---

## Iconography

Rux UI currently uses **Material Symbols Sharp** through the shared `.rux-icon`
contract. Size, fill, weight, grade, optical size, and motion are controlled by
the icon tokens in `rux-ui/css/tokens.css`; reusable behavior lives in
`rux-ui/css/base/icons.css`.

### Usage

Load the font once in the host page, then use a ligature name inside
`.rux-icon`:

```html
<link
	rel="stylesheet"
	href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
/>
<span class="rux-icon" aria-hidden="true">check</span>
```

Use `aria-hidden="true"` for decorative icons. Give an icon-only interactive
control its accessible name on the button or link.

### Emoji & unicode

Both are **not** used as icons in Rux UI. Status is shown by color + Material Symbols icon + label. The only acceptable unicode character is `…` (ellipsis) in action labels and `–` (en dash) in ranges.

### Logo

`assets/logo.png` — the Rux wordmark. Use on `--rux-surface-0` or `--rux-surface-1`. Don't recolor it. Don't lock it up with other marks.

---

## Conventions

```
The prefix tells you what ships.

  --rux-* / .rux-*     the design system in rux-ui/. Portable, domain-free,
                       and safe to copy into any application.
  --sched-* / .sched-* this repository's reference scheduler. Never copied.

Anything naming a trip, bus, driver, fleet, customer, manifest, or itinerary
belongs to the application, whatever it does. Both directions are enforced by
tests/portability-boundary.test.mjs; see docs/portability-audit.md §3.

Use oklch() for all color values.
Use full readable words.  Exception: `bg` for background.
Use Title Case for UI controls and headings, following the content rules above.

State classes (.is-*, .has-*) are JS-toggled, no prefix.
BEM for components: `.rux-card`, `.rux-card__body`, `.rux-card--elevated`.

When in doubt, edit a token before adding a new component override.
```

---

## CAVEATS & SUBSTITUTIONS

- **Fonts are CDN-loaded** (Geist, Geist Mono, and Material Symbols Sharp from Google Fonts). No `fonts/` directory is checked in. Add self-hosted `.woff2` files and update the two `@import` rules at the top of `rux-ui/css/colors_and_type.css` if you need offline reliability. Dropping the Material Symbols import without replacing it makes every `.rux-icon` render its ligature name as text.
- **Material Symbols Sharp is CDN-loaded** by current host pages. A new app must load the font or provide an equivalent self-hosted font resource.
- **Logo is `assets/logo.png`**, a raster asset, not a generated SVG wordmark.
- The **historical TripBoard codebase used different token names** (`--rux-bg-1`, `--rux-text-1`, etc). This rebuild's tokens (`--rux-surface-N`, `--rux-text-primary`) are intentionally divergent. To migrate from the old codebase, the mapping is:
    ```
    --rux-bg-1   → --rux-surface-0
    --rux-bg-2/3/4/5 → --rux-surface-1  (two surfaces total now — see Backgrounds above)
    --rux-text-1 → --rux-text-primary
    --rux-text-2 → --rux-text-secondary
    --rux-text-3 → --rux-text-disabled
    --rux-border-1/2/3 → --rux-card-border / --rux-card-border / --rux-card-border-hover
    ```
