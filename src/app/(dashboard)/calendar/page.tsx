"use client";

import { useLanguage } from "@/lib/i18n";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  const { t } = useLanguage();

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-gold-gradient">{t.calendar.title}</span>
        </h1>
        <p className="text-[13px] text-muted">{t.calendar.subtitle}</p>
      </header>
      <CalendarView />
    </section>
  );
}