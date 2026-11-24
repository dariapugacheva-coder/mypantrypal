import type { Product, RecipeRating, UserPreferences } from "@/types/database";
import type { IngredientState, RankedRecipe, Recipe, RecipeTag, Allergen } from "@/types/recipe";
import { productKey, relatedProduct } from "@/lib/etl/normalize";
import { daysUntil } from "@/lib/utils";

export const ALLERGY_OPTIONS = ["Dairy", "Eggs", "Gluten", "Fish", "Shellfish", "Peanuts", "Tree nuts", "Soy", "Sesame"] as const;

const ALLERGY_MAP: Record<string, Allergen> = {
  dairy: "dairy", milk: "dairy", lactose: "dairy", eggs: "eggs", egg: "eggs", gluten: "gluten", wheat: "gluten",
  fish: "fish", shellfish: "shellfish", peanuts: "peanuts", peanut: "peanuts", "tree nuts": "tree nuts", nuts: "tree nuts",
  soy: "soy", sesame: "sesame"
};

const ALLERGEN_INGREDIENT_WORDS: Record<Allergen, RegExp> = {
  dairy: /milk|cheese|yogurt|butter|cream/, eggs: /egg/, gluten: /bread|pasta|tortilla|flour|oats|wheat/,
  fish: /tuna|salmon|fish|cod|sardine/, shellfish: /shrimp|prawn|crab|lobster/, peanuts: /peanut/,
  "tree nuts": /almond|walnut|cashew|pecan|hazelnut/, soy: /soy|tofu|edamame/, sesame: /sesame|tahini/
};

/** Allergies are strict exclusions: a recipe is excluded if any allergen matches, by tag or by ingredient name. */
export function violatesAllergies(recipe: Recipe, allergies: string[]): boolean {
  for (const raw of allergies) {
    const a = raw.toLowerCase().trim();
    if (!a) continue;
    const allergen = ALLERGY_MAP[a];
    if (allergen && recipe.allergens.includes(allergen)) return true;
    for (const ing of recipe.ingredients) {
      const n = `${ing.name} ${ing.key}`.toLowerCase();
      if (allergen && ALLERGEN_INGREDIENT_WORDS[allergen].test(n)) return true;
      if (!allergen && n.includes(a)) return true;
    }
  }
  return false;
}

export function fitsDiet(recipe: Recipe, diets: string[]): boolean {
  const d = diets.map((x) => x.toLowerCase());
  if (d.includes("vegan") && !recipe.tags.includes("vegan")) return false;
  if (d.includes("vegetarian") && !(recipe.tags.includes("vegetarian") || recipe.tags.includes("vegan"))) return false;
  return true;
}

export interface FridgeMatch { product: Product | null; state: IngredientState }

export function matchIngredient(key: string, products: Product[]): FridgeMatch {
  const live = products.filter((p) => p.quantity > 0 && (daysUntil(p.expiration_date) ?? 1) >= 0);
  const hit = live.find((p) => productKey(p.name) === key) ?? live.find((p) => relatedProduct(p.name, key));
  if (!hit) return { product: null, state: "missing" };
  const d = daysUntil(hit.expiration_date);
  return { product: hit, state: d !== null && d <= 3 ? "expiring" : "available" };
}

export interface RankOptions {
  filters?: RecipeTag[] | ("expiring" | "under-20")[] | string[];
  maxMinutes?: number;
  focusKey?: string | null;
}

export function rankRecipes(
  recipes: Recipe[],
  products: Product[],
  prefs: Pick<UserPreferences, "allergies" | "dietary_preferences" | "disliked_foods" | "foods_to_avoid" | "preferred_cuisines" | "nutrition_goals" | "budget_settings">,
  ratings: RecipeRating[] = [],
  opts: RankOptions = {}
): RankedRecipe[] {
  const avoid = [...prefs.disliked_foods, ...prefs.foods_to_avoid].map((x) => x.toLowerCase().trim()).filter(Boolean);
  const out: RankedRecipe[] = [];
  for (const recipe of recipes) {
    if (violatesAllergies(recipe, prefs.allergies)) continue;
    if (!fitsDiet(recipe, prefs.dietary_preferences)) continue;
    const ingredientStates: Record<string, IngredientState> = {};
    let available = 0;
    let required = 0;
    const expiringUsed: string[] = [];
    let missingCost = 0;
    for (const ing of recipe.ingredients) {
      const m = matchIngredient(ing.key, products);
      ingredientStates[ing.key] = m.state;
      if (!ing.optional) required++;
      if (m.state !== "missing") {
        if (!ing.optional) available++;
        if (m.state === "expiring") expiringUsed.push(m.product!.name);
      } else if (!ing.optional) missingCost += ing.cost;
    }
    const estimatedCost = recipe.ingredients.filter((i) => !i.optional).reduce((s, i) => s + i.cost, 0);
    let score = (required ? available / required : 0) * 45;
    score += Math.min(expiringUsed.length, 2) * 14;
    const proteinShare = recipe.protein / Math.max(prefs.nutrition_goals.protein, 1);
    score += Math.min(proteinShare / 0.35, 1) * 10;
    score += recipe.preparation_time <= 15 ? 8 : recipe.preparation_time <= 25 ? 5 : 2;
    score += missingCost <= 1 ? 8 : missingCost <= 3 ? 4 : 0;
    if (prefs.preferred_cuisines.some((c) => c.toLowerCase() === recipe.cuisine.toLowerCase())) score += 5;
    const myRatings = ratings.filter((r) => r.recipe_id === recipe.id);
    if (myRatings.length) score += (myRatings[myRatings.length - 1].rating - 3) * 4;
    if (avoid.some((a) => recipe.ingredients.some((i) => `${i.name} ${i.key}`.toLowerCase().includes(a)))) score -= 25;
    if (opts.focusKey && recipe.ingredients.some((i) => i.key === opts.focusKey || relatedProduct(i.key, opts.focusKey!))) score += 30;
    out.push({ recipe, score, available, required, expiringUsed, estimatedCost, ingredientStates });
  }
  const filtered = out.filter((r) => passesFilters(r, opts.filters ?? []));
  const focused = opts.focusKey ? filtered.filter((r) => r.recipe.ingredients.some((i) => i.key === opts.focusKey || relatedProduct(i.key, opts.focusKey!))) : filtered;
  return focused.sort((a, b) => b.score - a.score);
}

function passesFilters(r: RankedRecipe, filters: string[]): boolean {
  return filters.every((f) => {
    switch (f) {
      case "high-protein": return r.recipe.protein >= 25;
      case "under-20": return r.recipe.preparation_time <= 20;
      case "budget": return r.estimatedCost <= 3;
      case "vegetarian": return r.recipe.tags.includes("vegetarian") || r.recipe.tags.includes("vegan");
      case "vegan": return r.recipe.tags.includes("vegan");
      case "healthy": return r.recipe.tags.includes("healthy");
      case "expiring": return r.expiringUsed.length > 0;
      case "few-ingredients": return r.recipe.ingredients.filter((i) => !i.optional).length <= 4;
      default: return true;
    }
  });
}

export const RECIPE_FILTERS: { id: string; label: string }[] = [
  { id: "high-protein", label: "High Protein" }, { id: "under-20", label: "Under 20 Minutes" },
  { id: "budget", label: "Budget Friendly" }, { id: "vegetarian", label: "Vegetarian" }, { id: "vegan", label: "Vegan" },
  { id: "healthy", label: "Healthy" }, { id: "expiring", label: "Use Expiring Soon" }, { id: "few-ingredients", label: "Few Ingredients" }
];
