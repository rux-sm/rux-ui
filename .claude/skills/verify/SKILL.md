---
name: verify
description: Launch and drive rux-ui to observe a change working in the real app.
---

# Verifying changes in rux-ui

This is a static HTML/CSS/JS app (no build step, no `package.json`) backed by a
live Supabase project. The whole scheduler lives in `index.html` + `js/`.

## Launch

```bash
python3 -m http.server 8642
```
(matches `.claude/launch.json`'s `rux-ui-static` config). Then open
`http://localhost:8642/index.html`.

## Gotchas

- **No Node/npm in this environment** — there's no `node`, `deno`, or `bun`
  binary available, so JS can't be syntax-checked by actually parsing it.
  The best available proxy is a bracket-balance sanity check (counts of
  `{}`/`()`/`[]` across the diff) plus careful re-reading — not a real
  substitute for execution.
- **No browser automation tool available either** (no Playwright/Chrome
  DevTools MCP, no headless browser) — GUI changes can't be screenshotted or
  clicked through from this environment. Confirming a change reaches the
  browser is limited to: starting the server, `curl`-ing the served files to
  confirm the expected markup/code landed, and reading the code paths by
  hand. That is NOT equivalent to observing the rendered/interactive result —
  say so explicitly (BLOCKED at the pixel/interaction level) rather than
  implying a GUI change was visually verified when it wasn't.
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

- Static serving: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8642/<path>`
  confirms a file is served and current.
- Content landed: `curl -s http://localhost:8642/<path> | grep ...` confirms
  specific markup/code made it into what the browser would receive.
- Everything past that (rendering, click behavior, live Supabase writes) needs
  either the user driving it manually or a future session with a real browser
  automation tool wired up.
