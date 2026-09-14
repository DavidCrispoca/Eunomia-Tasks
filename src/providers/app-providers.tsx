"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/providers/data-provider";
import { UiProvider } from "@/providers/ui-provider";
import { LanguageProvider } from "@/lib/i18n";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <DataProvider>
        <UiProvider>{children}</UiProvider>
      </DataProvider>
    </LanguageProvider>
  );
}