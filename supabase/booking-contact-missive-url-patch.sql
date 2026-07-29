-- Direct Missive conversation URL for the booking contact on a trip.
-- Run this in the Supabase SQL editor before saving booking contact details.

alter table public.trips
  add column if not exists booking_contact_missive_url text;
