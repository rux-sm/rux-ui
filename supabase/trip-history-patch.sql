-- Global, append-only trip history.
--
-- Each row represents one meaningful user action (a Save, delete, document
-- action, or direct reassignment), while `changes` contains every field changed
-- by that action. This keeps the right-panel feed readable instead of creating
-- one database row per field.
--
-- The application uses the narrowly-scoped RPCs below. Direct table access is
-- revoked so history rows cannot be edited or deleted through PostgREST.
-- Run this file in the Supabase SQL editor before opening the History tab.

create table if not exists public.trip_history (
	id bigint generated always as identity primary key,
	trip_id uuid,
	trip_ref text,
	trip_start_date date,
	trip_end_date date,
	customer_name text,
	destination text,
	actor_name text not null default 'Dispatcher',
	action text not null,
	changes jsonb not null default '[]'::jsonb,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	constraint trip_history_action_check check (
		action in (
			'created',
			'updated',
			'deleted',
			'assignment_changed',
			'document_uploaded',
			'document_replaced',
			'document_deleted'
		)
	),
	constraint trip_history_changes_check check (jsonb_typeof(changes) = 'array'),
	constraint trip_history_metadata_check check (jsonb_typeof(metadata) = 'object')
);

alter table public.trip_history enable row level security;
revoke all on table public.trip_history from anon, authenticated;

create index if not exists trip_history_created_idx
	on public.trip_history (created_at desc, id desc);

create index if not exists trip_history_trip_created_idx
	on public.trip_history (trip_id, created_at desc, id desc);

create or replace function public.record_trip_history(
	p_trip_id uuid,
	p_action text,
	p_snapshot jsonb,
	p_changes jsonb,
	p_actor_name text default 'Dispatcher',
	p_metadata jsonb default '{}'::jsonb
)
returns public.trip_history
language plpgsql
security definer
set search_path = public
as $$
declare
	v_history public.trip_history;
	v_snapshot jsonb := coalesce(p_snapshot, '{}'::jsonb);
	v_changes jsonb := coalesce(p_changes, '[]'::jsonb);
	v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
	if p_trip_id is null then
		raise exception 'Trip id is required';
	end if;
	if p_action is null or trim(p_action) = '' then
		raise exception 'History action is required';
	end if;
	if jsonb_typeof(v_changes) <> 'array' then
		raise exception 'History changes must be a JSON array';
	end if;
	if jsonb_typeof(v_metadata) <> 'object' then
		raise exception 'History metadata must be a JSON object';
	end if;

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
	values (
		p_trip_id,
		nullif(v_snapshot ->> 'trip_ref', ''),
		nullif(v_snapshot ->> 'start_date', '')::date,
		nullif(v_snapshot ->> 'end_date', '')::date,
		nullif(v_snapshot ->> 'customer', ''),
		nullif(v_snapshot ->> 'destination', ''),
		coalesce(nullif(trim(p_actor_name), ''), 'Dispatcher'),
		p_action,
		v_changes,
		v_metadata
	)
	returning * into v_history;

	return v_history;
end;
$$;

create or replace function public.get_trip_history(
	p_limit integer default 50,
	p_before_created_at timestamptz default null,
	p_before_id bigint default null,
	p_trip_id uuid default null
)
returns setof public.trip_history
language sql
stable
security definer
set search_path = public
as $$
	select history.*
	from public.trip_history history
	where (p_trip_id is null or history.trip_id = p_trip_id)
		and (
			p_before_created_at is null
			or (history.created_at, history.id)
				< (p_before_created_at, coalesce(p_before_id, 9223372036854775807::bigint))
		)
	order by history.created_at desc, history.id desc
	limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.record_trip_history(uuid, text, jsonb, jsonb, text, jsonb) from public;
revoke all on function public.get_trip_history(integer, timestamptz, bigint, uuid) from public;

grant execute on function public.record_trip_history(uuid, text, jsonb, jsonb, text, jsonb)
	to anon, authenticated;
grant execute on function public.get_trip_history(integer, timestamptz, bigint, uuid)
	to anon, authenticated;

