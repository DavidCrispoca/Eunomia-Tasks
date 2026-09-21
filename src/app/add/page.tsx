import type { Metadata } from "next";
import { verifyAction } from "@/lib/notify/signed";
import { Logo } from "@/components/ui/logo";
import { LangSwitch } from "@/components/auth/lang-switch";
import { AddTaskForm } from "@/components/external/add-task-form";

export const metadata: Metadata = {
  title: "Añadir tarea · Eunomia Tasks",
  description:
    "Añade una tarea a tu tablero de Eunomia Tasks desde un enlace firmado de tu correo.",
};

export default async function AddTaskPage(props: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await props.searchParams;
  const payload = await verifyAction(s);
  const token = payload && payload.action === "add" ? s : null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[380px] glow-mask" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <LangSwitch />
      </header>
      <main className="relative z-10 grid flex-1 place-items-center px-4 pb-10">
        <div className="w-full max-w-[380px]">
          <AddTaskForm token={token} />
        </div>
      </main>
    </div>
  );
}