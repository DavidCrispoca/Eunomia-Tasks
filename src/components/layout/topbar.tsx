"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, Plus, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useUi } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { lang, toggleLanguage, t } = useLanguage();
  const { openCreateTask } = useUi();

  const links = [
    { href: "/kanban", label: t.nav.kanban, icon: FolderKanban },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#090a0c]/70 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 lg:hidden">
        <Logo className="[&>span:last-child]:hidden" />
      </div>

      <nav className="flex items-center gap-1 lg:hidden">
        {links.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-[13px] transition-colors",
                active
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              <item.icon size={14} className={cn(active && "text-amber-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onOpenPalette}
        className="ml-auto flex h-8 w-full max-w-[320px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[13px] text-muted backdrop-blur transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-foreground lg:ml-0"
      >
        <Search size={13} />
        <span className="truncate">{t.common.search}</span>
        {lang === "es" && (
          <kbd className="ml-auto hidden rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-amber-200/80 sm:inline">
            ⌘K
          </kbd>
        )}
      </button>

      <div className="ml-auto flex items-center gap-1 lg:ml-2">
        <Button variant="ghost" size="icon" onClick={toggleLanguage} aria-label={t.common.language}>
          <span className="rounded bg-gradient-to-br from-amber-400 to-orange-600 px-1 py-px text-[9px] font-bold uppercase text-black">
            {lang === "es" ? "EN" : "ES"}
          </span>
        </Button>
        <Button variant="primary" size="sm" onClick={() => openCreateTask()} className="ml-1">
          <Plus size={14} />
          <span className="hidden sm:inline">{t.kanban.newTask}</span>
        </Button>
      </div>
    </header>
  );
}