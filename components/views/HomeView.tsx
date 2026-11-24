"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Beef, ChefHat, Leaf, Lightbulb, Pill, Refrigerator, ShoppingBasket, Wallet } from "lucide-react";
import { useAppData } from "@/lib/data/DataProvider";
import { Link, useNav } from "@/lib/nav";
import { budgetStatus, expiringSoon, nutritionForDay, wasteStats, activeProducts } from "@/lib/analytics";
import { contextualTip } from "@/lib/ai/tips";
import { apiPost } from "@/lib/api/client";
import { useIntegrations, useNow } from "@/lib/hooks";
import { useRankedRecipes } from "@/lib/recipes/useRecipes";
import { matchIngredient } from "@/lib/recipes/engine";
import { setIntent } from "@/lib/intent";
import { productKey } from "@/lib/etl/normalize";
import { cn, daysUntil, formatDate, formatMoney, greeting, relativeDays, toDateKey } from "@/lib/utils";
import { Badge, Button, ButtonLink, Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";
import { FoodIcon } from "@/components/ui/food-icon";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { Avatar, NotificationBell } from "@/components/layout/AppShell";

function SummaryCard({ title, icon, children, href, cta, tone = "mint" }: { title: string; icon: React.ReactNode; children: React.ReactNode; href: string; cta: string; tone?: "mint" | "sun" | "sky" | "danger" }) {
  const tint = tone === "sun" ? "bg-sun-soft text-sun-ink" : tone === "sky" ? "bg-sky-soft text-sky-ink" : tone === "danger" ? "bg-danger-soft text-danger-ink" : "bg-mint-soft text-mint-ink";
  return (
    <Card className="flex flex-col gap-4 transition hover:shadow-lift">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tint)}>{icon}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex-1">{children}</div>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-mint-ink hover:underline">{cta}<ArrowRight className="h-4 w-4" /></Link>
    </Card>
  );
}

export function HomeView() {
  const { data, actions } = useAppData();
  const nav = useNav();
  const now = useNow();
  const integrations = useIntegrations();
  const cur = data.profile.currency;
  const todayKey = toDateKey(now);

  const products = activeProducts(data.products);
  const soon = expiringSoon(data.products, 3);
  const budget = budgetStatus(data, now);
  const nutrition = nutritionForDay(data.meal_logs, todayKey);
  const goals = data.preferences.nutrition_goals;
  const waste = wasteStats(data);
  const ranked = useRankedRecipes(data);
  const top = ranked.slice(0, 3);
  const saved = new Set(data.saved_recipes.map((s) => s.recipe_id));
  const openList = data.shopping_items.filter((i) => !i.purchased);
  const missing = useMemo(() => {
    const names = new Map<string, string>();
    for (const r of top) for (const ing of r.recipe.ingredients) if (!ing.optional && matchIngredient(ing.key, data.products).state === "missing" && !openList.some((i) => productKey(i.product_name) === ing.key)) names.set(ing.key, ing.name);
    return [...names.values()].slice(0, 5);
  }, [top, data.products, openList]);

  const fallbackTip = useMemo(() => contextualTip(data), [data]);
  const [tip, setTip] = useState<{ text: string; ai: boolean }>({ text: fallbackTip, ai: false });
  useEffect(() => {
    setTip({ text: fallbackTip, ai: false });
    if (!integrations?.ai_text) return;
    let live = true;
    apiPost<{ tip: string }>("/api/ai/tip", {
      expiring: soon.slice(0, 5).map((p) => ({ name: p.name, days: daysUntil(p.expiration_date) ?? 0 })),
      budgetUsedPct: Math.min(budget.pctWeek, 9), proteinToday: nutrition.protein, proteinGoal: goals.protein
    }).then((r) => { if (live && r.ok) setTip({ text: r.data.tip, ai: true }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrations?.ai_text, todayKey, soon.length]);

  const dow = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const reminders = data.reminders.filter((r) => r.enabled && r.repeat_days.includes(dow)).sort((a, b) => a.reminder_time.localeCompare(b.reminder_time));
  const firstName = data.profile.full_name.split(" ")[0] || "there";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Penguin mood="wave" size={64} className="hidden sm:block" />
          <div className="min-w-0">
            <p className="text-sm text-muted">{formatDate(todayKey, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greeting(now)}, {firstName}!</h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <NotificationBell />
          <Link href="/profile" aria-label="Profile"><Avatar name={data.profile.full_name || "You"} size={40} /></Link>
        </div>
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="My Fridge" icon={<Refrigerator className="h-5 w-5" />} href="/fridge" cta="View Fridge">
          <p className="text-3xl font-bold tabular-nums">{products.length}<span className="ml-1 text-base font-medium text-muted">products</span></p>
          <p className={cn("mt-1 text-sm", soon.length ? "font-medium text-danger-ink" : "text-muted")}>{soon.length ? `${soon.length} expiring in the next 3 days` : "Nothing expiring soon"}</p>
        </SummaryCard>
        <SummaryCard title="Weekly Budget" icon={<Wallet className="h-5 w-5" />} href="/shop" cta="View Budget" tone={budget.levelWeek >= 90 ? "danger" : "sun"}>
          <p className="text-3xl font-bold tabular-nums">{formatMoney(Math.max(budget.remainingWeek, 0), cur)}<span className="ml-1 text-base font-medium text-muted">left</span></p>
          <ProgressBar className="mt-3" value={budget.spentWeek} max={budget.weekly} tone={budget.levelWeek >= 100 ? "danger" : budget.levelWeek >= 75 ? "warning" : "mint"} label="Weekly budget used" />
          <p className="mt-1.5 text-xs text-muted">{formatMoney(budget.spentWeek, cur)} of {formatMoney(budget.weekly, cur)} spent</p>
        </SummaryCard>
        <SummaryCard title="Nutrition today" icon={<Beef className="h-5 w-5" />} href="/progress" cta="View Nutrition" tone="sky">
          <div className="flex flex-col gap-2.5">
            <div><div className="flex justify-between text-xs"><span className="font-medium">Protein</span><span className="tabular-nums text-muted">{nutrition.protein} / {goals.protein} g</span></div><ProgressBar value={nutrition.protein} max={goals.protein} label="Protein" className="mt-1" /></div>
            <div><div className="flex justify-between text-xs"><span className="font-medium">Calories</span><span className="tabular-nums text-muted">{nutrition.calories} / {goals.calories}</span></div><ProgressBar value={nutrition.calories} max={goals.calories} tone="sky" label="Calories" className="mt-1" /></div>
          </div>
        </SummaryCard>
        <SummaryCard title="Food Saved" icon={<Leaf className="h-5 w-5" />} href="/progress" cta="View Progress">
          <p className="text-3xl font-bold tabular-nums">{waste.usedBeforeExpiry}<span className="ml-1 text-base font-medium text-muted">used in time</span></p>
          <p className="mt-1 text-sm text-muted">About <b className="text-mint-ink">{formatMoney(waste.moneySaved, cur)}</b> of food not wasted</p>
        </SummaryCard>
      </section>

      <Card className="flex items-start gap-4 bg-sun-soft/60 border-sun/30">
        <Penguin mood="think" size={52} stars={false} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sun-ink"><Lightbulb className="h-4 w-4" />Daily tip {tip.ai && <Badge tone="sky">AI</Badge>}</p>
          <p className="mt-1 text-base font-medium text-ink">{tip.text}</p>
        </div>
      </Card>

      <section aria-labelledby="soon-title">
        <SectionTitle id="soon-title" action={<Link href="/fridge" className="text-sm font-medium text-mint-ink hover:underline">All products</Link>}>Use These Soon!</SectionTitle>
        {soon.length ? (
          <ul className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {soon.map((p) => {
              const d = daysUntil(p.expiration_date) ?? 0;
              return (
                <li key={p.id} className={cn("flex w-60 shrink-0 snap-start flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-card", d <= 1 ? "border-danger/50" : "border-line/60")}>
                  <div className="flex items-center gap-3">
                    <FoodIcon category={p.category} imageUrl={p.image_url} name={p.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">{p.quantity} {p.unit} · {formatDate(p.expiration_date)}</p>
                    </div>
                  </div>
                  <Badge tone={d <= 1 ? "danger" : "warning"} className="self-start">{relativeDays(d)}</Badge>
                  <Button variant="soft" size="sm" icon={<ChefHat className="h-4 w-4" />} onClick={() => { setIntent({ type: "cook-with", key: productKey(p.name), name: p.name }); nav.push("/cook"); }}>Find a Recipe</Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState art={<Penguin mood="cheer" size={60} />} title="Nothing is about to expire" body="Great job! Everything in your fridge has at least four days left." />
        )}
      </section>

      <section aria-labelledby="rec-title">
        <SectionTitle id="rec-title" action={<Link href="/cook" className="text-sm font-medium text-mint-ink hover:underline">More recipes</Link>}>Recommended for you</SectionTitle>
        {top.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{top.map((r) => <RecipeCard key={r.recipe.id} ranked={r} saved={saved.has(r.recipe.id)} currency={cur} />)}</div>
        ) : (
          <EmptyState title="No recipes match yet" body="Add a few products to your fridge or relax a filter in your food preferences." action={<ButtonLink href="/fridge">Add products</ButtonLink>} />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-soft text-mint-ink"><ShoppingBasket className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Smart shopping reminder</h2><p className="text-sm text-muted">{formatMoney(Math.max(budget.remainingWeek, 0), cur)} left in this week's budget</p></div>
            </div>
            <ButtonLink href="/shop" size="sm" variant="secondary">Open list</ButtonLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">On your list ({openList.length})</p>
              {openList.length ? <ul className="flex flex-col gap-1.5 text-sm">{openList.slice(0, 5).map((i) => <li key={i.id} className="flex justify-between gap-2"><span className="truncate">{i.product_name}</span><span className="text-muted">{i.quantity} {i.unit}</span></li>)}</ul> : <p className="text-sm text-muted">Your list is empty.</p>}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Missing for top recipes</p>
              {missing.length ? <ul className="flex flex-wrap gap-1.5">{missing.map((m) => <li key={m}><Badge tone="sky">{m}</Badge></li>)}</ul> : <p className="text-sm text-muted">You have what you need.</p>}
            </div>
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-soft text-sun-ink"><Pill className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Today's reminders</h2><p className="text-sm text-muted">Vitamins and supplements you set up</p></div>
          </div>
          {reminders.length ? (
            <ul className="flex flex-col gap-2">
              {reminders.map((r) => {
                const done = r.last_done_on === todayKey;
                const due = !done && r.reminder_time <= hhmm;
                return (
                  <li key={r.id} className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5", due ? "bg-sun-soft" : "bg-ice")}>
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{r.title}</p><p className="text-xs text-muted">{r.reminder_time}{r.notes ? ` · ${r.notes}` : ""}</p></div>
                    {done ? <Badge tone="mint">Taken</Badge> : <Button size="sm" variant={due ? "primary" : "secondary"} onClick={() => void actions.markReminderDone(r.id)}>Mark taken</Button>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">No reminders today. Add one in your <Link href="/profile" className="text-mint-ink underline">profile</Link>.</p>}
        </Card>
      </section>
    </div>
  );
}
