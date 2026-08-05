-- Adds post-trip follow-up tracking for the Tasks tab's "Post Trip" list
-- (see js/panels/tasks-panel.js) — plain columns on trips, same flat-boolean
-- convention as trip-task-flags-patch.sql, not a separate table, since it's
-- just three fields per trip.
--
-- One set per trip, not per leg — the post-trip survey/note/incident flag
-- is about the trip as a whole once it's over, unlike the outbound/return
-- prep flags which track two genuinely separate dispatches.
--
-- No RLS/publication changes needed — trips is already fully readable/
-- writable and already in the realtime publication.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists post_trip_survey_sent boolean not null default false;
alter table public.trips add column if not exists post_trip_incident boolean not null default false;
alter table public.trips add column if not exists post_trip_note text;
alter table public.trips add column if not exists post_trip_survey_message text;
