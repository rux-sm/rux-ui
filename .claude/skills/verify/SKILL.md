---
name: verify
description: Launch and drive rux-ui to observe a change working in the real app.
---

# Verifying changes in rux-ui

This is a static HTML/CSS/JS app with no build step, backed by a live Supabase
project. The scheduler lives in `index.html` + `js/`. The repository has a
small Node test suite configured in `package.json`.

## Launch

```bash
python3 -m http.server 8642
```
(matches `.claude/launch.json`'s `rux-ui-static` config). Then open
`http://localhost:8642/index.html`.

## Gotchas

- **Use the available Node checks** — run `node --check <changed-file.js>` for
  syntax and `node --test tests/<file>.test.mjs` for focused coverage. Run
  `npm test` when the change has broader impact. If a future environment lacks
  Node, report that limitation instead of substituting bracket counts for a
  real parser.
- **If browser automation is unavailable**, GUI changes cannot be
  screenshotted or clicked through. In that case, confirming a change reaches
  the browser is limited to starting the server, `curl`-ing the served files,
  and reading the code paths by hand. That is not equivalent to observing the
  rendered or interactive result; report the pixel/interaction check as
  unverified rather than implying it passed.
- **Supabase is live, not a local/test instance.** Trip/bus/driver data comes
  from a real Supabase project (`js/data/trip-db.js`'s `supabase` client).
  There is no seeded local DB and no sandbox — do not write speculative test
  data (new trips, uploads, deletes) against it without the user's explicit
  go-ahead, since it's their real data. Schema changes ship as
  `supabase/*-patch.sql` files (see existing ones for the idempotent
  `add column if not exists` + constraint style) that the **user** runs
  themselves in the Supabase SQL editor — there's no migration runner here.
- If a change depends on a not-yet-applied `supabase/*-patch.sql`, the DB
  round-trip literally cannot be exercised until the user runs it — call
  that out rather than assuming success.

## What's actually checkable from this environment

- JavaScript syntax: `node --check <changed-file.js>`.
- Automated contracts: `node --test tests/<file>.test.mjs` or `npm test`.
- Static serving: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8642/<path>`
  confirms a file is served and current.
- Content landed: `curl -s http://localhost:8642/<path> | grep ...` confirms
  specific markup/code made it into what the browser would receive.
- Without browser automation, rendering and click behavior need manual user
  verification. Live Supabase writes always require explicit authorization.
