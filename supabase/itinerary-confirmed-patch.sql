-- Adds a manual "itinerary confirmed" flag (see js/components/itinerary.js,
-- the checkmark button in the Trip Summary card header) — a dispatcher's
-- explicit judgment call that the itinerary's miles/times are accurate, not
-- something derived from the data itself.
--
-- Trip-level, not per-leg — one confirmation covers the whole itinerary.
-- The UI clears this back to false on any itinerary edit after confirming
-- (see updateSummary() in itinerary.js), so a stale checkmark never survives
-- a stop/time/address change; this column just persists whatever the UI's
-- current value was at save time.
--
-- No RLS/publication changes needed — trips is already fully readable/
-- writable and already in the realtime publication.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists itinerary_confirmed boolean not null default false;
