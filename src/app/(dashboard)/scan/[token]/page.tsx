"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { modeLabel } from "@/lib/nfc/types";
import { Button } from "@/components/ui/button";

type Outcome =
  | { state: "loading" }
  | { state: "error" }
  | {
      state: "done";
      action: "started" | "ended";
      modeCode: string;
      minutes: number | null;
    };

export default function ScanPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { t, lang } = useLanguage();
  const { modes, toggle } = useNfc();
  const [outcome, setOutcome] = useState<Outcome>({ state: "loading" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    void (async () => {
      try {
        const result = await toggle({ token, source: "nfc" });
        if (result?.ok) {
          setOutcome({
            state: "done",
            action: result.action,
            modeCode: result.mode.code,
            minutes: result.action === "ended" ? result.minutes : null,
          });
        } else {
          setOutcome({ state: "error" });
        }
      } catch {
        setOutcome({ state: "error" });
      }
    })();
  }, [token, toggle]);

  const mode =
    outcome.state === "done"
      ? (modes.find((item) => item.code === outcome.modeCode) ?? null)
      : null;
  const modeName = mode ? modeLabel(mode, lang) : "";

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 py-10">
      <div className="surface flex flex-col items-center gap-3 rounded-xl p-6 text-center">
        {outcome.state === "loading" && (
          <>
            <Loader2 className="animate-spin text-brand" aria-hidden />
            <p className="text-sm text-muted">{t.nfc.scanning}</p>
          </>
        )}

        {outcome.state === "error" && (
          <>
            <XCircle className="text-rose-400" aria-hidden />
            <p className="text-sm text-foreground">{t.nfc.scanError}</p>
          </>
        )}

        {outcome.state === "done" && (
          <>
            <CheckCircle2 className="text-teal" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {outcome.action === "ended"
                ? t.nfc.scannedEnded(modeName, outcome.minutes ?? 0)
                : t.nfc.scannedStarted(modeName)}
            </p>
          </>
        )}

        <Link href="/pomodoro" className="mt-1">
          <Button variant="subtle" size="sm">
            {t.nfc.backToModes}
          </Button>
        </Link>
      </div>
    </section>
  );
}
