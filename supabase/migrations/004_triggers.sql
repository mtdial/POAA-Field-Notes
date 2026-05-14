-- 004_triggers.sql
-- Postgres triggers that write to edit_log on update.
-- Covers entries, pulse_logs, and comments.
--
-- Uses row_to_json(OLD/NEW) for field extraction -- reliable across all
-- Postgres versions and composite types. Safe to re-run (drops triggers first).

-- Drop existing triggers so this file can be re-run after updates.
drop trigger if exists entries_edit_log   on public.entries;
drop trigger if exists pulse_logs_edit_log on public.pulse_logs;
drop trigger if exists comments_edit_log  on public.comments;


-- entries: track the eight user-visible fields
create or replace function public.log_entry_edits()
returns trigger language plpgsql security definer as $$
declare
  tracked_fields text[] := array[
    'category','title','context','priority','status','next_step','tags','occurred_on'
  ];
  f        text;
  old_val  text;
  new_val  text;
  old_json jsonb;
  new_json jsonb;
begin
  old_json := row_to_json(OLD)::jsonb;
  new_json := row_to_json(NEW)::jsonb;

  foreach f in array tracked_fields loop
    old_val := old_json->>f;
    new_val := new_json->>f;
    if old_val is distinct from new_val then
      insert into public.edit_log
        (parent_type, parent_id, editor_id, field_name, old_value, new_value)
      values
        ('entry', NEW.id, NEW.last_edited_by, f, old_val, new_val);
    end if;
  end loop;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger entries_edit_log
  before update on public.entries
  for each row execute function public.log_entry_edits();


-- pulse_logs: track the three content fields
create or replace function public.log_pulse_log_edits()
returns trigger language plpgsql security definer as $$
declare
  tracked_fields text[] := array['week_start','this_week','watch_next_week'];
  f        text;
  old_val  text;
  new_val  text;
  old_json jsonb;
  new_json jsonb;
begin
  old_json := row_to_json(OLD)::jsonb;
  new_json := row_to_json(NEW)::jsonb;

  foreach f in array tracked_fields loop
    old_val := old_json->>f;
    new_val := new_json->>f;
    if old_val is distinct from new_val then
      insert into public.edit_log
        (parent_type, parent_id, editor_id, field_name, old_value, new_value)
      values
        ('pulse_log', NEW.id, NEW.last_edited_by, f, old_val, new_val);
    end if;
  end loop;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger pulse_logs_edit_log
  before update on public.pulse_logs
  for each row execute function public.log_pulse_log_edits();


-- comments: single body field
create or replace function public.log_comment_edits()
returns trigger language plpgsql security definer as $$
begin
  if OLD.body is distinct from NEW.body then
    insert into public.edit_log
      (parent_type, parent_id, editor_id, field_name, old_value, new_value)
    values
      ('comment', NEW.id, NEW.author_id, 'body', OLD.body, NEW.body);
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger comments_edit_log
  before update on public.comments
  for each row execute function public.log_comment_edits();
