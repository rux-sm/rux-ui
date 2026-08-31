# Cloudflare Worker

Source for `white-boat-9932.rux-smercado.workers.dev`, the origin the app talks
to instead of Supabase directly (`js/data/supabase.js`).

It was previously deployed from the Cloudflare dashboard with no copy in the
repository. It lives here now so a change to it is reviewable.

## What it does

**Everything except `/ai/extract`** is a transparent CORS proxy to Supabase,
including the Realtime WebSocket upgrade. This is deliberately open: the
browser already ships the anon key in page source, so gating the proxy would
protect nothing that is not already public.

**`POST /ai/extract`** takes a customer's email text and/or attached PDFs and
photos and returns a trip draft, by calling the Anthropic API server-side. This
route costs money per call, so it is gated — see below.

Two lanes, chosen by `lane` in the request body:

| `lane` | Prompt | Schema | Called by |
|---|---|---|---|
| `itinerary` (default) | `docs/itinerary-prompt.md` | v3 | The Grid tab and the itinerary inbox |
| `quote` | `docs/gem-itinerary-prompt.md` | v2 | `intake.html`, when that lane is finished |

The prompt and the schema are fetched at request time from the published copies
on Pages rather than duplicated here, so each has one home in the repository.
That means a prompt change ships with a `git push`, not a Worker redeploy — but
also that the Worker tracks what is **deployed** to Pages, not what is on your
local branch.

Request body:

```json
{ "lane": "itinerary",
  "text": "the customer's email, or empty",
  "files": [{ "name": "trip.pdf", "media_type": "application/pdf", "data": "<base64>" }] }
```

Response: `{ "draft": { … }, "usage": { … } }`. The client is
`js/data/extract.js`.

## Configuration

Secrets — set them yourself. Neither may ever be committed or pasted into a
chat, including to me:

```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put EXTRACT_PASSPHRASE
```

Vars (`wrangler.toml`). Not sensitive:

| Var | Value |
|---|---|
| `APP_ORIGIN` | the app's origin, used for this route's CORS |

## The gate

`/ai/extract` requires an `X-Rux-Extract-Key` header equal to
`EXTRACT_PASSPHRASE`, compared in constant time. The operator types the
passphrase once per device into the app's Settings → Reading documents, where
it is held in **that browser's `localStorage`** — not in the Supabase `settings`
table, which the anon client can read and which would therefore publish it.

**What this is and is not.** It keeps the passphrase out of page source and
proportions the risk to an internal tool with one operator. It is not
authentication: anyone who learns it can use it, and there is nothing to revoke
but the secret itself.

This replaced a Supabase-session gate checking `ALLOWED_USER_ID`, which was the
stronger design — and which presumed an authenticated user this app has never
had. The route had never run once in consequence. If a sign-in is ever added,
swapping the gate back is one function; the previous implementation is in git
history.

## Ceilings

The Worker caps request size and file count. The real backstop is a **spend
limit in the Anthropic Console** — a hard ceiling no bug on this side can
exceed. Set one.

## Deploying

```bash
cd worker && wrangler deploy
```

`wrangler.toml` is beside this file. Its `name` must keep matching the existing
Worker, or `deploy` creates a second one at a different hostname while the app
goes on talking to the old one.

**What is deployed is behind this directory.** As of 2026-08-31 the live Worker
answers `/ai/extract` with the Supabase proxy's 404 — "requested path is
invalid" — which means the route in this file has never been deployed at all.
`js/data/extract.js` detects that 404 and says so rather than passing PostgREST's
wording to a dispatcher.
