"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { login, signup } from "@/lib/auth/actions";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode, demo }: { mode: "login" | "register"; demo: boolean }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [state, action, pending] = useActionState(
    mode === "login" ? login : signup,
    undefined,
  );

  const messageKey = state?.messageKey ?? searchParams.get("error");
  const message = messageKey
    ? t.auth.errors[messageKey as keyof typeof t.auth.errors]
    : undefined;

  const title = mode === "login" ? t.auth.loginTitle : t.auth.registerTitle;
  const subtitle =
    mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle;

  return (
    <div className="surface-gold-gradient relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--inset-top),var(--app-shadow-lg)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
      <div className="relative p-6 sm:p-7">
        <div className="mb-6">
          <h1 className="text-lg sm:text-[20px] font-semibold tracking-tight">
            <span className="text-gold-gradient">{title}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-[13px] text-muted">{subtitle}</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted">
                {t.auth.name}
              </span>
              <Input name="name" placeholder={t.auth.namePlaceholder} autoComplete="name" />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.auth.email}
            </span>
            <Input
              name="email"
              type="email"
              required
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted">
              {t.auth.password}
            </span>
            <Input
              name="password"
              type="password"
              required
              placeholder={t.auth.passwordPlaceholder}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {demo && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-100/90">
              {t.auth.demoHint}
            </p>
          )}

          {message && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-[#ff6b4a]"
            >
              {message}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={pending}
            className="mt-2 w-full justify-center min-h-[48px]"
          >
            {mode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? t.auth.toRegister : t.auth.toLogin}{" "}
          <Link
            href={mode === "login" ? "/register" : "/login"}
            className="font-medium text-amber-400 transition-colors duration-200 ease-out-expo hover:text-amber-300"
          >
            {mode === "login" ? t.auth.registerWord : t.auth.loginWord}
          </Link>
        </p>
      </div>
    </div>
  );
}