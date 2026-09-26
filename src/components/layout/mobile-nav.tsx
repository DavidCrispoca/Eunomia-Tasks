"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, House, Plus } from "lucide-react";
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
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-2 border-t border-white/10 bg-[#0b0c0f]/85 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75",
              active ? "text-amber-300" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            )}
            <item.icon size={20} />
            <span className="whitespace-nowrap text-[11px]">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => openCreateTask()}
        className="flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 font-semibold text-black shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75"
      >
        <Plus size={18} strokeWidth={2.5} className="shrink-0" />
        <span className="whitespace-nowrap text-sm">{t.kanban.newTask}</span>
      </button>
    </nav>
  );
}