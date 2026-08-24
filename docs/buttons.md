# Button Components

> **Tier: component recipe.** This document is the component tier — which class and token
> each part consumes — not a foundation document. The foundation set outranks it wherever
> they touch: [`typography.md`](foundations/typography.md) 5.0.0 (the button family), [`layout.md`](foundations/layout.md) 2.11.0, [`color.md`](foundations/color.md) 3.0.0, [`state.md`](foundations/state.md) 1.7.0. Where they disagree, the foundation document wins and this file is
> corrected in the same change — the split `foundations/motion.md` states for `../motion.md`.
> Values below are this component's own contract; each was checked against `tokens.css` and
> the contracts above on 2026-08-23 (`composition.md` step 7). A sentence here that states a
> shared value or a MUST belongs in a foundation document, per the one-home rule.

Rux buttons use one composable contract. A button combines:

1. The base component: `.rux-button`
2. One emphasis: `--accent`, `--default`, `--ghost`, or `--danger`; combine
   `--ghost` and `--danger` for a quiet destructive action
3. One optional size role: `--header` or `--compact`; the base size is
   standard
4. An optional content or behavior modifier such as `--icon`, `--block`,
   `--toggle`, or `--loading`

Size, content, emphasis, and behavior are independent decisions. Do not create
a new monolithic button class for a combination the shared modifiers express.

## Size roles

| Role | Class | Control height | Icon | Text padding | Content gap | Use |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Standard | `.rux-button` | 32px | 20px | 12px | 8px | Forms, cards, toolbars, and ordinary actions |
| Header | `.rux-button--lg` | 40px | 22px | 12px | 8px | Persistent header navigation and icon actions |
| Compact | `.rux-button--sm` | 24px | 18px | 4px | 4px | Dense embedded desktop controls such as trip bars |

Icon-only buttons also use `.rux-button--icon`, which makes the control square
at its resolved height:

```text
Standard + Icon Only = 32 × 32px with a 20px icon
Header + Icon Only   = 40 × 40px with a 22px icon
Compact + Icon Only  = 24 × 24px with a 18px icon
```

Canonical size tokens use role-last naming (`-standard`, `-header`,
`-compact`) consistently:

```css
--rux-button-height-standard
--rux-button-icon-size-standard
--rux-button-padding-inline-standard
--rux-button-content-gap-standard
--rux-button-height-header
--rux-button-icon-size-header
--rux-button-height-compact
--rux-button-icon-size-compact
--rux-button-font-size-compact
--rux-button-padding-inline-compact
--rux-button-content-gap-compact
```

Padding and content-gap follow the same role-last convention; `compact` is
the only role with its own `font-size`. Rux does not maintain parallel
unsuffixed aliases for these canonical size roles.

## Emphasis

| Emphasis | Class | Use |
| --- | --- | --- |
| Primary | `.rux-button--accent` | The main action in a region |
| Secondary | `.rux-button--default` | Ordinary supporting actions |
| Ghost | `.rux-button--ghost` | Low-emphasis and header actions |
| Danger | `.rux-button--danger` | Primary destructive action |
| Danger ghost | `.rux-button--ghost.rux-button--danger` | Lower-emphasis destructive action |
Rux does not provide outline or on-accent variants. Use solid danger when the
destructive action should be prominent and danger ghost when it should be
quiet. Components on saturated surfaces use the shared ghost emphasis and own
any necessary contrast treatment in the surrounding component.

## Examples

```html
<button class="rux-button rux-button--accent">Save</button>

<button class="rux-button rux-button--default">
  <span class="rux-icon" aria-hidden="true">download</span>
  <span class="rux-button__label">Download</span>
</button>

<button
  class="rux-button rux-button--ghost rux-button--icon rux-button--lg"
  aria-label="Show Calendar Tools"
>
  <span class="rux-icon" aria-hidden="true">right_panel_open</span>
</button>

<button
  class="rux-button rux-button--ghost rux-button--icon rux-button--sm"
  aria-label="Open Trip"
>
  <span class="rux-icon" aria-hidden="true">open_in_new</span>
</button>

<button class="rux-button rux-button--ghost rux-button--danger">
  Delete
</button>
```

## Header and profile controls

Global shell actions use the same `.rux-button--lg` composition as other
header controls. The profile button is not a separate visual variant; it is a
specialized header-button composition with an avatar and account popover.

Header text controls may use the 44px height when they belong to the same
persistent control row. Icon-only controls are the default for navigation,
panel disclosure, and close actions.

## Accessibility and usage

- Icon-only buttons must have an `aria-label`.
- Decorative icons inside buttons use `aria-hidden="true"`.
- Toggle buttons use `.rux-button--toggle` and synchronize `aria-pressed`.
- `aria-pressed` is the single source of truth for toggle selection; do not
  add `.is-active` to buttons.
- Disclosure buttons synchronize `aria-expanded` and `aria-controls`.
- Disclosure icon swaps use `.rux-button__icon-swap`; mark the expanded icon
  with `.rux-button__icon--expanded`.
- Do not set button width, height, padding, or icon size in feature CSS when a
  shared size role applies.
- Compact controls are intended for dense desktop interfaces. Increase the
  effective target on touch layouts when the surrounding component does not
  already provide a larger hit area.
- Use one primary action per local decision region whenever practical.
