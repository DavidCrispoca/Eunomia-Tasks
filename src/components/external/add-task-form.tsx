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
      <div className="surface-raised relative overflow-hidden rounded-2xl">
        <div className="relative p-6 sm:p-7 text-center">
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight text-foreground">
            {t.emailAdd.invalidTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t.emailAdd.invalidBody}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-[44px] items-center rounded-lg surface px-5 text-sm text-foreground transition-colors hover:bg-surface-hover"
          >
            {t.emailAdd.backToApp}
          </Link>
        </div>
      </div>
    );
  }

  if (status === "added") {
    return (
      <div className="surface-raised relative overflow-hidden rounded-2xl">
        <div className="relative p-6 sm:p-7 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand text-xl font-bold text-white">
            âœ“
          </div>
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight text-foreground">
            {t.emailAdd.successTitle}
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
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg surface px-5 text-sm text-foreground transition-colors hover:bg-surface-hover"
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
    <div className="surface-raised relative overflow-hidden rounded-2xl">
      <div className="relative p-6 sm:p-7">
        <div className="mb-6">
          <span className="mb-2 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-200/90">
            {t.emailAdd.badge}
          </span>
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight font-display text-foreground">
            {t.emailAdd.title}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t.emailAdd.subtitle}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.task.title} <span className="text-violet-400">*</span>
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
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm leading-relaxed text-rose-200/90">
              {t.emailAdd.submitError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="min-h-[48px]" disabled={status === "submitting" || !title.trim()}>
            {status === "submitting" ? "â€¦" : t.common.save}
          </Button>

          <p className="text-center text-sm text-muted">{t.emailAdd.noteSaved}</p>
        </form>
      </div>
    </div>
  );
}