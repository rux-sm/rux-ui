-- Driver time-off / unavailability. A driver can have several date ranges
-- (vacation, sick, etc); each is its own row, replaced wholesale on save
-- from the Driver panel's "Time Off" tab — same recipe as trip_payments.
-- Run once in the Supabase SQL editor.

create table if not exists public.driver_time_off (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  position int not null default 0,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.driver_time_off enable row level security;
create policy "driver time off is public" on public.driver_time_off for select using (true);
create policy "manage driver time off" on public.driver_time_off for all using (true) with check (true);
