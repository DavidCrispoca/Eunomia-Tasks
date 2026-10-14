"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { useLanguage } from "@/lib/i18n";
import { activityLimitMinutes, modeLabel } from "@/lib/nfc/types";
import { useNfc } from "@/providers/nfc-provider";
import { useElapsed } from "./use-elapsed";
import { useBrowserNotifications } from "@/providers/browser-notifications-provider";

export function OverlongSessionReview() {
  const { active, modes, busy, verifySession } = useNfc();
  const { t, lang } = useLanguage();
  const { permission, notify } = useBrowserNotifications();
  const elapsed = useElapsed(active?.startedAt ?? null);
  const maxMinutes = active ? activityLimitMinutes(active.modeCode) : 0;
  const overLimit = Boolean(active && elapsed > maxMinutes * 60);
  const mode = active ? modes.find((item) => item.code === active.modeCode) : null;
  const modeName = mode ? modeLabel(mode, lang) : active?.modeCode ?? "";
  const notifiedSession = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !overLimit || permission !== "granted" || !document.hidden) return;
    if (notifiedSession.current === active.id) return;
    notifiedSession.current = active.id;
    void notify(t.nfc.limitNotificationTitle, {
      body: t.nfc.limitNotificationBody(modeName),
      tag: "eunomia-activity-mode",
      url: "/pomodoro",
      renotify: true,
    });
  }, [active, modeName, notify, overLimit, permission, t]);

  return (
    <Modal open={overLimit} onClose={() => {}} labelledBy="overlong-session-title">
      <ModalHeader title={t.nfc.reviewTitle} titleId="overlong-session-title" onClose={() => {}} />
      {active && overLimit && (
        <ReviewFields
          key={active.id}
          sessionId={active.id}
          modeName={modeName}
          maxMinutes={maxMinutes}
          busy={busy}
          onConfirm={verifySession}
        />
      )}
    </Modal>
  );
}

function ReviewFields({
  sessionId,
  modeName,
  maxMinutes,
  busy,
  onConfirm,
}: {
  sessionId: string;
  modeName: string;
  maxMinutes: number;
  busy: boolean;
  onConfirm: (sessionId: string, minutes: number) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [minutes, setMinutes] = useState(String(maxMinutes));
  const [error, setError] = useState(false);

  async function confirm(value: number) {
    setError(false);
    if (!(await onConfirm(sessionId, value))) setError(true);
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <p className="text-[13px] text-muted">
        {t.nfc.reviewDescription(modeName, maxMinutes / 60)}
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="verified-session-minutes" className="text-[12px] font-medium text-foreground">
          {t.nfc.reviewMinutes}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="verified-session-minutes"
            type="number"
            min={1}
            max={maxMinutes}
            step={1}
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="surface min-h-11 w-32 rounded-md px-3 text-sm text-foreground"
          />
          <span className="text-[12px] text-muted">{t.nfc.minutesUnit}</span>
        </div>
      </div>
      {error && <p role="alert" className="text-[12px] text-red-300">{t.nfc.reviewError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="subtle" disabled={busy} onClick={() => void confirm(Number(minutes))}>
          {t.nfc.reviewSaveAdjusted}
        </Button>
        <Button disabled={busy} onClick={() => void confirm(maxMinutes)}>
          {t.nfc.reviewIncludeLimit(maxMinutes / 60)}
        </Button>
      </div>
    </div>
  );
}
