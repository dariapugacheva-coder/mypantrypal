"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, ChefHat, Clock, Pause, Play, RotateCcw, ShoppingCart, Users } from "lucide-react";
import type { Product } from "@/types/database";
import type { Recipe } from "@/types/recipe";
import { useAppData } from "@/lib/data/DataProvider";
import { useNav, useRouteParam, Link } from "@/lib/nav";
import { findRecipe } from "@/lib/recipes/useRecipes";
import { matchIngredient, violatesAllergies } from "@/lib/recipes/engine";
import { cn, formatMoney, round } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, InfoNote, Input, Modal, ProgressBar, Select, Stars } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";
import { RecipeCover } from "@/components/recipes/RecipeCover";
import { useToast } from "@/components/ui/toast";

function Timer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => { setLeft(seconds); setRunning(false); }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { setRunning(false); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [running]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3", left === 0 ? "bg-sun-soft text-sun-ink" : "bg-ice")}>
      <Clock className="h-5 w-5" aria-hidden />
      <span className="text-2xl font-bold tabular-nums" aria-live="polite">{left === 0 ? "Time's up!" : `${mm}:${ss}`}</span>
      <span className="flex-1" />
      {left > 0 && <Button size="sm" variant={running ? "secondary" : "primary"} onClick={() => setRunning(!running)} icon={running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>{running ? "Pause" : "Start timer"}</Button>}
      <Button size="sm" variant="ghost" aria-label="Reset timer" onClick={() => { setLeft(seconds); setRunning(false); }}><RotateCcw className="h-4 w-4" /></Button>
    </div>
  );
}

/** Suggests how much of a fridge product a recipe uses, only when units are comparable. */
function suggestedAmount(ingAmount: number, ingUnit: string, p: Product): number {
  if (ingUnit === p.unit) return Math.min(ingAmount, p.quantity);
  if (ingUnit === "pcs" && ["pcs", "bunch", "loaf"].includes(p.unit)) return Math.min(ingAmount, p.quantity);
  if (ingUnit === "g" && p.unit === "kg") return Math.min(round(ingAmount / 1000, 2), p.quantity);
  if (ingUnit === "ml" && p.unit === "l") return Math.min(round(ingAmount / 1000, 2), p.quantity);
  if (ingUnit === "slices" && p.unit === "loaf") return Math.min(round(ingAmount / 20, 2), p.quantity);
  return 0;
}

function FinishDialog({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const { data, actions } = useAppData();
  const nav = useNav();
  const [stage, setStage] = useState<"ask" | "details">("ask");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [portion, setPortion] = useState("1");
  const [busy, setBusy] = useState(false);
  const matched = useMemo(() => recipe.ingredients.map((ing) => ({ ing, product: matchIngredient(ing.key, data.products).product })).filter((x): x is { ing: typeof x.ing; product: Product } => Boolean(x.product)), [recipe, data.products]);

  useEffect(() => {
    if (!open) return;
    setStage("ask"); setPortion(String(Math.min(1, recipe.servings)));
    setAmounts(Object.fromEntries(matched.map(({ ing, product }) => [product.id, String(suggestedAmount(ing.amount, ing.unit, product))])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    setBusy(true);
    const used = Object.entries(amounts).map(([productId, v]) => ({ productId, amount: Number(v) || 0 })).filter((u) => u.amount > 0);
    const ok = await actions.finishCooking({ recipe, used, portion: portion === "none" ? null : Number(portion) });
    setBusy(false);
    if (ok) { onClose(); nav.push("/progress"); }
  };

  return (
    <Modal open={open} onClose={onClose} title={stage === "ask" ? "Did you cook it?" : "Update your fridge"} size="md"
      footer={stage === "ask" ? <><Button variant="secondary" onClick={onClose}>Not yet</Button><Button onClick={() => setStage("details")} icon={<Check className="h-4 w-4" />}>Yes, I cooked it</Button></> : <><Button variant="secondary" onClick={() => setStage("ask")}>Back</Button><Button onClick={() => void save()} loading={busy}>Save</Button></>}>
      {stage === "ask" ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Penguin mood="cheer" size={96} />
          <p className="text-sm text-muted">Nothing changes until you confirm. Next you can check how much of each product you used and how much you ate.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {matched.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">How much did you use?</p>
              {matched.map(({ ing, product }) => (
                <div key={product.id + ing.key} className="flex items-center gap-3">
                  <label htmlFor={`use-${product.id}`} className="min-w-0 flex-1 text-sm"><span className="font-medium">{product.name}</span><span className="block text-xs text-muted">Recipe: {ing.amount} {ing.unit} · You have {product.quantity} {product.unit}</span></label>
                  <Input id={`use-${product.id}`} type="number" min="0" step="any" max={product.quantity} value={amounts[product.id] ?? "0"} onChange={(e) => setAmounts((a) => ({ ...a, [product.id]: e.target.value }))} className="w-24" />
                  <span className="w-12 text-xs text-muted">{product.unit}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted">None of the ingredients were matched to your fridge, so nothing will be removed.</p>}
          <Field label="How much did you eat?" htmlFor="portion" hint="Nutrition is estimated from the recipe and added to today.">
            <Select id="portion" value={portion} onChange={(e) => setPortion(e.target.value)}>
              <option value="none">I didn't eat it yet</option>
              {[0.5, 1, 1.5, 2, 3].filter((n) => n <= recipe.servings * 1.5 || n === 1).map((n) => <option key={n} value={n}>{n} serving{n === 1 ? "" : "s"} (~{Math.round(recipe.calories * n)} kcal, {round(recipe.protein * n, 1)} g protein)</option>)}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  );
}

function CookingMode({ recipe, open, onClose, onFinish }: { recipe: Recipe; open: boolean; onClose: () => void; onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) { setStep(0); setChecked(new Set()); } }, [open]);
  useEffect(() => {
    if (!open) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => undefined);
    return () => { void lock?.release().catch(() => undefined); };
  }, [open]);
  const s = recipe.instructions[step];
  const last = step === recipe.instructions.length - 1;
  return (
    <Modal open={open} onClose={onClose} title={recipe.name} size="lg"
      footer={<>
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)} icon={<ArrowLeft className="h-4 w-4" />}>Previous</Button>
        {last ? <Button onClick={onFinish} icon={<Check className="h-4 w-4" />}>Finish cooking</Button> : <Button onClick={() => setStep(step + 1)}>Next step<ArrowRight className="h-4 w-4" /></Button>}
      </>}>
      <div className="grid gap-6 md:grid-cols-[1fr_15rem]">
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex justify-between text-sm text-muted"><span>Step {step + 1} of {recipe.instructions.length}</span><span>{Math.round(((step + 1) / recipe.instructions.length) * 100)}%</span></div>
            <ProgressBar value={step + 1} max={recipe.instructions.length} label="Cooking progress" />
          </div>
          <p className="text-xl font-medium leading-relaxed [text-wrap:pretty]">{s?.text}</p>
          {s?.timer_seconds ? <Timer seconds={s.timer_seconds} /> : null}
          <div className="flex items-center gap-3 text-sm text-muted"><Penguin mood="chef" size={44} stars={false} />{last ? "Last step! You're doing great." : "Take your time. I'll wait here."}</div>
        </div>
        <div className="rounded-2xl bg-ice p-4">
          <p className="mb-2 text-sm font-semibold">Ingredients</p>
          <ul className="flex flex-col gap-1.5">
            {recipe.ingredients.map((i) => (
              <li key={i.key + i.name}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--mint-strong))]" checked={checked.has(i.name)} onChange={() => setChecked((c) => { const n = new Set(c); if (n.has(i.name)) n.delete(i.name); else n.add(i.name); return n; })} />
                  <span className={cn(checked.has(i.name) && "text-muted line-through")}>{i.amount} {i.unit} {i.name}{i.optional ? " (optional)" : ""}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

export function RecipeView() {
  const { data, actions } = useAppData();
  const id = useRouteParam("id");
  const nav = useNav();
  const toast = useToast();
  const recipe = id ? findRecipe(data, id) : null;
  const [cooking, setCooking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!recipe) return <EmptyState art={<Penguin mood="think" size={90} />} title="Recipe not found" body="This recipe may have been removed." action={<Button onClick={() => nav.push("/cook")}>Back to recipes</Button>} />;

  const states = recipe.ingredients.map((ing) => ({ ing, ...matchIngredient(ing.key, data.products) }));
  const missing = states.filter((s) => s.state === "missing" && !s.ing.optional);
  const saved = data.saved_recipes.some((s) => s.recipe_id === recipe.id);
  const rating = [...data.recipe_ratings].reverse().find((r) => r.recipe_id === recipe.id)?.rating ?? 0;
  const unsafe = violatesAllergies(recipe, data.preferences.allergies);
  const cur = data.profile.currency;
  const cost = recipe.ingredients.filter((i) => !i.optional).reduce((s, i) => s + i.cost, 0);

  const addMissing = async () => {
    setAdding(true);
    const r = await actions.addMissingIngredients(recipe);
    setAdding(false);
    if (r.added === 0) toast.success(r.skipped ? "Those ingredients are already on your shopping list." : "You already have everything you need.");
  };

  return (
    <div>
      <Link href="/cook" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All recipes</Link>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <RecipeCover recipe={recipe} className="aspect-[16/10] w-full" />
          <div className="flex flex-wrap gap-2">
            {recipe.source === "ai" && <Badge tone="sky">AI recipe · nutrition is an estimate</Badge>}
            {recipe.tags.map((t) => <Badge key={t} tone="mint">{t.replace("-", " ")}</Badge>)}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl [text-wrap:balance]">{recipe.name}</h1>
            <p className="mt-2 text-muted">{recipe.description}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.preparation_time} min</span>
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>
              <span>{recipe.difficulty}</span><span>{recipe.cuisine}</span><span>~{formatMoney(cost, cur)} total</span>
            </p>
          </div>
          {unsafe && <InfoNote tone="sun">This recipe contains something you marked as an allergy. It is hidden from your suggestions.</InfoNote>}
          <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-ice p-3 text-center">
            {[["Calories", recipe.calories, ""], ["Protein", recipe.protein, "g"], ["Carbs", recipe.carbohydrates, "g"], ["Fat", recipe.fat, "g"]].map(([k, v, u]) => (
              <div key={k as string}><dd className="text-lg font-bold tabular-nums">{v}{u}</dd><dt className="text-xs text-muted">{k}</dt></div>
            ))}
          </dl>
          <p className="-mt-3 text-xs text-muted">Per serving, estimated.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setCooking(true)} icon={<ChefHat className="h-5 w-5" />}>Start Cooking</Button>
            <Button size="lg" variant="secondary" onClick={() => void addMissing()} loading={adding} disabled={!missing.length} icon={<ShoppingCart className="h-5 w-5" />}>{missing.length ? `Add ${missing.length} missing to list` : "Nothing missing"}</Button>
            <Button size="lg" variant="ghost" onClick={() => void actions.toggleSaveRecipe(recipe.id)} icon={saved ? <BookmarkCheck className="h-5 w-5 text-mint-strong" /> : <Bookmark className="h-5 w-5" />}>{saved ? "Saved" : "Save"}</Button>
          </div>
          <div className="flex items-center gap-3"><span className="text-sm text-muted">Your rating</span><Stars value={rating} onChange={(v) => void actions.rateRecipe(recipe.id, v)} /></div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Ingredients</h2>
          <ul className="flex flex-col divide-y divide-line">
            {states.map(({ ing, state, product }) => (
              <li key={ing.key + ing.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0"><span className="font-medium">{ing.name}</span> <span className="text-muted">{ing.amount} {ing.unit}{ing.optional ? " · optional" : ""}</span>{product && product.name.toLowerCase() !== ing.name.toLowerCase() && <span className="block text-xs text-muted">Using your {product.name}</span>}</span>
                <Badge tone={state === "available" ? "mint" : state === "expiring" ? "warning" : "neutral"}>{state === "available" ? "In fridge" : state === "expiring" ? "Use soon" : "Missing"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Steps</h2>
          <ol className="flex flex-col gap-3">
            {recipe.instructions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint-soft font-bold text-mint-ink">{i + 1}</span><span className="pt-1">{s.text}{s.timer_seconds ? <span className="ml-2 text-xs text-muted">({Math.round(s.timer_seconds / 60)} min)</span> : null}</span></li>
            ))}
          </ol>
        </Card>
      </div>

      <CookingMode recipe={recipe} open={cooking} onClose={() => setCooking(false)} onFinish={() => { setCooking(false); setFinishing(true); }} />
      <FinishDialog recipe={recipe} open={finishing} onClose={() => setFinishing(false)} />
    </div>
  );
}
