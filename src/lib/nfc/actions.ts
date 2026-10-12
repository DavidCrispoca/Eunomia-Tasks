"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { awardFocusForUser } from "@/lib/gamification/repo";
import type { AwardResult } from "@/lib/gamification/rules";
import {
  closeSession,
  openSession,
  readActiveSession,
  readModes,
  readRecentSessions,
  resolveTag,
} from "./repo";
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

/**
 * Activa o desactiva un modo (toggle). Fuente: tarjeta (`token`), selector
 * (`modeCode`) o lector Web NFC. Cambiar de modo cierra la sesión anterior. Al
 * cerrar un modo `focus` válido se premia con `awardFocusForUser` (servidor).
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
