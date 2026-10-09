"use client";

import { useMemo } from "react";
import { endOfWeek, format, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { CheckCircle2, Clock, Flame, ListTodo } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { Mascot } from "@/components/mascot/mascot";
import { cn } from "@/lib/utils";

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface surface-hover flex flex-col gap-1 rounded-xl p-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      <span className="text-tabular text-xl font-semibold text-foreground">{value}</span>
      <span className="text-[11px] text-muted">{hint}</span>
    </div>
  );
}

export function WeeklyReport() {
  const { tasks, groups } = useData();
  const { t, lang } = useLanguage();
  const locale = lang === "es" ? es : enUS;

  const data = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const completedThisWeek = tasks.filter(
      (task) => task.completedAt && parseISO(task.completedAt) >= weekStart,
    ).length;

    const pending = tasks.filter((task) => task.status !== "done").length;

    const days = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      const count = tasks.filter(
        (task) => task.completedAt && isSameDay(parseISO(task.completedAt), day),
      ).length;
      return { day, count };
    });
    const maxCount = Math.max(1, ...days.map((d) => d.count));

    const focusTotal = tasks.reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0);
    const focusByGroup = groups
      .map((group) => ({
        name: group.name,
        minutes: tasks
          .filter((task) => task.groupId === group.id)
          .reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0),
      }))
      .filter((entry) => entry.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 4);

    return {
      completedThisWeek,
      pending,
      days,
      maxCount,
      focusTotal,
      focusByGroup,
      range: `${format(weekStart, "d MMM", { locale })} – ${format(weekEnd, "d MMM", { locale })}`,
    };
  }, [tasks, groups, locale]);

  const mascotState = data.completedThisWeek > 0 ? "work" : "sleep";

  return (
    <div className="flex flex-col gap-4">
      <div className="surface flex flex-col gap-4 rounded-xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-wide text-muted">
              {t.report.week}
            </span>
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              {data.range}
            </h2>
            <p className="max-w-[46ch] text-[13px] text-muted">{t.report.narrative}</p>
          </div>
          <Mascot state={mascotState} size={92} title={t.report.mascotAlt} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            icon={<CheckCircle2 size={12} />}
            label={t.report.completed}
            value={String(data.completedThisWeek)}
            hint={t.report.completedHint}
          />
          <KpiCard
            icon={<ListTodo size={12} />}
            label={t.report.pending}
            value={String(data.pending)}
            hint={t.report.pendingHint}
          />
          <KpiCard
            icon={<Clock size={12} />}
            label={t.report.focus}
            value={`${data.focusTotal} min`}
            hint={t.report.focusHint}
          />
          <KpiCard
            icon={<Flame size={12} />}
            label={t.report.classes}
            value={String(data.focusByGroup.length)}
            hint={t.report.classesHint}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface flex flex-col gap-3 rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-foreground">{t.report.rhythm}</h3>
          <div className="flex items-end justify-between gap-2" style={{ height: 132 }}>
            {data.days.map((entry) => (
              <div key={entry.day.toISOString()} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-md bg-brand/70"
                    style={{ height: `${Math.max(6, (entry.count / data.maxCount) * 100)}%` }}
                    title={String(entry.count)}
                  />
                </div>
                <span className="text-[10px] text-muted">
                  {format(entry.day, "EEEEE", { locale })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface flex flex-col gap-3 rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-foreground">{t.report.byClass}</h3>
          {data.focusByGroup.length === 0 ? (
            <p className="text-[13px] text-muted">{t.report.byClassEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.focusByGroup.map((entry) => {
                const pct = Math.round((entry.minutes / data.focusTotal) * 100);
                return (
                  <li key={entry.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-foreground">{entry.name}</span>
                      <span className="text-tabular text-muted">{entry.minutes} min</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={cn("mt-auto rounded-lg border border-dashed border-border p-2.5",
            "text-[11px] text-muted")}>
            {t.report.nextGoal}: <span className="text-foreground">{t.report.nextGoalHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
