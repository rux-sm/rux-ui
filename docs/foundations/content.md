# Rux UI Foundations — Content

**Contract version: 1.0.2** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 3 steps: **3 done**
Founding entry — a **promotion, not a rewrite**: these rules governed as `README.md`'s
§ Content Fundamentals since before the foundation set existed, and the casing split was
litigated there on 2026-08-18 with its reasoning recorded. The rules moved here whole;
README's section is a pointer now, and the move found the drift the one-home rule
predicts — three internal contradictions inside README itself (step 1), and one live
conflict with a sibling foundation document (D2).

**Source: originated here.** Geist publishes no voice, casing, or writing page — the
**fifth** foundation this repository originates rather than adopts, after `layout.md`'s
breakpoints, `motion.md`, `composition.md`, and `shell.md`. The strongest evidence is
already inside rule 2.3's own history: Geist's rendered docs are internally inconsistent
on casing (`Upload` and `Sign Up` on buttons, but `Prefix and suffix` as a heading), so
"follow Geist" settles nothing here and the split is this system's own position. **No gap
source is adopted**; Q1 holds the candidates for an owner-directed step, the way
`composition.md` step 2 adopted Cloudscape for patterns.

---

## 1. The vocabulary

**Content is every string the product renders**: control labels, headings, field labels,
body copy, help text, empty states, errors, toasts, dates, numbers, and money. This
document owns the rules that make those strings read as one product.

What it does **not** own, and where that lives:

- **A form label's composition and copy behaviour** — that it is a noun, how placeholders
  and help text behave, where an error message sits — is [`forms.md`](forms.md) §2.2–2.4
  and §2.10. The *casing* of every string, field labels included, is rule 2.3 here — and
  the two documents currently disagree about exactly that: **D2**.
- **How text renders** — role, size, weight, leading, tracking — is
  [`typography.md`](typography.md). Tabular figures are its rule 2.9. Rule 2.3 here
  governs the *characters* (no uppercase); typography's rule 2.13 governs the tracking
  that uppercase used to travel with.
- **Where a title lives** — which surface names a record, where a share page's `<h1>`
  goes — is [`composition.md`](composition.md) §2.2 and its Q6.
- **`README.md` § Content Fundamentals is a pointer**, kept for orientation. The
  `rux-design` skill routes here; a missing content rule is proposed against §5's log,
  never added to README.

---

## 2. Rules

### 2.1 Voice

- **Direct.** Short sentences. Verb-first when you can.
- **Active voice.** "Save the trip" over "The trip will be saved." A control says exactly what happens when it's used.
- **Calm.** No exclamation marks, no urgency unless it's truly urgent (a destructive action, an error).
- **Plain.** Plain words over technical ones. "Delete trip" over "Remove record". "Couldn't connect" over "Connection failure occurred".
- **Trustworthy.** Tell the user what happened and what they can do. Never blame them.
- **Consistent through a flow.** An action keeps the same name end to end — a
  "Publish" button produces a "Published" toast, not "Success" or "Done."

### 2.2 Person

- **You** addresses the user directly. "You haven't saved this trip yet."
- **We** is the product team, used sparingly and only for product communication ("We're updating the schedule format"). Never in UI labels.
- **Never "I"** in UI copy.

### 2.3 Casing follows what an element *is*, not where it sits

A control is a thing you act on and reads as a label; a heading, a field label, and body
copy are read as language.

- **Title Case** for **controls**: buttons, menu items, navigation destinations, tabs, toasts.
    - ✅ `New Trip`, `Save Changes`, `Send Trip Request`
    - ❌ `New trip`, `Save changes`, `Send trip request`
- **Sentence case** for **headings, form field labels, radio/checkbox/switch option labels, and body copy**.
    - ✅ `Day of the trip`, `Pickup address or venue`, `Round trip`, `I am the day-of contact`
    - ❌ `Day Of The Trip`, `Pickup Address Or Venue`, `Round Trip`
- **No UPPERCASE, and no tracking on labels.** Overlines and section labels are
  **sentence case at the label role's own tracking (0)**, like every other label.
    - ✅ `Recent changes`, `Trip contact`, `Move to bus`
    - ❌ `RECENT CHANGES`, `TRIP CONTACT`
    - Acronyms that are genuinely acronyms keep their caps — `CDL`, `VIN`, `ZIP`.

  This bullet read *"UPPERCASE only for overlines and badges … track them out
  (`letter-spacing: 0.04em`)"* until 2026-08-21. It was withdrawn because rule 2.13 in
  [`typography.md`](typography.md) holds that Label tracks **0 at every size it
  publishes**, measured on the Geist specimens — so an overline that is uppercased *and*
  tracked out is two departures from the catalog at once. Of the three ways to resolve
  that, dropping the uppercase is the only one needing no departure at all, and it is the
  one taken (typography.md §5 step 40, Q10). Badges were never affected: nothing
  uppercases them in CSS, and their caps come from the data.

The split is deliberate. Title Case makes a control read as one named thing, which is why
it earns its place on buttons and menu items. Field labels are often phrases rather than
names — `Pickup address or venue`, `Day-of contact phone` — and Title Case fights their
legibility, which matters most on customer-facing pages such as `request.html`.

This rule was Title Case for everything until 2026-08-18. Vercel Geist, the structural
reference elsewhere in this system, publishes **no** casing rule and its own docs are
inconsistent — `Upload` and `Sign Up` on buttons, but `Prefix and suffix` and `All Types
and Sizes in comparison` as headings. So this is our own position rather than one
inherited, and the "follow Geist" heuristic does not settle it.

**The field-label half of this rule was contested and is settled: sentence case.** D2
recorded this document against [`forms.md`](forms.md) 2.2, which ruled a label a Title
Case noun; the owner resolved it 2026-08-24, and forms.md step 5 executed — its rule 2.2
keeps the noun and defers casing here, so the axis has one home and cannot re-diverge,
and every Title Case field label the app rendered was recased (the scope, the deliberate
leaves, and the one data-fed exception are in that step). The evidence and both priced
paths stay in D2's row.

### 2.4 Punctuation

- No trailing periods on **button labels**, **menu items**, **field labels**, **table headers**, **toasts**, or **single-line tooltips**.
- Periods **are** used in full sentences inside body copy, modal descriptions, and multi-sentence help text.
- Ellipsis (`…`, the actual character, not three dots) for actions that open a follow-up step (`Export…`, `Delete trip…`) and for in-progress states (`Saving…`, `Loading…`).
- Curly quotes (“Delete”) rather than straight quotes ("Delete") in copy.

### 2.5 Numbers, dates, units

- Use real characters: `–` for ranges (`Mon–Fri`), `×` for dimensions, `′″` for feet/inches if needed.
- Times: lowercase `am`/`pm`, no space. `9:00am`, `3:30pm`.
- Dates in UI lists: `Tue, Mar 12`. Full dates: `March 12, 2026`.
- Money: `$1,240` not `$1240.00` unless cents matter.
- Use numerals for counts: `8 trips`, not `eight trips`.
- Use a non-breaking space between a number and its unit, or inside a
  keyboard shortcut, so they never wrap apart: `10&nbsp;mi`, `⌘&nbsp;K`.
- Use `Intl.DateTimeFormat` / `Intl.NumberFormat` for date, time, and number
  formatting — never hand-rolled string formatting. *(Whether an engineering rule keeps
  its home in a content document is Q2.)*
- Tabular figures are [`typography.md`](typography.md) **rule 2.9**'s: a stated property
  of a role that carries times, counts, or dates — never a global. *(This bullet stated
  the rule itself until step 1; typography.md had owned it all along, and a rule stated
  twice is the drift D2 documents actually happening.)*

### 2.6 No emoji

**Do not use emoji** in Rux UI surfaces — in copy, and as icons. Status is communicated
by color, a Material Symbols icon, and the badge component. Emoji are inconsistent across
platforms and clash with the minimalist tone.

---

## 3. The examples

Worked specimens, not extra rules: each cell is §2 applied, and a cell that seems to add
a rule is misread.

| Context     | Good                                                  | Bad                                                 |
| ----------- | ----------------------------------------------------- | --------------------------------------------------- |
| Empty state | `No trips this week`                                  | `Looks like you don't have any trips yet! 🚌`       |
| Error       | `Couldn't save. Check your connection and try again.` | `Oops! Something went wrong saving your trip!`      |
| Confirm     | `Delete this trip?` `This can't be undone.`           | `Are you sure you want to permanently delete this?` |
| Toast       | `Trip Saved`                                          | `Trip successfully saved.`                          |
| Button      | `Save` `Delete Trip…`                                 | `save trip` `DELETE`                                |

---

## 4. Known defects

| # | Defect |
|---|---|
| D1 | **Narrowed by step 3 (2026-08-24), still open.** One slice of one rule is enforced now: `tests/forms-contract.test.mjs` asserts rule 2.3 against every `.rux-field__label` on all nine pages, and it caught two Title Case labels a hand census had missed. **Everything else stands** — no other rule is enforced, no census has been taken, and field labels are a small fraction of the shipped strings. Original text: **Nothing enforces any rule here, and no census has measured the shipped strings against them.** Casing and trailing punctuation are mechanically checkable the way `forms.md` D4 notes its own rules are; voice is not, and a checker should not pretend otherwise. The census half is real work: every string in `index.html`, the three share pages, and the JS-built panels, read against §2. D2's measurement is the only slice taken so far. |
| D2 | **Fixed (forms.md step 5, 2026-08-24) — sentence case, at the owner's direction.** forms.md 2.2 keeps the noun and defers casing to rule 2.3; the app recased, with scope and verification in that step. ~~This document and [`forms.md`](forms.md) state opposite casings for field labels, and the app renders both.~~ Original evidence: Rule 2.3 (decided 2026-08-18 in README § Casing, with the legibility rationale on record) rules field labels **sentence case** — its ✅ examples are field labels. `forms.md` 2.2 (founded 2026-08-23) rules a label **"a short Title Case noun"** on the prose of Geist's Input page, and its §3 names `itinerary.js` — *"every label a Title Case noun"* — the reference to copy. Neither cites the other: forms.md step 1 relocated README **§ Forms'** Title Case line and never met **§ Casing** four sections up in the same file, so README's own internal contradiction propagated into the foundation tier. **Measured 2026-08-24:** `request.html` renders every multi-word field label sentence case (`Pickup date`, `Trip type`, `Your name`); `index.html` renders four sentence case (`Contact name`, `Client / group`, `Report type`, `Seats filled`) against one Title Case (`Trip Type`); `itinerary.js` renders Title Case (`Passengers Board At`, `Customer Meet`, `Yard Departure`); **`Trip type` and `Trip Type` are the same label cased both ways on two surfaces.** `typography.md` step 40 (2026-08-21) had already sentence-cased five label strings as foundation work, so the two documents moved in opposite directions in the same week. **Resolution is an owner's call, classified in whichever document yields.** Sentence case amends forms.md 2.2's casing half (its noun half is uncontested) and recases ~8 `itinerary.js` labels plus `Trip Type` — the smaller blast radius, aligned with the recorded rationale and with the majority of what renders. Title Case amends rule 2.3's field-label clause and recases `request.html`'s customer-facing form plus most of `index.html`'s editors — and must answer the 2026-08-18 reasoning it overturns. Either path changes rendered text and MUST name the states needing an eyeball. Cross-recorded as forms.md **D5**. |

---

## 5. Amendment log

| # | Step | Status | Notes |
|---|---|---|---|
| 3 | Rule 2.3 gains its first enforcement, in another document’s suite | **done · patch** | **Executed 2026-08-24.** The test is [`forms.md`](forms.md) step 7’s — it was written to close that document’s D4, and the field-label casing assertion inside it enforces **this document’s rule 2.3**, because step 2 put casing here and nowhere else. This step is the bookkeeping on this side, on the same footing step 2 had. **Why the test lives there and not here:** it reaches its subject through `.rux-field__label`, which is `forms.md` §1’s vocabulary, and a suite split across two files by which document owns each assertion would be harder to read than one suite that cites its sources. The rule stays stated once, here; the test cites it by number. **What it proves that a census could not.** `forms.md` step 5 recased the app by hand, queried the live DOM, and reported zero Title Case labels remaining beyond two named leaves. Two survived — `Est. Miles` and `Pick-up Location` — because a period and a hyphen defeated the heuristic it checked with. Both are fixed in that step. **This is the argument for D1’s remaining half**: the rules here are checkable, and hand-checking them has now demonstrably failed once. **One exception is carried in the suite:** `Google Messages URL`, a proper noun plus an acronym. An all-caps word passes by construction, so acronyms need no listing. **Deliberately not done:** no census, no enforcement of trailing punctuation, voice, person, numbers or emoji, and no test of its own for this document. D1 is narrowed to say what is now covered and stays open. Nothing renders differently. Contract 1.0.1 → **1.0.2**. |
| 1 | Establish this document — promote README § Content Fundamentals | **done · Class A** | **Executed 2026-08-24, at the owner's direction** ("draft the content doc next"). A **promotion, not a rewrite**, on the `shell.md` precedent: every rule moved with its text and its history paragraphs verbatim — the withdrawn-overline note, the 2026-08-18 casing decision, the Geist-inconsistency evidence — and the §1–§6 skeleton and rule numbers are the only new thing, which is format, not meaning (`shell.md` declined its renumber because tests read its headings; nothing reads these). **Three internal README contradictions died in the move, because leaving any would promote a falsehood:** § Conventions said *"Title Case for UI controls and headings"* while § Casing ruled headings sentence case — the fence now points here; § Iconography restated the emoji rule a second time and claimed *"the only acceptable unicode character is `…` and `–`"* while § Numbers requires `×`, `′″`, `–`, and curly quotes — pointerized; and the tabular-figures bullet restated `typography.md` rule 2.9 — now a pointer, with the correction recorded in place. **One live foundation-tier conflict found and recorded, not resolved: D2** — field-label casing, this document against `forms.md` 2.2, cross-recorded there as D5, with the measured split (`Trip type` vs `Trip Type` is one label cased both ways) and both resolution paths priced. Resolving it is an owner's classified step and changes rendered text; a founding promotion is the wrong vehicle. **The same pass found forms.md's §4 invisible to the rollup counter** — its rows mark their numbers `**D1**` where the counter matches `| D1 |` — fixed there as its step 4, because a published rollup reading 0 against four listed defects is the failure `state.md` step 11 closed at a different seam. **Boundaries stated in §1** rather than discovered later: `forms.md` keeps label composition and help-text behaviour, `typography.md` keeps every rendering axis, `composition.md` keeps title placement. **Pointers re-aimed:** README § Content Fundamentals is a pointer on the colour/typography §-table pattern; the `rux-design` skill's content section routes here. **Deliberately not done:** no gap source adopted (Q1 — adoption is owner-directed, the `composition.md` step 2 precedent); no copy census and no enforcement (D1 — recorded with the checkable/uncheckable line drawn); the `docs/ai/` operating guides' one-line restatements left as orientation, named here so the exemption is a decision rather than an oversight; D2 left open on purpose. Nothing renders differently. |
| 2 | Record D2's resolution — the contested note becomes settled | **done · patch** | **Executed 2026-08-24.** The amendment itself is [`forms.md`](forms.md) step 5's — that document yielded: its rule 2.2 keeps the noun and defers casing to rule 2.3 here, which leaves this axis one home. This step is the bookkeeping on this side: D2 struck with the resolution named, 2.3's contested paragraph now states the settlement, and the README pointer and `rux-design` skill lines that warned *"contested — do not recase"* were corrected in the same change, because a stale freeze instruction is worse than none. No rule of this document changed meaning — field labels were already sentence case here; what changed is that nothing contradicts it. Contract 1.0.0 → **1.0.1**. |

---

## 6. Open questions

**Q1 — Is a gap source wanted?** Geist publishes nothing here, so every future rule is
either originated or borrowed from a named source. The candidates, if the owner wants
one: **Cloudscape's writing guidelines** (same operational-console genre, already the
pattern gap source, one adoption mechanism instead of two) and the **GOV.UK content
style guide** (the deepest public treatment of UI writing, but aimed at citizen-facing
services). Adoption is an owner-directed step with a sourced comparison, the way
`composition.md` step 2 did it — not a default.

**Q2 — Do the engineering bullets belong here?** Rule 2.5 carries two rules about *how
strings are produced* rather than how they read: the `Intl.DateTimeFormat` /
`Intl.NumberFormat` requirement, and the non-breaking-space rule (markup, not wording).
They moved verbatim because splitting a promotion is how rules get lost (`forms.md` step
3 records exactly that failure), but their long-term home may be a process document
rather than a content foundation. Against moving them: a copy author is exactly who needs
to see them, and one document per question beats purity. Blocks nothing; recorded so the
next amendment decides deliberately.
