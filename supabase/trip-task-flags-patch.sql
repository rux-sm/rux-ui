-- Adds per-trip, per-leg operational prep flags for the Tasks tab checklist
-- (see js/panels/tasks-panel.js) — plain columns on trips, matching the
-- existing flat-boolean convention (po_received, confirmed, balance_paid,
-- contact_not_needed) rather than a separate join table for six flags.
--
-- Split (dropoff_pickup) trips get their own separate outbound/return sets
-- rather than one shared set — the return leg is often a different driver/
-- bus dispatched much later and needs its own contact/reminder/envelope,
-- not one that's already checked off from prepping the outbound leg.
-- Round-trip/one-way trips only ever use the _outbound columns.
--
-- No RLS/publication changes needed — trips is already fully readable/
-- writable and already in the realtime publication.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists driver_contact_sent_outbound boolean not null default false;
alter table public.trips add column if not exists trip_reminder_sent_outbound boolean not null default false;
alter table public.trips add column if not exists envelope_printed_outbound boolean not null default false;
alter table public.trips add column if not exists driver_contact_sent_return boolean not null default false;
alter table public.trips add column if not exists trip_reminder_sent_return boolean not null default false;
alter table public.trips add column if not exists envelope_printed_return boolean not null default false;
