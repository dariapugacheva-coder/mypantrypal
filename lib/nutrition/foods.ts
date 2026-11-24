import { productKey } from "@/lib/etl/normalize";

export interface FoodNutrition { name: string; per: string; grams: number; calories: number; protein: number; carbohydrates: number; fat: number }

/**
 * A small offline nutrition table (values per typical serving, rounded from USDA FoodData Central).
 * Used when the USDA API key is not configured. Values are estimates.
 */
export const LOCAL_FOODS: Record<string, FoodNutrition> = {
  egg: { name: "Egg", per: "1 large egg", grams: 50, calories: 72, protein: 6.3, carbohydrates: 0.4, fat: 4.8 },
  milk: { name: "Milk (2%)", per: "1 cup", grams: 244, calories: 122, protein: 8.1, carbohydrates: 11.7, fat: 4.8 },
  "greek yogurt": { name: "Greek yogurt, plain", per: "170 g cup", grams: 170, calories: 100, protein: 17, carbohydrates: 6, fat: 0.7 },
  yogurt: { name: "Yogurt, plain", per: "1 cup", grams: 245, calories: 149, protein: 8.5, carbohydrates: 11.4, fat: 8 },
  cheese: { name: "Cheddar cheese", per: "30 g", grams: 30, calories: 120, protein: 7, carbohydrates: 0.4, fat: 10 },
  "chicken breast": { name: "Chicken breast, cooked", per: "100 g", grams: 100, calories: 165, protein: 31, carbohydrates: 0, fat: 3.6 },
  rice: { name: "Rice, cooked", per: "1 cup", grams: 158, calories: 205, protein: 4.3, carbohydrates: 45, fat: 0.4 },
  banana: { name: "Banana", per: "1 medium", grams: 118, calories: 105, protein: 1.3, carbohydrates: 27, fat: 0.4 },
  apple: { name: "Apple", per: "1 medium", grams: 182, calories: 95, protein: 0.5, carbohydrates: 25, fat: 0.3 },
  spinach: { name: "Spinach, raw", per: "1 cup", grams: 30, calories: 7, protein: 0.9, carbohydrates: 1.1, fat: 0.1 },
  tomato: { name: "Tomato", per: "1 medium", grams: 123, calories: 22, protein: 1.1, carbohydrates: 4.8, fat: 0.2 },
  bread: { name: "Whole wheat bread", per: "1 slice", grams: 32, calories: 80, protein: 4, carbohydrates: 14, fat: 1.1 },
  tuna: { name: "Tuna, canned in water", per: "1 can (142 g)", grams: 142, calories: 179, protein: 39, carbohydrates: 0, fat: 1.3 },
  pasta: { name: "Pasta, cooked", per: "1 cup", grams: 140, calories: 220, protein: 8.1, carbohydrates: 43, fat: 1.3 },
  oats: { name: "Oats, dry", per: "1/2 cup", grams: 40, calories: 150, protein: 5, carbohydrates: 27, fat: 3 },
  avocado: { name: "Avocado", per: "1/2 fruit", grams: 100, calories: 160, protein: 2, carbohydrates: 8.5, fat: 14.7 },
  beans: { name: "Black beans, cooked", per: "1/2 cup", grams: 86, calories: 114, protein: 7.6, carbohydrates: 20, fat: 0.5 },
  tofu: { name: "Tofu, firm", per: "100 g", grams: 100, calories: 144, protein: 17, carbohydrates: 3, fat: 9 },
  salmon: { name: "Salmon, cooked", per: "100 g", grams: 100, calories: 206, protein: 22, carbohydrates: 0, fat: 12 },
  "peanut butter": { name: "Peanut butter", per: "2 tbsp", grams: 32, calories: 190, protein: 7, carbohydrates: 7, fat: 16 },
  potato: { name: "Potato, baked", per: "1 medium", grams: 173, calories: 161, protein: 4.3, carbohydrates: 37, fat: 0.2 },
  tortilla: { name: "Flour tortilla", per: "1 large", grams: 64, calories: 200, protein: 5.3, carbohydrates: 33, fat: 5 },
  "protein shake": { name: "Protein shake", per: "1 scoop in water", grams: 30, calories: 120, protein: 24, carbohydrates: 3, fat: 1.5 }
};

export function lookupLocalFood(query: string): FoodNutrition | null {
  const key = productKey(query);
  if (LOCAL_FOODS[key]) return LOCAL_FOODS[key];
  const hit = Object.entries(LOCAL_FOODS).find(([k, v]) => key.includes(k) || k.includes(key) || v.name.toLowerCase().includes(key));
  return hit ? hit[1] : null;
}

export function searchLocalFoods(query: string, limit = 6): FoodNutrition[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return Object.values(LOCAL_FOODS).filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
}
