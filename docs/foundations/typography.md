# Rux UI Foundations — Typography

**Contract version: 1.3.2** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 22 steps: **14 done · 6 open · 2 deferred**
**Nothing is executable without a decision.** **Q1, Q2 and Q3 are answered** (§6), closing
steps 6, 8, 10 and 12. Q4 gates 9, Q6 gates 7, **Q7 gates 20** — which was `[ready]` until
it was attempted and found to contradict a shipped fix — step 11 needs external
verification, step 16 needs everything, step 22 needs a decision it does not yet have, and
steps 3 and 4 wait on a named consumer (§7.3). Derived from
§5; `tests/foundations-contract.test.mjs` fails if this line disagrees with the log.

This document is canonical for type in Rux UI: the scale, the roles, the utilities, and
the rules that govern all three. It states the current contract, records the known
defects in it, and sequences the amendments that resolve them.

**Authority.** Per `CLAUDE.md` § Foundation Work, this document authorizes its own
amendments. A change to a type token, a type rule, or a published type utility is legal
when it is a numbered step in §5 — and is otherwise prohibited, the same way
`docs/portability-audit.md` governs renames. `README.md` § Typography is the orientation
summary; where the two disagree, this document wins and README is corrected in the same
step.

**Precedence.** This document outranks every downstream specification that renders Rux UI
type, in this repository or any other — including `infor_ln_docs/_standards/guide-markup.md`
and any stylesheet that implements it. Where they conflict on type, this document wins.

**Scope of that precedence.** It is deliberately narrow, because unbounded authority would
let a type document decide things that are not type:

- **This document owns the vocabulary and its behavior** — which sizes, weights, leadings,
  and trackings exist, what each means, and how they combine.
- **A downstream specification owns the mapping** — which of *its* roles takes which item
  from that vocabulary. `guide-markup.md` decides that a gap marker is amber and a session
  code is a filled badge. It does not decide what amber is, and it may not introduce a
  size the scale does not publish.
- A downstream need that the vocabulary cannot express is a defect **here**, and is fixed
  by an amendment in §5 — never by the downstream document escaping the scale.

**This document moves no code.** Execution runs against §5.

**Enforcement.** `tests/typography-roles.test.mjs` already checks four of the rules below
and predates this document: every role carries all five axes (rule 1.1), a role aliases the
scale and never states a literal (§1), no role is defined but unused, and a recurring
size+leading recipe goes through a role rather than the raw scale (rule 1.2). New rules that
can be checked SHOULD extend that file rather than starting a second suite.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required, preferred,
optional, and prohibited behavior.

---

## 1. The three tiers

Type is expressed in three tiers, and a call site MUST consume the highest one that fits.

| Tier | What it is | Named by | Lives in |
|---|---|---|---|
| **0 · Primitives** | `--rux-size-*`, `--rux-line-height-*`, `--rux-weight-*`, `--rux-tracking-*` | its **value** (`sm`, `2xl`, `400`) | `rux-ui/css/tokens.css` |
| **1 · Roles** | `--rux-text-body-*`, `--rux-heading-panel-*` — a complete five-axis recipe | its **meaning** (`body`, `caption`, `eyebrow`) | `rux-ui/css/tokens.css` |
| **2 · Utilities** | `.rux-u-caption`, `.rux-u-eyebrow` — one class that applies a whole role | its role | `rux-ui/css/` |

The two naming schemes are deliberate and are not in conflict. A primitive MUST NOT be
named for a role, because that is what lets a fourteenth size be recognised as a
fourteenth size rather than as "the size the new thing needed." A role MUST NOT introduce
a number, only alias one, because that is what lets every caption in the system be
restyled at once. Collapsing the two tiers into one loses whichever guarantee it drops.

**Rule 1.1** — A role MUST carry all five axes: size, weight, line-height, tracking,
color. A call site that has to reach past a role to Tier 0 for one axis is a defect in
the role, not in the call site.

**Rule 1.2** — A recipe used by exactly one component is not a role. It belongs in that
component's own token block, beside `--rux-field-label-*` and `--rux-button-font-*`.

**Rule 1.3** — Every published role SHOULD have a Tier 2 utility. A call site applying
five `var()` references by hand can forget one; a class cannot.

---

## 2. Rules

**2.1 Sizes are rem, never px.** The scale is authored in `rem` so a reader who raises
their browser's default font size gets a larger interface. A `px` type size in any
stylesheet is a defect.

**2.2 Size and line-height are paired, and the pair is a length.** Line-heights are
declared in `rem`, not as unitless ratios, so every size/leading box lands on the 4px grid
and no consumer re-derives leading by multiplying. A unitless `line-height` on a type role
is a defect.

**2.3 Hierarchy comes from size, weight, and space — never from family.** Three families
exist: `--rux-font-sans` (Geist), `--rux-font-sans-condensed` (aliases sans; Geist has no
condensed cut), `--rux-font-mono` (Geist Mono). There is no fourth. No display serif, no
script.

**2.4 Mono steps down one rung from the sans beside it.** At matched nominal size a
monospace face reads larger and heavier, so inline code inside 14px copy is 12px mono.
The pairing is fixed; the numbers move with the base. Mono size MUST come from
`--rux-size-*`, never from a proportional `em` — a proportional shrink lands off the scale
at every call site and produces fractional pixels.

**2.5 Emphasis is a modifier, not a role.** Weight and color modifiers MUST NOT change
size. A modifier that also sets `font-size` is a token wearing a modifier's name, and MUST
be promoted to a role.

**2.6 Copy and Label split by block behavior, not by meaning.** Copy runs to several lines
and takes the taller leading. Label runs to one line and sits level with an icon. A
one-line table cell is a Label even though it reads as prose. **At the 14px base this
distinction has no metric expression** — Copy and Label resolve to the same recipe, because
the grid offers 20 or 24 and 24 is prose leading. The two roles are kept apart anyway: they
name different intents, three components read `label-control`, and they would move
independently the moment a surface with real prose gets its own base. A convergence that is
recorded is not a defect; an undocumented one is (Q2, step 12).

**2.7 Every rule states both themes.** A type rule naming a color MUST name a semantic
token, never a lightness. The relationship inverts under `data-theme`, so a literal that
is correct in one theme is wrong in the other by construction.

**2.8 Measure is derived, not chosen.** Prose is capped near 70–78 characters at the base
size; tables break out because three columns cannot live in a prose measure. Both are
expressed in `rem` so they track the scale. *(No measure token exists yet — see D8.)*

**2.9 Tabular numerals are a stated property of a role, not a global.** A role that
carries step numbers, times, counts, versions, or dates MUST set
`font-variant-numeric: tabular-nums`. Setting it on `body` is prohibited: it applies
tabular figures to prose, where they are wrong.

**2.10 No unnamed off-grid value.** The 4px grid has named exceptions —
`--rux-space-px` (1px) and `--rux-space-1-5` (6px). An off-grid value that is not one of
them is the error. Absolutism here is false comfort: every real system accumulates two or
three principled exceptions, and the useful rule is that each one is *named*.

**2.11 Weight is a property of the role, not of the size.** Three weights are published
for application use: **400** for copy and labels, **500** for controls, badges, and inline
emphasis, **600** for headings. A heading takes 600 at every size it appears at — a 14px
heading is 600 exactly as a 72px heading is — and copy takes 400 at every size. Weight MUST
NOT be varied to compensate for size; separating two levels is what the size scale and rule
2.3 are for. Nothing above 600 is published: the only heavier weights in the codebase are
the untokenized `700`/`800` literals in the print surface (S2), which §7.3 records as
needing its own answer rather than a louder version of this one.

This follows the Geist catalog the system's face comes from, not an independent judgement —
`text-heading-*` is 600 at all ten published sizes from 14 to 72, `text-button-*` is 500,
`text-copy-*` and `text-label-*` are 400. Geist's own Strong modifier measures **550**,
which a ladder stepping in 100s cannot say; 500 is the adopted rung for `strong` (D2, Q3).

---

## 3. Current state

Verified against `rux-ui/css/tokens.css` and `rux-ui/css/colors_and_type.css` at the date
of this document. Values are px equivalents at a 16px root.

### 3.1 Tier 0 — primitives

| Size | | Line-height | | Tracking | |
|---|---|---|---|---|---|
| `xxs` | 10 | `xxs` | 12 | `tight` | −0.02em |
| `xs` | 12 | `xs` | 16 | `normal` | 0 |
| `sm` | 14 | `sm` | 20 | `wide` | 0.04em |
| `md` | 16 | `md` | 24 | `widest` | 0.1em |
| `lg` | 18 | `lg` | 28 | | |
| `xl` | 20 | `xl` | 28 | | |
| `2xl` | 24 | `2xl` | 32 | | |
| `3xl` | 30 | `3xl` | 40 | | |
| `4xl` | 36 | `4xl` | 40 | | |

Weights `--rux-weight-100` … `--rux-weight-900` exist as a complete ladder; rule 2.11
publishes 400, 500 and 600 for application use and nothing above. (Before step 6 this
paragraph cited a §2 rule that did not exist — 2.11 is now that rule.)

### 3.2 Tier 1 — roles

| Role | Size | Weight | Leading | Tracking | Color |
|---|---|---|---|---|---|
| `heading-page` | 36 | 600 | 40 | tight | primary |
| `heading-section` | 24 | 600 | 32 | tight | primary |
| `heading-panel` | 16 | 600 | 24 | tight | primary |
| `text-lead` | 16 | 400 | 24 | normal | secondary |
| `text-body` | 14 | 400 | 20 | normal | primary |
| `text-caption` | 12 | 400 | 16 | normal | secondary |
| `label-control` | 14 | 400 | 20 | normal | primary |
| `label-eyebrow` | 12 | 400 | 16 | wide | secondary |

### 3.3 Tier 2 — published utilities

Seven carry type. Each is defined beside whichever component first needed it, which is why
this index exists — a call site cannot discover them otherwise.

| Utility | Defined in | Reads | Axes applied |
|---|---|---|---|
| `.rux-u-panel-title` | `base/card.css` | `--rux-heading-panel-*` | **all five** |
| `.rux-u-eyebrow` | `base/utils.css` | `--rux-label-eyebrow-*` | size, weight, tracking, color — **no leading** |
| `.rux-u-section-label` | `base/utils.css` | `--rux-label-eyebrow-*` + a divider rule | same four, then overrides leading to `1` |
| `.rux-u-label` | `base/preferences.css` | `--rux-label-control-*` | size, weight, color — **no leading, no tracking** |
| `.rux-u-subtitle` | `base/card.css` | `--rux-text-body-*`, colour from `--rux-text-secondary` | size, leading, color — **no weight, no tracking** |
| `.rux-u-caption` | `base/form.css` | **`--rux-field-label-*`** + raw `--rux-line-height-xs` | size, weight, leading, color |
| `.rux-u-hint` | `base/form.css` | **`--rux-field-label-size`**, `--rux-field-help-fg` | size, color |

Two more carry a single property and are not role applications: `.rux-u-mono`
(family) and `.rux-u-muted` (colour), both in `colors_and_type.css`. Five are layout, not
type, and are out of scope here: `.rux-u-cluster`, `.rux-u-row`, `.rux-u-stack`,
`.rux-u-spacer`, `.rux-u-record-list`.

### 3.4 Element defaults

`body` is 14/20/400 at tracking 0 (step 8). `h1`–`h6` default to weight **600** and tight
tracking (step 6); `h1` reads the `heading-page` role, `h2` is 30/40, `h3` is 24/32, `h4` is
18/28 at normal tracking, `h5` is 16/24 at normal tracking, and `h6` is 12/16 uppercase wide
secondary at **400** — it opts out of the heading weight because it is styled as a label.
`code` is `--rux-size-xs` mono (step 10). A bare `p` keeps the 24px leading (Q2), the one
place the base's size and leading are not a matched pair.

*This section was stale until step 6: it still described the 16/24 body and the `0.92em`
code that steps 8 and 10 had already replaced. §3 is verified against source, so a stale
line here is the same defect class as a stale comment (D3).*

---

## 4. Known defects

Each was verified at the cited line. None is fixed by this document; each is resolved by a
step in §5.

| # | Defect | Evidence |
|---|---|---|
| **D1** | **Resolved (step 12) — not a defect.** `label-control` is byte-identical to `text-body`. Recorded as intentional convergence at the 14px base rather than faked apart or deleted; see rule 2.6. | `tokens.css` role block |
| **D2** | **Fixed (step 6).** `strong, b` set `--rux-weight-400`, so emphasis markup produced no weight change at all. Now `--rux-weight-500`. Six component-level pins keep their own 400 and are named in step 6 — those are mapping decisions their components own. | `colors_and_type.css:136` |
| **D3** | **Fixed (step 2, executed inside step 17).** The comment said "semibold by default" over a rule setting 400. Only the *description* was wrong, and step 2 corrected it to match the rule; **step 6 then moved both to 600**, so the block states the weight it sets either way. The two-regime divergence it sat next to is D4, closed by that same step. | `colors_and_type.css:85` |
| **D4** | **Fixed (step 6).** Two heading-weight regimes coexisted: element defaults rendered 400 while the `heading-section` / `heading-panel` roles specified 600, so which one a title got depended on whether it went through a component. Rule 2.11 settles both at 600, and `heading-page` — the one role that contradicted the policy at 400 — moved with them. | `colors_and_type.css` heading block vs `tokens.css:383` |
| **D5** | `--rux-text-muted` and `--rux-text-faint` both alias `--rux-text-secondary`, in **both** themes. The system documents three emphasis tiers and ships two. | `tokens.css:260`, `:1536` |
| **D6** | **Fixed (step 10).** `code { font-size: 0.92em }` violated 2.4 — it yields 12.88px inside body copy and 14.72px at 16px. Fractional at every call site. | `colors_and_type.css:134` |
| **D7** | One flat `--rux-tracking-tight` (−0.02em) serves both 36px and 16px. Optical tracking must scale with size; 36px is under-tracked and 16px over-tracked by the same token. **Measured against the Geist catalog during step 6:** its headings step −0.06em at 40–72px, −0.04em at 32px, and −0.02em at ≤20px. So the current token is correct at the small end and roughly two-and-a-half times too loose at `heading-page` — the defect is real but narrower than "one token serves everything" implied. | `tokens.css` tracking block; Geist published specimens |
| **D8** | No measure token exists. Rule 2.8 has nothing to point at. | `tokens.css` |
| **D9** | `font-feature-settings: "cv11", "ss03"` with the comment "Inter alt 1, alt g" — but the loaded face is Geist. These are Inter's axes; on Geist they are inert at best. | `colors_and_type.css:63` |
| **D10** | The nine Tier 2 utilities are defined beside whichever component first needed each one. There is no single published index, so a call site cannot discover them. | §3.3 |
| **D12** | **Only one of the seven type utilities applies its role's complete recipe.** `.rux-u-caption` and `.rux-u-hint` bypass the type roles entirely and read the `--rux-field-label-*` component tokens instead — so the utility named "caption" does not use `--rux-text-caption-*`. Four more apply a partial subset. Rule 1.3 exists because "a call site applying five `var()` references by hand can forget one"; the utilities are the call sites that forgot. | §3.3 |
| **D13** | `--sched-trip-bar-bus-label-font-size` is `clamp(9px, calc(var(--sched-trip-bar-row-font-size) * 0.85), 13px)` — a proportional shrink with `px` bounds. It resolves to **10.2px** in the running app. This is D6's defect surviving in the scheduler tier: literal `px` type sizes against rule 2.1, a proportional shrink against 2.4, and an unnamed off-grid result against 2.10. Step 10's "the portable tier now contains zero raw type values" was scoped to the portable tier and still holds. | `scheduler/css/features/trip-bar.css:152`, measured live |
| **D11** | The element scale and the role scale diverge: `h2` is 30px, but no role is 30px; `h3` is 24px/400 while `heading-section` is 24px/600. The same visual level has two definitions. | §3.2 vs §3.4 |

---

## 5. Amendment log

Ordered by dependency and blast radius. A later session MAY start at step *n* without
re-deriving anything above it. Every step records what it deliberately did **not** do.

Steps marked **[open]** are not yet authorized — they turn on a §6 question and MUST NOT
be executed until that question is answered here. Steps marked **[ready]** are additive or
reversible and execute under standing authority.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; state tiers, rules, current state, defects | **done** | Founding entry. Records the system as it is, not as it should be — every §3 value was read from source, and no §4 defect was fixed in passing. |
| 2 | Correct the stale heading comment (D3) | **done** | Class A, comment-only — and **already executed inside step 17**, which corrected this comment in passing while converting competing rule statements to pointers. The block then read "All headings: tight tracking, weight 400. Override per-context." above a rule that set 400 — **text step 6 has since replaced**, so what this step landed is no longer at `colors_and_type.css:85`. Left as a record of what step 2 did rather than rewritten to describe the file today (step 21). Recorded here rather than left **[ready]**: the log *is* this document's todo list (`README.md` §3), so a step still advertising itself as pending after its work has shipped is exactly the drift the log exists to prevent. Deliberately did **not** change the weight the comment describes — that was step 6, and it turned on Q3 — and deliberately does **not** renumber or fold the row into 17, because a later session is entitled to find step 2 where step 2 was. |
| 3 | Add optical tracking steps per size rung (D7) | **[deferred]** | Was **[ready]**; downgraded by §7.3. Additive and safe in itself — new rungs keyed to the display sizes, existing values untouched — but §7.3 established that *a new rung needs a named consumer before it is added*, and this would land five tokens nothing reads. Do it **with** the role that adopts it (step 7), not before. |
| 4 | Add `--rux-measure-prose` and `--rux-measure-wide` (D8) | **[deferred]** | Was **[ready]**; downgraded on the same §7.3 grounds that deferred step 3, and by the precedent **Q2** set when it declined to mint `--rux-line-height-prose`. A measure is prose vocabulary, and prose is **S3's surface, which is not in this repository** — nothing under `rux-ui/css/` caps a measure today, so both tokens would land unread. The step's own note said so ("nothing consumes them until a component opts in"); after §7.3 that is the disqualifying condition, not a reassurance. Land them with the portal's foundation pass, beside the role that adopts them. **A constraint found while deferring, recorded so the step need not re-derive it:** rule 2.8 says the measures are expressed in `rem` "so they track the scale", but nothing sets `html { font-size }` — `rem` is the 16px root while the base is 14px on `body`, so a measure derived from a 14px character width and written in `rem` tracks the root, not the base it came from. Whichever unit the step lands on, it MUST say which of the two it follows. Deliberately did **not** take the other route to closing D8 — amending rule 2.8 so it stops promising a token that does not exist. That option was weighed and rejected in favour of deferral, so 2.8 keeps its `(No measure token exists yet — see D8)` pointer and **D8 stays open**. |
| 5 | Publish the Tier 2 utility index (D10) | **done** | Class A, documentation only — §3.3 is now the index. Writing it surfaced **D12**, which is the more serious half of D10: the layer is not merely undiscoverable, it is inconsistent, and two utilities bypass their own role for component tokens. Deliberately **moved no definition and renamed nothing** — both were in scope for this step and both were dropped, because relocating a utility is churn until D12 says where it should live, and renaming is Class C. |
| 6 | Settle the weight policy (D2, D3, D4) | **done · Class B** | Q3 answered: the ceiling is 600 and weight belongs to the role, not the size — recorded as rule 2.11, read from the Geist catalog rather than decided independently. **Four declarations moved, before → after:** `strong, b` **400 → 500** (D2); the `h1`–`h6` element default **400 → 600** (D4); `--rux-heading-page-weight` **400 → 600**, the one role that contradicted the new policy; and `.rux-ui-header__badge-count` **600 → 500** at 10px, ending a one-job-two-answers split against `--rux-badge-font-weight`. `h6` keeps its explicit 400 as a label. **Blast radius measured in a live browser, not reasoned about — but on the *visible* DOM of `index.html` only, which this row did not say. Corrected by step 21: 12 elements move across the four pages, 3 of them visible on load.** As measured here: on `index.html` exactly **one visible element re-rendered** — the badge count — because 37 of 43 headings already read a role at 600 and the remaining 6 are pinned at component level (`.rux-alert__title`, `.components-app__button-example strong`, `.driver-app__workload-through strong`, `.sched-trip-itinerary__idle-day strong`). The claim that *every* `<strong>` on the page is pinned was **wrong**: `.flip-seven__turn-status strong` and `.flip-seven__messages strong` pin no weight and both moved. That the app had locally pinned its way around D4 everywhere is why the two regimes never looked broken. Confirmed the defaults did change by injecting classless probes into the live document: a bare `<h2>` now resolves 30px/600 and a bare `<strong>` 500. **Eyeballed on `index.html` in both themes** — but only `index.html`, which is the gap step 21 closes; `gallery.html` measured byte-identical in distribution before and after (400×74, 500×13, 600×16). 331/331 green — the suite pins role→rung references and does not assert this one. Cache-busters bumped (`tools/check-cache-busters.sh --fix`), without which a warm browser keeps the old CSS. Deliberately **did not** unpin the six component overrides: a component using `<strong>` as a label and choosing 400 is a mapping decision it owns, and reversing four of them is not what "settle the weight policy" authorizes. Deliberately **did not** touch the element *size* scale — `h2` at 30px still has no role — that is step 7, which now turns on **Q6** alone. Deliberately **did not** mint a 550 rung to match Geist's Strong exactly. Contract 1.2.1 → **1.3.0**. |
| 7 | Reconcile element scale with role scale (D11) | **[open]** | Turns on **Q3** and **Q6**. `h2` at 30px has no role; either a role gains 30 or `h2` moves to 24 and collides with `h3`. |
| 8 | Settle the base size (Q1) and the prose leading (Q2) | **done · Class B** | The widest-blast-radius step in the log. Changes `body`, every element default, and both measures. Do not start before Q1 and Q2 are answered here. **Known cost, measured in advance:** the suite asserts role→rung *references*, not px, so a Class B value change survives it — but repointing a role breaks it. `tests/driver-assignment-card.test.mjs` pins `var(--rux-size-md)` and `var(--rux-size-2xl)` on four selectors, and `tests/badges.test.mjs` pins `--rux-badge-font-size`. Budget for updating them; they are doing their job. **Outcome:** `body` **16/24 → 14/20**. Blast radius measured in a live browser before and after rather than reasoned about — of 671 visible elements on `index.html`, only 5 kinds rendered at 16px and 3 of those set it explicitly (`.rux-ui-header__title`, `.rux-card__title`, `.rux-icon`, which resolves `--_icon-size` and was the one that could have silently shrunk 51 icons). **Two elements actually moved**: `.rux-profile-picker__name` (7 instances) and `.rux-skip-link`, both 16/24 → 14/20, plus bare `<p>` and `.rux-status-text` in the gallery. Verified after the change: `body` 14/20, the three explicit titles unchanged at 16/24, and **type identical in both themes** — as it must be, since no type token is theme-scoped. The predicted test breakage did **not** occur: the suite pins role→rung references and no role was repointed. 331/331 green. |
| 9 | Give `--rux-text-faint` a real third value, or collapse to two tiers (D5) | **[open]** | Turns on **Q4**. Either branch changes what renders; the collapse branch also *removes* a published token and therefore stops and proposes first. |
| 10 | Fix inline code sizing (D6) | **done · Class B** | Unblocked by step 8. `code, kbd, samp, pre` **0.92em → `--rux-size-xs`** (12px, one rung below the 14px base per rule 2.4). The proportional shrink had produced 12.88px at every call site. `kbd`'s own `0.8em` override was removed rather than re-tokenized — it was a second proportional shrink stacked on the first, and nothing distinguishes a `kbd` from a `code` at this scale. **The portable tier now contains zero raw type values.** |
| 11 | Resolve the font-feature-settings mismatch (D9) | **[open]** | Needs a decision that is not a design decision: confirm which stylistic sets Geist actually publishes before writing any replacement. Removing them outright is the safe default if none apply. |
| 12 | Give `label-control` its distinguishing leading, or retire it (D1) | **done** | Q2 answered 20px, so Copy and Label converge exactly as anticipated. **Neither branch taken.** Retiring `label-control` was the option this step named, and it was rejected: three components read it, it names a different intent from body copy, and it would diverge the moment a prose surface declares its own base — so deleting it would destroy a distinction that is real but currently unexpressed. Faking a difference by nudging its leading off-grid was equally rejected. Rule 2.6 now records the convergence instead. **No Class C removal**, so nothing was proposed. |
| 13 | Inventory surface demand; record §7 and revise Q1 | **done** | Measured, not assumed: every figure in §7.2 was counted from source. Found four surfaces where the doc assumed two, and four inter-document contradictions (§7.4). Deliberately **did not** resolve X1–X4 — three of the four are `guide-markup.md`'s to settle, not this document's, and X1 is a direct conflict between two specs that needs an owner before it needs a fix. Deliberately **did not** delete the under-used rungs: a system ships whole ladders. |
| 14 | Resolve X1: inline markers take the step's own size and weight | **done** | Decided by the precedence rule above. The finding is that the *type system* was wrong and `guide-markup.md` §2.2 was right, so nothing downstream changes — the 13px chip and weight-500 value are dropped from the proposal before adoption. Deliberately **did not** touch X2/X3: those are colour mappings, out of scope per the precedence note. |
| 15 | Establish the evolution contract (§8) and stamp version 1.0.0 | **done** | Written against the real gap: `docs/design-system-distribution.md` §4's three gates are all name-based, so they catch removals and renames and are **blind to a changed value**. Class B exists to cover exactly that blind spot. Deliberately **did not** invent a new automated gate — the honest mechanism today is the version stamp plus a named visual check, and claiming enforcement that does not exist would be worse than naming the gap. |
| 16 | **Consolidate** — strip duplicated type rules elsewhere; convert them to pointers | **[open]** | The closing step: this document is not canonical while a second statement of the same rule exists. Measured scope: `README.md` § Visual Foundations carries **81 hardcoded values** and ships to consumers — the vendored copy at `v0.1.3` carries all 81. Also in scope: the `rux-design` skill's design rules, the type-bearing prose in `docs/layout-composition.md`, and any `tokens.css` comment that states a MUST rather than explaining a value. **Blocked on Q1–Q6**: converting a section to a pointer before the rule it points at is settled deletes the only statement of it. |
| 20 | Put the trip-bar bus label on the scale (D13) | **[open]** | **Was `[ready]`; attempted, and it does not execute as written. Turns on Q7.** The premise — "`--rux-size-xxs` (10px) is the rung the clamp already sits nearest at its measured 10.2px" — was measured in the running app, which sits at the **XS** density tier. The token is not one value: `--sched-trip-bar-bus-label-font-size` tracks `--sched-trip-bar-row-font-size` × 0.85, and the trip-bar size control drives that across three tiers, so it resolves **9px (XXS) / 10.2px (XS) / 11.9px (SM)**. Pinning it to `--rux-size-xxs` collapses all three to 10px, which (a) reinstates the exact regression the comment above the declaration records as fixed — XXS and XS resolving pixel-identical, so two of the three settings produce the same pill — and (b) puts the XXS pill's text at 10px against 10px row text, when the pill MUST stay quieter than the row beside it. **Verified by applying it and running the suite, not by reasoning:** `tests/trip-bar-size.test.mjs` fails at load — it asserts the token *is* a `clamp()`, then that the pill font differs at all three tiers and rises monotonically with the row text. Reverted; no CSS changed. **The blocking fact:** `--rux-size-xxs` (10px) is the *smallest rung on the scale*, and the XXS tier needs type below its own 10px row text. There is nowhere on the scale for it to go. So D13 cannot be closed by "put it on the scale" — the scale does not reach. That is Q7. Deliberately **did not** execute it anyway and update the test: the test encodes a shipped design fix and three assertions about what the control must do, and a step that rewrites its own verification to pass is not conformance. Deliberately **did not** pick a branch for Q7 here — minting a sub-10px rung is Class A on shared vocabulary and outside what "put this label on the scale" authorizes. **Worth naming:** this is the same defect as the one step 21 corrects in step 6 — a value measured in one state and recorded as though it covered every state. Both were written in the same commit. |
| 19 | Extract the shared mechanism to `README.md`; add a derived Status block | **done** | Class A. §8 was 68 lines of machinery of which five mentioned type — generic, and guaranteed to be duplicated the moment a second foundation document landed. It now lives in `README.md` §2 and §8 is a pointer. Answers the "should each document carry a todo list" question: **no** — the amendment log already is one, and a second statement of status drifts. What was missing was a *glance*, so each document gains a Status block derived from its log, rolled up in `README.md` §1, with `tests/foundations-contract.test.mjs` failing when the two disagree. Deliberately **did not** add a TODO or status file, and **did not** fold `../motion.md` in — that is its own decision. |
| 17 | Convert competing rule statements to authority pointers | **done** | Class A. The problem step 16 solves is duplication; this solves *precedence* now, without waiting on Q1–Q6. `README.md` § Visual Foundations, the `rux-design` skill's design rules, and `docs/audit/design-system-audit.md` §5 each gained a note naming `docs/foundations/` as canonical. Deliberately **stripped nothing** — the 81 values stay until step 16, because deleting a rule before its replacement is settled loses it. Also corrected two stale comments in `colors_and_type.css`: the heading block said "semibold by default" over a rule setting 400 (D3), and the `font-feature-settings` line now flags that its axes are Inter's while the loaded face is Geist (D9), without changing the declaration — that half is Class B and needs verification first. |
| 18 | Pair the notifications title's leading with its size (rule 2.2) | **done · Class B** | `.rux-notifications__item-title` held the only unitless leading on real text in the portable tier. **Before 18.9px** (14 × 1.35 — fractional and off the 4px grid), **after 20px** (`--rux-line-height-sm`, the pair for `--rux-size-sm`). Safe ahead of Q1/Q2 because the element pins `--rux-size-sm` explicitly, so it follows whatever that rung's pair becomes. **Verified by reading the constraint chain, not by rendering:** nothing between `.rux-notifications__item-title` and the menu root pins a height, sets `overflow: hidden`, or clamps lines — the only overflow control is the menu's own `max-height: 70vh; overflow-y: auto`, which absorbs the growth by scrolling. A two-line title therefore grows its row ~2.2px and nothing clips. A visual pass was **not** possible in this environment (`python3 -m http.server` fails under the sandbox at `os.getcwd()`), so the theme eyeball is still owed if wanted; the token is theme-independent, so it is a low-value check. Contract version 1.0.0 → 1.1.0. Applying this exposed that §8.1's Class B definition was too narrow — it named only token-value changes, and this is a rule moving from a literal to a token — so the definition was widened in the same step. |
| 21 | Correct step 6's blast-radius record (D3, D4 rows; rule 2.11 placement) | **done** | Class A, and **patch 1.3.0 → 1.3.1** — wording, evidence and a corrected citation; no token, rule, or value moves, and nothing re-renders. Step 6 measured its Class B blast radius on the *visible* DOM of `index.html` and recorded the result as though it covered the change: "exactly one element re-rendered" and "*every* `<strong>` on the page" pinned. Re-measured by A/B — injecting the pre-step-6 element defaults at equal specificity and diffing computed weights on all four pages — **12 elements move, 3 visible on load**. `index.html` **8**: `.rux-ui-header__badge-count` ×3 600→500 (one visible), the Flip Seven `h3`s *Take a seat* / *Players* / *Scoreboard* 400→600, `.flip-seven__turn-status strong` 400→500, `.sched-scope-request__dialog-title` 400→600. `driver.html` **2**: `.driver-share-status__title` 400→600 (**visible**), `.driver-share-dialog__title` 400→600. `request.html` **1**: `.trip-request__success-title` 400→600. `maintenance.html` **1**: the unclassed `h1` in `.maintenance-share__status` 400→600 (**visible**). `gallery.html` moves nothing, as step 6 said. **Every one of these is what rule 2.11 asks for, so nothing is reverted** — what was defective is the record. §2.3 requires a Class B step to name *the states that need an eyeball*, and a list that omits three pages defeats the review the class exists to trigger. **Eyeball now done for the two visible states:** `driver.html` and `maintenance.html` both pin `color-scheme: dark` and have no light theme, so "both themes" does not apply to either — recorded because a missing check and an inapplicable one read the same in a log. At 375px the `maintenance.html` `h1` wraps to two lines at 351px inside a 375px viewport with **no horizontal overflow** (`scrollWidth` 375 = `clientWidth` 375); it is tight, and 600 makes the same string wider than 400 did. That is **evidence for Q6**, not a defect of this step. **Still owed an eyeball:** the six states that need interaction to reach — the Flip Seven view, the scope-request dialog, the driver decline dialog, and the request success card. Measured, not seen. **Still unmeasured:** `.maintenance-trip :is(strong, span, small)` sets size only, so those render 500 once a real schedule loads; the page was in its invalid-link state. Also corrected here: the **D3** row said the comment "now states 400" after step 6 had moved it to 600, and called D4 "still open" one row above marking it fixed; **step 2**'s row quoted comment text step 6 had already deleted. Both went stale inside step 6's own commit — the same defect class as D3 itself. Rule **2.11** moved to sit after 2.10 instead of between 2.9 and 2.10. Deliberately **did not** rewrite step 6 to read as though it had been right: the original claim stays with the correction beside it, because a log that quietly edits its own history is worth less than one that shows the correction. Deliberately **did not** touch any CSS — every value step 6 landed is correct. |
| 22 | Make the type utilities apply their roles (D12) | **[open]** | **Added by step 21 because D12 had no step.** It was surfaced *by* step 5, described there as "the more serious half of D10", and then never given a row — so the log, which `README.md` §3 calls this document's todo list, silently dropped a defect it had itself found. The work: five of seven Tier 2 utilities apply a partial recipe, and `.rux-u-caption` and `.rux-u-hint` bypass the type roles entirely for `--rux-field-label-*` — so the utility named "caption" does not read `--rux-text-caption-*`. **Needs a decision before it can execute**, which is why it lands `[open]` rather than `[ready]`: completing a partial recipe is Class B on every call site of that utility, and repointing `.rux-u-caption` at its own role changes what renders wherever it is used. Whether the fix is *utilities adopt their roles* or *the two misnamed ones are renamed to what they actually are* is the open question — the second branch is Class C. Deliberately **not** folded into step 16: consolidation strips duplicated rule *statements*, and this is a defect in what the utilities *resolve to*. |

---

## 6. Open questions

These are design decisions, not engineering ones. Each blocks at least one §5 step. Answer
them **in this document** — an answer recorded anywhere else does not authorize anything.

**Q1 — How does a surface declare its base size?** *(revised by §7.3)* `body` is 16px; `text-body` is 14px and is described as
"one step below the document base." In practice buttons, inputs, table cells, menu items,
and labels are all 14, so the 16px default is inherited by almost nothing dense — §7.2
measures 89% of the app on 14 and 12. But the portal reads 16 nearly as often as 14, and
print runs at 10. A single global base is false for at least two of the four surfaces. The
real question is what mechanism lets a surface declare its base, and which roles ride that
base rather than pinning an absolute rung.

> **Answered — 14px is the base; no new mechanism.** The role layer had already decided
> this: `--rux-text-body` has been 14/20 since before this document, described as "one step
> below the document base." Setting `body` to 14/20 makes the document base and the dense-UI
> base the same number, which is what 92 explicit `--rux-size-sm` declarations already
> assumed. A surface needing a different base overrides `body` — the portal already does
> this by reaching for `--rux-size-md` where it renders prose, and print (S2) gets its own
> document. **No `--rux-base-*` indirection was introduced**: it would have been vocabulary
> with one consumer, which §7.3 forbids. Executed as step 8.

**Q2 — What is the prose leading at 14px?** This is a genuine conflict between two rules,
and one of them must give:

- **20px** keeps rule 2.2's 4px grid intact and reaches a 44px row on-grid (12+20+12), but
  1.43 is tight for multi-line paragraphs.
- **22px** is comfortable for prose at 1.57, but is off-grid and forces an off-grid 11px
  row padding to reach the same 44px row.
- **24px** stays on-grid and comfortable at 1.71, but is loose for dense UI and equals the
  16px role's leading, flattening the distinction between them.

> **Answered — 20px, and the Copy/Label distinction is recorded as having no metric
> expression at this base.** 1.43 is correct for dense UI and is what `--rux-line-height-sm`
> already is; true multi-line prose lives at 16/24 on the portal, not in the scheduler. The
> one exception is a bare `<p>`, which keeps the 24px leading — it is prose, not chrome — so
> `p` renders 14/24 and is the single place the base's size and leading are not a matched
> pair. That is **named in the stylesheet as an exception**, per rule 2.10. Deliberately did
> **not** mint a `--rux-line-height-prose` (22px) rung: §7.3 requires a named consumer, and
> the consumer is the portal, which has not had its foundation pass yet.

*Blocked steps 8 and 12 — both now closed.*

**Q3 — Is the weight ceiling 500 or 600?** Two weights (400/500) is the tighter system and
matches `--rux-badge-font-weight`. 600 is what the heading roles specify today. Whichever
wins, both the element defaults and the role tokens must state it.

> **Answered — 600, and weight is a property of the role rather than of the size.** Three
> weights are published: 400 for copy and labels, 500 for controls, badges and inline
> emphasis, 600 for headings. This was settled by reading the **Geist catalog** the system's
> own face comes from, on Vercel's published specimens: `text-heading-*` resolves to 600 at
> **all ten sizes from 14 to 72** — a 14px heading is 600 exactly as a 72px heading is —
> while `text-button-*` is 500 and `text-copy-*` and `text-label-*` are 400 at every size.
> `heading-section` and `heading-panel` were already conformant; `heading-page` at 400 was
> the outlier and moved. Recorded as rule 2.11. **Deliberately not adopted:** a 500 ceiling,
> which was the proposal on the table before the catalog was read and which the 24px and
> 16px comparison had made look cleaner — the catalog is evidence about the face this system
> actually renders in, and an eye preference is not. Also not adopted: vercel.com's own
> 400/450/500 homepage usage, which carries no 600 at all but is a marketing surface rather
> than the system, and which uses intermediate weights (450, 550) that only a variable axis
> can express. **Worth recording for any future rung question:** Geist on Google Fonts is a
> single variable file with a continuous `wght` 100–900 axis, so requesting more weights
> costs **zero additional bytes** — all four of this project's requested weights resolve to
> the same `.woff2`. Payload is therefore not an argument for or against any ceiling; only
> restraint is. Executed as step 6.

*Blocked steps 6 (done) and 7 — which now turns on **Q6** alone.*

**Q4 — Two emphasis tiers or three?** Three (primary / muted / faint) is documented; two
are implemented. Adding the third means specifying a real lightness in both themes and
verifying contrast at the small sizes that would use it. *Blocks step 9.*

**Q5 — Does the scale gain a 13px rung?** There is no 13px today; the scale steps 12 → 14.
A 13px rung is useful for route lines, chip text, and step numbers, but it is a permanent
addition to shared vocabulary and it narrows the gap that makes 12 and 14 distinguishable.
*Blocks nothing yet; blocks any future role that wants it.*

**Q6 — Is there a responsive story?** The scale is fixed at all viewport widths today. A
36px page heading at 375px is a decision no one has made explicitly. Options: fixed and
the layout reflows; a single step-down at a breakpoint; or fluid via `clamp()`. *Blocks
step 7 and any future heading work.* **Evidence added by step 21:** at 375px the
`maintenance.html` `h1` renders 36/600 across two lines at 351px inside a 375px viewport —
no overflow, but no margin either, and 600 makes that string wider than 400 did.

**Q7 — Does the scale reach below 10px, and if not, what may a density tier do?**
`--rux-size-xxs` (10px) is the smallest rung. The trip-bar's XXS density tier sets 10px row
text and needs a pill quieter than it, which the scale cannot express — so the tier derives
`row-font-size × 0.85` and lands on 9px, off the scale and off the grid (D13). Three
branches, and they are not equivalent: **mint a sub-10px rung**, which is Class A but adds
shared vocabulary for one consumer and invites 8px next; **name the exception**, amending
rule 2.4 so a density tier MAY derive proportionally within a stated floor, which keeps the
scale honest about what it does not cover; or **drop the requirement**, letting the XXS
pill match its row text and accepting that the smallest tier has less hierarchy than the
other two. The third is the only one that changes what renders. *Blocks step 20; D13 stays
open until it is answered.*

---

## 7. Surface demand

Rules must answer to real surfaces. This section inventories what the consuming surfaces
actually ask for, measured rather than assumed. It is evidence, not decision — §6 is where
the decisions go.

### 7.1 There are four surfaces, not two

| # | Surface | Character | Renders |
|---|---|---|---|
| **S1** | Scheduler — screen | Dense operational UI | `index.html`, `scheduler/css/` |
| **S2** | Scheduler — print | Schedules on paper | `scheduler/css/features/print-schedule.css` |
| **S3** | LN portal — screen | Document reading + interactive guide runner | `infor_ln_docs/portal`, vendored `rux-ui/` |
| **S4** | LN documents — export | Markdown → HTML/PDF | `_standards/`, `render-style.css` |

The screen/paper split is a real axis and neither the scale nor the roles acknowledge it.
S2 and S4 are the two surfaces where the reader cannot zoom, cannot toggle a theme, and
where physical size — not rem — is what matters.

### 7.2 Measured demand

**S1 · Scheduler screen.** Of ~167 tokenized `font-size` declarations in `scheduler/css/`:

| Rung | Uses | | Rung | Uses |
|---|---|---|---|---|
| `sm` 14 | 92 | | `xl` 20 | 3 |
| `xs` 12 | 56 | | `lg` 18 | 1 |
| `md` 16 | 8 | | `4xl` 36 | 1 |
| `2xl` 24 | 5 | | `xxs` 10 | 1 |

**Two rungs carry 89% of the app.** `3xl` (30) has no app consumer at all. Weight is
effectively single-valued: 103 uses of `--rux-weight-400` against 2 of 500 and 2 of 600.

**S2 · Scheduler print.** Fully untokenized: 11 literal `10px`, 3 literal `14px`, and
**all ten** of the app's raw `font-weight: 700`/`800` declarations live in this one file.
Every weight escape above the ceiling in the entire application is print. The type system
has never served this surface, so it built its own.

**S3 · LN portal.** Consumes `--rux-size-*` properly. Demand is flatter than the app's —
roughly 12 uses of `xs` (12), 13 of `sm` (14), 10 of `md` (16), 5 of `xxs` (10). It also
carries its own markup vocabulary the design system does not publish: `ln-session-code`,
`ln-status`, `ln-gap`, `ln-record`, `ln-branch`, `step-control--button`,
`step-control--menu`, `step-control__where`.

**S4 · LN documents.** Governed by `_standards/guide-markup.md`, which specifies nine
inline roles plus status and gap, on two independent axes (colour = what to do with it,
form = what kind of thing it is).

### 7.3 What the demand implies

**The base size is a property of the surface, not of the system.** S1 is a 14/12 system
where the 16px `body` default is inherited by almost nothing. S3 reads 16 nearly as often
as 14, because it renders prose rather than chrome. S2 is a 10px system. A single global
base cannot be true for all of them, and asserting one is what forces every surface that
disagrees to escape the scale — which is exactly what S2 did. This revises **Q1**: the
question is not "14 or 16" but "what is the mechanism by which a surface declares its
base, and which roles ride it."

**Nine rungs serve a four-rung reality.** 14, 12, 16, and 24 cover essentially everything
on screen. 18 and 30 have almost no consumer. This is not an argument to delete rungs — a
system ships whole ladders — but it is an argument that new rungs need a named consumer
before they are added, and it weakens the case for a 13px rung (**Q5**) unless S4 produces
one.

**Print needs its own answer, not a smaller copy of the screen answer.** Paper has no
theme, no zoom, and a fixed physical size, so `rem` buys nothing and `pt` is the honest
unit. Whatever S2 and S4 get, they should get deliberately.

### 7.4 Contradictions the mapping surfaced

These are between existing documents, and predate this one.

| # | Contradiction |
|---|---|
| **X1** | **Resolved — see below.** `guide-markup.md` §2.2 requires that a marker "never changes the face, the size or the weight" — every fragment keeps the step's 14px regular. The proposed type system sets button, route, and status chips at **13px** and run-record values at **weight 500**. |
| **X2** | `guide-markup.md` §2.1 assigns **amber** to gaps and prerequisites and states that **red is deliberately unassigned**, reserved for a genuinely destructive warning. Both renderers use **red** for the gap marker (`--red`, `--warning`), and the proposed type system additionally renders Prerequisite in **green** — a colour §2.1 assigns to confirmed status. |
| **X3** | Neither renderer defines an amber token at all. The colour axis `guide-markup.md` specifies cannot be expressed by either stylesheet that renders it. |
| **X4** | The nine `guide-markup.md` inline roles are implemented three times independently — as `.m-*` classes in the proposed type system, as `ln-*`/`step-control*` components in the portal, and as unstyled markdown in the export. Three implementations of one spec, and §7.4 X1–X3 show they have already drifted. |

**X1 is resolved: this document wins, and what it says is what `guide-markup.md` already
said.** The rule "a marker never changes the size or the weight" is a statement about type
behavior, so it falls inside this document's scope — and it is rule 2.5 restated for inline
markers. Both specs agree; the **proposed type system was the party in the wrong**. Inline
markers therefore take the step's own size and weight, and the 13px chip text and
weight-500 run-record value do not survive into the adopted system. Recorded as step 14.

**X2 and X3 are not this document's to resolve.** Which colour a gap marker takes is a
mapping, and `guide-markup.md` owns it — it says amber, and it is right that red should
stay reserved. That amber does not exist as a token is a defect in the **colour**
vocabulary, and it belongs to `docs/foundations/color.md` when that document is written.
Logged here only so the finding is not lost.
---

## 8. Controlled evolution

The amendment classes (A · additive, B · behavioral, C · breaking), the Class B protocol,
the conformance line, and the versioning rules are **shared by every foundation document**
and live in [`README.md`](README.md) §2. This document follows them without exception, and
deliberately does not restate them — §2 is 68 lines of machinery of which five mention type
at all, so a copy here would be duplication by construction.

---

## Known drift

- `README.md` § Typography predates this document and is the orientation summary per the
  authority note above. It is accurate on families and on the tracking *intent*, but it
  describes tracking as "tight on display sizes, normal at body, wide on overlines"
  without recording that one token serves every display size (D7).
- `docs/audit/design-system-audit.md` § 5 rule 6 ("Tokens only, both themes") and rule 10
  ("Docs cite tokens, not numbers") both apply to type and are not restated here. That
  document remains canonical for enforcement tests; this one is canonical for the rules
  those tests enforce.
