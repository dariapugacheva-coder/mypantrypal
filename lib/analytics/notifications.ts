import type { AppData } from "@/types/database";
import { budgetStatus, expired, expiringSoon } from "./index";
import { daysUntil, relativeDays, toDateKey } from "@/lib/utils";

export interface AppNotification {
  id: string;
  kind: "expiration" | "budget" | "vitamins" | "shopping" | "weekly_report" | "coupon";
  tone: "danger" | "warning" | "info" | "success";
  title: string;
  body: string;
  href: string;
}

/** Notifications are derived from the user's data each time, so they are always current. */
export function buildNotifications(data: AppData, now = new Date()): AppNotification[] {
  const s = data.preferences.notification_settings;
  const out: AppNotification[] = [];
  if (s.expiration) {
    for (const p of expired(data.products)) out.push({ id: `exp-${p.id}`, kind: "expiration", tone: "danger", title: `${p.name} has expired`, body: "Check it and mark it as used or discarded.", href: "/fridge" });
    for (const p of expiringSoon(data.products, 2)) out.push({ id: `soon-${p.id}`, kind: "expiration", tone: "warning", title: `${p.name}: ${relativeDays(daysUntil(p.expiration_date)).toLowerCase()}`, body: "Find a recipe that uses it.", href: "/cook" });
  }
  if (s.budget) {
    const b = budgetStatus(data, now);
    if (b.levelWeek >= 75) out.push({ id: `budget-${b.levelWeek}`, kind: "budget", tone: b.levelWeek >= 100 ? "danger" : "warning", title: b.levelWeek >= 100 ? "You have reached your weekly budget" : `You have used ${b.levelWeek}% of your weekly budget`, body: `Spent $${b.spentWeek.toFixed(2)} of $${b.weekly.toFixed(2)}.`, href: "/shop" });
  }
  if (s.vitamins) {
    const today = toDateKey(now);
    const dow = now.getDay();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    for (const r of data.reminders) {
      if (!r.enabled || !r.repeat_days.includes(dow) || r.last_done_on === today) continue;
      out.push({ id: `rem-${r.id}`, kind: "vitamins", tone: r.reminder_time <= hhmm ? "warning" : "info", title: r.reminder_time <= hhmm ? `Time for your ${r.title}` : `${r.title} at ${r.reminder_time}`, body: r.notes || "Mark it as taken on the Home screen.", href: "/home" });
    }
  }
  if (s.shopping) {
    const open = data.shopping_items.filter((i) => !i.purchased).length;
    if (open > 0) out.push({ id: "shopping", kind: "shopping", tone: "info", title: `${open} item${open === 1 ? "" : "s"} on your shopping list`, body: "Open your list before you go to the store.", href: "/shop" });
  }
  for (const save of data.coupon_saves.filter((c) => c.status === "saved")) {
    const c = data.coupons.find((x) => x.id === save.coupon_id);
    const d = c ? daysUntil(c.expiration_date) : null;
    if (c && d !== null && d >= 0 && d <= 3) out.push({ id: `coupon-${c.id}`, kind: "coupon", tone: "info", title: `Saved deal ends soon: ${c.product_name}`, body: `${c.discount} at ${c.store_name}${c.is_demo ? " (demo coupon)" : ""}.`, href: "/shop" });
  }
  if (s.weekly_report && now.getDay() === 0) out.push({ id: "weekly", kind: "weekly_report", tone: "success", title: "Your weekly report is ready", body: "See how much you saved this week.", href: "/progress" });
  return out;
}
