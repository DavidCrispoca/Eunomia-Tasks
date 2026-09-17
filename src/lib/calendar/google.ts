import "server-only";
import type { TimeBlock } from "@/types";
import {
  getBlocksForUser,
  getGoogleTokens,
  getProfile,
  setBlockExternalId,
  setGoogleTokens,
} from "@/lib/data/repo";

export const EVENT_MARKER = "Eunomia Tasks · time-block";

export function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

function oauthInit(): { clientId: string; clientSecret: string; redirectUri: string } {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  };
}

export function authorizeUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: oauthInit().clientId,
    redirect_uri: oauthInit().redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: oauthInit().clientId,
    client_secret: oauthInit().clientSecret,
    redirect_uri: oauthInit().redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: oauthInit().clientId,
    client_secret: oauthInit().clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text.replace("<!DOCTYPE html>", "").slice(0, 300);
    throw new Error(`${res.status} ${message}`);
  }
  return (await res.json()) as T;
}

async function validAccessToken(userId: string): Promise<string | null> {
  const tokens = await getGoogleTokens(userId);
  if (!tokens?.refresh_token) return null;
  const expires = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;
  if (tokens.access_token && expires > Date.now() + 60_000) {
    return tokens.access_token;
  }
  const fresh = await refreshToken(tokens.refresh_token);
  await setGoogleTokens(userId, {
    email: tokens.email,
    refreshToken: tokens.refresh_token,
    accessToken: fresh.access_token,
    expiresAt: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
  });
  return fresh.access_token;
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const user = await fetchJson<{ email?: string }>(
      "https://www.googleapis.com/userinfo/v2/me",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return user.email ?? null;
  } catch {
    return null;
  }
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
}

export async function listEvents(accessToken: string): Promise<GoogleEvent[]> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId(),
  )}/events?singleEvents=true&orderBy=startTime&maxResults=2500`;
  const data = await fetchJson<{
    items?: Array<{
      id: string;
      summary: string;
      description?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }>;
  }>(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? "",
    description: item.description ?? null,
    start: item.start?.dateTime ?? null,
    end: item.end?.dateTime ?? null,
  }));
}

function blockDateTime(date: string, time: string, timeZone: string) {
  return {
    dateTime: `${date}T${time}:00`,
    timeZone,
  };
}

export async function createEvent(
  accessToken: string,
  block: TimeBlock,
  timeZone: string,
): Promise<string> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId(),
  )}/events`;
  const data = await fetchJson<{ id: string }>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: block.title,
      description: EVENT_MARKER,
      start: blockDateTime(block.date, block.start, timeZone),
      end: blockDateTime(block.date, block.end, timeZone),
    }),
  });
  return data.id;
}

export async function updateEvent(
  accessToken: string,
  eventId: string,
  block: TimeBlock,
  timeZone: string,
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId(),
  )}/events/${encodeURIComponent(eventId)}`;
  await fetchJson(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: block.title,
      description: EVENT_MARKER,
      start: blockDateTime(block.date, block.start, timeZone),
      end: blockDateTime(block.date, block.end, timeZone),
    }),
  });
}

export async function deleteEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId(),
  )}/events/${encodeURIComponent(eventId)}`;
  await fetchJson(url, { method: "DELETE" });
}

/**
 * Sincroniza push (bloques -> Google Calendar).
 * Crea los bloques sin evento, actualiza los existentes y borra los eventos
 * marcados de Eunomia que ya no tienen bloque local correspondiente.
 */
export async function syncBlocksToCalendar(userId: string): Promise<{
  created: number;
  updated: number;
  deleted: number;
}> {
  const accessToken = await validAccessToken(userId);
  if (!accessToken) throw new Error("no_calendar_token");

  const profile = await getProfile(userId);
  const timeZone = profile?.timezone ?? "America/Bogota";
  const blocks = await getBlocksForUser(userId);
  const localExternals = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const block of blocks) {
    const known = block.externalId;
    if (known) {
      await updateEvent(accessToken, known, block, timeZone);
      localExternals.add(known);
      updated += 1;
    } else {
      const externalId = await createEvent(accessToken, block, timeZone);
      await setBlockExternalId(userId, block.id, externalId);
      localExternals.add(externalId);
      created += 1;
    }
  }

  let deleted = 0;
  try {
    const remote = await listEvents(accessToken);
    for (const event of remote) {
      if (event.description === EVENT_MARKER && !localExternals.has(event.id)) {
        await deleteEvent(accessToken, event.id);
        deleted += 1;
      }
    }
  } catch {
    // no rompemos el sync si falla la limpieza
  }

  return { created, updated, deleted };
}