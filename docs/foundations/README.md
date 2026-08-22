# Rux UI Foundations

The design rules of Rux UI, one document per section. Each states the current rules **and**
carries its own numbered amendment log, and each authorizes its own amendments the way
`../portability-audit.md` authorizes its own renames. See `CLAUDE.md` § Foundation Work.

These documents **outrank every downstream specification** that renders Rux UI, in this
repository or any other. That precedence is scoped: a foundation document owns the
*vocabulary and its behavior*; a downstream specification owns the *mapping* of its own
roles onto that vocabulary.

---

## 1. The documents

| Document | Contract | Status | Blocked on |
|---|---|---|---|
| [`typography.md`](typography.md) | 4.10.1 | 58 done · 1 deferred · 3 withdrawn | — |
| [`layout.md`](layout.md) | 1.8.0 | 12 done | — |
| [`color.md`](color.md) | 3.0.0 | 19 done | — |
| `motion.md` | — | not written | — |
| [`naming.md`](naming.md) | 1.15.0 | 13 done · 1 open | owner — step 10 held |
| [`state.md`](state.md) | 1.1.0 | 3 done · 3 open | — |

`../motion.md` exists at the component tier and is not yet a foundation document; folding
it in is its own decision.

### The source these documents are written against

**Geist — Vercel's design system — is the adopted base, and the intent is to take it
wholesale rather than section by section.** `typography.md` was settled against it and is
the worked example; the unwritten documents follow the same method.

| This document | Its source | Status |
|---|---|---|
| `typography.md` | [vercel.com/geist/typography](https://vercel.com/geist/typography) | adopted; ramp, leading, tracking and role families all measured from it |
| [`color.md`](color.md) | [vercel.com/geist/colors](https://vercel.com/geist/colors) | written (step 1, 2026-08-21); every scale measured off the page's custom properties in both themes and both gamut branches. Ten-step scales: 1–3 component backgrounds, 4–6 borders, 7–8 high-contrast backgrounds, **9–10 the only two text colours** — which is what answered typography's Q4. Tier 0 is the catalog and every role with a step reads it (steps 2–6). **Its component pages are deliberately *not* a source** — those are Geist's own mapping, and treating one as authority is the mistake `typography.md` Q7 made with the Badge and Q11 reversed; `color.md`'s source note records it |
| [`layout.md`](layout.md) | **none — originated here** | written, breakpoints only. Geist publishes four foundations and **no breakpoint page**, so this is the first foundation rule this repo originates rather than adopts. Its remaining scope (space scale, radius, Materials elevation) is measured from Geist and is recorded as open steps |
| `spacing.md` | [vercel.com/geist/materials](https://vercel.com/geist/materials) | reviewed, not written — and **may not be needed**: `layout.md` steps 4 and 5 already claim the space scale, radius, and the eight elevation presets. Fold or keep is `layout.md` Q4's to settle |
| component specs | the [component index](https://vercel.com/geist) and its 71 pages | **censused, not adopted** — [`naming.md`](naming.md) §7 publishes Geist's component vocabulary and maps it against this system's blocks. It is a name census: it renames nothing, and its central finding is that Geist publishes **no class vocabulary** to converge on. Read §7.3 for the mapping, including the `switch`/`toggle` crossing |

**The values are not published.** Vercel's pages name the classes and say the numbers come
from "the Geist Core Figma system" without listing them, so every figure in `typography.md`
was read off the *rendered specimens* in a browser. Any future document has to do the same —
and should say so, the way its steps do.

**Two places the catalog contradicts its own documentation**, both found by measuring and
worth knowing before trusting a page: its `Badge` renders **11px** at size Small, below the
12px floor its type catalog publishes; and its `label-20` takes 32px leading where every
smaller Label rung is flat at 16–20. Adopt what the specimens do, not what the prose implies.

### What each document owns

`../audit/design-system-audit.md` §5 carries the operative design rules as **R1–R10**, and
its own status note commits them to move: *"as each foundation document lands, the rules in
its domain move there and this list keeps only the test mapping."* This table is the routing
for that move. It **states no rules and no values** — read those in §5, or in the foundation
document once one claims them.

| Document | Rules it will own | State |
|---|---|---|
| `typography.md` | — its domain predates R1–R10 | written |
| `layout.md` | — breakpoints predate them too | written — breakpoints, space, radius, Materials |
| `color.md` | **R6**, the color half — tokens only, both themes | written — rule 2.1 |
| `motion.md` | **R6**, the duration/easing half | planned |
| [`naming.md`](naming.md) | **R1, R2, R4, R5** — one block per component, one modifier vocabulary, namespaces, every emitted class resolves | written |
| [`state.md`](state.md) | **R3, R7, R8** — aria is the state of record, one overlay kernel, focus is visible everywhere | written |

**R9 and R10 are deliberately absent.** The gallery as contract surface and "docs cite
tokens, not numbers" are process rules, and their homes are `CLAUDE.md` and
`../portability-audit.md` rather than any foundation document. Naming them is what makes
this routing exhaustive instead of a list of the tractable ones.

**Every operative design rule now has a home.** When this table was written, seven of the
eight had none: R6 was the only one the set covered, and four of the seven were *already
enforced* — R3, R4 and R8 by their own contract suites, R5 by `class-resolution` — making
them live rules whose only statement was a test. `state.md` took R3, R7 and R8;
`naming.md` took R1, R2, R4 and R5. R6's colour half is in `color.md` and its duration and
easing half waits on `motion.md`, the one document still unwritten.

**The inversion is fixed; the enforcement gaps it exposed are not.** Writing the two
documents was mostly transcription, and the value was in what transcription forced someone
to look at. **R7** was stated nowhere and checked by nothing, and `state.md` §3 found its
scope genuinely ambiguous — `menu.js`'s comment and R7's sentence disagree about whether it
governs all dismissal. **R2** was never enforced either, and `naming.md` §3 found four
drifts a denylist would have caught, including one modifier carrying two concepts. **R1**
turned out to be half enforced: the BEM pattern is checked, and the sentence the rule
actually turns on is not. Three rules, three tests still to write, all recorded as numbered
steps.

**A caution about the shape of this set.** These documents are partitioned by *this
repository's rules*. The table above them partitions by *Geist's pages* — a source for
values, not a map of what needs governing here. `layout.md` already originated a rule Geist
publishes no page for, and `naming.md` and `state.md` would do it twice more. Where the two
shapes disagree the rules win, and Geist stays what it is: where the numbers come from.

---

## 2. The evolution contract

Shared by every document above. A section restating any of it is a defect — point here
instead.

Authority is only useful if it can change, and change is only safe if a consumer can see
it coming. This document is the mechanism.

### 2.1 Every amendment is one of three classes

| Class | What it does | Downstream effect | Authority |
|---|---|---|---|
| **A · Additive** | Adds a token, a rung, a utility, or rule text. Nothing existing resolves differently. | None until a consumer opts in. | Executes directly, then is recorded. |
| **B · Behavioral** | An existing declaration's *resolved value* changes — a token's value, or a rule moving from a literal to a different token. No name moves. | **Re-renders without any name changing.** | Executes directly, but see 2.3. |
| **C · Breaking** | A published token or class is removed or renamed. | Consumer's markup silently loses its styling. | **Stops and proposes first.** |

### 2.2 The gates catch C and are blind to B

`../design-system-distribution.md` §4 runs three gates — `@import` verification, the
consumer name check, and the consumer's own build and tests. **All three are name-based.**
A leading changed from 20px to 22px passes every one of them and reaches production having
tripped nothing. This is the opposite of the `v0.1.0` incident that motivated gate 2, and
it is not covered by the fix for it.

Class B is therefore the class this section exists for. Naming it is most of the control:
an unnamed behavioral change is indistinguishable from a bug when a consumer notices their
spacing moved.

### 2.3 What a Class B amendment MUST carry

1. **Before and after resolved values**, in the step, in px. Not the token name — the
   number a browser computes.
2. **The states that need an eyeball**, named. Both themes, and narrow and wide, unless the
   step says why one does not apply.
3. **A minor version bump** on the document's contract version, so a consumer pinning
   `1.0.0` can see that `1.1.0` moved something under them.
4. **Batching.** Class B amendments SHOULD land together in one release rather than
   dribbling across several, so a consumer reviews rendering once instead of five times.

### 2.4 How a downstream document conforms

A specification that renders Rux UI type SHOULD carry a conformance line naming the version
it was written against:

```
Conforms to: Rux UI Foundations — Typography 1.0.0
```

That line is what makes the precedence rule operable rather than rhetorical. Without it,
"the type system wins" means "whatever `main` says today," and a downstream author has no
way to tell whether they are out of date or the upstream moved. With it, the drift is a
version comparison and the review is a diff of §5 between two tags.

Adoption is deliberate, never automatic. A consumer MAY stay on an older contract version;
what it MUST NOT do is claim conformance to a version it has not read.

### 2.6 An element with no close match adapts; it does not earn a new rule

When an element's current values match no published option, the default is to **change the
element** to the nearest published option. It is not evidence that the foundation is short.

This is the direction of travel, and it only runs one way. A foundation document is written
against a measured source; an element is written against whatever the person building it
needed that afternoon. When they disagree the element is the weaker claim, and "this one is
special" is what every element says. Left to accumulate, those exceptions *are* the old
system — the foundation ends up describing nothing that renders.

So: a new rung, role, or token requires showing the **catalog is genuinely short** — a need
that recurs, that no published option can express, and that a downstream would hit too.
An element being unusual is not that. A value being someone's earlier preference is not
that. Where the nearest option is not a perfect fit, the imperfection is accepted and the
element moves; where it is genuinely unusable, that is a defect in the foundation and gets
an amendment with the argument on record.

The corollary for consolidation: **finished foundations are the only vocabulary.** Once a
document is settled, every element it governs is expected to resolve entirely within it, and
a review that finds otherwise is finding work, not an exception.

*(Added 2026-08-22 by the owner's standing instruction: adapt content to the foundations;
where a current element has no close match, pick a good option from the foundation and
change it. Applies to all work going forward. Supersedes the closing sentence of
`typography.md` rule 2.2's "metric axes" clause, which had the default backwards.)*

### 2.5 Versioning rules

- **Patch** — wording, evidence, a corrected citation. No token, rule, or value moves.
- **Minor** — any Class A or Class B amendment. Pre-1.0 practice in
  `design-system-distribution.md` §1 allows a minor to carry a breaking rename; **this
  document does not adopt that allowance.** A rename is Class C and takes a major.
- **Major** — any Class C amendment, or a change to §1's tier model or §2's rules that
  invalidates existing conforming markup.

The contract version tracks *a foundation document*, not the repository tag. They move
independently: a `rux-ui` release may carry no type change at all.

---

## 3. Status, and why there is no TODO file

Each document's amendment log **is** its todo list: `[open]`, `[ready]`, `[deferred]`, and
`done` are the states, and §6 of each document holds the decisions that block them. A
separate TODO or status file would state the same thing twice, and two statements of one
fact drift — which is the failure this whole system exists to prevent.

What a log does not give you is a glance. So each document carries a **Status** block under
its title, and the table in §1 rolls those up. Both are *derived* from the log, never
authored independently, and `tests/foundations-contract.test.mjs` fails when a Status block
disagrees with the log it summarizes. Derived-and-checked is the only duplication this
system accepts.
