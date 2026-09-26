"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PomodoroSession } from "@/components/pomodoro/pomodoro-session";

export default function PomodoroPage() {
  const params = useParams();
  const taskId = typeof params.taskId === "string" ? params.taskId : "";
  const { tasks } = useData();
  const { t } = useLanguage();

  const task = tasks.find((item) => item.id === taskId);

  if (!task || task.status === "done") {
    return (
      <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-12 text-center shadow-[var(--inset-top)]">
        <p className="max-w-sm text-sm text-muted">
          {t.pomodoro.taskMissingHint}
        </p>
        <Link href="/kanban">
          <Button variant="primary" size="lg" className="min-h-[48px]">
            <ArrowLeft size={14} />
            {t.pomodoro.backToBoard}
          </Button>
        </Link>
      </section>
    );
  }

  return <PomodoroSession task={task} />;
}