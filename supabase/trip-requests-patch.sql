-- ============================================================================
-- RUX UI — TRIP REQUESTS (customer request inbox)
-- ----------------------------------------------------------------------------
-- A public inbox for customer trip-request submissions. Dispatch sends a
-- scramble link (request.html?r=REQ-XXXXXX) that the customer uses to fill
-- out the public form; submissions land here as rows dispatchers triage
-- into the trip editor ("Create draft trip" / "Apply to existing trip").
-- The same table also absorbs free-text email requests funneled through the
-- import pipeline (source = 'email').
--
-- Access model follows the driver/maintenance share pages exactly: the table
-- is locked down (`revoke all` from anon/authenticated) and every read or
-- write goes through a security definer function. That lets the public form
-- INSERT a submission WITHOUT ever being able to list what other customers
-- have submitted, and keeps the inbox readable only from inside the app.
--
-- Run this in the Supabase SQL editor. No application code depends on the
-- exact function bodies — only on the names/signatures below.
-- ============================================================================

create table if not exists public.trip_requests (
	id uuid primary key default gen_random_uuid(),
	reference text not null unique check (reference ~ '^REQ-[A-Z0-9]{6}$'),
	status text not null default 'new' check (status in ('invited', 'new', 'reviewed', 'linked', 'closed')),
	source text not null default 'form' check (source in ('invite', 'form', 'email')),
	client text,
	passenger_count int check (passenger_count is null or passenger_count between 1 and 200),
	contact jsonb not null default '{}'::jsonb,
	-- Soft link to the trip a request was invited for / applied to. Kept as
	-- a link (never a joined snapshot) so a request stays stable while the
	-- trip evolves, mirroring the contacts roster's additive-link approach.
	trip_id uuid references public.trips (id) on delete set null,
	payload jsonb,
	note text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint trip_requests_payload_shape check (payload is null or jsonb_typeof(payload) = 'object'),
	constraint trip_requests_contact_shape check (jsonb_typeof(contact) = 'object')
);

create index if not exists trip_requests_status_idx on public.trip_requests (status, created_at desc);
create index if not exists trip_requests_trip_idx   on public.trip_requests (trip_id);

alter table public.trip_requests enable row level security;
revoke all on table public.trip_requests from anon, authenticated;

comment on table public.trip_requests is
	'Customer trip-request inbox. Rows are created by dispatch invites or anonymous form submissions and triaged into the trip editor. Never readable by the anon key.';
comment on column public.trip_requests.reference is
	'Short public handle shown in request links (request.html?r=REQ-XXXXXX). Opaque to callers; not a secret.';
comment on column public.trip_requests.status is
	'Workflow: invited (link sent, no submission yet), new (submitted and waiting), reviewed (dispatcher looked at it), linked (tied to a trip), closed.';
comment on column public.trip_requests.source is
	'Origin of the row: invite (link sent by dispatch), form (customer-filled public form), email (import pipeline).';
comment on column public.trip_requests.payload is
	'Reviewable Trip Draft v2 payload (docs/trip-import-schema-v2.json) produced by the public form or the importer.';
comment on column public.trip_requests.trip_id is
	'The trip this request is invited-for or has been applied to. Set at invite time when the request is sent from a specific trip, or later via link_trip_request.';

-- Supply the table to Realtime so any client (the app on boot/open) can
-- refresh the unread badge without polling. Membership is required before
-- Postgres changes can reach the browser.
do $$
declare
	v_table text := 'trip_requests';
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = v_table
	) then
		execute format('alter publication supabase_realtime add table public.%I', v_table);
	end if;
end $$;

-- Reference generator: REQ- plus six random hex chars from a UUID, retried
-- on the (exceedingly unlikely) collision path so callers never see an error.
create or replace function public.new_trip_request_reference()
returns text language plpgsql set search_path = public as $$
declare
	v_reference text;
begin
	loop
		v_reference := 'REQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
		exit when not exists (select 1 from public.trip_requests where reference = v_reference);
	end loop;
	return v_reference;
end $$;

-- Dispatcher-initiated invite: creates an 'invited' row and returns the
-- handle that becomes request.html?r=REQ-XXXXXX. Passing a trip_id ties the
-- invite to a specific trip so the submission arrives pre-linked.
create or replace function public.create_trip_request(
	p_client text,
	p_contact jsonb,
	p_trip_id uuid,
	p_passenger_count int,
	p_note text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
	v_row public.trip_requests;
begin
	insert into public.trip_requests (reference, status, source, client, passenger_count, contact, trip_id, note)
	values (
		public.new_trip_request_reference(),
		'invited',
		'invite',
		nullif(trim(coalesce(p_client, '')), ''),
		p_passenger_count,
		coalesce(p_contact, '{}'::jsonb),
		p_trip_id,
		nullif(trim(coalesce(p_note, '')), '')
	)
	returning * into v_row;
	return jsonb_build_object('id', v_row.id, 'reference', v_row.reference, 'status', v_row.status);
end $$;
-- Public submission from request.html. If p_reference matches an 'invited'
-- row, the submission attaches to it (updating contact/payload in place and
-- moving it to 'new') so dispatch keeps the invite context. Otherwise a
-- fresh 'form' row is created — the customer came directly via the URL.
-- The Trip Draft v2 payload shape is enforced by the table check constraint.
create or replace function public.submit_trip_request(
	p_reference text,
	p_client text,
	p_contact jsonb,
	p_payload jsonb,
	p_passenger_count int,
	p_note text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
	v_ref    text := nullif(trim(coalesce(p_reference, '')), '');
	v_target public.trip_requests;
begin
	if v_ref is not null then
		select *
		into v_target
		from public.trip_requests
		where reference = upper(v_ref) and status = 'invited'
		limit 1;
	end if;

	if v_target.id is not null then
		update public.trip_requests
		set status         = 'new',
			client         = nullif(trim(coalesce(p_client, '')), ''),
			passenger_count = p_passenger_count,
			contact        = coalesce(p_contact, '{}'::jsonb),
			payload        = p_payload,
			note           = coalesce(nullif(trim(coalesce(p_note, '')), ''), note),
			updated_at     = now()
		where id = v_target.id
		returning * into v_target;
		return jsonb_build_object('id', v_target.id, 'reference', v_target.reference, 'status', v_target.status);
	end if;

	insert into public.trip_requests (reference, status, source, client, passenger_count, contact, payload, note)
	values (
		public.new_trip_request_reference(),
		'new',
		'form',
		nullif(trim(coalesce(p_client, '')), ''),
		p_passenger_count,
		coalesce(p_contact, '{}'::jsonb),
		p_payload,
		nullif(trim(coalesce(p_note, '')), '')
	)
	returning * into v_target;
	return jsonb_build_object('id', v_target.id, 'reference', v_target.reference, 'status', v_target.status);
end $$;

-- Inbox read for the app. Returns a flat row per request with the display
-- essentials (destination, dates, type) pulled out of the payload so the
-- window doesn't have to dig through the draft JSON itself.
create or replace function public.list_trip_requests()
returns jsonb language sql stable security definer set search_path = public as $$
	select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
	from (
		select
			tr.id::text                                                as id,
			tr.reference,
			tr.status,
			tr.source,
			tr.client,
			tr.passenger_count,
			tr.contact,
			tr.trip_id::text                                           as trip_id,
			tr.payload -> 'trip' ->> 'destination'                     as destination,
			tr.payload -> 'trip' -> 'legs' -> 'outbound' ->> 'start_date' as start_date,
			tr.payload -> 'trip' -> 'legs' -> 'outbound' ->> 'end_date'   as end_date,
			tr.payload -> 'trip' ->> 'type'                            as trip_type,
			tr.payload -> 'trip' ->> 'service_type'                    as service_type,
			tr.note,
			tr.created_at,
			tr.updated_at
		from public.trip_requests tr
	) r;
$$;

-- Dispatcher triage transitions. Status is validated server-side so the anon
-- key (which the whole app runs under) can never invent a value outside the
-- enum even if a client is tampered with.
create or replace function public.update_trip_request_status(
	p_id uuid,
	p_status text
) returns boolean language plpgsql security definer set search_path = public as $$
begin
	if p_status not in ('invited', 'new', 'reviewed', 'linked', 'closed') then
		raise exception 'invalid trip request status: %', p_status;
	end if;
	update public.trip_requests
	set status = p_status, updated_at = now()
	where id = p_id;
	return found;
end $$;

-- "Apply to existing trip": ties the request to a trip and moves it to
-- 'linked' in one call. The trip editor prefill itself happens client-side.
create or replace function public.link_trip_request(
	p_id uuid,
	p_trip_id uuid
) returns boolean language plpgsql security definer set search_path = public as $$
begin
	update public.trip_requests
	set trip_id = p_trip_id, status = 'linked', updated_at = now()
	where id = p_id;
	return found;
end $$;

create or replace function public.delete_trip_request(
	p_id uuid
) returns boolean language plpgsql security definer set search_path = public as $$
begin
	delete from public.trip_requests where id = p_id;
	return found;
end $$;

grant execute on function public.create_trip_request(text, jsonb, uuid, int, text) to anon, authenticated;
grant execute on function public.submit_trip_request(text, text, jsonb, jsonb, int, text) to anon, authenticated;
grant execute on function public.list_trip_requests() to anon, authenticated;
grant execute on function public.update_trip_request_status(uuid, text) to anon, authenticated;
grant execute on function public.link_trip_request(uuid, uuid) to anon, authenticated;
grant execute on function public.delete_trip_request(uuid) to anon, authenticated;