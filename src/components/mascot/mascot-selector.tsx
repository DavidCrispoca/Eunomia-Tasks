"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useMascot } from "@/lib/mascot/provider";
import { Mascot } from "@/components/mascot/mascot";
import {
  MASCOT_SPECIES,
  MASCOT_STAGES,
  type MascotSpecies,
  type MascotStage,
} from "@/lib/mascot/types";
import { cn } from "@/lib/utils";

/**
 * Selector de mascota de la barra superior. Permite elegir entre las tres
 * especies (Pegaso, Lechuza, Fénix) y su etapa de evolución (Bebé, Joven,
 * Adulto). La preferencia se guarda en `localStorage` (`eunomia:mascot`).
 */
export function MascotSelector({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { species, stage, setSpecies, setStage } = useMascot();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t.mascot.openMenu}
        className={cn(
          "flex h-9 max-md:h-11 items-center gap-1.5 rounded-full border border-white/10 bg-surface-2 pl-1 pr-2.5 text-[13px] transition-all duration-200 ease-out-expo hover:border-violet-500/30 hover:bg-surface-hover active:translate-y-px active:scale-[0.98] active:duration-75",
          open && "border-violet-500/40 bg-surface-hover",
          className,
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-1">
          <Mascot species={species} stage={stage} size={26} />
        </span>
        <span className="hidden font-medium text-foreground sm:block">{t.mascot.label}</span>
        <ChevronDown
          size={13}
          className={cn(
            "shrink-0 text-muted transition-transform duration-200 ease-out-expo",
            open && "rotate-180 text-violet-300",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="surface-raised absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right overflow-hidden rounded-xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <div className="border-b border-white/10 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t.mascot.label}
              </p>
            </div>

            <div className="p-1.5">
              {MASCOT_SPECIES.map((sp: MascotSpecies) => {
                const active = sp === species;
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSpecies(sp)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-all duration-200 ease-out-expo active:scale-[0.98] active:duration-75",
                      active
                        ? "bg-violet-500/[0.10] text-foreground"
                        : "text-foreground hover:bg-violet-500/[0.08]",
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-1">
                      <Mascot species={sp} stage={stage} size={30} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {t.mascot.species[sp]}
                    </span>
                    {active && <Check size={15} className="shrink-0 text-violet-300" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-2.5">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t.mascot.stageLabel}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {MASCOT_STAGES.map((stg: MascotStage) => {
                  const active = stg === stage;
                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setStage(stg)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-[10px] px-2 py-1.5 text-[12px] font-medium transition-all duration-200 ease-out-expo active:scale-[0.98] active:duration-75",
                        active
                          ? "bg-brand text-white"
                          : "surface text-muted hover:bg-surface-hover hover:text-foreground",
                      )}
                    >
                      {t.mascot.stages[stg]}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
