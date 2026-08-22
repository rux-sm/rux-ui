---
name: ponytail-review
description: >-
  Review a diff for over-engineering — what to delete, not what is broken. One
  line per finding: location, what to cut, what replaces it. Use when the user
  says "review for over-engineering", "what can we delete", "is this
  over-engineered", "simplify review", "too much code", or invokes
  /ponytail-review. Scoped to a diff or a named file — for a whole-repo pass
  use the design-audit command instead, and for correctness, security, or
  accessibility use /code-review. Does not apply fixes.
user-invocable: true
---

# Ponytail Review

Review the diff for unnecessary complexity, and nothing else. One line per
finding: location, what to cut, what replaces it. The diff's best outcome is
getting shorter.

Adapted from `ponytail-review` (MIT, DietrichGebert/ponytail). The deletion
bias is kept; the gate below is this repository's addition and is not optional.

## Hard stop: these names leave this repository

`rux-*` classes, `--rux-*` tokens, and exported `rux-ui/js/` APIs are consumed
by vendored applications that pin a tag. This repository cannot see them.
**A name with no caller here is not a name with no caller.**

`v0.1.0` renamed `.rux-card--boxed`, `.rux-cluster`, and `.rux-button--header`;
the consumer using them kept building green and silently lost its styling
(`docs/design-system-distribution.md` §4). `tests/class-resolution.test.mjs`
proves classes resolve *within this repository* and knows nothing about any
consumer. HTML class attributes and JS selectors are not covered by the suite
either, so a class with no CSS left can still be a live query hook.

Never emit `delete:` or `yagni:` against a public `rux-*` name. Emit `classC:`
instead — name it, say what would replace it, stop there. Removal is a Class C
amendment: propose-first, with the grep protocol from `CLAUDE.md`, never a
review line. Everything under `scheduler/`, `js/`, and the app's own `--sched-*`
vocabulary is app-internal and reviewable normally.

## Hard stop: the overlay kernel is the design, not the duplication

`rux-ui/js/overlay.js` owns one outside-`pointerdown` and one Escape policy for
every dismissible surface, plus the focus trap and layer promotion. Six modules
— `menu.js`, `drawer.js`, `popover.js`, `suggestions.js`, `ui-shell.js`,
`utilities.js` — carry a comment deferring to it, and
`docs/foundations/state.md` rule 2.5 makes it a rule, enforced by
`tests/overlay-kernel.test.mjs`.

So the obvious `native:` line — *"`<dialog>` or `popover` gives focus trap and
outside-click free"* — is **wrong here**, and it is the first thing a deletion
reviewer reaches for. `<dialog>`'s own Escape handling would be a second
Escape policy, which is the exact defect rule 2.5 exists to prevent. Four
hand-rolled modal scrims in `index.html` are deliberate.

`native:` against a surface that registers with the kernel needs a reason that
survives rule 2.5, or it does not get written.

## Format

`<file>:L<line>: <tag> <what>. <replacement>.`

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `builtin:` hand-rolled thing the platform ships. Name it — `Intl`, `URLSearchParams`, `structuredClone`, `node:test`, an `Array` method.
- `native:` JS doing what CSS or HTML already does. Name the feature — `<dialog>`, `popover`, `:has()`, `:focus-visible`, `prefers-reduced-motion`, native form validation.
- `token:` a new primitive where an existing `--rux-*` token or `.rux-*` component already covers it. Name the existing one.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.
- `classC:` a cut that would remove a public `rux-*` name. Describe, do not recommend.

## Examples

❌ "This helper might be more complex than necessary, have you considered
whether all of this is needed at this stage?"

Every example below is a real finding in this repository, checked at the line
cited. The first two are deliberately paired: they look identical from a grep
and only one of them may be cut.

✅ `js/core/bus-slots.js:L15: delete: legOf is exported and imported nowhere. Its only caller is assignmentsOnLeg on L33, same file — drop the export keyword, keep the function.`

✅ `rux-ui/css/base/form.css:L642: classC: .rux-color-picker appears in no markup or JS in this repository or in the consuming portal. But it is 7 elements, 43 rules and 20 public --rux-color-picker-* tokens, and whether .rux-color-swatch superseded it or it was simply never wired up is not decidable from the code. Propose, never cut.`

✅ `js/core/billing-config.js:L47: builtin: JSON.parse(JSON.stringify()) as a deep clone. structuredClone is the same one line and survives Date, Map and Set, which the JSON round-trip silently flattens. Same at js/data/trip-db.js:L302.`

✅ `js/panels/trip-panel.js:L544-546: native: syncPaymentButtons() only ever assigns display:flex — nothing in js/ sets display back. .sched-scope-trip__payment-rows already owns that layout at trip-panel.css:L433, using :has() for the conditional part. Ten call sites across two panels for a constant.`

✅ `scheduler/css/tokens.css:L118-121: token: four --sched-trip-bar-icon-* tokens with one consumer each (trip-bar.css:L251-254). -fill, -grade and -optical-size equal --rux-icon-fill-selected, --rux-icon-grade-default and --rux-icon-optical-size-md exactly. Only -weight diverges (400 against the default 300), so three of the four are indirection with nothing behind it.`

## Out of scope

- Correctness, security, performance, accessibility bugs. Route to `/code-review`.
- Whole-repo scans. That is the `design-audit` command, which already carries the "live query hooks that look dead" guard.
- **Required records are not bloat.** A `docs/foundations/` amendment-log step, a recorded rejected alternative, before/after px values on a Class B step, a reported grep hit count — `CLAUDE.md` requires all of these. Never flag them as prose to cut.
- A contract test, or the one check a non-trivial change leaves behind, is the minimum, not bloat.
- **A ratchet is not unused config.** `PENDING_TEXT_RESET`, `PENDING_ICON_SIZING`,
  `ACCEPTED_SPLITS`, `KNOWN_GAPS`, `ACCEPTED_BARE_ATTRIBUTES` and their kin are
  allow-lists that exist to *shrink*, and several are asserted never to grow. An
  empty one is the goal reached, not a leftover — `class-resolution`'s empty list
  is what proves R5 holds. Never flag one as dead.
- **One caller is normal in `js/data/`.** A CRUD module exports a function per
  operation and each has exactly one panel calling it. That is the shape, not an
  abstraction with one implementation. `yagni:` wants indirection that adds a
  layer, not a function that adds a query.

## Scoring

End with `net: -<N> lines possible.` If there is nothing to cut, say
`Lean already. Ship.` and stop. Do not apply the fixes; list them.
