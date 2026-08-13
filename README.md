# Rux UI

A lightweight, theme-aware design system for Rux UI. Shared CSS, small vanilla-JS helpers, and one naming convention.

> **Philosophy**: clean, minimalist, modern. Think the restraint of Apple, the density of Linear, the energy of Spotify. Near-black surfaces, hairline borders, single accent color, no decoration that doesn't earn its place.

## Sources

This system was distilled from the historical **TripBoard** codebase, which originated a heavier 3-tier `--rux-*` token system across ~12 CSS files. This rebuild consolidates tokens into one flat namespace and exposes one component entrypoint that imports focused component partials.

The reference application in `index.html`, its styles under `scheduler/css/`, and the documents under `docs/` are the reference for advanced patterns such as the schedule grid, trip bar geometry, and optical-radius math.

---

## Index

```
.
├── README.md              ← you are here
├── SKILL.md               ← current build instructions for coding agents
├── AGENTS.md              ← concise Codex repository policy
├── CLAUDE.md              ← concise Claude Code repository policy
├── .cline/rules/          ← concise Cline project policy
├── docs/ai/               ← human-facing AI workflow and model routing
├── rux-ui/
│   └── css/
│       ├── rux.css            ← single entry point for the full design system
│       ├── tokens.css         ← all design tokens: color, type, space, radius, motion
│       ├── colors_and_type.css ← webfonts + global element styles (h1, p, code, etc)
│       ├── rux-core.css       ← framework-agnostic entrypoint for new applications
│       └── base/              ← 18 reusable BEM components
├── scheduler/
│   └── css/
│       ├── components.css     ← scheduler bundle (base + features + layout)
│       ├── features/          ← 29 scheduler-specific panels and components
│       └── layout/            ← scheduler grid and application shell
├── js/
│   └── core/
│       ├── utilities.js   ← toast, modal, copy, and accent helpers
│       └── theme.js       ← light, dark, and system-theme behavior
├── index.html             ← current full application and composition reference
├── assets/                ← logos, favicons
└── tests/                 ← component and application contract tests
```

Human-facing AI references: start with the [AI Coding Quick Reference](docs/ai/AI_CODING_CHEAT_SHEET.md), then use the [full operating guide](docs/ai/AI_AGENT_WORKFLOW.md) when a task needs more detail.

To use the complete reference-application bundle in an existing page:

```html
<link rel="stylesheet" href="rux-ui/css/tokens.css" />
<link rel="stylesheet" href="rux-ui/css/colors_and_type.css" />
<link rel="stylesheet" href="scheduler/css/components.css" />
<script src="js/core/utilities.js" defer></script>
```

For a new application, use the framework-agnostic core entrypoint instead:

```html
<link rel="stylesheet" href="rux-ui/css/rux.css" />
```

`rux.css` is the single entry point for the complete Rux visual system. It includes the tokens, global type styles, and all reusable base components. It deliberately excludes the scheduler and reference-application feature styles imported by `components.css`. Existing pages can keep loading the original three stylesheets without any migration.

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
- **Calm.** No exclamation marks, no urgency unless it's truly urgent (a destructive action, an error).
- **Plain.** Plain words over technical ones. "Delete trip" over "Remove record". "Couldn't connect" over "Connection failure occurred".
- **Trustworthy.** Tell the user what happened and what they can do. Never blame them.

### Person & pronouns

- **You** addresses the user directly. "You haven't saved this trip yet."
- **We** is the product team, used sparingly and only for product communication ("We're updating the schedule format"). Never in UI labels.
- **Never "I"** in UI copy.

### Casing

- **Title Case** for everything: buttons, headings, menu items, labels, toast messages.
  - ✅ `New Trip`, `Save Changes`, `Driver Assignments`
  - ❌ `New trip`, `Save changes`, `Driver assignments`
- **UPPERCASE** only for overlines and badges that need to read as a category, not a sentence. Track them out (`letter-spacing: 0.04em`).
  - ✅ `DRAFT`, `INCOMPLETE`, `NEW`
- **Sentence case** is forbidden in UI controls. Use Title Case instead.

### Punctuation

- No trailing periods on **button labels**, **menu items**, **field labels**, **table headers**, **toasts**, or **single-line tooltips**.
- Periods **are** used in full sentences inside body copy, modal descriptions, and multi-sentence help text.
- Ellipsis (`…`, the actual character, not three dots) for actions that open a follow-up step: `Export…`, `Delete trip…`.

### Numbers, dates, units

- Use real characters: `–` for ranges (`Mon–Fri`), `×` for dimensions, `′″` for feet/inches if needed.
- Times: lowercase `am`/`pm`, no space. `9:00am`, `3:30pm`.
- Dates in UI lists: `Tue, Mar 12`. Full dates: `March 12, 2026`.
- Money: `$1,240` not `$1240.00` unless cents matter.

### Emoji

**Do not use emoji** in Rux UI surfaces. Status is communicated by color, a Material Symbols icon, and the badge component. Emoji are inconsistent across platforms and clash with the minimalist tone.

### Example copy

| Context | Good | Bad |
|---|---|---|
| Empty state | `No trips this week` | `Looks like you don't have any trips yet! 🚌` |
| Error | `Couldn't save. Check your connection and try again.` | `Oops! Something went wrong saving your trip!` |
| Confirm | `Delete this trip?` `This can't be undone.` | `Are you sure you want to permanently delete this?` |
| Toast | `Trip Saved` | `Trip successfully saved.` |
| Button | `Save` `Delete Trip…` | `save trip` `DELETE` |

---

## Visual Foundations

### Backgrounds

The system has **four background planes**, all near-black with subtle separation:

| Token | Value | Use for |
|---|---|---|
| `--rux-bg` | `oklch(0% 0.004 260)` | App canvas — the lowest plane |
| `--rux-bg-sunken` | `oklch(20% 0.004 260)` | Inputs, code blocks, recessed footers |
| `--rux-bg-elevated` | `oklch(24% 0.004 260)` | Cards, panels, menus, modals |
| `--rux-bg-hover` / `--rux-bg-active` | `#292929` / `#303030` | Interactive states |

**No gradients** except `--rux-overlay-scrim` (a flat 60% black scrim for modals). No full-bleed imagery as background. No textures, patterns, grain. Surfaces are flat color separated by hairlines.

### Color

One accent (`--rux-accent`, `oklch(60% 0.18 260)` by default) used sparingly — primary actions, active states, links, focus rings. Status colors (`--rux-success`, `--rux-warning`, `--rux-danger`, `--rux-info`) for semantic feedback only — never decorative.

All colors are `oklch()` so chroma stays perceptually balanced if you retheme.

#### Swappable accent

Blue is the default, but the accent is **one variable**: change it once, the whole product retones. The system ships four pre-tuned themes that share the same lightness and near-matching chroma — only the hue rotates — so they read as the same family.

| Theme | Hue |
|---|---|
| `blue` | `250` |
| `violet` | `295` |
| `green` | `155` |
| `amber` | `70`, chroma `0.16` |

**Three ways to apply:**

```html
<!-- 1. HTML attribute (set at server-render time) -->
<html data-rux-accent="violet">
```

```js
// 2. Runtime swap — also persists to localStorage
Rux.setAccent("green");
```

```html
<!-- 3. Declarative: click a swatch -->
<button data-rux-set-accent="amber" aria-label="Amber">…</button>
```

To add a brand-new accent, override `--rux-accent-h` (and optionally `--rux-accent-c`) on any selector — no other tokens need to change.

```css
[data-rux-accent="brand"] {
  --rux-accent-h: 312;     /* magenta */
  --rux-accent-c: 0.20;
}
```

### Typography

- **Inter** for UI text (loaded as Google Font). System sans fallback (`-apple-system`, `Segoe UI`) is acceptable when offline — Inter and SF have near-identical metrics.
- **JetBrains Mono** for code and monospaced data.
- **No third family.** No display serif, no script. Hierarchy comes from size and weight, not font choice.
- Tight tracking on display sizes (`-0.02em`), normal at body, wide on overlines (`0.04em`).

### Spacing

A 4px grid: `4, 8, 12, 16, 24, 32, 48, 64`. Pick from `--rux-space-1` through `--rux-space-8`. **Do not invent new values.** Dense UIs use `--rux-space-2` and `--rux-space-3`; section gaps use `--rux-space-5` or `--rux-space-6`.

### Buttons

Buttons use explicit size roles instead of inheriting the height of form controls.
See [Button Components](docs/buttons.md) for composition examples and usage rules.

| Control | Height | Font | Horizontal padding | Icon/text gap |
|---|---:|---:|---:|---:|
| `.rux-button` | `--rux-button-height-standard` `32px` | `--rux-text-sm` `14px` | `--rux-button-padding-inline-standard` `12px` | `--rux-button-content-gap-standard` `8px` |
| `.rux-button--icon` | resolved button height | role-specific icon | `0` | n/a |
| `.rux-button--header` | `--rux-button-height-header` `44px` | `--rux-button-icon-size-header` `24px` | standard padding or square with `--icon` | `8px` |
| `.rux-button--compact` | `--rux-button-height-compact` `28px` | `--rux-button-icon-size-compact` `18px` | `8px` or square with `--icon` | `4px` |
| `.rux-segmented-track` | `--rux-input-height` outer track | track | `--rux-segmented-track-padding` | `--rux-segmented-track-radius` |
| `.rux-button--segment` | `--rux-segment-height` `28px` | `--rux-text-sm` `14px` | `--rux-segment-padding-inline` | `--rux-segment-radius` |

- Use `--rux-weight-medium` for all button labels.
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

| Element | Token / value | Rule |
|---|---:|---|
| `.rux-input`, `.rux-select` | `--rux-field-height` `36px` | Standard text-entry height |
| `.rux-textarea` | `--rux-textarea-min-height` `84px` | Minimum height; vertical resize allowed |
| `.rux-field` | `gap: --rux-space-2` `8px` | Space between label, control, and help/error text |
| `.rux-field__label` | `--rux-text-xs` `12px`, `--rux-weight-medium` | Muted, Title Case, no trailing period |
| placeholder | `--rux-fg-subtle` | Hint only; never required information |
| help text | `--rux-text-xs`, `--rux-fg-subtle` | One short sentence when useful |
| error text | `--rux-text-xs`, `--rux-danger` | Direct recovery instruction |

- Field height remains `36px`, standard action buttons are `32px`, and persistent header actions are `44px`. Choose the semantic size role instead of forcing adjacent controls to match.
- Labels sit above fields. Do not use placeholder text as the only label.
- Labels use Title Case and no trailing punctuation: `Driver Name`, not `Driver name`.
- Placeholder text describes format or an example value. Keep it short: `Ada Lovelace`, `name@example.com`, `Anything to remember…`.
- Help text appears below the control and should explain how the value is used, not repeat the label.
- Invalid fields use `aria-invalid="true"`, a danger border, and `--rux-ring-danger` on focus. The error message belongs directly under the field.
- Focus rings compose with the inset field shadow. A focused field should still read as recessed, not lifted.
- Inputs and selects use `--rux-bg-sunken`, `--rux-border`, `--rux-radius-sm`, and `--rux-text-sm`.
- Checkboxes and switches are 32px target-height controls so they align with button rows and repeated settings lists.

### Optical radius

Use component semantic tokens in component CSS; use the primitive scale only when defining those tokens:

```
--rux-radius-0       0px
--rux-radius-xs      4px
--rux-radius-sm      6px
--rux-radius-md      8px
--rux-radius-lg     12px
--rux-radius-xl     16px
--rux-radius-full 9999px
```

Panels use `--rux-panel-radius`, cards use `--rux-card-radius`, buttons use `--rux-button-radius`, and fields use `--rux-radius-field`. A drawer shell may override the outer panel radius at a viewport edge; that is layout behavior, not a new panel variant.

### Surface depth

`--rux-surface-1` through `--rux-surface-7` form the canonical dark-to-light depth scale. Higher numbers appear visually closer, so adjusting a component's depth is a one-number change. `--rux-surface-contrast` is reserved for light elements such as switch thumbs; it is not another normal depth tier.

### Borders & shadows

Borders are **hairlines** (always 1px) at one of three intensities (`--rux-border-subtle`, `--rux-border`, `--rux-border-strong`). Solid buttons, segmented controls, and base cards keep a transparent border slot so hover, focus, and active states never shift layout. Shadows are reserved for floating surfaces and subtle tactile lift on buttons.

The active shadow recipes are intentionally small:

- `--rux-shadow-recessed` — recessed inputs and segmented tracks
- `--rux-shadow-raised` — tactile control rest state
- `--rux-shadow-pressed` — tactile control pressed state

Floating surfaces remain flat. Add a new elevation token only when a rendered component actually needs it.

Use inset shadows only when they describe state or material: form fields are permanent recessed containers; pressed toggle buttons are latched controls. Do not add decorative bevels to cards or generic surfaces.

### Cards

```css
background: var(--rux-card-bg);
border: var(--rux-card-border);
border-radius: var(--rux-card-radius);
padding: var(--rux-card-padding);
```

Interactive cards can add a `border-color` shift on hover (`--rux-border-strong`) and a slight background lift to `--rux-bg-hover`. Never use a colored left border to denote category — use a `.rux-badge` instead.

### Panels

A panel is modular: header, navigation, body panes, and footer are independently optional. Panel chrome and pane insets use `--rux-panel-padding`; sibling sections or cards use `--rux-panel-content-gap`.

Cards may group distinct content inside a panel, but do not wrap every field or section by default. Resizing belongs to the drawer or workspace shell containing the panel, not to `.rux-panel` itself.

### Hover & press

- **Surface hover** raises background brightness one step (`--rux-bg` → `--rux-bg-hover`) or shifts border up one intensity. Never opacity (looks washed out on dark).
- **Default controls** are solid neutral fills, not outlined buttons. The fill does the affordance work; borders stay transparent unless the control is a container like tabs or an icon group.
- **Button hover and pressed states** are defined per emphasis: solid buttons shift their fill lightness, while ghost buttons use shared 10%/20% state washes.
- **Ghost buttons** keep a transparent base and reveal those state overlays on interaction.
- **Press / active** drops to the active color (`-10L` for filled controls) and translates `1px` down for buttons. Subtle, but visible.
- **Disabled** uses `--rux-fg-disabled` for text and removes border emphasis. Cursor `not-allowed`.

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

`prefers-reduced-motion` is respected globally through `scheduler/css/components.css`.
See [Productive Motion](docs/motion.md) for the token table, component contracts,
implementation examples, and verification checklist.

### Transparency & blur

Used for modal and blocking-layer scrims (`--rux-overlay-scrim`, 60% black + `backdrop-filter: blur(4px)`). Everywhere else, surfaces are opaque. No glass cards, no frosted panels, no translucent sidebars — they create ambiguity about what's a layer and what's a state.

### Imagery

When imagery appears (avatars, logos, attachments), it sits inside hairline-bordered containers with `--rux-radius-md` corners. Photos are not desaturated, not duotoned, not tinted — they're shown as-is. The dark canvas already unifies them.

### Layout

- App shell uses fixed positioning for the top bar (`--rux-z-sticky`) and side rail.
- Content max-width: `--rux-container-xl` (1280px) for marketing, no max for app shells.
- Section gutters: `--rux-space-6` (32px) desktop, `--rux-space-4` (16px) mobile.
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

`assets/rux-logo.svg` — the Rux wordmark, set in Inter Bold with a single accent dot. Use on `--rux-bg` or `--rux-bg-elevated`. Don't recolor it. Don't lock it up with other marks.

---

## Conventions

```
Use --rux-* for every design token. No other prefix exists.
Use oklch() for all color values.
Use full readable words.  Exception: `bg` for background.
Use Title Case for UI controls and headings, following the content rules above.

State classes (.is-*, .has-*) are JS-toggled, no rux- prefix.
BEM for components: `.rux-card`, `.rux-card__body`, `.rux-card--elevated`.

When in doubt, edit a token before adding a new component override.
```

---

## CAVEATS & SUBSTITUTIONS

- **Fonts are CDN-loaded** (Inter + JetBrains Mono from Google Fonts). No `fonts/` directory is checked in. Add self-hosted `.woff2` files and update the `@import` at the top of `rux-ui/css/colors_and_type.css` if you need offline reliability.
- **Material Symbols Sharp is CDN-loaded** by current host pages. A new app must load the font or provide an equivalent self-hosted font resource.
- **Logo is a typographic wordmark** generated in this project — no pre-existing Rux logo was found in the source materials. If a real logo exists, swap `assets/rux-logo.svg`.
- The **historical TripBoard codebase used different token names** (`--rux-bg-1`, `--rux-text-1`, etc). This rebuild's tokens (`--rux-bg`, `--rux-fg`) are intentionally divergent. To migrate from the old codebase, the mapping is:
  ```
  --rux-bg-1   → --rux-bg
  --rux-bg-2/3/4 → --rux-bg-elevated
  --rux-bg-5   → --rux-bg-elevated  (or its own token if modal needs lift)
  --rux-text-1 → --rux-fg
  --rux-text-2 → --rux-fg-muted
  --rux-text-3 → --rux-fg-subtle
  --rux-border-1/2/3 → --rux-border-subtle / --rux-border / --rux-border-strong
  ```
