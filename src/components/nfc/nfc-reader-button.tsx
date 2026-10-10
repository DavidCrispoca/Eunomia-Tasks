"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2, Nfc } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { isWebNfcSupported, readTagOnce } from "@/lib/nfc/web-nfc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "listening" | "reading" | "error";

const subscribeNoop = () => () => {};
const getServerSupported = () => false;

export function NfcReaderButton({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { toggle } = useNfc();
  const [status, setStatus] = useState<Status>("idle");
  const supported = useSyncExternalStore(
    subscribeNoop,
    isWebNfcSupported,
    getServerSupported,
  );

  async function onRead() {
    setStatus("listening");
    try {
      const read = await readTagOnce();
      if (!read || (!read.token && !read.modeCode)) {
        setStatus("idle");
        return;
      }
      setStatus("reading");
      const result = await toggle({
        token: read.token ?? undefined,
        modeCode: read.modeCode ?? undefined,
        source: "webnfc",
      });
      setStatus(result?.ok ? "idle" : "error");
    } catch {
      setStatus("error");
    }
  }

  const busy = status === "listening" || status === "reading";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant="subtle"
        onClick={() => void onRead()}
        disabled={!supported || busy}
        className="justify-center"
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <Nfc size={14} aria-hidden />
        )}
        {status === "listening"
          ? t.nfc.listening
          : status === "reading"
            ? t.nfc.scanning
            : t.nfc.listenButton}
      </Button>
      {!supported && (
        <p className="text-[11px] text-muted">{t.nfc.unsupported}</p>
      )}
      {status === "error" && (
        <p className="text-[11px] text-rose-400">{t.nfc.scanError}</p>
      )}
    </div>
  );
}
