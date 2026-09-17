"use client";

import { useLanguage } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:border-amber-500/25 hover:bg-amber-500/5 hover:text-foreground"
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-amber-400 to-orange-600 text-[9px] font-bold text-black">
        {lang === "es" ? "EN" : "ES"}
      </span>
      <span className="hidden sm:inline">
        {lang === "es" ? "English" : "Español"}
      </span>
    </button>
  );
}