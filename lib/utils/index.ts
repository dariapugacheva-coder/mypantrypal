import clsx, { type ClassValue } from "clsx";

export const cn = (...values: ClassValue[]) => clsx(values);

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const nowIso = () => new Date().toISOString();

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export const dateKeyIn = (days: number, from: Date = new Date()) => toDateKey(addDays(from, days));

export function startOfDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today until the given date (negative when in the past). */
export function daysUntil(dateKey: string | null | undefined, today: Date = new Date()): number | null {
  if (!dateKey) return null;
  const diff = parseDateKey(dateKey).getTime() - startOfDay(today).getTime();
  return Math.round(diff / 86_400_000);
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date = new Date()): Date {
  const s = startOfDay(d);
  const day = (s.getDay() + 6) % 7;
  return addDays(s, -day);
}

export const startOfMonth = (d: Date = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export function inRange(iso: string, start: Date, end: Date): boolean {
  const t = iso.length <= 10 ? parseDateKey(iso).getTime() : new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function formatMoney(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function formatDate(dateKey: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  if (!dateKey) return "No date";
  const d = dateKey.length <= 10 ? parseDateKey(dateKey) : new Date(dateKey);
  return d.toLocaleDateString("en-US", opts);
}

export function relativeDays(n: number | null): string {
  if (n === null) return "No expiry date";
  if (n < -1) return `Expired ${-n} days ago`;
  if (n === -1) return "Expired yesterday";
  if (n === 0) return "Expires today";
  if (n === 1) return "Expires tomorrow";
  return `${n} days left`;
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const round = (n: number, digits = 0) => Math.round(n * 10 ** digits) / 10 ** digits;
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function titleCase(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
