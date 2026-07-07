-- Self-organized trips: flag on trips + a passenger roster table.
-- Run this in the Supabase SQL editor. Confirm the RLS policies below match
-- whatever access model `trips`/`trip_payments` already use in this project.

alter table public.trips
  add column if not exists is_self_organized boolean not null default false;

create table if not exists public.trip_passengers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  position int not null default 0,
  name text,
  phone text,
  email text,
  address text,
  dob date,
  notes text,
  amount_owed numeric,
  amount_paid numeric,
  created_at timestamptz not null default now()
);

alter table public.trip_passengers enable row level security;
create policy "trip passengers are public" on public.trip_passengers for select using (true);
create policy "manage trip passengers" on public.trip_passengers for all using (true) with check (true);
