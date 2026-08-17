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
| `.rux-table` | `features/comp-driver-app.css:150` | **none** — 21 `--rux-table-*` tokens **already live in Tier 0** | none | **Portable — do first** |
| `.rux-status-text` | `features/comp-driver-app.css:248` | none — 5 lines mapping semantic color | none | **Portable** |
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

**The inversion is already half-done.** `base/utils.css:63` shows the target state and the
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

This is permitted, but it MUST be done through documented hooks (tokens or modifiers), not
by restyling the block's internals. Each row MUST be resolved during execution into either
a Tier 0 token the app sets, or a Tier 1 modifier the app applies.

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

Execution MUST diff the two rule sets and classify each scheduler addition:

| Addition | Likely resolution |
|---|---|
| `row-gap: var(--rux-shell-ui-header-gap)` | Tier 0 token; already named like one |
| `margin` (outer) | app-level — the shell MUST NOT assume page insets |
| `block-size: calc(100dvh - …)` | Tier 1 modifier (`--fullheight`) or app-level |
| `background` | Tier 0 token |

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

To become honestly portable it MUST: accept its drawer element by reference or a
configurable selector rather than hardcoding `.scheduler-app__drawer`; read its width from
a `--rux-*` token with the app overriding it, not from
`--scheduler-app-right-drawer-default-width`; and have its docblock rewritten against the
Tier 1 contract. Its CSS moves per the §4.1 drawer row.

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
`scheduler/css/components.css` and into `rux.css`. `index.html` was updated; `d.html`,
`m.html`, and `request.html` were not, and rendered every `.rux-*` component unstyled until
it was caught. The repository has **five** pages that use `.rux-*` classes — `index.html`,
`request.html`, `m.html`, `d.html`, `examples/app-layout.html` — and `doc.html` plus
`documents/form_cca.html`, which are self-contained and use none. Any change to the
entrypoint contract MUST be applied to all five. `tests/portability-boundary.test.mjs`
now enforces this.

---

## 7. Sequencing and enforcement

Ordered by dependency and blast radius. A later session MAY start at step *n* without
re-deriving anything above.

| # | Step | Why here |
|---|---|---|
| 1 | Fix `base/icons.css:48` — the one clean move in §4.4 | Genuinely small and additive, and the only *functional* break a consumer hits today. Do it alone so it is trivially reviewable. |
| 2 | Land the enforcement test (below), seeded with the current §4.4 inventory as an accepted-violations list | Locks in step 1 and stops new leaks immediately, without blocking on the recipe inversions. Shrink the list as steps 3 and 8 land. |
| 3 | Invert the §4.4 shared typography recipes into Tier 1 utilities | The bulk of the boundary debt. Touches 4 portable files and every app file that borrowed a recipe; needs its own review pass. |
| 4 | Extract §4.2 Portable rows, starting with `.rux-table` | Pure moves, no renames, little to no test coverage. Immediate payoff for a second app. |
| 5 | Namespace migration `.rux-*` → `.sched-*` (§3) | Mechanical but wide. Must precede shell work so that work happens once, under final names. |
| 6 | Resolve §4.5 re-opened blocks into tokens/modifiers | Needs step 5's names to be final. |
| 7 | Extract the view container (§5.2) | Additive; the app keeps its router until the portable one is proven. |
| 8 | Decouple `drawer.js` (§5.3) | Touches both tiers; safer once the drawer CSS split is decided. |
| 9 | Shell reconciliation (§5.1) | Highest regression risk. Last. |

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
