"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CheckCheck,
  ListTodo,
  Sparkles,
} from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import {
  addDays,
  dayShort,
  formatShortDate,
  startOfWeek,
} from "@/lib/date";
import { toISODate, todayISO, hhmmToMinutes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-amber-300/70",
  medium: "bg-amber-400",
  high: "bg-orange-500",
};

interface DeadlineRow {
  id: string;
  title: string;
  dueDate: string;
  priority: Task["priority"];
  kind: "overdue" | "today" | "tomorrow" | "upcoming";
  badge: string;
}

export function DashboardView() {
  const { tasks, blocks } = useData();
  const { t, lang } = useLanguage();

  const data = useMemo(() => {
    const today = todayISO();
    const pending = tasks.filter((task) => task.status !== "done");
    const completed = tasks.filter((task) => task.status === "done");
    const overdue = pending.filter(
      (task) => task.dueDate && task.dueDate < today,
    );

    const completedToday = completed.filter(
      (task) => task.completedAt?.slice(0, 10) === today,
    ).length;

    const onTimeCount = completed.filter((task) => {
      if (!task.dueDate) return true;
      if (!task.completedAt) return true;
      return task.completedAt.slice(0, 10) <= task.dueDate;
    }).length;
    const onTimeRate = completed.length
      ? Math.round((onTimeCount / completed.length) * 100)
      : 0;

    const tomorrow = toISODate(addDays(new Date(), 1));
    const deadlines: DeadlineRow[] = pending
      .filter((task) => task.dueDate)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .map((task) => {
        const due = task.dueDate!;
        const kind =
          due < today
            ? "overdue"
            : due === today
              ? "today"
              : due === tomorrow
                ? "tomorrow"
                : "upcoming";
        return {
          id: task.id,
          title: task.title,
          dueDate: due,
          priority: task.priority,
          kind,
          badge:
            kind === "overdue"
              ? t.dashboard.overdueBadge
              : kind === "today"
                ? `· ${t.dashboard.todayBadge} ·`
                : kind === "tomorrow"
                  ? `· ${t.dashboard.tomorrowBadge} ·`
                  : "",
        };
      });

    const weekStart = startOfWeek(today);
    const perDay = Array.from({ length: 7 }, (_, i) => {
      const iso = toISODate(addDays(weekStart, i));
      const minutes = blocks
        .filter((b) => b.date === iso)
        .reduce((sum, b) => {
          const duration = hhmmToMinutes(b.end) - hhmmToMinutes(b.start);
          return sum + Math.max(0, duration);
        }, 0);
      return { iso, minutes };
    });
    const weekFocus = perDay.reduce((sum, d) => sum + d.minutes, 0);
    const todayBlocked = perDay.find((d) => d.iso === today)?.minutes ?? 0;
    const maxDay = Math.max(1, ...perDay.map((d) => d.minutes));

    const nextSteps = [...pending]
      .sort((a, b) => {
        const pa = a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2;
        const pb = b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2;
        if (pa !== pb) return pa - pb;
        if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        return a.dueDate ? -1 : b.dueDate ? 1 : 0;
      })
      .slice(0, 4);

    return {
      pendingCount: pending.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
      completedToday,
      onTimeRate,
      deadlines,
      weekFocus,
      todayBlocked,
      perDay,
      maxDay,
      nextSteps,
      hasTasks: tasks.length > 0,
    };
  }, [tasks, blocks, t]);

  if (!data.hasTasks) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-16 shadow-[var(--inset-top)]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)]">
          <Sparkles size={22} />
        </span>
        <p className="max-w-sm text-sm text-muted">{t.dashboard.noData}</p>
        <Link href="/kanban" className="mt-1">
          <Button variant="primary" size="sm">
            {t.dashboard.viewKanban}
            <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t.dashboard.pending}
          icon={<ListTodo size={18} />}
          iconClass="bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          value={String(data.pendingCount)}
          valueClass="text-amber-200"
        />
        <KpiCard
          label={t.dashboard.completed}
          icon={<CheckCheck size={18} />}
          iconClass="bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-[0_0_14px_rgba(52,211,153,0.4)]"
          value={String(data.completedCount)}
          valueClass="text-emerald-300"
          subtext={
            data.completedToday > 0
              ? `${data.completedToday} ${t.dashboard.completedToday}`
              : undefined
          }
        />
        <KpiCard
          label={t.dashboard.onTime}
          ring={data.onTimeRate}
          valueClass="text-amber-200"
          subtext={t.dashboard.onTimeHint}
        />
        <KpiCard
          label={t.dashboard.overdue}
          icon={<AlarmClock size={18} />}
          iconClass="bg-gradient-to-br from-[#ff4500] to-orange-600 text-white shadow-[0_0_14px_rgba(255,69,0,0.45)]"
          value={String(data.overdueCount)}
          valueClass={
            data.overdueCount > 0 ? "text-[#ff8a4d]" : "text-muted"
          }
          subtext={t.dashboard.overdueHint}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <CardHeader title={t.dashboard.deadlines} />
            {data.deadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                {t.dashboard.deadlinesEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.deadlines.slice(0, 6).map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-[13px] transition-colors hover:border-white/10 hover:bg-white/[0.03]",
                      row.kind === "overdue" &&
                        "border-[#ff4500]/20 bg-[#ff4500]/[0.05] hover:border-[#ff4500]/30",
                      row.kind === "today" &&
                        "border-amber-500/20 bg-amber-500/[0.06] hover:border-amber-500/35",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        PRIORITY_DOT[row.priority],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {row.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[11px]",
                        row.kind === "overdue"
                          ? "text-[#ff8a4d]"
                          : row.kind === "upcoming"
                            ? "text-muted"
                            : "text-amber-200",
                      )}
                    >
                      {row.badge && <>{row.badge}&nbsp;</>}
                      {formatShortDate(row.dueDate, lang)}
                    </span>
                  </li>
                ))}
                {data.deadlines.length > 6 && (
                  <li className="px-3 pt-0.5 text-right font-mono text-[11px] text-muted">
                    {t.dashboard.deadlineMore(data.deadlines.length - 6)}
                  </li>
                )}
              </ul>
            )}
          </GlassCard>
        </div>

        <div className="flex flex-col gap-4">
          <GlassCard>
            <CardHeader title={t.dashboard.weekFocus} />
            <div className="flex h-24 items-end gap-1.5">
              {data.perDay.map((day, i) => {
                const isToday = day.iso === todayISO();
                const height =
                  day.minutes > 0
                    ? Math.max(12, (day.minutes / data.maxDay) * 100)
                    : 2;
                return (
                  <div
                    key={day.iso}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    title={`${dayShort(i, lang)} · ${formatMinutes(
                      day.minutes,
                      t.dashboard.hoursShort,
                      t.dashboard.minutesShort,
                    )}`}
                  >
                    <span
                      className={cn(
                        "w-full rounded-t-md transition-all",
                        isToday
                          ? "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                          : day.minutes > 0
                            ? "bg-amber-500/50"
                            : "bg-white/[0.06]",
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[9px] uppercase",
                        isToday ? "text-amber-300" : "text-muted/70",
                      )}
                    >
                      {dayShort(i, lang).slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[12px]">
              <span className="text-muted">{t.dashboard.blockedThisWeek}</span>
              <span className="font-mono text-sm font-semibold text-amber-200">
                {formatMinutes(
                  data.weekFocus,
                  t.dashboard.hoursShort,
                  t.dashboard.minutesShort,
                )}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[12px]">
              <span className="text-muted">{t.dashboard.blockedToday}</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {formatMinutes(
                  data.todayBlocked,
                  t.dashboard.hoursShort,
                  t.dashboard.minutesShort,
                )}
              </span>
            </div>
          </GlassCard>

          <GlassCard>
            <CardHeader title={t.dashboard.nextSteps} />
            {data.nextSteps.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {t.dashboard.deadlinesEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.nextSteps.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-[13px]"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        PRIORITY_DOT[task.priority],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="shrink-0 font-mono text-[10.5px] text-muted">
                        {formatShortDate(task.dueDate, lang)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
              <Link href="/kanban" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  {t.dashboard.viewKanban}
                </Button>
              </Link>
              <Link href="/calendar" className="flex-1">
                <Button variant="subtle" size="sm" className="w-full">
                  {t.dashboard.viewCalendar}
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  icon,
  iconClass,
  value,
  valueClass,
  ring,
  subtext,
}: {
  label: string;
  icon?: React.ReactNode;
  iconClass?: string;
  value?: string;
  valueClass?: string;
  ring?: number;
  subtext?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-[var(--inset-top)] transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[var(--inset-top),0_4px_20px_rgba(245,158,11,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/40 via-orange-500/15 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">{label}</span>
          {value !== undefined ? (
            <span
              className={cn(
                "font-mono text-2xl font-semibold leading-none",
                valueClass ?? "text-foreground",
              )}
            >
              {value}
            </span>
          ) : (
            ring !== undefined && (
              <span
                className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-white/10"
                style={{
                  background: `conic-gradient(#f59e0b ${ring * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-obsidian font-mono text-sm font-semibold text-amber-200">
                  {ring}%
                </span>
              </span>
            )
          )}
        </div>
        {icon && (
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              iconClass,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {subtext && (
        <p className="mt-2.5 text-[11px] leading-snug text-muted">{subtext}</p>
      )}
    </div>
  );
}

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-[var(--inset-top)] transition-all duration-200 ease-out-expo hover:border-amber-500/25 hover:shadow-[var(--inset-top),0_4px_20px_rgba(245,158,11,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-tight">
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-600" />
      {title}
    </h3>
  );
}

function formatMinutes(minutes: number, hoursShort: string, minutesShort: string) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}${hoursShort} ${m}${minutesShort}`;
  if (h > 0) return `${h}${hoursShort}`;
  return `${m}${minutesShort}`;
}