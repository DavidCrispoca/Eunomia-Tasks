"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";

export function SessionSubjectPicker() {
  const { active, groups, assignGroup } = useNfc();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  if (!active || !["focus", "study"].includes(active.modeCode)) return null;

  return (
    <label className="mt-3 flex flex-col gap-1.5 text-left">
      <span className="text-[11px] font-medium text-muted">{t.nfc.subjectLabel}</span>
      <select
        value={active.groupId ?? ""}
        disabled={saving}
        onChange={async (event) => {
          setSaving(true);
          await assignGroup(event.target.value || null);
          setSaving(false);
        }}
        className="surface min-h-11 w-full rounded-md px-3 text-sm text-foreground"
      >
        <option value="">{t.nfc.noSubject}</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
      <span className="text-[11px] text-muted">{t.nfc.subjectHint}</span>
    </label>
  );
}
