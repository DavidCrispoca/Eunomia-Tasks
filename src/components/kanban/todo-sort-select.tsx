"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import type { TodoSort } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface TodoSortSelectProps {
  value: TodoSort;
  onChange: (sort: TodoSort) => void;
}

const OPTIONS: TodoSort[] = [
  "manual",
  "dueAsc",
  "dueDesc",
  "createdDesc",
  "createdAsc",
];

export function TodoSortSelect({ value, onChange }: TodoSortSelectProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = value !== "manual";

  const labels: Record<TodoSort, string> = {
    manual: t.kanban.sortManual,
    dueAsc: t.kanban.sortDueAsc,
    dueDesc: t.kanban.sortDueDesc,
    createdDesc: t.kanban.sortCreatedDesc,
    createdAsc: t.kanban.sortCreatedAsc,
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(sort: TodoSort) {
    onChange(sort);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative ml-auto shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.kanban.sortHint}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75",
          active
            ? "border-violet-500/50 bg-violet-500/15 text-violet-200 shadow-[0_4px_14px_rgba(90,140,240,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:bg-white/[0.06] hover:text-foreground",
        )}
      >
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          className={cn(
            "transition-transform duration-200 ease-out-expo",
            open && "rotate-180",
            active && "text-violet-300",
          )}
        />
        <span className="max-w-[120px] truncate">{labels[value]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl glass-deep shadow-[0_14px_38px_rgba(0,0,0,0.6)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/70 via-indigo-500/35 to-transparent" />
            <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
              {t.kanban.sortHint}
            </p>
            <div className="p-1">
              {OPTIONS.map((option) => {
                const selected = value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => select(option)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors duration-150 ease-out-expo hover:bg-violet-500/10 hover:text-violet-200 active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate transition-colors",
                        selected ? "font-medium text-violet-200" : "text-foreground",
                      )}
                    >
                      {labels[option]}
                    </span>
                    <span
                      className={cn(
                        "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border transition-all duration-200 ease-out-expo",
                        selected
                          ? "border-transparent bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_0_10px_rgba(63,118,216,0.4)]"
                          : "border-white/15",
                      )}
                    >
                      {selected && <Check size={9} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}