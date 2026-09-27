import { useCallback, useEffect, useSyncExternalStore } from "react";
import { subscribeStore } from "@/lib/storage/local-storage-store";

const cache = new Map<string, { raw: string | null; value: unknown }>();
const defaultCache = new Map<string, unknown>();

/**
 * `false` durante el render del servidor y también en el PRIMER render del
 * cliente. localStorage no existe en SSR, así que si el cliente leyera el
 * almacenamiento en su primer render compararía contra un HTML que nunca
 * contendrá esos datos (hydration mismatch). Se activa tras el commit.
 */
let hydrated = false;
const hydrationListeners = new Set<() => void>();

function subscribeHydration(listener: () => void) {
  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
}

function markHydrated() {
  if (hydrated) return;
  hydrated = true;
  for (const listener of hydrationListeners) listener();
}

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
    // storage unavailable — fallback below
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
 * - First client render matches the server snapshot; the stored value is
 *   applied right after hydration.
 */
export function useSynced<T>(key: string, fallback: () => T): T {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const unsubscribeStore = subscribeStore(onStoreChange);
    const unsubscribeHydration = subscribeHydration(onStoreChange);
    return () => {
      unsubscribeStore();
      unsubscribeHydration();
    };
  }, []);

  const getClientSnapshot = useCallback(() => {
    if (!hydrated) return getDefault(key, fallback);
    return getSnapshot(key, fallback);
  }, [key, fallback]);

  const getServerSnapshot = useCallback(
    () => getDefault(key, fallback),
    [key, fallback],
  );

  // El snapshot se registra ANTES de marcar `hydrated` para que el chequeo
  // post-suscripción vea el valor real y vuelva a renderizar.
  const value = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    markHydrated();
  }, []);

  return value;
}
