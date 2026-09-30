import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { LangSwitch } from "@/components/auth/lang-switch";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]">
        <div className="aurora absolute inset-0 overflow-hidden">
          <div className="aurora-blob aurora-blob--a" />
          <div className="aurora-blob aurora-blob--b" />
          <div className="aurora-blob aurora-blob--c" />
        </div>
        <div className="glow-mask absolute inset-0" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <LangSwitch />
      </header>
      <main className="relative z-10 grid flex-1 place-items-center px-4 pb-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}