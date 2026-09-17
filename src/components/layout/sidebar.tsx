"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderKanban,
  House,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/provider";
import { logout } from "@/lib/auth/actions";
import { useUi } from "@/providers/ui-provider";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ConnectPanel } from "@/components/connect/connect-panel";

export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { t, lang, toggleLanguage } = useLanguage();
  const { user } = useAuth();
  const { openCreateTask } = useUi();

  const displayName = user?.name ?? user?.email ?? "";
  const initial = (displayName.charAt(0) || "?").toUpperCase();

  const items = [
    { href: "/", label: t.nav.home, icon: House },
    { href: "/kanban", label: t.nav.kanban, icon: FolderKanban },
    { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="surface-gold-gradient relative flex h-full w-[224px] shrink-0 flex-col border-r border-white/10">
      <div className="glow-mask pointer-events-none absolute inset-0" />
      <div className="relative px-4 pb-2 pt-5">
        <Link href="/">
          <Logo />
        </Link>
      </div>

      <nav className="relative mt-4 flex flex-col gap-1 px-2.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition-all duration-200 ease-out-expo",
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

      <ConnectPanel />

      <div className="relative mt-auto flex flex-col gap-0.5 border-t border-white/10 px-2.5 py-3">
        <div className="mb-1 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-black">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {displayName}
            </p>
            {user?.demo && (
              <p className="truncate text-[10px] text-amber-200/70">
                {t.auth.demoBadge}
              </p>
            )}
          </div>
          {user && (
            <form action={logout}>
              <button
                type="submit"
                title={t.auth.logout}
                aria-label={t.auth.logout}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-danger"
              >
                <LogOut size={13} />
              </button>
            </form>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[13px] text-muted transition-all duration-200 ease-out-expo hover:border-amber-500/25 hover:bg-amber-500/5 hover:text-foreground active:scale-[0.99] active:duration-75"
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
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-all duration-200 ease-out-expo hover:bg-white/5 hover:text-foreground active:scale-[0.99] active:duration-75"
    >
      <span className="grid w-5 place-items-center">{icon}</span>
      {label}
    </button>
  );
}