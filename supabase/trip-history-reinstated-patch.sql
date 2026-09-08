-- Adds 'reinstated' to the trip history action allowlist.
--
-- Reinstating is the way back from a cancellation: the Trip Editor's
-- cancelled-status banner clears cancelled_at/cancellation_reason and records
-- the trip going Cancelled → Active (js/data/trip-db.js's reinstateTrip).
-- Without this patch that write is rejected by trip_history_action_check, and
-- because recordTripHistory is deliberately non-fatal there, the reinstate
-- still commits while its history entry is dropped with only a console
-- warning. The trip's log then shows the cancellation and no way back.
--
-- Widens the allowlist rather than replacing it, same pattern and same reason
-- the (since-removed) trip-cancellation-patch.sql used to add 'cancelled':
-- a lifecycle event gets its own name in the feed instead of being logged as
-- a generic "updated". The list below is that patch's list plus one entry.
--
-- No RLS or grant changes: trip_history is already revoked from anon and
-- reached only through record_trip_history.
-- Run once in the Supabase SQL editor.

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
					'reinstated',
					'assignment_changed',
					'driver_status_changed',
					'document_uploaded',
					'document_replaced',
					'document_deleted'
				)
			);
	end if;
end $$;
