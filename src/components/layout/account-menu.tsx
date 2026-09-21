"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { useLanguage } from "@/lib/i18n";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user } = useAuth();
  const { t } = useLanguage();
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

  if (!user) return null;

  const displayName = user.name ?? user.email ?? "";
  const initial = (displayName.charAt(0) || "?").toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t.account.openMenu}
        className={cn(
          "flex h-9 max-md:h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] pl-1.5 pr-2 text-[13px] transition-all duration-200 ease-out-expo hover:border-amber-500/30 hover:bg-amber-500/5 active:scale-[0.98] active:duration-75",
          open && "border-amber-500/30 bg-amber-500/10",
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-black">
          {initial}
        </span>
        <span className="hidden min-w-0 max-w-[120px] truncate font-medium text-foreground lg:block">
          {displayName}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "shrink-0 text-muted transition-transform duration-200 ease-out-expo",
            open && "rotate-180 text-amber-300",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0f]/90 shadow-[var(--inset-top),var(--app-shadow-lg)] backdrop-blur-2xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-orange-500/25 to-transparent" />

            <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-black">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
              {user.demo && (
                <span className="shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  {t.auth.demoBadge}
                </span>
              )}
            </div>

            <div className="p-1.5">
              <form action={logout} className="border-t border-white/10 pt-1.5">
                <AccountMenuItem
                  type="submit"
                  icon={<LogOut size={14} />}
                  label={t.auth.logout}
                  danger
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountMenuItem({
  icon,
  label,
  caption,
  onClick,
  danger,
  type = "button",
}: {
  icon: ReactNode;
  label: string;
  caption?: string;
  onClick?: () => void;
  danger?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-all duration-200 ease-out-expo active:scale-[0.98] active:duration-75",
        danger
          ? "text-muted hover:bg-[#ff4500]/10 hover:text-[#ff6b4a]"
          : "text-foreground hover:bg-amber-500/[0.08]",
      )}
    >
      <span
        className={cn(
          "grid w-4 shrink-0 place-items-center",
          danger ? "text-[#ff4500]" : "text-amber-300/80",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {caption && (
          <span className="block truncate text-[11px] text-muted">{caption}</span>
        )}
      </span>
    </button>
  );
}