# Rux UI Foundations — Forms

**Contract version: 1.3.0** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 5 steps: **5 done**
This document is canonical for **how a form control is composed (§2.1), what its label says
(§2.2–2.4), and when each control is the right one (§2.8)**. It states no sizes, no colours
and no spacing values: the label's type is `typography.md`'s, the group rhythm is
`layout.md` §9.1's, and the field's own height and the textarea's floor are `layout.md`
§10's, claimed there by its step 16. §1 points at each rather than repeating it.

**This is the set's first component-family document**, and it is worth saying why that is
allowed rather than a category error. [`README.md`](README.md) §1 settles it: *"These
documents are partitioned by this repository's rules"* — not by Geist's page structure, and
not by visual concern. Forms need governing here, so forms get a document. The rules below
span four concerns on purpose; that is the nature of a component family, and splitting them
across `layout.md`, `typography.md`, `state.md` and `README.md`'s Content Fundamentals would
leave a form author consulting four documents to build one field.

**Forms were never ungoverned.** `../../README.md` § Forms has stated most of §2 for as long
as it has existed — labels above fields, Title Case, no placeholder-as-label, help text below
the control — with a table of values beside it. What it lacked was a foundation home: a
contract version, an amendment log, and precedence over downstream specifications. This
document is that home, and step 1 is a **relocation**, the same move `layout.md` step 6 made
for `../layout-composition.md`. Each rule below records where it came from.

---

## 1. The vocabulary

Published in `rux-ui/css/base/form.css` and its neighbours. This section names what exists;
the values live in the token block beside each component.

| Block | Elements | Purpose |
|---|---|---|
| `.rux-field` | `__label` · `__help` · `__error` | the wrapper that makes a control a *field* |
| `.rux-input` | — | single-line text |
| `.rux-textarea` | — | text that wraps |
| `.rux-select` | — | a value from a short fixed list |
| `.rux-suggestions` | `__item` · `__label` · `__sublabel` | search-as-you-type over a known list |
| `.rux-checkbox` · `.rux-radio` | — | boolean and one-of-several |
| `.rux-switch` | `__track` · `__thumb` | an immediately-applied boolean |
| `.rux-choicebox` | `__label` · `__hint` | a boolean or option with an explanatory line |
| `.rux-input-group` | `__prefix` · `__suffix` | an input with a fixed affix |
| `.rux-number-stepper` | `__input` · `__btn` | a bounded number |
| `.rux-slider` | — | a value along a range |
| `.rux-color-input` | `__hex` · `__swatch` · `__picker` | a colour |

`--rux-field-*` carries the field's own contract — `-gap`, `-height`, `-label-size`,
`-label-weight`, `-label-fg`, `-help-fg`, `-error-fg`. **The label's type is
`typography.md`'s to change, not this document's**: `--rux-field-label-*` resolves onto that
catalog, and a change there is a typography amendment.

---

## 2. Rules

**Two sources, and each rule says which.** `../../README.md` § Forms already stated most of
this; those rules are marked **[README]** and are relocated, not invented. Geist publishes
content and behaviour rules on its [Input](https://vercel.com/geist/input) page and a
grouping component on [Fieldset](https://vercel.com/geist/fieldset); rules taken from there
are marked **[Geist]** and were read on **2026-08-23**. Where the two agree, the rule says so
— agreement between an independently written house rule and the adopted source is worth
recording, not flattening.

**2.1 A control is composed as `.rux-field` wrapping a label and the control.** *[README —
"Labels sit above fields"]* The wrapper
is what supplies the label-above-control layout and the gap between them; a bare `.rux-input`
with no wrapper is an unlabelled control wearing a field's clothes. This is the shape 150 of
the app's 208 controls already use (§3), so the rule describes the system rather than
redirecting it.

**2.2 A label is a short noun — sentence case, as every field label is.** *[README + Geist
for the noun; the casing is content.md rule 2.3's]* *Pickup name*, *Departure*, *Domain*. It names
the thing; it does not narrate what happens to it. **"Departs" and "Resting at" are not
labels** — they read as captions and they sort badly beside their neighbours. Geist's
wording is *"Labels are short Title Case nouns: Project Name, Domain, Environment Variable
Name"* — the noun is adopted, the casing deliberately is not:
[`content.md`](content.md) rule 2.3 rules every field label sentence case on the
2026-08-18 decision and its recorded legibility rationale, and stating the casing only
there is what keeps these two documents from diverging on this axis again. This rule read
*"a short Title Case noun"* from founding until step 5 resolved D5 the owner's way.

**2.3 A placeholder shows an example value, and never substitutes for a label.** *[README +
Geist — both halves were already README's: "describes format or an example value" and "Do not
use placeholder text as the only label"]* Geist:
*"Placeholders show an example value (my-awesome-project, example.com), never instructions
like Enter your project name."* This system adds the second half, because it is the failure
that actually happened here: a placeholder is gone the moment the field is filled, so a
placeholder-as-label leaves a filled form with no way to read what its values mean. A field
may have no placeholder at all — that is the common case once 2.2 is satisfied.

**2.4 Helper text is one sentence, sentence case, with a trailing period** *[README + Geist —
README had "one short sentence when useful" and that it must not repeat the label; Geist adds
the casing, the period and `aria-describedby`]*, on a sibling
`.rux-field__help` wired through `aria-describedby`. Validation copy names the field and the
constraint and ends in a period — *Project name is required.*, *Code must be 6 digits.* — and
never says "please".

**2.5 Validate on blur, not on every keystroke.** *[Geist — README stated where an error
goes, never when it fires]* A field that goes red while someone is
still typing the third character of a valid answer is reporting on their typing, not on
their answer.

**2.6 A label that names one control is a `<label for>`; a label that names a group is not.**
*[this system — `references/interaction-a11y.md` required the element form; the group half was
found by building one]*
Clicking a label must move focus to its control, which only the element form does. Where one
caption heads two or more controls — a date and a time that together are one moment — no
`for` can be correct, so it takes a `.rux-field__label` on a non-label element and the
controls keep their own accessible names. **Do not put `aria-label` on a control that already
has a real label**: the accessible name then comes from two places that can disagree.

**2.7 A group of related fields is a card, not a bare stack.** *[Geist Fieldset]* Geist's Fieldset is *"related
form controls inside a bordered card with optional footer actions"*, which is `.rux-card`
with `__header`, `__title`, `__subtitle` and `__footer` in this system's vocabulary. **The
rhythm between and inside those groups is `layout.md` §9.1's**, not this document's: read the
rung there, and §9.2 for the one case that runs tighter.

**2.8 Which control.** *[Geist]* Its selection rule, adopted:

| Use | When |
|---|---|
| `.rux-input` | a single line of free-form text |
| `.rux-textarea` | the moment the content can wrap to more than one line |
| `.rux-suggestions` | the value comes from a known list the user filters by typing |
| `.rux-select` | the value comes from a short fixed list the user does not filter |

**2.9 A control does not paint its own surface.** *[README]* The field's background, border
and radius come from `--rux-well-bg`, `--rux-input-border` and `--rux-input-border-radius`;
a feature stylesheet that reaches past them to set its own is the divergence
`.sched-scope-trip__doc-content` was. A checkbox or switch fills
`--rux-checkbox-target-height` so it lines up with the button rows beside it —
[`layout.md` §10](layout.md) publishes that height, as it does the field's.

**2.10 An invalid field is marked, and its message sits under it.** `[aria-invalid="true"]`
switches the border to `--rux-input-invalid-border`, and the message goes directly beneath
the control in `.rux-field__error`. **Which attribute carries the state is
[`state.md`](state.md)'s**, not this document's — §2.10 says only what a *field* does when it
is set.

---

## 3. Current state

Censused **2026-08-23** across `index.html` and every module under `js/`.

| | Count |
|---|---|
| form controls | **208** |
| `<label>` elements | 180 |
| `.rux-field` wrappers | **150** |
| controls carrying `aria-label` | 60 |
| controls carrying a placeholder | 74 |

**The convention is already dominant.** `index.html` is 135 controls to 113 wrappers, and
`js/components/itinerary.js` is the worked example of §2 end to end: 15 controls, 12
wrappers, **zero placeholders**, every label a short noun. It reached that state on
2026-08-23 and is the reference to copy *(censused Title Case; step 5 recased every field
label sentence case when D5 resolved — the noun shape is unchanged)*.

The gaps are concentrated, not spread:

| Module | Controls | `.rux-field` |
|---|---|---|
| `js/panels/tasks-panel.js` | 11 | **0** |
| `js/panels/settings-panel.js` | 3 | **0** |
| `js/panels/requirements-panel.js` | 2 | **0** |

---

## 4. Known defects

| | |
|---|---|
| D1 | **Three JS-rendered panels compose no fields at all** — `tasks-panel`, `settings-panel`, `requirements-panel` render 16 controls between them and zero `.rux-field` wrappers, so §2.1 is violated wholesale rather than at the margin. Not yet a numbered step; the census above is the scope. |
| D2 | **74 controls carry a placeholder**, and the census cannot tell which of them are example values (§2.3 compliant) from which are labels in disguise. Splitting that number needs reading them, not counting them. |
| D3 | **`Passengers Board At` is a verb phrase**, and it labels a toggle group rather than an Input. It predates §2.2 and was deliberately left alone when the surrounding labels were corrected, so that the correction was not smuggled in unrecorded. *(Step 5 recased it `Passengers board at` with every other field label; the verb-phrase defect stands.)* |
| D4 | **No test enforces any rule here.** Every other foundation document has at least one contract suite; this one has none, and §2.1 and §2.2 are both mechanically checkable. |
| D5 | **Fixed (step 5) — sentence case, at the owner's direction.** §2.2 keeps the noun and defers casing to content.md rule 2.3, and the app recased (step 5 carries scope and verification). ~~§2.2's casing half conflicts with [`content.md`](content.md) rule 2.3, and the app renders both.~~ Original: found 2026-08-24 during content.md's founding promotion — step 1 here relocated README **§ Forms'** Title Case line without meeting README **§ Casing**'s 2026-08-18 sentence-case decision for field labels, four sections up in the same file, so README's internal contradiction propagated into the foundation tier. The measured split (`Trip type` and `Trip Type` were one label cased both ways), both resolution paths, and their blast radii are recorded once, in content.md **D2**. |

---

## 5. Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; relocate README § Forms and adopt Geist's Input and Fieldset rules | **done · Class A** | Founding entry, 2026-08-23. Written after labelling the Itinerary tab, which cited `layout.md` §9.1 for spacing and `references/interaction-a11y.md` for labels and had nothing to cite for label copy, placeholder policy, field composition or control selection. **The framing this document was started with was wrong and is corrected here:** forms were not ungoverned. `../../README.md` § Forms already stated labels-above-fields, Title Case, no-placeholder-as-label and help-text placement, with a table of values beside them. What was missing was a foundation home — a contract version, an amendment log, and precedence over downstream specifications — not the rules. §2 marks each rule **[README]**, **[Geist]** or **[this system]** so the relocation is legible instead of reading as discovery. **Nothing is invented:** §2.1–2.4 are README's, sharpened where Geist says more (that a label is a *noun*; that helper text is sentence case with a period and wired through `aria-describedby`); §2.5, §2.7 and §2.8 are Geist's, which README had no counterpart for; §2.6 is this system's a11y reference plus the group-label half, found by building one. **Values are deliberately absent** — §1 points at `typography.md` for the label's type and `layout.md` §9.1 for group rhythm, because a value stated twice is a value that will drift. That leaves Q3 open rather than answered. **Deliberately not done:** README § Forms is untouched. `CLAUDE.md` puts consolidation last, and stripping it before this document has settled would delete the only statement of a rule; step 2 carries it. No migration step either — D1's three panels and D2's 74 placeholders are recorded with their scope measured, and each becomes its own step when taken. |
| 3 | Recover the rules step 2 stripped without a home; correct README's stale description | **done · Class A** | **Executed 2026-08-23, immediately after step 2 and because of it.** Step 2 removed README's eight rule bullets on the assumption §2 covered them. It did not cover four: the field's surface tokens, the checkbox and switch hit-target height, the invalid-border switch, and where an error message sits. Grepping the foundation set for each found `aria-invalid` in `state.md` and **nothing at all** for the other three — which is precisely the failure `CLAUDE.md` warns consolidation causes, committed here by me and caught by checking rather than by assuming. §2.9 and §2.10 carry them now, and `layout.md` step 16 took the hit-target height with the other two dimensions. **Two of README's claims were stale and were not recovered, deliberately:** it described fields as having a *"sunken background"* and an *"inset field shadow"*, and `tokens.css` resolves `--rux-well-bg` to `transparent` and `--rux-input-shadow` to `none`, each declared once with no theme override. A field is transparent with a hairline border and no shadow. The orientation prose in README said otherwise, and so did the first draft of the pointer that replaced it — both now describe what renders. Contract 1.1.0 → 1.2.0. |
| 2 | Consolidate: turn README § Forms into a pointer | **done · Class A** | **Executed 2026-08-23**, once Q3 was answered and not before. `CLAUDE.md` puts consolidation last because stripping a section before its document has settled deletes the only statement of a rule, and this section carried two values — 36px and 84px — that nothing else stated. `layout.md` step 16 claimed both into §10 first; only then could the table go. README § Forms now keeps its orientation paragraph and the visual character it describes, and points here for the rules. **What moved:** the eight rule bullets and the seven-row value table. **What stayed:** nothing that states a rule — the remaining prose says what a form *is* in this system, which is orientation, not authority. Contract 1.0.0 → 1.1.0. |
| 4 | Defect bookkeeping repair — §4 was invisible to the rollup counter | **done · patch** | **Executed 2026-08-24, found during `content.md` step 1.** §4's rows marked their numbers `**D1**` where `tests/foundations-contract.test.mjs` matches plain `| D1 |`, so all four open defects counted **zero** and the published rollup agreed with the counter while disagreeing with this document — the same wrong-published-rollup failure `state.md` step 11 closed at the log↔§6 seam, here at the §4↔rollup seam, live since founding. The markers are plain now, matching every other document's defect table; **D5 is recorded** (the §2.2 field-label casing conflict, evidence and resolution paths in content.md D2); and the rollup reads five where it read zero. The counter itself is unchanged: its phrase-matching weakness is already recorded in its own comments as the thing to fix if it misclassifies again, and this was a formatting nonconformance here, not a misclassification there. No rule, value, or name moves. Contract 1.2.0 → **1.2.1**. |
| 5 | D5 resolved — labels are sentence-case nouns; the app recased | **done · Class B** | **Executed 2026-08-24, at the owner's direction** ("go with sentence case, execute the step"). **The rule yields the casing, keeps the noun**: 2.2 now defers casing to content.md rule 2.3 — stated once, there — so the two documents cannot re-diverge on this axis; Geist's Title Case wording is recorded in the rule as a deliberate divergence, the standing composition.md §2.3 gave its own. **The app moved to the rule, and the scope grew under measurement**: content.md D2 priced ~8 itinerary labels plus `Trip Type`; a live-DOM query at boot found **15 more** Title Case field labels rendered by JS that every static grep had missed. Recased, before → after: `Trip Type → Trip type` (label, group aria-label, and a second static site), `Customer Name/Phone → Customer name/phone`, `Email Thread → Email thread`, `Uploaded Files → Uploaded files`, `Service Type → Service type`, `Quoted Price → Quoted price`, `Actual Miles → Actual miles`, `Authorized Amount → Authorized amount`, `Ticket Option → Ticket option`, `Purchase Order → Purchase order` (static site + shipped default in `billing-config.js`), `Contact Name/Phone ${n} → Contact name/phone ${n}` (trip-panel templates), and in `itinerary.js`: `Passengers Board At`, `Customer Meet`, `Yard Departure`, `Resting Location`, `On-Duty` (three sites) and `Off-Duty` recased, plus the composed `${type} Name/Address` and `Stop ${n} Name/Address` templates. **One rendered label stays Title Case, correctly**: the billing step label is user-configurable and loads from the live settings store (`billing-config.js` → `settings-db`), so the rendered value is the owner's data — a write there is unauthorized by standing rule, the shipped default now conforms, and recasing the stored value is one field in Settings. **Deliberate leaves, recorded**: `Google Messages URL` (proper noun + acronym — sentence case leaves it unchanged); `Day ${n} → Day ${n+1}` (parallel construction; lowercasing the second `Day` reads as an error — one line to overrule); `label: "YYYY-MM-DD"` (a format mask, not prose); controls, badges, statuses, select options, tasks-panel strings and the trip envelope (controls are Title Case by the same rule; the rest are content.md D1's census; the envelope is the print world typography.md step 40 excepted). **Verified**: served on `tools/serve.mjs`, live DOM queried — 142 field labels at boot, zero Title Case remaining beyond the two named; `node --check` on all three edited JS files; 394/394 green; cache-busters bumped (`itinerary.js` v61 → v64, `trip-panel.js` v44 → v46, `billing-config.js` v8 → v9 — the tool ran once per edit round, so the numbers moved more than once). **Not eyeballed as pixels, said plainly**: every affected label sits inside the interaction-gated trip editor, and the itinerary's composed labels render only with a trip open — the check is DOM text and parser, which cannot move layout; same recorded gap as typography.md step 40, smaller claim. The Class B before/after clause is satisfied in kind: strings, not px, because no token value moves. Contract 1.2.1 → **1.3.0**. |

---

## 6. Open questions

**Q1 — Should the address field be a published Combobox?** §2.8 sends "a value from a known
list the user filters by typing" to `.rux-suggestions`, and the itinerary's address field is
exactly that: it merges saved locations with Mapbox results and filters as you type. It is
built as `.rux-input` plus a separately-driven `.rux-suggestions` panel. Geist publishes a
`Combobox` component that is one thing rather than two. Whether this system should publish
one — and whether that is a new block or a documented composition of the two existing ones —
is not settled here.

**Q2 — Where do the next component-family documents go?** This is the first, and empty states
were the first *unowned* family, found when the trip panel's empty states were rebuilt on
Geist's EmptyState with no document to record the decision in. Two families in one week says
the set will grow this way. The question is whether component families each get a document
like this one, or whether one document covers the family layer with a section per component.
The answer matters mostly for `README.md` §1's table, which currently reads as a list of
visual concerns and would stop reading that way after three or four more of these.

**Q3 — Who owns the field's dimensions?** **Answered 2026-08-23: `layout.md`.** Its §10 is
*"widths and heights the portable layer publishes as tokens"*, which is exactly what
`--rux-field-height` and `--rux-textarea-min-height` are, and its step 16 claimed both. The
field's internal gap needed no claim: `--rux-field-gap` resolves to `--rux-stack-gap`, which
§7.1 had already taken. Worth recording alongside the answer — measured on
[Geist's Input page](https://vercel.com/geist/input) the same day, **36px is Geist's default
input height** (18 of 22 rendered inputs, against 2 at 32 and 2 at 40), so this system's
field height is conformance rather than a house number. Geist publishes three rungs there and
this system publishes one; whether the other two are wanted is not settled here. The 84px
textarea floor is ours — Geist's specimen renders at 100px with `min-height: auto`.
