import type { Language, Task, TaskGroup, TimeBlock } from "@/types";

export interface DataStore {
  loadTasks(): Task[];
  loadTimeBlocks(): TimeBlock[];
  loadGroups(): TaskGroup[];
  loadLanguage(): Language | null;
  saveTasks(tasks: Task[]): void;
  saveTimeBlocks(blocks: TimeBlock[]): void;
  saveGroups(groups: TaskGroup[]): void;
  saveLanguage(lang: Language): void;
}