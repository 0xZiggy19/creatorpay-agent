export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function daysBetween(fromISO: string, toISODate: string): number {
  const a = new Date(fromISO + "T12:00:00").getTime();
  const b = new Date(toISODate + "T12:00:00").getTime();
  return Math.round((b - a) / 86400000);
}
export function weekdayName(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
}
