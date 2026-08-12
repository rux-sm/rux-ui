# Button Components

Rux buttons separate visual emphasis from physical size. Start with
`.rux-button`, add one emphasis class such as `--default`, `--accent`, or
`--ghost`, then add a size role only when the surrounding component requires
one.

| Role | Class | Height | Icon | Use |
| --- | --- | ---: | ---: | --- |
| Standard | `.rux-button` | 32px | 20px | Forms, cards, toolbars, and ordinary actions |
| Header | `.rux-button--header` | 44px | 24px | Persistent workspace and card-header actions |
| UI header | `.rux-ui-header__button` | 44px | 24px | Global shell actions inside the 48px UI header |
| Compact | `.rux-button--compact` | 28px | 18px | Dense embedded actions such as trip bars |

Use `.rux-button--icon` to make any resolved size square. Icon-only buttons
must have an `aria-label`. Do not set `width`, `height`, or icon `font-size`
directly in feature styles when one of these roles applies.

```html
<button class="rux-button rux-button--accent">Save</button>

<button
  class="rux-button rux-button--ghost rux-button--icon rux-button--header"
  aria-label="Show Calendar Tools"
>
  <span class="rux-icon" aria-hidden="true">right_panel_open</span>
</button>

<button
  class="rux-button rux-button--on-accent rux-button--icon rux-button--compact"
  aria-label="Open Trip"
>
  <span class="rux-icon" aria-hidden="true">add</span>
</button>
```

On small touch layouts, application-specific rules may increase important
actions to the 44px mobile target without changing their desktop role.
