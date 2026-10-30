import { DATE_RE, env, json, requireUser } from "@/lib/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const body = (await req.json().catch(() => null)) as { date?: string; mode?: string; seconds?: number } | null;
  const seconds = Math.floor(Number(body?.seconds));
  if (!body || !DATE_RE.test(body.date ?? "") || !["input", "output"].includes(body.mode ?? "")) {
    return json({ error: "invalid body" }, 400);
  }
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86_400) return json({ error: "invalid seconds" }, 400);

  const isInput = body.mode === "input";
  await env()
    .DB.prepare(`INSERT INTO study_sessions (user_id, date, input_seconds, output_seconds) VALUES (?, ?, ?, ?)`)
    .bind(user.id, body.date, isInput ? seconds : 0, isInput ? 0 : seconds)
    .run();
  return json({ ok: true }, 201);
}
