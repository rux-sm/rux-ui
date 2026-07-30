-- Adds a single shared team-chat channel all dispatchers can see, surfaced
-- via a chat icon in the header next to the notifications bell (see
-- js/data/team-chat-db.js, js/panels/team-chat.js). Mirrors the Flip Seven
-- easter egg's game_messages/realtime pattern, but as a plain internal-only
-- table (direct supabase-js access under a permissive policy, like
-- notifications/profiles) rather than Flip Seven's RPC-lockdown, since that
-- lockdown exists specifically because the game is reachable by anonymous
-- public sessions — this chat is not.
-- Run once in the Supabase SQL editor.

-- 1. Messages table
create table if not exists public.team_messages (
	id bigint generated always as identity primary key,
	profile_id uuid references public.profiles (id) on delete set null,
	-- Denormalized at send time, same reasoning as game_messages.player_name —
	-- history stays intact and visually consistent even if the sender later
	-- renames, changes their photo/color, or is deleted.
	sender_name text not null,
	sender_photo_path text,
	sender_avatar_color text,
	body text not null check (char_length(trim(body)) between 1 and 2000),
	created_at timestamptz not null default now()
);

create index if not exists team_messages_created_at_idx on public.team_messages (created_at);

alter table public.team_messages enable row level security;
create policy "team_messages are public" on public.team_messages for select using (true);
create policy "manage team_messages" on public.team_messages for all using (true) with check (true);

-- 2. One row per dispatcher: last time they opened chat. No realtime needed
-- here — it's purely local-effect (my own unread badge), not shared state.
create table if not exists public.team_chat_reads (
	profile_id uuid primary key references public.profiles (id) on delete cascade,
	last_read_at timestamptz not null default now()
);

alter table public.team_chat_reads enable row level security;
create policy "team_chat_reads are public" on public.team_chat_reads for select using (true);
create policy "manage team_chat_reads" on public.team_chat_reads for all using (true) with check (true);

-- 3. Realtime — without this, postgres_changes events never reach the
-- client (see scheduler-realtime-patch.sql for the same gotcha on trips).
do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
	) then
		alter publication supabase_realtime add table public.team_messages;
	end if;
end $$;
