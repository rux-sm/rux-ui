-- Allow any device to recover an abandoned game by resetting it to the lobby.
drop function if exists public.reset_flip_seven(uuid);

create or replace function public.reset_flip_seven(acting_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	perform 1 from game_state where id = 1 for update;

	delete from game_cards where id is not null;
	delete from game_players where id is not null;

	update game_state
	set status = 'lobby',
		current_player_id = null,
		deck = '{}',
		updated_at = now()
	where id = 1;
end $$;

grant execute on function public.reset_flip_seven(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
