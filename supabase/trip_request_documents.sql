-- ===========================================================================
-- TRIP REQUEST DOCUMENTS
-- ---------------------------------------------------------------------------
-- Lets a customer attach their own itinerary (Word, PDF, Excel, …) to a trip
-- request submitted from the public, no-login request.html.
--
-- REVIEW BEFORE RUNNING. This grants anonymous INSERT on one storage bucket,
-- which is the only anonymous write path in the system outside the existing
-- submit_trip_request RPC. Read "Why this shape" below before changing it.
--
-- Rollback is at the bottom of this file.
-- ===========================================================================

-- ── Why this shape ─────────────────────────────────────────────────────────
--
-- The public form cannot use uploadDocument() in js/data/trip-db.js: that
-- writes straight to the trip-documents bucket and inserts into
-- trip_documents keyed by trip_id, and (a) it needs an authenticated session,
-- (b) a request has no trip_id until dispatch links it.
--
-- So this uses a separate bucket that anonymous visitors may write to and may
-- NOT read, with the bucket's own native size and MIME limits as the first
-- line of defence, and a security definer RPC to record the file against a
-- real request. A file uploaded without a matching reference is never
-- recorded and is garbage-collected (see "Orphans" below).
--
-- Anonymous callers get INSERT only. No SELECT, no UPDATE, no DELETE — a
-- visitor can add a file and can never read, replace, or remove one, theirs
-- or anyone else's. The client uploads with upsert disabled, so an existing
-- object cannot be overwritten even if a path were guessed.

-- ── 1. Bucket ──────────────────────────────────────────────────────────────
-- private (public = false): reads go through short-lived signed URLs minted
-- by the authenticated app, never by the public page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'trip-request-uploads',
	'trip-request-uploads',
	false,
	10485760, -- 10 MB, enforced by storage itself, not just the browser
	array[
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'text/csv',
		'text/plain',
		'image/png',
		'image/jpeg',
		'image/heic'
	]
)
on conflict (id) do nothing;

-- ── 2. Storage policies ────────────────────────────────────────────────────
-- Anonymous: write only, and only inside this bucket.
drop policy if exists "trip request uploads: anon insert" on storage.objects;
create policy "trip request uploads: anon insert"
	on storage.objects for insert
	to anon
	with check (bucket_id = 'trip-request-uploads');

-- Dispatch (signed in): read, so the Requests inbox can offer a download.
drop policy if exists "trip request uploads: authenticated read" on storage.objects;
create policy "trip request uploads: authenticated read"
	on storage.objects for select
	to authenticated
	using (bucket_id = 'trip-request-uploads');

-- Dispatch: delete, so removing a request can take its files with it.
drop policy if exists "trip request uploads: authenticated delete" on storage.objects;
create policy "trip request uploads: authenticated delete"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'trip-request-uploads');

-- ── 3. Table ───────────────────────────────────────────────────────────────
create table if not exists public.trip_request_documents (
	id           uuid primary key default gen_random_uuid(),
	request_id   uuid not null references public.trip_requests (id) on delete cascade,
	file_name    text not null,
	file_path    text not null unique,
	file_size    bigint,
	content_type text,
	created_at   timestamptz not null default now()
);

create index if not exists trip_request_documents_request_id_idx
	on public.trip_request_documents (request_id);

-- Same access posture as trip_requests itself: nothing reaches the table
-- except through the security definer functions below.
alter table public.trip_request_documents enable row level security;
revoke all on public.trip_request_documents from anon, authenticated;

-- ── 4. Attach RPC ──────────────────────────────────────────────────────────
-- Records an already-uploaded object against a request, looked up by its
-- public reference. Returns null when the reference matches nothing, so a
-- bad or expired link records nothing and leaks nothing about which
-- references exist.
create or replace function public.attach_trip_request_document(
	p_reference    text,
	p_file_path    text,
	p_file_name    text,
	p_file_size    bigint default null,
	p_content_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_request_id uuid;
	v_count      integer;
	v_id         uuid;
begin
	select id into v_request_id
	from public.trip_requests
	where reference = trim(p_reference);

	if v_request_id is null then
		return null;
	end if;

	-- Cap attachments per request so the endpoint can't be used as free
	-- storage against a single leaked reference.
	select count(*) into v_count
	from public.trip_request_documents
	where request_id = v_request_id;

	if v_count >= 5 then
		return null;
	end if;

	insert into public.trip_request_documents
		(request_id, file_name, file_path, file_size, content_type)
	values
		(v_request_id, left(p_file_name, 255), p_file_path, p_file_size, p_content_type)
	returning id into v_id;

	return v_id;
end;
$$;

revoke all on function public.attach_trip_request_document(text, text, text, bigint, text) from public;
grant execute on function public.attach_trip_request_document(text, text, text, bigint, text) to anon, authenticated;

-- ── 5. Read for the inbox ──────────────────────────────────────────────────
-- Dispatch-only: the file list for one request, for the Requests window.
create or replace function public.list_trip_request_documents(p_request_id uuid)
returns table (
	id           uuid,
	file_name    text,
	file_path    text,
	file_size    bigint,
	content_type text,
	created_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
	select d.id, d.file_name, d.file_path, d.file_size, d.content_type, d.created_at
	from public.trip_request_documents d
	where d.request_id = p_request_id
	order by d.created_at;
$$;

revoke all on function public.list_trip_request_documents(uuid) from public;
grant execute on function public.list_trip_request_documents(uuid) to authenticated;

-- ── Orphans ────────────────────────────────────────────────────────────────
-- An object can be uploaded and then never attached (the visitor closes the
-- tab, or the reference was wrong). Those rows exist in storage.objects with
-- no matching trip_request_documents row. Reap them periodically:
--
--   delete from storage.objects o
--   where o.bucket_id = 'trip-request-uploads'
--     and o.created_at < now() - interval '7 days'
--     and not exists (
--       select 1 from public.trip_request_documents d where d.file_path = o.name
--     );
--
-- Worth a scheduled job once this sees real traffic. Not created here — a
-- cron that deletes storage objects should be a deliberate, separate change.

-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- drop function if exists public.list_trip_request_documents(uuid);
-- drop function if exists public.attach_trip_request_document(text, text, text, bigint, text);
-- drop table if exists public.trip_request_documents;   -- destroys the records
-- drop policy if exists "trip request uploads: anon insert" on storage.objects;
-- drop policy if exists "trip request uploads: authenticated read" on storage.objects;
-- drop policy if exists "trip request uploads: authenticated delete" on storage.objects;
-- -- Empty the bucket before deleting it, or the delete fails:
-- -- delete from storage.objects where bucket_id = 'trip-request-uploads';
-- -- delete from storage.buckets where id = 'trip-request-uploads';
-- ===========================================================================
