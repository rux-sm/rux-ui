-- Optional per-trip scheduler color override.
-- Run this in the Supabase SQL editor before saving color selections.

alter table public.trips
  add column if not exists trip_bar_color text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trips_trip_bar_color_check'
      and conrelid = 'public.trips'::regclass
  ) then
    alter table public.trips
      add constraint trips_trip_bar_color_check
      check (
        trip_bar_color is null
        or trip_bar_color in ('cyan', 'green', 'purple', 'yellow', 'orange', 'pink')
      );
  end if;
end $$;
