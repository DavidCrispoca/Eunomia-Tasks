-- Eunomia Tasks · Gamificación base (Fase 2)
-- XP acumulado + nivel (derivado), Euno Coins gastables, logros e historial
-- de eventos idempotente. Recompensas calculadas y otorgadas en servidor.
-- Aditiva: no modifica tablas existentes.

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(1, (floor(sqrt(greatest(coalesce(p_xp, 0), 0) / 100.0)))::int + 1);
$$;

-- ─────────────────────────────────────────────────────────────
-- Estado de gamificación por usuario
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_gamification (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

-- Historial de eventos recompensables (clave idempotente).
create table if not exists public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  ref_id text not null,
  xp_delta integer not null default 0,
  coin_delta integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

create index if not exists gamification_events_user_idx
  on public.gamification_events (user_id, created_at desc);
create index if not exists gamification_events_kind_idx
  on public.gamification_events (user_id, kind);

-- Catálogo de logros (referencia global de solo lectura).
create table if not exists public.achievements (
  code text primary key,
  name_es text not null,
  name_en text not null,
  description_es text not null default '',
  description_en text not null default '',
  xp_reward integer not null default 0,
  coin_reward integer not null default 0,
  sort integer not null default 0
);

-- Logros desbloqueados por usuario.
create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null references public.achievements (code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

-- Backfill: garantiza fila base para todos los perfiles existentes.
insert into public.user_gamification (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Alta automática para nuevos perfiles.
create or replace function public.handle_new_profile_gamification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_gamification (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_gamification on public.profiles;
create trigger on_profile_created_gamification
  after insert on public.profiles
  for each row execute function public.handle_new_profile_gamification();

-- ─────────────────────────────────────────────────────────────
-- RPC: otorgar recompensa (idempotente y atómica)
-- Inserta el evento una sola vez (unique) y, si es nuevo, acredita
-- XP + monedas recalculando el nivel. Devuelve el estado resultante.
-- ─────────────────────────────────────────────────────────────
create or replace function public.grant_reward(
  p_user_id uuid,
  p_kind text,
  p_ref_id text,
  p_xp integer,
  p_coins integer,
  p_meta jsonb default '{}'::jsonb
)
returns table (xp integer, level integer, coins integer, awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer := greatest(coalesce(p_xp, 0), 0);
  v_coins integer := greatest(coalesce(p_coins, 0), 0);
  v_awarded boolean := false;
begin
  if p_user_id is null or p_kind is null or p_ref_id is null then
    return query select g.xp, g.level, g.coins, false
      from public.user_gamification g where g.user_id = p_user_id;
    return;
  end if;

  insert into public.gamification_events (user_id, kind, ref_id, xp_delta, coin_delta, meta)
  values (p_user_id, p_kind, p_ref_id, v_xp, v_coins, coalesce(p_meta, '{}'::jsonb))
  on conflict (user_id, kind, ref_id) do nothing;
  v_awarded := found;

  if v_awarded then
    insert into public.user_gamification (user_id, xp, level, coins)
    values (p_user_id, v_xp, public.level_for_xp(v_xp), v_coins)
    on conflict (user_id) do update
      set xp = public.user_gamification.xp + v_xp,
          coins = public.user_gamification.coins + v_coins,
          level = public.level_for_xp(public.user_gamification.xp + v_xp),
          updated_at = now();
  end if;

  return query
    select g.xp, g.level, g.coins, v_awarded
    from public.user_gamification g
    where g.user_id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: gastar monedas (atómico; no deja saldo negativo)
-- ─────────────────────────────────────────────────────────────
create or replace function public.spend_coins(p_user_id uuid, p_amount integer)
returns table (ok boolean, coins integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coins integer;
begin
  if p_user_id is null or p_amount is null or p_amount < 0 then
    return query select false, coalesce(
      (select coins from public.user_gamification where user_id = p_user_id), 0);
    return;
  end if;

  update public.user_gamification
    set coins = coins - p_amount, updated_at = now()
    where user_id = p_user_id and coins >= p_amount
    returning coins into v_coins;

  if v_coins is null then
    return query select false, coalesce(
      (select coins from public.user_gamification where user_id = p_user_id), 0);
  else
    return query select true, v_coins;
  end if;
end;
$$;

-- Solo el servidor (service role) debe invocar estos RPC.
revoke all on function public.grant_reward(uuid, text, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.spend_coins(uuid, integer) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.user_gamification enable row level security;
alter table public.gamification_events enable row level security;
alter table public.user_achievements enable row level security;
alter table public.achievements enable row level security;

drop policy if exists "select own gamification" on public.user_gamification;
create policy "select own gamification" on public.user_gamification
  for select using ((select auth.uid()) = user_id);

drop policy if exists "select own gamification events" on public.gamification_events;
create policy "select own gamification events" on public.gamification_events
  for select using ((select auth.uid()) = user_id);

drop policy if exists "select own user achievements" on public.user_achievements;
create policy "select own user achievements" on public.user_achievements
  for select using ((select auth.uid()) = user_id);

drop policy if exists "read achievements catalog" on public.achievements;
create policy "read achievements catalog" on public.achievements
  for select using (true);

-- ─────────────────────────────────────────────────────────────
-- Semilla del catálogo de logros (idempotente)
-- ─────────────────────────────────────────────────────────────
insert into public.achievements (code, name_es, name_en, description_es, description_en, xp_reward, coin_reward, sort)
values
  ('first_task',    'Primer paso',        'First step',        'Completa tu primera tarea.',                  'Complete your first task.',                 10, 0, 1),
  ('focus_10',      'Foco constante',     'Steady focus',      'Registra 10 sesiones de enfoque válidas.',    'Record 10 valid focus sessions.',           30, 5, 2),
  ('week_review_1', 'Brújula semanal',    'Weekly compass',    'Realiza tu primera revisión semanal.',        'Finish your first weekly review.',          15, 0, 3),
  ('island_1',      'Cartógrafo',         'Cartographer',      'Desbloquea tu primera isla.',                 'Unlock your first island.',                 50, 0, 4)
on conflict (code) do update
  set name_es = excluded.name_es,
      name_en = excluded.name_en,
      description_es = excluded.description_es,
      description_en = excluded.description_en,
      xp_reward = excluded.xp_reward,
      coin_reward = excluded.coin_reward,
      sort = excluded.sort;
