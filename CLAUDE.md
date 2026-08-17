# Rux UI — Claude Instructions

## Context Routing

- Read `README.md` for project orientation, then inspect only task-relevant files.
- Do not scan the repository broadly for a narrow change.
- UI or CSS: read `SKILL.md`, then the target markup/style file; inspect `rux-ui/css/tokens.css` when styling or tokens are involved.
- Application behavior: start with the relevant file under `js/` or `index.html` and follow only directly connected dependencies.
- Reference-application data layer: start with the relevant module under `js/data/`, then inspect related SQL under `supabase/`.
- Hard debugging: trace the failing path and expand through callers/callees only as needed.
- Do not read `SKILL.md` for tasks unrelated to UI or frontend work.

## Project Policy

- Reuse existing `--rux-*` tokens and `.rux-*` components before creating new primitives.
- Avoid inline styles and hardcoded colors when an existing token or stylesheet applies.
- Make the smallest coherent change that fulfills the request; do not refactor unrelated code.
- Do not rename or remove public tokens, classes, or JavaScript APIs unless explicitly requested, or unless the change is a step recorded in `docs/portability-audit.md`. That document authorizes its own renames; renames outside it remain prohibited.
- Planning is read-only. For architecture or migration planning, do not modify application, configuration, or SQL files.

## Data and Risk

- When working on the reference application data layer: inspect the affected `js/data/` module and existing SQL patches before schema work; this repository has no consolidated schema file.
- Treat the configured Supabase project as live. Do not create speculative test data or execute production mutations implicitly.
- Destructive SQL, bulk deletion, authentication, secrets, permissions, breaking APIs, and irreversible migrations require an inspect-first proposal, compatibility and rollback analysis, and explicit authorization before execution.

## Verification

- Run the narrowest meaningful check: `node --test tests/<file>.test.mjs` for focused coverage or `npm test` for the full suite.
- For bugs, reproduce or trace the failure before editing and verify the original path afterward.
- For visual changes, use `python3 -m http.server 8642` and inspect affected states at narrow and wide widths and in light and dark themes when tooling permits.
- Review the final diff, run `git diff --check`, and report unverified assumptions.

## Definition of Done

- The requested behavior works.
- Project conventions and compatibility are preserved.
- Relevant verification passes.
- Unverified assumptions and residual risks are reported.
