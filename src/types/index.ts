export type TaskStatus = "todo" | "doing" | "done";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  order: number;
  createdAt: string;
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  title: string;
  date: string;
  start: string;
  end: string;
  color?: BlockColor;
}

export type BlockColor = "default" | "green" | "orange" | "red" | "blue";

export type Language = "es" | "en";

export type View = "kanban" | "calendar";

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  demo?: boolean;
}