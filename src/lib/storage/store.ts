import type { Language, Task, TimeBlock } from "@/types";

export interface DataStore {
  loadTasks(): Task[];
  loadTimeBlocks(): TimeBlock[];
  loadLanguage(): Language | null;
  saveTasks(tasks: Task[]): void;
  saveTimeBlocks(blocks: TimeBlock[]): void;
  saveLanguage(lang: Language): void;
}