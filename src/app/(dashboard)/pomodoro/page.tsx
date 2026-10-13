"use client";

import { ActivityModePanel } from "@/components/nfc/activity-mode-panel";

export default function ModesPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col py-2">
      <ActivityModePanel />
    </section>
  );
}
