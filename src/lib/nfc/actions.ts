"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { awardFocusForUser } from "@/lib/gamification/repo";
import type { AwardResult } from "@/lib/gamification/rules";
import {
  closeSession,
  assignSessionGroup as persistSessionGroup,
  openSession,
  readActiveSession,
  readModes,
  readRecentSessions,
  readGroupSessionMinutes,
  resolveTag,
} from "./repo";
import { activityLimitMinutes } from "./types";
import {
  NFC_MODES,
  type ActivityModeView,
  type NfcSessionSource,
  type NfcSessionView,
  type ToggleResult,
} from "./types";

async function readyUser() {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user || user.demo) return null;
  return user;
}

/** Catálogo de modos (BD si está disponible; catálogo por defecto si no). */
export async function loadModes(): Promise<ActivityModeView[]> {
  try {
    return await readModes();
  } catch {
    return NFC_MODES;
  }
}

/** Sesión de actividad abierta del usuario, si la hay. */
export async function loadActiveSession(): Promise<NfcSessionView | null> {
  const user = await readyUser();
  if (!user) return null;
  try {
    return await readActiveSession(user.id);
  } catch {
    return null;
  }
}

/** Últimas sesiones cerradas (resumen de tiempo registrado por modo). */
export async function loadRecentSessions(
  limit = 8,
): Promise<NfcSessionView[]> {
  const user = await readyUser();
  if (!user) return [];
  try {
    return await readRecentSessions(user.id, limit);
  } catch {
    return [];
  }
}

export async function loadGroupSessionMinutes(): Promise<Record<string, number>> {
  const user = await readyUser();
  if (!user) return {};
  try { return await readGroupSessionMinutes(user.id); } catch { return {}; }
}

export async function assignActiveSessionGroup(groupId: string | null): Promise<boolean> {
  const user = await readyUser();
  if (!user || (groupId !== null && (typeof groupId !== "string" || groupId.length > 100))) return false;
  try {
    const active = await readActiveSession(user.id);
    if (!active || !["focus", "study"].includes(active.modeCode)) return false;
    return await persistSessionGroup(user.id, active.id, groupId);
  } catch { return false; }
}

/** Confirma una sesión que superó su tope, usando una duración validada por el servidor. */
export async function verifyOverlongSession(
  sessionId: string,
  minutes: number,
): Promise<{ ok: true; session: NfcSessionView; minutes: number; award: AwardResult | null } | { ok: false }> {
  const user = await readyUser();
  if (!user || typeof sessionId !== "string" || !Number.isInteger(minutes)) return { ok: false };
  try {
    const active = await readActiveSession(user.id);
    if (!active || active.id !== sessionId) return { ok: false };
    const maxMinutes = activityLimitMinutes(active.modeCode);
    const elapsedMilliseconds = Date.now() - new Date(active.startedAt).getTime();
    if (elapsedMilliseconds <= maxMinutes * 60_000 || minutes < 1 || minutes > maxMinutes) return { ok: false };
    const closed = await closeSession(user.id, active.id, minutes);
    if (!closed) return { ok: false };
    const award = active.modeCode === "focus"
      ? await awardFocusForUser(user.id, `nfc:${closed.session.id}`, closed.minutes)
      : null;
    return { ok: true, ...closed, award };
  } catch {
    return { ok: false };
  }
}

/**
 * Activa o desactiva un modo (toggle). Fuente: tarjeta (`token`), selector
 * (`modeCode`) o lector Web NFC. Cambiar de modo cierra la sesión anterior si
 * no excedió su límite; las sesiones excedidas requieren verificación manual.
 * Al cerrar un modo `focus` válido se premia con `awardFocusForUser` (servidor).
 */
export async function toggleMode(input: {
  token?: string;
  modeCode?: string;
  source?: NfcSessionSource;
}): Promise<ToggleResult | null> {
  const user = await readyUser();
  if (!user) return { ok: false, reason: "not-ready" };

  const hasToken = typeof input?.token === "string" && input.token.length > 0;
  const hasCode = typeof input?.modeCode === "string" && input.modeCode.length > 0;
  if (!hasToken && !hasCode) return { ok: false, reason: "mode-not-found" };
  const source: NfcSessionSource = input.source ?? "manual";

  try {
    let modeCode: string | null = null;
    if (hasToken) {
      const tag = await resolveTag(input.token!);
      if (!tag || !tag.active) return { ok: false, reason: "invalid-token" };
      modeCode = tag.modeCode;
    } else {
      modeCode = input.modeCode!;
    }

    const modes = await readModes();
    const mode = modes.find((m) => m.code === modeCode);
    if (!mode) return { ok: false, reason: "mode-not-found" };

    const active = await readActiveSession(user.id);

    if (active) {
      const maxMinutes = activityLimitMinutes(active.modeCode);
      const elapsedMilliseconds = Date.now() - new Date(active.startedAt).getTime();
      if (elapsedMilliseconds > maxMinutes * 60_000) {
        const activeMode = modes.find((item) => item.code === active.modeCode);
        if (!activeMode) return { ok: false, reason: "mode-not-found" };
        return { ok: true, action: "verification-required", mode: activeMode, session: active, maxMinutes };
      }
    }

    // Tocar el mismo modo lo cierra.
    if (active && active.modeCode === mode.code) {
      const closed = await closeSession(user.id, active.id);
      if (!closed) return { ok: false, reason: "unknown" };
      const award =
        mode.code === "focus"
          ? await awardFocusForUser(
              user.id,
              `nfc:${closed.session.id}`,
              closed.minutes,
            )
          : null;
      return {
        ok: true,
        action: "ended",
        mode,
        session: closed.session,
        minutes: closed.minutes,
        award,
      };
    }

    // Cambiar de modo: cierra la anterior (premiando si era enfoque) y abre la nueva.
    let award: AwardResult | null = null;
    if (active) {
      const closed = await closeSession(user.id, active.id);
      if (closed && active.modeCode === "focus") {
        award = await awardFocusForUser(
          user.id,
          `nfc:${closed.session.id}`,
          closed.minutes,
        );
      }
    }
    const opened = await openSession(user.id, mode.code, source);
    if (!opened) return { ok: false, reason: "unknown" };
    return { ok: true, action: "started", mode, session: opened, award };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}
