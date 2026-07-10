-- Expands the passenger Manifest to match the real-world spreadsheet workflow:
-- named ticket price options, richer passenger fields, itemized per-passenger
-- payments, and a status flag for cancellations/refunds/no-shows.
-- Run once in the Supabase SQL editor.

-- 1. Ticket pricing options (Billing tab, "Ticket Pricing" card) — a trip can
--    offer several named prices (e.g. "Single", "Double — per person").
create table if not exists public.trip_ticket_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  position int not null default 0,
  label text,
  price numeric,
  created_at timestamptz not null default now()
);

alter table public.trip_ticket_options enable row level security;
create policy "trip ticket options are public" on public.trip_ticket_options for select using (true);
create policy "manage trip ticket options" on public.trip_ticket_options for all using (true) with check (true);

-- 2. New trip_passengers columns
alter table public.trip_passengers
  add column if not exists group_label text,
  add column if not exists pickup_location text,
  add column if not exists is_new_customer boolean,
  add column if not exists seat text,
  add column if not exists status text not null default 'active',
  add column if not exists ticket_option_id uuid references public.trip_ticket_options(id) on delete set null;

-- 3. Itemized per-passenger payments (mirrors trip_payments), replacing the
--    single flat amount_paid number. amount_paid is left in place for now as
--    a legacy column but is no longer written to by the app.
create table if not exists public.trip_passenger_payments (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.trip_passengers(id) on delete cascade,
  position int not null default 0,
  amount numeric,
  method text,
  date date,
  ref text,
  created_at timestamptz not null default now()
);

alter table public.trip_passenger_payments enable row level security;
create policy "trip passenger payments are public" on public.trip_passenger_payments for select using (true);
create policy "manage trip passenger payments" on public.trip_passenger_payments for all using (true) with check (true);
