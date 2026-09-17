"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/providers/data-provider";
import { UiProvider } from "@/providers/ui-provider";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/provider";
import type { AppUser } from "@/types";
import type { CloudData } from "@/lib/data/mappers";

export function AppProviders({
  initialUser,
  initialData,
  children,
}: {
  initialUser?: AppUser | null;
  initialData?: CloudData | null;
  children: ReactNode;
}) {
  return (
    <LanguageProvider syncToCloud={Boolean(initialData)}>
      <AuthProvider initialUser={initialUser}>
        <DataProvider initialData={initialData ?? null}>
          <UiProvider>{children}</UiProvider>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}