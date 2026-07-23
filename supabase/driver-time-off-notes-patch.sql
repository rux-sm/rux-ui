-- Adds an optional free-text note to each driver time-off entry (e.g. "back
-- for the Friday run" or a callback number) — shown under the reason/date in
-- both the Time Off tab and the driver grid's day popover. Run once in the
-- Supabase SQL editor after driver-time-off-patch.sql.

alter table public.driver_time_off add column if not exists notes text;
