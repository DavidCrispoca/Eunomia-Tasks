"use client";

import { useLanguage } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-violet-500/35 hover:bg-violet-500/5 hover:text-foreground"
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white shadow-[0_2px_8px_rgba(63,118,216,0.4)]">
        {lang === "es" ? "EN" : "ES"}
      </span>
      <span className="hidden sm:inline">
        {lang === "es" ? "English" : "EspaÃ±ol"}
      </span>
    </button>
  );
}