"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command/command-palette";
import { TaskModal } from "@/components/task-modal";
import { PomodoroProvider } from "@/providers/pomodoro-provider";
import { PomodoroChip } from "@/components/pomodoro/pomodoro-chip";
import { useUi } from "@/providers/ui-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PomodoroProvider>
      <div className="flex h-full overflow-hidden">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[320px] glow-mask" />
        <div className="hidden shrink-0 lg:flex">
          <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />
          <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 lg:px-8 lg:pb-7 lg:pt-7">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <MobileNav />

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <TaskModal />
        <PomodoroChip />
        <UrlHandlers />
      </div>
    </PomodoroProvider>
  );
}

function UrlHandlers() {
  const { openCreateTask } = useUi();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("quickadd")) {
      openCreateTask();
    }
  }, [openCreateTask]);
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}