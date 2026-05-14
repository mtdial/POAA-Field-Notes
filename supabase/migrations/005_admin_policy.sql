-- 005_admin_policy.sql
-- Allows the admin to update any profile row (needed for the Admin user management UI).
-- Run this in the Supabase SQL editor after 002_rls.sql.

create policy "admin can update any profile"
  on public.profiles for update
  using (public.is_admin());
