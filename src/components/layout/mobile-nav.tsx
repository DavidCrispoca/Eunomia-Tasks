"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Compass, FolderKanban, House, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useUi } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { openCreateTask } = useUi();

  const items = [
    { href: "/", label: t.nav.home, icon: House },
    { href: "/kanban", label: t.nav.kanban, icon: FolderKanban },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
    { href: "/pomodoro", label: t.nfc.navLabel, icon: Activity },
    { href: "/world", label: t.nav.world, icon: Compass },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-white/[0.08] bg-surface-1 px-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 lg:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={cn(
              "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-xs transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75",
              active ? "text-violet-300" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand" />
            )}
            <item.icon size={20} />
            <span className="w-full overflow-hidden text-ellipsis text-center text-[9px] leading-tight sm:text-[10px]">
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        type="button"
        aria-label={t.kanban.newTask}
        onClick={() => openCreateTask()}
        className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg bg-brand px-0.5 py-1 font-semibold leading-tight text-white shadow-sm transition-all duration-200 ease-out-expo hover:bg-brand-hover active:translate-y-px active:scale-[0.97] active:duration-75"
      >
        <Plus size={18} strokeWidth={2.5} className="shrink-0" />
        <span className="w-full overflow-hidden text-ellipsis text-center text-[9px] sm:text-[10px]">
          {t.kanban.newTask}
        </span>
      </button>
    </nav>
  );
}
