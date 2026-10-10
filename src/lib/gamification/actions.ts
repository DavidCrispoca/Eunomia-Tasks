"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isoWeekKey } from "@/lib/week";
import {
  FOCUS_MAX_MINUTES,
  FOCUS_MIN_VALID_MINUTES,
  type AchievementView,
  type AwardResult,
  type GamificationSnapshot,
} from "@/lib/gamification/rules";
import {
  awardForKind,
  countFocusSessionsToday,
  focusDailyCap,
  getSnapshot,
  taskIsMilestone,
  taskOwnedByUser,
} from "@/lib/gamification/repo";

async function readyUser() {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user || user.demo) return null;
  return user;
}

/** Combina dos premios consecutivos (tarea + hito) en un único resultado. */
function mergeAwards(base: AwardResult, extra: AwardResult): AwardResult {
  const unlockedByCode = new Map<string, AchievementView>();
  for (const achievement of [...base.unlocked, ...extra.unlocked]) {
    unlockedByCode.set(achievement.code, achievement);
  }
  return {
    awarded: base.awarded || extra.awarded,
    xp: extra.xp,
    level: extra.level,
    coins: extra.coins,
    xpDelta: base.xpDelta + extra.xpDelta,
    coinDelta: base.coinDelta + extra.coinDelta,
    levelUp: base.levelUp || extra.levelUp,
    unlocked: [...unlockedByCode.values()],
    event: extra.event ?? base.event,
  };
}

/** Carga el estado de gamificación del usuario conectado. */
export async function loadGamification(): Promise<GamificationSnapshot | null> {
  const user = await readyUser();
  if (!user) return null;
  try {
    return await getSnapshot(user.id);
  } catch {
    return null;
  }
}

/** Premia completar una tarea. Idempotente por id de tarea. */
export async function awardTaskCompleted(
  taskId: string,
): Promise<AwardResult | null> {
  const user = await readyUser();
  if (!user || typeof taskId !== "string" || taskId.length === 0) return null;
  try {
    if (!(await taskOwnedByUser(user.id, taskId))) return null;
    const base = await awardForKind(user.id, "task_completed", taskId);
    // Los hitos se deciden en el servidor: si la tarea lo es, se otorga su
    // recompensa adicional (idempotente vía `ref_id = {taskId}:milestone`).
    if (!(await taskIsMilestone(user.id, taskId))) return base;
    const milestone = await awardForKind(
      user.id,
      "milestone",
      `${taskId}:milestone`,
    );
    return mergeAwards(base, milestone);
  } catch {
    return null;
  }
}

/**
 * Premia una sesión de enfoque válida. Idempotente por `${taskId}:${startedAt}`.
 * El cliente solo aporta la clave del evento; el servidor decide la recompensa.
 */
export async function awardFocusSession(input: {
  taskId: string;
  refId: string;
  minutes: number;
}): Promise<AwardResult | null> {
  const user = await readyUser();
  if (!user) return null;
  if (typeof input?.taskId !== "string" || input.taskId.length === 0) return null;
  if (typeof input?.refId !== "string" || input.refId.length === 0) return null;
  const minutes = Number(input?.minutes);
  if (!Number.isFinite(minutes) || minutes < FOCUS_MIN_VALID_MINUTES) return null;
  try {
    if (!(await taskOwnedByUser(user.id, input.taskId))) return null;
    if ((await countFocusSessionsToday(user.id)) >= focusDailyCap()) return null;
    return await awardForKind(user.id, "focus_session", input.refId, {
      minutes: Math.min(Math.round(minutes), FOCUS_MAX_MINUTES),
    });
  } catch {
    return null;
  }
}

/**
 * Premia la revisión semanal de la semana en curso. Idempotente por semana
 * ISO (`unique(user_id, kind, ref_id)`); el servidor decide la semana y el
 * cliente no puede premiar semanas pasadas ni futuras.
 */
export async function awardWeeklyReview(): Promise<AwardResult | null> {
  const user = await readyUser();
  if (!user) return null;
  try {
    return await awardForKind(user.id, "weekly_review", isoWeekKey(new Date()));
  } catch {
    return null;
  }
}
