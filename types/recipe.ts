import type { Category } from "./product";

export type Allergen = "dairy" | "eggs" | "gluten" | "fish" | "shellfish" | "peanuts" | "tree nuts" | "soy" | "sesame";
export type RecipeTag = "high-protein" | "quick" | "budget" | "vegetarian" | "vegan" | "healthy" | "few-ingredients";

export interface RecipeIngredient {
  name: string;
  /** Normalized product key used to match fridge items, e.g. "egg", "spinach". */
  key: string;
  amount: number;
  unit: string;
  category: Category;
  optional?: boolean;
  /** Estimated cost of the amount used, in USD. */
  cost: number;
}

export interface RecipeStep {
  text: string;
  timer_seconds?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  preparation_time: number;
  difficulty: "Easy" | "Medium" | "Hard";
  servings: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  tags: RecipeTag[];
  allergens: Allergen[];
  /** Two colors used to draw the illustrated recipe cover. */
  palette: [string, string];
  source?: "library" | "ai";
}

export type IngredientState = "available" | "expiring" | "missing";

export interface RankedRecipe {
  recipe: Recipe;
  score: number;
  available: number;
  required: number;
  expiringUsed: string[];
  estimatedCost: number;
  ingredientStates: Record<string, IngredientState>;
}
