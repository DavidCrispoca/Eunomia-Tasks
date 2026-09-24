import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface GoogleConnectionRow {
  user_id: string;
  google_account_email: string;
  calendar_id: string;
  refresh_token_encrypted: string;
  blocks_hash: string | null;
  connected_at: string;
  last_sync_at: string | null;
  paused: boolean;
  updated_at: string;
}

export interface GoogleLinkRow {
  user_id: string;
  block_id: string;
  google_event_id: string;
  calendar_id: string;
  synced_hash: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleBlockRow {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  color: string | null;
}

function db(): SupabaseClient | null {
  return supabaseAdmin();
}

export async function getConnection(
  userId: string,
): Promise<GoogleConnectionRow | null> {
  const client = db();
  if (!client) return null;
  const res = await client
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (res.error) return null;
  return (res.data as unknown as GoogleConnectionRow) ?? null;
}

/** Guarda (o reemplaza) la conexión tras el OAuth; fuerza un push inicial. */
export async function upsertConnection(
  userId: string,
  input: {
    googleAccountEmail: string;
    refreshTokenEncrypted: string;
  },
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("google_calendar_connections")
    .upsert(
      {
        user_id: userId,
        google_account_email: input.googleAccountEmail,
        calendar_id: "primary",
        refresh_token_encrypted: input.refreshTokenEncrypted,
        blocks_hash: null, // null ⇒ el primer sync de esta conexión no se salta
        connected_at: new Date().toISOString(),
        paused: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  return !res.error;
}

export async function setConnectionPaused(
  userId: string,
  paused: boolean,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("google_calendar_connections")
    .update({ paused, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return !res.error;
}

export async function updateConnectionSyncState(
  userId: string,
  input: { blocksHash: string; lastSyncAt: string },
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("google_calendar_connections")
    .update({
      blocks_hash: input.blocksHash,
      last_sync_at: input.lastSyncAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return !res.error;
}

/** Borra conexión y mapeos (no toca los eventos ya creados en Google). */
export async function deleteConnection(userId: string): Promise<boolean> {
  const client = db();
  if (!client) return false;
  await client
    .from("google_event_links")
    .delete()
    .eq("user_id", userId);
  const res = await client
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", userId);
  return !res.error;
}

export async function getProfileTimezone(userId: string): Promise<string> {
  const client = db();
  if (!client) return "UTC";
  const res = await client
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  if (res.error) return "UTC";
  return res.data?.timezone || "UTC";
}

export async function listBlocks(userId: string): Promise<GoogleBlockRow[]> {
  const client = db();
  if (!client) return [];
  const res = await client
    .from("time_blocks")
    .select("id,title,date,start,end,color")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("start", { ascending: true });
  if (res.error) return [];
  return (res.data ?? []) as unknown as GoogleBlockRow[];
}

export async function listLinks(userId: string): Promise<GoogleLinkRow[]> {
  const client = db();
  if (!client) return [];
  const res = await client
    .from("google_event_links")
    .select("*")
    .eq("user_id", userId);
  if (res.error) return [];
  return (res.data ?? []) as unknown as GoogleLinkRow[];
}

export async function insertLink(
  userId: string,
  input: { blockId: string; googleEventId: string; syncedHash: string },
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client.from("google_event_links").insert({
    user_id: userId,
    block_id: input.blockId,
    google_event_id: input.googleEventId,
    calendar_id: "primary",
    synced_hash: input.syncedHash,
  });
  return !res.error;
}

export async function updateLinkHash(
  userId: string,
  blockId: string,
  syncedHash: string,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("google_event_links")
    .update({ synced_hash: syncedHash, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("block_id", blockId);
  return !res.error;
}

export async function deleteLink(
  userId: string,
  blockId: string,
): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const res = await client
    .from("google_event_links")
    .delete()
    .eq("user_id", userId)
    .eq("block_id", blockId);
  return !res.error;
}
