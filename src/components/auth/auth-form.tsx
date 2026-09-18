"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { login, signup, googleLogin } from "@/lib/auth/actions";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function AuthForm({ mode, demo }: { mode: "login" | "register"; demo: boolean }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [googleError, setGoogleError] = useState<string>();
  const [googlePending, setGooglePending] = useState(false);

  const [state, action, pending] = useActionState(
    mode === "login" ? login : signup,
    undefined,
  );

  const messageKey =
    state?.messageKey ?? searchParams.get("error") ?? googleError;
  const message = messageKey
    ? t.auth.errors[messageKey as keyof typeof t.auth.errors]
    : undefined;

  const title = mode === "login" ? t.auth.loginTitle : t.auth.registerTitle;
  const subtitle =
    mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle;

  async function handleGoogle() {
    if (googlePending) return;
    setGooglePending(true);
    setGoogleError(undefined);
    const result = await googleLogin();
    if (result.url) {
      window.location.href = result.url;
    } else {
      setGoogleError(result.messageKey ?? "generic");
      setGooglePending(false);
    }
  }

  return (
    <div className="surface-gold-gradient relative overflow-hidden rounded-xl border border-white/10 shadow-[var(--inset-top),var(--app-shadow-lg)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
      <div className="relative p-7">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold tracking-tight">
            <span className="text-gold-gradient">{title}</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        </div>

        {!demo && (
          <>
            <Button
              type="button"
              variant="subtle"
              size="lg"
              onClick={handleGoogle}
              disabled={googlePending}
              className="w-full justify-center"
            >
              <GoogleIcon className="h-4 w-4" />
              {t.auth.continueWithGoogle}
            </Button>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-widest text-muted">
                {t.auth.orDivider}
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form action={action} className="flex flex-col gap-3.5">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-muted">
                {t.auth.name}
              </span>
              <Input name="name" placeholder={t.auth.namePlaceholder} autoComplete="name" />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-muted">
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
            <span className="mb-1 block text-[12px] font-medium text-muted">
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
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-100/90">
              {t.auth.demoHint}
            </p>
          )}

          {message && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-[#ff6b4a]"
            >
              {message}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={pending}
            className="mt-1 w-full justify-center"
          >
            {mode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted">
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