# Rux UI — Claude Instructions

## Context Routing

- Read `README.md` for project orientation, then inspect only task-relevant files.
- Do not scan the repository broadly for a narrow change.
- UI or CSS: the `rux-design` skill covers this and triggers on its own; inspect `rux-ui/css/tokens.css` when styling or tokens are involved. Vendoring the design system into a separate app is the `vendor-rux-ui` skill.
- Design-system rules: `docs/foundations/` is canonical for typography, spacing, color, and motion. Start at `docs/foundations/README.md` — it indexes the documents, carries the shared amendment contract, and rolls up each one's status. Read the relevant document before changing a scale, a token value, or a design rule.
- A customer's itinerary document — PDF, email, photo, pasted notes — is the
  `process-itinerary` skill: document to Trip Draft v3 to the Grid tab to a driver
  sheet. It carries the rule that a trip is never saved without a per-trip go-ahead.
- Application behavior: start with the relevant file under `js/` or `index.html` and follow only directly connected dependencies.
- Reference-application data layer: start with the relevant module under `js/data/`, then inspect related SQL under `supabase/`.
- Hard debugging: trace the failing path and expand through callers/callees only as needed.
- Do not invoke the UI skills for tasks unrelated to UI or frontend work.

## Project Policy

- Reuse existing `--rux-*` tokens and `.rux-*` components before creating new primitives.
- Avoid inline styles and hardcoded colors when an existing token or stylesheet applies.
- Make the smallest coherent change that fulfills the request; do not refactor unrelated code.
- Do not rename or remove public tokens, classes, or JavaScript APIs unless explicitly requested, or unless the change is a step recorded in `docs/portability-audit.md` or a `docs/foundations/` document. Those documents authorize their own renames; renames outside them remain prohibited.
- Before an approved rename, grep the old name across `index.html`, `js/`, `tests/`, `docs/`, and all CSS. Report the hit count per location and list every occurrence outside CSS. Grep again after editing and report the result. The test suite does not cover HTML class attributes or JS selectors, so a class with no CSS left can still be a live query hook.
- Planning is read-only. For architecture or migration planning, do not modify application, configuration, or SQL files. Writing or amending a `docs/foundations/` document is not planning — the document is the deliverable.

## Foundation Work

Design-system work amends the foundation; application work conforms to it. These are
different modes with different rules. Foundation mode applies when the task changes shared
vocabulary — a scale, a token value, a design rule, a naming contract, a component API —
rather than building something on top of it.

- Rules live in `docs/foundations/`, one document per section. Each states the current
  rules **and** carries its own numbered amendment log, and each authorizes its own
  amendments the way `docs/portability-audit.md` authorizes its own renames.
- **A foundation document outranks every downstream specification that renders Rux UI**,
  in this repository or any other. That precedence is scoped: the foundation document owns
  the *vocabulary and its behavior*; the downstream specification owns the *mapping* of its
  own roles onto that vocabulary. A downstream need the vocabulary cannot express is a
  defect in the foundation document, fixed by an amendment there — never by the downstream
  escaping the scale.
- Foundation documents ship to consumers wholesale via `tools/vendor-into.sh`
  (`DOCS_SHIP_DIRS`). Each carries a **contract version**; a downstream document states the
  version it conforms to. Precedence without a version stamp is only "whatever `main` says
  today," which is not control.
- `README.md`'s Visual Foundations stays the orientation summary. Where it and a
  foundation document disagree, the foundation document wins and README is corrected in
  the same change.
- A foundation document is a decision document: it moves no code. Code changes run against
  its amendment log as numbered steps, and a step is not done until the log says so.
- Every amendment is **Class A (additive)**, **Class B (behavioral — an existing token's
  resolved value changes, no name moves)**, or **Class C (a public name is removed or
  renamed)**. Classify it in the step.
- **Class A and B execute directly, then are recorded.** Record the step with the edit,
  never after the fact and never silently.
- **Class C stops and proposes first.** Those reach the vendored consumers, which pin a tag
  rather than tracking `main`. Follow the rename grep protocol above and record the
  consumer migration as its own step.
- **Class B is the dangerous one.** All three gates in `docs/design-system-distribution.md`
  §4 are name-based, so a changed *value* passes every one of them and reaches a consumer
  having tripped nothing. A Class B step MUST record before/after resolved values in px,
  name the states needing a visual check, and bump the document's minor contract version.
- Record what was deliberately *not* done, and why, inside the step. A rule with no
  rejected alternative on record reads as an accident later.
- An amendment that changes what renders must say so in the step and name the states that
  still need an eyeball.
- The `rux-design` skill's "propose, do not add" rule for primitive and semantic tokens
  governs application work. In foundation mode this section governs instead.

**One home per rule.** A rule stated in two places is a rule that will drift. Every design
rule has exactly one canonical home; everywhere else takes one of three non-canonical
forms, and nothing takes a fourth:

- **Canonical** — the `docs/foundations/` document. States the rule *and* its values.
- **Pointer** — names the rule, links the section, and states **no values**. `README.md`'s
  Visual Foundations and the `rux-design` skill are pointers. This is what keeps
  orientation working without creating a second authority.
- **Enforcement** — a test. Not duplication: the rule made executable. It SHOULD cite the
  section it enforces.
- **Rationale** — a comment beside the value it explains, or a dated audit document.
  Legitimate, and proximity is the point. The line is that rationale explains *why a value
  is what it is*; the moment a comment states what someone MUST do, it is a rule and
  belongs in the foundation document.

The test for any sentence outside a foundation document: **does it contain a value, or a
MUST?** If yes, it moves or becomes a pointer.

Consolidation is the **last step of each foundation document, not a separate project**.
Stripping `README.md` § Typography before `docs/foundations/typography.md` is settled
deletes the only statement of a rule. Each document's log ends with its own consolidation
step.

## Data and Risk

- When working on the reference application data layer: inspect the affected `js/data/` module and existing SQL patches before schema work; this repository has no consolidated schema file.
- Treat the configured Supabase project as live. Do not create speculative test data or execute production mutations implicitly.
- Destructive SQL, bulk deletion, authentication, secrets, permissions, breaking APIs, and irreversible migrations require an inspect-first proposal, compatibility and rollback analysis, and explicit authorization before execution.
- This client authenticates as `anon` with the key in page source (`js/data/supabase.js`), so any column it can read is readable by anyone who can load the app. Do not add Social Security numbers or comparable identity secrets to tables this client reads — they stay in the payroll/HR system that already holds them (decided 2026-08-21; destinations and phone numbers are fine, an SSN turns a leak into identity theft and a reportable breach). `supabase/trip_request_detail.sql` and `supabase/trip_request_documents.sql` show the shape such a field would need if this is ever revisited — `revoke all … from anon`, then `grant execute` on a `SECURITY DEFINER` function to `authenticated` — which requires standing up real authentication first, since this app has none.

## Verification

- Run the narrowest meaningful check: `node --test tests/<file>.test.mjs` for focused coverage or `npm test` for the full suite.
- For bugs, reproduce or trace the failure before editing and verify the original path afterward.
- For visual changes, serve with `node tools/serve.mjs` (port 8642) and inspect affected states at narrow and wide widths and in light and dark themes when tooling permits. `python3 -m http.server` was the previous command and cannot start under a sandboxed shell — its parser calls `os.getcwd()` at import time. Node is already required by the test suite.
- Review the final diff, run `git diff --check`, and report unverified assumptions.

## Definition of Done

- The requested behavior works.
- Project conventions and compatibility are preserved.
- Relevant verification passes.
- Unverified assumptions and residual risks are reported.
