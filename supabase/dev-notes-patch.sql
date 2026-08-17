-- Dev Notes: a running bug/to-do list for the Rux UI design system's own
-- development, surfaced via the header popover (dev-notes-btn / #dev-notes-menu).
-- Single shared table, no per-profile read state — every dispatcher who
-- opens the admin app sees and can manage the same list, same model as
-- team_messages rather than notifications' dual-table (per-user read) shape.
--
-- Review before running. This file is not applied automatically.

create table if not exists public.dev_notes (
	id uuid primary key default gen_random_uuid(),
	text text not null,
	done boolean not null default false,
	created_at timestamptz not null default now(),
	done_at timestamptz
);

create index if not exists dev_notes_done_idx on public.dev_notes (done, created_at);

alter table public.dev_notes enable row level security;

create policy "dev_notes are public"
	on public.dev_notes for select
	using (true);

create policy "manage dev_notes"
	on public.dev_notes for all
	using (true)
	with check (true);

-- Optional: enables live cross-tab updates (subscribeToNotes in
-- js/data/dev-notes-db.js). Skip if you don't need multiple open tabs/
-- browsers to see new notes without a manual refresh.
do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'dev_notes'
	) then
		alter publication supabase_realtime add table public.dev_notes;
	end if;
end $$;
