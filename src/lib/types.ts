export type Mode = "input" | "output";
export type TaskStatus = "todo" | "doing" | "done";
export type TaskCategory = "mcq" | "tbs" | "lecture" | "other";

export type DayTotal = { date: string; input: number; output: number };
export type Task = { id: string; title: string; category: TaskCategory; status: TaskStatus };
export type Feedback = { lines: string[]; createdAt: string } | null;

export type Dashboard = {
  user: { name: string; image: string | null };
  weekStart: string;
  days: DayTotal[];
  tasks: Task[];
  feedback: Feedback;
};

export const STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "未着手", doing: "進行中", done: "完了" };
export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  mcq: "Abitus MCQ",
  tbs: "TBS",
  lecture: "講義",
  other: "その他",
};

export const WEEKLY_GOAL_MIN_H = 17;
export const WEEKLY_GOAL_MAX_H = 20;
export const OUTPUT_RATIO_GOAL = 0.5;
