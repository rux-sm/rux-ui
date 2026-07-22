-- Adds a 1-5 priority tier to drivers, used to rank who gets assigned first
-- within the same employment type (full-time drivers always sort above
-- part-time/contract/seasonal, then priority ascending within each group).
-- 1 is highest priority, 5 is lowest. Run once in the Supabase SQL editor.

alter table drivers add column if not exists priority smallint not null default 3;

alter table drivers add constraint drivers_priority_range check (priority between 1 and 5);
