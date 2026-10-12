-- Eunomia Tasks · Migración: modos de actividad + tarjetas NFC (Fase 4)
-- Aplicar en: Supabase Dashboard → SQL Editor → New query → Run
-- (o vía MCP de Supabase con `apply_migration`).
--
-- Modelo:
--   activity_modes    · catálogo de modos (Enfoque, Trabajo, Estudio…). Lectura pública.
--   nfc_tags          · tarjetas físicas: token secreto → modo. SOLO service_role.
--   activity_sessions · sesiones por usuario (fuente nfc/manual/webnfc).
-- El servidor es autoritativo: las sesiones y la recompensa de enfoque se
-- deciden en Server Actions con `readyUser()`; el cliente nunca envía XP/saldo.
-- Idempotencia: índice único parcial → como máximo UNA sesión activa por usuario;
-- `ref_key` único por usuario para recompensas repetibles sin duplicar.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Catálogo de modos
-- ─────────────────────────────────────────────────────────────
create table if not exists public.activity_modes (
  code text primary key,
  name_es text not null,
  name_en text not null,
  emoji text not null default '',
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.activity_modes (code, name_es, name_en, emoji, sort) values
  ('focus',  'Enfoque',  'Focus',  '🎯', 1),
  ('work',   'Trabajo',  'Work',   '💼', 2),
  ('study',  'Estudio',  'Study',  '📚', 3),
  ('sleep',  'Sueño',    'Sleep',  '🌙', 4),
  ('break',  'Descanso', 'Break',  '☕', 5),
  ('review', 'Revisión', 'Review', '🧭', 6)
on conflict (code) do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  emoji   = excluded.emoji,
  sort    = excluded.sort;

-- ─────────────────────────────────────────────────────────────
-- Tarjetas NFC (token secreto → modo). Sin políticas: solo service_role.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  mode_code text not null references public.activity_modes (code) on delete restrict,
  label text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists nfc_tags_mode_idx on public.nfc_tags (mode_code);

-- ─────────────────────────────────────────────────────────────
-- Sesiones de actividad (una activa por usuario como máximo)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode_code text not null references public.activity_modes (code) on delete restrict,
  source text not null default 'manual' check (source in ('nfc', 'manual', 'webnfc')),
  ref_key text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes integer,
  created_at timestamptz not null default now(),
  unique (user_id, ref_key)
);

create index if not exists activity_sessions_user_idx
  on public.activity_sessions (user_id, started_at desc);

-- Como máximo una sesión abierta por usuario (evita el doble-tap de la tarjeta).
create unique index if not exists activity_sessions_one_active_idx
  on public.activity_sessions (user_id)
  where ended_at is null;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.activity_modes enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.activity_sessions enable row level security;

-- Catálogo de modos: lectura para cualquier sesión (autenticada o demo).
drop policy if exists "read activity modes" on public.activity_modes;
create policy "read activity modes" on public.activity_modes
  for select using (true);

-- nfc_tags: sin políticas → nadie fuera de service_role puede leer los tokens.

-- activity_sessions: cada usuario ve y gestiona las suyas.
drop policy if exists "select own activity sessions" on public.activity_sessions;
create policy "select own activity sessions" on public.activity_sessions
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own activity sessions" on public.activity_sessions;
create policy "insert own activity sessions" on public.activity_sessions
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own activity sessions" on public.activity_sessions;
create policy "update own activity sessions" on public.activity_sessions
  for update using ((select auth.uid()) = user_id);
