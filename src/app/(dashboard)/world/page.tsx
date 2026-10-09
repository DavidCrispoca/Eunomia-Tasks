"use client";

import { useLanguage } from "@/lib/i18n";
import { CampaignMap } from "@/components/campaign-map/campaign-map";
import { WeeklyReport } from "@/components/weekly-report/weekly-report";
import { GamificationBar } from "@/components/gamification/gamification-bar";
import { AchievementList } from "@/components/gamification/achievement-list";
import { Mascot, MASCOT_STATES } from "@/components/mascot/mascot";

export default function WorldPage() {
  const { t } = useLanguage();

  return (
    <section className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {t.world.pageTitle}
          </h1>
          <span className="chip rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
            {t.world.prototype}
          </span>
        </div>
        <p className="text-xs text-muted sm:text-[13px]">{t.world.subtitle}</p>
        <p className="text-[11px] text-muted/80">{t.world.prototypeNote}</p>
      </header>

      <GamificationBar variant="full" />

      <AchievementList />

      <div className="surface flex flex-col gap-4 rounded-xl p-4">
        <h2 className="text-[13px] font-semibold text-foreground">{t.world.statesTitle}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MASCOT_STATES.map((state) => (
            <div key={state} className="flex flex-col items-center gap-1.5">
              <div className="grid h-24 w-full place-items-center rounded-lg bg-surface-1">
                <Mascot state={state} size={80} />
              </div>
              <span className="text-[11px] text-muted">{t.world.mascot[state]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-foreground">{t.world.mapTitle}</h2>
        <CampaignMap />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-foreground">{t.report.title}</h2>
        <p className="text-[11px] text-muted">{t.report.subtitle}</p>
        <WeeklyReport />
      </div>
    </section>
  );
}
