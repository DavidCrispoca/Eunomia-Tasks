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
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="fixed inset-0 bg-[#03060f]/70 backdrop-blur-lg"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 my-auto w-full max-w-md overflow-hidden rounded-2xl glass shadow-[var(--app-shadow-lg)]",
              className,
            )}
            aria-labelledby={labelledBy}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { y: { type: "spring", stiffness: 380, damping: 30 }, opacity: { duration: 0.24 }, scale: { type: "spring", stiffness: 380, damping: 30 } }
            }
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/70 via-violet-400/45 to-transparent"
              initial={reduceMotion ? {} : { scaleX: 0, opacity: 0 }}
              animate={reduceMotion ? {} : { scaleX: 1, opacity: 1 }}
              transition={
                reduceMotion ? { duration: 0 } : { delay: 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }
              }
              style={{ transformOrigin: "left" }}
            />
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