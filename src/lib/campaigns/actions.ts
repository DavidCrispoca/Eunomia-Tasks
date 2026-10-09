"use server";

import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readWorld, unlockIsland } from "./repo";
import type { UnlockOutcome, WorldView } from "./types";

async function readyUser() {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user || user.demo) return null;
  return user;
}

/** Carga el mundo de campañas del usuario conectado. */
export async function loadWorld(): Promise<WorldView | null> {
  const user = await readyUser();
  if (!user) return null;
  try {
    return await readWorld(user.id);
  } catch {
    return null;
  }
}

/**
 * Desbloquea una isla gastando monedas. El gasto, el desbloqueo y el logro
 * son atómicos e idempotentes en el servidor; el cliente solo indica la isla.
 */
export async function unlockIslandAction(
  islandCode: string,
): Promise<UnlockOutcome | null> {
  const user = await readyUser();
  if (!user || typeof islandCode !== "string" || islandCode.length === 0) {
    return null;
  }
  try {
    return await unlockIsland(user.id, islandCode);
  } catch {
    return null;
  }
}