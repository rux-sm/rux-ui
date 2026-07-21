-- Adds "client" to the contacts roster (supabase/contacts-patch.sql) — the
-- business/school/organization this contact represents, as opposed to
-- trips.customer (which org a given trip is booked for). Related but
-- distinct: a contact's client is a property of the person for roster
-- display/search and autofill; trips.customer stays the authoritative
-- per-trip record and isn't touched by this patch. Run this in the
-- Supabase SQL editor after contacts-patch.sql.

alter table public.contacts
  add column if not exists client text;

create index if not exists contacts_client_idx on public.contacts (client);
