"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { CalendarDays, Check, FolderKanban, Globe, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useData } from "@/providers/data-provider";
import { useUi } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t, lang, toggleLanguage } = useLanguage();
  const { tasks, updateTask } = useData();
  const { openCreateTask } = useUi();
  const [search, setSearch] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setSearch("");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#090a0c]/85 shadow-[var(--app-shadow-lg)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-orange-500/25 to-transparent" />
        <Command
          label="Command palette"
          shouldFilter
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-amber-200/60 [&_[cmdk-group]]:mt-1 [&_[cmdk-group]:first-of-type]:mt-0"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4">
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={t.command.placeholder}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <kbd className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-amber-200/80">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
              {t.command.noResults}
            </Command.Empty>

            <Command.Group heading={t.nav.kanban}>
              <PaletteItem onSelect={run(() => router.push("/kanban"))}>
                <FolderKanban size={14} className="text-amber-300/80" />
                {t.command.goToKanban}
              </PaletteItem>
            </Command.Group>

            <Command.Group heading={t.nav.calendar}>
              <PaletteItem onSelect={run(() => router.push("/calendar"))}>
                <CalendarDays size={14} className="text-amber-300/80" />
                {t.command.goToCalendar}
              </PaletteItem>
            </Command.Group>

            <Command.Group heading={t.common.add}>
              <PaletteItem onSelect={run(() => openCreateTask())}>
                <Plus size={14} className="text-amber-300/80" />
                {t.command.newTask}
              </PaletteItem>
            </Command.Group>

            <Command.Group heading={t.common.language}>
              <PaletteItem onSelect={run(() => toggleLanguage())}>
                <Globe size={14} className="text-amber-300/80" />
                {t.command.changeLanguage}
                <span className="ml-auto rounded-md border border-amber-500/30 bg-gradient-to-br from-amber-400 to-orange-600 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                  {lang === "es" ? "EN" : "ES"}
                </span>
              </PaletteItem>
            </Command.Group>

            {tasks.length > 0 && (
              <Command.Group heading={t.kanban.title}>
                {tasks.map((task) => (
                  <PaletteItem
                    key={task.id}
                    onSelect={run(() =>
                      updateTask(task.id, {
                        status: task.status === "done" ? "todo" : "done",
                        completedAt:
                          task.status === "done"
                            ? undefined
                            : task.completedAt ?? new Date().toISOString(),
                      }),
                    )}
                    value={`${task.title} ${task.notes ?? ""}`}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                        task.status === "done"
                          ? "border-transparent bg-gradient-to-br from-emerald-400 to-emerald-500 text-black shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          : "border-white/20",
                      )}
                    >
                      {task.status === "done" && <Check size={9} strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        task.status === "done" && "text-muted line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase text-muted">
                      {task.status === "done"
                        ? t.common.today
                        : t.priority[task.priority]}
                    </span>
                  </PaletteItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: (value: string) => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13.5px] text-foreground transition-colors data-[selected=true]:border-amber-500/25 data-[selected=true]:bg-amber-500/10"
    >
      {children}
    </Command.Item>
  );
}