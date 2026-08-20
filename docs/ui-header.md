# UI Header

The Rux UI header provides persistent product identity and global actions. It
pairs with side navigation for product destinations and stays separate from
view-specific workspace controls.

## UI Shell Relationship

The UI shell has three independent but coordinated roles:

1. **Header** — orients the user, exposes global actions, and may trigger either
   panel.
2. **Left Panel (Side Navigation)** — holds primary and secondary product
   destinations.
3. **Right Panel** — holds product-level utilities such as notifications or a
   workspace switcher.

A right panel that belongs only to the current view remains contextual. For
example, TripBoard's Calendar Tools panel is controlled from the Calendar
workspace header rather than promoted to the global header.

## When To Use

Use `.rux-ui-header` once at the top of an application. Use it with
`.rux-side-nav` when the product has several destinations or needs navigation
that remains compact at narrow widths.

Do not place date controls, filters, panel tabs, or record actions in the UI
header. Those belong to the current workspace or panel.

## Anatomy

```text
UI Header
├── Menu Button                 controls the left panel
├── Brand / Header Name
├── Header Navigation           optional top-level links or menus
└── Global Actions
    ├── Search / Notifications
    ├── Identity
    └── Switcher                optional right-panel trigger

Side Navigation
├── Links
├── Collapsible Menus           optional
└── Dividers                    optional

Right Panel
└── Product Utilities / Switcher
```

The recommended header order is menu, brand, optional navigation, global
actions, then an optional switcher. The menu button is omitted when the
application has no side navigation or when that navigation is persistently
visible.

## Markup Contract

```html
<header class="rux-ui-header" aria-label="Application Header">
  <button
    class="rux-button rux-button--ghost rux-button--icon rux-button--lg rux-ui-header__menu"
    type="button"
    aria-label="Open Navigation"
    aria-expanded="false"
    aria-controls="primary-navigation"
    data-rux-side-nav-toggle
  >
	<span class="rux-button__icon-swap" aria-hidden="true">
		<span
			class="rux-icon"
			>menu</span
		>
		<span
			class="rux-icon rux-button__icon--expanded"
			>close</span
		>
	</span>
  </button>
  <div class="rux-ui-header__brand">Product Name</div>
  <div class="rux-ui-header__actions">...</div>
</header>

<nav
  class="rux-side-nav"
  id="primary-navigation"
  aria-label="Primary Navigation"
  aria-hidden="true"
  inert
  data-rux-side-nav
>
  <ul class="rux-side-nav__list">
    <li class="rux-side-nav__item">
      <a class="rux-side-nav__link" href="/trips" aria-current="page">
        <span class="rux-icon" aria-hidden="true">map</span>
        <span class="rux-side-nav__label">Trips</span>
      </a>
    </li>
  </ul>
</nav>
```

Application layout CSS owns placement. Header-triggered navigation should use
the standard non-persistent overlay behavior provided by
`rux-ui/js/ui-shell.js`; persistently visible navigation is a separate layout
configuration and does not use the hamburger disclosure pattern.

## Component API

- `.rux-ui-header__menu` controls the left panel through `aria-controls` and
  `aria-expanded`.
- `.rux-button__icon-swap` stacks collapsed and expanded button content.
  Mark the expanded content with `.rux-button__icon--expanded`; the shared
  button component responds to `aria-expanded` automatically.
- `.rux-ui-header__brand` contains the product name, wordmark, or home link.
- `.rux-ui-header__nav` contains optional top-level links or menus. Use
  `.rux-ui-header__nav-item` for its destinations.
- `.rux-ui-header__actions` is the global-action bar.
- Global actions use `.rux-button`, `.rux-button--ghost`,
  `.rux-button--icon`, and `.rux-button--lg` directly.
- `.rux-ui-header__profile` identifies the profile-menu trigger. Its avatar is
  centered inside the same standard header-button target.
- A right-panel trigger uses the same disclosure contract: `aria-controls`
  identifies the panel and `aria-expanded` reflects its state.
- Active destinations use `aria-current="page"`. Initial expanded state and
  click behavior belong to the consuming application or shell controller.

## Behavior

- The menu button toggles the side navigation and changes between menu and
  close icons immediately.
- `aria-expanded` and the navigation's `aria-hidden` state remain synchronized.
- Opening moves focus to the first navigation destination.
- Escape and the overlay scrim close the navigation and return focus to the
  menu button.
- Activating a destination closes the navigation.
- The active destination uses `aria-current="page"` in addition to its visual
  selected state.
- The header remains visible at narrow widths. Optional utilities may collapse,
  but product identity and the navigation trigger remain available.

## Header Action Buttons

Header actions use a shell-specific size contract inspired by productive UI
shells. They do not change the compact application-button standard.

| Part | Desktop | Mobile (≤500px) |
|---|---:|---:|
| Header height | `40px` | `44px` |
| Hit target | `40px × 40px` | `44px × 44px` |
| Icon | `22px × 22px` | `24px × 24px` |
| Profile avatar | `32px × 32px` | `32px × 32px` |
| Corner radius | `var(--rux-radius-control)` (4px) | same |

Use the action button for the navigation trigger and persistent global actions
such as search, messages, notifications, and profile. The control is transparent
at rest, receives a neutral surface on hover and press, and remains highlighted
while `aria-expanded="true"`.

Personal application settings, including theme, belong under Profile →
Preferences. They should not permanently occupy the global-action bar or be
coupled to a view-specific tool panel such as Calendar Tools.

Every icon-only action needs an `aria-label` and a discoverable tooltip or
`title`. Menu and panel triggers also need `aria-haspopup`, `aria-controls`, and
`aria-expanded` when those relationships apply.

The profile trigger follows the same interaction contract. Use `RuxMenu` for its
menu so a second click, an outside click, Escape, or menu-item activation closes
the menu and keeps `aria-expanded` synchronized.

Profile, Messages, and Notifications use the shared header tab-tip popover
composition. Add `.rux-ui-header__disclosure` to the trigger and
compose `.rux-popover--surface` with `.rux-popover--tab-tip` on its popover.
Compose the trigger's original icon or avatar and the Close glyph through the
same disclosure-icon stack used by the Hamburger. The original content is
visible while collapsed; Close is visible while expanded. Unread badges are
hidden in the expanded state so they do not compete with the close action.
See [Rux Popovers](popovers.md) for surface tokens, placement, semantics, and
interaction rules.

The Hamburger follows the same connected-surface rule without becoming a
popover. While expanded, its background resolves to `--rux-side-nav-bg` and it
sits above the navigation surface. The side nav owns its elevation through
`--rux-side-nav-shadow`, which defaults to `none`; do not add an
application-specific shadow that visually detaches it from the trigger.

## Productive Motion

Side-navigation motion is quick and functional:

- The panel remains at its final coordinates and full opacity. A clipping edge
  reveals or conceals its complete `256px` surface over `110ms`; content does
  not translate, scale, stretch, or stagger.
- Opening and closing both use the productive exit curve, producing the
  measured accelerating edge movement.
- At every viewport, the panel overlays the application body without moving
  or compressing the active workspace. A pure-black scrim follows the moving
  panel edge, waits `70ms`, then fades to 65% over `200ms` with the productive
  standard curve. It disappears immediately when closing begins.
- `prefers-reduced-motion` reduces both panel and scrim transitions to an
  effectively immediate state change.

The reference application keeps the header-triggered navigation non-persistent
at every width. The reusable `.rux-side-nav` component still does not impose
positioning or a product breakpoint.

See [Productive Motion](motion.md) for the shared foundation tokens and the
related panel and menu contracts.

## Tokens

Header tokens use the `--rux-ui-header-*` namespace. Side-navigation tokens use
`--rux-side-nav-*`. Component consumers should override these tokens instead of
reaching into element selectors.

The header and its actions share the 44px header-button role. The bottom
divider is painted inside that box and does not add another pixel to the
rendered height.

Common header tokens:

- `--rux-ui-header-bg`
- `--rux-ui-header-border`
- `--rux-ui-header-padding`
- `--rux-ui-header-height`
- `--rux-ui-header-min-height`
- `--rux-ui-header-logo-height`
- `--rux-button-height-header`
- `--rux-button-icon-size-header`
- `--rux-ui-header-profile-avatar-size`
- `--rux-button-icon-swap-duration`
- `--rux-button-icon-swap-easing`
- `--rux-ui-header-actions-gap`

Common side-navigation tokens:

- `--rux-side-nav-width`
- `--rux-side-nav-bg`
- `--rux-side-nav-shadow`
- `--rux-side-nav-item-min-height`
- `--rux-side-nav-item-hover-bg`
- `--rux-side-nav-item-active-bg`
- `--rux-side-nav-motion-duration`
- `--rux-side-nav-enter-easing`
- `--rux-side-nav-exit-easing`
- `--rux-side-nav-scrim-bg`
- `--rux-side-nav-scrim-opacity`
- `--rux-side-nav-scrim-enter-delay`
- `--rux-side-nav-scrim-enter-duration`
- `--rux-side-nav-scrim-enter-easing`
- `--rux-side-nav-scrim-exit-duration`

## Accessibility

- Include a skip link before the header when the application has persistent
  chrome.
- Give every icon-only action an accessible name.
- Use a semantic `<nav>` with a descriptive label and list markup.
- Do not use `role="dialog"` for a persistent side navigation or attached tools
  panel.
- Preserve visible focus and conventional Enter and Space activation.
- If an application turns a panel into a modal drawer, it must add complete
  modal focus and dismissal behavior rather than changing the role alone.

## Naming Contract

`.rux-ui-header`, its BEM elements, and `--rux-ui-header-*` are the only public
header names. The completed component migration does not retain a second alias
namespace.

## Verification Checklist

- Menu, Escape, scrim, and destination activation open and close navigation.
- Focus moves into navigation and returns to the menu button when dismissed.
- The current destination exposes `aria-current="page"`.
- Any right-panel trigger exposes accurate `aria-controls` and `aria-expanded`
  state.
- Header actions remain usable in light and dark themes.
- Header action hit targets resolve to `--rux-button-height-header` (40px desktop, 44px mobile) and glyphs to `--rux-button-icon-size-header`.
- The complete header box resolves to `--rux-ui-header-height`, including its visual divider.
- Expanded menu and panel triggers retain a visible active state.
- Header and navigation remain usable at desktop, tablet, mobile, and 200% zoom.
- Workspace controls remain outside the global header.
