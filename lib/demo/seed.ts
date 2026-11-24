import type { AppData, MealLog, Product, ShoppingItem, Transaction, TransactionItem, UserPreferences, Profile } from "@/types/database";
import type { Category, ShoppingCategory, StorageLocation } from "@/types/product";
import { addDays, dateKeyIn, uid } from "@/lib/utils";
import { demoCoupons } from "./coupons";

export function defaultPreferences(userId: string): UserPreferences {
  return {
    id: uid(), user_id: userId, allergies: [], disliked_foods: [], dietary_preferences: [], preferred_cuisines: [], foods_to_avoid: [],
    fitness_preference: "",
    nutrition_goals: { calories: 2200, protein: 120, carbohydrates: 250, fat: 70, water_ml: 2000 },
    grocery_preferences: { stores: [], habits: "" },
    budget_settings: { weekly: 60, monthly: 240 },
    notification_settings: { expiration: true, shopping: true, budget: true, vitamins: true, weekly_report: true },
    updated_at: new Date().toISOString()
  };
}

export function emptyData(profile: Omit<Profile, "created_at"> & { created_at?: string }): AppData {
  const p: Profile = { created_at: new Date().toISOString(), ...profile };
  const listId = uid();
  return {
    profile: p, preferences: defaultPreferences(p.id), coupons: demoCoupons(),
    products: [], shopping_lists: [{ id: listId, user_id: p.id, name: "My shopping list", status: "active", created_at: p.created_at }],
    shopping_items: [], transactions: [], transaction_items: [], saved_recipes: [], recipe_ratings: [], user_recipes: [],
    meal_logs: [], food_waste_logs: [], usage_logs: [], water_logs: [], reminders: [], coupon_saves: []
  };
}

/** Julian's demo dataset. All dates are relative to today so the demo always looks current. */
export function demoData(userId: string): AppData {
  const now = new Date();
  const iso = (days: number, hour = 12, minute = 0) => {
    const d = addDays(now, days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const data = emptyData({ id: userId, full_name: "Julian", email: "julian@example.com", avatar_url: null, age: 21, currency: "USD", onboarded: true, is_demo: true });
  data.preferences = {
    ...data.preferences,
    allergies: [], disliked_foods: ["Mushrooms"], dietary_preferences: [], preferred_cuisines: ["Asian", "Mexican"],
    fitness_preference: "Building muscle at the campus gym, 3 times a week",
    nutrition_goals: { calories: 2400, protein: 120, carbohydrates: 280, fat: 75, water_ml: 2500 },
    grocery_preferences: { stores: ["Greenleaf Market (demo)", "Corner Grocer (demo)"], habits: "Shops once a week on Sunday, buys store brands" },
    budget_settings: { weekly: 60, monthly: 240 }
  };
  const P = (name: string, category: Category, quantity: number, unit: string, storage: StorageLocation, expiresIn: number | null, boughtAgo: number, price: number): Product => ({
    id: uid(), user_id: userId, name, category, quantity, unit, storage_location: storage,
    purchase_date: dateKeyIn(-boughtAgo), expiration_date: expiresIn === null ? null : dateKeyIn(expiresIn),
    image_url: null, notes: null, estimated_price: price, created_at: iso(-boughtAgo, 18), updated_at: iso(-boughtAgo, 18)
  });
  data.products = [
    P("Spinach", "Vegetables", 1, "bag", "Refrigerator", 1, 4, 2.99),
    P("Chicken breast", "Meat", 300, "g", "Refrigerator", 2, 2, 6.49),
    P("Milk", "Dairy", 1, "carton", "Refrigerator", 3, 5, 3.49),
    P("Eggs", "Eggs", 8, "pcs", "Refrigerator", 18, 6, 4.2),
    P("Greek yogurt", "Dairy", 2, "cup", "Refrigerator", 6, 3, 5.99),
    P("Rice", "Grains", 1, "kg", "Pantry", 300, 20, 2.49),
    P("Bananas", "Fruits", 3, "pcs", "Pantry", 2, 3, 0.87),
    P("Tomatoes", "Vegetables", 4, "pcs", "Refrigerator", 5, 3, 3.16),
    P("Cheese", "Dairy", 200, "g", "Refrigerator", 16, 6, 4.29),
    P("Bread", "Bread", 1, "loaf", "Pantry", 3, 2, 3.29),
    P("Oats", "Grains", 1, "bag", "Pantry", 200, 25, 3.99)
  ];
  data.products[0].notes = "Added from fridge scan";
  const listId = data.shopping_lists[0].id;
  const S = (product_name: string, category: ShoppingCategory, quantity: number, unit: string, price: number, source: ShoppingItem["source"] = "manual"): ShoppingItem => ({
    id: uid(), list_id: listId, user_id: userId, product_name, category, quantity, unit, estimated_price: price, purchased: false, source, created_at: iso(-1)
  });
  data.shopping_items = [S("Tortillas", "Bakery", 1, "pack", 3.49, "recipe"), S("Canned tuna", "Pantry", 2, "can", 1.59), S("Apples", "Produce", 4, "pcs", 0.89)];

  const tx: Transaction[] = [];
  const items: TransactionItem[] = [];
  const T = (daysAgo: number, store: string, lines: [string, ShoppingCategory, number, number][]) => {
    const id = uid();
    const total = Math.round(lines.reduce((s, [, , q, p]) => s + q * p, 0) * 100) / 100;
    tx.push({ id, user_id: userId, store_name: store, total_amount: total, purchase_date: dateKeyIn(-daysAgo), receipt_image_url: null, created_at: iso(-daysAgo, 17) });
    for (const [product_name, category, quantity, unit_price] of lines) items.push({ id: uid(), transaction_id: id, user_id: userId, product_name, category, quantity, unit_price });
  };
  const dow = (now.getDay() + 6) % 7;
  // This week (starts Monday). Keep entries on or after Monday so the weekly budget reflects them.
  T(Math.min(dow, 2), "Greenleaf Market (demo)", [["Chicken breast", "Meat", 1, 6.49], ["Bananas", "Produce", 3, 0.29], ["Bread", "Bakery", 1, 3.29], ["Tortilla chips", "Pantry", 2, 3.49], ["Sparkling water", "Drinks", 1, 4.99]]);
  T(Math.min(dow, 1), "Corner Grocer (demo)", [["Greek yogurt", "Dairy", 1, 5.99], ["Tomatoes", "Produce", 4, 0.79], ["Granola bars", "Pantry", 1, 4.49], ["Greek yogurt", "Dairy", 1, 1.29]]);
  // Previous weeks.
  T(dow + 2, "Greenleaf Market (demo)", [["Eggs (12)", "Dairy", 1, 4.2], ["Spinach", "Produce", 1, 2.99], ["Milk", "Dairy", 1, 3.49], ["Cheese", "Dairy", 1, 4.29], ["Tortilla chips", "Pantry", 1, 3.49]]);
  T(dow + 5, "Corner Grocer (demo)", [["Chicken breast", "Meat", 2, 6.49], ["Rice", "Pantry", 1, 2.49], ["Greek yogurt", "Dairy", 1, 5.99], ["Frozen pizza", "Frozen", 1, 5.49], ["Orange juice", "Drinks", 1, 3.99]]);
  T(dow + 9, "Greenleaf Market (demo)", [["Pasta", "Pantry", 2, 1.49], ["Canned tuna", "Pantry", 3, 1.59], ["Tomatoes", "Produce", 4, 0.79], ["Apples", "Produce", 4, 0.89], ["Cookies", "Pantry", 1, 3.99]]);
  T(dow + 13, "Campus Fresh (demo)", [["Eggs (12)", "Dairy", 1, 4.2], ["Bread", "Bakery", 1, 3.29], ["Bananas", "Produce", 5, 0.29], ["Chicken breast", "Meat", 1, 6.49], ["Oats", "Pantry", 1, 3.99]]);
  T(dow + 17, "Greenleaf Market (demo)", [["Salmon fillet", "Meat", 1, 8.99], ["Rice", "Pantry", 1, 2.49], ["Spinach", "Produce", 1, 2.99], ["Greek yogurt", "Dairy", 1, 5.99], ["Chips", "Pantry", 2, 2.99]]);
  T(dow + 23, "Corner Grocer (demo)", [["Chicken breast", "Meat", 2, 6.49], ["Milk", "Dairy", 1, 3.49], ["Tofu", "Pantry", 1, 2.49], ["Bell peppers", "Produce", 2, 1.29], ["Ice cream", "Frozen", 1, 4.99]]);
  data.transactions = tx;
  data.transaction_items = items;

  const M = (daysAgo: number, hour: number, recipe_id: string | null, meal_name: string, calories: number, protein: number, carbohydrates: number, fat: number): MealLog => ({
    id: uid(), user_id: userId, recipe_id, meal_name, serving_size: 1, calories, protein, carbohydrates, fat, is_estimate: !recipe_id, consumed_at: iso(-daysAgo, hour)
  });
  const meals: MealLog[] = [];
  const plan: [string | null, string, number, number, number, number][][] = [
    [["greek-yogurt-bowl", "Greek Yogurt Protein Bowl", 380, 24, 58, 5], [null, "Dining hall lunch", 750, 35, 85, 28], ["chicken-rice-bowl", "Chicken Rice Bowl", 610, 52, 65, 12], [null, "Protein shake", 120, 24, 3, 1.5]],
    [["banana-oat-pancakes", "Banana Oat Pancakes", 390, 17, 55, 11], [null, "Burrito from campus cafe", 820, 32, 95, 30], ["tuna-pasta", "Tuna Pasta", 560, 42, 70, 10]],
    [[null, "Toast with peanut butter", 420, 14, 55, 17], ["chicken-spinach-wrap", "Chicken and Spinach Wrap", 520, 45, 40, 18], [null, "Pizza slices", 680, 26, 78, 28]],
    [["greek-yogurt-bowl", "Greek Yogurt Protein Bowl", 380, 24, 58, 5], [null, "Dining hall lunch", 700, 30, 80, 25], ["egg-fried-rice", "High-Protein Egg Fried Rice", 480, 22, 62, 15], [null, "Protein shake", 120, 24, 3, 1.5]],
    [[null, "Bagel and coffee", 350, 11, 62, 6], [null, "Ramen", 550, 14, 75, 20], ["vegetable-omelette", "Vegetable Omelette", 360, 25, 7, 26]],
    [["overnight-oats", "Overnight Oats", 410, 22, 60, 8], ["chicken-rice-bowl", "Chicken Rice Bowl", 610, 52, 65, 12], [null, "Sushi takeout", 600, 24, 90, 12]]
  ];
  const hours = [8, 13, 19, 21];
  plan.forEach((day, i) => day.forEach((m, j) => meals.push(M(i + 1, hours[j], ...m))));
  // Today so far.
  meals.push(M(0, 8, "greek-yogurt-bowl", "Greek Yogurt Protein Bowl", 380, 24, 58, 5));
  if (now.getHours() >= 13) meals.push(M(0, 13, null, "Dining hall lunch", 720, 34, 82, 26));
  data.meal_logs = meals;

  data.water_logs = [500, 250, 500].map((amount_ml, i) => ({ id: uid(), user_id: userId, amount_ml, logged_at: iso(0, 8 + i * 3) }));
  data.usage_logs = [
    ["Spinach", 2.99, 9], ["Milk", 3.49, 6], ["Tomatoes", 1.58, 4], ["Chicken breast", 3.25, 3], ["Bananas", 0.58, 2], ["Bread", 1.65, 1], ["Greek yogurt", 3.0, 1]
  ].map(([product_name, estimated_value, daysAgo]) => ({ id: uid(), user_id: userId, product_id: null, product_name: product_name as string, quantity: 1, estimated_value: estimated_value as number, used_before_expiry: true, created_at: iso(-(daysAgo as number), 19) }));
  data.food_waste_logs = [
    ["Lettuce", 1.99, 12, "Went bad before I used it"], ["Leftover rice", 0.6, 8, "Kept too long"], ["Strawberries", 3.49, 15, "Moldy"]
  ].map(([product_name, estimated_value, daysAgo, reason]) => ({ id: uid(), user_id: userId, product_id: null, product_name: product_name as string, quantity: 1, estimated_value: estimated_value as number, reason: reason as string, created_at: iso(-(daysAgo as number), 20) }));
  data.reminders = [
    { id: uid(), user_id: userId, title: "Vitamin D", reminder_time: "09:00", repeat_days: [0, 1, 2, 3, 4, 5, 6], notes: "With breakfast", enabled: true, last_done_on: null },
    { id: uid(), user_id: userId, title: "Omega-3", reminder_time: "20:00", repeat_days: [1, 3, 5], notes: null, enabled: true, last_done_on: null }
  ];
  data.saved_recipes = ["spinach-chicken-omelette", "chicken-rice-bowl", "greek-yogurt-bowl"].map((recipe_id) => ({ id: uid(), user_id: userId, recipe_id, created_at: iso(-5) }));
  data.recipe_ratings = [{ id: uid(), user_id: userId, recipe_id: "chicken-rice-bowl", rating: 5, created_at: iso(-3) }, { id: uid(), user_id: userId, recipe_id: "tuna-pasta", rating: 4, created_at: iso(-2) }];
  data.coupon_saves = [{ id: uid(), user_id: userId, coupon_id: "demo-coupon-1", status: "saved", created_at: iso(-1) }];
  return data;
}
