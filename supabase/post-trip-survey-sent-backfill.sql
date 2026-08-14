-- One-time backfill: marks post_trip_survey_sent = true for every trip that
-- ended two weeks ago or earlier and isn't already marked sent — clears the
-- Tasks tab's Post Trip / "Needs Follow-up" backlog for trips old enough
-- that a survey is no longer realistic to chase.
--
-- End-date logic matches tripEndDate() in js/panels/tasks-panel.js exactly:
-- split (dropoff_pickup) trips use the return leg's end date (falling back
-- through return_start_date/end_date/start_date), every other trip type
-- uses end_date (falling back to start_date).
--
-- Does NOT exclude cancelled trips (cancelled_at is not null) — the app's
-- own "needs follow-up" checks (updatePostTripStatus, matchesPostTripFilter
-- in tasks-panel.js) don't exclude them either today, so this matches
-- current behavior. Add `and cancelled_at is null` below if you'd rather
-- leave cancelled trips out of this backfill.
--
-- Run the preview SELECT first and check the row count/list before running
-- the UPDATE — this only ever flips false/null to true, so it's safe to
-- rerun, but it can't be un-sent in bulk afterward.

-- ── Step 1: preview — run this first ────────────────────────────────────
select
	id, trip_ref, trip_type, customer, destination,
	case when trip_type = 'dropoff_pickup'
		then coalesce(return_end_date, return_start_date, end_date, start_date)
		else coalesce(end_date, start_date)
	end as computed_end_date
from public.trips
where post_trip_survey_sent is not true
	and (
		case when trip_type = 'dropoff_pickup'
			then coalesce(return_end_date, return_start_date, end_date, start_date)
			else coalesce(end_date, start_date)
		end
	) <= current_date - interval '14 days'
order by computed_end_date desc;

-- ── Step 2: once the preview above looks right, run this ───────────────
begin;

update public.trips
set post_trip_survey_sent = true
where post_trip_survey_sent is not true
	and (
		case when trip_type = 'dropoff_pickup'
			then coalesce(return_end_date, return_start_date, end_date, start_date)
			else coalesce(end_date, start_date)
		end
	) <= current_date - interval '14 days';

commit;
