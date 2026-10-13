import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  NFC_MODES,
  type ActivityModeView,
  type NfcSessionSource,
  type NfcSessionView,
} from "./types";

function db(): SupabaseClient | null {
  return supabaseAdmin();
}

interface ModeRow {
  code: string;
  name_es: string;
  name_en: string;
  emoji: string;
  sort: number;
}

interface SessionRow {
  id: string;
  mode_code: string;
  source: string;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  group_id?: string | null;
}

function toMode(row: ModeRow): ActivityModeView {
  return {
    code: row.code,
    nameEs: row.name_es,
    nameEn: row.name_en,
    emoji: row.emoji ?? "",
    sort: Number(row.sort ?? 0),
  };
}

function toSession(row: SessionRow): NfcSessionView {
  return {
    id: row.id,
    modeCode: row.mode_code,
    source: (row.source as NfcSessionSource) ?? "manual",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    minutes: row.minutes === null ? null : Number(row.minutes),
    groupId: row.group_id ?? null,
  };
}

/**
 * Catálogo de modos desde la BD. Si la migración aún no está aplicada devuelve
 * el catálogo por defecto para no romper la UI.
 */
export async function readModes(): Promise<ActivityModeView[]> {
  const client = db();
  if (!client) return NFC_MODES;
  const res = await client
    .from("activity_modes")
    .select("code, name_es, name_en, emoji, sort")
    .order("sort", { ascending: true });
  if (res.error || !res.data || res.data.length === 0) return NFC_MODES;
  return (res.data as ModeRow[]).map(toMode);
}

/** Resuelve el token de una tarjeta a su modo. `null` si no existe o está inactiva. */
export async function resolveTag(
  token: string,
): Promise<{ modeCode: string; active: boolean } | null> {
  const client = db();
  if (!client) return null;
  const res = await client
    .from("nfc_tags")
    .select("mode_code, active")
    .eq("token", token)
    .maybeSingle();
  if (res.error || !res.data) return null;
  const row = res.data as { mode_code: string; active: boolean };
  return { modeCode: row.mode_code, active: Boolean(row.active) };
}

/** Sesión abierta del usuario (0 o 1 por índice único parcial). */
export async function readActiveSession(
  userId: string,
): Promise<NfcSessionView | null> {
  const client = db();
  if (!client) return null;
  const res = await client
    .from("activity_sessions")
    .select("id, mode_code, source, started_at, ended_at, minutes, group_id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) {
    const fallback = await client
      .from("activity_sessions")
      .select("id, mode_code, source, started_at, ended_at, minutes")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return toSession(fallback.data as SessionRow);
  }
  if (res.error || !res.data) return null;
  return toSession(res.data as SessionRow);
}

/**
 * Abre una sesión. Si ya hubiera una activa (carrera/doble-tap), el índice único
 * parcial lo bloquea y devolvemos la existente (idempotente).
 */
export async function openSession(
  userId: string,
  modeCode: string,
  source: NfcSessionSource,
): Promise<NfcSessionView | null> {
  const client = db();
  if (!client) return null;
  const res = await client
    .from("activity_sessions")
    .insert({
      user_id: userId,
      mode_code: modeCode,
      source,
      ref_key: `open:${randomUUID()}`,
    })
    .select("id, mode_code, source, started_at, ended_at, minutes, group_id")
    .maybeSingle();
  if (res.error) {
    const fallback = await client
      .from("activity_sessions")
      .insert({ user_id: userId, mode_code: modeCode, source, ref_key: `open:${randomUUID()}` })
      .select("id, mode_code, source, started_at, ended_at, minutes")
      .maybeSingle();
    if (fallback.error || !fallback.data) return readActiveSession(userId);
    return toSession(fallback.data as SessionRow);
  }
  if (res.error || !res.data) {
    return readActiveSession(userId);
  }
  return toSession(res.data as SessionRow);
}

/**
 * Últimas sesiones cerradas del usuario (resumen de tiempo por modo). Solo
 * sesiones finalizadas: la activa se muestra en el cronómetro del panel.
 */
export async function readRecentSessions(
  userId: string,
  limit = 8,
): Promise<NfcSessionView[]> {
  const client = db();
  if (!client) return [];
  const res = await client
    .from("activity_sessions")
    .select("id, mode_code, source, started_at, ended_at, minutes, group_id")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (res.error) {
    const fallback = await client
      .from("activity_sessions")
      .select("id, mode_code, source, started_at, ended_at, minutes")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (fallback.error || !fallback.data) return [];
    return (fallback.data as SessionRow[]).map(toSession);
  }
  if (res.error || !res.data) return [];
  return (res.data as SessionRow[]).map(toSession);
}

/** Minutos cerrados de enfoque/estudio atribuidos a cada materia. */
export async function readGroupSessionMinutes(userId: string): Promise<Record<string, number>> {
  const client = db();
  if (!client) return {};
  const res = await client
    .from("activity_sessions")
    .select("group_id, minutes")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .in("mode_code", ["focus", "study"])
    .not("group_id", "is", null);
  if (res.error || !res.data) return {};
  return res.data.reduce<Record<string, number>>((totals, row) => {
    if (row.group_id) totals[row.group_id] = (totals[row.group_id] ?? 0) + Number(row.minutes ?? 0);
    return totals;
  }, {});
}

export async function assignSessionGroup(
  userId: string,
  sessionId: string,
  groupId: string | null,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  if (groupId) {
    const group = await client.from("task_groups").select("id").eq("id", groupId).eq("user_id", userId).maybeSingle();
    if (group.error || !group.data) return false;
  }
  const result = await client
    .from("activity_sessions")
    .update({ group_id: groupId })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("ended_at", null);
  return !result.error;
}

/** Cierra una sesión y calcula los minutos efectivos. */
export async function closeSession(
  userId: string,
  sessionId: string,
): Promise<{ session: NfcSessionView; minutes: number } | null> {
  const client = db();
  if (!client) return null;
  let read = await client
    .from("activity_sessions")
    .select("id, mode_code, source, started_at, ended_at, minutes, group_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
  if (read.error) {
    read = await client
      .from("activity_sessions")
      .select("id, mode_code, source, started_at, ended_at, minutes")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle();
  }
  if (read.error || !read.data) return null;

  const startedAt = new Date((read.data as SessionRow).started_at).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  const endedAt = new Date().toISOString();

  let res = await client
    .from("activity_sessions")
    .update({ ended_at: endedAt, minutes })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .select("id, mode_code, source, started_at, ended_at, minutes, group_id")
    .maybeSingle();
  if (res.error) {
    res = await client
      .from("activity_sessions")
      .update({ ended_at: endedAt, minutes })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("ended_at", null)
      .select("id, mode_code, source, started_at, ended_at, minutes")
      .maybeSingle();
  }
  if (res.error || !res.data) return null;
  return { session: toSession(res.data as SessionRow), minutes };
}
