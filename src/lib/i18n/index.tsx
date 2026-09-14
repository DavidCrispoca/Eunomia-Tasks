"use client";

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import type { Language } from "@/types";
import es from "@/lib/i18n/dictionaries/es";
import en from "@/lib/i18n/dictionaries/en";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import { LANG_KEY, localStorageStore } from "@/lib/storage/local-storage-store";
import { useSynced } from "@/lib/storage/synced";

interface LanguageContextValue {
  lang: Language;
  t: Dictionary;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSynced<Language>(LANG_KEY, () => "es");

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLanguage = (next: Language) => {
    localStorageStore.saveLanguage(next);
  };

  const toggleLanguage = () => {
    localStorageStore.saveLanguage(lang === "es" ? "en" : "es");
  };

  const value: LanguageContextValue = {
    lang,
    t: lang === "es" ? es : en,
    setLanguage,
    toggleLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}