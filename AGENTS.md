# Rux UI Agent Instructions

## Before Editing

- Read `README.md` for project orientation.
- Inspect only the files relevant to the requested task; do not scan the entire repository for a narrow change.
- Follow this routing order:
  - UI or CSS: `SKILL.md`, then the target markup/style file; inspect `css/tokens.css` when styling or tokens are involved.
  - Application behavior: the relevant file under `js/` or `index.html`, then directly connected dependencies only.
  - Reference-application data layer: the relevant module under `js/data/`, then related SQL under `supabase/`.
  - Hard debugging: the failing path first, expanding through callers and callees only as evidence requires.

## UI Tasks

- Read `SKILL.md` before editing UI, CSS, components, design tokens, content, or responsive layout. Do not load it for unrelated work.
- Reuse existing `--rux-*` tokens and `.rux-*` components before creating new primitives.
- Do not introduce inline styles or hardcoded colors when an existing token or stylesheet applies.

## Scope and Planning

- Make the smallest coherent change that satisfies the task; do not refactor unrelated code.
- Do not rename or remove public tokens, classes, or JavaScript APIs unless explicitly requested.
- Architecture and migration planning is read-only. During a planning task, do not modify application, configuration, or SQL files.

## Data and High-Risk Work

- When working on the reference application data layer: inspect the affected `js/data/` module and existing SQL patches before proposing schema changes. There is no consolidated schema file in this repository.
- Treat the configured Supabase project as live. Do not create test data or execute production mutations implicitly.
- For destructive SQL, bulk deletion, authentication, secrets, permissions, breaking APIs, or irreversible migrations: inspect first, propose the exact change, identify compatibility and rollback concerns, and wait for explicit authorization before execution.

## Verification

- Run the narrowest meaningful check. Use `node --test tests/<file>.test.mjs` for a focused test or `npm test` for the full suite.
- For bugs, reproduce or trace the original failure before editing and verify that path afterward.
- For visual changes, serve the repository with `python3 -m http.server 8642` and inspect the affected states at narrow and wide widths and in light and dark themes when tooling permits.
- Review the final diff and run `git diff --check`; report anything that could not be verified.

## Definition of Done

- Requested behavior works.
- Project conventions and compatibility are preserved.
- Relevant verification passes.
- Unverified assumptions and residual risks are reported.
