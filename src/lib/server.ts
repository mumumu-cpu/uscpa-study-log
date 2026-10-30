import { getRequestContext } from "@cloudflare/next-on-pages";
import { currentUser, type AppUser } from "./auth";

export function env(): CloudflareEnv {
  return getRequestContext().env;
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });

export async function requireUser(): Promise<AppUser | Response> {
  const user = await currentUser();
  return user ?? json({ error: "unauthorized" }, 401);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
