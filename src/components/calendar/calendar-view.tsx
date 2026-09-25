"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, GripVertical } from "lucide-react";
import type { BlockColor, Task, TimeBlock } from "@/types";
import {
  addDays,
  dayShort,
  formatShortDate,
  isSameDay,
  monthFull,
  startOfWeek,
  weekdayOf,
} from "@/lib/date";
import {
  cn,
  hhmmToMinutes,
  minutesToHHMM,
  parseISODate,
  toHoursMinutes,
  toISODate,
  todayISO,
  uid,
} from "@/lib/utils";
import { BLOCK_COLORS, PRIORITY_TEXT } from "@/lib/constants";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/provider";
import { GoogleSyncPanel } from "@/components/calendar/google-sync-panel";
import {
  loadGoogleConnectionState,
  type GoogleConnectionState,
} from "@/lib/google/actions";
import { loadGoogleEvents, type GoogleEventPreview } from "@/lib/google/read";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Modal, ModalHeader } from "@/components/ui/modal";

const DAY_START_MIN = 0;
const DAY_END_MIN = 24 * 60;
const ROW_MIN = 30;
const ROW_HEIGHT = 20;
const TOTAL_ROWS = (DAY_END_MIN - DAY_START_MIN) / ROW_MIN;

const TIME_OPTIONS = Array.from(
  { length: TOTAL_ROWS },
  (_, i) => minutesToHHMM(DAY_START_MIN + i * ROW_MIN),
);

export function CalendarView() {
  const { blocks, tasks, addTimeBlock, updateTimeBlock, deleteTimeBlock } =
    useData();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [blockDraft, setBlockDraft] = useState<TimeBlock | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [googleState, setGoogleState] = useState<GoogleConnectionState | null>(
    null,
  );
  const [googleEvents, setGoogleEvents] = useState<GoogleEventPreview[]>([]);

  const isDemo = Boolean(user?.demo);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  const weekStart = useMemo(
    () => addDays(startOfWeek(todayISO()), weekOffset * 7),
    [weekOffset],
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return { iso: toISODate(date), date };
      }),
    [weekStart],
  );

  const scheduledTaskIds = useMemo(
    () => new Set(blocks.map((b) => b.taskId).filter(Boolean)),
    [blocks],
  );

  const unscheduled = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "done" && !scheduledTaskIds.has(t.id))
        .sort((a, b) => a.order - b.order),
    [tasks, scheduledTaskIds],
  );

  const contentHeight = TOTAL_ROWS * ROW_HEIGHT;

  const weekLabel = useMemo(() => {
    const start = formatShortDate(toISODate(weekStart), lang);
    const end = formatShortDate(toISODate(addDays(weekStart, 6)), lang);
    return `${start} – ${end} · ${weekStart.getFullYear()}`;
  }, [weekStart, lang]);

  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(addDays(weekStart, 6));

  // Estado de la conexión con Google Calendar (oculto en modo demo).
  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    void loadGoogleConnectionState().then((state) => {
      if (!cancelled) setGoogleState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  // Overlay de Google: refresca al montar, al cambiar de semana y al
  // cambiar los bloques (debounce ~1 s para no martillear la API).
  useEffect(() => {
    if (!googleState?.connected) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void loadGoogleEvents(weekStartISO, weekEndISO).then((events) => {
        if (!cancelled) setGoogleEvents(events ?? []);
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [googleState, weekStartISO, weekEndISO, blocks]);

  const visibleGoogleEvents = googleState?.connected ? googleEvents : [];

  function openBlockModal(block: TimeBlock) {
    setBlockDraft(block);
    setIsBlockModalOpen(true);
  }

  function createBlockFromTask(task: Task, date: string, startMin: number) {
    const endMin = Math.min(startMin + 60, DAY_END_MIN - 1);
    const color: BlockColor =
      task.priority === "high"
        ? "red"
        : task.priority === "low"
          ? "green"
          : "orange";
    const payload = {
      taskId: task.id,
      title: task.title,
      date,
      start: minutesToHHMM(startMin),
      end: minutesToHHMM(endMin),
      color,
    };
    const existing = blocks.find((b) => b.taskId === task.id);
    if (existing) updateTimeBlock(existing.id, payload);
    else addTimeBlock(payload);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type?: string; task?: Task } | null;
    if (data?.type === "task" && data.task) {
      setActiveTask(data.task);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as { type?: string; task?: Task } | null;
    const overId = String(over.id);
    if (data?.type !== "task" || !overId.startsWith("day:") || !data.task) {
      return;
    }
    const date = overId.slice(4);

    const translated = active.rect.current.translated;
    const overRect = over.rect;
    const centerY =
      (translated?.top ?? overRect.top) + (translated?.height ?? 0) / 2;
    const relativeY = centerY - overRect.top;
    const minutesFromStart = (relativeY / ROW_HEIGHT) * ROW_MIN + DAY_START_MIN;
    const startMin = Math.max(
      DAY_START_MIN,
      Math.min(
        Math.round(minutesFromStart / ROW_MIN) * ROW_MIN,
        DAY_END_MIN - 60,
      ),
    );
    createBlockFromTask(data.task, date, startMin);
  }

  function handleBlockSave(patch: Partial<Omit<TimeBlock, "id">>) {
    if (!blockDraft) return;
    if (blockDraft.id.startsWith("new:")) {
      if (patch.taskId) {
        const existing = blocks.find((b) => b.taskId === patch.taskId);
        if (existing) {
          updateTimeBlock(existing.id, patch);
          return;
        }
      }
      addTimeBlock({
        ...patch,
        title: patch.title ?? t.calendar.block,
        date: patch.date ?? toISODate(new Date()),
        start: patch.start ?? "09:00",
        end: patch.end ?? "10:00",
        color: patch.color ?? "blue",
      } as Omit<TimeBlock, "id">);
    } else {
      updateTimeBlock(blockDraft.id, patch);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setWeekOffset(0)}>
              {t.common.today}
            </Button>
          </div>
          <span className="font-mono text-sm font-medium text-amber-100/90">
            {weekLabel}
          </span>
        </div>

        {!isDemo && (
          <GoogleSyncPanel state={googleState} onStateChange={setGoogleState} />
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] shadow-[var(--inset-top),var(--app-shadow)]">
              <div className="min-w-[680px]">
                <div className="flex border-b border-white/10">
                  <div className="w-12 shrink-0" />
                  {weekDays.map(({ iso, date }) => (
                    <div
                      key={iso}
                      className="flex flex-1 flex-col items-center gap-1 border-l border-white/10 py-2.5"
                    >
                      <span className="font-mono text-[10.5px] font-medium uppercase tracking-widest text-muted">
                        {dayShort(weekdayOf(iso), lang)}
                      </span>
                      <span
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-full font-mono text-sm font-semibold",
                          isSameDay(date, new Date()) &&
                            "bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]",
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <span className="font-mono text-[9.5px] text-muted/70">
                        {monthFull(date.getMonth(), lang).slice(0, 3)}.
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex">
                  <div
                    className="relative w-12 shrink-0"
                    style={{ height: contentHeight }}
                  >
                    {Array.from({ length: TOTAL_ROWS }, (_, r) => {
                      if (r % 2 !== 0) return null;
                      const minute = DAY_START_MIN + r * ROW_MIN;
                      return (
                        <span
                          key={minute}
                          className="absolute right-2 -translate-y-full font-mono text-[10px] italic leading-5 text-amber-200/50"
                          style={{ top: r * ROW_HEIGHT }}
                        >
                          {minutesToHHMM(minute)}
                        </span>
                      );
                    })}
                  </div>

                  {weekDays.map(({ iso }) => (
                    <DayColumn
                      key={iso}
                      date={iso}
                      blocks={blocks.filter((b) => b.date === iso)}
                      googleEvents={visibleGoogleEvents}
                      onOpenBlock={openBlockModal}
                      onCreateBlock={() => {
                        openBlockModal({
                          id: `new:${uid()}`,
                          title: t.calendar.block,
                          date: iso,
                          start: "09:00",
                          end: "10:00",
                          color: "blue",
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="w-full shrink-0 lg:w-64">
            <div className="surface-gold-gradient relative overflow-hidden rounded-2xl border border-white/10 p-3 shadow-[var(--inset-top),var(--app-shadow)]">
              <div className="glow-mask pointer-events-none absolute inset-0" />
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="text-[13px] font-semibold tracking-tight">
                  <span className="text-gold-gradient">{t.calendar.unscheduled}</span>
                </span>
                <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 font-mono text-[11px] text-amber-300">
                  {unscheduled.length}
                </span>
              </div>

              {unscheduled.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted">
                  {t.calendar.noScheduled}
                </p>
              ) : (
                <ul className="relative flex flex-col gap-1.5">
                  {unscheduled.map((task) => (
                    <UnscheduledTask key={task.id} task={task} />
                  ))}
                </ul>
              )}

              <p className="relative mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-muted/80">
                {t.calendar.unscheduledHint}
              </p>
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeTask ? (
          <div className="cursor-grabbing rotate-1 scale-105 rounded-lg border border-amber-500/40 bg-surface-2 px-3 py-2 text-sm shadow-[0_10px_30px_rgba(245,158,11,0.25)]">
            <span className="font-medium text-amber-100">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>

      <BlockModal
        open={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        block={blockDraft}
        onSave={handleBlockSave}
        onDelete={(id) => deleteTimeBlock(id)}
      />
    </DndContext>
  );
}

interface DayColumnProps {
  date: string;
  blocks: TimeBlock[];
  googleEvents: GoogleEventPreview[];
  onOpenBlock: (block: TimeBlock) => void;
  onCreateBlock: (date: string) => void;
}

/** Recorte del evento de Google a la rejilla del día (por si cruza días). */
interface GoogleSpan {
  top: number;
  height: number;
  event: GoogleEventPreview;
}

function googleEventSpans(
  events: GoogleEventPreview[],
  iso: string,
): GoogleSpan[] {
  const dayStart = parseISODate(iso).getTime();
  const dayEnd = addDays(parseISODate(iso), 1).getTime();
  const gridHeight = TOTAL_ROWS * ROW_HEIGHT;
  return events
    .map<GoogleSpan | null>((event) => {
      const from = Math.max(new Date(event.start).getTime(), dayStart);
      const to = Math.min(new Date(event.end).getTime(), dayEnd);
      if (to <= from) return null;
      const startMinutes = (from - dayStart) / 60_000;
      const endMinutes = (to - dayStart) / 60_000;
      const top = ((startMinutes - DAY_START_MIN) / ROW_MIN) * ROW_HEIGHT;
      const bottom = ((endMinutes - DAY_START_MIN) / ROW_MIN) * ROW_HEIGHT;
      const clampedTop = Math.max(0, Math.min(top, gridHeight - 6));
      const clampedBottom = Math.max(0, Math.min(bottom, gridHeight));
      if (clampedBottom - clampedTop <= 2) return null;
      return { top: clampedTop, height: clampedBottom - clampedTop, event };
    })
    .filter((span): span is GoogleSpan => span !== null);
}

function DayColumn({
  date,
  blocks,
  googleEvents,
  onOpenBlock,
  onCreateBlock,
}: DayColumnProps) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const isToday = date === todayISO();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex-1 cursor-crosshair border-l border-white/10 transition-colors",
        isToday && "bg-amber-500/[0.03]",
        isOver && "bg-amber-500/[0.07] shadow-[inset_0_0_28px_rgba(245,158,11,0.08)]",
      )}
      style={{ height: TOTAL_ROWS * ROW_HEIGHT }}
    >
      {Array.from({ length: TOTAL_ROWS + 1 }, (_, r) => {
        if (r === 0) return null;
        const top = r * ROW_HEIGHT;
        return (
          <div
            key={r}
            className={cn(
              "absolute inset-x-0",
              r % 2 === 0
                ? "border-t border-white/[0.06]"
                : "border-t border-dashed border-white/[0.025]",
            )}
            style={{ top }}
          />
        );
      })}

      {googleEventSpans(googleEvents, date).map(({ top, height, event }) => {
        const content = (
          <>
            <span className="line-clamp-2 font-medium">
              {event.summary || t.calendar.google.badge}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-white/50">
              <span className="rounded border border-white/20 px-1 font-sans text-[8.5px] font-semibold uppercase tracking-wider text-white/70">
                {t.calendar.google.badge}
              </span>
              <Clock size={9} />
              {toHoursMinutes(new Date(event.start))}–
              {toHoursMinutes(new Date(event.end))}
            </span>
          </>
        );
        const className =
          "absolute inset-x-1 z-0 overflow-hidden rounded-lg border border-dashed border-white/25 bg-white/[0.04] px-2 py-1 text-left text-[11px] leading-tight text-white/75 transition-colors duration-200 hover:border-white/40 hover:bg-white/[0.07]";
        const style = { top: top + 1, height: Math.max(height - 2, 12) };
        return event.htmlLink ? (
          <a
            key={event.eventId}
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className={className}
            style={style}
            aria-label={t.calendar.google.openInGoogle}
          >
            {content}
          </a>
        ) : (
          <div
            key={event.eventId}
            className={className}
            style={style}
            aria-label={event.summary || t.calendar.google.badge}
          >
            {content}
          </div>
        );
      })}

      {blocks
        .slice()
        .sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start))
        .map((block) => {
          const startMin = hhmmToMinutes(block.start);
          const endMin = hhmmToMinutes(block.end);
          const top = ((startMin - DAY_START_MIN) / ROW_MIN) * ROW_HEIGHT;
          const height = ((endMin - startMin) / ROW_MIN) * ROW_HEIGHT;
          return (
            <button
              key={block.id}
              type="button"
              className={cn(
                "absolute inset-x-1 relative z-[1] overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition-[transform,box-shadow] duration-200 ease-out-expo hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)] active:scale-[0.98]",
                BLOCK_COLORS[block.color ?? "default"],
              )}
              style={{ top: top + 1, height: height - 2 }}
              onClick={() => onOpenBlock(block)}
            >
              <span
                className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-current opacity-40"
                aria-hidden
              />
              <span className="line-clamp-2 font-medium pl-1.5">{block.title}</span>
              <span className="flex items-center gap-1 pl-1.5 font-mono text-[10px] opacity-70">
                <Clock size={9} />
                {block.start}–{block.end}
              </span>
            </button>
          );
        })}

      <button
        type="button"
        aria-label={`${date} ＋`}
        className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-muted opacity-100 shadow-sm transition-all duration-200 ease-out-expo hover:border-amber-500/40 hover:text-amber-400 sm:opacity-0 sm:group-hover:opacity-100 active:scale-[0.92] active:duration-75"
        onClick={() => onCreateBlock(date)}
      >
        <CalendarPlus size={13} />
      </button>
    </div>
  );
}

function UnscheduledTask({ task }: { task: Task }) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { type: "task", task },
    });

  const safeAttributes = useMemo(() => {
    const cleaned = { ...attributes } as { "aria-describedby"?: string };
    delete cleaned["aria-describedby"];
    return cleaned;
  }, [attributes]);

  return (
    <li
      ref={setNodeRef}
      {...safeAttributes}
      {...listeners}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-[12.5px] shadow-[var(--inset-top)] transition-all duration-200 ease-out-expo hover:-translate-y-px hover:border-amber-500/35 hover:bg-surface-hover hover:shadow-[var(--inset-top),0_4px_16px_rgba(245,158,11,0.1)]",
        isDragging && "opacity-40 ring-1 ring-amber-500/30",
      )}
    >
      <GripVertical size={13} className="shrink-0 text-amber-200/40" />
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-semibold",
          PRIORITY_TEXT[task.priority],
        )}
      >
        {t.priority[task.priority]}
      </span>
    </li>
  );
}

interface BlockModalProps {
  open: boolean;
  block: TimeBlock | null;
  onClose: () => void;
  onSave: (patch: Partial<Omit<TimeBlock, "id">>) => void;
  onDelete: (id: string) => void;
}

function BlockModal({ open, block, onClose, onSave, onDelete }: BlockModalProps) {
  const { t } = useLanguage();
  const { tasks } = useData();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [taskId, setTaskId] = useState("");
  const [color, setColor] = useState<BlockColor>("blue");

  const [lastBlock, setLastBlock] = useState<TimeBlock | null>(null);
  if (block !== lastBlock) {
    setLastBlock(block);
    if (block) {
      setTitle(block.title);
      setDate(block.date);
      setStart(block.start);
      setEnd(block.end);
      setTaskId(block.taskId ?? "");
      setColor(block.color ?? "blue");
    }
  }

  const isNew = block?.id.startsWith("new:") ?? false;
  const colors: BlockColor[] = ["blue", "green", "orange", "red", "default"];

  return (
    <Modal open={open} onClose={onClose} labelledBy="block-modal-title">
      <ModalHeader
        title={isNew ? t.calendar.schedule : t.calendar.editBlock}
        onClose={onClose}
      />
      {block && (
        <form
          className="flex flex-col gap-4 px-5 pb-5 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              title: title.trim() || block.title,
              date,
              start,
              end,
              taskId: taskId || undefined,
              color,
            });
            onClose();
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              className="h-8 rounded-lg border border-white/10 bg-surface-2 px-2 text-sm text-foreground focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/25 [color-scheme:dark]"
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="flex flex-1 items-center gap-1.5">
              <Select value={start} onChange={(e) => setStart(e.target.value)} aria-label={t.calendar.from}>
                {TIME_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-muted">–</span>
              <Select value={end} onChange={(e) => setEnd(e.target.value)} aria-label={t.calendar.to}>
                {TIME_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">
              {t.task.title}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.task.titlePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">
              {t.kanban.title}
            </label>
            <Select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            >
              <option value="">—</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">Color</label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full border shadow-[0_0_8px_rgba(0,0,0,0.4)] transition-transform hover:scale-110",
                    BLOCK_COLORS[c].split(" ")[0],
                    color === c &&
                      "ring-2 ring-amber-400 ring-offset-2 ring-offset-background",
                  )}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
            {!isNew ? (
              <Button
                variant="danger"
                type="button"
                onClick={() => {
                  onDelete(block.id);
                  onClose();
                }}
              >
                {t.calendar.deleteBlock}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" type="button" onClick={onClose}>
                {t.common.cancel}
              </Button>
              <Button type="submit" variant="primary">{t.common.save}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}