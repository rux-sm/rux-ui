-- Optional direct conversation URL used by dispatch shortcuts, such as a
-- driver's Google Messages web conversation. Kept provider-neutral so the
-- profile can support another texting surface later.

alter table public.drivers add column if not exists texting_url text;
