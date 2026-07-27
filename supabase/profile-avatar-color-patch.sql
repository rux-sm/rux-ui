-- Lets a profile without an uploaded photo pick a background color for its
-- initials avatar instead of always defaulting to plain gray. Run once in
-- the Supabase SQL editor (after profiles-patch.sql).

alter table public.profiles add column if not exists avatar_color text;
