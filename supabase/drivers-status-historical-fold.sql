-- ===========================================================================
-- DRIVERS.STATUS — FOLD `inactive_historical` INTO `inactive`
-- ---------------------------------------------------------------------------
-- Settles step 2 of docs/driver-roster-plan.md: the status vocabulary becomes
-- two values, `active` and `inactive`. Decided by the owner 2026-08-26.
--
-- Audited 2026-08-26 against the live project, reading counts only:
--
--   40   driver records
--   25   status = 'active'
--    9   status = 'inactive'
--    6   status = 'inactive_historical'   ← the rows this patch changes
--
-- WHAT THE SIX ARE. Measured, not assumed — every one of them carries a name
-- and a driver_ref and nothing else:
--
--                       rows  short_name  hire_date  notes  license_exp  med_card
--   active                25          25         21     11           23        23
--   inactive               9           9          5      8            5         5
--   inactive_historical    6           0          0      0            0         0
--
-- They are legacy-import stubs, not offboarded employees. They exist so that
-- 15 rows in trip_drivers keep a driver to point at. That is also why this is
-- a status change and never a deletion — see the plan's Blast radius.
--
-- WHY THIS IS SAFE ON THE READ SIDE. `inactive_historical` appears nowhere in
-- js/, tests/, or index.html — it is a value only the database has ever known.
-- The sole reader of drivers.status outside driver-panel.js is
-- notification-db.js:96, which gates on `status === "active"`; these six are
-- non-active before and after. driver-panel.js's filter compares for equality
-- against 'active' / 'on-leave' / 'inactive', so today the six match no option
-- but "All" and render as the word "Inactive" — defect B2. After this patch
-- the word and the value agree.
--
-- Nothing in the application can recreate the value: no code path writes it.
-- The fold is therefore stable without a constraint.
--
-- WHAT IT COSTS. The only marker separating "import stub" from "person we
-- employed and offboarded" is this status value. After the fold that
-- distinction survives only as an absence — no short_name, no hire_date, no
-- notes — which is a pattern, not a fact, and a later edit could erase it.
-- Section 1's backup is what makes it properly recoverable; if the
-- distinction turns out to be worth keeping, modelling it belongs with the
-- driver editor rebuild (plan step 7), not with a status string.
--
-- REVIEW BEFORE RUNNING. **This overwrites data.** Sections 0–4 are the
-- change; run them in order and stop at the preview in section 2. Section 5
-- closes the rollback window and is meant to be run days later, deliberately.
--
-- Rollback is at the bottom of this file.
-- ===========================================================================


-- ── 0. Preflight ───────────────────────────────────────────────────────────
-- Expect 25 / 9 / 6. A different distribution means the audit is stale — read
-- the rows before continuing rather than assuming the difference is harmless.
select status, count(*) as rows
from public.drivers
group by status
order by count(*) desc;

-- Is `status` constrained? This patch assumes a plain text/varchar column. If
-- either query returns a row, read it before section 3: a CHECK constraint is
-- fine (the target value is already in use), but an **enum type** means the
-- label `inactive_historical` survives the update as a now-unused member, and
-- retiring it is a separate DDL step this patch does not attempt.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.drivers'::regclass
  and pg_get_constraintdef(oid) ilike '%status%';

select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_attribute a on a.atttypid = t.oid
where a.attrelid = 'public.drivers'::regclass
  and a.attname  = 'status'
order by e.enumsortorder;


-- ── 1. Backup ──────────────────────────────────────────────────────────────
-- Into `private`, NOT `public` — same reasoning as the notes patch: PostgREST
-- only exposes the schemas it is configured for, so a table here is
-- unreachable over the REST API. Nothing here is an identity secret, but the
-- habit is the point, and this table is the only record of which six rows
-- were folded.
create schema if not exists private;

revoke all on schema private from anon, authenticated;

drop table if exists private.drivers_status_backup_20260826;

create table private.drivers_status_backup_20260826 as
select id, name, status, now() as backed_up_at
from public.drivers;

revoke all on private.drivers_status_backup_20260826 from anon, authenticated;

-- Confirm the backup took before going further. Expect 40.
select count(*) as rows_backed_up from private.drivers_status_backup_20260826;


-- ── 2. Preview — STOP HERE AND READ ────────────────────────────────────────
-- Every row section 3 will touch, with the evidence for what it is. Check
-- that all six read as stubs: no short name, no hire date, no notes. A row
-- that carries any of them is a real offboarded employee that happens to hold
-- this status, and it deserves a look before it is folded in with the rest.
select
	id,
	name,
	short_name,
	hire_date,
	(notes is not null and btrim(notes) <> '') as has_notes,
	(select count(*) from public.trip_drivers td where td.driver_id = d.id)
		as assignments
from public.drivers d
where status = 'inactive_historical'
order by name;


-- ── 3. The change ──────────────────────────────────────────────────────────
update public.drivers
set status = 'inactive'
where status = 'inactive_historical';


-- ── 4. Verify ──────────────────────────────────────────────────────────────
-- Expect exactly two rows: active 25, inactive 15. No third value.
select status, count(*) as rows
from public.drivers
group by status
order by count(*) desc;

-- Must return 0.
select count(*) as historical_remaining
from public.drivers
where status = 'inactive_historical';

-- Assignments must be untouched: 629 total, none orphaned.
select
	(select count(*) from public.trip_drivers) as assignment_rows,
	(select count(*) from public.trip_drivers td
	 left join public.drivers d on d.id = td.driver_id
	 where d.id is null)                       as orphaned;


-- ── 5. Close the rollback window — RUN LATER, ON PURPOSE ───────────────────
-- Once the roster reads correctly and you are satisfied — a few days is
-- reasonable — run this. After it, which six rows were folded is no longer
-- recorded anywhere and section 3 is irreversible.
--
--   drop table if exists private.drivers_status_backup_20260826;


-- ── 6. Deliberately not done ───────────────────────────────────────────────
--
-- 6a. No CHECK constraint pinning status to ('active','inactive').
--     Same gate as the notes patch's 6a: driver-panel.js:1219-1221 catches a
--     save error into console.error and nothing else, so a rejected save
--     looks exactly like a successful one (plan defect S7). Add the
--     constraint after the editor has a visible error path — plan step 7 —
--     not before. Nothing writes the folded value today, so the vocabulary
--     holds without it.
--
-- 6b. The dead 'on-leave' filter option is not touched here.
--     driver-panel.js offers "On leave" and no record has ever held that
--     status. It is app code, not data, and it retires with the filter rail
--     in the rebuild. Left open in the plan.
--
-- 6c. No column recording that the six are import stubs.
--     That is the modelling question plan step 7 opens, alongside what notes
--     is carrying. Inventing a column here would prejudge it.


-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Valid only until section 5 drops the backup table.
--
--   update public.drivers d
--   set status = b.status
--   from private.drivers_status_backup_20260826 b
--   where b.id = d.id
--     and d.status is distinct from b.status;
--
-- Restores every status to its state at backup time. The `is distinct from`
-- guard means it touches only rows that actually changed, so a row edited
-- through the app in the meantime is left alone rather than silently reverted.
-- ===========================================================================
