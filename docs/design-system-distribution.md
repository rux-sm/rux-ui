# Design System Distribution

How Rux UI reaches the applications that use it. The companion document is
`docs/portability-audit.md`, which fixes *what* is portable; this one fixes
*how* it travels and *what proves the copy is sound*.

The terms **MUST**, **SHOULD**, and **MUST NOT** describe required, preferred,
and prohibited behavior.

---

## 1. Model

> **Reconsidered and kept — see §7.** The vendored snapshot was measured against
> an npm dependency on 2026-08-22 and the alternative was **declined**: the one
> benefit it offered was already delivered by the consumer's drift job, and the
> failure that has actually bitten twice is model-independent. §1–§6 are in
> force; §7.0 records the reasoning.

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
   out of the classification silently. `docs/foundations/` is the one directory
   shipped wholesale (`DOCS_SHIP_DIRS`) rather than file by file: every document
   in it is shared design authority by definition, and a new section must reach
   consumers without an edit here. Those documents **outrank a consumer's own
   specifications** on the vocabulary they define, and each carries a contract
   version a consumer's specs declare conformance to.
7. Strips `?v=N` cache-busters from `@import` lines — a bundler resolves them
   as literal filenames. This is the only edit the copy receives.
8. **Verifies every `@import` in `css/rux.css` resolves.**
9. Writes `VENDORED.md` with the version and profile.

A consumer MUST NOT reimplement this. It keeps a thin wrapper naming its
destination, its profile, and its own build command.

This tooling runs on a developer's Mac *and* on a Linux CI runner, so it MUST
avoid platform-specific shell. `sed -i` is the trap: BSD requires `-i ''` and
GNU requires the suffix attached to the flag, and neither parses the other's
form. Write through a temp file instead of editing in place. This was not
hypothetical — the first CI run failed on exactly that line.

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

**That check now lives here, not in each consumer**: `tools/check-consumer.mjs`.

```bash
tools/check-consumer.mjs --app <dir> [--design-system <dir>] [--exclude <path>]...
```

It reads the `rux-*` classes and `--rux-*` tokens out of an application's own
files and fails when the copy does not define them. It enforces **both** of
§4's rules — undefined or invented names, and interpolation into the `rux-`
namespace — and it excludes **every** Rux UI copy inside the application, so
pointing `--design-system` at an out-of-tree checkout is a **pre-sync dry run**:
it answers *what would break if this consumer moved to that version* before
anything is copied.

It lives upstream because every consumer needs the identical check, a consumer
that skips it fails silently, and it is required under §7's npm model exactly as
it is under this one. Markdown is deliberately not scanned — a changelog naming
a class it removed is not a use.

> **Recorded because it argues for the tool better than the tool does.** The
> `v0.1.5` tag message lists the tokens this check would flag in the live
> portal. That list was assembled by hand with `grep -F` and is **wrong in both
> directions**: it names `--rux-border`, which is a substring of the
> `--rux-border-width` the consumer actually writes and which is still defined,
> and it misses `--rux-text-faint` and `--rux-text-muted`, because the hand pass
> only tested tokens removed *since v0.1.4*. The authoritative answer is
> `tools/check-consumer.mjs --app <portal> --design-system <this repo>/rux-ui`:
> **11 undefined tokens and 1 invented one, all in `portal/app/globals.css`.**
> Read the tool, not the tag.

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
4. Wire `tools/check-consumer.mjs` into the consumer's own CI, and add the
   scheduled drift job.
5. Load `css/rux.css` before application styles; under `full`, load
   `js/overlay.js` before the other behaviors.

---

## 7. Proposal — replace the vendored snapshot with an npm dependency

**Status: DECLINED 2026-08-22. §1–§6 remain in force and this section is kept as
the record of why, not as a plan.** It is written in the future tense throughout
because it was a live proposal for a few hours; read it as history. §7.0 is the
decision.

### 7.0 Why it was declined

**The proposal existed to buy one thing — staleness detection — and that turned
out to be already delivered.** §7.1's correction has the detail: the consumer's
`sync-design-system.yml` pins the latest tag weekly, re-vendors through the
upstream script, runs its name check and opens a pull request. §5 is not an
unfunded prescription; it is implemented and working.

**The measurement that prompted the proposal was misread.** 87 commits of drift
looked like blindness and was **release cadence** — the job syncs to *releases*,
and nothing had been tagged since `v0.1.4`, so it was correctly idle. npm would
not have helped: a package with no new version published is exactly as quiet.
Tagging `v0.1.5`, `v0.1.6` and `v0.1.7` is what actually closed that gap.

**Three further reasons, each on its own sufficient to leave §1–§6 alone:**

- **The failure that has genuinely bitten twice is model-independent.**
  `v0.1.0`'s renames and `v0.1.5`'s 81 removed tokens both passed a green build.
  npm catches neither, because CSS class usage is strings. §7.3 said so, and it
  is why `tools/check-consumer.mjs` mattered more than the distribution
  mechanism did.
- **§7.4's weakest point never got an answer.** `docs/foundations/` and the
  `rux-design` skill ship into `design-system/` so a consumer's agent stays
  on-system; finding them inside `node_modules` is worse, and no one proposed a
  fix.
- **What survives is narrower than a distribution change.** Both the drift job
  and the name check are bespoke per consumer, so a second consumer rebuilds
  them. That is an argument for moving them **upstream** — which
  `check-consumer.mjs` did for one of them — not for changing how files travel.

**What would reopen this:** a second consumer that cannot vendor, or one on a
toolchain where a copied directory is genuinely awkward. Neither exists today,
and §7.2's mechanics are recorded below so that reader does not start from
scratch.

**Read §7.7 as *what would have to be true*, never as a checklist.**

### 7.1 The measurement that prompted it

The latest tag is **`v0.1.4`**. `HEAD` is **87 commits past it**, and the one
live consumer is pinned to `v0.1.4`. Nothing noticed, and nothing was going to.

> **Correction, 2026-08-22, and it weakens this proposal.** The paragraph below
> originally said §5's scheduled drift job "has never been built" and called §5
> an unfunded prescription. **Both are false.** The consumer has
> `.github/workflows/sync-design-system.yml`: a Monday cron that checks out
> rux-ui, pins the **latest tag** rather than HEAD, re-vendors through the
> upstream script, detects drift, runs its name check as a non-blocking report,
> and opens a pull request. §4 and §5 are implemented, and implemented well.
>
> **Which means the 87-commit gap was not a detection failure at all.** The job
> pins a *release*, and this repository had not been tagged since `v0.1.4`. It
> was correctly doing nothing, because there was nothing to sync to. The gap was
> **release cadence here**, not blindness there — and npm would not have fixed
> it, because a package with no new version published is equally quiet.
>
> That removes the one benefit §7.2 claims. Read the rest of this section with
> that in mind: it is now a proposal in search of a problem, and §7.7 should be
> read as *what would have to be true*, not as a plan.

**A snapshot still has no notion of "you are behind" on its own** — §5 exists
because of that, and §5 is answered. What remains true is narrower: the answer
is bespoke per consumer, and a second consumer must build it again.

### 7.2 The proposal

A consumer declares a dependency on a tag instead of holding a copy:

```json
"dependencies": { "rux-ui": "github:rux-sm/rux-ui#v0.1.5" }
```

No registry, works from a private repository, and the consumer imports
`rux-ui/css/rux.css` directly. Rux UI is plain CSS with no build step, which is
what makes this clean rather than merely different.

| Exists today | Becomes |
|---|---|
| `tools/vendor-into.sh` export set | package.json `files` |
| `VENDORED.md` stamping | package.json + lockfile, with integrity hashes |
| §5's unbuilt scheduled drift job | `npm outdated`; Dependabot or Renovate opens the PR |
| `design-system/` committed to the consumer | nothing — it resolves into `node_modules` |
| §3 step 8, `@import` verification | still ours, as a publish-time check |

### 7.3 What this does NOT fix, stated first because it is the part that bit us

**Gate 2 — the consumer name check — is required under every option, and npm
does not help.**

CSS class usage is strings. When `v0.1.0` renamed `.rux-card--boxed`,
`.rux-cluster` and `.rux-button--header`, the consumer kept building green and
the elements silently lost their styling. **An npm install would have done
exactly the same thing.** A renamed class is not a build error, not a type
error, and not a test failure, whether the file arrived by `rsync` or by
`npm install`.

Any framing of this proposal as "npm makes the gates unnecessary" is wrong.
§4's three gates survive intact; only their *plumbing* changes.

**Tagging does not go away either.** npm needs a version. It is the same ritual
with standard tooling around it, not one ritual fewer.

### 7.4 What it costs

- **The `?v=` strip still has to happen.** §3 step 7 exists because a bundler
  resolves `?v=N` as a literal filename. That transform moves from the export
  script to a `prepack` script. Smaller, not gone — and it remains **the only
  edit the copy receives**, which is a property worth keeping.
- **A no-build consumer gets harder, not easier.** A plain-HTML application
  cannot `<link>` into `node_modules` unless its server serves that path. Today
  this is hypothetical: the one live consumer is Next.js, and the `full`
  profile's only user, `guide_runner`, is archived. It stops being hypothetical
  the moment a static consumer appears, and this proposal should be re-read then
  rather than assumed to still hold.
- **Docs and the skill ship differently.** §3 steps 5 and 6 copy `README.md`,
  the `rux-design` skill, and `docs/foundations/` wholesale so agents editing a
  consumer stay on-system. `files` can carry them, but *finding* them inside
  `node_modules` is worse than finding them in `design-system/`. **This is the
  weakest part of the proposal** and wants an answer before adoption.

### 7.5 Rejected, recorded so they are not revisited

- **Git submodules.** Pins a commit with no version semantics, and the developer
  experience is worse than what exists today. Strictly worse than both options.
- **Hosted CSS from GitHub Pages.** The repository already has `.nojekyll`, so
  this is closer than it looks, and install cost drops to zero. Rejected anyway:
  it is a runtime dependency on an external host, it cannot be pinned without
  versioning the URL path, it breaks offline development, and it costs a
  framework application real performance. Acceptable for a throwaway prototype;
  wrong for anything maintained.

### 7.6 A simplification proposed here and then withdrawn (before §7 itself was)

> **Withdrawn 2026-08-22, before execution.** This section said: *retire the
> `full` profile — its only consumer, `guide_runner`, is archived, and two
> profiles means every export question is asked twice with one answer having no
> reader.* Measuring it before acting killed it.
>
> **The footprint is ~10 lines** — one `if` branch carrying an `rsync`, and one
> `PROFILE_NOTE` variant. **And the mode is not hypothetical: this repository's
> own reference application is plain HTML and loads 17 behaviour modules.**
> `full` describes exactly how `index.html` consumes the system.
>
> So "its only consumer is archived" proves the profile is **unused
> externally**, not that it is **wrong** — the distinction `naming.md` §8.2 was
> careful about with `.rux-color-picker`, where what settled the retirement was
> finding two live components already covering its ground. Nothing covers
> `full`'s. Retiring it would remove a supported consumption mode to save ten
> lines, and it would be re-added the first time a static consumer appears.
>
> **Keep both profiles.** The one thing worth doing is what this note does:
> record why, so the idea is not proposed a third time.

### 7.7 What would have to be true to adopt

1. An answer to §7.4's docs-and-skill question — where a consumer's agent reads
   `docs/foundations/` from once it lives in `node_modules`.
2. A `prepack` step carrying §3's `?v=` strip and `@import` verification, so the
   published package keeps the guarantees the export script provides today.
3. The consumer's name check kept and, ideally, moved upstream so every consumer
   inherits it rather than writing its own.
4. `v0.1.5` tagged, since **87 commits** of unvendored change is the migration's
   real content and should land as one reviewable move either way.
