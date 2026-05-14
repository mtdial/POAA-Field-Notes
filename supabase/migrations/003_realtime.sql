-- 003_realtime.sql
-- Enable Supabase Realtime on the three tables the frontend subscribes to.

alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.pulse_logs;
alter publication supabase_realtime add table public.comments;
