drop function if exists public.unlock_island(uuid, text);

create function public.unlock_island(p_user_id uuid, p_island_code text)
returns table (ok boolean, coins integer, already_unlocked boolean, island_code text)
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

revoke execute on function public.unlock_island(uuid, text) from public, anon, authenticated;
grant execute on function public.unlock_island(uuid, text) to service_role;
grant execute on function public.unlock_island(uuid, text) to supabase_admin;
