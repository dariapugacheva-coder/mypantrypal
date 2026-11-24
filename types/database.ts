import type { Category, StorageLocation, ShoppingCategory } from "./product";
import type { Recipe } from "./recipe";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  age: number | null;
  currency: string;
  onboarded: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface NutritionGoals { calories: number; protein: number; carbohydrates: number; fat: number; water_ml: number }
export interface BudgetSettings { weekly: number; monthly: number }
export interface NotificationSettings { expiration: boolean; shopping: boolean; budget: boolean; vitamins: boolean; weekly_report: boolean }
export interface GroceryPreferences { stores: string[]; habits: string }

export interface UserPreferences {
  id: string;
  user_id: string;
  allergies: string[];
  disliked_foods: string[];
  dietary_preferences: string[];
  preferred_cuisines: string[];
  foods_to_avoid: string[];
  fitness_preference: string;
  nutrition_goals: NutritionGoals;
  grocery_preferences: GroceryPreferences;
  budget_settings: BudgetSettings;
  notification_settings: NotificationSettings;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  purchase_date: string | null;
  expiration_date: string | null;
  storage_location: StorageLocation;
  image_url: string | null;
  notes: string | null;
  estimated_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList { id: string; user_id: string; name: string; status: "active" | "archived"; created_at: string }

export interface ShoppingItem {
  id: string;
  list_id: string;
  user_id: string;
  product_name: string;
  category: ShoppingCategory;
  quantity: number;
  unit: string;
  /** Estimated price per unit (sample price unless a store feed is connected). */
  estimated_price: number | null;
  purchased: boolean;
  source: "manual" | "recipe" | "suggestion";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  store_name: string;
  total_amount: number;
  purchase_date: string;
  receipt_image_url: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  category: ShoppingCategory;
}

export interface SavedRecipe { id: string; user_id: string; recipe_id: string; created_at: string }
export interface RecipeRating { id: string; user_id: string; recipe_id: string; rating: number; created_at: string }

/** Recipes the user generated with AI and kept. Library recipes live in code and the shared recipes table. */
export interface UserRecipe extends Recipe { user_id: string; created_at: string }

export interface MealLog {
  id: string;
  user_id: string;
  recipe_id: string | null;
  meal_name: string;
  serving_size: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  is_estimate: boolean;
  consumed_at: string;
}

export interface FoodWasteLog {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  estimated_value: number;
  reason: string;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  estimated_value: number;
  used_before_expiry: boolean;
  created_at: string;
}

export interface WaterLog { id: string; user_id: string; amount_ml: number; logged_at: string }

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  reminder_time: string;
  repeat_days: number[];
  notes: string | null;
  enabled: boolean;
  last_done_on: string | null;
}

export interface Coupon {
  id: string;
  store_name: string;
  product_name: string;
  discount: string;
  expiration_date: string;
  description: string;
  conditions: string;
  is_demo: boolean;
  created_at: string;
}

export interface CouponSave { id: string; user_id: string; coupon_id: string; status: "saved" | "used"; created_at: string }

/** Every per-user collection, keyed by its database table name. */
export interface UserCollections {
  products: Product[];
  shopping_lists: ShoppingList[];
  shopping_items: ShoppingItem[];
  transactions: Transaction[];
  transaction_items: TransactionItem[];
  saved_recipes: SavedRecipe[];
  recipe_ratings: RecipeRating[];
  user_recipes: UserRecipe[];
  meal_logs: MealLog[];
  food_waste_logs: FoodWasteLog[];
  usage_logs: UsageLog[];
  water_logs: WaterLog[];
  reminders: Reminder[];
  coupon_saves: CouponSave[];
}

export type CollectionName = keyof UserCollections;

export interface AppData extends UserCollections {
  profile: Profile;
  preferences: UserPreferences;
  coupons: Coupon[];
}

export const COLLECTIONS: CollectionName[] = [
  "products", "shopping_lists", "shopping_items", "transactions", "transaction_items", "saved_recipes",
  "recipe_ratings", "user_recipes", "meal_logs", "food_waste_logs", "usage_logs", "water_logs", "reminders", "coupon_saves"
];
