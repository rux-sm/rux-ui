-- Adds emoji reactions to team chat messages (see js/data/team-chat-db.js,
-- js/panels/team-chat.js). Same conventions as team-chat-patch.sql:
-- internal-only table, permissive RLS, direct supabase-js access.
-- Run once in the Supabase SQL editor, after team-chat-patch.sql.

create table if not exists public.team_message_reactions (
	message_id bigint not null references public.team_messages (id) on delete cascade,
	profile_id uuid not null references public.profiles (id) on delete cascade,
	-- One profile can react to the same message with several different
	-- emoji, but not double-react with the same one — the primary key on
	-- the full triple is what makes toggling just "does this row exist".
	emoji text not null,
	created_at timestamptz not null default now(),
	primary key (message_id, profile_id, emoji)
);

alter table public.team_message_reactions enable row level security;
create policy "team_message_reactions are public" on public.team_message_reactions for select using (true);
create policy "manage team_message_reactions" on public.team_message_reactions for all using (true) with check (true);

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_message_reactions'
	) then
		alter publication supabase_realtime add table public.team_message_reactions;
	end if;
end $$;
