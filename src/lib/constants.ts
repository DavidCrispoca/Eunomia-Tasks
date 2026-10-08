import type { BlockColor, TaskPriority, TaskStatus } from "@/types";

export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-white/30",
  doing: "bg-orange-500",
  done: "bg-emerald-400",
};

export const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: "border border-amber-500/25 bg-amber-500/[0.07] text-amber-300/90",
  medium: "border border-amber-500/30 bg-amber-500/10 text-amber-400",
  high: "border border-orange-500/35 bg-orange-500/10 text-orange-400",
};

export const BLOCK_COLORS: Record<BlockColor, string> = {
  default: "border-amber-400/35 bg-amber-500/[0.14] text-amber-200",
  green: "border-emerald-400/35 bg-emerald-500/[0.13] text-emerald-300",
  orange: "border-orange-400/45 bg-orange-500/[0.16] text-orange-300",
  red: "border-red-400/40 bg-red-500/10 text-red-300",
  blue: "border-cyan-400/40 bg-cyan-500/[0.12] text-cyan-200",
  brand: "border-violet-400/45 bg-violet-500/[0.18] text-violet-200",
  teal: "border-teal-400/40 bg-teal-500/[0.14] text-teal-300",
};