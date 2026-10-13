"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { endOfWeek, format, isSameDay, parseISO, startOfWeek, subDays } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { CheckCircle2, Clock, Flame, ListTodo, Pencil, Sparkles } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { useGamification } from "@/providers/gamification-provider";
import { awardWeeklyReview } from "@/lib/gamification/actions";
import { isoWeekKey } from "@/lib/week";
import {
  readWeeklyGoal,
  saveWeeklyGoal,
  subscribeStore,
} from "@/lib/storage/local-storage-store";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";
import { cn } from "@/lib/utils";
import { useNfc } from "@/providers/nfc-provider";

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

/** Objetivo de la próxima semana: nota corta persistida por semana ISO. */
function WeeklyGoalEditor({ weekIso }: { weekIso: string }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const getSnapshot = useCallback(() => readWeeklyGoal(weekIso), [weekIso]);
  const getServerSnapshot = useCallback(() => "", []);
  const goal = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  const start = () => {
    setDraft(goal);
    setEditing(true);
  };
  const confirm = () => {
    saveWeeklyGoal(weekIso, draft);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  return (
    <div
      className={cn(
        "mt-auto rounded-lg border border-dashed border-border p-2.5",
        editing ? "flex flex-col gap-2" : "flex items-start justify-between gap-2",
      )}
    >
      {editing ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">
              {t.report.nextGoal}
            </span>
            <textarea
              autoFocus
              rows={2}
              maxLength={160}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  confirm();
                }
                if (event.key === "Escape") cancel();
              }}
              placeholder={t.report.goalPlaceholder}
              className="surface w-full resize-none rounded-md px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              {t.common.cancel}
            </Button>
            <Button variant="subtle" size="sm" onClick={confirm}>
              {t.common.save}
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 text-[11px] text-muted">
            {t.report.nextGoal}:{" "}
            <span className={goal ? "text-foreground" : ""}>
              {goal || t.report.goalPlaceholder}
            </span>
          </span>
          <button
            type="button"
            onClick={start}
            aria-label={t.common.edit}
            title={t.common.edit}
            className="rounded-md p-1 text-muted transition-colors hover:bg-white/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 max-md:min-h-[44px] max-md:min-w-[44px]"
          >
            <Pencil size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export function WeeklyReport() {
  const { tasks, groups } = useData();
  const { groupMinutes } = useNfc();
  const { t, lang } = useLanguage();
  const { serverBacked, snapshot, applyAward } = useGamification();
  const locale = lang === "es" ? es : enUS;
  const [reviewBusy, setReviewBusy] = useState(false);

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

    const focusTotal = tasks.reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0)
      + Object.values(groupMinutes).reduce((sum, minutes) => sum + minutes, 0);
    const focusByGroup = groups
      .map((group) => ({
        name: group.name,
        minutes: tasks
          .filter((task) => task.groupId === group.id)
          .reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0)
          + (groupMinutes[group.id] ?? 0),
      }))
      .filter((entry) => entry.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 4);

    return {
      weekIso: isoWeekKey(weekStart),
      completedThisWeek,
      pending,
      days,
      maxCount,
      focusTotal,
      focusByGroup,
      range: `${format(weekStart, "d MMM", { locale })} – ${format(weekEnd, "d MMM", { locale })}`,
    };
  }, [tasks, groups, locale, groupMinutes]);

  // La revisión de la semana ya hecha se lee de los eventos reales del servidor
  // (kind `weekly_review` con refId = semana ISO en curso).
  const reviewDone = snapshot.events.some(
    (event) => event.kind === "weekly_review" && event.refId === data.weekIso,
  );

  const handleReview = async () => {
    if (reviewBusy || reviewDone || !serverBacked) return;
    setReviewBusy(true);
    try {
      // El servidor calcula la semana; el cliente solo aplica el resultado.
      applyAward(await awardWeeklyReview());
    } finally {
      setReviewBusy(false);
    }
  };

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

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Sparkles size={14} className="text-gold" />
              {t.report.review}
            </span>
            <span className="text-[11px] text-muted">
              {reviewDone
                ? t.report.reviewDoneHint
                : serverBacked
                  ? t.report.reviewHint
                  : t.gamification.localNote}
            </span>
          </div>
          {reviewDone ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium text-teal">
              <CheckCircle2 size={12} />
              {t.report.reviewDone}
            </span>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleReview}
              disabled={reviewBusy || !serverBacked}
            >
              {t.report.reviewCta}
            </Button>
          )}
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
          <WeeklyGoalEditor weekIso={data.weekIso} />
        </div>
      </div>
    </div>
  );
}
