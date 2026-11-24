"use client";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Search, Sparkles, X } from "lucide-react";
import type { Recipe } from "@/types/recipe";
import { useAppData } from "@/lib/data/DataProvider";
import { useNav } from "@/lib/nav";
import { useIntegrations } from "@/lib/hooks";
import { takeIntent } from "@/lib/intent";
import { useRankedRecipes } from "@/lib/recipes/useRecipes";
import { RECIPE_FILTERS, violatesAllergies, fitsDiet } from "@/lib/recipes/engine";
import { activeProducts, expiringSoon } from "@/lib/analytics";
import { apiPost } from "@/lib/api/client";
import { productKey, guessCategory } from "@/lib/etl/normalize";
import { SAMPLE_PRICES } from "@/lib/demo/coupons";
import { uid } from "@/lib/utils";
import type { z } from "zod";
import type { AiRecipeSchema } from "@/lib/validations/schemas";
import { Button, Chip, EmptyState, ErrorNote, Input, PageHeader, SectionTitle, Select } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";
import { RecipeCard } from "@/components/recipes/RecipeCard";

type AiRecipe = z.infer<typeof AiRecipeSchema>;
function inferTags(a: AiRecipe): Recipe["tags"] {
  const names = a.ingredients.map((i) => i.name.toLowerCase()).join(" ");
  const tags: Recipe["tags"] = [];
  const meat = /chicken|beef|pork|turkey|bacon|ham|sausage|tuna|salmon|fish|shrimp|lamb|anchov/.test(names);
  if (!meat) tags.push("vegetarian");
  if (!meat && !/milk|cheese|yogurt|butter|cream|egg|honey/.test(names)) tags.push("vegan");
  if (a.protein >= 25) tags.push("high-protein");
  if (a.preparation_time <= 15) tags.push("quick");
  return tags;
}

const PALETTES: [string, string][] = [["#8BCFB0", "#FFE9A6"], ["#4B9B79", "#EFF7FA"], ["#FFE9A6", "#8BCFB0"]];

export function CookView() {
  const { data, actions } = useAppData();
  const nav = useNav();
  const integrations = useIntegrations();
  const [filters, setFilters] = useState<string[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | undefined>(undefined);
  const [focus, setFocus] = useState<{ key: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => { const i = takeIntent("cook-with"); if (i) setFocus({ key: i.key, name: i.name }); }, []);

  const ranked = useRankedRecipes(data, { filters, maxMinutes, focusKey: focus?.key ?? null });
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter((r) => (!maxMinutes || r.recipe.preparation_time <= maxMinutes) && (!q || `${r.recipe.name} ${r.recipe.cuisine} ${r.recipe.ingredients.map((i) => i.name).join(" ")}`.toLowerCase().includes(q)));
  }, [ranked, query, maxMinutes]);
  const allRanked = useRankedRecipes(data);
  const savedIds = new Set(data.saved_recipes.map((s) => s.recipe_id));
  const saved = allRanked.filter((r) => savedIds.has(r.recipe.id));
  const ready = shown.filter((r) => r.available === r.required);
  const rest = shown.filter((r) => r.available !== r.required);
  const cur = data.profile.currency;

  const toggle = (id: string) => setFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const generate = async () => {
    const products = activeProducts(data.products);
    if (!products.length) { setAiError("Add a few products to your fridge first."); return; }
    setAiBusy(true); setAiError(null);
    const p = data.preferences;
    const r = await apiPost<AiRecipe>("/api/ai/recipe", {
      ingredients: products.map((x) => x.name).slice(0, 40), expiring: expiringSoon(data.products, 3).map((x) => x.name),
      allergies: p.allergies, diets: p.dietary_preferences, maxMinutes: maxMinutes ?? 30
    });
    setAiBusy(false);
    if (!r.ok) { setAiError(r.error); return; }
    const a = r.data;
    const recipe: Recipe = {
      id: `ai-${uid()}`, name: a.name, description: a.description, cuisine: a.cuisine, preparation_time: a.preparation_time, difficulty: a.difficulty, servings: a.servings,
      calories: a.calories, protein: a.protein, carbohydrates: a.carbohydrates, fat: a.fat,
      ingredients: a.ingredients.map((i) => ({ name: i.name, key: productKey(i.name), amount: i.amount, unit: i.unit, category: guessCategory(i.name), optional: i.optional, cost: SAMPLE_PRICES[productKey(i.name)] ?? 1 })),
      instructions: a.instructions.map((text) => ({ text })), tags: inferTags(a), allergens: [], palette: PALETTES[Math.floor(Math.random() * PALETTES.length)], source: "ai"
    };
    // Safety re-check on the client: never show a recipe that conflicts with allergies or diets.
    if (violatesAllergies(recipe, p.allergies) || !fitsDiet(recipe, p.dietary_preferences)) { setAiError("The AI suggested a recipe that conflicts with your allergies or diet, so it was hidden. Please try again."); return; }
    const ok = await actions.saveUserRecipe(recipe);
    if (ok) nav.push(`/cook/${recipe.id}`);
  };

  return (
    <div>
      <PageHeader title="What Can I Cook Today?" subtitle="Recipes ranked by what you have, what expires first and your goals." art={<Penguin mood="chef" size={56} className="hidden sm:block" />}
        action={integrations?.ai_text ? <Button onClick={() => void generate()} loading={aiBusy} icon={<Sparkles className="h-4 w-4" />}>Create an AI recipe</Button> : undefined} />
      {aiError && <div className="mb-4"><ErrorNote>{aiError}</ErrorNote></div>}

      {focus && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-sun-soft px-4 py-3 text-sm text-sun-ink">
          <span>Showing recipes that use <b>{focus.name}</b></span>
          <Button size="sm" variant="ghost" onClick={() => setFocus(null)} icon={<X className="h-4 w-4" />}>Show all</Button>
        </div>
      )}

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes or ingredients" aria-label="Search recipes" className="pl-9" />
        </div>
        <Select aria-label="Maximum cooking time" value={maxMinutes ?? ""} onChange={(e) => setMaxMinutes(e.target.value ? Number(e.target.value) : undefined)} className="sm:w-44">
          <option value="">Any time</option><option value="10">Up to 10 min</option><option value="15">Up to 15 min</option><option value="30">Up to 30 min</option>
        </Select>
      </div>
      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Recipe filters">
        {RECIPE_FILTERS.map((f) => <Chip key={f.id} active={filters.includes(f.id)} onClick={() => toggle(f.id)}>{f.label}</Chip>)}
      </div>

      {data.preferences.allergies.length > 0 && <p className="mb-4 text-xs text-muted">Hidden because of your allergies: anything with {data.preferences.allergies.join(", ").toLowerCase()}.</p>}

      {shown.length === 0 ? (
        <EmptyState art={<Penguin mood="think" size={80} />} title="No recipes match" body="Try removing a filter. Recipes that conflict with your allergies or diet are never shown." action={<Button variant="secondary" onClick={() => { setFilters([]); setFocus(null); setQuery(""); setMaxMinutes(undefined); }}>Clear filters</Button>} />
      ) : (
        <>
          {ready.length > 0 && (
            <section className="mb-8" aria-labelledby="ready">
              <SectionTitle id="ready">Ready to cook now</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ready.map((r) => <RecipeCard key={r.recipe.id} ranked={r} saved={savedIds.has(r.recipe.id)} currency={cur} />)}</div>
            </section>
          )}
          {rest.length > 0 && (
            <section className="mb-8" aria-labelledby="almost">
              <SectionTitle id="almost">{ready.length ? "Missing a few ingredients" : "Best matches"}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rest.map((r) => <RecipeCard key={r.recipe.id} ranked={r} saved={savedIds.has(r.recipe.id)} currency={cur} />)}</div>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="saved">
        <SectionTitle id="saved"><span className="inline-flex items-center gap-2"><Bookmark className="h-5 w-5 text-mint-strong" />Saved recipes</span></SectionTitle>
        {saved.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{saved.map((r) => <RecipeCard key={r.recipe.id} ranked={r} saved currency={cur} />)}</div>
        ) : <p className="text-sm text-muted">Tap the bookmark on any recipe to save it here.</p>}
      </section>
    </div>
  );
}
