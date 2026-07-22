-- Lets a driver confirm/accept a trip from their public schedule link
-- (d.html), and keeps that confirmation once set even as dispatch keeps
-- editing the trip (bus, times, itinerary docs) — it only clears if the
-- driver is removed from the assignment entirely. Instead flags "updated
-- since you confirmed" so the driver knows to double check, without forcing
-- them to re-confirm from scratch.
--
-- Deliberately NOT stored on trip_assignments/trip_drivers: trip-db.js's
-- save() deletes and reinserts both of those tables on every save (see
-- initTripDB's save function), so assignment_id is a new uuid on every
-- edit — anything keyed on it would lose "confirmed" on the very next save,
-- not just on a real reassignment. trip_id is the one thing that survives a
-- save (trips is upserted, not replaced), so confirmation is keyed on
-- (trip_id, driver_id, leg) in its own table instead.
--
-- Run this in the Supabase SQL editor after driver-schedule-shares-patch.sql.

create table if not exists public.trip_driver_confirmations (
	id uuid primary key default gen_random_uuid(),
	trip_id uuid not null references public.trips(id) on delete cascade,
	driver_id uuid not null references public.drivers(id) on delete cascade,
	leg text not null default 'outbound',
	confirmed_at timestamptz not null default now(),
	constraint trip_driver_confirmations_unique unique (trip_id, driver_id, leg)
);

alter table public.trip_driver_confirmations enable row level security;
revoke all on table public.trip_driver_confirmations from anon, authenticated;

-- "Has this trip changed since it was confirmed" — trips is upserted on
-- every save() call regardless of which related table (trip_assignments,
-- trip_stops, trip_documents, ...) actually changed, so bumping updated_at
-- only on trips itself is a simple, reliable enough signal without needing
-- a trigger cascading from every child table individually.
alter table public.trips add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_trips_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trips_touch_updated_at on public.trips;
create trigger trips_touch_updated_at
before update on public.trips
for each row execute function public.touch_trips_updated_at();

-- Confirm (or re-confirm) a trip leg — verified against the caller's own
-- share token so one driver's link can't confirm another driver's trip.
create or replace function public.confirm_trip_assignment(
	p_token text,
	p_trip_id uuid,
	p_leg text default 'outbound'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	v_row public.trip_driver_confirmations;
begin
	select share.driver_id into v_driver_id
	from public.driver_schedule_shares share
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and share.expires_at > now();

	if v_driver_id is null then
		raise exception 'Invalid or expired driver link';
	end if;

	if not exists (
		select 1
		from public.trip_assignments assignment
		join public.trip_drivers driver_row on driver_row.assignment_id = assignment.id
		where assignment.trip_id = p_trip_id
			and coalesce(assignment.leg, 'outbound') = coalesce(p_leg, 'outbound')
			and driver_row.driver_id = v_driver_id
	) then
		raise exception 'This trip is not assigned to you';
	end if;

	insert into public.trip_driver_confirmations (trip_id, driver_id, leg, confirmed_at)
	values (p_trip_id, v_driver_id, coalesce(p_leg, 'outbound'), now())
	on conflict on constraint trip_driver_confirmations_unique
	do update set confirmed_at = now()
	returning * into v_row;

	return jsonb_build_object(
		'tripId', v_row.trip_id,
		'leg', v_row.leg,
		'confirmedAt', v_row.confirmed_at
	);
end;
$$;

-- Read back every confirmation for this driver — called once alongside
-- get_driver_schedule_share so the page can show confirmed/stale state for
-- each trip without a second round trip per card.
create or replace function public.get_driver_confirmations(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		jsonb_agg(jsonb_build_object(
			'tripId', confirmation.trip_id,
			'leg', confirmation.leg,
			'confirmedAt', confirmation.confirmed_at
		)),
		'[]'::jsonb
	)
	from public.trip_driver_confirmations confirmation
	join public.driver_schedule_shares share
		on share.driver_id = confirmation.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and share.expires_at > now();
$$;

revoke all on function public.confirm_trip_assignment(text, uuid, text) from public;
revoke all on function public.get_driver_confirmations(text) from public;

grant execute on function public.confirm_trip_assignment(text, uuid, text) to anon, authenticated;
grant execute on function public.get_driver_confirmations(text) to anon, authenticated;
