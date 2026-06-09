alter table public.trip_stops
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists mapbox_id text,
  add column if not exists miles_source text not null default 'estimated',
  add column if not exists drive_source text not null default 'estimated',
  add column if not exists route_status text not null default 'current';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_stops_miles_source_check'
  ) then
    alter table public.trip_stops
      add constraint trip_stops_miles_source_check
      check (miles_source in ('estimated', 'manual'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_stops_route_status_check'
  ) then
    alter table public.trip_stops
      add constraint trip_stops_route_status_check
      check (route_status in ('current', 'stale'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_stops_drive_source_check'
  ) then
    alter table public.trip_stops
      add constraint trip_stops_drive_source_check
      check (drive_source in ('estimated', 'manual'))
      not valid;
  end if;
end $$;
