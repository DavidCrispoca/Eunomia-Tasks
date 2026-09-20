"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

interface GroupManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export function GroupManagerModal({ open, onClose }: GroupManagerModalProps) {
  const { groups, addGroup, updateGroup, deleteGroup } = useData();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const scopeKey = open ? "open" : "closed";
  const [lastScope, setLastScope] = useState(scopeKey);
  if (lastScope !== scopeKey) {
    setLastScope(scopeKey);
    if (open) {
      setEdits(Object.fromEntries(groups.map((g) => [g.id, g.name])));
      setName("");
    }
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const group = addGroup(trimmed);
    setEdits((prev) => ({ ...prev, [group.id]: group.name }));
    setName("");
  }

  function handleRename(id: string, value: string) {
    setEdits((prev) => ({ ...prev, [id]: value }));
    const trimmed = value.trim();
    const current = groups.find((g) => g.id === id);
    if (trimmed && current && trimmed !== current.name) {
      updateGroup(id, { name: trimmed });
    }
  }

  function handleDelete(id: string, nameLabel: string) {
    if (!window.confirm(t.group.deleteConfirm(nameLabel))) return;
    deleteGroup(id);
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="groups-dialog-title">
      <ModalHeader title={t.group.title} onClose={onClose} />
      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={t.group.namePlaceholder}
          />
          <Button
            variant="primary"
            type="button"
            disabled={!name.trim()}
            onClick={handleAdd}
          >
            <Plus size={14} />
            {t.group.add}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {groups.length === 0 ? (
            <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-4 text-center text-xs text-muted">
              {t.group.empty}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <Input
                  value={edits[group.id] ?? group.name}
                  onChange={(e) => handleRename(group.id, e.target.value)}
                />
                <Button
                  variant="danger"
                  size="icon"
                  type="button"
                  aria-label={t.group.deleteGroup}
                  onClick={() => handleDelete(group.id, group.name)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}