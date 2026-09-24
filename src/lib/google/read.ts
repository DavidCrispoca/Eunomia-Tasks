"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/cookies";
import { GOOGLE_CALENDAR_API_BASE } from "@/lib/google/config";
import { getConnection, getProfileTimezone } from "@/lib/google/repo";
import { addDaysToISO, zonedTimeToUtc } from "@/lib/google/time";
import { ensureAccessToken } from "@/lib/google/tokens";

/** Evento de Google listo para pintarse (solo lectura) en el calendario. */
export interface GoogleEventPreview {
  eventId: string;
  summary: string;
  start: string;
  end: string;
  htmlLink: string;
}

const rangeSchema = z.tuple([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha YYYY-MM-DD"),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha YYYY-MM-DD"),
]);

const listResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        summary: z.string().optional(),
        start: z
          .object({ dateTime: z.string().optional(), date: z.string().optional() })
          .optional(),
        end: z
          .object({ dateTime: z.string().optional(), date: z.string().optional() })
          .optional(),
        htmlLink: z.string().optional(),
        extendedProperties: z
          .object({
            private: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
});

const MAX_EVENTS = 500;

/**
 * Eventos de Google `primary` en la ventana [from, to] para el overlay.
 * Descarta los que Eunomia ya creó (private.eunomiaBlockId) y los
 * eventos de todo el día (no encajan en la rejilla de horas).
 * Devuelve null si no hay conexión (o falla) para que la UI lo oculte.
 */
export async function loadGoogleEvents(
  from: string,
  to: string,
): Promise<GoogleEventPreview[] | null> {
  if (rangeSchema.safeParse([from, to]).success === false) return null;

  const user = await getSessionUser();
  if (!user || user.demo) return null;
  const connection = await getConnection(user.id);
  if (!connection) return null;

  const token = await ensureAccessToken(user.id);
  if (!token) return null;

  const timeZone = await getProfileTimezone(user.id);
  const timeMin = zonedTimeToUtc(from, "00:00", timeZone).toISOString();
  const timeMax = zonedTimeToUtc(
    addDaysToISO(to, 1),
    "00:00",
    timeZone,
  ).toISOString();

  const previews: GoogleEventPreview[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const url = new URL(GOOGLE_CALENDAR_API_BASE);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const parsed = listResponseSchema.safeParse(await res.json());
      if (!parsed.success) return null;

      for (const item of parsed.data.items) {
        // Los bloques de Eunomia ya se ven en la app: descártalos.
        if (item.extendedProperties?.private?.eunomiaBlockId) continue;
        // Eventos de todo el día: no caben en la rejilla horaria.
        if (!item.start?.dateTime || !item.end?.dateTime) continue;
        previews.push({
          eventId: item.id,
          summary: item.summary ?? "",
          start: item.start.dateTime,
          end: item.end.dateTime,
          htmlLink: item.htmlLink ?? "",
        });
        if (previews.length >= MAX_EVENTS) break;
      }
      pageToken =
        previews.length < MAX_EVENTS ? parsed.data.nextPageToken : undefined;
    } while (pageToken);
  } catch (error) {
    console.error("[Eunomia] No se pudieron leer los eventos de Google:", error);
    return null;
  }
  return previews;
}
