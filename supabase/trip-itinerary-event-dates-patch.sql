-- Adds calendar dates to the itinerary's existing arrival/departure clock
-- fields. Day-boundary rows continue to use the existing `label` column for
-- their ISO date and `depart_prev` for their boundary time, so they remain
-- readable by older clients and never become routing waypoints.
-- Run once in the Supabase SQL editor.

alter table public.trip_stops
  add column if not exists depart_prev_date date,
  add column if not exists arrive_date date,
  add column if not exists spot_date date;

comment on column public.trip_stops.depart_prev_date is
  'Calendar date paired with depart_prev; for Pickup this is the yard departure date.';

comment on column public.trip_stops.arrive_date is
  'Calendar date paired with arrive.';

comment on column public.trip_stops.spot_date is
  'Calendar date paired with spot, primarily for Pickup.';
