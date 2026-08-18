-- ===========================================================================
-- TRIP REQUEST DETAIL
-- ---------------------------------------------------------------------------
-- Lets the Requests module open one request and read what the customer
-- actually submitted.
--
-- list_trip_requests() flattens destination/start_date/end_date/passenger_count
-- out of the payload for the list and discards the rest, so the inbox has
-- never been able to show the filled-out form. This adds a single-row read
-- that returns the whole record, payload included.
--
-- REVIEW BEFORE RUNNING. Dispatcher-only: execute is granted to authenticated,
-- never to anon. Rollback is at the bottom.
-- ===========================================================================

-- ── 1. Single-request read ─────────────────────────────────────────────────
create or replace function public.get_trip_request(p_id uuid)
returns table (
	id              uuid,
	reference       text,
	status          text,
	source          text,
	client          text,
	contact         jsonb,
	passenger_count integer,
	note            text,
	payload         jsonb,
	trip_id         uuid,
	created_at      timestamptz,
	updated_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
	select r.id, r.reference, r.status, r.source, r.client, r.contact,
	       r.passenger_count, r.note, r.payload, r.trip_id,
	       r.created_at, r.updated_at
	from public.trip_requests r
	where r.id = p_id;
$$;

revoke all on function public.get_trip_request(uuid) from public;
grant execute on function public.get_trip_request(uuid) to authenticated;

-- ===========================================================================
-- 2. STILL TO DO BY HAND: created_at on the list
-- ---------------------------------------------------------------------------
-- The Requests table wants a "Received" column, which needs created_at on
-- every row of list_trip_requests(). That function's source is not in this
-- repository — it exists only on the live project — so this file deliberately
-- does NOT `create or replace` it: rewriting a function body I cannot read
-- would silently drop whatever else it does.
--
-- To add it, edit the existing definition and add created_at to both the
-- returns table (...) list and the select list:
--
--   returns table (
--     ...,
--     created_at timestamptz      -- add
--   )
--   ...
--   select ..., r.created_at      -- add
--
-- Until then the client renders an em dash in that column rather than
-- failing: see fmtReceived() in js/panels/request-inbox.js. Nothing breaks
-- if you apply this file and leave list_trip_requests alone.
--
-- If updated_at does not exist on trip_requests either, drop it from the
-- returns table above — nothing in the client reads it yet.
-- ===========================================================================

-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- drop function if exists public.get_trip_request(uuid);
-- (and remove created_at again from list_trip_requests if it was added)
-- ===========================================================================
