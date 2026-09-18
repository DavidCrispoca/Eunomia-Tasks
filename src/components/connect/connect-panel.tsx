"use client";

import { useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useLanguage } from "@/lib/i18n";

export function ConnectPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="relative flex flex-col gap-1 border-t border-white/10 px-2.5 pb-3 pt-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t.connect.title}
        </p>
        <ConnectButton
          icon={<MessageCircle size={14} />}
          label={t.connect.whatsapp}
          caption={t.connect.whatsappDesc}
          onClick={() => setOpen(true)}
        />
      </aside>

      {open && <WhatsAppModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ConnectButton({
  icon,
  label,
  caption,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 text-left transition-all duration-200 ease-out-expo hover:border-amber-500/25 hover:bg-amber-500/5 active:scale-[0.99] active:duration-75"
    >
      <span className="grid w-4 shrink-0 place-items-center text-muted">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-foreground">{label}</span>
        <span className="block truncate text-[10.5px] text-muted">{caption}</span>
      </span>
    </button>
  );
}

function WhatsAppModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    if (!phone.trim()) return;
    setBusy(true);
    setError(false);
    setCode(null);
    try {
      const res = await fetch("/api/whatsapp/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = (await res.json()) as { code?: string };
      if (!res.ok || !data.code) {
        setError(true);
        return;
      }
      setCode(data.code);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open labelledBy="whatsapp-connect-title" onClose={onClose}>
      <ModalHeader title={t.connect.whatsapp} onClose={onClose} />
      <div className="flex flex-col gap-3 p-5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-muted">
            {t.connect.phoneLabel}
          </span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.connect.phonePlaceholder}
            inputMode="tel"
          />
        </label>
        <Button
          variant="primary"
          onClick={submit}
          disabled={busy || !phone.trim()}
          className="justify-center"
        >
          {t.connect.sendCode}
        </Button>

        {code && (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-emerald-200">
            <p className="font-semibold">{t.connect.sendCodeHint(code)}</p>
            <p className="mt-1 opacity-80">{t.connect.sendCodeTip}</p>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-[#ff6b4a]">
            {t.connect.errorGeneric}
          </p>
        )}
      </div>
    </Modal>
  );
}