# Rux UI / TripBoard Project Rules

## Load Context Narrowly

- Read `README.md` for orientation, then inspect only files relevant to the task.
- UI or CSS: read `SKILL.md`, then the target markup/style file; inspect `css/tokens.css` when styling or tokens are involved.
- Application behavior: begin with the relevant file under `js/` or `index.html`, following only directly connected dependencies.
- Data or Supabase: begin with the relevant module under `js/data/`, then related SQL under `supabase/`.
- Hard debugging: trace the failing path and expand through callers/callees only when evidence requires it.
- Do not read `SKILL.md` for unrelated backend, data, documentation, or tooling tasks.

## Editing Rules

- Reuse existing `--rux-*` tokens and `.rux-*` components before creating new primitives.
- Avoid inline styles and hardcoded colors when an existing token or stylesheet applies.
- Make the smallest coherent change that satisfies the request; do not refactor unrelated code.
- Preserve public tokens, classes, JavaScript APIs, and schema elements unless a breaking change is explicitly requested.
- Plan mode is read-only: architecture and migration planning must not modify application, configuration, or SQL files.

## Data and Risk

- Inspect the affected data module and existing SQL patches before schema work; there is no consolidated schema file.
- Treat the configured Supabase project as live. Never create speculative test data or execute production mutations implicitly.
- For destructive SQL, bulk deletion, authentication, secrets, permissions, breaking APIs, or irreversible migrations, inspect first, propose the exact change, identify compatibility and rollback concerns, and require explicit authorization before execution.

## Verification and Completion

- Use `node --test tests/<file>.test.mjs` for focused coverage or `npm test` for the full suite.
- Reproduce or trace bugs before editing and verify the original failure path afterward.
- For visual changes, serve with `python3 -m http.server 8642` and inspect narrow/wide layouts and light/dark themes when tooling permits.
- Review the final diff, run `git diff --check`, and report anything unverified.
- Completion means the request works, conventions and compatibility are preserved, relevant checks pass, and residual assumptions or risks are disclosed.
