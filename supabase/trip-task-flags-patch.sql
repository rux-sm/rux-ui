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

-- Conditional last-minute requirements. The booleans are required for a
-- task to be complete only when the matching trip requirement is enabled;
-- reference numbers remain optional. Equipment checks (sleeper, 56 seats,
-- ADA lift) are derived live from the assigned buses and need no flags.
alter table public.trips add column if not exists fuel_card_assigned_outbound boolean not null default false;
alter table public.trips add column if not exists fuel_card_number_outbound text;
alter table public.trips add column if not exists hotel_booked_outbound boolean not null default false;
alter table public.trips add column if not exists hotel_itinerary_number_outbound text;
alter table public.trips add column if not exists fuel_card_assigned_return boolean not null default false;
alter table public.trips add column if not exists fuel_card_number_return text;
alter table public.trips add column if not exists hotel_booked_return boolean not null default false;
alter table public.trips add column if not exists hotel_itinerary_number_return text;

-- Per-recipient reminder state. A replacement driver gets a new assignment
-- row and therefore starts unchecked instead of inheriting the prior state.
alter table public.trip_drivers add column if not exists trip_reminder_sent boolean not null default false;
