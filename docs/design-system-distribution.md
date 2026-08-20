# Design System Distribution

How Rux UI reaches the applications that use it. The companion document is
`docs/portability-audit.md`, which fixes *what* is portable; this one fixes
*how* it travels and *what proves the copy is sound*.

The terms **MUST**, **SHOULD**, and **MUST NOT** describe required, preferred,
and prohibited behavior.

---

## 1. Model

This repository is the source of truth. A consuming application holds a
**stamped snapshot**, not a live link:

```
rux-ui  ──(tools/vendor-into.sh)──▶  <app>/design-system/   ← overwritten as a unit
  │                                          │
  └── tag: v0.1.0                            └── VENDORED.md: version + profile
```

Consequences that follow from "snapshot, not link":

- Shared changes MUST be made here. The copy is replaced wholesale, so an edit
  inside it is destroyed by the next sync without warning.
- A copy goes stale silently. Nothing in the consumer notices that this
  repository moved, which is why §5 exists.
- This repository MUST be tagged before vendoring. A copy stamped `v0.1.0` is
  one a consumer can reason about; a copy stamped with a bare commit hash is not.

Pre-1.0, a minor version MAY carry breaking renames. Consumers pin a tag and
review the diff when they move.

## 2. Profiles

Chosen by whether the application owns its own DOM.

| Profile | Ships | For |
|---|---|---|
| `full` | `css/` + `js/` | Plain-HTML applications that run the shared behaviors |
| `css-only` | `css/` | Framework applications that reimplement the behaviors natively |

A framework owns the DOM, so a vanilla script mutating `aria-expanded` or
`inert` fights hydration and loses. Such an application reimplements the
behavior and takes `css-only`; vendoring behavior JS it never loads is dead
weight re-reviewed on every sync.

The cost of `css-only` is real and MUST be managed: the reimplementation is a
second copy of a shared contract with nothing linking it back. Cite the module
it mirrors in a comment, and re-read that module whenever the contract changes.

Under `full`, load `js/overlay.js` **first** — it is the overlay kernel that
owns outside-press, Escape, and focus trapping, and menu, popover, drawer,
suggestions, and ui-shell all delegate to it.

## 3. The export

One script owns what leaves this repository:

```bash
tools/vendor-into.sh --dest <app>/design-system --profile css-only
```

In order, it:

1. **Refuses a dirty tree.** An untraceable snapshot defeats the stamp.
2. Resolves the version with `git describe`.
3. `rsync --delete` of `css/` — so upstream *deletions* propagate too.
4. Copies `js/` only under `full`; removes it under `css-only`.
5. Copies `README.md` and the `rux-design` skill as `SKILL.md` with its
   `references/`, so agents editing the consumer stay on-system.
6. Copies allowlisted docs, and **warns about any doc it does not recognize**.
   The walk is recursive: a new subdirectory is exactly what otherwise slips
   out of the classification silently.
7. Strips `?v=N` cache-busters from `@import` lines — a bundler resolves them
   as literal filenames. This is the only edit the copy receives.
8. **Verifies every `@import` in `css/rux.css` resolves.**
9. Writes `VENDORED.md` with the version and profile.

A consumer MUST NOT reimplement this. It keeps a thin wrapper naming its
destination, its profile, and its own build command.

## 4. Gates

Three gates, because no one of them is sufficient:

| Gate | Catches | Blind to |
|---|---|---|
| `@import` verification | a partial or broken copy | renames |
| Consumer name check | renamed, dropped, or invented names | how it looks |
| Consumer build + tests | type errors, broken pages | CSS that matches nothing |

The middle gate exists because of a real incident: `v0.1.0` renamed
`.rux-card--boxed`, `.rux-cluster`, and `.rux-button--header`, and the consumer
using them kept building green while the elements silently lost their styling.
**A renamed class is not a build error, not a type error, and not a test
failure.** This repository's own `tests/class-resolution.test.mjs` cannot help:
it proves classes resolve *within this repository* and has no knowledge of any
consumer, which is precisely how classes only a consumer used looked dead and
were pruned.

A consumer therefore SHOULD carry a check that reads the `rux-*` classes and
`--rux-*` tokens out of its own markup and fails when the vendored copy does
not define them.

Two rules fall out of that incident:

- Consumers MUST NOT interpolate into the `rux-` namespace. Building
  ``rux-badge--${priority}`` fabricates class names this system never defined,
  and no gate can catch it. Map values to explicit class names instead.
- Consumers MUST NOT add new names under the `rux-` prefix. Application styling
  belongs under the application's own prefix.

## 5. Staying current

A snapshot goes stale between sessions, so the trigger MUST NOT be human
memory. Each consumer SHOULD run a scheduled job that re-vendors the latest tag
against a checkout of this repository, runs its gates, and opens the drift as a
pull request. It never pushes to the consumer's main branch.

A name-check failure SHOULD NOT block that pull request — losing the drift is
worse than surfacing it with a warning attached.

## 6. Adding a consumer

1. Tag this repository if it has moved since the last release.
2. Run `tools/vendor-into.sh --dest <app>/design-system --profile <profile>`.
3. Add a thin wrapper in the consumer that resolves this repository from an
   argument, an environment variable, then a sibling checkout — never a
   hardcoded home directory — and runs the consumer's build afterwards.
4. Add the name check and the scheduled drift job.
5. Load `css/rux.css` before application styles; under `full`, load
   `js/overlay.js` before the other behaviors.
