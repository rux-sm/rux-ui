# Productive Motion

Rux UI uses short, functional motion for repeated application interactions,
inspired by Carbon's productive-motion model. Motion should clarify where a
surface came from and where it went without making the user wait.

> Configure motion with tokens. Do not hardcode durations or easing curves in
> component rules.

## Foundation Tokens

| Token | Value | Role |
| --- | ---: | --- |
| `--rux-motion-duration-fast-01` | `70ms` | Small icon or state response |
| `--rux-motion-duration-fast-02` | `110ms` | Menus and compact transient surfaces |
| `--rux-motion-duration-moderate-01` | `150ms` | Frequently used shell panels and structural changes |
| `--rux-motion-duration-moderate-02` | `240ms` | Larger or more deliberate structural changes |
| `--rux-motion-easing-entrance-productive` | `cubic-bezier(0, 0, 0.38, 0.9)` | Surfaces entering the interface |
| `--rux-motion-easing-exit-productive` | `cubic-bezier(0.2, 0, 1, 0.9)` | Surfaces leaving the interface |
| `--rux-motion-easing-standard-productive` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | Continuous movement between visible states |

These are foundational values. Component CSS should normally consume the
semantic aliases below so a component's motion contract stays explicit.

## Component Contracts

### Panels

Structural panels, attached drawers, and their scrims use:

- `--rux-panel-motion-duration`
- `--rux-panel-enter-easing`
- `--rux-panel-exit-easing`
- `--rux-panel-standard-easing`
- `--rux-panel-content-motion-duration`

Opening uses the entrance curve. Closing uses the exit curve. A control that
moves continuously with an already-visible panel uses the standard curve.
Panel content may fade or reflow with the faster content-duration token, but it
must not finish after the panel itself.

```css
.app-drawer {
	transform: translateX(-100%);
	transition:
		transform var(--rux-panel-motion-duration)
		var(--rux-panel-exit-easing);
}

.app-drawer.is-open {
	transform: translateX(0);
	transition-timing-function: var(--rux-panel-enter-easing);
}
```

### Hamburger Menu Icon

The UI-header menu trigger uses:

- `--rux-ui-header-menu-icon-motion-duration`
- `--rux-ui-header-menu-icon-motion-easing`

Its Menu and Close glyphs switch immediately, matching the measured preview.
The stacked glyphs preserve the existing Material Symbols icon system, and
`aria-expanded` controls their visual state; JavaScript does not manage
animation timing.

### UI-Shell Side Navigation

The product side navigation is a specialized, faster structural transition:

- `--rux-side-nav-motion-duration`: `110ms`
- `--rux-side-nav-enter-easing`: productive exit
- `--rux-side-nav-exit-easing`: productive exit
- `--rux-side-nav-scrim-enter-delay`: `70ms`
- `--rux-side-nav-scrim-enter-duration`: `200ms`
- `--rux-side-nav-scrim-enter-easing`: productive standard
- `--rux-side-nav-scrim-exit-duration`: `0ms`

The navigation remains at its final coordinates and full opacity. A
`clip-path` edge travels from the left across the fixed-width panel, revealing
all navigation items through one mask with no translation, scale, or item
stagger. On desktop, the workspace's layout space expands alongside the same
clipping edge so the attached navigation still pushes content.

On compact layouts, the pure-black scrim's inline edge follows the panel edge.
Its opacity begins after `70ms`, reaches `0.65` over `200ms`, and disappears
immediately when closing begins. The delayed fade is intentionally not aligned
to the panel's completion time.

### Menus

Menus are smaller and more frequently repeated than structural panels. They use
the faster productive contract:

- `--rux-menu-motion-duration`
- `--rux-menu-enter-easing`
- `--rux-menu-exit-easing`
- `--rux-menu-motion-distance`

The shared `.rux-menu` fades and moves a short distance toward its trigger.
Direction follows the resolved `data-placement` value from `RuxPopover`.
Display transitions are progressive enhancement; unsupported browsers still
open and close the menu correctly without delaying interaction.

## Behavior Rules

- Animate only properties that explain a state change: usually `clip-path`,
  `transform`, `translate`, `opacity`, or a drawer's layout dimension.
- Opening and closing states must remain operable without animation.
- Do not use spring, bounce, or overshoot motion for shell navigation, panels,
  dialogs, or menus.
- Do not animate a resizable panel while the pointer or keyboard is actively
  resizing it.
- Coordinate scrim timing with its panel. A documented delay or asymmetric
  exit is acceptable when it is part of the component contract.
- Preserve focus, keyboard dismissal, and accurate `aria-expanded` state
  independently of the animation lifecycle.

## Reduced Motion

The shared reduced-motion rule in `rux-ui/css/base/utils.css` reduces animation
and transition durations to an effectively immediate state change. Components
must not rely on an animation completing to make content accessible or update
ARIA state.

## Verification

- Opening begins immediately and decelerates into place.
- Closing accelerates away without a pause.
- The UI-shell navigation reveals in `110ms`; its scrim begins after `70ms`
  and fades over `200ms`.
- The side-navigation scrim disappears on the first closing frame.
- Menus remain anchored while they animate.
- Repeated toggling cannot leave stale open, closing, or inert states.
- Keyboard and pointer behavior work with reduced motion enabled.
