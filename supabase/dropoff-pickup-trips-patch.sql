-- "Drop-off / Pick-up" trip type: outbound and return legs on separate,
-- possibly far-apart dates, each with its own bus/driver assignment(s).
-- Run this in the Supabase SQL editor before using the new trip type.

alter table public.trips
  add column if not exists return_start_date date,
  add column if not exists return_end_date   date,
  add column if not exists return_bus_count  integer not null default 1;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'trips_trip_type_check'
      and conrelid = 'public.trips'::regclass
  ) then
    alter table public.trips drop constraint trips_trip_type_check;
  end if;

  alter table public.trips
    add constraint trips_trip_type_check
    check (trip_type in ('round_trip', 'one_way', 'dropoff_pickup'));
end $$;

alter table public.trip_assignments
  add column if not exists leg text not null default 'outbound';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_assignments_leg_check'
      and conrelid = 'public.trip_assignments'::regclass
  ) then
    alter table public.trip_assignments
      add constraint trip_assignments_leg_check
      check (leg in ('outbound', 'return'));
  end if;
end $$;
