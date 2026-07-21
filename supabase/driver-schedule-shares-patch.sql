-- Revocable driver-only schedule links.
--
-- The table itself has no anon/authenticated policies, so share tokens cannot
-- be listed through PostgREST. Access is only through the narrowly-scoped RPCs
-- below. A token reveals the selected trip/leg references and basic driver identity;
-- the public driver page then reads those already-public schedule records.
-- Each driver keeps one active URL. Saving a different set of assignments updates
-- that driver's existing share row and preserves its token. Run this file in the
-- Supabase SQL editor before using Driver Link.

alter table public.trip_drivers
	add column if not exists report_time time,
	add column if not exists instructions text;

comment on column public.trip_drivers.report_time is
	'Role-specific report time; currently used as the relief driver meet/swap time.';
comment on column public.trip_drivers.instructions is
	'Short driver-specific instructions, such as the relief meet location.';

create table if not exists public.driver_schedule_shares (
	id uuid primary key default gen_random_uuid(),
	token text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 16),
	driver_id uuid not null references public.drivers(id) on delete cascade,
	trip_legs jsonb not null default '[]'::jsonb,
	range_start date not null,
	range_end date not null,
	expires_at timestamptz,
	revoked_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint driver_schedule_shares_range_check check (range_end >= range_start),
	constraint driver_schedule_shares_trip_legs_check check (
		jsonb_typeof(trip_legs) = 'array' and jsonb_array_length(trip_legs) between 1 and 50
	)
);

-- Driver URLs are permanent until dispatch explicitly deactivates them.
-- Keep the legacy column nullable so this patch upgrades existing installs
-- without rebuilding the table or changing the public response shape.
alter table public.driver_schedule_shares
	alter column expires_at drop not null;
update public.driver_schedule_shares
	set expires_at = null
	where expires_at is not null;
comment on column public.driver_schedule_shares.expires_at is
	'Legacy field retained for compatibility; active driver links no longer expire.';

alter table public.driver_schedule_shares enable row level security;
revoke all on table public.driver_schedule_shares from anon, authenticated;

create index if not exists driver_schedule_shares_driver_idx
	on public.driver_schedule_shares (driver_id, range_start, range_end);

-- Older versions allowed several active URLs for one driver. Keep the most useful,
-- most recently updated row active and retire the rest before enforcing the new
-- one-active-link rule. Retired rows remain in place for audit/history purposes.
with ranked_active_shares as (
	select id,
		row_number() over (
			partition by driver_id
			order by updated_at desc, created_at desc, id desc
		) as active_rank
	from public.driver_schedule_shares
	where revoked_at is null
)
update public.driver_schedule_shares share
set revoked_at = now(), updated_at = now()
from ranked_active_shares ranked
where share.id = ranked.id and ranked.active_rank > 1;

create unique index if not exists driver_schedule_shares_one_active_driver_idx
	on public.driver_schedule_shares (driver_id)
	where revoked_at is null;

create or replace function public.create_driver_schedule_share(
	p_driver_id uuid,
	p_assignment_ids uuid[],
	p_range_start date,
	p_range_end date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_trip_legs jsonb;
	v_share public.driver_schedule_shares;
begin
	if p_driver_id is null or p_range_start is null or p_range_end is null or p_range_end < p_range_start then
		raise exception 'Invalid driver schedule share';
	end if;

	if exists (
		select 1
		from public.trip_drivers driver_assignment
		where driver_assignment.driver_id = p_driver_id
			and driver_assignment.assignment_id = any(coalesce(p_assignment_ids, '{}'::uuid[]))
			and driver_assignment.role in ('relief-start', 'relief-end')
			and driver_assignment.report_time is null
	) then
		raise exception 'Set the relief driver meet/swap time before sharing';
	end if;

	select coalesce(
		jsonb_agg(jsonb_build_object('tripId', valid.trip_id, 'leg', valid.leg)),
		'[]'::jsonb
	)
	into v_trip_legs
	from (
		select distinct assignment.trip_id, coalesce(assignment.leg, 'outbound') as leg
		from public.trip_drivers driver_assignment
		join public.trip_assignments assignment on assignment.id = driver_assignment.assignment_id
		where driver_assignment.driver_id = p_driver_id
			and driver_assignment.assignment_id = any(coalesce(p_assignment_ids, '{}'::uuid[]))
	) valid;

	if jsonb_array_length(v_trip_legs) = 0 then
		raise exception 'No selected assignments belong to this driver';
	end if;

	-- Serialize saves for this driver so two browser sessions cannot create two
	-- active rows at the same time.
	perform pg_advisory_xact_lock(hashtextextended(p_driver_id::text, 0));

	-- Prefer the current active row. If the link was revoked, revive the newest
	-- historical row so even deactivate/reactivate preserves the driver's URL.
	select * into v_share
	from public.driver_schedule_shares
	where driver_id = p_driver_id
	order by (revoked_at is null) desc, updated_at desc, created_at desc
	limit 1
	for update;

	if found then
		update public.driver_schedule_shares
		set trip_legs = v_trip_legs,
			range_start = p_range_start,
			range_end = p_range_end,
			expires_at = null,
			revoked_at = null,
			updated_at = now()
		where id = v_share.id
		returning * into v_share;
	else
		insert into public.driver_schedule_shares (
			driver_id,
			trip_legs,
			range_start,
			range_end
		)
		values (
			p_driver_id,
			v_trip_legs,
			p_range_start,
			p_range_end
		)
		returning * into v_share;
	end if;

	return jsonb_build_object(
		'token', v_share.token,
		'assignmentRefs', v_share.trip_legs,
		'rangeStart', v_share.range_start,
		'rangeEnd', v_share.range_end,
		'expiresAt', v_share.expires_at,
		'updatedAt', v_share.updated_at
	);
end;
$$;

create or replace function public.update_driver_schedule_share(
	p_token text,
	p_assignment_ids uuid[],
	p_range_start date,
	p_range_end date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_share public.driver_schedule_shares;
	v_trip_legs jsonb;
begin
	select * into v_share
	from public.driver_schedule_shares
	where token = lower(trim(p_token)) and revoked_at is null;

	if not found then
		raise exception 'Driver schedule link not found';
	end if;

	if exists (
		select 1
		from public.trip_drivers driver_assignment
		where driver_assignment.driver_id = v_share.driver_id
			and driver_assignment.assignment_id = any(coalesce(p_assignment_ids, '{}'::uuid[]))
			and driver_assignment.role in ('relief-start', 'relief-end')
			and driver_assignment.report_time is null
	) then
		raise exception 'Set the relief driver meet/swap time before sharing';
	end if;

	select coalesce(
		jsonb_agg(jsonb_build_object('tripId', valid.trip_id, 'leg', valid.leg)),
		'[]'::jsonb
	)
	into v_trip_legs
	from (
		select distinct assignment.trip_id, coalesce(assignment.leg, 'outbound') as leg
		from public.trip_drivers driver_assignment
		join public.trip_assignments assignment on assignment.id = driver_assignment.assignment_id
		where driver_assignment.driver_id = v_share.driver_id
			and driver_assignment.assignment_id = any(coalesce(p_assignment_ids, '{}'::uuid[]))
	) valid;

	if jsonb_array_length(v_trip_legs) = 0 then
		raise exception 'No selected assignments belong to this driver';
	end if;

	update public.driver_schedule_shares
	set trip_legs = v_trip_legs,
		range_start = p_range_start,
		range_end = p_range_end,
		expires_at = null,
		updated_at = now()
	where id = v_share.id
	returning * into v_share;

	return jsonb_build_object(
		'token', v_share.token,
		'assignmentRefs', v_share.trip_legs,
		'rangeStart', v_share.range_start,
		'rangeEnd', v_share.range_end,
		'expiresAt', v_share.expires_at,
		'updatedAt', v_share.updated_at
	);
end;
$$;

-- Admin-side discovery for the stable per-driver URL.
create or replace function public.get_driver_schedule_share_for_driver(p_driver_id uuid)
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
	where share.driver_id = p_driver_id
		and share.revoked_at is null
	order by share.updated_at desc
	limit 1;
$$;

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

create or replace function public.revoke_driver_schedule_share(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.driver_schedule_shares
	set revoked_at = now(), updated_at = now()
	where token = lower(trim(p_token)) and revoked_at is null;
	return found;
end;
$$;

revoke all on function public.create_driver_schedule_share(uuid, uuid[], date, date) from public;
revoke all on function public.update_driver_schedule_share(text, uuid[], date, date) from public;
revoke all on function public.get_driver_schedule_share_for_driver(uuid) from public;
revoke all on function public.get_driver_schedule_share(text) from public;
revoke all on function public.revoke_driver_schedule_share(text) from public;

grant execute on function public.create_driver_schedule_share(uuid, uuid[], date, date) to anon, authenticated;
grant execute on function public.update_driver_schedule_share(text, uuid[], date, date) to anon, authenticated;
grant execute on function public.get_driver_schedule_share_for_driver(uuid) to anon, authenticated;
grant execute on function public.get_driver_schedule_share(text) to anon, authenticated;
grant execute on function public.revoke_driver_schedule_share(text) to anon, authenticated;
