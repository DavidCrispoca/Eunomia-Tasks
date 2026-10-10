"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Language } from "@/types";
import es from "@/lib/i18n/dictionaries/es";
import en from "@/lib/i18n/dictionaries/en";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import {
  localStorageStore,
  subscribeStore,
} from "@/lib/storage/local-storage-store";
import { saveUserLanguage } from "@/lib/data/actions";

interface LanguageContextValue {
  lang: Language;
  t: Dictionary;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  syncToCloud = false,
  initialLanguage = "es",
  children,
}: {
  syncToCloud?: boolean;
  initialLanguage?: Language;
  children: ReactNode;
}) {
  // `useSyncExternalStore` con `getServerSnapshot` garantiza que la hidratación
  // siempre rinde el idioma del servidor (sin mismatches: se evita el flag
  // global compartido que adelantaba el valor guardado a límites aún por
  // hidratar). El idioma persistido se aplica justo tras hidratar. Solo hay un
  // consumidor (este provider), así que no hay carrera entre instancias.
  const getSnapshot = useCallback(
    () => localStorageStore.loadLanguage() ?? initialLanguage,
    [initialLanguage],
  );
  const getServerSnapshot = useCallback(() => initialLanguage, [initialLanguage]);
  const lang = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!syncToCloud) return;
    void saveUserLanguage(lang);
  }, [lang, syncToCloud]);

  const setLanguage = useCallback(
    (next: Language) => {
      localStorageStore.saveLanguage(next);
    },
    [],
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === "es" ? "en" : "es");
  }, [lang, setLanguage]);

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