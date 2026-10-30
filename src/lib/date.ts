const pad = (n: number) => String(n).padStart(2, "0");

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the week containing `d`, as YYYY-MM-DD in local time. */
export function weekStart(d = new Date()): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return localDate(copy);
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}
