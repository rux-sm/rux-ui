-- Saved customer/contact roster — backs both the Customers module and the
-- trip panel's booking/trip-contact autofill. Run this in the Supabase SQL
-- editor before using either.
--
-- Trips keep their own freetext booking_contact_*/trip_contact_*_* columns
-- as-is (added by earlier patches) — those stay the snapshot of who was
-- actually on a given trip at the time. The *_contact_id columns below are
-- an additive soft link back to this roster, used for autofill and for the
-- Customers module's "past trips" lookup — never required, never rewritten
-- retroactively when a contact's info changes later.

create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_name_idx  on public.contacts (name);
create index if not exists contacts_phone_idx on public.contacts (phone);

alter table public.contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contacts' and policyname = 'contacts are public'
  ) then
    create policy "contacts are public" on public.contacts for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contacts' and policyname = 'manage contacts'
  ) then
    create policy "manage contacts" on public.contacts for all using (true) with check (true);
  end if;
end $$;

alter table public.trips
  add column if not exists booking_contact_id  uuid references public.contacts(id) on delete set null,
  add column if not exists trip_contact_1_id    uuid references public.contacts(id) on delete set null,
  add column if not exists trip_contact_2_id    uuid references public.contacts(id) on delete set null;

create index if not exists trips_booking_contact_id_idx on public.trips (booking_contact_id);
create index if not exists trips_trip_contact_1_id_idx  on public.trips (trip_contact_1_id);
create index if not exists trips_trip_contact_2_id_idx  on public.trips (trip_contact_2_id);
