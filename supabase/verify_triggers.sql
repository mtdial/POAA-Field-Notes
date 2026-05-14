-- verify_triggers.sql
-- Run this in Supabase Dashboard -> SQL Editor to confirm the edit_log
-- triggers are wired up and writing correctly.
--
-- The script does NOT modify any production data. It creates a temporary
-- test entry, edits it, checks the log, then deletes it.


-- 1. Confirm triggers exist on the right tables.
select tgname as trigger_name, relname as table_name
from pg_trigger
join pg_class on pg_trigger.tgrelid = pg_class.oid
where tgname in ('entries_edit_log', 'pulse_logs_edit_log', 'comments_edit_log')
order by relname;
-- Expected: three rows -- one per table.


-- 2. Insert a temporary test entry.
--    Replace '00000000-0000-0000-0000-000000000000' with any real profile UUID
--    (run SELECT id FROM profiles LIMIT 1 if you need one).
do $$
declare
  test_id uuid;
  profile_uuid uuid;
begin
  select id into profile_uuid from public.profiles limit 1;

  insert into public.entries
    (category, title, context, priority, status, occurred_on, contributor_id, last_edited_by)
  values
    ('issue', '__trigger_test__', 'Automated trigger verification', 'low', 'open', current_date, profile_uuid, profile_uuid)
  returning id into test_id;

  -- 3. Edit two fields.
  update public.entries
  set priority = 'high', status = 'in_progress', last_edited_by = profile_uuid
  where id = test_id;

  -- 4. Check the edit_log.
  raise notice 'edit_log rows for test entry %:', test_id;
  for r in
    select field_name, old_value, new_value
    from public.edit_log
    where parent_type = 'entry' and parent_id = test_id
    order by edited_at
  loop
    raise notice '  % : % -> %', r.field_name, r.old_value, r.new_value;
  end loop;

  -- 5. Clean up.
  delete from public.edit_log where parent_type = 'entry' and parent_id = test_id;
  delete from public.entries where id = test_id;

  raise notice 'Trigger verification complete. Check the NOTICE lines above.';
  raise notice 'Expected: two log rows -- priority (low -> high) and status (open -> in_progress).';
end;
$$;


-- 6. Sanity check: edit_log table should have no rows from the test.
select count(*) as leftover_rows
from public.edit_log
where new_value = '__trigger_test__';
-- Expected: 0
