-- ===========================================================================
-- DRIVERS.NOTES — REMOVE GOVERNMENT ID NUMBERS
-- ---------------------------------------------------------------------------
-- Strips nine-digit government identifiers out of public.drivers.notes.
--
-- Audited 2026-08-26 against the live project, reading counts only:
--
--   40   driver records, 28 columns
--    8   rows whose notes contain a nine-digit ID pattern
--    8   of those also carry date_of_birth AND address AND phone
--    8   of those are status = 'active' — current employees
--
-- That combination is a complete identity package, and this app talks to
-- Supabase as `anon` with the key in page source (js/data/supabase.js), so
-- every one of those columns is readable by anyone who can load the site.
-- The worker origin in front of the REST URL is not a boundary: the anon JWT
-- decodes to the project ref, so the direct endpoint is derivable from it.
--
-- This implements CLAUDE.md § Data and Risk, decided 2026-08-21: identity
-- secrets stay in the payroll/HR system that already holds them. Nothing in
-- js/ reads these numbers — they are inert text in a free-text column.
--
-- REVIEW BEFORE RUNNING. **This deletes data.** Sections 1–4 are the change;
-- run them in order and stop at the preview in section 2 to read what will
-- happen before section 3 does it. Section 5 closes the rollback window and
-- is meant to be run days later, deliberately. Section 6 is optional and is
-- deliberately left commented — read its note.
--
-- Rollback is at the bottom of this file.
-- ===========================================================================

-- ── Why a strip and not a column drop ──────────────────────────────────────
--
-- notes is carrying three unrelated things: these ID numbers, termination
-- records (a dated termination note), and legacy-import provenance. Dropping
-- the column destroys the latter two, which are wanted; modelling them properly
-- is app work and belongs with the driver editor rebuild. This patch removes
-- only the class of content that must not be here at all, and leaves the
-- structural fix to that work.
--
-- The surrounding text is preserved: "Country of birth: USA 123-45-6789"
-- becomes "Country of birth: USA". Whether country of birth should be here
-- either is a separate question — section 6.


-- ── 0. Preflight ───────────────────────────────────────────────────────────
-- Expect 8. If this returns a different number the audit is stale; read the
-- rows before continuing rather than assuming the difference is harmless.
select count(*) as rows_to_change
from public.drivers
where notes ~ '\m\d{3}[- ]?\d{2}[- ]?\d{4}\M';


-- ── 1. Backup ──────────────────────────────────────────────────────────────
-- Into `private`, NOT `public`. PostgREST only exposes the schemas it is
-- configured for (public, graphql_public), so a table here is unreachable
-- over the REST API — which matters, because this backup contains exactly
-- the data the patch exists to remove. A backup in public would reproduce
-- the leak under a new name.
create schema if not exists private;

revoke all on schema private from anon, authenticated;

drop table if exists private.drivers_notes_backup_20260826;

create table private.drivers_notes_backup_20260826 as
select id, name, notes, now() as backed_up_at
from public.drivers
where notes is not null;

revoke all on private.drivers_notes_backup_20260826 from anon, authenticated;

-- Confirm the backup took before going further.
select count(*) as rows_backed_up from private.drivers_notes_backup_20260826;


-- ── 2. Preview — STOP HERE AND READ ────────────────────────────────────────
-- Shows the exact before/after for every row section 3 will touch. The
-- "before" column displays the numbers on your screen; that is your own data
-- in your own SQL editor, but do not paste this output anywhere.
--
-- Check two things: that `after` reads the way you want, and that no row
-- appears whose number is something other than an identity secret.
select
	id,
	name,
	notes as before,
	nullif(
		btrim(regexp_replace(notes, '\s*\m\d{3}[- ]?\d{2}[- ]?\d{4}\M', '', 'g')),
		''
	) as after
from public.drivers
where notes ~ '\m\d{3}[- ]?\d{2}[- ]?\d{4}\M'
order by name;

-- Why this pattern and not a looser one: \m and \M anchor to word edges, so a
-- ten-digit run cannot be partly consumed. Checked against inputs
-- shaped like this table's own content before writing: "555-012-3456",
-- "5550123456", "+52 1 800 555 0000", "Left 1/2/2026" and "7/22 removed,
-- performance" all match nothing. license_number is a separate column and is
-- untouched. (Examples here are synthetic — this file is in a public repo.)
--
-- What it CANNOT tell apart, and why section 2 is not optional: any bare
-- nine-digit number reads the same to a regex. "License 012345678 on file"
-- would become "License on file". Nothing in the eight audited rows looks
-- like that, but the preview is what proves it for the rows you actually
-- have — read every `before` value before running section 3.


-- ── 3. The change ──────────────────────────────────────────────────────────
update public.drivers
set notes = nullif(
		btrim(regexp_replace(notes, '\s*\m\d{3}[- ]?\d{2}[- ]?\d{4}\M', '', 'g')),
		''
	)
where notes ~ '\m\d{3}[- ]?\d{2}[- ]?\d{4}\M';


-- ── 4. Verify ──────────────────────────────────────────────────────────────
-- Both must return 0.
select
	count(*) filter (where notes ~ '\m\d{3}[- ]?\d{2}[- ]?\d{4}\M') as ids_remaining,
	count(*) filter (where notes ~ '\d{9}')                        as any_nine_digit_run
from public.drivers;


-- ── 5. Close the rollback window — RUN LATER, ON PURPOSE ───────────────────
-- The backup still holds the numbers. It is out of the API's reach, but "out
-- of reach" is not "gone", and the point of this patch is that they are not
-- in this database. Once you are satisfied with the result — a few days is
-- reasonable — run this. After it, section 3 is irreversible.
--
--   drop table if exists private.drivers_notes_backup_20260826;


-- ── 6. Optional — things this patch deliberately does not do ───────────────
--
-- 6a. A CHECK constraint rejecting nine-digit runs in notes.
--     This is the only mechanical backstop available while the app has no
--     authentication, and it would have caught the original entry. It is
--     commented out because of how it fails today: driver-panel.js:1219-1221
--     catches a save error and calls console.error and nothing else — no
--     toast, no message, dialog stays open. A rejected save would look to
--     the user like a save that worked. Enable it *after* the editor has a
--     visible error path, not before.
--
--       alter table public.drivers
--         add constraint drivers_notes_no_id_numbers
--         check (notes !~ '\m\d{3}[- ]?\d{2}[- ]?\d{4}\M');
--
-- 6b. Removing country of birth.
--     National origin is a protected class and the roster has no operational
--     use for it — nothing in js/ reads it. It is left in place because it is
--     not an identity secret and removing it was not what was approved. If
--     you want it gone, run this after section 4:
--
--       update public.drivers
--       set notes = nullif(btrim(regexp_replace(
--             notes, '(?i)\s*Country of birth:\s*[A-Za-z ]*', '', 'g')), '')
--       where notes ~* 'Country of birth:';
--
-- 6c. date_of_birth and address.
--     Eight rows carry both, they are readable by anon for the same reason,
--     and no code path in js/ dispatches on either. They are PII rather than
--     identity secrets, so they are a scope decision rather than an incident,
--     and they belong with the driver editor rebuild.


-- ===========================================================================
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Valid only until section 5 drops the backup table.
--
--   update public.drivers d
--   set notes = b.notes
--   from private.drivers_notes_backup_20260826 b
--   where b.id = d.id;
--
-- Restores every notes value to its state at backup time, including rows this
-- patch did not touch — which is what you want if anything else edited notes
-- in between, and worth knowing if something did.
-- ===========================================================================
