"use client";

import { useMemo, type ReactNode } from "react";
import { DataProvider } from "@/providers/data-provider";
import { UiProvider } from "@/providers/ui-provider";
import { GamificationProvider } from "@/providers/gamification-provider";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth/provider";
import type { AppUser } from "@/types";
import type { CloudData } from "@/lib/data/mappers";
import type { GamificationSnapshot } from "@/lib/gamification/rules";

export function AppProviders({
  initialUser,
  initialData,
  initialGamification,
  children,
}: {
  initialUser?: AppUser | null;
  initialData?: CloudData | null;
  initialGamification?: GamificationSnapshot | null;
  children: ReactNode;
}) {
  // Ground truth del servidor para no premiar retroactivamente tareas que ya
  // estaban hechas antes de existir la gamificación (independiente del orden
  // de hidratación del almacén local).
  const initialDoneIds = useMemo(
    () =>
      new Set(
        (initialData?.tasks ?? []).filter((t) => t.status === "done").map((t) => t.id),
      ),
    [initialData],
  );

  return (
    <LanguageProvider syncToCloud={Boolean(initialData)}>
      <AuthProvider initialUser={initialUser}>
        <DataProvider initialData={initialData ?? null}>
          <GamificationProvider
            initialData={initialGamification ?? null}
            initialDoneIds={initialDoneIds}
          >
            <UiProvider>{children}</UiProvider>
          </GamificationProvider>
        </DataProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
