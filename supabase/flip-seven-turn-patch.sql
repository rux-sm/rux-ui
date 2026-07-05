-- Versioned Hit endpoint: rotates turns and retains busted hands for inspection.
drop function if exists public.hit_flip_seven_v2(uuid);
create or replace function public.hit_flip_seven_v2(acting_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	drawn integer;
	remaining integer[];
	duplicate boolean;
	unique_count integer;
	score integer;
	next_player uuid;
	was_bust boolean;
	new_total integer;
	new_deck integer[];
begin
	select deck[1], deck[2:] into drawn, remaining
	from game_state
	where id = 1
		and status = 'playing'
		and current_player_id = acting_player
	for update;

	if not found then
		raise exception 'It is not your turn';
	end if;

	select is_bust into was_bust
	from game_players
	where id = acting_player;

	if was_bust then
		delete from game_cards where player_id = acting_player;
		update game_players
		set is_bust = false, round_score = 0
		where id = acting_player;
	end if;

	if drawn is null then
		select array_agg(value order by random()) into remaining
		from (
			select value
			from generate_series(0, 12) value
			cross join lateral generate_series(1, greatest(value, 1))
		) cards;
		drawn := remaining[1];
		remaining := remaining[2:];
	end if;

	select exists (
		select 1
		from game_cards
		where player_id = acting_player and card_value = drawn
	) into duplicate;

	update game_state
	set deck = coalesce(remaining, '{}'), updated_at = now()
	where id = 1;

	insert into game_cards (player_id, card_value)
	values (acting_player, drawn);

	select flip_seven_next_player(acting_player) into next_player;

	if duplicate then
		update game_players
		set is_bust = true, round_score = 0
		where id = acting_player;

		update game_state
		set current_player_id = next_player, updated_at = now()
		where id = 1;
		return;
	end if;

	select count(distinct card_value), coalesce(sum(card_value), 0)
	into unique_count, score
	from game_cards
	where player_id = acting_player;

	update game_players
	set round_score = score, is_bust = false
	where id = acting_player;

	if unique_count = 7 then
		update game_players
		set total_score = total_score + score + 15,
			round_score = 0
		where id = acting_player
		returning total_score into new_total;

		delete from game_cards where id is not null;
		update game_players
		set round_score = 0, is_bust = false
		where id is not null;

		if new_total >= 200 then
			update game_state
			set status = 'finished',
				current_player_id = acting_player,
				updated_at = now()
			where id = 1;
		else
			select array_agg(value order by random()) into new_deck
			from (
				select value
				from generate_series(0, 12) value
				cross join lateral generate_series(1, greatest(value, 1))
			) cards;

			update game_state
			set status = 'playing',
				current_player_id = next_player,
				deck = new_deck,
				updated_at = now()
			where id = 1;
		end if;
		return;
	end if;

	update game_state
	set current_player_id = next_player, updated_at = now()
	where id = 1;

end $$;

-- Keep cached/older browser clients on the corrected behavior too.
create or replace function public.hit_flip_seven(acting_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	perform hit_flip_seven_v2(acting_player);
end $$;

grant execute on function public.hit_flip_seven_v2(uuid) to anon, authenticated;
grant execute on function public.hit_flip_seven(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
