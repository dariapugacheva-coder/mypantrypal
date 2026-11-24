import type { AppData } from "@/types/database";
import { budgetStatus, expiringSoon, nutritionForDay } from "@/lib/analytics";
import { daysUntil } from "@/lib/utils";
import { rankRecipes } from "@/lib/recipes/engine";
import { RECIPES } from "@/lib/recipes/library";
import { productKey } from "@/lib/etl/normalize";

/** Predefined, data-driven tips used when the AI tip service is not configured. */
export function contextualTip(data: AppData): string {
  const soon = expiringSoon(data.products, 2);
  if (soon.length) {
    const p = soon[0];
    const ranked = rankRecipes([...RECIPES, ...data.user_recipes], data.products, data.preferences, data.recipe_ratings, { focusKey: productKey(p.name) });
    const d = daysUntil(p.expiration_date);
    const when = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
    if (ranked[0]) return `Your ${p.name.toLowerCase()} expires ${when}. Try making ${ranked[0].recipe.name.toLowerCase()} today!`;
    return `Your ${p.name.toLowerCase()} expires ${when}. Plan a meal around it today.`;
  }
  const b = budgetStatus(data);
  if (b.levelWeek >= 90) return `You have used ${Math.round(b.pctWeek * 100)}% of your weekly budget. Cook from what you already have before your next shop.`;
  const n = nutritionForDay(data.meal_logs);
  const goal = data.preferences.nutrition_goals.protein;
  if (n.protein < goal * 0.5 && new Date().getHours() >= 14) return `You are at ${n.protein} g of your ${goal} g protein goal. A Greek yogurt bowl or eggs can close the gap.`;
  if (!data.products.length) return "Scan your fridge to see what you have and get recipe ideas in seconds.";
  return "Check your fridge before you shop. Buying only what is missing is the easiest way to save money.";
}
