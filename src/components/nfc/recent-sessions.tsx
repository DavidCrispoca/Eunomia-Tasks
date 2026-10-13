"use client";

import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { modeLabel } from "@/lib/nfc/types";
import type { Language } from "@/types";
import { cn } from "@/lib/utils";

/** Hora del día de hoy; día + hora si la sesión es anterior. */
function formatWhen(iso: string, lang: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    lang,
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
  ).format(date);
}

/** Últimas sesiones cerradas: evidencia del tiempo registrado por modo. */
export function RecentSessions({ className }: { className?: string }) {
  const { sessions, modes, groups } = useNfc();
  const { t, lang } = useLanguage();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[13px] font-medium text-foreground">
        {t.nfc.recentTitle}
      </p>
      {sessions.length === 0 ? (
        <p className="text-[12px] text-muted">{t.nfc.recentEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sessions.map((session) => {
            const mode =
              modes.find((item) => item.code === session.modeCode) ?? null;
            return (
              <li
                key={session.id}
                className="flex items-center gap-2.5 rounded-md bg-surface-1 px-3 py-2"
              >
                <span className="text-base" aria-hidden>
                  {mode?.emoji ?? "•"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                  {mode ? modeLabel(mode, lang) : session.modeCode}
                  {session.groupId && groups.find((group) => group.id === session.groupId) && (
                    <span className="ml-1 text-[11px] text-muted">
                      · {groups.find((group) => group.id === session.groupId)?.name}
                    </span>
                  )}
                </span>
                <span className="text-tabular text-[12px] text-muted">
                  {formatWhen(session.startedAt, lang)}
                </span>
                <span className="text-tabular text-[12px] font-medium text-foreground">
                  {t.nfc.minutes(session.minutes ?? 0)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
