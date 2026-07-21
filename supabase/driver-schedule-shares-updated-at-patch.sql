-- Adds updatedAt to get_driver_schedule_share's returned JSON, so the
-- public driver page can show a real "last updated" timestamp instead of a
-- generic disclaimer. This is when the share record itself (which trips are
-- included) was last created/updated via the Driver Link panel — a good
-- proxy for "dispatch last touched this schedule," not a guarantee that
-- every field on every included trip hasn't changed since (a time/contact
-- edit on an already-selected trip doesn't by itself require re-clicking
-- "Update link"). Run this in the Supabase SQL editor after
-- driver-schedule-shares-patch.sql.

create or replace function public.get_driver_schedule_share(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select jsonb_build_object(
		'token', share.token,
		'driver', jsonb_build_object(
			'id', driver.id,
			'name', driver.name,
			'shortName', driver.short_name
		),
		'assignmentRefs', share.trip_legs,
		'rangeStart', share.range_start,
		'rangeEnd', share.range_end,
		'expiresAt', share.expires_at,
		'updatedAt', share.updated_at
	)
	from public.driver_schedule_shares share
	join public.drivers driver on driver.id = share.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
	limit 1;
$$;

revoke all on function public.get_driver_schedule_share(text) from public;
grant execute on function public.get_driver_schedule_share(text) to anon, authenticated;
