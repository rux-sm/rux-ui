-- Deploy leave-during-game support without rerunning the full Flip 7 schema.
drop function if exists public.leave_flip_seven(uuid);

create or replace function public.leave_flip_seven(acting_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.leave_flip_seven(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
