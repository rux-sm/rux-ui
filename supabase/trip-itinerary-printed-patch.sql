-- Adds the "Itinerary printed" prep flag to the Tasks tab checklist (see
-- js/panels/tasks-panel.js) — printing the itinerary is part of preparing
-- the driver envelope, so it sits right after envelope_printed, same
-- per-leg convention as the rest of trip-task-flags-patch.sql: a split
-- (dropoff_pickup) trip's return leg gets its own flag rather than sharing
-- the outbound leg's checkbox.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists itinerary_printed_outbound boolean not null default false;
alter table public.trips add column if not exists itinerary_printed_return boolean not null default false;
