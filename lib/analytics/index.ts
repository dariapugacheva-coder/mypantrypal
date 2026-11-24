import type { AppData, MealLog, Product, Transaction, TransactionItem } from "@/types/database";
import type { ExpiryStatus, ShoppingCategory } from "@/types/product";
import { addDays, daysUntil, inRange, parseDateKey, round, startOfDay, startOfMonth, startOfWeek, sum, toDateKey } from "@/lib/utils";

export function expiryStatus(p: Pick<Product, "expiration_date">): ExpiryStatus {
  const d = daysUntil(p.expiration_date);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= 1) return "urgent";
  if (d <= 3) return "soon";
  return "ok";
}

export const activeProducts = (products: Product[]) => products.filter((p) => p.quantity > 0);

export function expiringSoon(products: Product[], days = 3): Product[] {
  return activeProducts(products)
    .filter((p) => { const d = daysUntil(p.expiration_date); return d !== null && d >= 0 && d <= days; })
    .sort((a, b) => (daysUntil(a.expiration_date) ?? 99) - (daysUntil(b.expiration_date) ?? 99));
}

export const expired = (products: Product[]) => activeProducts(products).filter((p) => (daysUntil(p.expiration_date) ?? 1) < 0);

const txDate = (t: Transaction) => t.purchase_date;

export function spentBetween(transactions: Transaction[], start: Date, end: Date): number {
  return round(sum(transactions.filter((t) => inRange(txDate(t), start, end)).map((t) => t.total_amount)), 2);
}

export function budgetStatus(data: Pick<AppData, "transactions" | "preferences">, today = new Date()) {
  const { weekly, monthly } = data.preferences.budget_settings;
  const ws = startOfWeek(today);
  const ms = startOfMonth(today);
  const spentWeek = spentBetween(data.transactions, ws, addDays(ws, 7));
  const spentMonth = spentBetween(data.transactions, ms, new Date(today.getFullYear(), today.getMonth() + 1, 1));
  const daysElapsed = Math.max(1, Math.round((startOfDay(today).getTime() - ws.getTime()) / 86_400_000) + 1);
  // Projecting a whole week from one or two days is misleading, so the pace estimate starts on day 3.
  const projectedWeek = daysElapsed < 3 ? spentWeek : round((spentWeek / daysElapsed) * 7, 2);
  const pctWeek = weekly > 0 ? spentWeek / weekly : 0;
  const pctMonth = monthly > 0 ? spentMonth / monthly : 0;
  const level = (pct: number) => (pct >= 1 ? 100 : pct >= 0.9 ? 90 : pct >= 0.75 ? 75 : 0) as 0 | 75 | 90 | 100;
  return {
    weekly, monthly, spentWeek, spentMonth,
    remainingWeek: round(weekly - spentWeek, 2), remainingMonth: round(monthly - spentMonth, 2),
    pctWeek, pctMonth, levelWeek: level(pctWeek), levelMonth: level(pctMonth), projectedWeek,
    onTrack: projectedWeek <= weekly
  };
}

export function itemsInRange(data: Pick<AppData, "transactions" | "transaction_items">, start: Date, end: Date): TransactionItem[] {
  const ids = new Set(data.transactions.filter((t) => inRange(txDate(t), start, end)).map((t) => t.id));
  return data.transaction_items.filter((i) => ids.has(i.transaction_id));
}

export function spendingByCategory(data: Pick<AppData, "transactions" | "transaction_items">, start: Date, end: Date) {
  const totals = new Map<ShoppingCategory, number>();
  for (const i of itemsInRange(data, start, end)) totals.set(i.category, (totals.get(i.category) ?? 0) + i.unit_price * i.quantity);
  return [...totals.entries()].map(([category, amount]) => ({ category, amount: round(amount, 2) })).sort((a, b) => b.amount - a.amount);
}

export function weeklySpendingSeries(transactions: Transaction[], weeks = 8, today = new Date()) {
  const thisWeek = startOfWeek(today);
  return Array.from({ length: weeks }, (_, k) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - k));
    return { label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start, amount: spentBetween(transactions, start, addDays(start, 7)) };
  });
}

export function averageWeeklySpending(transactions: Transaction[], weeks = 4, today = new Date()): number {
  const series = weeklySpendingSeries(transactions, weeks + 1, today).slice(0, weeks);
  const active = series.filter((s) => s.amount > 0);
  return active.length ? round(sum(active.map((s) => s.amount)) / active.length, 2) : 0;
}

const sameDay = (iso: string, key: string) => toDateKey(new Date(iso)) === key;

export function nutritionForDay(meals: MealLog[], dateKey = toDateKey()) {
  const m = meals.filter((x) => sameDay(x.consumed_at, dateKey));
  return {
    calories: round(sum(m.map((x) => x.calories))),
    protein: round(sum(m.map((x) => x.protein)), 1),
    carbohydrates: round(sum(m.map((x) => x.carbohydrates)), 1),
    fat: round(sum(m.map((x) => x.fat)), 1),
    meals: m.sort((a, b) => a.consumed_at.localeCompare(b.consumed_at))
  };
}

export function waterForDay(data: Pick<AppData, "water_logs">, dateKey = toDateKey()): number {
  return sum(data.water_logs.filter((w) => sameDay(w.logged_at, dateKey)).map((w) => w.amount_ml));
}

export function lastNDays(n: number, today = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => toDateKey(addDays(today, i - (n - 1))));
}

export function proteinSeries(data: Pick<AppData, "meal_logs" | "preferences">, days = 7) {
  return lastNDays(days).map((key) => {
    const n = nutritionForDay(data.meal_logs, key);
    return { key, label: parseDateKey(key).toLocaleDateString("en-US", { weekday: "short" }), protein: n.protein, calories: n.calories, met: n.protein >= data.preferences.nutrition_goals.protein };
  });
}

export function wasteStats(data: Pick<AppData, "food_waste_logs" | "usage_logs">, start?: Date, end?: Date) {
  const within = <T extends { created_at: string }>(rows: T[]) => (start && end ? rows.filter((r) => inRange(r.created_at, start, end)) : rows);
  const waste = within(data.food_waste_logs);
  const used = within(data.usage_logs);
  const rescued = used.filter((u) => u.used_before_expiry);
  return {
    discarded: waste.length,
    moneyLost: round(sum(waste.map((w) => w.estimated_value)), 2),
    usedBeforeExpiry: rescued.length,
    moneySaved: round(sum(rescued.map((u) => u.estimated_value)), 2),
    wasteRate: rescued.length + waste.length ? waste.length / (rescued.length + waste.length) : 0
  };
}

export function wasteSeries(data: Pick<AppData, "food_waste_logs" | "usage_logs">, weeks = 6, today = new Date()) {
  const thisWeek = startOfWeek(today);
  return Array.from({ length: weeks }, (_, k) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - k));
    const s = wasteStats(data, start, addDays(start, 7));
    return { label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), used: s.usedBeforeExpiry, wasted: s.discarded };
  });
}

export function weeklyReport(data: AppData, today = new Date()) {
  const start = startOfWeek(today);
  const end = addDays(start, 7);
  const budget = budgetStatus(data, today);
  const w = wasteStats(data, start, end);
  const cooked = data.meal_logs.filter((m) => m.recipe_id && inRange(m.consumed_at, start, end)).length;
  const proteinDays = proteinSeries(data, 7).filter((d) => d.met).length;
  return {
    spent: budget.spentWeek,
    underBudgetBy: round(budget.weekly - budget.spentWeek, 2),
    productsSaved: w.usedBeforeExpiry,
    moneySaved: w.moneySaved,
    mealsCooked: cooked,
    proteinGoalDays: proteinDays,
    discarded: w.discarded
  };
}

/** Plain-language insights computed only from stored records. */
export function budgetInsights(data: AppData, today = new Date()): string[] {
  const out: string[] = [];
  const thisWeek = startOfWeek(today);
  const lastWeek = addDays(thisWeek, -7);
  const cur = spendingByCategory(data, thisWeek, addDays(thisWeek, 7));
  const prev = spendingByCategory(data, lastWeek, thisWeek);
  for (const c of cur) {
    const p = prev.find((x) => x.category === c.category);
    if (p && p.amount > 0) {
      const change = (c.amount - p.amount) / p.amount;
      if (Math.abs(change) >= 0.15) out.push(`You spent ${Math.round(Math.abs(change) * 100)}% ${change > 0 ? "more" : "less"} on ${c.category.toLowerCase()} this week than last week.`);
    }
  }
  const b = budgetStatus(data, today);
  if (b.spentWeek > 0) out.push(b.onTrack ? `At your current pace (${formatPct(b.projectedWeek / Math.max(b.weekly, 1))} of budget) you are likely to stay within your weekly budget.` : `At your current pace you may spend about $${b.projectedWeek.toFixed(0)} this week, over your $${b.weekly.toFixed(0)} budget.`);
  const monthItems = itemsInRange(data, startOfMonth(today), addDays(today, 1));
  const counts = new Map<string, { n: number; name: string }>();
  for (const i of monthItems) {
    const k = i.product_name.toLowerCase();
    counts.set(k, { n: (counts.get(k)?.n ?? 0) + 1, name: i.product_name });
  }
  const repeat = [...counts.values()].filter((c) => c.n >= 3).sort((a, b) => b.n - a.n)[0];
  if (repeat) out.push(`You bought ${repeat.name} ${repeat.n} times this month. A larger package could cost less per unit.`);
  const w = wasteStats(data, startOfMonth(today), addDays(today, 1));
  if (w.moneyLost > 0) out.push(`Food thrown away this month is worth about $${w.moneyLost.toFixed(2)}.`);
  return out;
}

const formatPct = (x: number) => `${Math.round(x * 100)}%`;

export interface Achievement { id: string; title: string; description: string; earned: boolean; progress: string }

export function achievements(data: AppData): Achievement[] {
  const scans = data.products.filter((p) => p.notes?.includes("Added from fridge scan")).length;
  const homeMeals = data.meal_logs.filter((m) => m.recipe_id).length;
  const report = weeklyReport(data);
  const budget = budgetStatus(data);
  const zeroWasteDay = lastNDays(7).some((key) => data.usage_logs.some((u) => toDateKey(new Date(u.created_at)) === key) && !data.food_waste_logs.some((w) => toDateKey(new Date(w.created_at)) === key));
  const couponsUsed = data.coupon_saves.filter((c) => c.status === "used").length;
  return [
    { id: "first-scan", title: "First Fridge Scan", description: "Scan your fridge for the first time.", earned: scans > 0, progress: scans > 0 ? "Done" : "Scan your fridge" },
    { id: "zero-waste", title: "Zero Waste Day", description: "Use food and throw nothing away in one day.", earned: zeroWasteDay, progress: zeroWasteDay ? "Done this week" : "Mark food as used" },
    { id: "budget-hero", title: "Budget Hero", description: "Stay under your weekly budget.", earned: budget.spentWeek > 0 && budget.spentWeek <= budget.weekly, progress: `$${budget.spentWeek.toFixed(0)} of $${budget.weekly.toFixed(0)}` },
    { id: "protein-champion", title: "Protein Champion", description: "Reach your protein goal 3 days in a week.", earned: report.proteinGoalDays >= 3, progress: `${report.proteinGoalDays} of 3 days` },
    { id: "five-meals", title: "Five Home-Cooked Meals", description: "Cook 5 meals from MyPantryPal recipes.", earned: homeMeals >= 5, progress: `${Math.min(homeMeals, 5)} of 5 meals` },
    { id: "smart-shopper", title: "Smart Shopper", description: "Use a coupon or buy a cheaper alternative.", earned: couponsUsed > 0, progress: couponsUsed > 0 ? "Done" : "Use a coupon" }
  ];
}
