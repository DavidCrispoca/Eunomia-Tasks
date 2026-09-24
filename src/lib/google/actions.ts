"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isGoogleConfigured } from "@/lib/google/config";
import {
  deleteConnection,
  getConnection,
  setConnectionPaused,
} from "@/lib/google/repo";
import { syncUserCalendar, type GoogleSyncResult } from "@/lib/google/sync";

export interface GoogleConnectionState {
  configured: boolean;
  connected: boolean;
  email?: string;
  paused: boolean;
  lastSyncAt: string | null;
}

/** Estado de la conexión para pintar el panel de la UI (null ⇒ ocultar). */
export async function loadGoogleConnectionState(): Promise<GoogleConnectionState | null> {
  const user = await getSessionUser();
  if (!user || user.demo || !isGoogleConfigured()) return null;
  const connection = await getConnection(user.id);
  return {
    configured: true,
    connected: Boolean(connection),
    email: connection?.google_account_email,
    paused: connection?.paused ?? false,
    lastSyncAt: connection?.last_sync_at ?? null,
  };
}

export async function pauseGoogleSync(paused: boolean): Promise<boolean> {
  const user = await getSessionUser();
  if (!user || user.demo) return false;
  const connection = await getConnection(user.id);
  if (!connection) return false;
  return setConnectionPaused(user.id, paused);
}

/**
 * Desconecta: borra conexión y mapeos locales. Los eventos ya creados
 * en Google NO se eliminan (dejan de mantenerse, pero siguen ahí).
 */
export async function disconnectGoogle(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user || user.demo) return false;
  const connection = await getConnection(user.id);
  if (!connection) return true;
  return deleteConnection(user.id);
}

/** Sync manual ("Reintentar"): fuerza el diff aunque el hash no cambie. */
export async function syncGoogleNow(): Promise<GoogleSyncResult> {
  const user = await getSessionUser();
  if (!user || user.demo) {
    return {
      status: "skipped",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      reason: "no_user",
    };
  }
  return syncUserCalendar(user.id, { force: true });
}
