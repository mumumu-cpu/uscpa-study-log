import { addDays, DATE_RE, env, json, requireUser } from "@/lib/server";
import { buildPrompt, fallbackLines, MODELS, summarize, toLines } from "@/lib/feedback";
import type { DayTotal, Task } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const body = (await req.json().catch(() => null)) as { weekStart?: string } | null;
  const weekStart = body?.weekStart ?? "";
  if (!DATE_RE.test(weekStart)) return json({ error: "invalid weekStart" }, 400);

  const { DB, AI } = env();
  const [sessions, tasks] = await DB.batch([
    DB.prepare(
      `SELECT date, SUM(input_seconds) AS input, SUM(output_seconds) AS output
       FROM study_sessions WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date`,
    ).bind(user.id, weekStart, addDays(weekStart, 6)),
    DB.prepare(`SELECT status FROM tasks WHERE user_id = ?`).bind(user.id),
  ]);
  const stats = summarize(sessions.results as DayTotal[], tasks.results as Pick<Task, "status">[]);

  let lines: string[] = [];
  let model = "fallback";
  for (const candidate of MODELS) {
    try {
      const out = (await AI.run(candidate as Parameters<Ai["run"]>[0], {
        messages: buildPrompt(stats),
        max_tokens: 220,
        temperature: 0.4,
      } as never)) as { response?: string };
      lines = toLines(out.response ?? "");
      if (lines.length) {
        model = candidate;
        break;
      }
    } catch (err) {
      console.error(`workers-ai ${candidate} failed`, err);
    }
  }
  if (!lines.length) lines = fallbackLines(stats);

  const row = await DB.prepare(
    `INSERT INTO feedback (user_id, week_start, content) VALUES (?, ?, ?) RETURNING created_at`,
  )
    .bind(user.id, weekStart, JSON.stringify(lines))
    .first<{ created_at: string }>();

  return json({ lines, createdAt: row?.created_at ?? new Date().toISOString(), model, stats });
}
