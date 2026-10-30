import { env, json, requireUser } from "@/lib/server";
import { STATUSES, type TaskStatus } from "@/lib/types";

export const runtime = "edge";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as { status?: TaskStatus } | null;
  if (!body?.status || !STATUSES.includes(body.status)) return json({ error: "invalid status" }, 400);

  const res = await env()
    .DB.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .bind(body.status, id, user.id)
    .run();
  return res.meta.changes ? json({ ok: true }) : json({ error: "not found" }, 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await params;

  await env().DB.prepare(`DELETE FROM tasks WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return json({ ok: true });
}
