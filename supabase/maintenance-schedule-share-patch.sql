-- Stable, revocable maintenance schedule link. The public endpoint returns
-- only the operational fields needed by the two-week vehicle overview.
create table if not exists public.maintenance_schedule_shares (
	scope text primary key default 'main' check (scope = 'main'),
	token text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 20),
	revoked_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
alter table public.maintenance_schedule_shares enable row level security;
revoke all on table public.maintenance_schedule_shares from anon, authenticated;

-- The maintenance page listens to these tables and refreshes its narrow RPC
-- result after a save. Publication membership is required before Postgres
-- changes can reach the browser.
do $$
declare
	v_table text;
begin
	foreach v_table in array array['trips', 'trip_assignments', 'trip_stops', 'buses']
	loop
		if not exists (
			select 1
			from pg_publication_tables
			where pubname = 'supabase_realtime'
				and schemaname = 'public'
				and tablename = v_table
		) then
			execute format('alter publication supabase_realtime add table public.%I', v_table);
		end if;
	end loop;
end $$;

create or replace function public.create_maintenance_schedule_share()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_share public.maintenance_schedule_shares;
begin
	insert into public.maintenance_schedule_shares (scope) values ('main')
	on conflict (scope) do update set revoked_at = null, updated_at = now()
	returning * into v_share;
	return jsonb_build_object('token', v_share.token, 'updatedAt', v_share.updated_at);
end; $$;

create or replace function public.get_maintenance_schedule_share()
returns jsonb language sql stable security definer set search_path = public as $$
	select jsonb_build_object('token', token, 'updatedAt', updated_at)
	from public.maintenance_schedule_shares
	where scope = 'main' and revoked_at is null;
$$;

create or replace function public.revoke_maintenance_schedule_share(p_token text)
returns boolean language sql security definer set search_path = public as $$
	update public.maintenance_schedule_shares
	set revoked_at = now(), updated_at = now()
	where scope = 'main' and token = lower(trim(p_token)) and revoked_at is null
	returning true;
$$;

create or replace function public.get_maintenance_schedule(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
	v_today date := (now() at time zone 'America/Chicago')::date;
	v_start date;
	v_end date;
	v_trips jsonb;
begin
	if not exists (
		select 1 from public.maintenance_schedule_shares
		where scope = 'main' and token = lower(trim(p_token)) and revoked_at is null
	) then return null; end if;
	v_start := v_today - (extract(isodow from v_today)::integer - 1);
	v_end := v_start + 13;
	select coalesce(jsonb_agg(item order by item->>'startDate'), '[]'::jsonb) into v_trips
	from (
		select jsonb_build_object(
			'id', t.id, 'tripRef', t.trip_ref, 'tripType', t.trip_type,
			'destination', t.destination, 'customer', t.customer,
			'confirmed', (
				coalesce(t.confirmed, false)
				or t.contract_status = 'Signed'
				or coalesce(t.po_received, false)
				or nullif(trim(t.po_ref), '') is not null
				or coalesce(t.deposit_amount, 0) > 0
				or t.date_paid is not null
			),
			'startDate', t.start_date, 'endDate', t.end_date,
			'returnStartDate', t.return_start_date, 'returnEndDate', t.return_end_date,
			'departureTime', t.departure_time, 'returnTime', t.return_time,
			'tripBarColor', t.trip_bar_color, 'tripReqs', t.trip_reqs,
			'stops', coalesce((
				select jsonb_agg(jsonb_build_object(
					'type', stop.type,
					'leg', coalesce(stop.leg, 'outbound'),
					'position', stop.position,
					'departPrev', stop.depart_prev,
					'arrive', stop.arrive
				) order by stop.position)
				from public.trip_stops stop
				where stop.trip_id = t.id
			), '[]'::jsonb),
			'assignments', coalesce((
				select jsonb_agg(jsonb_build_object(
					'id', a.id, 'leg', coalesce(a.leg, 'outbound'),
					'busId', a.bus_id, 'busNumber', b.number,
					'busSortOrder', b.sort_order
				))
				from public.trip_assignments a
				left join public.buses b on b.id = a.bus_id
				where a.trip_id = t.id
			), '[]'::jsonb)
		) item
		from public.trips t
		where t.start_date <= v_end
			and coalesce(t.return_end_date, t.end_date, t.start_date) >= v_start
			and exists (
				select 1
				from public.trip_assignments assigned
				where assigned.trip_id = t.id
					and assigned.bus_id is not null
			)
	) items;
	return jsonb_build_object(
		'rangeStart', v_start, 'rangeEnd', v_end,
		'generatedAt', now(), 'trips', v_trips
	);
end; $$;

revoke all on function public.create_maintenance_schedule_share() from public;
revoke all on function public.get_maintenance_schedule_share() from public;
revoke all on function public.revoke_maintenance_schedule_share(text) from public;
revoke all on function public.get_maintenance_schedule(text) from public;
grant execute on function public.create_maintenance_schedule_share() to anon, authenticated;
grant execute on function public.get_maintenance_schedule_share() to anon, authenticated;
grant execute on function public.revoke_maintenance_schedule_share(text) to anon, authenticated;
grant execute on function public.get_maintenance_schedule(text) to anon, authenticated;
