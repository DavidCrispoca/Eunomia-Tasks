"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, Plus, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useUi } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { t, lang, toggleLanguage } = useLanguage();
  const { openCreateTask } = useUi();

  const items = [
    { href: "/kanban", label: t.nav.kanban, icon: FolderKanban },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  ];

  return (
    <aside className="surface-gold-gradient relative flex h-full w-[224px] shrink-0 flex-col border-r border-white/10">
      <div className="glow-mask pointer-events-none absolute inset-0" />
      <div className="relative px-4 pb-2 pt-5">
        <Link href="/kanban">
          <Logo />
        </Link>
      </div>

      <nav className="relative mt-4 flex flex-col gap-1 px-2.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors",
                active
                  ? "border border-amber-500/20 bg-amber-500/10 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.08)]"
                  : "border border-transparent text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
              )}
              <item.icon
                size={15}
                className={cn("shrink-0", active && "text-amber-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-auto flex flex-col gap-0.5 border-t border-white/10 px-2.5 py-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:border-amber-500/25 hover:bg-amber-500/5 hover:text-foreground"
        >
          <Search size={14} />
          {t.common.search}
          <kbd className="ml-auto rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-amber-200/80">
            ⌘K
          </kbd>
        </button>
        <SidebarRow
          icon={
            <span className="rounded bg-gradient-to-br from-amber-400 to-orange-600 px-1 text-[9px] font-bold text-black">
              {lang === "es" ? "EN" : "ES"}
            </span>
          }
          label={lang === "es" ? "English" : "Español"}
          onClick={toggleLanguage}
        />
        <Button
          variant="primary"
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={() => openCreateTask()}
        >
          <Plus size={14} />
          {t.kanban.newTask}
        </Button>
      </div>
    </aside>
  );
}

function SidebarRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/5 hover:text-foreground"
    >
      <span className="grid w-5 place-items-center">{icon}</span>
      {label}
    </button>
  );
}