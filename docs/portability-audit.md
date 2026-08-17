# Rux UI Portability Audit

This document is the canonical boundary contract between the portable Rux UI design
system and the applications that consume it. It classifies every unit in the repository
into a tier, fixes the rule by which future units are classified, and records the
sequence in which the current violations are resolved.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required, preferred,
optional, and prohibited behavior.

This is a decision document. It moves no code. Execution runs against §7.

---

## 1. Tier model

Rux UI is CSS-first and framework-free, so it has no headless-primitive layer. Its tiers
are its own:

| Tier | What it is | Lives in | Ships |
|---|---|---|---|
| **0 · Tokens** | `--rux-*` values; no selectors | `rux-ui/css/tokens.css` | yes |
| **1 · Base components** | Styled, domain-free `.rux-*` blocks | `rux-ui/css/base/` | yes |
| **2 · Behaviors** | Framework-free JS attaching to Tier 1 markup by contract | `rux-ui/js/` | yes |
| **3 · App compositions** | Domain-bound layout, features, routing | `scheduler/`, `js/`, `index.html` | no |

- A tier MAY depend downward (3→2→1→0).
- A tier **MUST NOT** depend upward. Tier 1 and 2 units referencing Tier 3 names are the
  defect class this audit calls **Misplaced**, and every instance is listed in §4.4.

---

## 2. The boundary rule

A unit is portable only if it passes **both** tests. Both are mechanical.

**Vocabulary test.** It can be described without naming a trip, bus, driver, schedule,
customer, fleet, manifest, or itinerary.

```bash
grep -rliE 'trip|bus|driver|schedul|customer|fleet|manifest|itinerar' rux-ui/
```

This is a *candidate filter, not a verdict*. It currently flags 10 of 17 files in
`rux-ui/css/base/`, but most hits are prose in comments rather than real coupling. Every
hit MUST be read before it is recorded.

**Dependency test.** It references no class or custom property defined outside `rux-ui/`.
This is the precise test, and the one worth automating:

```bash
grep -rhoE 'var\(--rux-[a-z0-9-]+' rux-ui/css/base/*.css | sed 's/var(//' | sort -u > /tmp/used
grep -rhoE '^\s*--rux-[a-z0-9-]+' rux-ui/css/tokens.css | tr -d ' \t' | sort -u > /tmp/defined
comm -23 /tmp/used /tmp/defined
```

Anything the last command prints is either a file-local custom property (acceptable) or
an upward dependency (a §4.4 row). At time of writing it prints five names; four are
local to `panel.css` and one is a genuine violation.

**Selector test.** Every class selector in `rux-ui/` MUST be a `.rux-*` class that
`rux-ui/` itself defines. This test exists because the vocabulary test is not sufficient:
its fixed noun list silently missed `.settings-app__*`, `.maintenance-share-header__*`,
and `.assignment-module__*`, which name application components without using a domain noun.

```bash
# app selectors that are not .rux-* at all
grep -rhoE '^\s*\.[a-z][a-z0-9_-]+' rux-ui/css/base/*.css | tr -d ' \t' | grep -v '^\.rux-' | sort -u

# .rux-* blocks referenced in rux-ui/ but defined in the app layer
grep -rhoE '\.rux-[a-z0-9-]+' rux-ui/css/base/*.css | sort -u > /tmp/used-cls
grep -rhoE '^\.rux-[a-z0-9-]+' scheduler/css/ | sort -u > /tmp/sched-cls
comm -12 /tmp/used-cls /tmp/sched-cls
```

The second command also lists Tier 1 blocks the app merely re-opens (§4.5); separate those
from genuine Tier 3 blocks by checking whether `rux-ui/css/base/` defines the block itself.

---

## 3. Namespace decision

**Decision: reserve `.rux-*` for `rux-ui/`. Application components take their own prefix.**

Today 46 `.rux-*` block families are defined outside `rux-ui/`, so the prefix does not
signal portability and the folder is the only source of truth. Two options were
considered:

| | Option A — location is truth | **Option B — prefix is truth** (chosen) |
|---|---|---|
| Renames | none | ~46 families across 33 feature stylesheets + `index.html` + `js/` |
| Reader can tell what ships | only by checking the path | from the class name alone |
| Cost to a consuming team | a `.rux-` class that silently does not ship is a support burden | one migration, then unambiguous |

Option B is chosen because the stated goal is other applications adopting this system.
At that point ambiguity is paid for repeatedly by every consumer, while the rename is
paid once.

The codebase already reaches for an app-scoping marker: `.rux-scope-customer`,
`-driver`, `-fleet`, `-manifest`, `-request`, `-right-panel`, `-trip`, `-trip-finder`.
That convention is evidence the distinction is real; it SHOULD be folded into the new
prefix rather than kept as a second parallel mechanism.

Application prefix: **`.sched-*`** for this repository's scheduler. Other applications
built on Rux UI choose their own.

---

## 4. Classification

Verdicts are **Portable** (belongs in `rux-ui/`), **App-specific** (stays, renamed per
§3), **Hybrid** (generic mechanism wrapped around domain specifics — the row names the
split), and **Misplaced** (already in the wrong tier, must move out or have its
dependency severed).

### 4.1 Shell and layout — 22 `.scheduler-app__*` families

| Family | Verdict | Target | Evidence | Risk |
|---|---|---|---|---|
| `__body` | Hybrid | `.rux-app-shell` + app config | duplicates the Tier 1 shell; see §5.1 | high |
| `__module` | Hybrid | `.rux-app-view` (Tier 1) + app router | generic show/hide; see §5.2 | high |
| `__drawer`, `--railable`, `--right`, `__drawer-scrim`, `__drawer-icon-stack`, `__drawer-toggle-open`, `__drawer-toggle-close` | Hybrid | Tier 1 drawer CSS + app widths | paired with portable `rux-ui/js/drawer.js`; see §5.3 | high |
| `__gutter`, `__resize-gutter` | Hybrid | Tier 1 primitive + app sizing | resize behavior is generic; the widths are not | med |
| `__side-nav`, `__side-nav-scrim` | Hybrid | Tier 1 placement recipe | `examples/app-layout.html` duplicates this as `.example-navigation` — duplication is the evidence it wants extracting | med |
| `__nav`, `__panel-header-toggle` | Hybrid | Tier 1 candidates | inspect during execution | low |
| `__grid`, `__day-picker`, `__search`, `__search-control`, `__view-menu`, `__mobile-panel-btn`, `--left` | App-specific | `.sched-*` | scheduler furniture | low |

`docs/layout-composition.md` already decides several of these: "The shared shell MUST NOT
define product drawer widths, collapsed rails, feature breakpoints, or a workspace content
minimum width," and "Application layout CSS owns navigation placement." Those clauses are
normative and the Hybrid splits above MUST respect them.

### 4.2 Generic components stranded in the app layer

These carry generic names, are domain-free in their own rules, and belong in Tier 1.
They are the highest-value, lowest-risk extractions in the repository.

| Class | Currently in | Domain coupling | Tests | Verdict |
|---|---|---|---|---|
| ~~`.rux-table`~~ | → `rux-ui/css/base/table.css` | **none** — 21 `--rux-table-*` tokens **already lived in Tier 0** | none | **done (step 4)** |
| ~~`.rux-status-text`~~ | → `rux-ui/css/base/content.css` | none — 5 lines mapping semantic color | none | **done (step 4)** |
| `.rux-notifications`, `-menu` | `features/notifications.css` | none (0 domain hits, 83 lines) | `ui-shell.test.mjs` | Portable |
| `.rux-preferences` | `features/preferences.css` | none (0 domain hits, 54 lines) | `ui-shell.test.mjs` | Portable |
| `.rux-profile-picker` | `features/profile-picker.css` | none (0 domain hits, 153 lines) | none | Portable |
| `.rux-col-picker`, `.rux-col-filter-icon` | `features/bus-picker.css`, `comp-driver-app.css` | column-picker mechanism is generic; its contents are not | none | Hybrid |
| `.rux-splash` | `layout/scheduler-app.css:11` | none in its own rules | none | Portable |
| `.rux-view-options` | `layout/scheduler-app.css:1255` | none in its own rules | none | Portable |
| `.rux-mini-cal` | `layout/scheduler-app.css:679` | date grid is generic; scheduler wiring is not | none | Hybrid |
| `.rux-priority-dot` | `features/driver-panel.css:157` | `[data-priority]` mapping is generic | none | Portable |

`.rux-table` is the clearest single finding in this audit: **Tier 0 already declares it
portable while its CSS sits in a driver-specific feature file.** The token contract and
the stylesheet location contradict each other today.

### 4.3 Features — 33 stylesheets

Domain-noun density, comments stripped, gives a defensible first pass. Files scoring zero
are in §4.2. The remainder are App-specific and rename to `.sched-*`:

- **Heavily domain-bound** (>100 hits): `trip-bar.css` (526), `itinerary.css` (389),
  `driver-share.css` (269), `trip-panel.css` (263), `trip-envelope.css` (134),
  `print-schedule.css` (128).
- **Clearly domain-bound** (5–100): `driver-panel.css`, `driver-week-info.css`,
  `maintenance-share.css`, `tasks-panel.css`, `fleet-panel.css`, `trip-request.css`,
  `trip-finder.css`, `trip-history.css`, `comp-driver-app.css`, `comp-trip-list.css`,
  `customer-panel.css`, `trip-manifest.css`, `comp-fleet-app.css`, `bus-picker.css`,
  `trip-dialog.css`, `comp-components-app.css`, `request-inbox.css`.
- **Low-score, inspect individually** (1–3): `comp-settings-app.css`, `dev-notes.css`,
  `documents-app.css`, `team-chat.css`, `doc-viewer.css`, `flip-seven.css`,
  `contact-info.css`. Several are app *panels* whose chrome is generic; expect Hybrid
  rows here.

### 4.4 Misplaced — Tier 1/2 units depending upward

The defect class §1 prohibits. This is the **largest boundary problem in the repository**
and the one most likely to be underestimated: a first pass using only the vocabulary test
found 3 rows; the selector test in §2 finds roughly 18.

**The mechanism.** These are not stray rules. They are *shared typography recipes*: a
declaration block in the portable layer whose selector list was extended with application
classes so those classes could reuse it. `utils.css:56–58` documents the intent — the app
selectors "all used to hardcode their own" values, so they were deduplicated by appending
them here. The deduplication was correct; its **direction** was not. It pulled Tier 3
names into Tier 1 instead of publishing a Tier 1 class the app applies.

**Non-`.rux-*` application selectors defined inside the portable layer**

| Selector | Location |
|---|---|
| `.assignment-module__label` | `base/utils.css:67` |
| `.trip-request-header__label` | `base/utils.css:68` |
| `.maintenance-changes__title` | `base/utils.css:69` |
| `.maintenance-share-header__title` | `base/card.css` |
| `.settings-app__panel-title` | `base/card.css` |
| `.settings-app__subtitle` | `base/card.css:181` |
| `.settings-location-row__address` | `base/form.css` |
| `.trip-request-option__hint` | `base/form.css:118` |

**Tier 3 `.rux-*` blocks referenced from the portable layer**

`.rux-bus-picker`, `.rux-col-picker`, `.rux-preferences`, `.rux-scope-manifest`,
`.rux-scope-trip`, `.rux-status-text`, `.rux-trip-bar`, `.rux-trip-history`,
`.rux-trip-itinerary`, `.rux-view-options`.

**Highest severity**

| Unit | Location | Problem |
|---|---|---|
| `.rux-trip-bar .rux-icon` | `base/icons.css:48` | reads `--rux-trip-bar-icon-size` **with no fallback**, defined only in `scheduler/css/features/trip-bar.css` — **functional break**; copy `rux-ui/` alone and it resolves to nothing |
| `rux-ui/js/drawer.js` | lines 4, 12, 22, 96 | targets `.scheduler-app__drawer`; reads `--scheduler-app-right-drawer-default-width`. Deferred to §5.3 / step 8 |

**Resolution shape.** For each shared recipe, publish the declaration block as a Tier 1
utility (or a Tier 0 token pair) and have the application apply it — inverting the
dedup rather than duplicating the block into each app file.

> **Status: resolved (step 3).** Every recipe below now publishes a `.rux-u-*` utility that
> the application opts into, and no application selector remains in the portable layer.
> The utilities are `.rux-u-eyebrow`, `.rux-u-section-label`, `.rux-u-panel-title`,
> `.rux-u-subtitle`, `.rux-u-caption`, and `.rux-u-hint`. The section-label recipe had to be
> split in two — `.rux-u-section-label` carries a divider rule the borrowing classes never
> had, so `.rux-u-eyebrow` exposes the typography alone. The record below is kept because
> the pattern will recur.

**The inversion was already half-done.** `base/utils.css` showed the target state and the
defect in the same rule:

```css
.rux-u-section-label,      /* ← the portable utility already exists */
.rux-menu__header,
.rux-bus-picker__heading,  /* ← five app selectors appended to borrow it */
.rux-col-picker__heading,
.assignment-module__label,
.trip-request-header__label,
.maintenance-changes__title { … }
```

Step 3 is therefore mostly *deletion*: drop the app selectors from the list and add
`.rux-u-section-label` to those elements in the application markup. The recipe does not
need designing — it needs applying.

**Two further rows**, found by the enforcement test rather than by inspection:

| Unit | Location | Problem | Fix |
|---|---|---|---|
| `.rux-bus-picker__heading` | `base/utils.css:65` | Tier 3 block in a Tier 1 selector list | step 3, as above |
| `.rux-u-trip-list` | `base/utils.css:85` | portable utility whose *rule* is generic (flex column + gap) but whose *name* is a domain noun | rename (e.g. `.rux-u-stack`) in step 5 — do not move it |

Only `icons.css:48` was a clean move; it is done. Everything else requires the inversion
above, which is why step 1 was scoped to that single row and step 3 carries the recipes.

### 4.5 App layer re-opening Tier 1 blocks

A third pattern, distinct from both leak directions: application files writing rules for
portable blocks.

| Block | Re-opened in |
|---|---|
| `.rux-card` | `features/trip-panel.css` |
| `.rux-panel`, `.rux-workspace` | `layout/scheduler-app.css` |
| `.rux-ui-header` | `features/profile-picker.css` |

> **Status: resolved (step 6).** Resolving these showed the category above was too
> coarse. There are three distinct cases, and only two are defects:

| Case | Example | Verdict |
|---|---|---|
| **Scoped descendant** — app content styled inside a portable block, or the block configured from the app's own scope | `.scheduler-app__module > .rux-workspace { min-width: 471px }`, `.rux-table td[data-col="…"] .sched-priority-dot` | **Not a violation.** This is how an application is supposed to configure a portable block, and `docs/layout-composition.md` explicitly assigns the workspace minimum width to the app. |
| **App-invented element in the portable namespace** — the app defines `.rux-block__thing` that the portable layer does not | `.rux-panel__footer-close`, `.rux-workspace__nav`, `.rux-ui-header__chat-btn` | **Defect.** Claims a namespace the app does not own. Renamed to `.sched-panel-footer-close`, `.sched-workspace-nav`, `.sched-ui-header-chat-btn`. |
| **Unscoped global override** — the app restyles a portable element for every instance on the page | `trip-request.css` set `.rux-card__footer { justify-content: space-between }` | **Defect.** Publish a modifier instead: `.rux-card__footer--between` now lives in `card.css` and the page opts in. |

One override turned out to be simply redundant: `scheduler-app.css` re-declared
`min-width: 0; min-height: 0` on `.rux-workspace`, which `workspace.css` already sets.
Removed; the higher-specificity `.scheduler-app__module > .rux-workspace` rule was winning
either way, so nothing changed.

The rule going forward: an application MAY style a portable block from its own scope, and
MAY apply portable modifiers, but MUST NOT define new elements in the `.rux-*` namespace or
restyle a portable element globally.

### 4.6 JS

| Module | Domain hits | Verdict |
|---|---|---|
| `utilities.js`, `theme.js`, `menu.js`, `ui-shell.js` | 0 | Portable — already correct |
| `popover.js` (1), `floating-window.js` (4), `suggestions.js` (6), `controls.js` (7) | low | Portable — verify hits are prose |
| `drawer.js` | 38 | **Misplaced** — see §5.3 |
| `js/core/*`, `js/panels/*` | — | App-specific by construction; stay |

### 4.7 Domain-named tokens in Tier 0

`rux-ui/css/tokens.css` defines **69** tokens named after scheduler concepts —
`--rux-driver-doc-*`, `--rux-trip-bar-*`, and similar.

```bash
grep -oE '^\s*--rux-(trip|bus|driver|schedul|customer|fleet|manifest|itinerar)[a-z0-9-]*' \
  rux-ui/css/tokens.css | tr -d ' \t' | sort -u
```

This is a **scope** problem, not a dependency problem, and it does not break anything: the
tokens are defined in the same file that ships them, so nothing dangles. But a new
application copying `rux-ui/` inherits 69 tokens describing trips and drivers it will never
render, and Tier 0 — the most portable file in the system — is where the domain vocabulary
is most visible.

Two of these are consumed by Tier 1 files (`--rux-trip-bar-head-backdrop-blur` in
`base/controls.css` and `base/badges.css`), which makes those rows §4.4 violations by the
dependency test's spirit even though the token resolves. Resolve them the same way: rename
to a domain-free token (a backdrop-blur value is not a trip-bar concept) and let the app
alias it if it wants the old name.

The remainder are consumed only by Tier 3 and SHOULD move to a `scheduler/css/` token file
during step 5, when names are being changed anyway.

---

## 5. Resolutions

### 5.1 Shell duplication

`.rux-app` / `.rux-app-shell` / `__workspace` / `__panel` exist in
`rux-ui/css/base/app-shell.css` and are covered by `tests/layout-contract.test.mjs`, but
`index.html` uses `.scheduler-app` / `.scheduler-app__body` instead. Two implementations
of one concept.

> **Status: resolved (step 9).** The diff turned out to be far smaller than the two
> separate implementations suggested. Every scheduler "addition" was already written
> against a `--rux-shell-*` token, and **every one of those tokens defaults to 0**, so the
> two shells were geometrically identical in practice — the duplication was in the source,
> not the rendering.

| Addition | Resolution |
|---|---|
| `row-gap: var(--rux-shell-ui-header-gap)` | Moved onto `.rux-app`; token already existed and defaults to 0 |
| `margin` (outer) | Moved onto `.rux-app`, driven by `--rux-shell-margin-*`, both defaulting to 0 — the shell is full-bleed unless configured |
| `block-size: calc(100dvh - …)` | Moved onto `.rux-app`, replacing `min-height: 100dvh`. A definite height is what descendants need to cap against and scroll internally; identical to `100dvh` until an app sets a bottom margin |
| `background` | Already a token (`--rux-shell-bg`) — see the bug below |
| `position: relative`, `overflow: clip` | Genuinely app-level; stayed |

The shell now **composes** rather than duplicates: `class="rux-app scheduler-app"` and
`class="rux-app-shell scheduler-app__body"`. `.scheduler-app` dropped from 12 structural
declarations to 2, and `.scheduler-app__body` from 4 to 1.

**A bug this surfaced.** `--rux-shell-bg` was `var(--rux-danger)` — a debug value that had
shipped, giving any consumer of the portable shell a **red page**. It went unnoticed for
exactly the reason this audit exists: `index.html` used its own shell, so the portable one
was never rendered. `examples/app-layout.html` — the only page that did use it — had been
displaying it. Now `var(--rux-surface-1)`.

### 5.2 View container

`.scheduler-app__module` + `showModule()` (inline in `index.html`, currently ~7369) is the
show-one-view router every multi-view app needs. `rux-ui/js/ui-shell.js:5` explicitly
disclaims it: "Module routing remains the consuming application's job."

Split:

- **Portable** — a `.rux-app-view` container, `hidden` toggling per `[data-*]`,
  `aria-current` on the corresponding nav control, hash synchronization.
- **App-only** — the lazy-init hooks (`window.DriverPanel?.init()`, `FleetPanel`,
  `CustomersPanel`; currently ~`index.html:7381–7383`) and the module allowlist passed to
  `showModule()` (~`index.html:7918–7920`).

The portable helper MUST accept the allowlist as configuration and expose an
`onViewChange(name)` callback so every app-specific hook stays in the app.

### 5.3 drawer.js

> **Status: JS resolved (step 8).** The coupling was deeper than first recorded — about
> **20** references, not the 4 found by inspection: the bounding container
> (`.scheduler-app__module`), its inner gutters, the scrim class it creates, the mobile
> close animation name, the width host and its two default-width custom properties, the
> right-drawer modifier class, and a body-width fallback.
>
> Rather than thread all of that through the per-instance options (5 call sites), it is now
> one seam: `RuxDrawer.configure()` holds portable `.rux-*` defaults, and the application
> declares its own names once at startup. The five `create()` call sites were untouched.
>
> This also gave the tests a better shape. Two of them asserted `drawer.js`'s literal
> source text including the hardcoded application names; they now assert the portable
> mechanism *and* that the application configures it — both halves of the seam instead of
> one hardcoded string.
>
> **Still open:** the drawer's CSS is unchanged and stays in the application layer. Splitting
> it (§4.1) belongs with the shell reconciliation, since both depend on the same decision
> about which parts of the shell geometry are portable.

### 5.4 Reverse leakage

- `.rux-trip-bar .rux-icon` — **urgent**. Either give `--rux-trip-bar-icon-size` a fallback
  or move the rule to `scheduler/css/features/trip-bar.css`. Moving is preferred: a Tier 1
  file SHOULD NOT know a Tier 3 block exists.
- `.rux-trip-history__*` in `card.css` and `form.css` — move to
  `scheduler/css/features/trip-history.css`.

---

## 6. Distribution and versioning

**Public surface.** `rux-ui/css/rux.css` is the entrypoint. `rux-ui/css/rux-core.css` is a
compatibility alias forwarding to it. Public API is every `--rux-*` token in
`tokens.css` and every `.rux-*` class in `rux-ui/css/base/`. Custom properties named
`--_*` are file-local and private.

**Verified portable.** `rux-ui/` has been tested standalone: copied into an empty project
and loaded through `rux.css` alone, it produces the full component set, both themes, and
the `window.Rux` JS API with no other dependency. No relative path inside the folder
escapes it. The one known exception is the `--rux-trip-bar-icon-size` row in §4.4.

**Distribution model.**

| Model | When | Tradeoff |
|---|---|---|
| Copy the folder | first additional project | zero tooling, full ownership; copies drift immediately |
| Git-tagged dependency (`npm install github:<owner>/rux-ui#v1.0.0`) | once a second consumer exists | one-command updates, no drift; requires tagging discipline |

**Breaking change** = removing or renaming a public token or class. §3's rename program is
breaking by definition and is the reason for the policy amendment recorded in
`CLAUDE.md` / `AGENTS.md`.

**Every page is a consumer.** Consolidating the entrypoint moved the base layer out of
`scheduler/css/components.css` and into `rux.css`. `index.html` was updated; `driver.html`,
`maintenance.html`, and `request.html` were not, and rendered every `.rux-*` component unstyled until
it was caught. The repository has **five** pages that use `.rux-*` classes — `index.html`,
`request.html`, `maintenance.html`, `driver.html`, `examples/app-layout.html` — and `doc.html` plus
`documents/form_cca.html`, which are self-contained and use none. Any change to the
entrypoint contract MUST be applied to all five. `tests/portability-boundary.test.mjs`
now enforces this.

> **Rename note (2026-08-17).** The share pages formerly named `d.html` and `m.html` are
> now `driver.html` and `maintenance.html`. Root-level `d.html` / `m.html` remain as
> self-contained redirect stubs so links shared before the rename keep resolving; they use
> no `.rux-*` classes and are outside the entrypoint contract.

---

## 7. Sequencing and enforcement

Ordered by dependency and blast radius. A later session MAY start at step *n* without
re-deriving anything above.

| # | Step | Why here |
|---|---|---|
| 1 | Fix `base/icons.css:48` — the one clean move in §4.4 | Genuinely small and additive, and the only *functional* break a consumer hits today. Do it alone so it is trivially reviewable. |
| 2 | Land the enforcement test (below), seeded with the current §4.4 inventory as an accepted-violations list | Locks in step 1 and stops new leaks immediately, without blocking on the recipe inversions. Shrink the list as steps 3 and 8 land. |
| 3 | ~~Invert the §4.4 shared typography recipes into Tier 1 utilities~~ **done** | The bulk of the boundary debt. Five recipes across `utils.css`, `card.css`, `form.css`; 20 markup sites in `index.html`, `maintenance.html` (then `m.html`), `request.html`, and four JS modules. |
| 4 | ~~Extract §4.2 Portable rows~~ **done** | `.rux-table`, `.rux-status-text`, `.rux-notifications`, `.rux-preferences`, `.rux-view-options`, `.rux-profile-picker`, `.rux-splash`, `.rux-priority-dot` all moved. Two needed splitting first: `preferences.css` shared a label recipe with `.settings-location-row__name` (now `.rux-u-label`), and `profile-picker.css` defined `.rux-ui-header__*` elements, which went to `ui-header.css`. `.rux-col-picker` / `.rux-mini-cal` stay Hybrid, unmoved. |
| 5 | ~~Namespace migration `.rux-*` → `.sched-*` (§3)~~ **blocks done; elements remain** | 585 occurrences across 46 files. Two follow-ups deliberately deferred, each its own decision: the 51 domain-named `--rux-*` **tokens** (§4.7) still carry the old prefix, and the redundant `scope` marker (`.sched-scope-trip` → `.sched-trip`) was left in place rather than combining two transformations in one wide rename. **Status correction (2026-08-17):** the migration renamed *block* classes, but ~28 families of **element** classes still carry the old prefix in the app layer — `.rux-bus-picker__*`, `.rux-trip-bar__head/__tail`, `.rux-tasks__*`, `.rux-team-chat__*`, `.rux-scope-*__*`, and peers — consistently in both CSS and markup, so nothing renders wrong, but the §3 "prefix is truth" rule is not yet fully realized. Completing the element rename is an open follow-up of this step. |
| 6 | ~~Resolve §4.5 re-opened blocks into tokens/modifiers~~ **done** | Auditing this showed §4.5 conflated two different things. Renaming an app-invented element out of the portable namespace is one fix; publishing a modifier for a genuine override is another; and a *scoped descendant* rule (`.scheduler-app__module > .rux-workspace`) is not a violation at all — it is the correct way for an app to configure a portable block. See §4.5 below. |
| 7 | ~~Extract the view container (§5.2)~~ **done** | `rux-ui/js/view-router.js` — `RuxViewRouter.create()`. The app supplies the allowlist, the retired `#schedule`/`#trips` aliases, and the lazy panel boots via `onChange`; the router owns container toggling, `aria-current`, and hash sync. `showModule()` is now a one-line delegate. |
| 8 | ~~Decouple `drawer.js` (§5.3)~~ **JS done** | The coupling was far deeper than §5.3 recorded — ~20 references, not 4. Resolved with a single configuration seam, `RuxDrawer.configure()`, holding portable `.rux-*` defaults that the application overrides once at startup. The drawer **CSS** split (§4.1) is still open and belongs with the shell work. |
| 9 | ~~Shell reconciliation (§5.1)~~ **done** | Lower risk than expected: every shell token already defaulted to 0, so the two implementations were geometrically identical in practice. The shell now composes — `class="rux-app scheduler-app"` — with `.scheduler-app` reduced from 12 declarations to 2. Fixed a shipped bug in passing: `--rux-shell-bg` was `var(--rux-danger)`. |

**Enforcement.** Step 2 adds a test asserting that no file under `rux-ui/` references a
domain noun in a selector, and that every `var(--rux-*)` used in `rux-ui/` resolves within
`rux-ui/`. Without it this boundary erodes exactly as it did the first time. The §2
commands are the implementation.

---

## Known drift

Recorded here so execution does not mistake it for regression.

- **18 tests fail on `main`** before any of this work, 7 of them in the three files this
  program touches most (`layout-contract`, `motion-contract`, `ui-shell`). Capture a
  baseline and compare against it, not against green.
- `Calendar workspace is inset while tools remain full-bleed` expects
  `.scheduler-app__module[data-module="calendar"] .rux-scope-right-panel { border-inline-start: 0; }`
  while the CSS has `var(--rux-panel-right-border)`. Resolve during step 8.
- Line numbers in this document drift. Cite by symbol and confirm before acting.
