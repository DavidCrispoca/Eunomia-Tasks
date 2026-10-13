"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useGamification } from "@/providers/gamification-provider";
import { useData } from "@/providers/data-provider";
import {
  loadActiveSession,
  loadModes,
  loadRecentSessions,
  loadGroupSessionMinutes,
  assignActiveSessionGroup,
  toggleMode,
} from "@/lib/nfc/actions";
import {
  NFC_MODES,
  type ActivityModeView,
  type NfcSessionSource,
  type NfcSessionView,
  type ToggleResult,
} from "@/lib/nfc/types";

interface NfcContextValue {
  modes: ActivityModeView[];
  /** Sesión de actividad abierta (modo activo), o null. */
  active: NfcSessionView | null;
  /** Últimas sesiones cerradas (tiempo registrado por modo). */
  sessions: NfcSessionView[];
  groupMinutes: Record<string, number>;
  groups: ReturnType<typeof useData>["groups"];
  assignGroup: (groupId: string | null) => Promise<boolean>;
  /** Hay una operación de activación/desactivación en curso. */
  busy: boolean;
  /** Activa/desactiva un modo por código o por token de tarjeta. */
  toggle: (input: {
    modeCode?: string;
    token?: string;
    source?: NfcSessionSource;
  }) => Promise<ToggleResult | null>;
  refreshActive: () => Promise<void>;
}

const NfcContext = createContext<NfcContextValue | null>(null);

export function NfcProvider({ children }: { children: ReactNode }) {
  const { applyAward } = useGamification();
  const { groups } = useData();
  const [modes, setModes] = useState<ActivityModeView[]>(NFC_MODES);
  const [active, setActive] = useState<NfcSessionView | null>(null);
  const [sessions, setSessions] = useState<NfcSessionView[]>([]);
  const [groupMinutes, setGroupMinutes] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadModes().then((next) => {
      if (alive && next.length > 0) setModes(next);
    });
    void loadActiveSession().then((next) => {
      if (alive) setActive(next);
    });
    void loadRecentSessions().then((next) => {
      if (alive) setSessions(next);
    });
    void loadGroupSessionMinutes().then((next) => {
      if (alive) setGroupMinutes(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshActive = useCallback(async () => {
    setActive(await loadActiveSession());
  }, []);

  const assignGroup = useCallback(async (groupId: string | null) => {
    const ok = await assignActiveSessionGroup(groupId);
    if (ok) {
      setActive(await loadActiveSession());
      setGroupMinutes(await loadGroupSessionMinutes());
    }
    return ok;
  }, []);

  const toggle = useCallback<NfcContextValue["toggle"]>(
    async (input) => {
      setBusy(true);
      try {
        const result = await toggleMode(input);
        if (result?.ok) {
          setActive(result.action === "ended" ? null : result.session);
          setSessions(await loadRecentSessions());
          setGroupMinutes(await loadGroupSessionMinutes());
          applyAward(result.award);
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [applyAward],
  );

  const value = useMemo<NfcContextValue>(
    () => ({ modes, active, sessions, groupMinutes, groups, assignGroup, busy, toggle, refreshActive }),
    [modes, active, sessions, groupMinutes, groups, assignGroup, busy, toggle, refreshActive],
  );

  return <NfcContext.Provider value={value}>{children}</NfcContext.Provider>;
}

export function useNfc() {
  const ctx = useContext(NfcContext);
  if (!ctx) {
    throw new Error("useNfc must be used within NfcProvider");
  }
  return ctx;
}
