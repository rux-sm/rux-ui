-- Canonical driver-role workflow statuses.
--
-- A role can still be changed manually in the trip editor, while a driver can
-- accept their own assignment from d.html. Both surfaces write to the stable
-- trip_driver_statuses table keyed by (trip, driver, leg, role), so replacing
-- trip_assignments/trip_drivers during a normal trip save cannot erase an
-- acceptance.
--
-- Effective states:
--   off                neutral / not being tracked
--   pending-assignment dispatcher action required
--   pending-response   sent to driver, awaiting response
--   confirmed          accepted by driver or confirmed by dispatch
--   declined           driver is unable to take the assignment
--
-- The older trip_driver_confirmations table is retained and migrated so this
-- patch can safely be rerun on databases where the first confirmation version
-- was already installed.
--
-- Deliberately NOT stored on trip_assignments/trip_drivers: trip-db.js's
-- save() deletes and reinserts both of those tables on every save (see
-- initTripDB's save function), so assignment_id is a new uuid on every
-- edit — anything keyed on it would lose "confirmed" on the very next save,
-- not just on a real reassignment. trip_id is the one thing that survives a
-- save (trips is upserted, not replaced), so canonical status is keyed on
-- (trip_id, driver_id, leg, role) in its own table instead.
--
-- Run this in the Supabase SQL editor after driver-schedule-shares-patch.sql.

create table if not exists public.trip_driver_confirmations (
	id uuid primary key default gen_random_uuid(),
	trip_id uuid not null references public.trips(id) on delete cascade,
	driver_id uuid not null references public.drivers(id) on delete cascade,
	leg text not null default 'outbound',
	confirmed_at timestamptz not null default now(),
	constraint trip_driver_confirmations_unique unique (trip_id, driver_id, leg)
);

alter table public.trip_driver_confirmations enable row level security;
revoke all on table public.trip_driver_confirmations from anon, authenticated;

create table if not exists public.trip_driver_statuses (
	id uuid primary key default gen_random_uuid(),
	trip_id uuid not null references public.trips(id) on delete cascade,
	driver_id uuid not null references public.drivers(id) on delete cascade,
	leg text not null default 'outbound',
	role text not null default 'driver',
	status text not null default 'off',
	source text not null default 'dispatcher',
	accepted_at timestamptz,
	declined_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint trip_driver_statuses_leg_check
		check (leg in ('outbound', 'return')),
	constraint trip_driver_statuses_role_check
		check (role in ('driver', 'co-driver', 'relief-start', 'relief-end')),
	constraint trip_driver_statuses_status_check
		check (status in ('off', 'pending-assignment', 'pending-response', 'confirmed', 'declined')),
	constraint trip_driver_statuses_source_check
		check (source in ('dispatcher', 'driver')),
	constraint trip_driver_statuses_unique
		unique (trip_id, driver_id, leg, role)
);

alter table public.trip_driver_statuses enable row level security;
revoke all on table public.trip_driver_statuses from anon, authenticated;

-- Upgrade installations created before driver decline was supported.
alter table public.trip_driver_statuses
	add column if not exists declined_at timestamptz;
alter table public.trip_driver_statuses
	drop constraint if exists trip_driver_statuses_status_check;
alter table public.trip_driver_statuses
	add constraint trip_driver_statuses_status_check
		check (status in ('off', 'pending-assignment', 'pending-response', 'confirmed', 'declined'));

create index if not exists trip_driver_statuses_trip_idx
	on public.trip_driver_statuses (trip_id);

create index if not exists trip_driver_statuses_driver_idx
	on public.trip_driver_statuses (driver_id, updated_at desc);

-- Upgrade an already-installed history table in the same run. History remains
-- optional, but when it exists a driver acceptance should be a first-class
-- event instead of failing against the older action constraint.
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
					'assignment_changed',
					'driver_status_changed',
					'document_uploaded',
					'document_replaced',
					'document_deleted'
				)
			);
	end if;
end;
$$;

-- Migrate confirmations created by the original patch. The role is recovered
-- from the current assignment when possible; legacy rows without a matching
-- assignment safely fall back to primary driver.
insert into public.trip_driver_statuses (
	trip_id,
	driver_id,
	leg,
	role,
	status,
	source,
	accepted_at,
	created_at,
	updated_at
)
select
	confirmation.trip_id,
	confirmation.driver_id,
	coalesce(confirmation.leg, 'outbound'),
	coalesce(role_match.role, 'driver'),
	'confirmed',
	'driver',
	confirmation.confirmed_at,
	confirmation.confirmed_at,
	confirmation.confirmed_at
from public.trip_driver_confirmations confirmation
left join lateral (
	select driver_row.role
	from public.trip_assignments assignment
	join public.trip_drivers driver_row
		on driver_row.assignment_id = assignment.id
	where assignment.trip_id = confirmation.trip_id
		and coalesce(assignment.leg, 'outbound') = coalesce(confirmation.leg, 'outbound')
		and driver_row.driver_id = confirmation.driver_id
	order by case driver_row.role
		when 'driver' then 0
		when 'co-driver' then 1
		when 'relief-start' then 2
		else 3
	end
	limit 1
) role_match on true
on conflict on constraint trip_driver_statuses_unique
do update set
	accepted_at = greatest(
		public.trip_driver_statuses.accepted_at,
		excluded.accepted_at
	);

-- "Has this trip changed since it was confirmed" — trips is upserted on
-- every save() call regardless of which related table (trip_assignments,
-- trip_stops, trip_documents, ...) actually changed, so bumping updated_at
-- only on trips itself is a simple, reliable enough signal without needing
-- a trigger cascading from every child table individually.
alter table public.trips add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_trips_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trips_touch_updated_at on public.trips;
create trigger trips_touch_updated_at
before update on public.trips
for each row execute function public.touch_trips_updated_at();

-- Confirm (or re-confirm) a trip leg — verified against the caller's own
-- share token so one driver's link can't confirm another driver's trip.
create or replace function public.confirm_trip_assignment(
	p_token text,
	p_trip_id uuid,
	p_leg text default 'outbound'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	v_driver_name text;
	v_role text;
	v_before_status text;
	v_row public.trip_driver_statuses;
begin
	select share.driver_id, driver.name
	into v_driver_id, v_driver_name
	from public.driver_schedule_shares share
	join public.drivers driver on driver.id = share.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and (share.expires_at is null or share.expires_at > now());

	if v_driver_id is null then
		raise exception 'Invalid or expired driver link';
	end if;

	select driver_row.role
	into v_role
	from public.trip_assignments assignment
	join public.trip_drivers driver_row
		on driver_row.assignment_id = assignment.id
	where assignment.trip_id = p_trip_id
		and coalesce(assignment.leg, 'outbound') = coalesce(p_leg, 'outbound')
		and driver_row.driver_id = v_driver_id
	order by case driver_row.role
		when 'driver' then 0
		when 'co-driver' then 1
		when 'relief-start' then 2
		else 3
	end
	limit 1;

	if v_role is null then
		raise exception 'This trip is not assigned to you';
	end if;

	select status
	into v_before_status
	from public.trip_driver_statuses
	where trip_id = p_trip_id
		and driver_id = v_driver_id
		and leg = coalesce(p_leg, 'outbound')
		and role = v_role;

	insert into public.trip_driver_statuses (
		trip_id,
		driver_id,
		leg,
		role,
		status,
		source,
		accepted_at,
		updated_at
	)
	values (
		p_trip_id,
		v_driver_id,
		coalesce(p_leg, 'outbound'),
		v_role,
		'confirmed',
		'driver',
		now(),
		now()
	)
	on conflict on constraint trip_driver_statuses_unique
	do update set
		status = 'confirmed',
		source = 'driver',
		accepted_at = now(),
		declined_at = null,
		updated_at = now()
	returning * into v_row;

	-- Keep the original table current for older deployed clients during the
	-- migration window.
	insert into public.trip_driver_confirmations (trip_id, driver_id, leg, confirmed_at)
	values (p_trip_id, v_driver_id, coalesce(p_leg, 'outbound'), v_row.accepted_at)
	on conflict on constraint trip_driver_confirmations_unique
	do update set confirmed_at = excluded.confirmed_at;

	-- Driver acceptance is a meaningful audit event. History is optional, so a
	-- missing/outdated history patch must never prevent the acceptance itself.
	if v_before_status is distinct from 'confirmed'
		and to_regclass('public.trip_history') is not null then
		begin
			execute $history$
				insert into public.trip_history (
					trip_id,
					trip_ref,
					trip_start_date,
					trip_end_date,
					customer_name,
					destination,
					actor_name,
					action,
					changes,
					metadata
				)
				select
					trip.id,
					trip.trip_ref,
					trip.start_date,
					trip.end_date,
					trip.customer,
					trip.destination,
					$2,
					'driver_status_changed',
					jsonb_build_array(jsonb_build_object(
						'field', 'driver_status',
						'label', $3 || ' status',
						'before', case $4
							when 'pending-assignment' then 'Pending assignment'
							when 'pending-response' then 'Pending response'
							when 'confirmed' then 'Confirmed'
							else 'Off'
						end,
						'after', 'Confirmed'
					)),
					jsonb_build_object(
						'driverId', $5,
						'leg', $6,
						'role', $3,
						'source', 'driver'
					)
				from public.trips trip
				where trip.id = $1
			$history$
			using
				p_trip_id,
				coalesce(v_driver_name, 'Driver'),
				v_role,
				v_before_status,
				v_driver_id,
				coalesce(p_leg, 'outbound');
		exception when others then
			raise warning 'Driver status history could not be recorded: %', sqlerrm;
		end;
	end if;

	return jsonb_build_object(
		'tripId', v_row.trip_id,
		'driverId', v_row.driver_id,
		'leg', v_row.leg,
		'role', v_row.role,
		'status', v_row.status,
		'source', v_row.source,
		'confirmedAt', v_row.accepted_at,
		'declinedAt', v_row.declined_at,
		'updatedAt', v_row.updated_at
	);
end;
$$;

-- Decline a trip leg after an explicit confirmation in the driver UI.
-- The same share-token ownership checks used by confirmation prevent one
-- driver's public link from changing another driver's assignment.
create or replace function public.decline_trip_assignment(
	p_token text,
	p_trip_id uuid,
	p_leg text default 'outbound'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	v_driver_name text;
	v_role text;
	v_before_status text;
	v_row public.trip_driver_statuses;
begin
	select share.driver_id, driver.name
	into v_driver_id, v_driver_name
	from public.driver_schedule_shares share
	join public.drivers driver on driver.id = share.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and (share.expires_at is null or share.expires_at > now());

	if v_driver_id is null then
		raise exception 'Invalid or expired driver link';
	end if;

	select driver_row.role
	into v_role
	from public.trip_assignments assignment
	join public.trip_drivers driver_row
		on driver_row.assignment_id = assignment.id
	where assignment.trip_id = p_trip_id
		and coalesce(assignment.leg, 'outbound') = coalesce(p_leg, 'outbound')
		and driver_row.driver_id = v_driver_id
	order by case driver_row.role
		when 'driver' then 0
		when 'co-driver' then 1
		when 'relief-start' then 2
		else 3
	end
	limit 1;

	if v_role is null then
		raise exception 'This trip is not assigned to you';
	end if;

	select status
	into v_before_status
	from public.trip_driver_statuses
	where trip_id = p_trip_id
		and driver_id = v_driver_id
		and leg = coalesce(p_leg, 'outbound')
		and role = v_role;

	insert into public.trip_driver_statuses (
		trip_id,
		driver_id,
		leg,
		role,
		status,
		source,
		accepted_at,
		declined_at,
		updated_at
	)
	values (
		p_trip_id,
		v_driver_id,
		coalesce(p_leg, 'outbound'),
		v_role,
		'declined',
		'driver',
		null,
		now(),
		now()
	)
	on conflict on constraint trip_driver_statuses_unique
	do update set
		status = 'declined',
		source = 'driver',
		accepted_at = null,
		declined_at = now(),
		updated_at = now()
	returning * into v_row;

	-- Older clients only understand confirmation rows. Removing the legacy
	-- confirmation prevents a decline from appearing accepted there.
	delete from public.trip_driver_confirmations
	where trip_id = p_trip_id
		and driver_id = v_driver_id
		and leg = coalesce(p_leg, 'outbound');

	if v_before_status is distinct from 'declined'
		and to_regclass('public.trip_history') is not null then
		begin
			execute $history$
				insert into public.trip_history (
					trip_id,
					trip_ref,
					trip_start_date,
					trip_end_date,
					customer_name,
					destination,
					actor_name,
					action,
					changes,
					metadata
				)
				select
					trip.id,
					trip.trip_ref,
					trip.start_date,
					trip.end_date,
					trip.customer,
					trip.destination,
					$2,
					'driver_status_changed',
					jsonb_build_array(jsonb_build_object(
						'field', 'driver_status',
						'label', $3 || ' status',
						'before', case $4
							when 'pending-assignment' then 'Pending assignment'
							when 'pending-response' then 'Pending response'
							when 'confirmed' then 'Confirmed'
							when 'declined' then 'Declined'
							else 'Off'
						end,
						'after', 'Declined'
					)),
					jsonb_build_object(
						'driverId', $5,
						'leg', $6,
						'role', $3,
						'source', 'driver'
					)
				from public.trips trip
				where trip.id = $1
			$history$
			using
				p_trip_id,
				coalesce(v_driver_name, 'Driver'),
				v_role,
				v_before_status,
				v_driver_id,
				coalesce(p_leg, 'outbound');
		exception when others then
			raise warning 'Driver status history could not be recorded: %', sqlerrm;
		end;
	end if;

	return jsonb_build_object(
		'tripId', v_row.trip_id,
		'driverId', v_row.driver_id,
		'leg', v_row.leg,
		'role', v_row.role,
		'status', v_row.status,
		'source', v_row.source,
		'acceptedAt', v_row.accepted_at,
		'declinedAt', v_row.declined_at,
		'updatedAt', v_row.updated_at
	);
end;
$$;

-- Reconcile every role on a trip after its replace-all assignment save.
--
-- Non-dirty rows preserve the canonical database status. This prevents a
-- scheduler form opened before a driver's acceptance from overwriting that
-- newer acceptance during an unrelated save. Only a status icon the
-- dispatcher explicitly clicked has dirty=true and may override it.
create or replace function public.sync_trip_driver_statuses(
	p_trip_id uuid,
	p_statuses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_item jsonb;
	v_driver_id uuid;
	v_leg text;
	v_role text;
	v_status text;
	v_dirty boolean;
begin
	if p_trip_id is null then
		raise exception 'Trip id is required';
	end if;
	if jsonb_typeof(coalesce(p_statuses, '[]'::jsonb)) <> 'array' then
		raise exception 'Driver statuses must be a JSON array';
	end if;

	-- Statuses for drivers/roles removed from the trip are no longer active.
	delete from public.trip_driver_statuses status_row
	where status_row.trip_id = p_trip_id
		and not exists (
			select 1
			from jsonb_array_elements(coalesce(p_statuses, '[]'::jsonb)) item
			where nullif(item ->> 'driverId', '')::uuid = status_row.driver_id
				and coalesce(nullif(item ->> 'leg', ''), 'outbound') = status_row.leg
				and coalesce(nullif(item ->> 'role', ''), 'driver') = status_row.role
		);

	for v_item in
		select value
		from jsonb_array_elements(coalesce(p_statuses, '[]'::jsonb))
	loop
		v_driver_id := nullif(v_item ->> 'driverId', '')::uuid;
		v_leg := coalesce(nullif(v_item ->> 'leg', ''), 'outbound');
		v_role := coalesce(nullif(v_item ->> 'role', ''), 'driver');
		v_status := coalesce(nullif(v_item ->> 'status', ''), 'off');
		v_dirty := coalesce((v_item ->> 'dirty')::boolean, false);

		if v_driver_id is null
			or v_leg not in ('outbound', 'return')
			or v_role not in ('driver', 'co-driver', 'relief-start', 'relief-end')
			or v_status not in ('off', 'pending-assignment', 'pending-response', 'confirmed', 'declined') then
			continue;
		end if;

		-- Ignore stale or forged rows that are not part of the trip's current
		-- assignment graph.
		if not exists (
			select 1
			from public.trip_assignments assignment
			join public.trip_drivers driver_row on driver_row.assignment_id = assignment.id
			where assignment.trip_id = p_trip_id
				and coalesce(assignment.leg, 'outbound') = v_leg
				and driver_row.driver_id = v_driver_id
				and driver_row.role = v_role
		) then
			continue;
		end if;

		insert into public.trip_driver_statuses (
			trip_id,
			driver_id,
			leg,
			role,
			status,
			source,
			accepted_at,
			declined_at,
			updated_at
		)
		values (
			p_trip_id,
			v_driver_id,
			v_leg,
			v_role,
			v_status,
			'dispatcher',
			case when v_status = 'confirmed' then now() else null end,
			case when v_status = 'declined' then now() else null end,
			now()
		)
		on conflict on constraint trip_driver_statuses_unique
		do update set
			status = case
				when v_dirty then excluded.status
				else public.trip_driver_statuses.status
			end,
			source = case
				when v_dirty then 'dispatcher'
				else public.trip_driver_statuses.source
			end,
			accepted_at = case
				when v_dirty and excluded.status <> 'confirmed' then null
				when v_dirty and excluded.status = 'confirmed' then now()
				else public.trip_driver_statuses.accepted_at
			end,
			declined_at = case
				when v_dirty and excluded.status = 'declined' then now()
				when v_dirty then null
				else public.trip_driver_statuses.declined_at
			end,
			updated_at = case
				when v_dirty then now()
				else public.trip_driver_statuses.updated_at
			end;
	end loop;

	return (
		select coalesce(
			jsonb_agg(
				jsonb_build_object(
					'tripId', status_row.trip_id,
					'driverId', status_row.driver_id,
					'leg', status_row.leg,
					'role', status_row.role,
					'status', status_row.status,
					'source', status_row.source,
					'acceptedAt', status_row.accepted_at,
					'declinedAt', status_row.declined_at,
					'updatedAt', status_row.updated_at
				)
				order by status_row.updated_at desc
			),
			'[]'::jsonb
		)
		from public.trip_driver_statuses status_row
		where status_row.trip_id = p_trip_id
	);
end;
$$;

-- Batch read for the scheduler. Direct table access remains closed.
create or replace function public.get_trip_driver_statuses(p_trip_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		jsonb_agg(
			jsonb_build_object(
				'tripId', status_row.trip_id,
				'driverId', status_row.driver_id,
				'leg', status_row.leg,
				'role', status_row.role,
				'status', status_row.status,
				'source', status_row.source,
				'acceptedAt', status_row.accepted_at,
				'declinedAt', status_row.declined_at,
				'updatedAt', status_row.updated_at
			)
			order by status_row.updated_at desc
		),
		'[]'::jsonb
	)
	from public.trip_driver_statuses status_row
	where status_row.trip_id = any(coalesce(p_trip_ids, '{}'::uuid[]));
$$;

-- Read every current response state for one public driver share. This is the
-- status source for the modular driver card; the legacy confirmations RPC is
-- retained below for older deployed clients.
create or replace function public.get_driver_assignment_statuses(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		jsonb_agg(jsonb_build_object(
			'tripId', status_row.trip_id,
			'leg', status_row.leg,
			'role', status_row.role,
			'status', status_row.status,
			'source', status_row.source,
			'confirmedAt', case
				when status_row.status = 'confirmed'
					then coalesce(status_row.accepted_at, status_row.updated_at)
				else null
			end,
			'acceptedAt', status_row.accepted_at,
			'declinedAt', status_row.declined_at,
			'updatedAt', status_row.updated_at
		)),
		'[]'::jsonb
	)
	from public.trip_driver_statuses status_row
	join public.driver_schedule_shares share
		on share.driver_id = status_row.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and (share.expires_at is null or share.expires_at > now());
$$;

-- Read back confirmed statuses for one driver share.
create or replace function public.get_driver_confirmations(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		jsonb_agg(jsonb_build_object(
			'tripId', status_row.trip_id,
			'leg', status_row.leg,
			'role', status_row.role,
			'source', status_row.source,
			'confirmedAt', case
				when status_row.source = 'driver'
					then coalesce(status_row.accepted_at, status_row.updated_at)
				else status_row.updated_at
			end,
			'updatedAt', status_row.updated_at
		)),
		'[]'::jsonb
	)
	from public.trip_driver_statuses status_row
	join public.driver_schedule_shares share
		on share.driver_id = status_row.driver_id
	where share.token = lower(trim(p_token))
		and share.revoked_at is null
		and (share.expires_at is null or share.expires_at > now())
		and status_row.status = 'confirmed';
$$;

revoke all on function public.confirm_trip_assignment(text, uuid, text) from public;
revoke all on function public.decline_trip_assignment(text, uuid, text) from public;
revoke all on function public.sync_trip_driver_statuses(uuid, jsonb) from public;
revoke all on function public.get_trip_driver_statuses(uuid[]) from public;
revoke all on function public.get_driver_assignment_statuses(text) from public;
revoke all on function public.get_driver_confirmations(text) from public;

grant execute on function public.confirm_trip_assignment(text, uuid, text) to anon, authenticated;
grant execute on function public.decline_trip_assignment(text, uuid, text) to anon, authenticated;
grant execute on function public.sync_trip_driver_statuses(uuid, jsonb) to anon, authenticated;
grant execute on function public.get_trip_driver_statuses(uuid[]) to anon, authenticated;
grant execute on function public.get_driver_assignment_statuses(text) to anon, authenticated;
grant execute on function public.get_driver_confirmations(text) to anon, authenticated;
