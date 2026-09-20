"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Flag, FolderOpen, Tags, Timer } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@/types";
import { useUi } from "@/providers/ui-provider";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

export function TaskModal() {
  const { taskDialog, closeTaskDialog } = useUi();
  const { addTask, updateTask, deleteTask, groups } = useData();
  const { t } = useLanguage();

  const editing = taskDialog.editing;
  const open = taskDialog.open;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [groupId, setGroupId] = useState("");

  const dialogKey = editing?.id ?? (open ? "new" : "closed");
  const [lastDialog, setLastDialog] = useState(dialogKey);
  if (lastDialog !== dialogKey) {
    setLastDialog(dialogKey);
    setTitle(editing?.title ?? "");
    setNotes(editing?.notes ?? "");
    setPriority(editing?.priority ?? "medium");
    setStatus(editing?.status ?? taskDialog.status ?? "todo");
    setDueDate(editing?.dueDate ?? "");
    setGroupId(editing?.groupId ?? "");
  }

  const canSave = title.trim().length > 0;

  function handleSubmit() {
    if (!canSave) return;
    if (editing) {
      updateTask(editing.id, {
        title: title.trim(),
        notes: notes.trim(),
        priority,
        status,
        dueDate: dueDate || undefined,
        groupId: groupId || undefined,
        completedAt:
          status === "done"
            ? editing.completedAt ?? new Date().toISOString()
            : undefined,
      });
    } else {
      addTask({
        title: title.trim(),
        notes: notes.trim(),
        priority,
        status,
        dueDate: dueDate || undefined,
        groupId: groupId || undefined,
      });
    }
    closeTaskDialog();
  }

  function handleDelete() {
    if (!editing) return;
    if (window.confirm(t.task.deleteConfirm)) {
      deleteTask(editing.id);
      closeTaskDialog();
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeTaskDialog}
      labelledBy="task-dialog-title"
    >
      <ModalHeader
        title={editing ? t.task.editTask : t.task.newTask}
        onClose={closeTaskDialog}
      />
      <form
        className="flex flex-col gap-4 px-5 pb-5 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted">
            {t.task.title}
          </label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.task.titlePlaceholder}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted">
            {t.task.notes}
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.task.notesPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <FolderOpen size={12} /> {t.task.group}
          </label>
          <Select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">{t.group.personal}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Flag size={12} /> {t.task.priority}
            </label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">{t.priority.low}</option>
              <option value="medium">{t.priority.medium}</option>
              <option value="high">{t.priority.high}</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarDays size={12} /> {t.task.dueDate}
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="[color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Tags size={12} /> {t.task.status}
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value="todo">{t.kanban.columns.todo}</option>
            <option value="doing">{t.kanban.columns.doing}</option>
            <option value="done">{t.kanban.columns.done}</option>
          </Select>
        </div>

        {editing && editing.status !== "done" && (
          <Link
            href={`/pomodoro/${editing.id}`}
            onClick={closeTaskDialog}
            className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 text-sm font-semibold text-black shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-all duration-200 ease-out-expo hover:brightness-110 hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] active:scale-[0.98] active:duration-75"
          >
            <Timer size={15} />
            {t.task.startWork}
          </Link>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
          {editing ? (
            <Button variant="danger" type="button" onClick={handleDelete}>
              {t.task.deleteTask}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" type="button" onClick={closeTaskDialog}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {t.common.save}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}