---
name: verify
description: >-
  Use this skill when the user asks to run, start, serve, open, or screenshot
  this app, or to confirm a change actually works in the browser rather than
  only in tests. Triggers on "run the app", "start the server", "does it
  work", "check it in the browser", "verify this", "localhost", "8642".
  ALWAYS use this instead of the generic run skill: it carries this
  repository's live-Supabase safety rules and its honest limits on what can
  and cannot be verified from this environment.
---

# Verifying changes in rux-ui

Static HTML/CSS/JS with no build step, backed by a live Supabase project. The
scheduler lives in `index.html` + `js/`. A small Node test suite is configured
in `package.json`.

## Launch

```bash
node tools/serve.mjs
```

Same command as `.claude/launch.json`'s `rux-ui-static` config
(`runtimeExecutable: node`, `runtimeArgs: ["tools/serve.mjs"]`) and as
CLAUDE.md § Verification, which rules out `python3 -m http.server`: its
argument parser calls `os.getcwd()` at import time and cannot start under a
sandboxed shell.

That config sets `autoPort: true`, so the port may not be 8642. The server
prints the one it bound — `serving <root> on http://localhost:<port>` — and
`tools/serve.mjs` takes a port from argv, then `$PORT`, then 8642. Open
`http://localhost:<port>/index.html` with the reported number, and use that
same number in the `curl` examples below.

## Hard constraints

- **NEVER write to Supabase without explicit user authorization.** Trip, bus,
  and driver data comes from a real Supabase project (`js/data/trip-db.js`'s
  `supabase` client). There is no seeded local DB and no sandbox — it is the
  user's real data. No speculative trips, uploads, or deletes.
- **NEVER run `supabase/*-patch.sql` yourself.** There is no migration runner
  here. Schema changes ship as patch files (see existing ones for the
  idempotent `add column if not exists` + constraint style) that the **user**
  runs in the Supabase SQL editor. If a change depends on a not-yet-applied
  patch, the DB round-trip literally cannot be exercised — say so rather than
  assuming success.
- **ALWAYS use a real parser, never heuristics.** `node --check <file>.js` for
  syntax; `node --test tests/<file>.test.mjs` for focused coverage; `npm test`
  when the change has broader impact. If a future environment lacks Node,
  report that limitation — do NOT substitute bracket counts for a parser.
- **NEVER report a visual or interaction check as passing without browser
  automation.** `curl` proves a file was served, not that it rendered. Report
  the pixel/interaction check as unverified rather than implying it passed.

## What is actually checkable from this environment

- JavaScript syntax: `node --check <changed-file.js>`.
- Automated contracts: `node --test tests/<file>.test.mjs` or `npm test`.
- Static serving: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/<path>`
  confirms a file is served and current.
- Content landed: `curl -s http://localhost:<port>/<path> | grep ...` confirms
  specific markup/code made it into what the browser would receive.
- Without browser automation, rendering and click behavior need manual user
  verification. Live Supabase writes always require explicit authorization.
