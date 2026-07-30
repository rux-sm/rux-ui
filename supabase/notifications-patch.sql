-- Adds a notifications inbox: driver license/medical expiry alerts and a
-- daily "trips departing tomorrow" readiness summary, surfaced via a bell
-- icon in the header (see js/data/notification-db.js, js/panels/notifications-panel.js).
-- Rows are generated client-side at app boot (no backend/cron exists — see
-- scheduler-realtime-patch.sql for the same constraint on trips) and are
-- idempotent via the dedupe_key unique index, so multiple dispatchers'
-- clients generating at the same time never create duplicates.
-- Run once in the Supabase SQL editor.

-- 1. Notifications table
create table if not exists public.notifications (
	id uuid primary key default gen_random_uuid(),
	type text not null check (type in ('driver_license_expiry', 'driver_medical_expiry', 'trip_departure_summary')),
	severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
	title text not null,
	body text,
	ref_table text,
	ref_id uuid,
	dedupe_key text not null,
	created_at timestamptz not null default now()
);

create unique index if not exists notifications_dedupe_key_idx on public.notifications (dedupe_key);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;
create policy "notifications are public" on public.notifications for select using (true);
create policy "manage notifications" on public.notifications for all using (true) with check (true);

-- 2. Per-profile read/dismiss state — kept separate from notifications
-- itself since the same alert is shared across dispatchers but each one
-- needs independent read/unread and dismissed state.
create table if not exists public.notification_reads (
	notification_id uuid not null references public.notifications (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	read_at timestamptz,
	dismissed_at timestamptz,
	primary key (notification_id, profile_id)
);

alter table public.notification_reads enable row level security;
create policy "notification_reads are public" on public.notification_reads for select using (true);
create policy "manage notification_reads" on public.notification_reads for all using (true) with check (true);

-- 3. Realtime — without this, postgres_changes events never reach the
-- client (see scheduler-realtime-patch.sql for the same gotcha on trips).
do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
	) then
		alter publication supabase_realtime add table public.notifications;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_reads'
	) then
		alter publication supabase_realtime add table public.notification_reads;
	end if;
end $$;
