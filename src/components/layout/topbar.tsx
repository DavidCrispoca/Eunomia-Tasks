"use client";

import { Plus, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useUi } from "@/providers/ui-provider";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const { openCreateTask } = useUi();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-white/[0.04] px-3 backdrop-blur-xl sm:px-4">
      <div className="flex items-center lg:hidden">
        <Logo className="[&>span:last-child]:hidden" />
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-9 max-md:h-11 w-full min-w-0 max-w-[300px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-[13px] text-muted shadow-[inset_2px_2px_6px_rgba(0,0,0,0.25)] backdrop-blur transition-all duration-200 ease-out-expo hover:border-violet-500/35 hover:bg-violet-500/5 hover:text-foreground active:scale-[0.99] active:duration-75"
      >
        <Search size={13} />
        <span className="truncate">{t.common.search}</span>
        {lang === "es" && (
          <kbd className="ml-auto hidden rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-violet-300/90 sm:inline">
            âŒ˜K
          </kbd>
        )}
      </button>

      <div className="ml-auto flex items-center gap-1 max-md:gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          aria-label={t.common.language}
        >
          <span className="rounded bg-gradient-to-br from-violet-600 to-indigo-600 px-1 py-px text-[9px] font-bold uppercase text-white shadow-[0_2px_8px_rgba(63,118,216,0.4)]">
            {lang === "es" ? "EN" : "ES"}
          </span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openCreateTask()}
          className="ml-1 hidden lg:inline-flex"
        >
          <Plus size={14} />
          <span>{t.kanban.newTask}</span>
        </Button>
        <AccountMenu />
      </div>
    </header>
  );
}