"use client";

import { useLanguage } from "@/lib/i18n";

export function LangSwitch() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex min-h-[44px] items-center gap-2 rounded-full surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <span className="grid h-5 w-5 place-items-center rounded-md bg-brand text-[9px] font-bold text-white">
        {lang === "es" ? "EN" : "ES"}
      </span>
      <span className="hidden sm:inline">
        {lang === "es" ? "English" : "EspaÃ±ol"}
      </span>
    </button>
  );
}