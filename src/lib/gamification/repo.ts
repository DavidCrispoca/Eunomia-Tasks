import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EMPTY_SNAPSHOT,
  FOCUS_DAILY_CAP,
  REWARD,
  levelForXp,
  type AchievementView,
  type AwardResult,
  type GamificationEventView,
  type GamificationSnapshot,
  type RewardKind,
} from "@/lib/gamification/rules";

function db(): SupabaseClient | null {
  return supabaseAdmin();
}

interface State {
  xp: number;
  level: number;
  coins: number;
}

interface AchievementRow {
  code: string;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
  xp_reward: number;
  coin_reward: number;
  sort: number;
}

interface EventRow {
  id: string;
  kind: string;
  ref_id: string;
  xp_delta: number;
  coin_delta: number;
  created_at: string;
}

async function readState(client: SupabaseClient, userId: string): Promise<State> {
  const res = await client
    .from("user_gamification")
    .select("xp, level, coins")
    .eq("user_id", userId)
    .maybeSingle();
  const row = res.data as { xp: number; level: number; coins: number } | null;
  if (!row) return { xp: 0, level: 1, coins: 0 };
  return {
    xp: Number(row.xp ?? 0),
    level: Number(row.level ?? 1),
    coins: Number(row.coins ?? 0),
  };
}

async function readCatalog(client: SupabaseClient): Promise<AchievementRow[]> {
  const res = await client
    .from("achievements")
    .select("*")
    .order("sort", { ascending: true });
  return (res.data ?? []) as unknown as AchievementRow[];
}

async function readUnlocked(
  client: SupabaseClient,
  userId: string,
): Promise<Map<string, string>> {
  const res = await client
    .from("user_achievements")
    .select("achievement_code, unlocked_at")
    .eq("user_id", userId);
  const map = new Map<string, string>();
  for (const row of (res.data ?? []) as unknown as {
    achievement_code: string;
    unlocked_at: string;
  }[]) {
    map.set(row.achievement_code, row.unlocked_at);
  }
  return map;
}

function toView(
  row: AchievementRow,
  unlockedAt?: string,
): AchievementView {
  return {
    code: row.code,
    nameEs: row.name_es,
    nameEn: row.name_en,
    descriptionEs: row.description_es,
    descriptionEn: row.description_en,
    xpReward: row.xp_reward,
    coinReward: row.coin_reward,
    unlocked: Boolean(unlockedAt),
    unlockedAt,
  };
}

/** Estado completo de gamificación del usuario (nube). */
export async function getSnapshot(
  userId: string,
): Promise<GamificationSnapshot | null> {
  const client = db();
  if (!client) return null;

  const [state, catalog, unlocked, eventsRes] = await Promise.all([
    readState(client, userId),
    readCatalog(client),
    readUnlocked(client, userId),
    client
      .from("gamification_events")
      .select("id, kind, ref_id, xp_delta, coin_delta, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events: GamificationEventView[] = (
    (eventsRes.data ?? []) as unknown as EventRow[]
  ).map((e) => ({
    id: e.id,
    kind: e.kind,
    refId: e.ref_id,
    xpDelta: e.xp_delta,
    coinDelta: e.coin_delta,
    createdAt: e.created_at,
  }));

  return {
    ...state,
    events,
    achievements: catalog.map((row) => toView(row, unlocked.get(row.code))),
    serverBacked: true,
  };
}

interface GrantOutcome {
  awarded: boolean;
  state: State;
  levelUp: boolean;
}

/** Otorga una recompensa concreta vía RPC idempotente. */
async function grant(
  client: SupabaseClient,
  userId: string,
  kind: string,
  refId: string,
  xp: number,
  coins: number,
  meta: Record<string, unknown>,
): Promise<GrantOutcome> {
  const before = await readState(client, userId);
  const res = await client.rpc("grant_reward", {
    p_user_id: userId,
    p_kind: kind,
    p_ref_id: refId,
    p_xp: Math.max(0, Math.round(xp)),
    p_coins: Math.max(0, Math.round(coins)),
    p_meta: meta,
  });
  if (res.error || !res.data) {
    return { awarded: false, state: before, levelUp: false };
  }
  const row = (Array.isArray(res.data) ? res.data[0] : res.data) as
    | { xp: number; level: number; coins: number; awarded: boolean }
    | undefined;
  if (!row) return { awarded: false, state: before, levelUp: false };
  const state: State = {
    xp: Number(row.xp ?? before.xp),
    level: Number(row.level ?? before.level),
    coins: Number(row.coins ?? before.coins),
  };
  const awarded = Boolean(row.awarded);
  return {
    awarded,
    state,
    levelUp: awarded && state.level > levelForXp(before.xp),
  };
}

export async function countEvents(
  userId: string,
  kind: string,
): Promise<number> {
  const client = db();
  if (!client) return 0;
  const res = await client
    .from("gamification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind);
  return res.count ?? 0;
}

/** ¿La tarea pertenece al usuario? Evita premiar recursos ajenos. */
export async function taskOwnedByUser(
  userId: string,
  taskId: string,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(res.data);
}

/** Sesiones de enfoque ya premiadas hoy (UTC), para el tope diario. */
export async function countFocusSessionsToday(userId: string): Promise<number> {
  const client = db();
  if (!client) return 0;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const res = await client
    .from("gamification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "focus_session")
    .gte("created_at", start.toISOString());
  return res.count ?? 0;
}

export function focusDailyCap(): number {
  return FOCUS_DAILY_CAP;
}

/**
 * Otorga una recompensa por `kind` y, después, evalúa logros.
 * Devuelve el resultado con saldo final (incluye recompensas de logros).
 */
export async function awardForKind(
  userId: string,
  kind: Exclude<RewardKind, "achievement">,
  refId: string,
  meta: Record<string, unknown> = {},
): Promise<AwardResult> {
  const client = db();
  if (!client) {
    return {
      awarded: false,
      xp: EMPTY_SNAPSHOT.xp,
      level: EMPTY_SNAPSHOT.level,
      coins: EMPTY_SNAPSHOT.coins,
      xpDelta: 0,
      coinDelta: 0,
      levelUp: false,
      unlocked: [],
      event: null,
    };
  }

  const reward = REWARD[kind];
  const outcome = await grant(
    client,
    userId,
    kind,
    refId,
    reward.xp,
    reward.coins,
    meta,
  );

  const unlocked = await evaluateAchievements(client, userId);

  // El saldo pudo cambiar por los logros recién ganados.
  const finalState =
    unlocked.length > 0 ? await readState(client, userId) : outcome.state;

  const event: GamificationEventView | null = outcome.awarded
    ? {
        id: `${kind}:${refId}`,
        kind,
        refId,
        xpDelta: reward.xp,
        coinDelta: reward.coins,
        createdAt: new Date().toISOString(),
      }
    : null;

  return {
    awarded: outcome.awarded,
    xp: finalState.xp,
    level: finalState.level,
    coins: finalState.coins,
    xpDelta: outcome.awarded ? reward.xp : 0,
    coinDelta: outcome.awarded ? reward.coins : 0,
    levelUp: outcome.levelUp,
    unlocked,
    event,
  };
}

/**
 * Evalúa los logros alcanzables con el historial actual y otorga los nuevos.
 * `island_1` se reserva para la Fase 3 (islas desbloqueables).
 */
async function evaluateAchievements(
  client: SupabaseClient,
  userId: string,
): Promise<AchievementView[]> {
  const [catalog, unlocked, taskCompleted, focusSessions, reviews] =
    await Promise.all([
      readCatalog(client),
      readUnlocked(client, userId),
      countEvents(userId, "task_completed"),
      countEvents(userId, "focus_session"),
      countEvents(userId, "weekly_review"),
    ]);

  const met = new Set<string>();
  if (taskCompleted >= 1) met.add("first_task");
  if (focusSessions >= 10) met.add("focus_10");
  if (reviews >= 1) met.add("week_review_1");

  const newlyUnlocked: AchievementView[] = [];
  for (const row of catalog) {
    if (!met.has(row.code) || unlocked.has(row.code)) continue;
    const outcome = await grant(
      client,
      userId,
      "achievement",
      row.code,
      row.xp_reward,
      row.coin_reward,
      {},
    );
    if (outcome.awarded) {
      newlyUnlocked.push(toView(row, new Date().toISOString()));
    }
  }
  return newlyUnlocked;
}
