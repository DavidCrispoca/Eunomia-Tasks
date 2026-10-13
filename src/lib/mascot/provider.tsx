"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  readMascotRaw,
  saveMascot,
  subscribeStore,
} from "@/lib/storage/local-storage-store";
import {
  DEFAULT_MASCOT,
  parseMascot,
  type MascotSelection,
  type MascotSpecies,
  type MascotStage,
} from "@/lib/mascot/types";

interface MascotContextValue extends MascotSelection {
  setMascot: (selection: MascotSelection) => void;
  setSpecies: (species: MascotSpecies) => void;
  setStage: (stage: MascotStage) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: ReactNode }) {
  // Se lee el string crudo como snapshot (identidad estable entre renders) y se
  // hidrata con el default en el servidor, evitando mismatches de hidratación
  // —mismo patrón que `LanguageProvider`.
  const raw = useSyncExternalStore(subscribeStore, readMascotRaw, () => "");
  const selection = useMemo(() => parseMascot(raw) ?? DEFAULT_MASCOT, [raw]);

  const setMascot = useCallback((next: MascotSelection) => saveMascot(next), []);
  const setSpecies = useCallback(
    (species: MascotSpecies) => saveMascot({ ...selection, species }),
    [selection],
  );
  const setStage = useCallback(
    (stage: MascotStage) => saveMascot({ ...selection, stage }),
    [selection],
  );

  const value = useMemo<MascotContextValue>(
    () => ({ ...selection, setMascot, setSpecies, setStage }),
    [selection, setMascot, setSpecies, setStage],
  );

  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
}

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error("useMascot must be used within MascotProvider");
  }
  return ctx;
}
