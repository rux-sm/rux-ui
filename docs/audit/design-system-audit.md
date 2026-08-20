# Rux UI Design-System Audit

**Date:** 2026-08-19 · **Scope:** design-system focused — tokens (`rux-ui/css/tokens.css`),
base components (`rux-ui/css/base/`), behaviors (`rux-ui/js/`), app-layer consumption
(`scheduler/css/`, component usage in `index.html`/`js/`), naming, and component-level
accessibility. Out of scope by agreement: domain modeling, `js/data/` flow, `index.html`
inline-script hygiene.

**Method:** two deep exploration passes (component contracts; naming/tokens), 20+ findings
spot-verified at the cited line before inclusion, headline counts re-run independently.
Baseline: **256/256 tests green** on `main` at audit time. Findings are tagged
**[Ledger §n]** when `docs/portability-audit.md` already records or adjudicates them, and
**[New]** otherwise.

---

## 1. Verdict

This system has unusually strong bones: an enforced four-tier boundary with **empty**
accepted-violation lists, **zero functional raw color literals in the entire CSS codebase**
(the single grep hit is inside a comment), 256 contract tests, and decision documents most
teams never write. The biggest problem is that **there is no single component contract**:
the ten behavior modules use five initialization patterns, four state-expression
mechanisms, two configuration prefixes, and two eventing styles, and the CSS already hedges
against the drift with double selectors. Second is a real accessibility hole: `form.css`
restyles every control with zero focus rules, no component traps focus (one claims to),
and the suggestions listbox is mouse-only. The naming defects are numerous but shallow —
synonym modifiers, one broken BEM block, a handful of ghost classes — and most are
mechanically fixable. Fix the state/dismiss contract and the focus story, and this reads
like one author on one day.

---

## 2. Scorecard

| Area | Rating | One line |
|---|---|---|
| A. Tier boundaries & structure | **Solid** | Enforced by `tests/portability-boundary.test.mjs`; all three `ACCEPTED` lists empty; vendoring verified against real consumers |
| B. Naming | **Needs work** | BEM shape is enforced and clean; modifier vocabulary, state classes, and utility prefixes each have live synonyms |
| C. Design tokens | **Needs work** | Exceptional color/namespace discipline; but two parallel vocabularies ×3, group-pattern deviants, and light-theme gaps that are functional bugs |
| D. Component API consistency | **Needs work** (borderline Broken for overlays) | Five init patterns, duplicated dismiss plumbing, dead state written at runtime, asymmetric open/close |
| G. Component-level a11y | **Broken** | Zero focus styles in `form.css`; no focus trap anywhere; mouse-only suggestions; drawer has no Escape |
| H. Hygiene | **Needs work** | Ghost classes, stale in-code comments, doc/number drift; `!important` and color discipline are excellent |

(E. Domain modeling and F. State/data flow were out of scope per the agreed focus.)

---

## 3. Findings

### A. Tier boundaries & file structure — Solid

**A1. The boundary is real, enforced, and clean.** [Ledger §7 steps 2, 14]
`tests/portability-boundary.test.mjs:37,43,48` — `ACCEPTED_APP_SELECTORS`,
`ACCEPTED_DOMAIN_TOKENS`, `ACCEPTED_DOMAIN_SELECTORS` are all empty sets. `rux-ui/` names
no application concept; the app invents no `.rux-*` blocks. `scheduler/css/tokens.css`
never shadows a portable token and documents why one token deliberately stays off `:root`
(`scheduler/css/tokens.css:122-126`). **This is the pattern to protect** — the remediation
plan below routes every rename through this same ledger-plus-test mechanism.

**A2. Behavior modules and base CSS are 1:1 where a module exists — but six interactive
CSS contracts have no module.** Severity: **Medium** · [New]
`table.css:111,126,155,161` defines `.is-selected` / `.is-filtered` / `.is-sort-asc|desc`
plus `[data-sort]` / `[data-col-filter]` hooks (`table.css:117-162`) with no shared
behavior; every consumer reimplements sort state. Same shape: `notifications.css:40,87`,
`preferences.css:75`, `profile-picker.css:79`, `content.css:79,86`.
**Why it hurts:** the CSS promises a component the JS doesn't deliver, so consumers write
divergent implementations of the same interaction.
**Fix:** either ship the behavior (a `table.js` sort/filter controller is the
highest-value candidate) or mark these contracts "CSS-only; app supplies behavior" in the
file header so the promise is explicit.

**A3. Mixed `defer` in one script block.** Severity: **Low** · [New]
`index.html:7374` loads `controls.js` with `defer` while its siblings
(`index.html:7362-7378`) load without it, silently reordering execution relative to
source order. **Fix:** one loading strategy for the whole rux-ui block.

### B. Naming — Needs work

**B1. Modifier synonyms: the same semantic role has 2–4 names.** Severity: **High** · [New]
The core naming-system defect. Verified table:

| Semantic role | Names in use | Where |
|---|---|---|
| Full width / stretch | `--block` · `--fill` · `--even` | button `controls.css:365` · tabs `navigation.css:67` · segmented `controls.css:603` |
| Small / large size | `--sm` / `--lg` · `--compact` / `--header` | avatar `content.css:38-39` · button `controls.css:394,422` |
| Remove the chrome | `--ghost` · `--borderless` | button/stepper (23×) · card `card.css:62` |
| Add a fill/box | `--solid` · `--boxed` | badge `badges.css:75` · card `card.css:38` (0 consumers), output |
| Collapses when narrow | `--responsive` · `--optional` | tabs · `ui-header.css:274` |
| Vertical layout | `--stack` · `--stacked` | card body `card.css:66` · `preferences.css:89` |
| Primary emphasis | `--accent` (CSS) vs "Primary" (docs) | `controls.css:150` vs `docs/buttons.md:58` |

**Why it hurts:** every new component author must guess, and each guess compounds; a
consumer can't predict an API they've already learned once.
**Fix:** one canonical name per role (recommendations in §4 glossary), executed as a
ledger-recorded rename program with the grep discipline `CLAUDE.md` requires.

**B2. Four state-expression mechanisms, two of them dead-on-arrival.** Severity: **High** · [New]
Verified: `[hidden]` (menu/popover/suggestions/modal — `menu.js:11`, `popover.js:153`,
`feedback.css:60`), `.is-*` (drawer/side-nav — `drawer.css:36`, `side-nav.css:165`),
aria-only (segmented — `controls.js:47`), and BEM `--hidden`/`--loading`
(`content.css:79`, `controls.css:320`). Two states are written at runtime and read by
nothing: `controls.js:221` toggles `.is-active` on toggle buttons but `controls.css`
contains **zero** `.is-` selectors (verified); `utilities.js:83` sets `data-rux-open="1"`
that no stylesheet reads. The CSS hedges: `.rux-tab.is-active, .rux-tab[aria-selected="true"]`
appears in **8 selector lists** (`navigation.css:130-131,172-173,219,225,237-238,293-294`);
same pattern at `side-nav.css:76-77`.
**Why it hurts:** double selectors are the compiler warning of contract drift — each one
is a place where CSS stopped trusting JS. Dead writes teach readers a contract that
doesn't exist.
**Fix:** rule R3 in §5 (aria-first); delete the two dead writes (2-line change, zero risk —
verified no readers); collapse the double selectors once JS is confirmed as the single writer.

**B3. `.rux-notifications` is a BEM block that doesn't exist.** Severity: **Medium** · [New]
`notifications.css:9` defines root `.rux-notifications-menu`; all eight element classes are
`.rux-notifications__*` (`notifications.css:15,23,30,44,57,62,69,81` — verified). The split
originated when `docs/portability-audit.md` §4.2 listed them as two units
("`.rux-notifications`, `-menu`").
**Fix:** pick one block name (recommend `.rux-notifications`, with `-menu` becoming
`.rux-notifications--menu` or an element) — ledger-recorded rename.

**B4. Ghost classes: used and/or documented, defined nowhere.** Severity: **High** · [New]
- `.rux-button__label` — used **83×** in `index.html`, in 9 JS files, canonical example in
  `docs/buttons.md:75`; **no base stylesheet defines it**. Three app files style it only as
  a descendant (`scheduler-app.css:927`, `itinerary.css:110`, `trip-history.css:47`). It
  works because unstyled spans lay out fine — an implicit public contract.
- `.rux-resize-gutter--right` — 3 uses in `index.html`, defined in **no CSS and no JS**
  (verified both).
- `.rux-role--danger|warning|success` — emitted by `js/panels/trip-panel.js:79-81,83` and
  `js/data/trip-db.js`, matched by **no CSS rule** (only `--pending-assignment`,
  `--pending-response`, `--confirmed`, `--declined` exist, `trip-panel.css:714-717`).
  Doubly wrong: an app state vocabulary squatting the reserved `rux-` prefix — the one
  class family `tests/portability-boundary.test.mjs` can't see because it's born in JS.
- `.rux-row` / `.rux-spacer` — used in `index.html:4484,4488`, defined nowhere.
**Why it hurts:** the test suite's known blind spot (CLAUDE.md: HTML class attributes and
JS selectors aren't covered) is exactly where these live; each one is a landmine for the
next rename.
**Fix:** give `.rux-button__label` a real (even empty-on-purpose, commented) rule in
`controls.css`; delete or define the other four; add the class-resolution test proposed
in §5 so the category can't regrow.

**B5. Utility prefix: `rux-u-*` is the documented convention, six legacy bare names
remain — and the legacy is winning.** Severity: **Medium** · [Ledger §4.4 step 3 — partially; the stall is New]
The contract is explicit (`docs/cards.md:224-228`) and nine `rux-u-*` utilities honor it.
But `utils.css:81,88` defines `.rux-cluster` and `.rux-stack` bare *inside the utilities
file*; `colors_and_type.css:203-205` defines `.rux-mono`, `.rux-muted`, `.rux-subtle` —
and `.rux-muted`/`.rux-subtle` are **byte-identical duplicates** (both
`color: var(--rux-text-secondary)`). Usage: `.rux-subtle` has 18 hits in `js/` (the newest
code); `.rux-muted` and `.rux-stack` have **zero** anywhere.
Also: `docs/portability-audit.md:260` still proposes renaming `.rux-u-trip-list` →
`.rux-u-stack`, but the class is now `.rux-u-record-list` (`utils.css:96`) and `.rux-stack`
already occupies the proposed name — the ledger row is stale.
**Fix:** delete the two zero-use classes; keep one of muted/subtle and alias-then-migrate
the other; decide whether layout primitives (`cluster`/`stack`) are utilities (`rux-u-*`)
or components (bare) and apply it to both; correct the ledger row.

**B6. App prefix sprawl: 13 non-`sched` prefixes across 10 of 33 feature files.**
Severity: **Medium** · [Ledger §3 — the rule; the violations are New]
`sched-`/`sched-scope-` is the documented norm and 20 files are clean, but
`comp-driver-app.css`/`driver-share.css` use `driver-*` (121 occurrences) and
`assignment-*` (28), `flip-seven.css` uses `flip-seven` (114), plus `components-app`,
`settings-app`, `fleet-app`, `trips-app`, `trip-request`, `maintenance-*`,
`documents-app`, `calendar-app`, `req-`.
**Why it hurts:** §3's "prefix is truth" decision was paid for once at ~2,400 renames;
these files dilute the signal it bought.
**Fix:** mechanical rename to `sched-*`, one file per commit, ledger-recorded. The
`@keyframes rux-pull-hint-pulse` at `scheduler-app.css:1051` goes with it (`sched-` prefix
like its siblings).

**B7. `data-*` attribute prefix split ~50/50 in the portable layer.** Severity: **Medium** · [New]
Prefixed: `data-rux-toggle|tabs|side-nav|dismiss|modal|…`. Unprefixed and public:
`data-placement` (written `popover.js:20`, matched by `menu.css:30-42` and
`popover.css:56-76`), `data-view*` (`view-router.js:71,115-117`), `data-suggestion-idx`
(`suggestions.js:111`), `data-panel-toggle-icon` (`drawer.js:278`), `data-value`
(`controls.js:37`). One selector mixes both conventions: `feedback.css:117,120` —
`[data-tooltip]:not([data-rux-tooltip="floating"])`. And `[data-dismiss]`
(`notifications.css:87`) coexists with `[data-rux-dismiss]` (`utilities.js:153`) — two
dismiss attributes for two components. `--drawer-width` / `--drawer-open-width`
(`drawer.css:37,67`, `drawer.js:292-297`) and `--mobile-drawer-translate-x`
(`drawer.css:218,227`) are the only unprefixed custom properties in the portable layer;
`--_rux-*` (menu, ui-header, controls) is a third private-name convention beside `--_*`.
**Fix:** rule R4 in §5; renames are breaking (vendored consumers) so alias-then-migrate.

**B8. Event naming is consistent in shape, inconsistent in tense; eventing itself is
split with callbacks.** Severity: **Low** (naming) / rolled into D3 (structure) · [New]
All five events are `rux:<noun>-<verb>` — good — but `rux:accent-changed` (past,
`utilities.js:125`) vs `rux:segment-change` (present, `controls.js:52`). Dispatch targets
vary: `documentElement` / `document` / element-with-bubbles / element-without-bubbles
(`menu.js:14` — observable only by a listener on that exact node).

### C. Design tokens — Needs work

**C1. Light theme is functionally broken for specific tokens.** Severity: **Critical** · [New]
Only 55 of 728 `:root` declarations are overridden in `[data-theme="light"]`
(`tokens.css:1451-1564`, count verified). Fine for `oklch(from …)` relative tokens — but
these are **absolute** with no override:
- `--rux-input-bg-disabled: oklch(from var(--rux-neutral) 21.5% c h)` (`tokens.css:199`) →
  feeds `--rux-input-disabled-bg:827` → `--rux-switch-disabled-bg:1100`,
  `--rux-checkbox-disabled-bg:1166`. **Near-black disabled fields, switches, and
  checkboxes in light theme.**
- `--rux-thumb-bg` fixed at L90% (`tokens.css:240`) → both switch thumb states
  (`tokens.css:1086,1095`): near-white thumb on a light track.
- `--rux-tag-purple` / `--rux-tag-default` fixed at L90% (`tokens.css:318-319`) → consumed
  by `--sched-itinerary-status-sleeper/-stop` (`scheduler/css/tokens.css:73-74`).
- `--rux-shadow-rim-color`'s light override is **commented out** (`tokens.css:1552`).
**Why it hurts:** these are user-visible rendering bugs, not style debt, and the skill
mandates both themes ("new work must remain usable in both").
**Fix:** S-effort token edits + visual check per the `verify` skill (light+dark, narrow+wide).

**C2. Two parallel live vocabularies, three times over.** Severity: **High** · [New]
- **Motion:** `--rux-motion-duration-*`/`--rux-motion-easing-*` (`tokens.css:164-171`) vs
  legacy `--rux-duration-*`/`--rux-ease-*` (`tokens.css:176-183`). The comment calls the
  second set compatibility, but component tokens mostly read the *legacy* set; the explicit
  bridge `--rux-duration-productive:179` has zero consumers, as does
  `--rux-motion-duration-moderate-02:167` — which `docs/motion.md:17` documents as a
  foundation role.
- **Interaction state:** `--rux-bg-hover`/`--rux-bg-active` (opaque, `tokens.css:217-218`)
  vs `--rux-state-*-overlay` (translucent, `tokens.css:230-232`) — both consumed
  (`tokens.css:536,1286` vs `897,1155`).
- **Word order:** `--rux-input-bg-disabled:199` aliased by `--rux-input-disabled-bg:827` —
  same value, both live.
**Fix:** pick one per pair (recommendations in §4); keep the loser as a documented alias
until vendored consumers sync, then remove via ledger.

**C3. Group-pattern deviants inside tokens.css.** Severity: **Medium** · [New]
- Font size is `--rux-size-*` (`tokens.css:53-61`, verified) under a "TYPOGRAPHY · font
  size" header while family is `--rux-font-*` — and `--rux-size-*` collides conceptually
  with physical sizes (`--rux-avatar-sm`, `--rux-icon-sm`).
- Weights are numeric (`--rux-weight-500`) where every other scale is named; six of nine
  rungs unused (ladder-completeness keeps them per step 16's policy — the *naming* is the
  finding, not the existence).
- The app-wide border ladder is named after one component: `--rux-card-border/-hover/-active`
  (`tokens.css:206-208`; the comment at 202-204 admits it's global).
- `--rux-text-*` means two things: colors (`-primary/-secondary/-disabled`) and type roles
  (`-body-*/-caption-*`) (`tokens.css:252-412`); headings/labels use two more prefixes for
  the same five-axis role system.
- Z-index component token reverses word order: `--rux-popover-z-index` (`tokens.css:1348`)
  vs the `--rux-z-*` ladder (`tokens.css:457-461`).
**Fix:** rename program candidates (ledger); low urgency individually, but they're the
template new tokens copy.

**C4. Tokens invented at the rule, and one read-but-never-defined.** Severity: **Medium** · [New]
`panel.css:325` (`--rux-panel-safe-margin`), `panel.css:361-362`
(`--rux-panel-mobile-inset-inline/-block`) exist nowhere in `tokens.css`. `panel.css:331`
*reads* `--rux-panel-floating-safe-max-width` (with fallback), whose only declarations are
app-side (`doc-viewer.css:57`, `trip-envelope.css:29`) — a portable contract defined only
by its consumers. `--rux-space-0-5` is used-but-undefined (already self-documented at
`notifications.css:70`).
**Fix:** declare all four in `tokens.css` where they belong; `tests/tokens-contract` can
then police "portable rules only read tokens tokens.css declares" mechanically.

**C5. The five-axis type-role contract is half-wired.** Severity: **Medium** · [New]
`tokens.css:373-377` promises size/line-height/weight/tracking/color per role, but the
weight/tracking/color axes of body, caption, heading-page, label-control, and
label-eyebrow are declared and never read (9 of the ~16 unadjudicated orphans in my
independent count; step 16's deliberate keeps excluded). Docs reference at least one
(`docs/ui-header.md:186-188` documents `--rux-side-nav-shadow` as the elevation hook;
no rule applies it — a kept token whose *documentation* overpromises).
**Fix:** wire the axes into the role classes/components or shrink the contract comment to
what's real.

**C6. No breakpoint tokens; ~16 distinct viewport literals.** Severity: **Low** · [New]
`500px` appears in `tokens.css:1574` and 6× in `scheduler/css`; rux-ui also uses
`580/620/760`; the app adds `359/420/479/480/501/560/640/700/720`. Custom properties
can't parameterize media queries in plain CSS, so the honest fix is a **documented
canonical set** (e.g. 500/760/1080) in `tokens.css`'s header plus a contract test
asserting only approved literals appear in `@media` across both layers.

**C7. Hardcoded-value census (verified counts).** Severity: **Low–Medium** · [New]
- Raw `#hex`/`rgb()`/`hsl()`: **0 functional occurrences in all CSS** (1 comment hit,
  `tokens.css:227`); 3 in `index.html:12-17` theme-color metadata (legitimate).
- Raw `oklch()` app-side: 35 — of which 26 are the `--print-*` palette
  (`print-schedule.css:16-41`) and 9 the `--env-*` paper palette (`trip-envelope.css`) —
  both deliberately theme-independent print contexts, but un-namespaced and undocumented
  as exceptions (four bare custom-property families: `--print-*`, `--env-*`,
  `--maintenance-*`, `--components-app-*`).
- `px` literals: **322 in `scheduler/css`** (~46 spacing/radius; print-schedule alone holds
  half), **80 in portable CSS** (only 4 spacing/radius — the rest is geometry; fine).
- `!important`: 32 total, all but 3 in `@media print` or reduced-motion blocks
  (offenders: `flip-seven.css:206`, `comp-components-app.css:119`, `trip-bar.css:1333`).
- Literal `z-index`: portable-layer literals are local stacking contexts (0–3) **except**
  `content.css:65` — `.rux-splash` at `z-index: 9999`, the one value above the entire
  `--rux-z-*` ladder (deliberate boot screen; should still be `--rux-z-splash` so the
  ladder stays the single authority).
- The toast host: `utilities.js:30-39` inlines 12 lines of `cssText` (16px, 8px,
  `z-index:500`) and `utilities.js:53-73` animates with literal 220ms/cubic-beziers —
  **the only token-violating behavior module** (verified). Fix: a `.rux-toast-host` class
  in `feedback.css` + motion tokens.

### D. Component API consistency — Needs work (overlays borderline Broken)

**D1. Five initialization patterns across ten modules.** Severity: **High** · [New]
Explicit factory (`drawer`, `popover`, `suggestions`, `floating-window`, `view-router`) ·
DCL declarative scan (`controls`, `theme`) · parse-time self-instantiation
(`ui-shell.js:75` — verified `window.RuxUiShell.sideNav = init()` at parse time, silently
`null` if markup loads later) · immediate side-effect (`utilities.js:171-173` mutates every
form control in the DOM at load) · hybrid (`menu`). Global surface is equally split:
`window.Rux` is **co-owned** by `utilities.js:169` and `controls.js:275-299`; everything
else gets its own `Rux*` global; `theme.js` exposes **nothing** (no programmatic theme
set, and it's the only ID-coupled module — `#theme-toggle`, `theme.js:24`).
`menu.js:30,42` calls `window.RuxPopover.*` unguarded — load order is enforced by nothing.
**Fix:** one registration idiom (recommend: every module exposes `Rux.<name>` with an
explicit `init(root)`, and a single `rux-ui/js/index` boot that owns DCL and order); the
guard for `menu→popover` is a 1-line stopgap.

**D2. The overlay family reimplements its plumbing 3–5 times.** Severity: **High** · [New]
Verified duplications: outside-click dismiss ×3 (`menu.js:46-49`, `popover.js:174-178` —
structurally identical; `suggestions.js:81-86` on `mousedown`/bubble instead, so blur
ordering differs for the same gesture); Escape ×5 (`menu.js:55-57`, `popover.js:180-191`,
`suggestions.js:87-89` — listener never removed, `ui-shell.js:56-61`,
`utilities.js:87-91`) where only 2 of 5 `preventDefault()` and `popover.js:183-191` needs
a documented `queueMicrotask`+`defaultPrevented` workaround for the inconsistency; two
active-overlay singletons (`menu.js:4`, `popover.js:3`) kept in sync by a private
`rux:popover-open` protocol (`menu.js:22,77` ↔ `popover.js:134,193`) that exists only
because there are two singletons; the auto-id+ARIA idiom copy-pasted (`menu.js:25-28` ≡
`popover.js:98-100`, verified — same `slice(2, 9)`); the modal-layer promotion selector
`".rux-modal-backdrop, .rux-panel--floating"` verbatim ×3 (`popover.js:30-33`,
`suggestions.js:104-106`, `js/components/itinerary.js:1725`); and suggestions reimplements
popover's positioning with hardcoded `margin = 8` / `+4` (`suggestions.js:58,61`) where
popover reads `--rux-popover-offset`/`--rux-popover-viewport-padding` (`popover.js:35-36`).
Meanwhile `Rux.openModal` (`utilities.js:79-92`) is a fourth overlay implementation with
none of the shared machinery — and the app mostly bypasses it, hand-rolling
`.rux-modal-backdrop` in `js/panels/contact-info-modal.js:10`,
`js/panels/driver-week-info.js:779`, `js/data/trip-db.js:1523`, and using native
`<dialog>` in `driver.html:52`.
**What's genuinely fine:** `drawer` vs `floating-window` are truly different mechanisms;
menu-vs-popover *focus semantics* (roving vs natural tab order) is a real, documented
distinction (`popover.js:92-95`) worth keeping.
**Fix:** one dismiss manager (single singleton, one outside-pointerdown, one Escape with
one `preventDefault` policy, one auto-id helper, one layer-promotion helper) that menu,
popover, suggestions, and modal all register with. This deletes the `rux:popover-open`
protocol outright.

**D3. Open/close is asymmetric, and observation is split events-vs-callbacks.**
Severity: **Medium** · [New]
`popover.js:11-15` — `measure()` sets `popover.hidden = false` (verified); neither
`menu.js:19-36` nor `popover.js:128-149` ever unhides explicitly, so **showing is a side
effect of positioning** while both `close()` paths set `hidden` explicitly;
`RuxPopover.position()` is not a safe pure reposition. Half the modules broadcast events,
half use constructor callbacks (`onOpen/onClose/onChange/onSelect`) for identical
semantics, so nothing outside the constructing call site can observe a drawer or router
change.
**Fix:** `open()` owns unhide; standard rule: callbacks for the owner, plus a bubbling
past-tense `rux:<block>-<verb>ed` event on the element for everyone else.

**D4. Segmented control spans four name families.** Severity: **Medium** · [New]
Container `.rux-segmented-track` (`controls.css:482`), indicator
`.rux-segmented__indicator` (`controls.css:496` — the only member of a `rux-segmented`
block that doesn't otherwise exist), items as `.rux-button--segment`, and tokens split
`--rux-segmented-track-*` / `--rux-segment-indicator-*` / `--rux-segment-*`
(`tokens.css:1004-1031`). Tabs tokens have the same disease: the same object is
`--rux-tab-*` in one variant and `--rux-tabs-attached-tab-*` in another
(`tokens.css:1374-1429`), with `--rux-tabs-gap` declared mid-`--rux-tab-*` run (1378).
**Fix:** one block per component; indicator → `.rux-segmented-track__indicator`;
regularize the token prefixes in the same ledger step.

**D5. Docs and code disagree on the numbers.** Severity: **High** · [New]
The component docs are good enough that people will trust them — which is why the drift
matters. Verified against `tokens.css`:

| Doc claim | Built | Where |
|---|---|---|
| Header 44px / icon 24px / hit 44×44 / radius 0 (`docs/ui-header.md:148-154,277-279`) | **40px / 22px / 40 / 4px** (`tokens.css:489,983,120,883→128`) — the doc presents the ≤500px mobile values (`tokens.css:1576-1578`) as the desktop contract | all four figures |
| Header icon 24px, compact icon 16px, compact pad 6px (`docs/buttons.md:21-22,29-30`) | 22px / 18px / 4px (`tokens.css:984,992,994`) | three breaks |
| "open 48px trigger" (`docs/popovers.md:23`) | 48px exists nowhere in the system | — |
| No z-index overrides on popovers (`docs/popovers.md:84-89`) | violated by the reference app: `scheduler-app.css:96`, `itinerary.css:763` | — |
| No hardcoded durations/easings (`docs/motion.md:7-8`) | violated 5×: `controls.css:339` (700ms), `controls.css:359` (1.4s), `trip-panel.css:116`, `scheduler-app.css:1048`, `driver-panel.css:116` | — |
| Stale comments in code itself | `controls.css:393` "compact (28px)" (token: 24px), `controls.css:421` "44px/24px" (tokens: 40/22); `tokens.css:637-638` claims `--modal`/`--anchored` are read by no rule — `panel.css:385,399` reads them | — |
| `docs/trip-bar.md:14,265-266` scoped `--rux-icon-md` mechanism | replaced by `--sched-trip-bar-icon-size` (`trip-bar.css:123,245`) | — |

**Where docs are honest, say so:** `docs/cards.md:200-204` ("not yet migrated") and `:155`
("no consumer yet") are accurate; the ui-header motion choreography matches token-for-token
(`docs/ui-header.md:195-204` ≡ `tokens.css:544-552`); `docs/buttons.md:112-113`'s
"aria-pressed, never `.is-active` on buttons" is fully honored in markup (0 hits) — which
makes `controls.js:221` writing `.is-active` a violation of the project's *own* documented
rule.
**Fix:** one doc-sync pass (S, mechanical); then keep numbers out of prose where a token
name can be cited instead.

**D6. Card vs panel: the distinction is real and respected.** **Strength** · [Ledger §4.5]
`docs/cards.md:140-185`'s surface-0/surface-1 rule is backed by tokens
(`tokens.css:641,675,686,663` vs `772`) and usage ratios follow it. `--modal`/`--anchored`
panel variants ship unused — accurately documented as not-yet-migrated. This is what a
maintained contract looks like; use it as the template for the overlay work.

### G. Component-level accessibility — Broken

**G1. `form.css` has zero focus rules.** Severity: **Critical** · [New]
Verified: the only "focus" match in 809 lines is a comment (`form.css:784`). The file
restyles inputs, selects, textareas, switches, checkboxes, sliders, color controls —
custom borders and backgrounds — while relying on UA default outlines that frequently
read wrong against the custom surfaces. `:focus-visible` exists in only **3 of 22** base
files (`controls.css:69`, `navigation.css:116,219,225`, `side-nav.css:71`; `ui-header.css:316`
is a `:focus` skip-link rule). `menu.css`, `popover.css`, `suggestions.css`, `drawer.css`
(whose splitter is keyboard-operable, `drawer.js:417-441`, with `aria-valuenow` and no
visible ring), `panel.css`, `table.css`, `feedback.css`: zero focus styles.
**Fix:** a system-wide `:focus-visible` pass keyed to `--rux-accent-ring`
(the token exists); highest-leverage single a11y change available.

**G2. No component traps focus; one claims to.** Severity: **High** · [New]
`utilities.js:84` comments "Trap initial focus" — verified: it focuses one element
(`utilities.js:85-86`, and the selector returns the first DOM-order match, not
`[autofocus]` preferentially) and never traps Tab, never restores focus on close, sets no
`role="dialog"`/`aria-modal`. Drawer and side nav don't trap either (side nav at least
restores, `ui-shell.js:36`).
**Fix:** one small trap/restore helper in the unified dismiss manager (D2); wire modal,
drawer-scrim mode, and side-nav overlay to it.

**G3. Suggestions is mouse-only.** Severity: **High** · [New]
Verified zero hits for `ArrowDown|ArrowUp|aria-activedescendant|aria-expanded` in
`suggestions.js`. A `role="listbox"`/`role="option"` (`suggestions.js:70,111`) that
keyboard users cannot reach, on the search-as-you-type input.
**Fix:** ArrowDown/ArrowUp/Enter + `aria-activedescendant` + `aria-expanded`/`aria-controls`
on the input — the standard combobox pattern, scoped minimally.

**G4. Drawer has no Escape; disabled semantics are half-implemented twice.**
Severity: **Medium** · [New]
Every other dismissible surface closes on Escape; the drawer — including its mobile
full-screen scrim mode (`drawer.js:314-341`) — does not. `menu.css:92-93` styles
`[aria-disabled="true"]` but `menu.js:6` filters only `:not(:disabled)`, so aria-disabled
items look disabled yet receive roving focus and Enter; tabs repeat the pattern
(`navigation.css:123-124` vs `controls.js:80,242`). Toggle groups skip the roving
tabindex that segmented/tabs get (`controls.js:26,237`). `inert` + `aria-hidden` are
double-applied (`drawer.js:301-302`, `ui-shell.js:27-28`).
**Fix:** four small, independent patches; each is S-effort.

**G5. What's already right:** segmented/tabs arrow-key + Home/End + roving tabindex
(`controls.js:328-358`); menu's full roving pattern with focus restore (`menu.js:16,35,58-67`);
side-nav's `inert`+restore+Escape; reduced-motion handled centrally (`utils.css:16-23`) and
honored. The keyboard patterns exist in the codebase — they're just not distributed.

### H. Hygiene — Needs work

**H1. Gallery covers 9 of 22 base files; its two interactive specimens contradict the
shipped JS.** Severity: **Medium** · [New]
`gallery.html:7` loads only `rux.css`, no behavior modules. Absent entirely: app-shell,
drawer, menu, notifications, panel, popover, preferences, profile-picker, side-nav,
suggestions, table, ui-header, workspace. The tabs specimen (`gallery.html:145-149`) lacks
the required `data-rux-tabs` and the module anyway isn't loaded; the theme toggle
(`gallery.html:60-63`) uses a button+`aria-pressed` contract `theme.js:24-26` doesn't
implement (it expects an `<input>` inside `#theme-toggle`), and persists nothing while
`theme.js:33` uses `localStorage["rux-theme"]`. `examples/app-layout.html:125-146` has the
same inert-tabs gap. README calls the gallery "every component, both themes" — currently
false.
**Fix:** complete the gallery (M, mostly mechanical from the block census) and add a
gallery-coverage contract test (block census vs gallery classes — fully mechanizable);
fix or remove the two contradicting specimens.

**H2. Dead/deprecated items already adjudicated — do not re-litigate.** [Ledger §7 steps 10, 16]
`.rux-app-shell`/`__panel`/`__workspace` look dead in this repo but are **used by vendored
consumers** (`infor_ln_docs/portal`, `guide_runner` at commit `157b427` — 73 tokens,
38 classes) and are kept as published deprecated aliases; likewise `--rux-panel-bg`,
`--rux-panel-shadow`, `--rux-side-nav-shadow`, `--rux-card-border-active` and the unused
rungs of complete scales are deliberate keeps. Any remediation below that renames a public
name **must** check those two consumers' usage first.

**H3. Remaining unadjudicated orphans: ~16.** Severity: **Low** · [New]
My count (used-vs-defined across CSS+JS+HTML+docs): 35 raw, minus step-16 keeps and grep
artifacts ≈ 16 — dominated by the 9 unwired type-role axes (C5), the 3 deprecated text
aliases with zero consumers (`--rux-text-default/-heading/-faint`, `tokens.css:258-261`),
`--rux-divider`, `--rux-duration-productive`, `--rux-motion-duration-moderate-02`,
`--rux-shadow-pressed` (plus the commented-out `--rux-shadow-inset` block left at
`tokens.css:144-146`).
**Fix:** wire or remove, one commit, after checking vendored usage (H2).

**H4. Scrim/backdrop: one concept, two words, three mechanisms, two color sources.**
Severity: **Medium** · [New]
`.rux-modal-backdrop` (`feedback.css:48`, toggled by `[hidden]`, `--rux-z-modal`,
`--rux-overlay-scrim`) vs `.rux-drawer-scrim` (`drawer.css:199`, `.is-visible`,
`z-modal − 1`, same token) vs `.rux-side-nav-scrim` (`side-nav.css:129`, `.is-visible`,
`z-overlay − 1`, **its own** `--rux-side-nav-scrim-bg` = `--rux-black` — the one scrim
that can't be retuned with the rest). The token layer already voted: it's called
`--rux-overlay-scrim` (`tokens.css:233`).
**Fix:** canonical word **scrim** (matches the token); one `.rux-scrim` block with
modifiers, or at minimum route side-nav through the shared token. `modal-backdrop` rename
is breaking (3 JS constructors + vendored consumers) — alias first.

---

## 4. Naming glossary — canonical terms

Design-system concepts (the agreed focus). **Bold** = recommended canonical name;
renames marked ⚠ are breaking and must go through the ledger + vendored-consumer check.

| Concept | Variants found | Canonical | Notes |
|---|---|---|---|
| Overlay dimmer | `scrim` (drawer, side-nav, `--rux-overlay-scrim`), `backdrop` (modal) | **scrim** | Token already decided it ⚠ |
| Full-width modifier | `--block`, `--fill`, `--even` | **`--block`** | Oldest, most uses ⚠ |
| Quiet variant | `--ghost` (23×), `--borderless` (1) | **`--ghost`** | ⚠ card only |
| Filled variant | `--solid`, `--boxed` | **`--solid`** | `--boxed` has 0 card consumers — delete there |
| Size scale | `--sm/--lg` vs `--compact/--header` | **`--sm/--md/--lg`** | `--header` is a location, not a size; keep as alias short-term ⚠ |
| Collapses-when-narrow | `--responsive`, `--optional` | **`--responsive`** | |
| Vertical layout mod | `--stack`, `--stacked` | **`--stack`** | |
| State: open/visible | `[hidden]`, `.is-open`, `.is-visible`, `data-rux-open`, `--hidden` | **`[hidden]` for presence; `aria-expanded` on triggers** | See R3. Delete `data-rux-open` |
| State: selected/active | `.is-active`, `[aria-selected]`, `[aria-pressed]`, `[aria-current]`, `--active`, `--current` | **the aria attribute** (`.is-*` only where no aria fits) | Buttons doc already mandates this |
| Utility prefix | `rux-u-*` vs bare (`rux-subtle`, `rux-mono`, `rux-cluster`, `rux-stack`) | **`rux-u-*`** | Per `docs/cards.md:224`; migrate the six ⚠ |
| Muted text utility | `rux-muted`, `rux-subtle` (identical) | **one of them, as `rux-u-muted`** | Delete the duplicate (muted has 0 uses — keep subtle's rule, take muted's name, or simply keep `subtle`; either way, one) |
| Motion tokens | `--rux-motion-duration-*` vs `--rux-duration-*`/`--rux-ease-*` | **`--rux-motion-*`** (docs/motion.md's set) | Legacy becomes thin aliases, then retire ⚠ |
| Hover/active bg | `--rux-bg-hover/-active` vs `--rux-state-*-overlay` | **`--rux-state-*-overlay`** | Overlay composes on any surface; opaque pair becomes aliases |
| Font-size tokens | `--rux-size-*` | **`--rux-font-size-*`** (alias old) | Frees `size` for physical sizes ⚠ |
| `data-*` in portable layer | `data-rux-*` vs bare | **`data-rux-*`** | ⚠ `data-placement` is in public CSS selectors |
| Dismiss hook | `data-rux-dismiss`, `data-dismiss` | **`data-rux-dismiss`** | |
| Segmented family | `segmented-track` / `segmented` / `segment` / `button--segment` | **`segmented`** block, `__track`/`__indicator` elements | ⚠ |
| Notifications block | `.rux-notifications-menu` root + `.rux-notifications__*` elements | **`.rux-notifications`** | ⚠ |
| App prefix | `sched-` + 13 others | **`sched-`** | Per §3 of the ledger |
| Domain status vocab (app) | `rux-role--pending-assignment/…` alongside `--danger/--warning/--success` | **domain words** (`sched-role--*`), mapped to semantic color tokens in CSS | JS currently emits both vocabularies; 3 have no CSS |

---

## 5. Proposed design rules (CLAUDE.md-ready)

Each rule names the test that can enforce it. Rules marked ★ are new tests worth writing;
the others extend existing suites.

1. **One block per component.** A component's container, elements, and modifiers share one
   BEM block; sibling blocks for parts of one component are prohibited.
   *(extends `tests/naming-contract.test.mjs` — element-without-block detection)*
2. **One modifier vocabulary.** Sizes are `--sm/--md/--lg`; full-width is `--block`; quiet
   is `--ghost`; filled is `--solid`; destructive is `--danger`. New modifier names require
   a ledger entry. *(naming-contract: synonym denylist)*
3. **Aria is the state of record.** Where an aria attribute expresses the state
   (`aria-expanded`, `aria-pressed`, `aria-selected`, `aria-current`, `[hidden]`), CSS
   selects on it and JS writes only it. `.is-*` is reserved for states with no aria
   equivalent (`is-dragging`, `is-scrolled`, `is-resizing`). BEM `--state` modifiers are
   prohibited. JS must not write a class or attribute no stylesheet reads.
   *(★ state-contract test: forbid `--open|--active|--hidden` modifiers; flag `.is-*`
   written in `rux-ui/js/` with no CSS reader)*
4. **Namespace everything portable.** `data-rux-*` for attributes, `--rux-*` for public
   custom properties, `--_*` for private ones (one private convention, not two), `rux:` for
   events with past-tense verbs, `rux-` for keyframes — all only in `rux-ui/`.
   *(★ prefix-contract test over `rux-ui/js` + `rux-ui/css`)*
5. **Every emitted class resolves.** Any `rux-*` class appearing in `index.html` or
   written by JS must be defined in a stylesheet or explicitly registered as a
   markup-hook. *(★ class-resolution test — this is the suite's current blind spot per
   CLAUDE.md, and it would have caught five ghosts)*
6. **Tokens only, both themes.** No literal color, duration, easing, or z-index in any
   rule (print stylesheets excepted, behind a namespaced `--print-*`-style palette
   documented as an exception). Any absolute-lightness token must have a light-theme
   override or a relative (`from var()`) definition.
   *(extends `tests/tokens-contract` + `tests/motion-contract`)*
7. **One overlay kernel.** Dismissible surfaces register with the shared dismiss manager
   (one singleton, one outside-pointerdown, one Escape policy, one focus trap/restore
   helper, one layer-promotion helper). No module binds its own document-level dismiss
   listeners.
8. **Focus is visible everywhere.** Every base file that styles an interactive selector
   carries a `:focus-visible` rule keyed to `--rux-accent-ring`.
   *(★ focus-contract test: file styles `:hover` on interactive element ⇒ must contain
   `:focus-visible`)*
9. **The gallery is the contract surface.** Every base block appears in `gallery.html`,
   with behavior modules loaded, before it ships. *(★ gallery-coverage test: CSS block
   census ⊆ gallery class census)*
10. **Docs cite tokens, not numbers.** Component docs reference token names; a literal px
    in a doc is presumed stale. Renames and public-surface changes go through
    `docs/portability-audit.md` first — prefix is truth, the ledger is how it changes.

---

## 6. Remediation plan

Ordered highest-leverage-lowest-risk first. Every rename: record in the ledger, grep
before/after per CLAUDE.md (HTML class attributes and JS selectors are not test-covered),
and check the two vendored consumers (H2) before touching any public name.

**Phase 0 — Correctness, no renames (S, mostly mechanical)**
1. Light-theme token fixes: `--rux-input-bg-disabled`, `--rux-thumb-bg`,
   `--rux-tag-purple/-default`, decide `--rux-shadow-rim-color:1552` — verify per the
   `verify` skill in both themes. *(C1)*
2. Delete dead state writes: `controls.js:221` `.is-active`, `utilities.js:83`
   `data-rux-open`. *(B2)*
3. Ghost classes: add the missing `rux-role--danger/warning/success` rules or stop
   emitting them (`trip-panel.js:79-83`, `trip-db.js`); define or drop
   `.rux-resize-gutter--right`, `.rux-row`, `.rux-spacer`; give `.rux-button__label` a
   home in `controls.css`. *(B4)*
4. Guard `menu.js:30,42`'s `RuxPopover` dependency; unify `defer` in
   `index.html:7362-7378`. *(D1, A3)*
5. Doc-sync pass: `ui-header.md`, `buttons.md`, `popovers.md` numbers; stale comments
   `controls.css:393,421`, `tokens.css:637-638`; `portability-audit.md:260`;
   `trip-bar.md` mechanism. *(D5, B5)*

**Phase 1 — Accessibility (M, judgment)**
6. `:focus-visible` pass across the 19 base files missing it, starting with `form.css`. *(G1)*
7. Focus trap/restore helper; wire modal (+ `role="dialog"`/`aria-modal`), drawer scrim
   mode, side-nav; fix modal initial-focus selector to prefer `[autofocus]`. *(G2)*
8. Suggestions keyboard: arrows + Enter + `aria-activedescendant` + `aria-expanded`. *(G3)*
9. Drawer Escape; `aria-disabled` filtering in `menu.js:6` and `controls.js:80,242`;
   toggle-group roving tabindex; drop redundant `aria-hidden` beside `inert`. *(G4)*

**Phase 2 — The overlay kernel (M–L, judgment)** — **done (2026-08-20)**, ledger step 17
10. ~~Extract the dismiss manager (singleton, outside-click, Escape policy, auto-id/ARIA,
    layer promotion); migrate menu → popover → suggestions → modal; delete
    `rux:popover-open`; make `open()` own unhide; route suggestions positioning through
    popover's token-aware engine.~~ *(D2, D3)* — `rux-ui/js/overlay.js`. Drawer, side nav
    and the app's chat mention menu were migrated too, so all five Escape handlers of D2
    collapse to one.
11. ~~Toast host to `.rux-toast-host` in `feedback.css` + motion tokens.~~ *(C7)* — added
    `--rux-toast-z-index/-inset/-gap/-enter-y`; `utilities.js` reads the motion tokens off
    the element, so the last token-violating behavior module is clean.
12. ~~Standardize init (`Rux.<name>.init(root)`) and events (bubbling past-tense on the
    element); give `theme.js` a public API and drop the `#theme-toggle` ID coupling.~~
    *(D1, B8)* — done **additively**: every module publishes `Rux.<name>` beside its
    existing `Rux<Name>` global, `controls`/`utilities`/`theme`/`ui-shell` gained explicit
    `init(root)`, `Rux.theme` is a real API (`get`/`set`/`toggle`/`init` + `rux:theme-changed`),
    and past-tense event siblings ship alongside the originals. **Re-scoped (2026-08-20):**
    the missing piece was never the retirement, it was that nothing could wire markup
    rendered after load. `rux-ui/js/boot.js` adds `Rux.boot(root)` — the scanners in a
    defined order, safe to repeat — without touching how any page boots today, so the
    breakage this line worried about does not arise. It found a live defect immediately:
    `doc-viewer.js` and `trip-envelope.js` mount panels long after DOMContentLoaded, and
    those had never been wired. Retiring the per-module self-init remains optional and
    still breaking; it is no longer blocking anything. The deprecated aliases this phase
    created are listed in ledger step 17.

**Phase 3 — Naming consolidation** — *items 13–15 done 2026-08-20 (ledger steps 18–20);
16–17 open.* **No aliases were kept.** The owner's standing rule is one name per concept, so
every legacy name is gone rather than deprecated. Consequence, stated once: the vendored
consumers pinned at `157b427` need markup updates when they next sync, since there is no
fallback name to catch them.
13. ~~Modifier synonyms → glossary canon.~~ *(B1)* — all of them, plus `.rux-output--boxed`
    which B1's table missed. The size scale went too: `--compact`→`--sm`, `--header`→`--lg`,
    unmodified = 32px default. The tokens had already voted (`--rux-icon-sm`/`--rux-icon-lg`)
    and `.rux-avatar--sm|--lg` already shipped, so the system now has one size vocabulary.
    `ui-shell.test.mjs`'s blanket ban on `--sm` is replaced by assertions that both rungs
    resolve — the ban existed because `--sm` named nothing, which is no longer true.
14. ~~Scrim unification; notifications block; segmented block.~~ *(H4, B3, D4)* —
    `.rux-modal-backdrop`→`.rux-modal-scrim` (the other two were already "scrim"), and
    side-nav now paints `--rux-overlay-scrim` at `opacity: 1` like the drawer does, so all
    three retune from one token. **This lightens the side-nav scrim from 0.65 to 0.60** —
    deliberate, and the one change here that still wants an eyeball in both themes.
    Token-prefix regularization (`--rux-segmented-track-*`/`--rux-segment-*`,
    `--rux-tab-*`/`--rux-tabs-attached-tab-*`) is still open and belongs with item 16.
15. ~~Utility migration.~~ *(B5)* — `rux-u-*` for all six; `cluster`/`stack`/`row`/`spacer`
    adjudicated as utilities; the muted/subtle duplicate collapsed into `.rux-u-muted`.
16. `data-*`/custom-property prefixing (`data-placement` et al., `--drawer-width`,
    `--_rux-*`→`--_*`); motion + state-overlay + font-size token families. *(B7, C2, C3)*
    **Open.** Note `[data-dismiss]` (notifications) cannot simply become `[data-rux-dismiss]`:
    that name already means "close the nearest modal" in `utilities.js`, so the two would
    collide. It needs a distinct name, which is a decision rather than a sweep.
17. App prefix sweep: 13 prefixes → `sched-`, one file per commit.
    ~~`@keyframes rux-pull-hint-pulse` → `sched-`~~ **done** — it was the last `rux-` keyframe
    in the application layer, a real boundary leak, isolated to two lines in one file.
    **The 13-prefix sweep itself is open.** ~1,000 occurrences, and three of the prefixes
    (`driver`, `assignment`, `req`) are also domain words appearing in data-layer code and
    column names, so a regex sweep is unsafe — it wants the file-at-a-time commit discipline
    this line already prescribes. *(B6)*

**Phase 4 — Coverage that locks it in (M, mostly mechanical)**
18. Gallery completion + fixed specimens (tabs, theme toggle, `examples/app-layout.html`). *(H1)*
19. ~~New contract tests from §5: class-resolution ★, state-contract ★, prefix-contract ★,
    focus-contract ★~~ **done (2026-08-20)**, ledger step 21 — four suites, 18 tests, 256→274,
    each verified to fail when violated. `class-resolution` immediately caught a live bug from
    the Phase 3 renames (`request.html` was missing from the target list), four ghost classes,
    and two dead modifiers; `state-contract` found `data-rux-accent` is written but read by no
    rule; `prefix-contract` drove `--_rux-*`→`--_*`; `focus-contract`'s five gaps were closed
    rather than accepted. ~~**Still open:** gallery-coverage ★, breakpoint allowlist, and
    extending tokens-contract with "portable rules read only tokens.css-declared tokens"
    (catches C4).~~ **done (2026-08-20)** — `gallery-coverage` and `breakpoint-contract`
    ship as ratchets: today's 13 missing specimens and 4 portable breakpoints are recorded,
    a new component or width cannot appear without a deliberate entry, and both lists are
    asserted to stay honest. C4 landed in `portability-boundary` instead of
    `tokens-contract`, where the dangling-token rule already lived: fallback reads now
    count, so `var(--x, 8px)` no longer hides a token nothing portable declares.
20. Wire-or-remove: type-role axes (C5), 3 deprecated text aliases, ~~`--rux-divider`~~,
    ~~`--rux-shadow-pressed`~~, bridge motion tokens; ~~declare the four rule-invented panel
    tokens in tokens.css~~; ~~`--rux-z-splash`~~. *(C4, C5, H3)*
    **Partly done (2026-08-20).** `--rux-divider` and `--rux-z-splash` are gone.
    `--rux-shadow-pressed` is **kept, not removed**: it reads as dead here because nothing
    in this repository uses it, but `portal/app/globals.css:178` does and the README
    publishes it — the same consumer blindness that pruned `.rux-card--boxed`,
    `.rux-cluster`, and `.rux-button--header` out from under a live consumer. Of the panel
    tokens, three were rule-local aliases declared before use and are fine as they are;
    the real violation was `--rux-panel-floating-safe-max-width`, read with a `64rem`
    fallback while only applications declared it. Now declared in `tokens.css` and the
    fallback dropped. **Still open:** C5's type-role axes and the 3 deprecated text
    aliases.

**Phase 5 — Optional structural**
21. `table.js` sort/filter behavior module (or an explicit "CSS-only contract" header). *(A2)*
22. Fold `Rux.openModal` into the kernel or bless the native-`<dialog>` path
    `driver.html:52` already took — one modal story, not four. *(D2)*

---

## 7. Open questions

1. **Vendored consumers** (`infor_ln_docs/portal`, `guide_runner`, pinned at `157b427`):
   is there a sync cadence? Phase 3's aliases can only be removed after both consumers
   move; who owns that?
2. **`.rux-button__label`** — intended as a public markup hook (then it gets a rule and a
   docs line) or an accident that app CSS should stop targeting?
3. **Legacy motion family** (`--rux-duration-*`/`--rux-ease-*`): retire per
   `docs/motion.md`, or bless as the permanent public API and demote `--rux-motion-*`?
   Components currently vote legacy; the docs vote modern.
4. **Suggestions**: minimal keyboard patch (arrows + activedescendant) or full ARIA
   combobox pattern? The second is more work and touches markup contracts.
5. **`Rux.openModal` vs native `<dialog>`**: `driver.html` already uses `<dialog>`; is
   that the intended direction for modals system-wide?
6. **Print palettes** (`--print-*`, `--env-*`): confirm these are deliberate
   theme-independent exceptions; if so they should be namespaced (`--sched-print-*`) and
   documented as such rather than looking like drift.
7. **Splash `z-index: 9999`**: intentional above-everything? If yes, `--rux-z-splash` in
   the ladder; if no, `--rux-z-modal + 1`.
8. **`--header` button size**: is 40px-desktop/44px-mobile the contract (docs wrong) or
   was 44px the intent (tokens wrong)? The doc-sync in Phase 0 needs the answer.

---

*Verification of this audit: 256/256 tests green before writing; 20+ citations re-read at
source; counts re-run independently (`is-*` 67/119, px 322/80, orphans 35 raw → ~16
unadjudicated, color literals 0 functional). The only file this audit created is this
report.*
