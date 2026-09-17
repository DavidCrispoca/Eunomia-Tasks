"use client";

import { useLanguage } from "@/lib/i18n";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-gold-gradient">{t.dashboard.title}</span>
        </h1>
        <p className="text-[13px] text-muted">{t.dashboard.subtitle}</p>
      </header>
      <DashboardView />
    </section>
  );
}