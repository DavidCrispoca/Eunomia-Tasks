"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Pause,
  Play,
  RefreshCw,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { buttonClasses, Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import {
  disconnectGoogle,
  loadGoogleConnectionState,
  pauseGoogleSync,
  syncGoogleNow,
  type GoogleConnectionState,
} from "@/lib/google/actions";
import { cn } from "@/lib/utils";

type Notice =
  | { kind: "error" }
  | { kind: "partial"; errors: number }
  | { kind: "disconnected" };

function relativeTime(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

interface GoogleSyncPanelProps {
  state: GoogleConnectionState | null;
  onStateChange: (state: GoogleConnectionState | null) => void;
}

export function GoogleSyncPanel({ state, onStateChange }: GoogleSyncPanelProps) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!state) return null;

  const g = t.calendar.google;

  function syncLabel(): string {
    if (state?.paused) return g.paused;
    const minutes = relativeTime(state?.lastSyncAt ?? null);
    if (!Number.isFinite(minutes)) return g.neverSynced;
    if (minutes < 1) return g.syncedAt(g.timeAgo.now);
    if (minutes < 60) return g.syncedAt(g.timeAgo.minutesAgo(minutes));
    if (minutes < 60 * 24) return g.syncedAt(g.timeAgo.hoursAgo(Math.floor(minutes / 60)));
    return g.syncedAt(g.timeAgo.daysAgo(Math.floor(minutes / (60 * 24))));
  }

  async function refreshState() {
    onStateChange(await loadGoogleConnectionState());
  }

  async function handleRetry() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await syncGoogleNow();
      if (result.status === "error") setNotice({ kind: "error" });
      else if (result.errors > 0) setNotice({ kind: "partial", errors: result.errors });
      await refreshState();
    } finally {
      setBusy(false);
    }
  }

  async function handlePause(paused: boolean) {
    setBusy(true);
    try {
      await pauseGoogleSync(paused);
      await refreshState();
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(g.disconnectConfirm)) return;
    setBusy(true);
    try {
      await disconnectGoogle();
      setNotice({ kind: "disconnected" });
      await refreshState();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CalendarCheck size={15} className="shrink-0 text-amber-300/80" />
        {state.connected ? (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">
              {state.email}
            </span>
            <span className="font-mono text-[10.5px] text-muted">
              {syncLabel()}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium">{g.connect}</span>
            <span className="text-[11px] leading-snug text-muted">
              {g.connectHint}
            </span>
          </div>
        )}

        {state.connected ? (
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRetry()}
              disabled={busy}
            >
              <RefreshCw size={13} className={cn(busy && "animate-spin")} />
              {g.syncNow}
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => void handlePause(!state.paused)}
              disabled={busy}
            >
              {state.paused ? <Play size={13} /> : <Pause size={13} />}
              {state.paused ? g.resume : g.pause}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDisconnect()}
              disabled={busy}
            >
              <Unlink size={13} />
              {g.disconnect}
            </Button>
          </div>
        ) : (
          <a
            href="/api/google/oauth/start"
            className={cn(
              buttonClasses("primary", "sm", "ml-auto"),
              busy && "pointer-events-none opacity-50",
            )}
            aria-disabled={busy}
          >
            <CalendarCheck size={13} />
            {g.connect}
          </a>
        )}
      </div>

      {notice ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 text-[11px]",
            notice.kind === "disconnected" ? "text-muted" : "text-orange-300",
          )}
        >
          {notice.kind !== "disconnected" ? <TriangleAlert size={12} /> : null}
          {notice.kind === "error"
            ? g.syncError
            : notice.kind === "partial"
              ? g.syncPartial(notice.errors)
              : g.disconnectDone}
        </p>
      ) : null}
    </div>
  );
}
