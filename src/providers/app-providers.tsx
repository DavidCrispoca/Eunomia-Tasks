"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/providers/data-provider";
import { UiProvider } from "@/providers/ui-provider";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/provider";
import type { AppUser } from "@/types";

export function AppProviders({
  initialUser,
  children,
}: {
  initialUser?: AppUser | null;
  children: ReactNode;
}) {
  return (
    <LanguageProvider>
      <AuthProvider initialUser={initialUser}>
        <DataProvider>
          <UiProvider>{children}</UiProvider>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}