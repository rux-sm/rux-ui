-- Adds the "HOS form" prep flag to the Tasks tab checklist (see
-- js/panels/tasks-panel.js) — only relevant when a part-time driver is
-- assigned to a leg (their Hours of Service form isn't needed for
-- full-time drivers), same per-leg convention as driver_contact_sent/
-- itinerary_printed in trip-task-flags-patch.sql. No form/modal yet —
-- this is just the checklist line; the auto-filled HOS form itself
-- (similar to the trip envelope) is future work.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists hos_form_printed_outbound boolean not null default false;
alter table public.trips add column if not exists hos_form_printed_return boolean not null default false;
