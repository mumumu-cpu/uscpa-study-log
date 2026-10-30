import { env, json, requireUser } from "@/lib/server";
import { CATEGORY_LABEL, type Task, type TaskCategory } from "@/lib/types";

export const runtime = "edge";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const body = (await req.json().catch(() => null)) as { id?: string; title?: string; category?: string } | null;
  const title = body?.title?.trim().slice(0, 120);
  const category = (body?.category ?? "other") as TaskCategory;
  if (!title || !(category in CATEGORY_LABEL)) return json({ error: "invalid body" }, 400);

  // The client picks the id so its optimistic card keeps a stable key.
  const id = body?.id && UUID_RE.test(body.id) ? body.id : crypto.randomUUID();
  const task: Task = { id, title, category, status: "todo" };
  await env()
    .DB.prepare(`INSERT INTO tasks (id, user_id, title, category, status, sort_order) VALUES (?, ?, ?, ?, 'todo', ?)`)
    .bind(task.id, user.id, task.title, task.category, Date.now())
    .run();
  return json(task, 201);
}
