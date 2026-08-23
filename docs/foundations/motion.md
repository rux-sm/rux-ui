# Rux UI Foundations — Motion

**Contract version: 1.2.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 4 steps: **3 done · 1 open**
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

### 1.1 There are two duration scales, and Q1 settled that both are correct

Both are published. Neither is deprecated. They carry **different values**, and §6 Q1
established that this is **not duplication**: they are two motion characters for two
interaction classes. The **Carbon set** times *surfaces arriving and leaving* — panels,
drawers, shell navigation, scrims. The **short set** times *things changing in place* —
a control responding to a pointer, an opacity fade, a height reflow.

| Carbon-derived set | Value | | Short set | Value |
|---|---:|---|---|---:|
| `--rux-motion-duration-fast-01` | 70ms | | `--rux-duration-instant` | 80ms |
| `--rux-motion-duration-fast-02` | 110ms | | `--rux-duration-fast` | 140ms |
| `--rux-motion-duration-moderate-01` | 150ms | | `--rux-duration-base` | 220ms |
| `--rux-motion-duration-moderate-02` | 240ms | | `--rux-duration-slow` | 720ms |
| | | | `--rux-duration-productive` | → `moderate-01` (150ms) |

**Only one token bridges them, and it has zero consumers.** `--rux-duration-productive`
resolves into the Carbon set and **nothing reads it** — measured. Every other rung on the
right is its own value: 80 is not 70, 140 is not 110, 220 is not 240. Reading this table as
"two names for one scale" is the mistake it exists to prevent, and the dead bridge is what
most invites it.

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
early, where the productive entrance curve does not. These are different motion characters,
and Q1 established that the difference is the point rather than an accident — an overshooting
curve is right for a control answering a pointer and wrong for a panel arriving.

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

**The document and the code disagreed about which vocabulary is canonical; Q1 found the
question was wrong.** Measured across `rux-ui/css` and `scheduler/css`:

| Vocabulary | Tokens | `var()` references | Files using it directly |
|---|---:|---:|---|
| `--rux-motion-*` | 7 | **18** | **2** — `tokens.css` and `scheduler/css/features/team-chat.css` |
| `--rux-duration-*` / `--rux-ease-*` | 7 | **139** | most of the layer |

`../motion.md` publishes the Carbon set under the heading **Foundation Tokens** and tells
component authors to consume the semantic aliases. That is accurate about the aliases —
panels do exactly that — and misleading about everything else, because outside the panel
family the layer reaches for `--rux-duration-*` and `--rux-ease-*`, which that document does
not mention at all.

**Where the 139 short-set references actually live**, because the raw count overstates the
portable layer's stake: **21** define component semantic tokens in `rux-ui/css/tokens.css`,
**24** are portable rules, **2** are `scheduler/css/tokens.css`, and **92 — two thirds — are
application rules**. The application reaching past the semantic tier into a primitive is its
own small defect, recorded as D4.

**Two tokens are dead.** `--rux-duration-productive` and `--rux-motion-duration-moderate-02`
have **zero** `var()` consumers.

**R6's motion half was never enforced as stated.** `motion-contract` has eight tests and they
are good ones — they pin the 150ms panel contract, the 110ms side-nav reveal, the splitter's
absence of motion, the menu contract, and the reduced-motion rule. What they do not do is
assert rule 2.1 generally: a literal `200ms` in a stylesheet no test reads would pass.

---

## 4. Known defects

| # | Defect | Status |
|---|---|---|
| D1 | ~~**Two duration and easing vocabularies coexist with different values.**~~ **Not a defect — closed by Q1, step 2.** They are two motion characters for two interaction classes: surfaces arriving and leaving, against things changing in place. `../audit/design-system-audit.md` §4's proposal to make one a thin alias of the other would have changed what renders on every control that reads it. **What survives as real** is narrower and is now D5. | **closed, step 2** |
| D5 | **The names do not say which scale does which job.** `--rux-duration-fast` and `--rux-motion-duration-fast-02` are indistinguishable at a call site, and nothing tells an author that one is for controls and the other for surfaces. Two dead tokens make it worse: `--rux-duration-productive` bridges the scales with zero consumers, which actively implies they are interchangeable, and `--rux-motion-duration-moderate-02` is unread. | step 4 — Class C |
| D2 | `../motion.md` states **foundation values** — the 70/110/150/240ms table — at the component tier, which `CLAUDE.md`'s one-home rule puts here. | step 3 |
| D3 | Rules 2.3 and 2.4 have **no test**. A spring curve or an animated `width` would pass every suite. | needs its own step |
| D4 | **92 application rules consume motion primitives directly** rather than a component semantic token, which is two thirds of the short set's use. The portable layer models this correctly — `--rux-button-transition-*`, `--rux-panel-motion-duration` — and the application skipped the tier. | recorded; belongs to `../portability-audit.md` |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; adopt R6's motion half as canonical | **done · Class A** | Founding entry, 2026-08-22, and the last of `README.md` §1's routing table to get a home. **Nothing was invented and nothing resolves differently** — every value in §1 is measured out of `rux-ui/css/tokens.css`, and every rule in §2 is either already enforced or already written in `../motion.md`'s prose. **The finding is §1.1: the two duration scales are not aliases.** `../audit/design-system-audit.md` §4 filed this as a naming conflict — *"`--rux-motion-*` vs `--rux-duration-*`/`--rux-ease-*`, legacy becomes thin aliases"* — which reads as one scale with two spellings. It is not. 80ms against 70ms, 140 against 110, 220 against 240, and `--rux-ease-out` overshoots where the productive entrance curve does not. Making one an alias of the other **changes what renders**, so what looked like a rename is a Class B decision wearing a Class C costume. **Deliberately did not answer Q1.** Which vocabulary survives is a decision with 139 call sites behind one answer and this document's own prose behind the other, and founding a document by settling its hardest question in the same step is how the reasoning gets lost. **Deliberately did not touch `../motion.md`** — its component recipes are correct and its Foundation Tokens table is D2's, which is step 3's, gated on Q1. **Deliberately did not write tests for 2.3 and 2.4** (D3): rule 2.4 in particular needs a definition of "overshoot" that a regex can hold, and the naming document's step 2 is a standing reminder of what happens when a test is written before the rule it checks is testable. Geist publishes no motion page, so unlike `typography.md` and `color.md` there was no catalog to measure against and no source to defer to. |
| 2 | Answer Q1 | **done · Class A** | **Answered 2026-08-22, and the answer is that the question was wrong.** The step was written as *converge on one vocabulary*; measuring per-token usage showed convergence is the mistake. **Neither set is retired.** §6 Q1 carries the reasoning. **What the measurement found**, none of which was visible from the totals this document was founded on: `--rux-duration-productive` — the one token bridging the scales — has **zero** consumers, as does `--rux-motion-duration-moderate-02`; the short set's 139 references are **21** component semantic definitions, **24** portable rules and **92** application rules, so the portable layer's real stake is 45 against the Carbon set's 18 rather than 139 against 18; and the two sets divide cleanly by **what they animate** — the Carbon set times surfaces arriving and leaving through the `--rux-panel-*` aliases, and the short set times things changing in place, feeding `--rux-button-transition-*`, `--rux-input-transition`, `--rux-switch-transition`, `--rux-choicebox-transition` and their peers. **A control answering a pointer and a panel arriving are different motions, and an overshooting `--rux-ease-out` against a productive entrance curve is exactly that difference expressed.** Aliasing either onto the other would change what renders on every site that reads it, which is why `../audit/design-system-audit.md` §4's *legacy becomes thin aliases* was never as cheap as it sounded. **Deliberately did not execute anything.** The real defect the answer leaves behind — the names not saying which scale does which job, and two dead tokens implying they are interchangeable — is D5 and Class C, so it stops and proposes as step 4. **Deliberately did not fold D4 in**: an application consuming primitives past its own semantic tier is `../portability-audit.md`'s, not a motion rule. Contract 1.0.0 → 1.1.0. |
| 3 | **Consolidate** — move `../motion.md`'s Foundation Tokens table here; convert it to a pointer | **done · Class A** | **Executed 2026-08-22.** Both sources named in the step are now pointers. **`../motion.md` § Foundation Tokens** stated the Carbon table's values at the component tier; it now links §1 and states none, and its pointer carries the two things that section used to get wrong — that there are **two** scales rather than one, and that the set the layer actually reaches for **139 times** was never mentioned there at all. Its component recipes and verification checklist are untouched; they are correct and they are that document's job. **`../audit/design-system-audit.md` §5 rule 6** is now a pointer for both moved halves, colour to `color.md` and duration/easing here. **Splitting one rule twice exposed a third piece nobody had noticed.** R6 reads *no literal duration, easing, or z-index* — and **z-index has no home**. Five tokens are published (`--rux-z-base`, `-dropdown`, `-overlay`, `-modal`, `-sticky`), **no foundation document mentions z-index at all**, and nothing enforces it. **Deliberately did not claim it here.** Stacking order is not motion; the natural home is `layout.md`, which already owns the Materials elevation presets, and z-index is the ordering half of the same idea — but routing a rule into another document is that document's to accept, so it is proposed as `layout.md` step 13 rather than assigned. **With this step, every rule in §5 that had a foundation destination has reached it**, and what remains there is R9, R10 and that orphan. Contract 1.1.0 → 1.2.0. |
| 4 | Name each scale for its job; retire the two dead tokens (D5) | **[open]** | **Class C — stops and proposes.** Q1 established that both scales are correct and that the *names* are the defect: `--rux-duration-fast` and `--rux-motion-duration-fast-02` are indistinguishable at a call site, and nothing tells an author which is for a control and which for a surface. **Two deletions come first and are nearly free**: `--rux-duration-productive` and `--rux-motion-duration-moderate-02` have **zero** consumers, and the first actively implies the two scales are interchangeable by bridging them. **The rename is not free** and should not be proposed as if it were — the short set alone has 139 call sites, two thirds of them in the application, so this wants the same grep protocol and the same one-home-at-a-time discipline `naming.md` steps 9 and 10 used. **A candidate direction, not a decision:** name by *what moves* rather than by speed — a surface scale and a control scale — since that is the distinction Q1 measured and speed names are what let the two sets look like duplicates in the first place. |

---

## 6. Open questions

**Q1 — Which duration and easing vocabulary is canonical? — ANSWERED: both, and the
question was wrong.** *Answered 2026-08-22 with step 2. Original text follows.*

**Neither set is retired, and neither becomes an alias of the other.** They are not two
spellings of one scale; they are **two motion characters for two interaction classes**, and
per-token measurement is what showed it:

- The **Carbon set** times **surfaces arriving and leaving** — panels, drawers, shell
  navigation, scrims — reached almost entirely through the `--rux-panel-*` semantic aliases,
  with `motion-contract` pinning its 150ms and 110ms contracts.
- The **short set** times **things changing in place** — a control answering a pointer, an
  opacity fade, a height reflow. It feeds `--rux-button-transition-*`,
  `--rux-input-transition`, `--rux-switch-transition`, `--rux-choicebox-transition`,
  `--rux-segment-indicator-duration` and their peers.

**`--rux-ease-out`'s overshoot is that difference expressed, not a mistake.** A control
answering a pointer should arrive with a little snap; a panel should not. Aliasing one curve
onto the other would change how every one of those sites feels.

**Three things the founding step could not see**, because it worked from totals:

1. `--rux-duration-productive`, the only token bridging the scales, has **zero** consumers —
   and `--rux-motion-duration-moderate-02` is dead too.
2. The short set's 139 references are **21** component semantic definitions, **24** portable
   rules and **92** application rules. The portable layer's real stake is **45 against 18**,
   not 139 against 18.
3. Both scales are consumed the same way where the layer is well-built: through a component
   semantic token. The panel aliases and `--rux-button-transition-*` are the same pattern one
   tier apart.

**So the third option this section originally floated — make the short set semantic aliases
into the Carbon set — is also rejected**, and for the reason that kills the other two: the
values differ, so aliasing changes what renders. It would have turned a naming problem into a
behaviour change on 139 call sites.

**What remains is a naming defect, not a duplication one**, recorded as D5 and carried by
step 4: the names describe *speed* when the real distinction is *what moves*, which is
exactly what let the two sets look like duplicates for long enough to reach an audit.

---

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
