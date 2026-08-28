-- ===========================================================================
-- TRIP ITINERARIES  ·  storage for the Grid tab
-- ---------------------------------------------------------------------------
-- One Trip Draft v3 document per trip, as jsonb. Additive: nothing existing
-- is altered, no data is migrated, and rollback is a single DROP at the bottom
-- of this file.
--
-- REVIEW BEFORE RUNNING — one line needs checking against your project. See
-- "Permissions" below: the grants here assume trip_stops is reachable by the
-- anon role, because that is how the app already writes stops. Confirm that
-- before running, and match whatever trip_stops actually has.
-- ===========================================================================

-- ── Why a document and not columns ─────────────────────────────────────────
--
-- trip_stops already exists and keeps working. This table is not a second copy
-- of it — it is the Grid tab's own record, in the Grid tab's own vocabulary,
-- and it holds four things trip_stops has nowhere to put:
--
--   day_offset          trip_stops carries per-stop DATES, which the Grid
--                       derives rather than stores. Round-tripping through
--                       dates loses which days were held versus computed.
--   activity            currently smuggled into trip_stops.label, which the
--                       editor overwrites with "origin:yard" on a pickup.
--   address_confidence  the extraction's own doubt about an address. Nothing
--                       in trip_stops records it, so it dies at the first save
--                       and the dispatcher loses the one signal saying which
--                       mileage rests on a guess.
--   matched address     what the geocoder actually resolved to, when that is
--                       not what was typed.
--
-- jsonb rather than columns because this vocabulary is still moving. A column
-- per field would mean a migration per change against a live project with no
-- migration runner and no checked-in DDL for the core tables — the condition
-- that already produced three hand-rolled drift guards in js/data/trip-db.js.
-- The document is validated by normalizeStop() on read, which is where the
-- app's real contract lives anyway.
--
-- Indexing is deliberately absent. This is read one row at a time by primary
-- key when a trip opens; there is no query that scans the documents, and a
-- GIN index on jsonb nobody searches is pure write cost.

-- ── 1. Table ───────────────────────────────────────────────────────────────
-- trip_id is the primary key, not a foreign key column beside a synthetic id:
-- a trip has exactly one Grid document or none, so the trip IS the identity.
-- ON DELETE CASCADE means a deleted trip takes its itinerary with it rather
-- than leaving a row pointing at nothing.
create table if not exists public.trip_itineraries (
	trip_id     uuid primary key references public.trips (id) on delete cascade,
	document    jsonb       not null,
	updated_at  timestamptz not null default now()
);

comment on table public.trip_itineraries is
	'Trip Draft v3 document per trip, written by the Grid tab (js/components/itinerary-grid.js). trip_stops remains the projection every other reader uses.';

comment on column public.trip_itineraries.document is
	'A Trip Draft v3 object — see docs/trip-import-schema-v3.json. Validated on read by normalizeStop(), never trusted as-is.';

-- ── 2. Permissions ─────────────────────────────────────────────────────────
--
-- CHECK THIS AGAINST trip_stops BEFORE RUNNING.
--
-- This client authenticates as anon with the key in page source
-- (js/data/supabase.js), so anything anon can read is readable by anyone who
-- can load the app. That is already true of trip_stops, and an itinerary
-- document holds the same class of data — addresses, times, place names. It
-- holds nothing that changes the risk: no identity secrets, no payment
-- details, per CLAUDE.md § Data and Risk.
--
-- If your project has RLS enabled on trip_stops with policies rather than
-- flat grants, mirror those here instead and delete this block. Run:
--
--   select relname, relrowsecurity from pg_class
--    where relname in ('trips', 'trip_stops', 'trip_itineraries');
--
-- and match what trip_stops reports.
grant select, insert, update, delete on public.trip_itineraries to anon;
grant select, insert, update, delete on public.trip_itineraries to authenticated;

-- ── 3. updated_at ──────────────────────────────────────────────────────────
-- Maintained by the database rather than the client: the client already sends
-- the document, and a timestamp it also controls is one the client can get
-- wrong. Nothing reads this yet — it exists so that "which of these two is
-- newer" has an answer the first time that question is asked.
create or replace function public.trip_itineraries_touch()
returns trigger
language plpgsql
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;

drop trigger if exists trip_itineraries_touch on public.trip_itineraries;

create trigger trip_itineraries_touch
	before update on public.trip_itineraries
	for each row
	execute function public.trip_itineraries_touch();

-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Safe at any time. The Grid tab degrades to in-memory-only when the table is
-- absent — js/data/itinerary-grid-db.js treats a missing relation as "not set
-- up yet" rather than an error — and every other reader is unaffected, because
-- trip_stops is still written on every save exactly as it was before.
--
-- The only loss is the four fields listed at the top of this file, on trips
-- edited in the Grid tab. The stops themselves survive in trip_stops.
--
--   drop trigger if exists trip_itineraries_touch on public.trip_itineraries;
--   drop function if exists public.trip_itineraries_touch();
--   drop table if exists public.trip_itineraries;
-- ===========================================================================
