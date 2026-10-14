"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

interface BrowserNotificationOptions {
  body: string;
  tag: string;
  url?: string;
  renotify?: boolean;
}

interface BrowserNotificationsValue {
  permission: BrowserNotificationPermission;
  enable: () => Promise<BrowserNotificationPermission>;
  notify: (title: string, options: BrowserNotificationOptions) => Promise<void>;
  closeNotification: (tag: string) => Promise<void>;
}

const BrowserNotificationsContext = createContext<BrowserNotificationsValue | null>(null);
const listeners = new Set<() => void>();
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function emitPermissionChange() {
  for (const listener of listeners) listener();
}

function getPermission(): BrowserNotificationPermission {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("Notification" in window)
  ) return "unsupported";
  return Notification.permission;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("focus", emitPermissionChange);
  document.addEventListener("visibilitychange", emitPermissionChange);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("focus", emitPermissionChange);
    document.removeEventListener("visibilitychange", emitPermissionChange);
  };
}

function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  registrationPromise ??= navigator.serviceWorker.register("/sw.js").catch(() => null);
  return registrationPromise;
}

export function BrowserNotificationsProvider({ children }: { children: ReactNode }) {
  const permission = useSyncExternalStore<BrowserNotificationPermission>(
    subscribe,
    getPermission,
    () => "unsupported",
  );

  const enable = useCallback(async (): Promise<BrowserNotificationPermission> => {
    if (!window.isSecureContext || !("Notification" in window)) return "unsupported" as const;
    try {
      const next = await Notification.requestPermission();
      emitPermissionChange();
      if (next === "granted") await getServiceWorkerRegistration();
      return next;
    } catch {
      emitPermissionChange();
      return getPermission();
    }
  }, []);

  const notify = useCallback(async (title: string, options: BrowserNotificationOptions) => {
    if (getPermission() !== "granted") return;
    try {
      const registration = await getServiceWorkerRegistration();
      if (registration) {
        const notificationOptions: NotificationOptions = {
          body: options.body,
          tag: options.tag,
          data: { url: options.url ?? "/" },
        };
        if (options.renotify) Object.assign(notificationOptions, { renotify: true });
        await registration.showNotification(title, notificationOptions);
        return;
      }
      const notification = new Notification(title, { body: options.body, tag: options.tag });
      notification.onclick = () => {
        window.focus();
        if (options.url) window.location.assign(options.url);
        notification.close();
      };
    } catch {
      // Notifications are optional; timers and in-app status remain available.
    }
  }, []);

  const closeNotification = useCallback(async (tag: string) => {
    try {
      const registration = await getServiceWorkerRegistration();
      const notifications = await registration?.getNotifications({ tag });
      notifications?.forEach((notification) => notification.close());
    } catch {
      // A stale notification is harmless if the browser cannot close it.
    }
  }, []);

  return (
    <BrowserNotificationsContext.Provider value={{ permission, enable, notify, closeNotification }}>
      {children}
    </BrowserNotificationsContext.Provider>
  );
}

export function useBrowserNotifications() {
  const context = useContext(BrowserNotificationsContext);
  if (!context) throw new Error("useBrowserNotifications must be used within BrowserNotificationsProvider");
  return context;
}
