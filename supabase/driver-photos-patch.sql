-- Adds driver profile photo support.
-- Run once in the Supabase SQL editor (mirrors the existing trip-documents
-- bucket setup — public read, anon-key client uploads).

-- 1. Column to store the storage path of the driver's photo
alter table drivers add column if not exists photo_path text;

-- 2. Storage bucket for driver photos (public read, so <img> tags can load directly)
insert into storage.buckets (id, name, public)
values ('driver-photos', 'driver-photos', true)
on conflict (id) do nothing;

-- 3. Policies for anon-key client access
create policy "driver-photos public read"
on storage.objects for select
using (bucket_id = 'driver-photos');

create policy "driver-photos anon upload"
on storage.objects for insert
with check (bucket_id = 'driver-photos');

create policy "driver-photos anon update"
on storage.objects for update
using (bucket_id = 'driver-photos');

create policy "driver-photos anon delete"
on storage.objects for delete
using (bucket_id = 'driver-photos');
