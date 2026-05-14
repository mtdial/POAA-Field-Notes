-- 002_rls.sql
-- Row Level Security policies.
-- Wiki-style: any authenticated user can read and edit anything.
-- Deletes and user management are admin-only.

alter table public.profiles  enable row level security;
alter table public.entries   enable row level security;
alter table public.pulse_logs enable row level security;
alter table public.comments  enable row level security;
alter table public.edit_log  enable row level security;

-- Helper: returns true if the caller has a profiles row (i.e. is one of the 5 known users).
create or replace function public.is_app_user()
returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

-- profiles
create policy "app users can read profiles"
  on public.profiles for select
  using (public.is_app_user());

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admin can insert profiles"
  on public.profiles for insert
  with check (public.is_admin());

create policy "admin can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- entries
create policy "app users can read entries"
  on public.entries for select
  using (public.is_app_user());

create policy "app users can insert entries"
  on public.entries for insert
  with check (public.is_app_user());

create policy "app users can update entries"
  on public.entries for update
  using (public.is_app_user());

create policy "admin can delete entries"
  on public.entries for delete
  using (public.is_admin());

-- pulse_logs
create policy "app users can read pulse_logs"
  on public.pulse_logs for select
  using (public.is_app_user());

create policy "app users can insert pulse_logs"
  on public.pulse_logs for insert
  with check (public.is_app_user());

create policy "app users can update pulse_logs"
  on public.pulse_logs for update
  using (public.is_app_user());

create policy "admin can delete pulse_logs"
  on public.pulse_logs for delete
  using (public.is_admin());

-- comments
create policy "app users can read comments"
  on public.comments for select
  using (public.is_app_user());

create policy "app users can insert comments"
  on public.comments for insert
  with check (public.is_app_user());

create policy "authors can update own comments"
  on public.comments for update
  using (auth.uid() = author_id);

create policy "admin can delete comments"
  on public.comments for delete
  using (public.is_admin());

-- edit_log (read-only from client; inserts via trigger only)
create policy "app users can read edit_log"
  on public.edit_log for select
  using (public.is_app_user());

-- Username lookup function (callable by unauthenticated users so the login form
-- can resolve username -> email before calling signInWithPassword).
create or replace function public.get_email_for_username(p_username text)
returns text language sql security definer as $$
  select email from public.profiles where username = lower(p_username) limit 1;
$$;

grant execute on function public.get_email_for_username to anon;
