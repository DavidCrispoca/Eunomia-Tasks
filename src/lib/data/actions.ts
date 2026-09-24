"use server";

import { after } from "next/server";
import type { Language, Task, TaskGroup, TimeBlock } from "@/types";
import type { CloudData } from "@/lib/data/mappers";
import { getSessionUser } from "@/lib/auth/cookies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ensureSeedForUser,
  getDatasetForUser,
  replaceAllForUser,
  saveLanguage,
} from "@/lib/data/repo";
import { syncUserCalendar } from "@/lib/google/sync";

function readyUser() {
  if (!isSupabaseConfigured()) return null;
  return getSessionUser();
}

/** Carga (y siembra la primera vez) los datos del usuario conectado. */
export async function loadCloudData(): Promise<CloudData | null> {
  const user = await readyUser();
  if (!user || user.demo) return null;
  return ensureSeedForUser(user.id);
}

/** Persiste el dataset completo del usuario (reemplazo transaccional). */
export async function persistCloudData(
  tasks: Task[],
  blocks: TimeBlock[],
  groups: TaskGroup[],
): Promise<boolean> {
  const user = await readyUser();
  if (!user || user.demo) return false;
  const ok = await replaceAllForUser(user.id, tasks, blocks, groups);
  if (ok) {
    // Empuja los bloques a Google Calendar sin bloquear la respuesta;
    // el motor decide solo (hash) si hace falta llamar a la API.
    after(async () => {
      try {
        await syncUserCalendar(user.id);
      } catch (error) {
        console.error("[Eunomia] Sync a Google Calendar falló:", error);
      }
    });
  }
  return ok;
}

/** Lee el dataset actual del usuario desde la nube (para sincr. entre dispositivos). */
export async function pullCloudData(): Promise<CloudData | null> {
  const user = await readyUser();
  if (!user || user.demo) return null;
  return getDatasetForUser(user.id);
}

/** Persiste el idioma del usuario en la nube. */
export async function saveUserLanguage(language: Language): Promise<void> {
  const user = await readyUser();
  if (!user || user.demo) return;
  await saveLanguage(user.id, language);
}