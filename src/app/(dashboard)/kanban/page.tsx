"use client";

import { useLanguage } from "@/lib/i18n";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function KanbanPage() {
  const { t } = useLanguage();

  return (
    <section className="flex h-full min-h-0 flex-col gap-5 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
          <span className="text-gold-gradient">{t.kanban.title}</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-muted">{t.kanban.subtitle}</p>
      </header>
      <KanbanBoard />
    </section>
  );
}