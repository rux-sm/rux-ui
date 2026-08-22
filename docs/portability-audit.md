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

> **Status (2026-08-18): realized.** Steps 11–14 completed the migration in both
> directions. `rux-ui/` contains no application name in any selector, token, or
> comment, and the application layer defines no `.rux-*` block it does not
> legitimately re-open. Both halves are enforced by
> `tests/portability-boundary.test.mjs`, so the prefix is now load-bearing:
> `.rux-*` means it ships.
>
> One sub-decision was deliberately **not** taken. §3 notes the scope marker is
> redundant and suggests folding `.sched-scope-trip` → `.sched-trip`. It was left
> in place: `.sched-trip` would sit one character from the unrelated
> `.sched-trip-bar` block, so `.sched-trip__body` and `.sched-trip-bar__body`
> would read as siblings of one family when they are not. Folding the marker is
> still open, but it needs a better target name than `.sched-trip`.

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
| ~~`.rux-notifications`, `-menu`~~ | → `rux-ui/css/base/notifications.css` | none (0 domain hits, 83 lines) | `ui-shell.test.mjs` | **done** |
| ~~`.rux-preferences`~~ | → `rux-ui/css/base/preferences.css` | none (0 domain hits, 54 lines) | `ui-shell.test.mjs` | **done** |
| ~~`.rux-profile-picker`~~ | → `rux-ui/css/base/profile-picker.css` | none (0 domain hits, 153 lines) | none | **done** |
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
>
> **Four of those six names no longer exist** (typography.md §5 steps 31, 33, 40, 47).
> `.rux-u-panel-title`, `.rux-u-caption` and `.rux-u-hint` were renamed to the shape names
> `.rux-text-heading-16` and `.rux-text-label-12` at step 31 and their aliases deleted at
> step 33; `.rux-u-eyebrow` was merged into `.rux-text-label-12` at step 47, once step 40
> dropped the uppercase that had distinguished it. `.rux-u-section-label` and
> `.rux-u-subtitle` survive, each because it adds something beyond the role. **This
> paragraph is deliberately not rewritten** — it records what step 3 did, which is still
> true of step 3. A record corrected into the present tense stops being a record.

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
| `.rux-u-record-list` | `base/utils.css:96` | portable utility whose *rule* is generic (flex column + gap) and whose *name* is now domain-neutral | — done (renamed from `.rux-u-trip-list`) |

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
| **Scoped descendant** — app content styled inside a portable block, or the block configured from the app's own scope | `.rux-app-view > .rux-workspace { min-width: 471px }` (pre-step-10: `.scheduler-app__module > …`), `.rux-table td[data-col="…"] .sched-priority-dot` | **Not a violation.** This is how an application is supposed to configure a portable block, and `docs/layout-composition.md` explicitly assigns the workspace minimum width to the app. |
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

> **Resolved by step 12 (2026-08-18).** All 69 now live in `scheduler/css/tokens.css`
> as `--sched-*`. The section below is the original finding.

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

> **Superseded in step 10 (2026-08-17):** the body element is now
> `class="rux-app__body"` — one portable class, configured from the app's scope
> (`.scheduler-app .rux-app__body`) — and `.rux-app-shell`/`__workspace`/`__panel`
> are deprecated aliases kept published until vendored consumers migrate.

**A bug this surfaced.** `--rux-shell-bg` was `var(--rux-danger)` — a debug value that had
shipped, giving any consumer of the portable shell a **red page**. It went unnoticed for
exactly the reason this audit exists: `index.html` used its own shell, so the portable one
was never rendered. `examples/app-layout.html` — the only page that did use it — had been
displaying it. Now `var(--rux-surface-1)`.

### 5.2 View container

> **Status: resolved (steps 7 and 10).** Step 7 extracted the JS half
> (`rux-ui/js/view-router.js`). Step 10 finished the CSS/markup half: the
> container is now `.rux-app-view` in `app-shell.css`, on the router's portable
> `data-view` contract.

`.scheduler-app__module` + `showModule()` (inline in `index.html`, at the time ~7369) was
the show-one-view router every multi-view app needs. `rux-ui/js/ui-shell.js:5` explicitly
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
escapes it. The `--rux-trip-bar-icon-size` exception recorded here is **resolved**:
`base/icons.css` no longer reads it (step 1), and the token is now
`--sched-trip-bar-icon-size`, declared on `.sched-trip-bar` in the application layer.

**Distribution model.**

| Model | When | Tradeoff |
|---|---|---|
| Copy the folder | first additional project | zero tooling, full ownership; copies drift immediately |
| Git-tagged dependency (`npm install github:<owner>/rux-ui#v1.0.0`) | once a second consumer exists | one-command updates, no drift; requires tagging discipline |

**Breaking change** = removing or renaming a public token or class. §3's rename program is
breaking by definition and is the reason for the policy amendment recorded in
`CLAUDE.md`.

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
| 10 | ~~View container class + body row rename (§5.2 CSS half)~~ **done (2026-08-17)** | `.scheduler-app__module` → `.rux-app-view` (base box model, `[hidden]` toggling, and overflow now live in `app-shell.css` beside the frame; the app keeps only its gutter padding), `class="rux-app-shell scheduler-app__body"` → `class="rux-app__body"`, and the routing attribute `data-module` → `data-view`, which is `view-router.js`'s portable default. `.rux-app-shell`/`__workspace`/`__panel` stay published as deprecated aliases until the vendored consumers sync their `rux-ui/` copy; removing them is a separate verified step. In passing, two provably invisible view backgrounds (documents/components painted the shell's own `--rux-surface-1` over itself) and three no-op declarations on the calendar view (`margin: 0` ×2, duplicate `overflow: hidden`) were removed per the 2026-08-17 layering audit — resolved-value identical in both themes. |
| 11 | ~~Promote the generic shell mechanisms into Tier 1 (§4.1)~~ **done (2026-08-18)** | The drawer, its spacing gutter, and the resize gutter moved to `rux-ui/css/base/drawer.css` as `.rux-drawer` / `.rux-drawer-gutter` / `.rux-resize-gutter`, and the side-nav overlay recipe became the opt-in `.rux-side-nav--overlay` + `.rux-side-nav-scrim` in `base/side-nav.css`. **The names were already specified**: `rux-ui/js/drawer.js` had shipped them as `RuxDrawer.configure()`'s portable defaults since step 8 and the CSS simply never followed, so matching them let `index.html` delete its entire `configure()` call — the app now runs on the module's own defaults. `examples/app-layout.html` had hand-rolled the side-nav recipe inline; its `<style>` block went from 62 lines to 8. Two `drawer.js` defaults still pointed at the deprecated `.rux-app-shell` and were corrected to `.rux-app` / `.rux-app__body`. |
| 12 | ~~Domain tokens out of Tier 0 (§4.7)~~ **done (2026-08-18)** | All 69 moved to a new `scheduler/css/tokens.css` under `--sched-*`, imported first by `components.css`. The one Tier 1 actually read, `--rux-trip-bar-head-backdrop-blur`, became `--rux-backdrop-blur` and stayed — it describes the value, not the feature that first needed it. Six section headers in `tokens.css` were left with no declarations and were removed; their explanatory comments moved with the tokens. `--rux-doc-viewer-width` and `--rux-bg-bus` were caught the same way and relocated. |
| 13 | ~~Complete the §3 namespace migration~~ **done (2026-08-18)** | The element half of step 5, finally paid: ~2,400 occurrences across 61 files. 16 component families (`.rux-trip-bar__*`, `.rux-trip-itinerary__*`, `.rux-team-chat__*`, `.rux-tasks__*`, …) and all 8 `.rux-scope-*` markers took the `.sched-` prefix, along with three markup-only stragglers (`.rux-driver-availability`, `.rux-cancel-trip-modal`, `data-rux-keep-trip-selection`). `.rux-col-filter-icon` was **not** renamed — it is defined in `base/table.css` and is genuinely portable; §4.2's listing of it alongside `.rux-col-picker` is misleading. The redundant `scope` marker was deliberately left in place (see below). |
| 14 | ~~Enforce both directions (§7 Enforcement)~~ **done (2026-08-18)** | `tests/portability-boundary.test.mjs` gains *the application layer invents no `.rux-*` blocks of its own* and *the portable layer names no application prefix anywhere*. The first derives its allowlist from what `rux-ui/` actually defines rather than hardcoding re-opens, so it cannot rot. Both accepted-violation lists are now empty. |
| 15 | ~~Delete the retired rail mechanism~~ **done (2026-08-18)** | The rail-collapse concept retired with the floating-window convergence but its scaffolding survived across both tiers. Removed after tracing every consumer: `.rux-panel--attached.is-rail` (2 rules, nothing ever added the class), the six `--rux-panel-rail-*` tokens, `RuxDrawer`'s `railWidth` option with `configuredRailWidth()` / `closedTargetWidth()` / `railWidthVar` and the `is-expanding` rAF dance (no call site passed `railWidth`, so every branch was unreachable), the `@container (max-width: 64px)` and `(max-width: 44px)` steps in `trip-panel.css`, and `trip-panel.js`'s tab-reopen bridge — which dispatched `rux:trip-tab-expand-request` from a branch guarded by `root.closest(".rux-drawer")`, always null since the trip editor became a floating window, to a listener that no longer existed. The two `@container` steps were verified unreachable by measurement, not inference: the query root is the floating dialog, and at a 320px viewport its container is 288px, so 520/400/320 still fire and only the sub-224px steps are dead. |
| 16 | ~~Prune orphaned Tier 0 tokens~~ **done (2026-08-18)** | Checked against the real consumers rather than deleted blind: `infor_ln_docs/portal` and `guide_runner` vendor `rux-ui/` at commit `157b427` and use **73** `--rux-*` tokens and **38** `.rux-*` classes — including `.rux-app-shell`, `__panel`, and `__workspace`, so the step-10 deprecated aliases **must stay**. Of the tokens unread here and unread there: the 12 unused rungs of a complete scale or palette were kept (a design system ships whole ladders), as were four that complete a published contract family whose siblings are live (`--rux-panel-bg`/`-shadow`, `--rux-side-nav-shadow`, `--rux-card-border-active`). Removed six genuine orphans: `--rux-card-header-radius` and `--rux-card-footer-radius` (self-documented as superseded — the shell owns radius), `--rux-elevation-0-bg` and `--rux-elevation-1-bg` (last rungs of the retired elevation ladder; `--rux-panel-modal-bg` now reads `--rux-surface-1` directly), and `--rux-panel-content-motion-duration`. Renamed `--rux-left-panel-border` → `--rux-panel-left-border` for symmetry with its live sibling `--rux-panel-right-border`. Moved `--rux-request-window-width` → `--sched-request-window-width`: it is the Request Inbox's window width, parallel to the three `--sched-*-window-width` tokens, and §4.7's noun list never contained "request". |

| 17 | ~~Overlay kernel + one registration idiom~~ **done (2026-08-20)** | Phase 2 of `docs/audit/design-system-audit.md`. `rux-ui/js/overlay.js` (`RuxOverlay`) now owns the single outside-pointerdown listener, the single Escape policy, the auto-id and `data-rux-modal-layer` helpers, and the focus trap/restore helper; menu, popover, suggestions, the modal, the drawer, the side nav, and the app's chat mention menu all register with it. Routing the drawer and side nav through it fixed a real bug the Phase 1 Escape patches introduced: their own document listeners fired alongside the overlay ones, so Escape with a menu open inside a drawer closed both. The kernel closes the topmost surface only. This deleted both overlay singletons and the private `rux:popover-open` protocol they used to stay in sync — including the app-side dispatch in `js/panels/team-chat.js` — along with `popover.js`'s `queueMicrotask` + `defaultPrevented` Escape workaround and its `ownedPopovers` set, all of which existed only because there were two singletons. `open()` now owns unhiding, so `RuxPopover.position()` is a safe pure reposition, and `suggestions.js` positions through that engine instead of its own hardcoded `margin = 8` / `+4`. **Event and markup contracts collapsed to one name each (no aliases):** `rux:segment-change` → `rux:segment-changed` and `rux:menu-close` → `rux:menu-closed` (past tense, bubbling; 13 listeners migrated), and `theme.js` keys solely on `[data-rux-theme-toggle]` — the `#theme-toggle` ID coupling and the now-dead `id` attribute are both gone. Every module also publishes a namespaced `Rux.<name>` entry beside its `Rux<Name>` global, and `utilities.js` merges into `window.Rux` instead of assigning, so it and `controls.js` can no longer wipe each other. **Not done, and deliberately:** removing any module's DOMContentLoaded self-init in favour of a single boot. `driver.html` and the vendored consumers load a subset of the modules and depend on that self-init, so it is a breaking change needing its own step. |

| 18 | ~~Utility prefix consolidation — `rux-u-*`~~ **done (2026-08-20)** | Phase 3 item 15 of `docs/audit/design-system-audit.md`. `docs/cards.md`'s three-prefix contract makes `rux-u-*` the utility namespace, but six utilities still carried bare component-shaped names — two of them *defined inside `utils.css`* — and `.rux-muted`/`.rux-subtle` were byte-identical duplicates of one another. **Decision:** `cluster`, `stack`, `row`, and `spacer` are utilities, not components — single-rule layout helpers with no elements or modifiers — so the prefix question the design audit left open (B5) is settled the same way for all four. Final names, with **no aliases**: `.rux-u-mono`, `.rux-u-muted` (one rule replacing the muted/subtle pair), `.rux-u-cluster`, `.rux-u-stack`, `.rux-u-row`, `.rux-u-spacer`. All 38 in-repo call sites migrated; the old names are gone. |

| 19 | ~~Modifier-synonym consolidation~~ **done (2026-08-20)** | Phase 3 item 13 of `docs/audit/design-system-audit.md` (B1): the same semantic role carried two-to-four different modifier names, so no consumer could predict an API they had already learned once. One name per role now, **no aliases**: `--fill`/`--even` → `--block` (tabs, segmented), `--borderless` → `--ghost` (card), `--boxed` → `--solid` (card **and** `.rux-output`, which the design audit's table missed), `--optional` → `--responsive` (`.rux-ui-header__utility`), `--stacked` → `--stack` (`.rux-view-options__row`). **The button size scale went with them:** `--compact` → `--sm` (24px) and `--header` → `--lg` (40px), leaving unmodified as the 32px default. The token layer had already voted — `--rux-button-icon-size-compact: var(--rux-icon-sm)`, `…-header: var(--rux-icon-lg)` — and `.rux-avatar--sm`/`--lg` already shipped, so this is now one size vocabulary across the system rather than a per-component dialect. `tests/ui-shell.test.mjs` previously banned `--sm` outright, grouping it with `--outline` and `--on-accent`; that ban existed because `--sm` named nothing, and it is replaced by assertions that both rungs resolve to their height tokens. 107 call sites migrated. |

| 20 | ~~One block per component; one word for the overlay dimmer~~ **done (2026-08-20)** | Phase 3 item 14 of `docs/audit/design-system-audit.md`. `.rux-notifications-menu` → `.rux-notifications`, so the block name matches the eight `.rux-notifications__*` elements it owns (B3 — the split originated in §4.2 of this document listing them as two units). `.rux-segmented__indicator`, sole member of a `rux-segmented` block that otherwise did not exist, → `.rux-segmented-track__indicator`, an element of the block that actually contains it (D4). **Scrim (H4)** resolved in both halves. *Naming:* `.rux-modal-backdrop` → `.rux-modal-scrim`, so all three dimmers use the one word the token layer had already chosen (`--rux-overlay-scrim`); `.rux-drawer-scrim` and `.rux-side-nav-scrim` were already correct, so renaming the odd one out gave a single vocabulary without inventing a shared base class that every markup site would have had to carry. 16 sites including the overlay kernel's `MODAL_LAYER_HOSTS`. *Behaviour:* side-nav was the one scrim that could not be retuned with the rest — it painted `var(--rux-black)` at `opacity: 0.65` while the other two painted `--rux-overlay-scrim` (60% black) at full opacity. It now reads the shared token with `opacity: 1`, exactly matching how the drawer scrim already worked, so opacity is purely the fade mechanism and darkness lives in one token. **This changes what renders: the side-nav scrim goes from 0.65 to 0.60 black** — authorized deliberately, and still wants an eyeball in both themes. |

| 21 | ~~Contract tests for the audit's design rules~~ **done (2026-08-20)** | Phase 4 item 19 of `docs/audit/design-system-audit.md`. Four new suites, 18 tests, taking the total from 256 to 274. Each was verified to fail when violated before being accepted — a contract test that cannot fail protects nothing. **`class-resolution`** closes the blind spot `CLAUDE.md` names: nothing else in the suite reads a class attribute, so a rename that misses a page fails silently. It earned its place immediately by catching a live bug from step 19 — `request.html` still carried `.rux-card--boxed`, because that page was missing from the rename's target list — and four ghost classes, plus two dead modifiers (`--identity`, `--presence`) that no CSS, JS, or test read. **`state-contract`** (R3) enforces aria-as-state and flags any `.is-*` or `data-rux-*` written by JS that nothing reads. It found that `data-rux-accent` is written and persisted while no rule reads it, so `Rux.setAccent()` has no visible effect — already recorded as a deliberate gap in README, so it is an accepted entry rather than a fix. **`prefix-contract`** (R4) enforces the namespaces and drove the `--_rux-*` → `--_*` collapse to one private convention (32 sites). **`focus-contract`** (R8) enforces that a file styling `:hover` also styles `:focus-visible`; the five gaps it found were closed rather than accepted — menu items get a real roving-focus ring, notification rows and profile rows get `:has(:focus-visible)` parity with their hover highlight, sortable table headers get a ring ready for whenever a consumer makes them focusable, and hover-only tooltips now appear on keyboard focus too. Each suite carries an ACCEPTED list seeded with current debt and an honesty test that fails when an entry goes stale — the mechanism §7 proved. |
| 22 | **Modifier-synonym consolidation, second pass** — `--default` → `--solid`; `.rux-card--solid` → a chrome-specific name; `--default-size` → `--sm` or dropped | **Proposed 2026-08-22, not executed.** Class C, so it stops here first. `docs/foundations/naming.md` step 3 answered its Q1 and Q2 and enforced what it could — `tests/modifier-vocabulary.test.mjs` now forbids `--md`, pins the one known collision, and carries these three as a pending list that may only shrink. What is left is the rename itself, which is this ledger's. **Entry 19 is the precedent and the reason**: it consolidated the same class of defect on 2026-08-20 (`--fill`/`--even` → `--block`, `--borderless` → `--ghost`) with **no aliases**, and three synonyms have accumulated since. **The three.** *(a)* `.rux-button--default` is the neutral filled variant, which is `--solid`'s meaning on `.rux-badge` and `.rux-output` — one concept, two names. *(b)* `.rux-card--solid` is the inverse and the harder one: `--solid` there means *adopt the shell's chrome*, not *filled*, so one name carries two concepts and the card is the side that moves. *(c)* `.rux-panel--default-size` is a size outside the `--sm`/`--lg` vocabulary; it compounds only with `--floating`, so it may not need a name at all. **Needs the grep protocol per `CLAUDE.md`** before execution — `--solid` alone spans four blocks across three files, and the suite covers neither HTML class attributes nor JS selectors, so a class with no CSS left can still be a live query hook. |

> **A rejected enforcement idea, recorded so it is not retried.** A test asserting
> that Tier 0 defines no token read only by the application layer sounds like the
> general form of §4.7, but it is invalid: a *component contract* token exists to be
> read by the consumer, not by `rux-ui/`'s own CSS. `--rux-table-wrap-bg`,
> `--rux-panel-right-border`, the palette, and the type/space scales all trip it —
> 45 false positives. The `--rux-request-window-width` leak was found by naming
> analysis instead (a single-member token group sitting parallel to three
> `--sched-*-window-width` siblings), which is the technique worth repeating.

**Enforcement.** Step 2 adds a test asserting that no file under `rux-ui/` references a
domain noun in a selector, and that every `var(--rux-*)` used in `rux-ui/` resolves within
`rux-ui/`. Without it this boundary erodes exactly as it did the first time. The §2
commands are the implementation.

---

## Known drift

Recorded here so execution does not mistake it for regression.

- ~~**18 tests fail on `main`**~~ **stale.** The suite is green: 197/197 as of 2026-08-18
  (195 before steps 11–14 added two). Compare against green, and treat any failure in
  `layout-contract`, `motion-contract`, or `ui-shell` as a real regression.
- ~~`Calendar workspace is inset while tools remain full-bleed`~~ **resolved.** The rule is
  now `.rux-app-view[data-view="calendar"] .sched-scope-right-panel` and the test matches it.
- Line numbers in this document drift. Cite by symbol and confirm before acting.
