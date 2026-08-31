-- ===========================================================================
-- TRIP ITINERARIES  ·  let one exist before its trip does
-- ---------------------------------------------------------------------------
-- Run supabase/trip_itineraries.sql first. This patches that table.
--
-- Additive and reversible: nothing is dropped, no document is rewritten, and
-- the rollback at the bottom returns the table to exactly its previous shape
-- as long as no unattached row exists yet.
--
-- REVIEW BEFORE RUNNING. It changes a primary key, which is the one operation
-- here that is not a pure addition. Read "Why the key moves" first.
-- ===========================================================================

-- ── Why the key moves ──────────────────────────────────────────────────────
--
-- trip_id was the primary key AND a foreign key, which said: an itinerary is a
-- property of a trip. That was true while the Grid tab lived inside the trip
-- editor and you could only reach it with a trip already open.
--
-- It is the wrong way round for how the work actually arrives. A customer's
-- itinerary turns up before anyone has decided whether it is a new trip, an
-- update to one already booked, or a quote that never becomes either. Making
-- the trip a prerequisite forced that decision first, which is why processing
-- one meant opening a trip you might not want.
--
-- So trip_id becomes nullable and the row gets an identity of its own. An
-- itinerary with no trip_id is in the inbox. Attaching it to the calendar is
-- an UPDATE that sets trip_id — the same row, the same document, no copy and
-- no second table to drift against the first.
--
-- The uniqueness that mattered is kept: a trip still has at most one
-- itinerary, now enforced by a partial unique index rather than by the key.

-- ── 1. Identity of its own ─────────────────────────────────────────────────
alter table public.trip_itineraries
	add column if not exists id uuid not null default gen_random_uuid();

-- ── 2. Move the primary key ────────────────────────────────────────────────
-- Named explicitly rather than guessed: Postgres names a table's primary key
-- <table>_pkey by default, and this table was created by the patch above, so
-- that is what it is called.
alter table public.trip_itineraries
	drop constraint if exists trip_itineraries_pkey;

alter table public.trip_itineraries
	add constraint trip_itineraries_pkey primary key (id);

-- ── 3. Let it stand alone ──────────────────────────────────────────────────
alter table public.trip_itineraries
	alter column trip_id drop not null;

-- A trip still has at most one itinerary. Partial, because NULL trip_ids are
-- the inbox and there can be as many of those as documents arrive.
create unique index if not exists trip_itineraries_one_per_trip
	on public.trip_itineraries (trip_id)
	where trip_id is not null;

-- ── 4. What the inbox needs to show ────────────────────────────────────────
-- Status is the triage state, matching the vocabulary trip_requests already
-- uses so the two inboxes read the same way. 'new' is what an arriving
-- document gets; 'reviewed' is a dispatcher having looked; 'closed' is
-- handled or abandoned. Attaching to a trip does not change it — trip_id
-- being set is what says it landed.
alter table public.trip_itineraries
	add column if not exists status text not null default 'new';

alter table public.trip_itineraries
	drop constraint if exists trip_itineraries_status_check;

alter table public.trip_itineraries
	add constraint trip_itineraries_status_check
		check (status in ('new', 'reviewed', 'closed'));

-- A human label for the list, so the inbox does not have to open every
-- document to draw a row. Denormalised on purpose: it is display text, the
-- document stays the source of truth, and a list query that parses jsonb for
-- every row to print a name is a list query that gets slow quietly.
alter table public.trip_itineraries
	add column if not exists label text;

alter table public.trip_itineraries
	add column if not exists created_at timestamptz not null default now();

-- The inbox reads exactly one slice — unattached, newest first.
create index if not exists trip_itineraries_inbox
	on public.trip_itineraries (created_at desc)
	where trip_id is null;

comment on column public.trip_itineraries.trip_id is
	'The trip this itinerary belongs to, or NULL while it is still in the inbox. Attaching is an UPDATE that sets it.';

comment on column public.trip_itineraries.label is
	'Display text for the inbox list. The document is the source of truth; this exists so drawing a list does not mean parsing every document.';

-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Safe only while no unattached row exists — a NULL trip_id cannot be a
-- primary key, so delete or attach those first:
--
--   select count(*) from public.trip_itineraries where trip_id is null;
--
-- Then:
--
--   drop index if exists public.trip_itineraries_inbox;
--   drop index if exists public.trip_itineraries_one_per_trip;
--   alter table public.trip_itineraries drop constraint if exists trip_itineraries_status_check;
--   alter table public.trip_itineraries drop column if exists status;
--   alter table public.trip_itineraries drop column if exists label;
--   alter table public.trip_itineraries drop column if exists created_at;
--   alter table public.trip_itineraries alter column trip_id set not null;
--   alter table public.trip_itineraries drop constraint trip_itineraries_pkey;
--   alter table public.trip_itineraries add constraint trip_itineraries_pkey primary key (trip_id);
--   alter table public.trip_itineraries drop column if exists id;
-- ===========================================================================
