"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  FOCUS_MAX_MINUTES,
  FOCUS_MIN_VALID_MINUTES,
  type AwardResult,
  type GamificationSnapshot,
} from "@/lib/gamification/rules";
import {
  awardForKind,
  countFocusSessionsToday,
  focusDailyCap,
  getSnapshot,
  taskOwnedByUser,
} from "@/lib/gamification/repo";

async function readyUser() {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user || user.demo) return null;
  return user;
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
    return await awardForKind(user.id, "task_completed", taskId);
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

/** Premia la revisión semanal (una por semana ISO). */
export async function awardWeeklyReview(
  weekIso: string,
): Promise<AwardResult | null> {
  const user = await readyUser();
  if (!user || typeof weekIso !== "string" || weekIso.length === 0) return null;
  try {
    return await awardForKind(user.id, "weekly_review", weekIso);
  } catch {
    return null;
  }
}
