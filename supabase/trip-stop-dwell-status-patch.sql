-- Duty status for the interval from arrival at this stop until the next leg departs.
alter table public.trip_stops
  add column if not exists dwell_status text not null default 'on';

alter table public.trip_stops
  alter column dwell_status set default 'on';

alter table public.trip_stops
  drop constraint if exists trip_stops_dwell_status_check;

alter table public.trip_stops
  add constraint trip_stops_dwell_status_check
  check (dwell_status in ('off', 'sleeper', 'on'));

comment on column public.trip_stops.dwell_status is
  'Driver duty status after arrival until the next itinerary departure: off, sleeper, or on.';
