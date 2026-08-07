# Rux UI

A lightweight, dark-only design system for Rux UI. Three CSS entrypoints, one JS file, one naming convention.

> **Philosophy**: clean, minimalist, modern. Think the restraint of Apple, the density of Linear, the energy of Spotify. Near-black surfaces, hairline borders, single accent color, no decoration that doesn't earn its place.

## Sources

This system was distilled from the **TripBoard** codebase (`trip-board/`), which originated a heavier 3-tier `--rux-*` token system across ~12 CSS files. This rebuild consolidates tokens into one flat namespace and exposes one component entrypoint that imports focused component partials.

The TripBoard codebase remains the reference for advanced patterns (the schedule grid, trip bar geometry, optical-radius math) — see `trip-board/docs/RUX_UI.md` and `trip-board/docs/Rux_UI_Bible` for the original architecture write-ups.

---

## Index

```
.
├── README.md              ← you are here
├── SKILL.md               ← Agent Skill spec (Claude Code / Claude.ai)
├── css/
│   ├── tokens.css          ← all design tokens: color, type, space, radius, motion
│   ├── colors_and_type.css ← webfonts + global element styles (h1, p, code, etc)
│   └── components.css      ← component entrypoint importing the component partials
├── utilities.js                 ← tiny JS helpers: Rux.toast, openModal, copy
├── demo.html              ← live showcase of every component
├── assets/                ← logos, favicons
├── preview/               ← Design System tab cards
└── ui_kits/
    └── showcase/          ← example app screen built from the system
```

To use in a new page:

```html
<link rel="stylesheet" href="css/tokens.css" />
<link rel="stylesheet" href="css/colors_and_type.css" />
<link rel="stylesheet" href="css/components.css" />
<script src="utilities.js" defer></script>
```

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

**Do not use emoji** in Rux UI surfaces. Status is communicated by color, icon (Lucide), and badge component. Emoji are inconsistent across platforms and clash with the minimalist tone.

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

Buttons are compact, solid controls. Rux uses one button size: 32px high.

| Control | Height | Font | Horizontal padding | Icon/text gap |
|---|---:|---:|---:|---:|
| `.rux-button` | `--rux-control-height` `32px` | `--rux-text-sm` `14px` | `--rux-space-3` `12px` | `--rux-space-2` `8px` |
| `.rux-button--icon` | `--rux-control-height` `32px` | icon only | `0` | n/a |
| `.rux-segmented` | `40px` outer track | track | `--rux-space-1` `4px` inner depth | `--rux-space-1` `4px` |
| segmented items | `--rux-control-height` `32px` | `--rux-text-sm` `14px` | `--rux-space-3` `12px` | n/a |

- Use `--rux-weight-medium` for all button labels.
- Icon-only buttons are square: width equals the resolved button height.
- Do not add compact or large button variants. Use layout density, icon-only buttons, or progressive disclosure instead of changing button height.
- Toggle buttons use `.rux-button--toggle` with `aria-pressed`. They look like default buttons at rest, then press in and switch to the primary accent when active.
- Button rows use `.rux-cluster`, which spaces adjacent controls by `--rux-space-3` (`12px`) and wraps on small screens.
- Segmented controls use a shallow recessed track around standard button items. The selected item uses `--rux-segmented-selected-bg` and is the only raised element in the strip.
- Keep labels short, sentence case, and action-oriented.

### Forms

Forms are data-entry surfaces, not action controls. They use the same type scale and radius family as buttons, but they sit slightly lower in the interface: sunken background, visible hairline edge, and an inset field shadow.

| Element | Token / value | Rule |
|---|---:|---|
| `.rux-input`, `.rux-select` | `--rux-field-height` `36px` | Standard text-entry height |
| `.rux-textarea` | `--rux-textarea-min-height` `84px` | Minimum height; vertical resize allowed |
| `.rux-field` | `gap: --rux-space-2` `8px` | Space between label, control, and help/error text |
| `.rux-field__label` | `--rux-text-xs` `12px`, `--rux-weight-medium` | Muted, sentence case, no trailing period |
| placeholder | `--rux-fg-subtle` | Hint only; never required information |
| help text | `--rux-text-xs`, `--rux-fg-subtle` | One short sentence when useful |
| error text | `--rux-text-xs`, `--rux-danger` | Direct recovery instruction |

- Field height is intentionally `36px`, while buttons are `32px`. Text-entry controls need a little more vertical room for the caret, placeholder, and typed values. Do not force inputs down to button height for visual matching.
- Labels sit above fields. Do not use placeholder text as the only label.
- Labels use sentence case and no trailing punctuation: `Driver name`, not `Driver Name`.
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
- **Button hover and active states** use composited state fills (`--rux-button-hover-overlay`, `--rux-button-active-overlay`) so the same interaction treatment works across button backgrounds.
- **Ghost buttons** keep a transparent base and reveal those state overlays on interaction.
- **Press / active** drops to the active color (`-10L` for filled controls) and translates `1px` down for buttons. Subtle, but visible.
- **Disabled** uses `--rux-fg-disabled` for text and removes border emphasis. Cursor `not-allowed`.

### Motion

| Duration | Use for |
|---|---|
| `--rux-duration-instant` `80ms` | Hover, opacity changes |
| `--rux-duration-fast` `140ms` | Button press, color shifts |
| `--rux-duration-base` `220ms` | Menu open, modal in |
| `--rux-duration-slow` `360ms` | Sheet slide, large layout |

Default easing is `--rux-ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`) — fast start, gentle settle. Use `--rux-ease-in-out` only for symmetric motion (loops, indeterminate progress). `--rux-ease-spring` exists for playful affordances but should appear *almost never* — overshoot is a feature, not a vibe.

`prefers-reduced-motion` is respected globally through `css/components.css`.

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

Rux UI uses **Lucide** ([lucide.dev](https://lucide.dev)) as its icon library. Lucide is:

- Stroke-based, 24×24 viewBox, 1.5–2px stroke weight.
- MIT-licensed, available via CDN, ESM, or React.
- Visually compatible with Inter — both have rounded terminals and a similar geometric/humanist balance.

### Why Lucide and not Material Symbols?

The TripBoard codebase uses Material Symbols Outlined heavily. We migrated away because Material's variable-axis icons (`opsz`, `wght`, `GRAD`, `FILL`) require careful tuning to look right at small sizes, and their default fill style clashes with the minimalist stroke aesthetic. Lucide is more opinionated and consistent out of the box.

> **FLAG:** TripBoard component CSS still references `material-symbols-outlined`. If you port a component from `trip-board/css/*.css`, swap those `<span class="material-symbols-outlined">` for inline Lucide SVGs.

### Usage

The simplest path is inline SVGs with `class="rux-icon"`. Sizes:

```css
.rux-icon        { width: 16px; height: 16px; stroke-width: 1.75; }
.rux-icon--sm    { width: 14px; height: 14px; }
.rux-icon--lg    { width: 20px; height: 20px; }
.rux-icon--xl    { width: 24px; height: 24px; }
```

Via the CDN, you can drop them at runtime:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="check" class="rux-icon"></i>
<script>lucide.createIcons();</script>
```

`assets/icons/` contains a small set of inline-SVG icons used in `demo.html` and the preview cards — copy them or pull more from lucide.dev.

### Emoji & unicode

Both are **not** used as icons in Rux UI. Status is shown by color + Lucide icon + label. The only acceptable unicode character is `…` (ellipsis) in action labels and `–` (en dash) in ranges.

### Logo

`assets/rux-logo.svg` — the Rux wordmark, set in Inter Bold with a single accent dot. Use on `--rux-bg` or `--rux-bg-elevated`. Don't recolor it. Don't lock it up with other marks.

---

## Conventions

```
Use --rux-* for every design token. No other prefix exists.
Use oklch() for all color values.
Use full readable words.  Exception: `bg` for background.
Use sentence case for UI copy.

State classes (.is-*, .has-*) are JS-toggled, no rux- prefix.
BEM for components: `.rux-card`, `.rux-card__body`, `.rux-card--elevated`.

When in doubt, edit a token before adding a new component override.
```

---

## CAVEATS & SUBSTITUTIONS

- **Fonts are CDN-loaded** (Inter + JetBrains Mono from Google Fonts). No `fonts/` directory is checked in. Add self-hosted `.woff2` files and update the `@import` at the top of `css/colors_and_type.css` if you need offline reliability.
- **Lucide icons are referenced via CDN** in `demo.html` and preview cards. We did not vendor the full set.
- **Logo is a typographic wordmark** generated in this project — no pre-existing Rux logo was found in the source materials. If a real logo exists, swap `assets/rux-logo.svg`.
- The **TripBoard codebase still uses the old token names** (`--rux-bg-1`, `--rux-text-1`, etc). This rebuild's tokens (`--rux-bg`, `--rux-fg`) are intentionally divergent. To migrate the app, the mapping is:
  ```
  --rux-bg-1   → --rux-bg
  --rux-bg-2/3/4 → --rux-bg-elevated
  --rux-bg-5   → --rux-bg-elevated  (or its own token if modal needs lift)
  --rux-text-1 → --rux-fg
  --rux-text-2 → --rux-fg-muted
  --rux-text-3 → --rux-fg-subtle
  --rux-border-1/2/3 → --rux-border-subtle / --rux-border / --rux-border-strong
  ```
