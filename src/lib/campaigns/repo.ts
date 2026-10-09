import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { IslandView, UnlockErrorKind, UnlockOutcome, WorldView } from "./types";

function db(): SupabaseClient | null {
  return supabaseAdmin();
}

interface IslandRow {
  code: string;
  name_es: string;
  name_en: string;
  biome: string;
  cost_coins: number;
  requires_island_code: string | null;
  sort: number;
}

interface UnlockRow {
  island_code: string;
  unlocked_at: string;
}

function toIsland(row: IslandRow, unlockedAt?: string): IslandView {
  return {
    code: row.code,
    nameEs: row.name_es,
    nameEn: row.name_en,
    biome: row.biome,
    costCoins: Number(row.cost_coins ?? 0),
    requiresIslandCode: row.requires_island_code,
    sort: Number(row.sort ?? 0),
    unlocked: Boolean(unlockedAt),
    unlockedAt: unlockedAt ?? null,
  };
}

/** Mundo de campañas del usuario: islas y cuáles tiene desbloqueadas. */
export async function readWorld(userId: string): Promise<WorldView | null> {
  const client = db();
  if (!client) return null;

  const [islandsRes, unlocksRes] = await Promise.all([
    client
      .from("islands")
      .select("code, name_es, name_en, biome, cost_coins, requires_island_code, sort")
      .eq("active", true)
      .order("sort", { ascending: true }),
    client
      .from("campaign_unlocks")
      .select("island_code, unlocked_at")
      .eq("user_id", userId),
  ]);

  if (islandsRes.error) return null;

  const unlocked = new Map<string, string>();
  for (const row of (unlocksRes.data ?? []) as UnlockRow[]) {
    unlocked.set(row.island_code, row.unlocked_at);
  }

  return {
    islands: (islandsRes.data as IslandRow[]).map((row) =>
      toIsland(row, unlocked.get(row.code)),
    ),
  };
}

/** Desbloquea una isla de forma atómica (gasto + logro) vía RPC. */
export async function unlockIsland(
  userId: string,
  islandCode: string,
): Promise<UnlockOutcome | null> {
  const client = db();
  if (!client) return null;

  const before = await readWorld(userId);
  const targetBefore = before?.islands.find((i) => i.code === islandCode) ?? null;

  const res = await client.rpc("unlock_island", {
    p_user_id: userId,
    p_island_code: islandCode,
  });
  if (res.error) return null;

  const rows = res.data as
    | { s_ok: boolean; s_coins: number; s_already: boolean; s_island: string }[]
    | undefined;
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;

  const after = await readWorld(userId);
  const island =
    after?.islands.find((i) => i.code === islandCode) ?? targetBefore;

  let reason: UnlockErrorKind = "unknown";
  if (!row.s_ok) {
    if (row.s_already) reason = "already-unlocked";
    else if (
      island?.requiresIslandCode &&
      !before?.islands.some((i) => i.code === island.requiresIslandCode && i.unlocked)
    ) {
      reason = "prerequisite";
    } else {
      reason = "insufficient";
    }
  }

  return {
    ok: row.s_ok,
    reason,
    coins: Number(row.s_coins ?? 0),
    island,
  };
}