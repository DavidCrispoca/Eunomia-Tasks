"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

export function Modal({ open, onClose, children, className, labelledBy }: ModalProps) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 my-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#090a0c]/80 shadow-[var(--app-shadow-lg)] backdrop-blur-xl",
              className,
            )}
            aria-labelledby={labelledBy}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-orange-500/25 to-transparent" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={16} />
      </Button>
    </div>
  );
}