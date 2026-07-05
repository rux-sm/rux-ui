-- Add shared in-game chat. Messages are cleared when a match starts or resets.
create table if not exists public.game_messages (
	id bigint generated always as identity primary key,
	player_id uuid references public.game_players(id) on delete set null,
	player_name text not null,
	body text not null check (char_length(trim(body)) between 1 and 160),
	created_at timestamptz not null default now()
);

alter table public.game_messages enable row level security;
drop policy if exists "messages are public" on public.game_messages;
create policy "messages are public" on public.game_messages for select using (true);

create or replace function public.clear_flip_seven_messages_on_new_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if old.status is distinct from new.status then
		delete from game_messages where id is not null;
	end if;
	return new;
end $$;

drop trigger if exists clear_flip_seven_messages_on_new_game on public.game_state;
create trigger clear_flip_seven_messages_on_new_game
	after update of status on public.game_state
	for each row execute function public.clear_flip_seven_messages_on_new_game();

drop function if exists public.send_flip_seven_message(uuid, text);
create or replace function public.send_flip_seven_message(acting_player uuid, message_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
	select name into sender_name from game_players where id = acting_player;
	if sender_name is null then raise exception 'Join the game before sending messages'; end if;
	if (select status from game_state where id = 1) = 'lobby' then
		raise exception 'Start the match before sending messages';
	end if;
	insert into game_messages(player_id, player_name, body)
	values (acting_player, sender_name, trim(message_body));
end $$;

grant select on public.game_messages to anon, authenticated;
grant execute on function public.send_flip_seven_message(uuid, text) to anon, authenticated;

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_messages'
	) then
		alter publication supabase_realtime add table public.game_messages;
	end if;
end $$;

notify pgrst, 'reload schema';
