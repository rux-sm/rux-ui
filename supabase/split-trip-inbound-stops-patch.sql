-- Split ("Drop-off / Pick-up") trips: give the Itinerary tab a separate,
-- per-leg stop list (pickup -> stops -> return-to-yard) for the return leg,
-- distinct from the outbound leg's stops. Mirrors the `leg` column already
-- added to trip_assignments in dropoff-pickup-trips-patch.sql.
-- Run this in the Supabase SQL editor before using the Outbound/Inbound
-- itinerary toggle.

alter table public.trip_stops
  add column if not exists leg text not null default 'outbound';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trip_stops_leg_check'
      and conrelid = 'public.trip_stops'::regclass
  ) then
    alter table public.trip_stops
      add constraint trip_stops_leg_check
      check (leg in ('outbound', 'return'));
  end if;
end $$;
