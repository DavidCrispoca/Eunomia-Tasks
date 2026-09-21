-- Eunomia Tasks · Esquema de base de datos (Supabase Postgres)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Crea perfiles, tareas, bloques de tiempo, preferencias y notificaciones,
-- con RLS por usuario.

-- ─────────────────────────────────────────────────────────────
-- Extensiones
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Profiles (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text,
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now()
);

-- Auto-crear perfil al registrar un usuario (Supabase Auth trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Tasks
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid,
  title text not null,
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  completed_at timestamptz,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_due_date_idx on public.tasks (user_id, due_date)
  where due_date is not null;
create index if not exists tasks_status_idx on public.tasks (user_id, status);

-- ─────────────────────────────────────────────────────────────
-- Grupos / clases de tareas
-- ─────────────────────────────────────────────────────────────
create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_groups_user_id_idx on public.task_groups (user_id);

-- En tablas ya existentes, "create table if not exists" no añade columnas:
alter table public.tasks add column if not exists group_id uuid;

alter table public.tasks
  drop constraint if exists tasks_group_id_fk;
alter table public.tasks
  add constraint tasks_group_id_fk
  foreign key (group_id) references public.task_groups (id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- Time blocks (calendario / time-blocking)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null,
  date date not null,
  start time not null,
  "end" time not null,
  color text not null default 'default' check (color in ('default', 'green', 'orange', 'red', 'blue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_blocks_user_id_idx on public.time_blocks (user_id);
create index if not exists time_blocks_date_idx on public.time_blocks (user_id, date);

-- ─────────────────────────────────────────────────────────────
-- Preferencias de usuario (idioma, configuración)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'es' check (language in ('es', 'en')),
  updated_at timestamptz not null default now()
);

-- En bases ya existentes, retira la columna del briefing de WhatsApp
-- (ya no se usa; la app solo envía correos):
alter table public.user_prefs drop column if exists briefing_time;

-- ─────────────────────────────────────────────────────────────
-- Notificaciones (deduplicación correo)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid,
  channel text not null check (channel in ('email')),
  kind text not null check (kind in ('due_soon', 'due_week')),
  day date not null,
  sent_at timestamptz not null default now(),
  unique nulls not distinct (user_id, channel, kind, day)
);

-- Re-ejecutable en bases ya creadas: estrecha los checks a los valores del correo.
alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('due_soon', 'due_week'));
alter table public.notifications
  drop constraint if exists notifications_channel_check;
alter table public.notifications
  add constraint notifications_channel_check
  check (channel in ('email'));

create index if not exists notifications_user_idx on public.notifications (user_id, channel, kind, day);

-- En bases ya existentes, elimina la tabla de verificaciones de WhatsApp
-- (integración eliminada en 2026-09-20):
drop table if exists public.whatsapp_verifications;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: cada usuario solo ve/escribe sus filas
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.time_blocks enable row level security;
alter table public.user_prefs enable row level security;
alter table public.notifications enable row level security;

-- Profiles
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using ((select auth.uid()) = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using ((select auth.uid()) = id);

-- Tasks
drop policy if exists "select own tasks" on public.tasks;
create policy "select own tasks" on public.tasks
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own tasks" on public.tasks;
create policy "insert own tasks" on public.tasks
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own tasks" on public.tasks;
create policy "update own tasks" on public.tasks
  for update using ((select auth.uid()) = user_id);
drop policy if exists "delete own tasks" on public.tasks;
create policy "delete own tasks" on public.tasks
  for delete using ((select auth.uid()) = user_id);

-- Task groups
alter table public.task_groups enable row level security;
drop policy if exists "select own task groups" on public.task_groups;
create policy "select own task groups" on public.task_groups
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own task groups" on public.task_groups;
create policy "insert own task groups" on public.task_groups
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own task groups" on public.task_groups;
create policy "update own task groups" on public.task_groups
  for update using ((select auth.uid()) = user_id);
drop policy if exists "delete own task groups" on public.task_groups;
create policy "delete own task groups" on public.task_groups
  for delete using ((select auth.uid()) = user_id);

-- Time blocks
drop policy if exists "select own blocks" on public.time_blocks;
create policy "select own blocks" on public.time_blocks
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own blocks" on public.time_blocks;
create policy "insert own blocks" on public.time_blocks
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own blocks" on public.time_blocks;
create policy "update own blocks" on public.time_blocks
  for update using ((select auth.uid()) = user_id);
drop policy if exists "delete own blocks" on public.time_blocks;
create policy "delete own blocks" on public.time_blocks
  for delete using ((select auth.uid()) = user_id);

-- User prefs
drop policy if exists "select own prefs" on public.user_prefs;
create policy "select own prefs" on public.user_prefs
  for select using ((select auth.uid()) = user_id);
drop policy if exists "upsert own prefs" on public.user_prefs;
create policy "upsert own prefs" on public.user_prefs
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own prefs" on public.user_prefs;
create policy "update own prefs" on public.user_prefs
  for update using ((select auth.uid()) = user_id);

-- Notifications
drop policy if exists "select own notifications" on public.notifications;
create policy "select own notifications" on public.notifications
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own notifications" on public.notifications;
create policy "insert own notifications" on public.notifications
  for insert with check ((select auth.uid()) = user_id);

-- En bases ya existentes, retira la columna del perfil vinculada a WhatsApp
-- (la tabla whatsapp_verifications ya se eliminó arriba):
alter table public.profiles drop column if exists whatsapp_phone;