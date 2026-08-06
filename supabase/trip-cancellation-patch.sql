-- Turns "Delete" in the Trip Editor into a soft cancel: the trip stays in
-- the trips table (and the Trips list) marked cancelled, with a reason,
-- instead of being permanently removed — see js/data/trip-db.js's
-- deleteTrip/promptCancelReason and index.html's loadTripsFromDB (which
-- excludes cancelled trips from the schedule grid but not from
-- window.RuxTrips.list()/the Trips list itself).
--
-- No RLS/publication changes needed — trips is already fully readable/
-- writable and already in the realtime publication.
-- Run once in the Supabase SQL editor.

alter table public.trips add column if not exists cancelled_at timestamptz;
alter table public.trips add column if not exists cancellation_reason text;

-- Upgrade an already-installed history table in the same run, same pattern
-- trip-driver-confirmation-patch.sql used to add 'driver_status_changed' —
-- widens the action allowlist rather than replacing it, so a cancellation
-- shows up in Trip History as its own event instead of being logged as a
-- generic "updated".
do $$
begin
	if to_regclass('public.trip_history') is not null then
		alter table public.trip_history
			drop constraint if exists trip_history_action_check;
		alter table public.trip_history
			add constraint trip_history_action_check check (
				action in (
					'created',
					'updated',
					'deleted',
					'cancelled',
					'assignment_changed',
					'driver_status_changed',
					'document_uploaded',
					'document_replaced',
					'document_deleted'
				)
			);
	end if;
end $$;
