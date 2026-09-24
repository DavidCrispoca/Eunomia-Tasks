import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { GOOGLE_CALENDAR_API_BASE } from "@/lib/google/config";
import {
  deleteLink,
  getConnection,
  getProfileTimezone,
  insertLink,
  listBlocks,
  listLinks,
  updateConnectionSyncState,
  updateLinkHash,
  type GoogleBlockRow,
} from "@/lib/google/repo";
import { addDaysToISO, zonedTimeToUtc } from "@/lib/google/time";
import { ensureAccessToken } from "@/lib/google/tokens";
import type { BlockColor } from "@/types";

export type GoogleSyncStatus = "skipped" | "unchanged" | "synced" | "error";

export interface GoogleSyncResult {
  status: GoogleSyncStatus;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
  reason?: string;
}

/** colorId de Google Calendar equivalente a cada color de bloque de la app. */
const COLOR_TO_EVENT_COLOR_ID: Record<BlockColor, string> = {
  default: "8", // graphite
  green: "2", // sage
  orange: "5", // banana
  red: "11", // tomato
  blue: "1", // lavender
};

const createdEventSchema = z.object({ id: z.string().min(1) });

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Hash estable de un bloque (los campos que se publican en Google). */
function blockHash(block: GoogleBlockRow): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: block.id,
        title: block.title,
        date: block.date,
        start: block.start,
        end: block.end,
        color: block.color ?? "default",
      }),
    )
    .digest("hex");
}

/** Hash agregado de todos los bloques del usuario. */
function aggregateHash(hashes: string[]): string {
  return createHash("sha256").update([...hashes].sort().join("|")).digest("hex");
}

function eventPayload(
  block: GoogleBlockRow,
  timeZone: string,
): Record<string, unknown> {
  const startMin = toMinutes(block.start);
  let endMin = toMinutes(block.end);
  if (endMin <= startMin) endMin = startMin + 60;
  const extraDays = Math.floor(endMin / 1440); // "24:00" → día siguiente 00:00
  const start = zonedTimeToUtc(
    block.date,
    minutesToHHMM(startMin),
    timeZone,
  ).toISOString();
  const end = zonedTimeToUtc(
    addDaysToISO(block.date, extraDays),
    minutesToHHMM(endMin % 1440),
    timeZone,
  ).toISOString();
  return {
    summary: block.title,
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    colorId: COLOR_TO_EVENT_COLOR_ID[(block.color ?? "default") as BlockColor],
    // Red de seguridad para identificar los eventos propios en el overlay.
    extendedProperties: { private: { eunomiaBlockId: block.id } },
  };
}

async function calendarRequest(
  token: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

// Deduplicación: como máximo un sync por usuario a la vez (múltiples pestañas).
const inFlight = new Map<string, Promise<GoogleSyncResult>>();

export function syncUserCalendar(
  userId: string,
  options: { force?: boolean } = {},
): Promise<GoogleSyncResult> {
  const running = inFlight.get(userId);
  if (running) return running;
  const promise = runSync(userId, options).finally(() => {
    inFlight.delete(userId);
  });
  inFlight.set(userId, promise);
  return promise;
}

async function runSync(
  userId: string,
  options: { force?: boolean },
): Promise<GoogleSyncResult> {
  const noop: GoogleSyncResult = {
    status: "synced",
    created: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
  };
  try {
    const connection = await getConnection(userId);
    if (!connection) return { ...noop, status: "skipped", reason: "no_connection" };
    if (connection.paused) return { ...noop, status: "skipped", reason: "paused" };

    const token = await ensureAccessToken(userId);
    if (!token) return { ...noop, status: "error", reason: "token" };

    const [timeZone, blocks] = await Promise.all([
      getProfileTimezone(userId),
      listBlocks(userId),
    ]);

    const blockHashes = blocks.map((block) => blockHash(block));
    const aggregate = aggregateHash(blockHashes);
    if (!options.force && connection.blocks_hash === aggregate) {
      return { ...noop, status: "unchanged" };
    }

    const links = await listLinks(userId);
    const linkByBlock = new Map(links.map((link) => [link.block_id, link]));
    const seenBlockIds = new Set<string>();
    const result: GoogleSyncResult = {
      status: "synced",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    };

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const hash = blockHashes[index];
      seenBlockIds.add(block.id);
      const link = linkByBlock.get(block.id);
      try {
        if (!link) {
          const res = await calendarRequest(token, "", {
            method: "POST",
            body: JSON.stringify(eventPayload(block, timeZone)),
          });
          if (!res.ok) throw new Error(`insert ${res.status}`);
          const parsed = createdEventSchema.safeParse(await res.json());
          if (!parsed.success) throw new Error("insert:respuesta inválida");
          await insertLink(userId, {
            blockId: block.id,
            googleEventId: parsed.data.id,
            syncedHash: hash,
          });
          result.created += 1;
        } else if (link.synced_hash !== hash) {
          const res = await calendarRequest(token, `/${encodeURIComponent(link.google_event_id)}`, {
            method: "PATCH",
            body: JSON.stringify(eventPayload(block, timeZone)),
          });
          if (!res.ok) throw new Error(`patch ${res.status}`);
          await updateLinkHash(userId, block.id, hash);
          result.updated += 1;
        }
      } catch (error) {
        console.error("[Eunomia] Sync de bloque a Google falló:", error);
        result.errors += 1;
      }
    }

    for (const link of links) {
      if (seenBlockIds.has(link.block_id)) continue;
      try {
        const res = await calendarRequest(
          token,
          `/${encodeURIComponent(link.google_event_id)}`,
          { method: "DELETE" },
        );
        // 404/410: el evento ya no existe en Google → nada que borrar.
        if (!res.ok && res.status !== 404 && res.status !== 410) {
          throw new Error(`delete ${res.status}`);
        }
        result.deleted += 1;
      } catch (error) {
        console.error("[Eunomia] Borrado de evento en Google falló:", error);
        result.errors += 1;
        continue; // conservar el link para reintentar en el próximo sync
      }
      await deleteLink(userId, link.block_id);
    }

    if (result.errors === 0) {
      await updateConnectionSyncState(userId, {
        blocksHash: aggregate,
        lastSyncAt: new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    console.error("[Eunomia] syncUserCalendar falló:", error);
    return { ...noop, status: "error", reason: "unexpected" };
  }
}
