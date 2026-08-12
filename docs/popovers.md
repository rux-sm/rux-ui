# Rux Popovers

Popovers disclose secondary content next to a trigger without replacing the
current workspace. `.rux-popover` owns positioning. Add
`.rux-popover--surface` when the popover needs the standard Rux outer container,
then compose its internal content with components such as `.rux-menu__item` or
`.rux-card__header`.

The shared surface owns:

- Background
- Foreground color
- Border
- Radius and clipping
- Shadow

These values come from the `--rux-popover-surface-*` tokens. Feature popovers
may set width and height, but must not redefine those outer visual properties.

## Header Tab-Tip Popovers

Use `.rux-popover--tab-tip` for popovers opened by a global action in the UI
header. The open 48px trigger is the visible tab and the popover body attaches
directly below it with no gap.

```html
<button
  class="rux-button rux-button--ghost rux-button--icon
    rux-ui-header__button rux-ui-header__button--popover"
  aria-haspopup="menu"
  aria-controls="account-menu"
  aria-expanded="false"
>
  <span class="rux-ui-header__disclosure-icons" aria-hidden="true">
    <span
      class="rux-icon rux-ui-header__disclosure-icon
        rux-ui-header__disclosure-icon--default"
    >person</span>
    <span
      class="rux-icon rux-ui-header__disclosure-icon
        rux-ui-header__disclosure-icon--close"
    >close</span>
  </span>
</button>

<div
  class="rux-menu rux-popover rux-popover--surface rux-popover--tab-tip"
  id="account-menu"
  role="menu"
  hidden
>
  ...
</div>
```

Placement rules:

- Use `bottom-end` for trailing header actions. The popover's ending edge is
  flush with the trigger's ending edge.
- Use `bottom-start` for actions near the leading edge.
- Do not add a second offset, arrow, or decorative gap.
- Keep connected header tab-tips shadowless. Elevation at the attachment edge
  makes the trigger and body read as separate surfaces.
- Swap the trigger's default content to the standard Close glyph while its
  popover is open.
- Keep the body inside the viewport through `RuxPopover.position()`.
- Only header-connected surfaces use the tab-tip variant. Context menus,
  combobox lists, emoji pickers, and point-positioned menus retain the normal
  popover gap.

## Semantics and Behavior

- Action lists use `role="menu"` and `RuxMenu` keyboard behavior.
- Interactive content such as Messages uses a non-modal `role="dialog"`, not
  menu roles on fields or content rows.
- Triggers expose `aria-haspopup`, `aria-controls`, and `aria-expanded`.
- A second trigger click, outside click, or Escape closes the popover and
  restores focus when appropriate.
- Opening one global header popover closes the previously open one.

Use `RuxPopover.createDisclosure(trigger, popover, options)` for interactive
non-menu surfaces. It provides trigger toggling, outside-click and Escape
dismissal, focus restoration, viewport repositioning, and coordination with
other Rux popovers. Continue using `RuxMenu.open()` for action menus.
