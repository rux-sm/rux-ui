# Rux UI Foundations — Motion

**Contract version: 1.0.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 3 steps: **1 done · 2 open**
This document is canonical for **how long a change takes and what curve it follows** — the
duration and easing scales, which curve an entrance, an exit and a continuous movement each
take, what may be animated at all, and what must keep working when motion is switched off.
It is the home `README.md` §1 routes **R6's duration and easing half** to; the colour half
went to [`color.md`](color.md) rule 2.1.

**Geist publishes no motion page.** This is the **second** foundation rule this repository
originates rather than adopts — `layout.md`'s breakpoints were the first, for the same
reason. Everything below is measured from this repository's own tokens and stylesheets,
not read off a source, and the amendment log should stay honest about that: there is no
upstream to defer to when a question here is hard.

**It does not own component recipes.** `../motion.md` is the component tier — which token a
panel, a menu or a scrim consumes, and the verification checklist for each. This document
owns the scales those recipes draw from. Where the two disagree, this one wins and the other
is corrected in the same change.

---

## 1. The vocabulary

### 1.1 There are two duration scales, and they are not aliases

Both are published. Neither is deprecated. They carry **different values**.

| Carbon-derived set | Value | | Short set | Value |
|---|---:|---|---|---:|
| `--rux-motion-duration-fast-01` | 70ms | | `--rux-duration-instant` | 80ms |
| `--rux-motion-duration-fast-02` | 110ms | | `--rux-duration-fast` | 140ms |
| `--rux-motion-duration-moderate-01` | 150ms | | `--rux-duration-base` | 220ms |
| `--rux-motion-duration-moderate-02` | 240ms | | `--rux-duration-slow` | 720ms |
| | | | `--rux-duration-productive` | → `moderate-01` (150ms) |

**Only one token bridges them.** `--rux-duration-productive` resolves into the Carbon set;
every other rung on the right is its own value. 80 is not 70, 140 is not 110, and 220 is not
240. Reading this table as "two names for one scale" is the mistake it exists to prevent.

### 1.2 Two easing vocabularies, likewise

| Carbon-derived | Curve |
|---|---|
| `--rux-motion-easing-entrance-productive` | `cubic-bezier(0, 0, 0.38, 0.9)` |
| `--rux-motion-easing-exit-productive` | `cubic-bezier(0.2, 0, 1, 0.9)` |
| `--rux-motion-easing-standard-productive` | `cubic-bezier(0.2, 0, 0.38, 0.9)` |

| Short set | Curve |
|---|---|
| `--rux-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--rux-ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |

`--rux-ease-out` is **not** the entrance curve under another name: it overshoots toward 1
early, where the productive entrance curve does not. These are different motion characters.

### 1.3 The semantic layer

Panels consume named aliases rather than either scale directly, which is the pattern the
rest of the system should follow:

| Alias | Resolves to |
|---|---|
| `--rux-panel-motion-duration` | `--rux-motion-duration-moderate-01` (150ms) |
| `--rux-panel-enter-easing` | `--rux-motion-easing-entrance-productive` |
| `--rux-panel-exit-easing` | `--rux-motion-easing-exit-productive` |
| `--rux-panel-standard-easing` | `--rux-motion-easing-standard-productive` |

---

## 2. Rules

**2.1 Motion is configured by token, never by literal.** No rule in any layer states a
duration, delay, or easing curve as a literal value. *(R6's motion half. Enforced:
`tests/motion-contract.test.mjs`.)*

**2.2 Entrance, exit and continuous movement take different curves.** A surface arriving
uses the entrance curve, a surface leaving uses the exit curve, and a control moving with an
already-visible surface uses the standard curve. *(Enforced for panels.)*

**2.3 Animate only what explains the state change.** Normally `transform`, `translate`,
`opacity`, `clip-path`, or a surface's own layout dimension. *(**Not enforced.**)*

**2.4 No spring, bounce, or overshoot** on shell navigation, panels, dialogs, or menus.
Productive motion is not expressive motion. *(**Not enforced** — see §4 D3.)*

**2.5 Direct manipulation is never animated.** A resize separator tracks the pointer
one-to-one with no transition, threshold, snap, or spring, and keyboard Arrow, Home and End
changes are immediate. *(Enforced: `motion-contract`'s splitter test.)*

**2.6 State never waits for an animation.** Focus, keyboard dismissal, `aria-expanded`, and
content availability are correct independently of whether a transition has finished, and
opening and closing remain operable with animation off. *(Partly enforced.)*

**2.7 Reduced motion is a floor, not a feature.** The shared rule in
`rux-ui/css/base/utils.css` collapses animation and transition durations to effectively
immediate. Nothing may depend on an animation running. *(Enforced: `motion-contract`'s
accessibility test.)*

---

## 3. Current state

**The document and the code disagree about which vocabulary is canonical, and the code wins
by two orders of magnitude.** Measured across `rux-ui/css` and `scheduler/css`:

| Vocabulary | Tokens | `var()` references | Files using it directly |
|---|---:|---:|---|
| `--rux-motion-*` | 7 | **18** | **2** — `tokens.css` and `scheduler/css/features/team-chat.css` |
| `--rux-duration-*` / `--rux-ease-*` | 7 | **139** | most of the layer |

`../motion.md` publishes the Carbon set under the heading **Foundation Tokens** and tells
component authors to consume the semantic aliases. That is accurate about the aliases —
panels do exactly that — and misleading about everything else, because outside the panel
family the layer reaches for `--rux-duration-*` and `--rux-ease-*`, which that document does
not mention at all.

**R6's motion half was never enforced as stated.** `motion-contract` has eight tests and they
are good ones — they pin the 150ms panel contract, the 110ms side-nav reveal, the splitter's
absence of motion, the menu contract, and the reduced-motion rule. What they do not do is
assert rule 2.1 generally: a literal `200ms` in a stylesheet no test reads would pass.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | **Two duration and easing vocabularies coexist with different values**, and only `--rux-duration-productive` bridges them. A component author has no way to know which to reach for, and the two answers are not equivalent — 80ms is not 70ms. `../audit/design-system-audit.md` §4 recorded this in 2026-08 and proposed the Carbon set as canonical with the short set as thin aliases; usage has since gone the other way, 139 references to 18. | step 2 — Q1 |
| D2 | `../motion.md` states **foundation values** — the 70/110/150/240ms table — at the component tier, which `CLAUDE.md`'s one-home rule puts here. | step 3 |
| D3 | Rules 2.3 and 2.4 have **no test**. A spring curve or an animated `width` would pass every suite. | needs its own step |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R6's motion half as canonical | **done · Class A** | Founding entry, 2026-08-22, and the last of `README.md` §1's routing table to get a home. **Nothing was invented and nothing resolves differently** — every value in §1 is measured out of `rux-ui/css/tokens.css`, and every rule in §2 is either already enforced or already written in `../motion.md`'s prose. **The finding is §1.1: the two duration scales are not aliases.** `../audit/design-system-audit.md` §4 filed this as a naming conflict — *"`--rux-motion-*` vs `--rux-duration-*`/`--rux-ease-*`, legacy becomes thin aliases"* — which reads as one scale with two spellings. It is not. 80ms against 70ms, 140 against 110, 220 against 240, and `--rux-ease-out` overshoots where the productive entrance curve does not. Making one an alias of the other **changes what renders**, so what looked like a rename is a Class B decision wearing a Class C costume. **Deliberately did not answer Q1.** Which vocabulary survives is a decision with 139 call sites behind one answer and this document's own prose behind the other, and founding a document by settling its hardest question in the same step is how the reasoning gets lost. **Deliberately did not touch `../motion.md`** — its component recipes are correct and its Foundation Tokens table is D2's, which is step 3's, gated on Q1. **Deliberately did not write tests for 2.3 and 2.4** (D3): rule 2.4 in particular needs a definition of "overshoot" that a regex can hold, and the naming document's step 2 is a standing reminder of what happens when a test is written before the rule it checks is testable. Geist publishes no motion page, so unlike `typography.md` and `color.md` there was no catalog to measure against and no source to defer to. |
| 2 | Answer Q1; converge on one duration and easing vocabulary | **[open]** | The document's central question and the reason D1 exists. **Class B at minimum, Class C if either set is retired**, so it stops and proposes either way. The decision needs a value comparison per rung and a named state for each, because collapsing 80ms onto 70ms is a visible change on every control that reads it. |
| 3 | **Consolidate** — move `../motion.md`'s Foundation Tokens table here; convert it to a pointer | **[open]** | The closing step. **Gated on step 2**: converting that table to a pointer before Q1 is answered would delete the only statement of a scale that might turn out to be the surviving one. In scope: `../motion.md` § Foundation Tokens, and `../audit/design-system-audit.md` §5's rule 6, whose duration/easing half is one of the last two entries still stated there. |

---

## 6. Open questions

**Q1 — Which duration and easing vocabulary is canonical?** Two coherent answers, and the
document should not pretend they are close.

**The short set** (`--rux-duration-*`, `--rux-ease-*`) has **139 of the 157 references** and
reads naturally at a call site — `--rux-duration-fast` says what it is without a scale
lookup. Its weakness is that it has no published rationale: the four rungs are 80/140/220/720
and nothing records why, where the Carbon set inherits a documented model.

**The Carbon set** (`--rux-motion-*`) is what `../motion.md` publishes, what the panel
aliases resolve to, and what `motion-contract` pins the 150ms and 110ms contracts against.
Its weakness is that almost nothing consumes it directly — **two files** — so adopting it
means moving 139 call sites onto names that are longer and require knowing the scale.

**A third answer exists and should be considered rather than assumed away**: keep both,
demote neither, and make the short set the *semantic* layer that resolves into the Carbon
set as the *primitive* layer — which is exactly what `--rux-duration-productive` already
does, and what §1.3's panel aliases do one level up. That would make `--rux-duration-fast`
mean "the fast rung, whatever it resolves to" rather than "140ms", and it converts a rename
with 139 call sites into a value change on four tokens. *Blocks steps 2 and 3.*
