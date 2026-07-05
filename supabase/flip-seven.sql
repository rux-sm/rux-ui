-- Flip 7 schema and atomic game actions. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.game_players (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(trim(name)) between 1 and 32),
	total_score integer not null default 0,
	round_score integer not null default 0,
	is_bust boolean not null default false,
	joined_at timestamptz not null default now()
);
create unique index if not exists game_players_name_unique
	on public.game_players (lower(trim(name)));

create table if not exists public.game_state (
	id bigint primary key default 1 check (id = 1),
	status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
	current_player_id uuid references public.game_players(id) on delete set null,
	deck integer[] not null default '{}',
	updated_at timestamptz not null default now()
);

create table if not exists public.game_cards (
	id bigint generated always as identity primary key,
	player_id uuid not null references public.game_players(id) on delete cascade,
	card_value integer not null check (card_value between 0 and 12),
	modifier_value text check (modifier_value in ('+2', '+4', '+6')),
	drawn_at timestamptz not null default now()
);

create table if not exists public.game_messages (
	id bigint generated always as identity primary key,
	player_id uuid references public.game_players(id) on delete set null,
	player_name text not null,
	body text not null check (char_length(trim(body)) between 1 and 160),
	created_at timestamptz not null default now()
);

insert into public.game_state (id) values (1) on conflict (id) do nothing;

alter table public.game_state enable row level security;
alter table public.game_players enable row level security;
alter table public.game_cards enable row level security;
alter table public.game_messages enable row level security;
drop policy if exists "game state is public" on public.game_state;
drop policy if exists "players are public" on public.game_players;
drop policy if exists "join lobby" on public.game_players;
drop policy if exists "leave lobby" on public.game_players;
drop policy if exists "cards are public" on public.game_cards;
drop policy if exists "messages are public" on public.game_messages;
create policy "game state is public" on public.game_state for select using (true);
create policy "players are public" on public.game_players for select using (true);
create policy "join lobby" on public.game_players for insert with check (
	(select status from public.game_state where id = 1) = 'lobby'
);
create policy "leave lobby" on public.game_players for delete using (
	(select status from public.game_state where id = 1) = 'lobby'
);
create policy "cards are public" on public.game_cards for select using (true);
create policy "messages are public" on public.game_messages for select using (true);

create or replace function public.clear_flip_seven_messages_on_new_game()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.flip_seven_next_player(active_player uuid)
returns uuid language sql stable as $$
	with ordered as (
		select id, row_number() over (order by joined_at, id) as position
		from public.game_players
	), current_position as (
		select position from ordered where id = active_player
	)
	select id from ordered
	order by case when position > coalesce((select position from current_position), 0) then 0 else 1 end, position
	limit 1
$$;

drop function if exists public.start_flip_seven();
create or replace function public.start_flip_seven(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare host_player uuid; new_deck integer[];
begin
	perform 1 from game_state where id = 1 and status = 'lobby' for update;
	if not found then raise exception 'The match has already started'; end if;
	select id into host_player from game_players order by joined_at, id limit 1;
	if host_player is null then raise exception 'At least one player must join'; end if;
	if acting_player is distinct from host_player then raise exception 'Only the host can start the match'; end if;
	select array_agg(value order by random()) into new_deck
	from (select value from generate_series(0, 12) value cross join lateral generate_series(1, greatest(value, 1))) cards;
	delete from game_cards where id is not null;
	delete from game_messages where id is not null;
	update game_players set total_score = 0, round_score = 0, is_bust = false where id is not null;
	update game_state set status = 'playing', current_player_id = host_player, deck = new_deck, updated_at = now() where id = 1;
end $$;

drop function if exists public.hit_flip_seven_v2(uuid);
create or replace function public.hit_flip_seven_v2(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare drawn integer; remaining integer[]; duplicate boolean; unique_count integer; score integer; next_player uuid; was_bust boolean; new_total integer; new_deck integer[];
begin
	select deck[1], deck[2:] into drawn, remaining from game_state
	where id = 1 and status = 'playing' and current_player_id = acting_player for update;
	if not found then raise exception 'It is not your turn'; end if;
	select is_bust into was_bust from game_players where id = acting_player;
	if was_bust then
		delete from game_cards where player_id = acting_player;
		update game_players set is_bust = false, round_score = 0 where id = acting_player;
	end if;
	if drawn is null then
		select array_agg(value order by random()) into remaining
		from (select value from generate_series(0, 12) value cross join lateral generate_series(1, greatest(value, 1))) cards;
		drawn := remaining[1];
		remaining := remaining[2:];
	end if;
	select exists(select 1 from game_cards where player_id = acting_player and card_value = drawn) into duplicate;
	update game_state set deck = coalesce(remaining, '{}'), updated_at = now() where id = 1;
	insert into game_cards(player_id, card_value) values (acting_player, drawn);
	if duplicate then
		update game_players set is_bust = true, round_score = 0 where id = acting_player;
		select flip_seven_next_player(acting_player) into next_player;
		update game_state set current_player_id = next_player, updated_at = now() where id = 1;
		return;
	end if;
	select count(distinct card_value), coalesce(sum(card_value), 0) into unique_count, score
	from game_cards where player_id = acting_player;
	update game_players set round_score = score, is_bust = false where id = acting_player;
	if unique_count = 7 then
		update game_players
		set total_score = total_score + score + 15, round_score = 0
		where id = acting_player
		returning total_score into new_total;
		delete from game_cards where id is not null;
		update game_players set round_score = 0, is_bust = false where id is not null;
		if new_total >= 200 then
			update game_state
			set status = 'finished', current_player_id = acting_player, updated_at = now()
			where id = 1;
		else
			select array_agg(value order by random()) into new_deck
			from (select value from generate_series(0, 12) value cross join lateral generate_series(1, greatest(value, 1))) cards;
			update game_state
			set status = 'playing', current_player_id = next_player, deck = new_deck, updated_at = now()
			where id = 1;
		end if;
		return;
	end if;
	select flip_seven_next_player(acting_player) into next_player;
	update game_state set current_player_id = next_player, updated_at = now() where id = 1;
end $$;

-- Keep cached/older browser clients on the corrected behavior too.
create or replace function public.hit_flip_seven(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
	perform hit_flip_seven_v2(acting_player);
end $$;

create or replace function public.bank_flip_seven(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare score integer; next_player uuid; new_total integer;
begin
	perform 1 from game_state where id = 1 and status = 'playing' and current_player_id = acting_player for update;
	if not found then raise exception 'It is not your turn'; end if;
	if (select is_bust from game_players where id = acting_player) then
		raise exception 'A busted hand cannot be banked';
	end if;
	select coalesce(sum(card_value), 0) into score from game_cards where player_id = acting_player;
	update game_players
	set total_score = total_score + score, round_score = 0, is_bust = false
	where id = acting_player
	returning total_score into new_total;
	if new_total >= 200 then
		update game_state set status = 'finished', current_player_id = acting_player, updated_at = now() where id = 1;
		return;
	end if;
	select flip_seven_next_player(acting_player) into next_player;
	update game_state set current_player_id = next_player, updated_at = now() where id = 1;
	delete from game_cards where player_id = acting_player;
	update game_players set round_score = 0, is_bust = false where id = next_player;
end $$;

drop function if exists public.leave_flip_seven(uuid);
create or replace function public.leave_flip_seven(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
	active_player uuid;
	next_player uuid;
	player_count integer;
begin
	select current_player_id into active_player
	from game_state
	where id = 1
	for update;

	if not exists (select 1 from game_players where id = acting_player) then
		return;
	end if;

	select count(*) into player_count from game_players;
	if player_count <= 1 then
		delete from game_cards where player_id = acting_player;
		delete from game_players where id = acting_player;
		update game_state
		set status = 'lobby', current_player_id = null, deck = '{}', updated_at = now()
		where id = 1;
		return;
	end if;

	if active_player = acting_player then
		select flip_seven_next_player(acting_player) into next_player;
	end if;

	delete from game_cards where player_id = acting_player;
	delete from game_players where id = acting_player;

	if active_player = acting_player then
		update game_state
		set current_player_id = next_player, updated_at = now()
		where id = 1;
	end if;
end $$;

drop function if exists public.send_flip_seven_message(uuid, text);
create or replace function public.send_flip_seven_message(acting_player uuid, message_body text)
returns void language plpgsql security definer set search_path = public as $$
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

drop function if exists public.reset_flip_seven();
create or replace function public.reset_flip_seven(acting_player uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
	perform 1 from game_state where id = 1 for update;
	delete from game_cards where id is not null;
	delete from game_messages where id is not null;
	delete from game_players where id is not null;
	update game_state set status = 'lobby', current_player_id = null, deck = '{}', updated_at = now() where id = 1;
end $$;

revoke all on function public.flip_seven_next_player(uuid) from public;
grant execute on function public.start_flip_seven(uuid) to anon, authenticated;
grant execute on function public.hit_flip_seven_v2(uuid) to anon, authenticated;
grant execute on function public.hit_flip_seven(uuid) to anon, authenticated;
grant execute on function public.bank_flip_seven(uuid) to anon, authenticated;
grant execute on function public.leave_flip_seven(uuid) to anon, authenticated;
grant execute on function public.send_flip_seven_message(uuid, text) to anon, authenticated;
grant execute on function public.reset_flip_seven(uuid) to anon, authenticated;
grant select on public.game_state, public.game_players, public.game_cards, public.game_messages to anon, authenticated;
grant insert, delete on public.game_players to anon, authenticated;

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_state'
	) then
		alter publication supabase_realtime add table public.game_state;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_players'
	) then
		alter publication supabase_realtime add table public.game_players;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_cards'
	) then
		alter publication supabase_realtime add table public.game_cards;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_messages'
	) then
		alter publication supabase_realtime add table public.game_messages;
	end if;
end $$;

-- Make changed RPC signatures available to Supabase's REST API immediately.
notify pgrst, 'reload schema';
