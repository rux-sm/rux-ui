-- ===========================================================================
-- BUS STATUS + OUT-OF-SERVICE WINDOWS
-- ---------------------------------------------------------------------------
-- Narrows buses.status from four values to two, and moves "out of service"
-- out of the status column into a table of dated windows.
--
--   active | inactive        ← the whole of buses.status after this runs
--   bus_out_of_service       ← one row per stretch a bus is unavailable
--
-- REVIEW BEFORE RUNNING. Section 3 grants the anon role full access to the
-- new table. That matches what public.buses already allows — this app talks
-- to Supabase with an anon key and writes buses from the browser — but it is
-- worth confirming against your own policies rather than taking it on faith.
-- If buses is locked down more tightly than this, match that instead.
--
-- Rollback is at the bottom of this file.
-- ===========================================================================

-- ── Why this shape ─────────────────────────────────────────────────────────
--
-- "Out of service" was a status, so it applied to the whole row forever: a bus
-- in the shop for three days could not be booked for the rest of the year, and
-- the scheduler dropped it as a drop target entirely. Dates are what the
-- dispatcher actually means, so dates are what gets stored.
--
-- Both ends of a window are required. A bus that is out indefinitely is not an
-- open-ended window — it is `inactive`, which is a different thing: off the
-- calendar altogether rather than unavailable for a known stretch.
--
-- `maintenance` said nothing the reason column cannot say better, and `retired`
-- and `inactive` were the same idea under two names. Both are gone.

-- ── 1. Table ───────────────────────────────────────────────────────────────
create table if not exists public.bus_out_of_service (
	id         uuid primary key default gen_random_uuid(),
	bus_id     uuid not null references public.buses (id) on delete cascade,
	start_date date not null,
	end_date   date not null,
	reason     text,
	created_at timestamptz not null default now(),
	constraint bus_out_of_service_dates_ordered check (end_date >= start_date)
);

create index if not exists bus_out_of_service_bus_id_idx
	on public.bus_out_of_service (bus_id, start_date);

-- ── 2. Status values ───────────────────────────────────────────────────────
-- Order matters: migrate the data before tightening the constraint, or the
-- rows still holding the old values make the new constraint invalid.
--
-- 'out-of-service' becomes 'active' rather than a window, because a status
-- carries no dates to build one from. There are no rows in that state on this
-- database, so nothing is actually lost; if yours has some, record their
-- windows by hand afterwards.
update public.buses set status = 'inactive' where status = 'retired';
update public.buses set status = 'active'   where status in ('maintenance', 'out-of-service');
update public.buses set status = 'active'   where status is null;

-- The existing constraint's name is not knowable from here — it may be
-- buses_status_check, or hand-named, or absent. Drop whatever check
-- constraint on the table mentions status, then add ours under a known name.
do $$
declare
	con record;
	col_type text;
begin
	select format_type(a.atttypid, a.atttypmod) into col_type
	from pg_attribute a
	join pg_class rel on rel.oid = a.attrelid
	join pg_namespace ns on ns.oid = rel.relnamespace
	where ns.nspname = 'public' and rel.relname = 'buses' and a.attname = 'status';

	-- An enum-typed column cannot be constrained this way: removing a value
	-- from a Postgres enum means recreating the type. Bail loudly rather than
	-- half-applying.
	if col_type is not null and col_type not in ('text', 'character varying', 'citext')
		and col_type not like 'character varying%'
	then
		raise exception
			'buses.status is % , not a text type. It is probably an enum — migrate the type by hand and skip section 2.',
			col_type;
	end if;

	for con in
		select c.conname
		from pg_constraint c
		join pg_class rel on rel.oid = c.conrelid
		join pg_namespace ns on ns.oid = rel.relnamespace
		where ns.nspname = 'public'
		  and rel.relname = 'buses'
		  and c.contype = 'c'
		  and pg_get_constraintdef(c.oid) ilike '%status%'
	loop
		execute format('alter table public.buses drop constraint %I', con.conname);
	end loop;
end $$;

alter table public.buses
	add constraint buses_status_check check (status in ('active', 'inactive'));

alter table public.buses alter column status set default 'active';

-- ── 3. Access ──────────────────────────────────────────────────────────────
-- Same posture as public.buses: this app authenticates as anon and edits the
-- fleet from the browser, so a window has to be writable from there too. See
-- the REVIEW note at the top before running.
alter table public.bus_out_of_service enable row level security;

drop policy if exists "bus out of service: full access" on public.bus_out_of_service;
create policy "bus out of service: full access"
	on public.bus_out_of_service
	for all
	to anon, authenticated
	using (true)
	with check (true);

grant select, insert, update, delete on public.bus_out_of_service to anon, authenticated;

-- ── 4. Realtime (optional) ─────────────────────────────────────────────────
-- Only needed if the scheduler should stripe a window the moment another
-- dispatcher adds one. Without it the calendar still updates on save in the
-- tab that made the change, and for everyone else on the next load.
-- alter publication supabase_realtime add table public.bus_out_of_service;

-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Restoring the old status values is not possible: 'retired' and 'inactive'
-- are the same rows, but 'maintenance' and 'out-of-service' were folded into
-- 'active' and nothing records which were which. Note them before running if
-- you may want them back.
--
-- alter table public.buses drop constraint if exists buses_status_check;
-- update public.buses set status = 'retired' where status = 'inactive';
-- drop policy if exists "bus out of service: full access" on public.bus_out_of_service;
-- drop table if exists public.bus_out_of_service;   -- destroys every window
-- ===========================================================================
