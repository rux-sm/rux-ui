-- Narrow, token-gated feed of "recent changes" for the maintenance schedule
-- page (js/pages/maintenance-share.js) — trip bars added, moved to a
-- different bus, or deleted, limited to trips overlapping the same rolling
-- two-week range displayed by get_maintenance_schedule. Reuses the existing trip_history table (see
-- trip-history-patch.sql) but exposes only what identifies a bar (trip_ref,
-- destination, action, bus before/after) — no customer billing/contact
-- fields, no driver-status or document rows. Gated the same way as
-- get_maintenance_schedule: token must match an unrevoked
-- maintenance_schedule_shares row.
-- Run once in the Supabase SQL editor.

create or replace function public.get_maintenance_schedule_changes(
	p_token text,
	p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_changes jsonb;
	v_today date := (now() at time zone 'America/Chicago')::date;
	v_start date;
	v_end date;
begin
	if not exists (
		select 1 from public.maintenance_schedule_shares
		where scope = 'main' and token = lower(trim(p_token)) and revoked_at is null
	) then
		return null;
	end if;
	v_start := v_today - (extract(isodow from v_today)::integer - 1);
	v_end := v_start + 13;

	select coalesce(jsonb_agg(item), '[]'::jsonb) into v_changes
	from (
		select jsonb_build_object(
			'tripId', h.trip_id,
			'createdAt', h.created_at,
			'actorName', h.actor_name,
			'action', h.action,
			'tripRef', h.trip_ref,
			'tripStartDate', coalesce(t.start_date, h.trip_start_date),
			'tripEndDate', coalesce(t.return_end_date, t.end_date, t.start_date, h.trip_end_date, h.trip_start_date),
			'destination', h.destination,
			'changes', h.changes
		) item
		from public.trip_history h
		left join public.trips t on t.id = h.trip_id
		where h.action in ('created', 'deleted', 'assignment_changed')
			and coalesce(t.start_date, h.trip_start_date) <= v_end
			and coalesce(
				t.return_end_date,
				t.end_date,
				t.start_date,
				h.trip_end_date,
				h.trip_start_date
			) >= v_start
		order by h.created_at desc, h.id desc
		limit greatest(1, least(coalesce(p_limit, 30), 100))
	) sub;

	return jsonb_build_object('changes', v_changes);
end;
$$;

revoke all on function public.get_maintenance_schedule_changes(text, integer) from public;
grant execute on function public.get_maintenance_schedule_changes(text, integer) to anon, authenticated;
