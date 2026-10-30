import { addDays, DATE_RE, env, json, requireUser } from "@/lib/server";
import type { DayTotal, Feedback, Task } from "@/lib/types";

export const runtime = "edge";

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const weekStart = new URL(req.url).searchParams.get("weekStart") ?? "";
  if (!DATE_RE.test(weekStart)) return json({ error: "invalid weekStart" }, 400);
  const weekEnd = addDays(weekStart, 6);
  const db = env().DB;

  const [sessions, tasks, feedback] = await db.batch([
    db
      .prepare(
        `SELECT date, SUM(input_seconds) AS input, SUM(output_seconds) AS output
         FROM study_sessions WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date`,
      )
      .bind(user.id, weekStart, weekEnd),
    db
      .prepare(`SELECT id, title, category, status FROM tasks WHERE user_id = ? ORDER BY sort_order, created_at`)
      .bind(user.id),
    db
      .prepare(`SELECT content, created_at FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 1`)
      .bind(user.id),
  ]);

  const byDate = new Map((sessions.results as DayTotal[]).map((r) => [r.date, r]));
  const days: DayTotal[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const row = byDate.get(date);
    return { date, input: Number(row?.input ?? 0), output: Number(row?.output ?? 0) };
  });

  const fb = feedback.results[0] as { content: string; created_at: string } | undefined;
  const latest: Feedback = fb ? { lines: JSON.parse(fb.content), createdAt: fb.created_at } : null;

  return json({
    user: { name: user.name, image: user.image },
    weekStart,
    days,
    tasks: tasks.results as Task[],
    feedback: latest,
  });
}
