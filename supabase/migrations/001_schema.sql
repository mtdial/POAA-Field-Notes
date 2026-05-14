-- 001_schema.sql
-- Run this first in the Supabase SQL editor.
-- Creates all five application tables.

-- profiles (extends auth.users 1:1, pre-seeded with users)
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text unique not null,
  username       text unique not null,
  display_name   text not null,
  initials       text not null,
  is_admin       boolean not null default false,
  last_active_at timestamptz,
  created_at     timestamptz not null default now()
);

-- entries (main capture table)
create table public.entries (
  id             uuid primary key default gen_random_uuid(),
  category       text not null check (category in ('issue','tech','data','process','win','open_question')),
  title          text not null,
  context        text,
  priority       text not null default 'medium' check (priority in ('high','medium','low','investigate')),
  status         text not null default 'open' check (status in ('open','in_progress','resolved','wont_do','parked')),
  next_step      text,
  tags           text[] not null default array[]::text[],
  contributor_id uuid not null references public.profiles(id),
  last_edited_by uuid references public.profiles(id),
  occurred_on    date not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- pulse_logs (weekly check-ins)
create table public.pulse_logs (
  id              uuid primary key default gen_random_uuid(),
  week_start      date not null,
  this_week       text not null,
  watch_next_week text,
  contributor_id  uuid not null references public.profiles(id),
  last_edited_by  uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- comments (flat, polymorphic)
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('entry','pulse_log')),
  parent_id   uuid not null,
  body        text not null,
  author_id   uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_parent_idx on public.comments (parent_type, parent_id);

-- edit_log (wiki-style history, populated by triggers only)
create table public.edit_log (
  id          uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('entry','pulse_log','comment')),
  parent_id   uuid not null,
  editor_id   uuid not null references public.profiles(id),
  field_name  text not null,
  old_value   text,
  new_value   text,
  edited_at   timestamptz not null default now()
);

create index edit_log_parent_idx on public.edit_log (parent_type, parent_id);
