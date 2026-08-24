# Rux UI Foundations — Shell

**Contract version: 1.1.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 2 steps: **2 done**
Founding entry — a **promotion, not a rewrite**: this content governed as
`docs/layout-composition.md` since before the foundation set existed, carrying more MUSTs
than any foundation document and none of the machinery (`composition.md` D1). It moved here
whole; the old path is a pointer stub so every existing reference still resolves.

**Source: originated here.** Geist publishes no shell-assembly layer — the fourth
foundation this repository originates rather than adopts, after `layout.md`'s breakpoints,
`motion.md`, and `composition.md`. Where `composition.md` says **which anatomy a view
gets**, this document says **how the shell those views sit in is assembled** — containment,
ordering, and the ARIA relationships between its parts. Product-specific behavior such as
Calendar drawer resizing remains in the consuming application's layout CSS.

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

- `.rux-ui-header` MUST sit directly above the application body
  (`.rux-app__body`).
- `.rux-side-nav` MAY be attached inside the body or positioned by the
  consuming application as a header-controlled overlay.
- `.rux-app__body` MUST contain the panels + workspace row: directly in a
  single-view application, or as one `.rux-app-view` per routable view
  (paired with `rux-ui/js/view-router.js` and its `data-view` attribute;
  inactive views carry `hidden`). Whichever element forms that row MUST
  contain one center `.rux-workspace`.
- `.rux-app-shell` and its `__workspace`/`__panel` elements were the
  pre-2026-08 names for this composition. They were **removed 2026-08-22**
  once the vendored consumer migrated off them — see `portability-audit.md`
  entry 23. Markup still carrying them has no rule behind it.
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

- The header and its actions MUST use the shared header-control contract —
  `--rux-ui-header-height` and its action-size tokens. Individual children MUST
  NOT determine or enlarge the shell height. *(This bullet stated a literal
  `44px` until step 1 here: the token resolves 40px on desktop and 44px only in
  the ≤500px touch block, so the literal contradicted the desktop truth. The
  token is the home — `layout.md` §10 claims it, step 27 there.)*
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
- See [`../ui-header.md`](../ui-header.md) for the component contract and examples.

## Right Panel

Right panels expose secondary content without replacing the center workspace.

- A product-level panel, such as notifications or a workspace switcher, SHOULD
  be controlled by a global header action.
- A view-specific panel, such as Calendar Tools, SHOULD be controlled from that
  view's workspace header.
- A persistent view-specific panel SHARES one inset outer frame with its
  workspace: the frame belongs to `.rux-app-view` (`--rux-app-view-padding`
  and `--rux-app-view-radius`, configured once on the application shell), so
  spacing goes around the combined assembly—not between the panel and
  workspace—and only a separator or resize channel sits at their attached
  boundary. Do not duplicate that inset with workspace end padding or panel
  margin, and do not give one view its own frame: every view MUST use the
  shared one, so none can drift from the others.
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

## Cards, Sections, and Embeds

Cards are the second visual layer inside a panel or workspace. Use a card for a
distinct, titled unit of content rather than as a generic spacing wrapper.

```text
Card
├── Card Header               optional
├── Card Body
│   └── Card Section          titled group belonging to this card; flat,
│                              border-top only, shared with the next one
└── Card Footer               optional

Card Section
└── Card Embed                repeating list item — border, background,
    (0 or more)                and radius of its own, not shared with siblings
```

- Use `.rux-card__section` for a titled group of one card's own content — a
  flat divider, not a box. Sections stack with no gap; `.rux-card__section +
  .rux-card__section` supplies one shared `border-top` at each seam. Section
  headers remain in normal flow so the card shell scrolls and clips as one
  unit.
- Use `.rux-card__embed` for a repeating item nested inside a section or card
  body — an itinerary stop, a bus assignment, a payment row. Unlike a
  section, an embed has a real border, background, and radius of its own; use
  it when individual items in a list need their own visible boundary, not
  just a divider between named groups.
- Use a stack or grid when only spacing is needed, with no border or
  background implied by either component.
- Applications SHOULD avoid more than three simultaneously visible surface
  levels: panel/workspace, card, and card section or embed.
- Cards MUST NOT be nested merely to obtain padding or spacing.
- See [`../cards.md`](../cards.md) for the full component contract, tokens, and rationale.

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

Canonical: **[`foundations/layout.md` §9.1](layout.md) — the card rhythm**, and
**§9.2** for the dense, repeating-row exception. The space scale itself is **§7**.

Both sections used to live here, stating values and a MUST outside a foundation document
(layout.md D3). They moved wholesale in its step 6; this is a pointer and states no values,
per `CLAUDE.md`'s one-home rule.

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

Canonical for the layout half: **[`foundations/layout.md` §9.3](layout.md)** —
panels attached at wide widths, drawers at narrow ones, rails and drawer widths as
application variants. Which widths are narrow is **§1.1**'s, and it is the only place that
answers it.

Canonical for the accessibility half: **[`foundations/state.md`](state.md)
rules 2.7–2.10** — overlay drawer dismissal, dialog behaviour for modal drawers, and the two
resize-separator rules. They were dialog and assistive-technology behaviour rather than
layout, so `foundations/README.md` §1 routed them to `state.md` (R3, R7, R8), and that
document's **step 4** received them verbatim on 2026-08-22. **They are not restated here**,
which closes `layout.md` D3.

Panel and drawer transitions follow the shared [Productive Motion](../motion.md)
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
- Calendar-specific rail or minimum-width rules added to `.rux-app__body`
  or `.rux-app-view`.

See `../../examples/app-layout.html` for the smallest complete reference composition.

## Known defects

| # | Defect |
|---|---|
| D1 | **Fixed (step 2)** — the example carries the UI-header `<h1>` again, stated statically and agreeing with the nav item that carries `aria-current`; `tests/layout-contract.test.mjs` now asserts it, so the reference cannot lose its page heading silently a second time. ~~`../../examples/app-layout.html` no longer shows this document's own composition~~. |

## Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document — promote `docs/layout-composition.md` | **done · Class A** | **Executed 2026-08-23**, closing `composition.md` D1. A relocation of authority, not a change to it: every rule moved verbatim, and `tests/layout-contract.test.mjs` — which asserts against this content — moved its read path and nothing else, so the rules were enforced continuously through the move. **One correction rode along, because leaving it would have promoted a falsehood**: the header bullet stated a literal `44px` control contract, while `--rux-ui-header-height` resolves **40px** on desktop and 44px only in the ≤500px touch block — the same literal-beside-a-token drift step 7 of `composition.md` deleted from `../ui-header.md` the same day. The bullet now cites the token, and `layout.md` step 27 claims it in §10. **Links re-aimed for the new directory** (`layout.md`, `state.md`, `../motion.md`, `../ui-header.md`, `../cards.md`); the § Spacing and § Responsive pointers stay pointers, stating no values. **Deliberately not done**: no renumbering of the sections into the §1–§6 skeleton the younger foundations use — the headings are load-bearing for the enforcement suite's regexes, and a cosmetic renumber that risks silent test drift is a bad trade on a founding step. |
| 2 | Close D1 — the example regains its page `<h1>` | **done · Class A** | **Executed 2026-08-23.** One element: `<h1 class="rux-ui-header__title">Trips</h1>` between brand and actions, per `../ui-header.md`'s contract and `typography.md` §3.5 — the module name lives in the header, written by the router in the reference app and stated once in a static example. The label matches the nav item carrying `aria-current`, which the old file did not (it marked Trips current while titling nothing). **The fix is enforced, not just made**: the example-composition test now requires the h1, so the regression class that created D1 — removing a title's last wearer without noticing the example wore it — fails a named test instead of a protocol grep. Verified rendered: the title sets at heading-16 beside the brand, the nav toggle still operates, both themes probed. |

## Open questions

**Q1 — Does § Modal Headers belong here?** It is the one section about a *floating* surface
in a document otherwise about the attached shell, and it consumes `--rux-modal-*` tokens no
other section touches. It may want to live with a future overlays/modal component-tier
document instead. It stays for now because splitting on the founding step would make the
promotion a rewrite.
