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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 border-t border-white/10 bg-[#0b0c0f]/85 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10.5px] transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75",
              active ? "text-amber-300" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            )}
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => openCreateTask()}
        className="ml-1 flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1.5 font-semibold text-black shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75"
      >
        <Plus size={16} strokeWidth={2.5} className="shrink-0" />
        <span className="whitespace-nowrap text-[11px]">{t.kanban.newTask}</span>
      </button>
    </nav>
  );
}