"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, CheckCheck, ListTodo, Sparkles, Timer } from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { addDays, dayShort, formatShortDate, startOfWeek } from "@/lib/date";
import { toISODate, todayISO } from "@/lib/utils";
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
  const { tasks } = useData();
  const { t, lang } = useLanguage();

  const data = useMemo(() => {
    const today = todayISO();
    const weekStart = startOfWeek(today);
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(addDays(weekStart, 6));
    const in7Days = toISODate(addDays(new Date(), 7));

    const pending = tasks.filter((task) => task.status !== "done");
    const completed = tasks.filter((task) => task.status === "done");
    const completedToday = completed.filter(
      (task) => task.completedAt?.slice(0, 10) === today,
    ).length;

    const pendingThisWeek = pending.filter(
      (task) => task.dueDate && task.dueDate >= weekStartISO && task.dueDate <= weekEndISO,
    );

    const perDay = Array.from({ length: 7 }, (_, i) => {
      const iso = toISODate(addDays(weekStart, i));
      return {
        iso,
        count: pending.filter((task) => task.dueDate === iso).length,
      };
    });
    const maxDay = Math.max(1, ...perDay.map((d) => d.count));

    const overdue = pending.filter(
      (task) => task.dueDate && task.dueDate < today,
    );
    const dueSoon = pending.filter(
      (task) => task.dueDate && task.dueDate <= in7Days,
    );

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

    return {
      pendingCount: pending.length,
      pendingThisWeek: pendingThisWeek.length,
      completedCount: completed.length,
      completedToday,
      overdueCount: overdue.length,
      dueSoon: dueSoon.length,
      perDay,
      maxDay,
      deadlines,
      hasTasks: tasks.length > 0,
    };
  }, [tasks, t]);

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
          label={t.dashboard.thisWeek}
          icon={<Timer size={18} />}
          iconClass="bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          value={String(data.pendingThisWeek)}
          valueClass="text-amber-200"
          footer={<WeekBars perDay={data.perDay} maxDay={data.maxDay} lang={lang} />}
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
          label={t.dashboard.dueSoon}
          icon={<AlarmClock size={18} />}
          iconClass="bg-gradient-to-br from-[#ff4500] to-orange-600 text-white shadow-[0_0_14px_rgba(255,69,0,0.45)]"
          value={String(data.dueSoon)}
          valueClass={
            data.overdueCount > 0 ? "text-[#ff8a4d]" : "text-amber-200"
          }
          subtext={
            data.overdueCount > 0
              ? `${data.overdueCount} ${t.dashboard.overdueHint}`
              : t.dashboard.dueSoonHint
          }
        />
      </div>

      <GlassCard className="h-full">
        <CardHeader title={t.dashboard.deadlines} />
        {data.deadlines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {t.dashboard.deadlinesEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.deadlines.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13.5px] transition-colors hover:border-white/10 hover:bg-white/[0.03]",
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
                <span className="min-w-0 flex-1 truncate">{row.title}</span>
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
            {data.deadlines.length > 8 && (
              <li className="px-3 pt-0.5 text-right font-mono text-[11px] text-muted">
                {t.dashboard.deadlineMore(data.deadlines.length - 8)}
              </li>
            )}
          </ul>
        )}
      </GlassCard>

      <div className="flex gap-2">
        <Link href="/kanban" className="flex-1">
          <Button variant="primary" size="sm" className="w-full justify-center">
            {t.dashboard.viewKanban}
            <ArrowRight size={14} />
          </Button>
        </Link>
        <Link href="/calendar" className="flex-1">
          <Button variant="subtle" size="sm" className="w-full justify-center">
            {t.dashboard.viewCalendar}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function WeekBars({
  perDay,
  maxDay,
  lang,
}: {
  perDay: { iso: string; count: number }[];
  maxDay: number;
  lang: "es" | "en";
}) {
  const today = todayISO();
  return (
    <div className="mt-2.5 flex items-end gap-1" aria-hidden>
      {perDay.map((day) => {
        const height = day.count > 0 ? Math.max(4, (day.count / maxDay) * 100) : 2;
        return (
          <div key={day.iso} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "w-full rounded-t-sm",
                day.iso === today
                  ? "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : day.count > 0
                    ? "bg-amber-500/40"
                    : "bg-white/[0.06]",
              )}
              style={{ height: `${height}%` }}
            />
            <span
              className={cn(
                "font-mono text-[8px] uppercase",
                day.iso === today ? "text-amber-300" : "text-muted/70",
              )}
            >
              {dayShort(perDay.indexOf(day), lang).slice(0, 2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  icon,
  iconClass,
  value,
  valueClass,
  subtext,
  footer,
}: {
  label: string;
  icon?: React.ReactNode;
  iconClass?: string;
  value: string;
  valueClass?: string;
  subtext?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 shadow-[var(--inset-top)] transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[var(--inset-top),0_4px_20px_rgba(245,158,11,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/40 via-orange-500/15 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">{label}</span>
          <span
            className={cn(
              "font-mono text-2xl font-semibold leading-none",
              valueClass ?? "text-foreground",
            )}
          >
            {value}
          </span>
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
      {footer}
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