# Rux Application Layout

This document is the canonical composition contract for Rux applications. It
defines relationships between shared components; product-specific behavior
such as Calendar drawer resizing remains in the consuming application's layout
CSS.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required,
preferred, optional, and prohibited behavior.

## Application Anatomy

```text
App
├── UI Header
└── App Body                          structural gap: 0
    ├── Left Panel / Side Navigation  optional, header-controlled
    ├── Center Workspace              required
    └── Right Panel                   optional, header- or workspace-controlled
```

- `.rux-ui-header` MUST sit directly above the application body or
  `.rux-app-shell`.
- `.rux-side-nav` MAY be attached inside the shell or positioned by the
  consuming application as a header-controlled overlay.
- `.rux-app-shell` MUST contain one center `.rux-workspace`.
- Side `.rux-panel` elements MAY appear before or after the workspace.
- Panels and the workspace MUST be attached with no decorative gutter between
  them. A separator or resize hit target MAY occupy their shared boundary
  without creating a visible gap.
- The shared shell MUST NOT define product drawer widths, collapsed rails,
  feature breakpoints, or a workspace content minimum width.

## UI Header

The UI header owns global product identity and utilities. Product destinations
belong in its associated side navigation. It does not own view-specific
controls.

```text
UI Header
├── Menu                  optional, controls left panel
├── Brand / Name          optional
├── Header Navigation     optional
└── Global Actions        optional, trailing
    ├── Utilities
    ├── Identity
    └── Switcher          optional, controls product-level right panel
```

- The header MUST use the fixed `48px` shell contract. Its centered action
  buttons use the shared `44px` header-control contract; individual children
  MUST NOT determine or enlarge the shell height.
- At text zoom or narrow widths, optional navigation and utilities SHOULD
  collapse before they crowd the fixed shell.
- The menu, brand, navigation, and actions MUST remain in that order when
  present.
- A menu button MUST expose `aria-expanded` and `aria-controls` for its side
  navigation.
- Search belongs in utilities unless it is an application destination.
- The header MUST span the application width, MUST NOT have outer corner
  radii, and MUST attach directly to the shell below it.
- The canonical header remains visible at narrow widths. Optional utilities
  MAY collapse, but the menu, product identity, and essential actions MUST
  remain available.

## Side Navigation

Side navigation owns primary product destinations and is controlled by the UI
header menu button.

- Use a semantic `<nav>` with a descriptive `aria-label` and list markup.
- The active destination MUST expose `aria-current="page"` in addition to its
  visual state.
- Non-persistent navigation MUST support Escape and scrim dismissal, focus
  restoration, and close-on-destination behavior.
- Header-triggered navigation SHOULD overlay the application body without
  resizing the active workspace. Persistently visible navigation is a separate
  shell configuration and SHOULD NOT use the hamburger disclosure pattern.
- Application layout CSS owns navigation placement. The reusable component
  MUST NOT define product breakpoints or force a persistent configuration.
- See `docs/ui-header.md` for the component contract and examples.

## Right Panel

Right panels expose secondary content without replacing the center workspace.

- A product-level panel, such as notifications or a workspace switcher, SHOULD
  be controlled by a global header action.
- A view-specific panel, such as Calendar Tools, SHOULD be controlled from that
  view's workspace header.
- A persistent view-specific panel MAY share one inset outer frame with its
  workspace. In that pattern, apply spacing around the combined assembly—not
  between the panel and workspace—and use only a separator or resize handle at
  their attached boundary.
- A specialized canvas MAY instead be inset while its view-specific panel stays
  full-bleed. In that pattern, the resize channel owns the single visual gutter
  between them; do not duplicate it with workspace end padding or panel margin.
- The trigger MUST expose `aria-controls` and `aria-expanded`.
- Persistent attached panels MUST NOT use `role="dialog"`. A panel that becomes
  modal at a narrow breakpoint must implement complete modal focus and
  dismissal behavior.

## Workspace

The workspace is the primary view and occupies the flexible center of the app.

```text
Workspace
├── Workspace Header
└── Workspace Body
```

- `.rux-workspace__header` SHOULD identify the current view and hold view-level
  navigation, filters, and actions.
- `.rux-workspace__body` owns workspace scrolling unless a specialized child,
  such as the scheduler grid, explicitly owns it.
- The reusable workspace MUST use `min-width: 0` and MUST NOT impose a
  product-specific minimum width.
- Global navigation and account actions MUST NOT move into a workspace header.

## Panels

A panel MUST have an identifiable purpose, but `.rux-panel__header` is
optional. A panel may begin with one of three valid top-region patterns:

1. A title header.
2. Attached tabs.
3. A title header followed by attached tabs.

Use a header when the panel needs persistent identity, record context, status,
panel-wide actions, or a close control. Use attached tabs alone when their
labels clearly communicate the panel contents and no separate context is
needed. Do not add a redundant header merely to satisfy visual symmetry.

```html
<!-- Header -->
<aside class="rux-panel" aria-labelledby="panel-title">
  <header class="rux-panel__header">
    <h2 class="rux-panel__title" id="panel-title">Trip Editor</h2>
  </header>
  <div class="rux-panel__body">...</div>
</aside>

<!-- Attached tabs -->
<aside class="rux-panel" aria-label="Trip Editor">
  <div class="rux-panel__nav">
    <nav class="rux-tabs rux-tabs--attached" aria-label="Trip Editor Sections">
      ...
    </nav>
  </div>
  <div class="rux-panel__body">...</div>
</aside>
```

- Every panel MUST have an accessible name through `aria-labelledby` or
  `aria-label`.
- Tabs-only panels MUST give the tab list its own descriptive label.
- `.rux-panel__body` owns panel scrolling. Headers, navigation, and footers
  remain fixed within the panel.
- Cards MUST be placed in `.rux-panel__pane`, not directly in the scrolling
  body.
- Persistent desktop side panels SHOULD use `<aside>` semantics. They MUST NOT
  use `role="dialog"` unless they actually provide dialog focus and dismissal
  behavior in the state where that role is exposed.

## Cards and Card Sections

Cards are the second visual layer inside a panel or workspace. Use a card for a
distinct, titled unit of content rather than as a generic spacing wrapper.

```text
Card
├── Card Header               optional
├── Card Body
│   └── Card Section          only when another bordered layer is needed
└── Card Footer               optional
```

- Use `.rux-card__section` for divided regions belonging to one card.
- Use `.rux-card-section` for a nested bordered group with optional header and
  body anatomy.
- Use a stack or grid when only spacing is needed.
- Applications SHOULD avoid more than three simultaneously visible surface
  levels: panel/workspace, card, and card section.
- Cards MUST NOT be nested merely to obtain padding or spacing.

## Modal Headers

Modal headers use a compact Carbon-like title/action composition. The header
frame and its trailing icon action are both `--rux-modal-header-height` high.
The title begins at the standard `--rux-space-4` inset, while the icon action
is anchored independently to the top-right corner so title typography cannot
move or resize it.

- Use `.rux-modal__title` for the modal's accessible heading.
- Place one `.rux-button--icon` directly inside `.rux-modal__header` when the
  dialog has a close action.
- Keep the standard header fixed to `--rux-modal-header-height`.
- A header containing secondary copy MAY expand to `height: auto`, but MUST
  preserve the header minimum height and the independently anchored action.
- Do not reproduce the modal's absolute action placement in ordinary card
  headers. Card headers may contain several actions and retain flexible layout.

## Spacing

Rux uses a `16px` visual content rhythm through `--rux-space-4`. This describes
relationships, not unconditional padding on every edge.

| Relationship | Contract |
| --- | --- |
| UI header to app shell | `0` |
| Panel to workspace | `0` |
| Panel pane content inset | `16px`, adjusted when attached navigation owns the top seam |
| Sibling cards in a pane | `16px` |
| Card header inset | `16px` |
| Headered card body | `0 16px 16px` |
| Headerless card body | `16px` on all sides |
| Content rows inside a stacked card body | `16px` |
| Card-section regions | same visual rhythm as cards |

Agents MUST use the component tokens instead of hardcoded `16px` values. A
header's bottom padding and a following body's top padding must not accidentally
combine into a `32px` seam.

## Scrolling

```text
App                         no page scrolling
App Shell                   no scrolling
Panel Shell                 no scrolling
Panel Body                  scrolls
Panel Header/Nav/Footer     fixed within panel
Workspace Shell             no scrolling
Workspace Body              scrolls
Card                        normally grows; no nested scrolling
```

A specialized component MAY own scrolling when documented. Avoid assigning
`overflow: auto` to several ancestors in the same axis.

## Responsive Behavior

- Wide layouts SHOULD keep panels attached beside the workspace.
- At narrow widths, panels MAY become overlay drawers or move into the normal
  content flow.
- Overlay drawers MUST support Escape dismissal, focus restoration, an
  accessible name, and an operable close control.
- Modal drawers MUST implement complete dialog behavior. Non-modal drawers
  SHOULD remain complementary `<aside>` regions.
- Resize separators MUST be keyboard operable and expose orientation, current
  value, minimum, maximum, and the controlled panel.
- A resize separator MUST be visible and operable only while its controlled
  panel is open. It MUST NOT double as the panel disclosure control.
- Collapsed rails and drawer widths are application variants, not base-shell
  defaults. Interactive rail controls SHOULD provide conventional touch target
  sizes.

Panel and drawer transitions follow the shared [Productive Motion](motion.md)
contract. Layout implementations should consume the `--rux-panel-*` motion
tokens rather than defining their own duration or easing values.

## Action Placement

| Action scope | Location |
| --- | --- |
| Global destination | Side navigation |
| Global utility or identity | UI header |
| Personal application preference | Profile menu → Preferences |
| Current view navigation, filter, or action | Workspace header |
| Panel identity or panel-wide action | Panel header/top region or footer |
| Tab selection | Panel navigation |
| One content group's action | Card header or footer |
| One field's state or action | Beside that field |

## Invalid Compositions

- A centered floating workspace with decorative gaps to side panels.
- A UI header nested inside a workspace.
- Cards placed directly inside `.rux-panel__body` without a pane.
- An empty panel header added only because another panel has one.
- Panel-wide actions hidden inside one tab's card.
- Multiple nested cards used only to create indentation.
- Calendar-specific rail or minimum-width rules added to `.rux-app-shell`.

See `examples/app-layout.html` for the smallest complete reference composition.
