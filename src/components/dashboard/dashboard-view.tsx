"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Clock,
  Flame,
  ListTodo,
  Sparkles,
  Timer,
} from "lucide-react";
import type { Task, TimeBlock } from "@/types";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import {
  addDays,
  dayFull,
  dayShort,
  formatShortDate,
  startOfWeek,
  weekdayOf,
} from "@/lib/date";
import { toISODate, todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-amber-300/70",
  medium: "bg-amber-400",
  high: "bg-orange-500",
};

const BLOCK_DOT: Record<NonNullable<TimeBlock["color"]>, string> = {
  default: "text-amber-200",
  green: "text-emerald-300",
  orange: "text-orange-300",
  red: "text-[#ff8a4d]",
  blue: "text-amber-100",
};

interface DeadlineRow {
  id: string;
  title: string;
  dueDate: string;
  priority: Task["priority"];
  kind: "overdue" | "today" | "tomorrow" | "upcoming";
  badge: string;
  time?: string;
}

export function DashboardView() {
  const { tasks, blocks, groups } = useData();
  const { t, lang } = useLanguage();

  const data = useMemo(() => {
    const today = todayISO();
    const weekStart = startOfWeek(today);
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(addDays(weekStart, 6));

    const pending = tasks.filter((task) => task.status !== "done");
    const completed = tasks.filter((task) => task.status === "done");
    const completedToday = completed.filter(
      (task) => task.completedAt?.slice(0, 10) === today,
    ).length;

    const dueToday = tasks.filter((task) => task.dueDate === today);
    const dueTodayDone = dueToday.filter((task) => task.status === "done").length;

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

    const overdue = pending.filter((task) => task.dueDate && task.dueDate < today);

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
          time: blocks.find((b) => b.taskId === task.id)?.start,
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

    const todayBlocks = blocks
      .filter((b) => b.date === today)
      .sort((a, b) => (a.start < b.start ? -1 : 1));

    const classFocus = [
      ...groups
        .map((group) => ({
          id: group.id,
          name: group.name,
          minutes: tasks.reduce(
            (sum, task) =>
              task.groupId === group.id
                ? sum + (task.focusMinutes ?? 0)
                : sum,
            0,
          ),
        }))
        .filter((c) => c.minutes > 0),
      {
        id: "__personal",
        name: t.group.personal,
        minutes: tasks
          .filter((task) => !task.groupId)
          .reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0),
      },
    ]
      .filter((c) => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    return {
      pendingCount: pending.length,
      overdueCount: overdue.length,
      pendingThisWeek: pendingThisWeek.length,
      completedToday,
      dueToday: dueToday.length,
      dueTodayDone,
      todayBlocks,
      perDay,
      maxDay,
      deadlines,
      hasTasks: tasks.length > 0,
      classFocus,
    };
  }, [tasks, blocks, t, groups]);

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
      <GlassCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.common.today}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-amber-100/95">
                {dayFull(weekdayOf(todayISO()), lang)},{" "}
                {formatShortDate(todayISO(), lang)}
              </h2>
              {data.completedToday > 0 && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-emerald-300">
                  {data.completedToday} {t.dashboard.completedToday}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              {data.dueToday === 0
                ? t.dashboard.nothingToday
                : `${data.dueTodayDone} ${t.dashboard.completedToday}`}
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-muted">{t.dashboard.focus}</span>
              <span className="shrink-0 font-mono text-amber-200">
                {data.dueToday === 0
                  ? t.dashboard.nothingToday
                  : t.dashboard.todayProgress(data.dueTodayDone, data.dueToday)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-500 ease-out-expo"
                style={{
                  width: data.dueToday > 0 ? `${(data.dueTodayDone / data.dueToday) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {data.overdueCount > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#ff4500]/25 bg-[#ff4500]/[0.06] px-3 py-2 text-[12.5px] text-[#ff8a4d]">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="min-w-0 flex-1">{t.dashboard.overdueAlert(data.overdueCount)}</span>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t.dashboard.pending}
          icon={<ListTodo size={18} />}
          iconClass="bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          value={String(data.pendingCount)}
          valueClass="text-amber-200"
        />
        <KpiCard
          label={t.dashboard.overdueLabel}
          icon={<AlertTriangle size={18} />}
          iconClass="bg-gradient-to-br from-[#ff4500] to-orange-600 text-white shadow-[0_0_14px_rgba(255,69,0,0.45)]"
          value={String(data.overdueCount)}
          valueClass={data.overdueCount > 0 ? "text-[#ff8a4d]" : "text-foreground"}
          subtext={t.dashboard.overdueHint}
        />
        <KpiCard
          label={t.dashboard.thisWeek}
          icon={<Timer size={18} />}
          iconClass="bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          value={String(data.pendingThisWeek)}
          valueClass="text-amber-200"
        />
        <KpiCard
          label={t.dashboard.todayBlocks}
          icon={<CalendarClock size={18} />}
          iconClass="bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          value={String(data.todayBlocks.length)}
          valueClass="text-amber-200"
          subtext={data.todayBlocks.length === 0 ? t.dashboard.noBlocksToday : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <CardHeader icon={<CheckCheck size={13} />} iconClass="text-emerald-300" title={t.dashboard.deadlines} />
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
                  {row.time && (
                    <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] text-muted/80 sm:flex">
                      <Clock size={10} />
                      {row.time}
                    </span>
                  )}
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

        <div className="flex flex-col gap-4">
          <GlassCard>
            <CardHeader icon={<Timer size={13} />} iconClass="text-amber-300" title={t.dashboard.weekLoad} />
            <WeekBars perDay={data.perDay} maxDay={data.maxDay} lang={lang} />
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-muted">
              <span>
                {data.pendingThisWeek} {t.dashboard.thisWeek.toLowerCase()}
              </span>
            </div>
          </GlassCard>

          <GlassCard>
            <CardHeader
              icon={<Clock size={13} />}
              iconClass="text-amber-300"
              title={t.dashboard.focusByClass}
            />
            <p className="mb-3 mt-[-6px] text-[11px] leading-snug text-muted/80">
              {t.dashboard.focusByClassHint}
            </p>
            {data.classFocus.length === 0 ? (
              <p className="py-5 text-center text-xs text-muted">
                {t.dashboard.focusEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.classFocus.slice(0, 4).map((entry, index) => {
                  const max = data.classFocus[0].minutes;
                  const isTop = index === 0;
                  return (
                    <li key={entry.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex min-w-0 items-center gap-1 truncate text-[12.5px]",
                            isTop ? "font-semibold text-amber-200" : "text-muted",
                          )}
                        >
                          {isTop && (
                            <Flame size={11} className="shrink-0 text-orange-400" aria-hidden />
                          )}
                          <span className="truncate">{entry.name}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-amber-100/90">
                          {entry.minutes} {t.calendar.minutes}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out-expo",
                            isTop
                              ? "bg-gradient-to-r from-amber-400 to-orange-500"
                              : "bg-amber-500/40",
                          )}
                          style={{
                            width: `${Math.max(4, (entry.minutes / max) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="h-full">
            <CardHeader icon={<CalendarClock size={13} />} iconClass="text-amber-300" title={t.dashboard.todayBlocks} />
            {data.todayBlocks.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                {t.dashboard.noBlocksToday}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.todayBlocks.slice(0, 6).map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80",
                        BLOCK_DOT[block.color ?? "default"],
                      )}
                      aria-hidden
                    />
                    <span className="shrink-0 font-mono text-[10.5px] text-muted">
                      {block.start}–{block.end}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground/90">
                      {block.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>

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
    <div className="flex h-16 items-end gap-1.5 pt-1" aria-hidden>
      {perDay.map((day) => {
        const barHeight =
          day.count > 0 ? Math.max(6, (day.count / maxDay) * 30) : 3;
        const isToday = day.iso === today;
        return (
          <div
            key={day.iso}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span
              className={cn(
                "font-mono text-[8px] leading-none",
                isToday ? "text-amber-300" : "text-muted/70",
              )}
            >
              {day.count > 0 ? day.count : ""}
            </span>
            <span
              className={cn(
                "w-full rounded-t-sm",
                isToday
                  ? "bg-gradient-to-t from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : day.count > 0
                    ? "bg-amber-500/40"
                    : "bg-white/[0.06]",
              )}
              style={{ height: `${barHeight}px` }}
            />
            <span
              className={cn(
                "font-mono text-[8px] uppercase leading-none",
                isToday ? "text-amber-300" : "text-muted/70",
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
}: {
  label: string;
  icon?: React.ReactNode;
  iconClass?: string;
  value: string;
  valueClass?: string;
  subtext?: string;
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

function CardHeader({
  title,
  icon,
  iconClass,
}: {
  title: string;
  icon?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-tight">
      <span
        className={cn(
          "grid h-5 w-5 place-items-center rounded-md border border-white/10 bg-white/[0.04]",
          iconClass,
        )}
      >
        {icon}
      </span>
      {title}
    </h3>
  );
}