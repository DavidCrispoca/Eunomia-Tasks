import { useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/storage/local-storage-store";

const cache = new Map<string, { raw: string | null; value: unknown }>();
const defaultCache = new Map<string, unknown>();

function getDefault<T>(key: string, fallback: () => T): T {
  if (!defaultCache.has(key)) {
    defaultCache.set(key, fallback());
  }
  return defaultCache.get(key) as T;
}

function getSnapshot<T>(key: string, fallback: () => T): T {
  const entry = cache.get(key);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // server-side render or storage unavailable — fallback below
  }

  if (entry && entry.raw === raw) return entry.value as T;

  let value: T;
  if (raw === null) {
    value = getDefault(key, fallback);
  } else {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = getDefault(key, fallback);
    }
  }
  cache.set(key, { raw, value });
  return value;
}

/**
 * Reactive read of a localStorage-backed value.
 * - Stable snapshot per key (no infinite re-renders).
 * - Updates in the same tab (writes notify) and across tabs (storage event).
 */
export function useSynced<T>(key: string, fallback: () => T): T {
  return useSyncExternalStore(
    subscribeStore,
    () => getSnapshot(key, fallback),
    () => getDefault(key, fallback),
  );
}