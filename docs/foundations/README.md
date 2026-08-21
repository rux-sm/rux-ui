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
| [`typography.md`](typography.md) | 1.13.2 | 28 done · 6 open · 2 deferred | Q6 |
| [`layout.md`](layout.md) | 1.0.0 | 2 done · 5 open | — |
| `spacing.md` | — | not written | — |
| `color.md` | — | not written | — |
| `motion.md` | — | not written | — |

`../motion.md` exists at the component tier and is not yet a foundation document; folding
it in is its own decision.

### The source these documents are written against

**Geist — Vercel's design system — is the adopted base, and the intent is to take it
wholesale rather than section by section.** `typography.md` was settled against it and is
the worked example; the unwritten documents follow the same method.

| This document | Its source | Status |
|---|---|---|
| `typography.md` | [vercel.com/geist/typography](https://vercel.com/geist/typography) | adopted; ramp, leading, tracking and role families all measured from it |
| `color.md` | [vercel.com/geist/colors](https://vercel.com/geist/colors) | reviewed, not written. Ten-step scales: 1–3 component backgrounds, 4–6 borders, 7–8 high-contrast backgrounds, **9–10 the only two text colours** — which is what answered Q4 |
| [`layout.md`](layout.md) | **none — originated here** | written, breakpoints only. Geist publishes four foundations and **no breakpoint page**, so this is the first foundation rule this repo originates rather than adopts. Its remaining scope (space scale, radius, Materials elevation) is measured from Geist and is recorded as open steps |
| `spacing.md` | [vercel.com/geist/materials](https://vercel.com/geist/materials) | reviewed, not written — and **may not be needed**: `layout.md` steps 4 and 5 already claim the space scale, radius, and the eight elevation presets. Fold or keep is `layout.md` Q4's to settle |
| component specs | e.g. [badge](https://vercel.com/geist/badge), [note](https://vercel.com/geist/note) | reviewed, not written. `badge` maps to `.rux-badge`, `note` to `.rux-alert` |

**The values are not published.** Vercel's pages name the classes and say the numbers come
from "the Geist Core Figma system" without listing them, so every figure in `typography.md`
was read off the *rendered specimens* in a browser. Any future document has to do the same —
and should say so, the way its steps do.

**Two places the catalog contradicts its own documentation**, both found by measuring and
worth knowing before trusting a page: its `Badge` renders **11px** at size Small, below the
12px floor its type catalog publishes; and its `label-20` takes 32px leading where every
smaller Label rung is flat at 16–20. Adopt what the specimens do, not what the prose implies.

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
