-- ════════════════════════════════════════════════════════════════
-- FASE 3 · Mundo de campañas: islas desbloqueables y gasto de monedas
-- ════════════════════════════════════════════════════════════════

-- Catálogo de islas (público, legible por el cliente)
create table if not exists public.islands (
  code                   text primary key,
  name_es                text not null,
  name_en                text not null,
  biome                  text not null,
  cost_coins             integer not null default 0 check (cost_coins >= 0),
  requires_island_code   text references public.islands (code) on delete restrict,
  sort                   integer not null default 0,
  active                 boolean not null default true,
  created_at             timestamptz not null default now()
);

-- Desbloqueos por usuario (persistencia)
create table if not exists public.campaign_unlocks (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  island_code   text not null references public.islands (code) on delete cascade,
  unlocked_at   timestamptz not null default now(),
  primary key (user_id, island_code)
);

comment on table public.islands is 'Islas del mundo de campañas (catálogo público).';
comment on table public.campaign_unlocks is 'Islas desbloqueadas por usuario.';

-- RLS
alter table public.islands enable row level security;
alter table public.campaign_unlocks enable row level security;

drop policy if exists islands_catalog_read on public.islands;
create policy islands_catalog_read on public.islands
  for select to authenticated using (true);

drop policy if exists unlocks_select_own on public.campaign_unlocks;
create policy unlocks_select_own on public.campaign_unlocks
  for select to authenticated using (auth.uid() = user_id);

grant select on public.islands to authenticated;
grant select on public.campaign_unlocks to authenticated;

-- Seed del mundo (Fase 3: costa abierta + bosque bloqueado)
insert into public.islands (code, name_es, name_en, biome, cost_coins, requires_island_code, sort, active)
values
  ('coast',  'Costa Serena',       'Serene Coast',       'coast',  0,   null,  1, true),
  ('forest', 'Bosque de Enfoque',  'Focus Forest',       'forest', 120, 'coast', 2, true)
on conflict (code) do nothing;

-- ── RPC: desbloqueo atómico e idempotente ────────────────────────
create or replace function public.unlock_island(p_user_id uuid, p_island_code text)
returns table (ok boolean, coins integer, already_unlocked boolean, code text)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_island public.islands%rowtype;
  v_coins integer;
begin
  if p_user_id is null or p_island_code is null then
    return query select false, 0, false, null::text;
    return;
  end if;

  -- ¿Existe la isla y está activa?
  select * into v_island from public.islands
    where code = p_island_code and active;
  if not found then
    return query select false, coalesce(
      (select coins from public.user_gamification where user_id = p_user_id), 0),
      false, p_island_code;
    return;
  end if;

  -- Ya desbloqueada: idempotente, no cobra ni premia de nuevo
  if exists (select 1 from public.campaign_unlocks
             where user_id = p_user_id and island_code = v_island.code) then
    return query select false, coalesce(
      (select coins from public.user_gamification where user_id = p_user_id), 0),
      true, v_island.code;
    return;
  end if;

  -- Prerrequisito no satisfecho
  if v_island.requires_island_code is not null
     and not exists (select 1 from public.campaign_unlocks
                     where user_id = p_user_id
                       and island_code = v_island.requires_island_code) then
    return query select false, coalesce(
      (select coins from public.user_gamification where user_id = p_user_id), 0),
      false, v_island.code;
    return;
  end if;

  -- Gasto atómico si tiene coste de monedas
  if v_island.cost_coins > 0 then
    update public.user_gamification
      set coins = coins - v_island.cost_coins, updated_at = now()
      where user_id = p_user_id and coins >= v_island.cost_coins
      returning coins into v_coins;
    if v_coins is null then
      return query select false, coalesce(
        (select coins from public.user_gamification where user_id = p_user_id), 0),
        false, v_island.code;
      return;
    end if;
  else
    select coalesce(coins, 0) into v_coins
      from public.user_gamification where user_id = p_user_id;
  end if;

  -- Registrar el desbloqueo
  insert into public.campaign_unlocks (user_id, island_code)
  values (p_user_id, v_island.code)
  on conflict (user_id, island_code) do nothing;

  -- Logro de la primera isla (+50 XP, sin monedas)
  perform public.grant_reward(
    p_user_id, 'achievement', 'island_1', 50, 0,
    jsonb_build_object('island', v_island.code));
  insert into public.user_achievements (user_id, achievement_code)
  values (p_user_id, 'island_1')
  on conflict (user_id, achievement_code) do nothing;

  return query select true, v_coins, false, v_island.code;
end;
$function$;

-- Handlers solo vía service role (mismo patrón que grant_reward/spend_coins)
revoke execute on function public.unlock_island(uuid, text) from public, anon, authenticated;
grant execute on function public.unlock_island(uuid, text) to service_role;
grant execute on function public.unlock_island(uuid, text) to supabase_admin;

-- ── Nueva isla inicial en el trigger + backfill de perfiles actuales ──
create or replace function public.handle_new_profile_gamification()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.user_gamification (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.campaign_unlocks (user_id, island_code)
  values (new.id, 'coast')
  on conflict (user_id, island_code) do nothing;
  return new;
end;
$function$;

insert into public.campaign_unlocks (user_id, island_code)
select id, 'coast' from public.profiles
on conflict (user_id, island_code) do nothing;
