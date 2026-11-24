"use client";
import { useEffect, useState } from "react";
import { Award, Droplet, Leaf, Minus, Plus, Search, Trash2, TrendingUp, Utensils } from "lucide-react";
import { useAppData } from "@/lib/data/DataProvider";
import { achievements, lastNDays, nutritionForDay, proteinSeries, waterForDay, wasteSeries, wasteStats, weeklyReport, weeklySpendingSeries } from "@/lib/analytics";
import { apiGet } from "@/lib/api/client";
import { searchLocalFoods, lookupLocalFood, type FoodNutrition } from "@/lib/nutrition/foods";
import { cn, formatDate, formatMoney, parseDateKey, toDateKey } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Chip, ErrorNote, Field, Input, Modal, PageHeader, Ring } from "@/components/ui";
import { BarChart } from "@/components/ui/charts";
import { Penguin } from "@/components/mascot/Penguin";

function LogMealDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useAppData();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodNutrition[]>([]);
  const [source, setSource] = useState<"usda" | "local">("local");
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbohydrates: "", fat: "", servings: "1" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setQ(""); setResults([]); setF({ name: "", calories: "", protein: "", carbohydrates: "", fat: "", servings: "1" }); setErr(null); } }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      const r = await apiGet<{ results: FoodNutrition[]; source: "usda" | "local" }>(`/api/nutrition?q=${encodeURIComponent(term)}`);
      if (!live) return;
      if (r.ok) { setResults(r.data.results); setSource(r.data.source); }
      else { const exact = lookupLocalFood(term); const list = searchLocalFoods(term); setResults(exact && !list.includes(exact) ? [exact, ...list] : list); setSource("local"); }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const pick = (x: FoodNutrition) => { setF({ name: x.name, calories: String(x.calories), protein: String(x.protein), carbohydrates: String(x.carbohydrates), fat: String(x.fat), servings: "1" }); setResults([]); setQ(""); };

  const save = async () => {
    const s = Number(f.servings) || 1;
    const nums = [f.calories, f.protein, f.carbohydrates, f.fat].map((v) => Number(v || 0));
    if (!f.name.trim()) { setErr("Enter what you ate."); return; }
    if (nums.some((n) => n < 0 || Number.isNaN(n)) || s <= 0) { setErr("Values must be 0 or more."); return; }
    setBusy(true);
    const ok = await actions.logMeal({ meal_name: f.name, calories: nums[0] * s, protein: nums[1] * s, carbohydrates: nums[2] * s, fat: nums[3] * s, serving_size: s, is_estimate: true });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a meal" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void save()} loading={busy}>Log meal</Button></>}>
      <div className="flex flex-col gap-4">
        {err && <ErrorNote>{err}</ErrorNote>}
        <Field label="Look up a food" htmlFor="ml-q" hint={source === "usda" ? "Values from USDA FoodData Central (per 100 g)." : "Values from MyPantryPal's built-in food table (estimates)."}>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input id="ml-q" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. greek yogurt, egg, rice" /></div>
        </Field>
        {results.length > 0 && (
          <ul className="-mt-2 max-h-48 overflow-y-auto rounded-xl border border-line">
            {results.map((r) => <li key={r.name + r.per}><button type="button" onClick={() => pick(r)} className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ice"><span>{r.name} <span className="text-muted">· {r.per}</span></span><span className="tabular-nums text-muted">{r.calories} kcal · {r.protein} g P</span></button></li>)}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Meal" htmlFor="ml-n" className="col-span-2"><Input id="ml-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Servings" htmlFor="ml-s"><Input id="ml-s" type="number" min="0" step="0.5" value={f.servings} onChange={(e) => setF({ ...f, servings: e.target.value })} /></Field>
          {(["calories", "protein", "carbohydrates", "fat"] as const).map((k) => (
            <Field key={k} label={k === "calories" ? "Calories" : `${k[0].toUpperCase()}${k.slice(1)} (g)`} htmlFor={`ml-${k}`}><Input id={`ml-${k}`} type="number" min="0" step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
          ))}
        </div>
        <p className="text-xs text-muted">Per serving. Nutrition values are estimates for tracking, not medical advice.</p>
      </div>
    </Modal>
  );
}

export function ProgressView() {
  const { data, actions } = useAppData();
  const cur = data.profile.currency;
  const [day, setDay] = useState(toDateKey());
  const [logging, setLogging] = useState(false);
  const g = data.preferences.nutrition_goals;
  const n = nutritionForDay(data.meal_logs, day);
  const water = waterForDay(data, day);
  const isToday = day === toDateKey();
  const protein = proteinSeries(data, 7).map((p) => ({ label: p.label, value: p.protein, highlight: p.key === day }));
  const spend = weeklySpendingSeries(data.transactions, 6).map((s, i, a) => ({ label: s.label, value: s.amount, highlight: i === a.length - 1 }));
  const waste = wasteSeries(data, 6).map((w) => ({ label: w.label, value: w.used, secondary: w.wasted }));
  const ws = wasteStats(data);
  const report = weeklyReport(data);
  const badges = achievements(data);
  const earned = badges.filter((b) => b.earned).length;

  const rings = [
    { label: "Calories", v: n.calories, max: g.calories, unit: "kcal", color: "rgb(var(--mint-strong))" },
    { label: "Protein", v: n.protein, max: g.protein, unit: "g", color: "rgb(var(--sky-ink))" },
    { label: "Carbs", v: n.carbohydrates, max: g.carbohydrates, unit: "g", color: "rgb(var(--sun))" },
    { label: "Fat", v: n.fat, max: g.fat, unit: "g", color: "rgb(var(--danger))" }
  ];

  return (
    <div>
      <PageHeader title="Progress" subtitle="Nutrition, spending and food saved, all in one place." art={<Penguin mood="cheer" size={56} className="hidden sm:block" />} action={<Button onClick={() => setLogging(true)} icon={<Plus className="h-4 w-4" />}>Log a meal</Button>} />

      <Card className="mb-6 bg-gradient-to-br from-mint-soft to-ice">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Penguin mood="cheer" size={84} className="shrink-0" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Your week so far</h2>
            <p className="text-sm text-muted">{report.underBudgetBy >= 0 ? `You're ${formatMoney(report.underBudgetBy, cur)} under budget` : `You're ${formatMoney(-report.underBudgetBy, cur)} over budget`}, saved {report.productsSaved} product{report.productsSaved === 1 ? "" : "s"} from expiring and cooked {report.mealsCooked} meal{report.mealsCooked === 1 ? "" : "s"} at home.</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Spent", formatMoney(report.spent, cur)], ["Money saved", formatMoney(report.moneySaved, cur)], ["Meals cooked", report.mealsCooked], ["Protein days", `${report.proteinGoalDays}/7`]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-surface/80 px-3 py-2"><dd className="text-lg font-bold tabular-nums">{v}</dd><dt className="text-xs text-muted">{k}</dt></div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader icon={<Utensils className="h-5 w-5" />} title="Nutrition" subtitle={isToday ? "Today" : formatDate(day, { weekday: "long", month: "short", day: "numeric" })} />
          <div className="scrollbar-none -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
            {lastNDays(7).map((k) => <Chip key={k} active={k === day} onClick={() => setDay(k)}>{k === toDateKey() ? "Today" : parseDateKey(k).toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}</Chip>)}
          </div>
          <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-4">
            {rings.map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1.5">
                <Ring value={r.v} max={r.max} color={r.color} label={`${r.label}: ${r.v} of ${r.max} ${r.unit}`}><span className="text-base font-bold tabular-nums">{Math.round(r.v)}</span><span className="text-[10px] text-muted">/ {r.max}</span></Ring>
                <span className="text-xs font-medium">{r.label} <span className="text-muted">({r.unit})</span></span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-sky-soft px-4 py-3 text-sky-ink">
            <Droplet className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">Water: <span className="font-bold tabular-nums">{water}</span> / {g.water_ml} ml</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-surface/70"><div className="h-full rounded-full bg-sky-ink transition-all" style={{ width: `${Math.min(100, (water / Math.max(g.water_ml, 1)) * 100)}%` }} /></div></div>
            {isToday && <><Button size="sm" variant="secondary" aria-label="Remove last water entry" disabled={!water} onClick={() => void actions.undoLastWater()}><Minus className="h-4 w-4" /></Button><Button size="sm" onClick={() => void actions.logWater(250)} icon={<Plus className="h-4 w-4" />}>250 ml</Button></>}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Meals</p>
            {n.meals.length ? (
              <ul className="divide-y divide-line">
                {n.meals.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-12 shrink-0 text-xs tabular-nums text-muted">{new Date(m.consumed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.meal_name}{m.serving_size !== 1 ? ` ×${m.serving_size}` : ""}</p><p className="text-xs text-muted">{m.calories} kcal · {m.protein} g protein{m.is_estimate ? " · estimate" : ""}</p></div>
                    {m.recipe_id && <Badge tone="mint">Home-cooked</Badge>}
                    <Button size="sm" variant="ghost" aria-label={`Remove ${m.meal_name}`} onClick={() => void actions.deleteMeal(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No meals logged {isToday ? "yet today" : "on this day"}.</p>}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader icon={<TrendingUp className="h-5 w-5" />} title="Protein this week" subtitle={`Goal ${g.protein} g a day · reached on ${report.proteinGoalDays} day${report.proteinGoalDays === 1 ? "" : "s"}`} />
            <BarChart data={protein} goal={g.protein} format={(v) => `${Math.round(v)}g`} ariaLabel="Protein per day for the last 7 days" />
          </Card>
          <Card>
            <CardHeader icon={<TrendingUp className="h-5 w-5" />} title="Weekly spending" subtitle={`Budget ${formatMoney(data.preferences.budget_settings.weekly, cur)} a week`} />
            <BarChart data={spend} goal={data.preferences.budget_settings.weekly} format={(v) => formatMoney(v, cur).replace(/\.00$/, "")} ariaLabel="Spending per week" />
          </Card>
        </div>

        <Card>
          <CardHeader icon={<Leaf className="h-5 w-5" />} title="Food waste" subtitle="Used before expiry vs. thrown away" />
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Products saved", ws.usedBeforeExpiry, "text-mint-ink"], ["Money saved", formatMoney(ws.moneySaved, cur), "text-mint-ink"], ["Thrown away", ws.discarded, "text-danger-ink"], ["Money lost", formatMoney(ws.moneyLost, cur), "text-danger-ink"]].map(([k, v, c]) => (
              <div key={k as string} className="rounded-xl bg-ice px-3 py-2"><p className={cn("text-lg font-bold tabular-nums", c as string)}>{v}</p><p className="text-xs text-muted">{k}</p></div>
            ))}
          </div>
          <BarChart data={waste} primaryLabel="Used in time" secondaryLabel="Thrown away" ariaLabel="Products used and thrown away per week" />
          <p className="mt-3 text-xs text-muted">Values are estimates based on the price you paid or sample prices.</p>
        </Card>

        <Card>
          <CardHeader icon={<Award className="h-5 w-5" />} title="Achievements" subtitle={`${earned} of ${badges.length} earned`} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {badges.map((b) => (
              <li key={b.id} className={cn("flex items-center gap-3 rounded-2xl border p-3", b.earned ? "border-sun bg-sun-soft/60" : "border-line")}>
                <Penguin mood={b.earned ? "cheer" : "sleep"} size={44} stars={b.earned} className={cn(!b.earned && "opacity-50 grayscale")} />
                <div className="min-w-0"><p className="text-sm font-semibold">{b.title}</p><p className="text-xs text-muted">{b.description}</p><p className={cn("mt-0.5 text-xs font-medium", b.earned ? "text-sun-ink" : "text-muted")}>{b.progress}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <LogMealDialog open={logging} onClose={() => setLogging(false)} />
    </div>
  );
}
