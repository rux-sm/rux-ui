-- Moves "envelope printed" from a single per-leg flag on trips to a
-- per-driver flag on trip_drivers, same reasoning as trip_reminder_sent
-- (see trip-history-patch.sql's trip_reminder_sent column): when a leg has
-- more than one driver, each gets their own physical envelope, so "printed"
-- needs to be tracked per recipient, not collapsed into one shared checkbox
-- for the whole leg. The old envelope_printed_outbound/_return columns on
-- trips (trip-task-flags-patch.sql) are left in place, just unused now —
-- no destructive drop.
-- Run once in the Supabase SQL editor.

alter table public.trip_drivers add column if not exists envelope_printed boolean not null default false;
