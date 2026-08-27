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

**`POST /ai/extract`** takes a customer's email text and/or attached documents
and returns a Trip Draft v2 object, by calling the Anthropic API server-side.
This route costs money per call, so it is gated — see below.

The prompt and the schema are fetched at request time from the published copies
on Pages rather than duplicated here, so each has one home in the repository:

- `docs/gem-itinerary-prompt.md`
- `docs/trip-import-schema-v2.json`

That means a prompt change ships with a `git push`, not a Worker redeploy — but
also that the Worker tracks what is **deployed** to Pages, not what is on your
local branch.

## Configuration

Secret — set it yourself, it must never be committed or pasted into a chat:

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Vars (`wrangler.toml` or the dashboard). None are sensitive:

| Var | Value |
|---|---|
| `ALLOWED_USER_ID` | the `id` of the single Supabase auth user allowed to call `/ai/extract` |
| `SUPABASE_ANON_KEY` | the same anon key the browser already ships |
| `APP_ORIGIN` | the app's origin, used for this route's CORS |

`ALLOWED_USER_ID` comes from the user row in the Supabase dashboard under
Authentication → Users, after you create the one account.

## The gate

`/ai/extract` requires an `Authorization: Bearer <supabase access token>` whose
user id equals `ALLOWED_USER_ID`. The Worker asks Supabase who the token belongs
to rather than verifying the JWT signature locally — that needs no second
secret, no HS256 code to get wrong, and it sees revocation, which a signature
check would not.

Anything else on the intake page works signed out. Only this route is gated.

## Ceilings

The Worker caps request size and file count. The real backstop is a **spend
limit in the Anthropic Console** — a hard ceiling no bug on this side can
exceed. Set one.

## Deploying

```bash
wrangler deploy
```

There is no `wrangler.toml` in this repository yet; the Worker predates this
directory. Add one, or paste `index.js` into the dashboard editor, whichever
matches how you want to run it going forward.
