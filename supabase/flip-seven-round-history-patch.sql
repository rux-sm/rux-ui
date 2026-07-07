-- Track each player's past round results (score, or bust) so the scoreboard
-- can render a per-round history like "10  X  34  67  X". Run once in the
-- Supabase SQL editor after flip-seven.sql.

alter table public.game_players
	add column if not exists round_history jsonb not null default '[]'::jsonb;

comment on column public.game_players.round_history is
	'Chronological array of past rounds for this player, oldest first. '
	'Each entry is {"score": integer, "bust": boolean} — score is the amount '
	'actually credited to total_score for that round (0 when bust is true).';

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
		update game_players
		set is_bust = true,
			round_score = 0,
			round_history = round_history || jsonb_build_object('score', 0, 'bust', true)
		where id = acting_player;
		select flip_seven_next_player(acting_player) into next_player;
		update game_state set current_player_id = next_player, updated_at = now() where id = 1;
		return;
	end if;
	select count(distinct card_value), coalesce(sum(card_value), 0) into unique_count, score
	from game_cards where player_id = acting_player;
	update game_players set round_score = score, is_bust = false where id = acting_player;
	if unique_count = 7 then
		update game_players
		set total_score = total_score + score + 15,
			round_score = 0,
			round_history = round_history || jsonb_build_object('score', score + 15, 'bust', false)
		where id = acting_player
		returning total_score into new_total;
		delete from game_cards where id is not null;
		-- Everyone else's round ends here too, without banking — log it as a
		-- 0/no-bust entry (distinct from an actual bust) for every other player.
		update game_players
		set round_score = 0,
			is_bust = false,
			round_history = case
				when id = acting_player then round_history
				else round_history || jsonb_build_object('score', 0, 'bust', false)
			end
		where id is not null;
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
	set total_score = total_score + score,
		round_score = 0,
		is_bust = false,
		round_history = round_history || jsonb_build_object('score', score, 'bust', false)
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
	update game_players set total_score = 0, round_score = 0, is_bust = false, round_history = '[]'::jsonb where id is not null;
	update game_state set status = 'playing', current_player_id = host_player, deck = new_deck, updated_at = now() where id = 1;
end $$;

grant execute on function public.hit_flip_seven_v2(uuid) to anon, authenticated;
grant execute on function public.hit_flip_seven(uuid) to anon, authenticated;
grant execute on function public.bank_flip_seven(uuid) to anon, authenticated;
grant execute on function public.start_flip_seven(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
