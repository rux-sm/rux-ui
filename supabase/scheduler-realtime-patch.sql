-- Adds the tables the scheduler's Realtime channel (index.html's
-- initTripsRealtimeSync) now listens on, alongside the trips/trip_stops
-- pair that was already enabled. Without this, postgres_changes events for
-- these tables never reach the client no matter what the JS subscribes to —
-- Supabase only broadcasts changes for tables in the supabase_realtime
-- publication. Run this in the Supabase SQL editor.
--
-- Covers: bus/driver reassignment (trip_assignments), document uploads
-- (trip_documents), payments, the passenger roster, and ticket options —
-- all of which fetchTrips() (trip-db.js) already pulls in on every load, but
-- previously only updated for the user who made the change; everyone else
-- waited for the 30s poll fallback.

do $$
begin
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_assignments'
	) then
		alter publication supabase_realtime add table public.trip_assignments;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_documents'
	) then
		alter publication supabase_realtime add table public.trip_documents;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_payments'
	) then
		alter publication supabase_realtime add table public.trip_payments;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_passengers'
	) then
		alter publication supabase_realtime add table public.trip_passengers;
	end if;
	if not exists (
		select 1 from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_ticket_options'
	) then
		alter publication supabase_realtime add table public.trip_ticket_options;
	end if;
end $$;
