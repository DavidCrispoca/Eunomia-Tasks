"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Status = "form" | "submitting" | "added" | "error";

export function AddTaskForm({ token }: { token: string | null }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>("form");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [notes, setNotes] = useState("");

  if (!token) {
    return (
      <div className="surface-gold-gradient relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--inset-top),var(--app-shadow-lg)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
        <div className="relative p-6 sm:p-7 text-center">
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight">
            <span className="text-gold-gradient">{t.emailAdd.invalidTitle}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t.emailAdd.invalidBody}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-lg border border-white/10 bg-surface-2 px-4 text-sm text-foreground transition-colors hover:border-amber-500/30 hover:bg-surface-hover"
          >
            {t.emailAdd.backToApp}
          </Link>
        </div>
      </div>
    );
  }

  if (status === "added") {
    return (
      <div className="surface-gold-gradient relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--inset-top),var(--app-shadow-lg)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
        <div className="relative p-6 sm:p-7 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-xl font-bold text-black">
            ✓
          </div>
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight">
            <span className="text-gold-gradient">{t.emailAdd.successTitle}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t.emailAdd.successBody}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              className="min-h-[48px]"
              onClick={() => {
                setTitle("");
                setNotes("");
                setDueDate("");
                setDueTime("");
                setStatus("form");
              }}
            >
              {t.emailAdd.addAnother}
            </Button>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/10 bg-surface-2 px-4 text-sm text-foreground transition-colors hover:border-amber-500/30 hover:bg-surface-hover"
            >
              {t.emailAdd.loginNow}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/email/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s: token,
          title,
          priority,
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          notes,
        }),
      });
      setStatus(res.ok ? "added" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="surface-gold-gradient relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--inset-top),var(--app-shadow-lg)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
      <div className="relative p-6 sm:p-7">
        <div className="mb-6">
          <span className="mb-2 inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200/90">
            {t.emailAdd.badge}
          </span>
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight">
            <span className="text-gold-gradient">{t.emailAdd.title}</span>
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t.emailAdd.subtitle}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.title} <span className="text-amber-400">*</span>
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.task.titlePlaceholder}
              maxLength={200}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.priority}
            </span>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">{t.priority.low}</option>
              <option value="medium">{t.priority.medium}</option>
              <option value="high">{t.priority.high}</option>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.dueDate}
            </span>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.dueTime}
            </span>
            <Input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.notes}
            </span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.task.notesPlaceholder}
              maxLength={1000}
            />
          </label>

          {status === "error" && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm leading-relaxed text-red-200/90">
              {t.emailAdd.submitError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="min-h-[48px]" disabled={status === "submitting" || !title.trim()}>
            {status === "submitting" ? "…" : t.common.save}
          </Button>

          <p className="text-center text-sm text-muted">{t.emailAdd.noteSaved}</p>
        </form>
      </div>
    </div>
  );
}