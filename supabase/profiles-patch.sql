-- Adds a lightweight, password-less user profile system: pick a name (and
-- optional photo) from a shared list so trip history attribution and the
-- header avatar reflect a real person instead of the generic "Dispatcher"
-- fallback. Mirrors the existing driver-photos bucket setup (public read,
-- anon-key client uploads) — see driver-photos-patch.sql.
-- Run once in the Supabase SQL editor.

-- 1. Profiles table
create table if not exists public.profiles (
	id uuid primary key default gen_random_uuid(),
	display_name text not null,
	photo_path text,
	settings jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "manage profiles" on public.profiles for all using (true) with check (true);

-- 2. Storage bucket for profile photos (public read, so <img> tags can load directly)
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- 3. Policies for anon-key client access
create policy "profile-photos public read"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "profile-photos anon upload"
on storage.objects for insert
with check (bucket_id = 'profile-photos');

create policy "profile-photos anon update"
on storage.objects for update
using (bucket_id = 'profile-photos');

create policy "profile-photos anon delete"
on storage.objects for delete
using (bucket_id = 'profile-photos');
