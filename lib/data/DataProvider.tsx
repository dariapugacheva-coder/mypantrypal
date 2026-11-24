"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  AppData, CollectionName, CouponSave, MealLog, Product, Profile, Reminder, ShoppingItem, Transaction, TransactionItem, UserPreferences, UserRecipe
} from "@/types/database";
import type { Recipe } from "@/types/recipe";
import type { Category, ShoppingCategory, StorageLocation } from "@/types/product";
import type { Op, Repository } from "./repository";
import { localRepo } from "./local-repo";
import { supabaseRepo } from "@/lib/supabase/repo";
import { useAuth, deleteLocalAccount, DEMO_USER_ID } from "@/lib/auth/AuthProvider";
import { demoData, emptyData } from "@/lib/demo/seed";
import { SAMPLE_PRICES } from "@/lib/demo/coupons";
import { daysUntil, nowIso, round, toDateKey, uid } from "@/lib/utils";
import { normalizeName, normalizeUnit, productKey, relatedProduct, sameProduct, toShoppingCategory, guessCategory } from "@/lib/etl/normalize";
import { matchIngredient } from "@/lib/recipes/engine";

/* ---------- inputs ---------- */

export interface ProductInput {
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  storage_location: StorageLocation;
  expiration_date: string | null;
  purchase_date?: string | null;
  notes?: string | null;
  image_url?: string | null;
  estimated_price?: number | null;
}

export interface ShoppingInput { product_name: string; category: ShoppingCategory; quantity: number; unit: string; estimated_price?: number | null; source?: ShoppingItem["source"] }
export interface PurchaseLine { product_name: string; quantity: number; unit_price: number; category: ShoppingCategory }
export interface MealInput { meal_name: string; calories: number; protein: number; carbohydrates: number; fat: number; recipe_id?: string | null; serving_size?: number; is_estimate?: boolean; consumed_at?: string }
export interface DuplicateInfo { inFridge: Product | null; inList: ShoppingItem | null }

/* ---------- draft: applies changes locally and records the matching database operations ---------- */

class Draft {
  ops: Op[] = [];
  constructor(public d: AppData) {}
  put<T extends CollectionName>(table: T, row: AppData[T][number]) {
    const list = this.d[table] as { id: string }[];
    const i = list.findIndex((r) => r.id === (row as { id: string }).id);
    const next = i >= 0 ? list.map((r, k) => (k === i ? row : r)) : [...list, row];
    this.d = { ...this.d, [table]: next };
    this.ops.push({ type: "upsert", table, row: row as unknown as { id: string } & Record<string, unknown> });
  }
  del(table: CollectionName, id: string) {
    this.d = { ...this.d, [table]: (this.d[table] as { id: string }[]).filter((r) => r.id !== id) };
    this.ops.push({ type: "remove", table, id });
  }
  profile(patch: Partial<Profile>) {
    const row = { ...this.d.profile, ...patch };
    this.d = { ...this.d, profile: row };
    this.ops.push({ type: "profile", row });
  }
  prefs(patch: Partial<UserPreferences>) {
    const row = { ...this.d.preferences, ...patch, updated_at: nowIso() };
    this.d = { ...this.d, preferences: row };
    this.ops.push({ type: "preferences", row });
  }
}

/* ---------- context ---------- */

interface DataApi {
  data: AppData | null;
  ready: boolean;
  error: string | null;
  mode: "demo" | "local" | "supabase";
  saving: boolean;
  actions: ReturnType<typeof buildActions>;
  reload(): Promise<void>;
}

const DataContext = createContext<DataApi | null>(null);

export function unitValue(p: Product): number {
  if (p.estimated_price && p.quantity > 0) return p.estimated_price / p.quantity;
  const sample = SAMPLE_PRICES[productKey(p.name)];
  if (sample) return ["g", "ml"].includes(p.unit) ? sample / 500 : sample;
  return 1;
}

function buildActions(commit: (fn: (draft: Draft) => void, msg?: string) => Promise<boolean>, get: () => AppData, repo: Repository, extra: { signOutAll: () => Promise<void>; isDemoUser: boolean }) {
  const userId = () => get().profile.id;
  const listId = () => get().shopping_lists.find((l) => l.status === "active")?.id ?? get().shopping_lists[0]?.id ?? "";

  const makeProduct = (input: ProductInput): Product => {
    const now = nowIso();
    return {
      id: uid(), user_id: userId(), name: input.name.trim(), category: input.category, quantity: input.quantity, unit: normalizeUnit(input.unit),
      storage_location: input.storage_location, expiration_date: input.expiration_date, purchase_date: input.purchase_date ?? toDateKey(),
      image_url: input.image_url ?? null, notes: input.notes ?? null, estimated_price: input.estimated_price ?? null, created_at: now, updated_at: now
    };
  };

  const findDuplicate = (name: string): DuplicateInfo => {
    const d = get();
    const inFridge = d.products.find((p) => p.quantity > 0 && (sameProduct(p.name, name) || relatedProduct(p.name, name))) ?? null;
    const inList = d.shopping_items.find((i) => !i.purchased && (sameProduct(i.product_name, name) || relatedProduct(i.product_name, name))) ?? null;
    return { inFridge, inList };
  };

  return {
    findDuplicate,

    /* products */
    addProducts: (inputs: ProductInput[], { merge = true }: { merge?: boolean } = {}) =>
      commit((t) => {
        for (const input of inputs) {
          // ETL: merge into an existing record when it is the same product, same unit and same storage.
          const existing = merge ? t.d.products.find((p) => p.quantity > 0 && sameProduct(p.name, input.name) && normalizeUnit(p.unit) === normalizeUnit(input.unit) && p.storage_location === input.storage_location && p.expiration_date === input.expiration_date) : undefined;
          if (existing) {
            t.put("products", { ...existing, quantity: round(existing.quantity + input.quantity, 2), estimated_price: existing.estimated_price !== null || input.estimated_price ? round((existing.estimated_price ?? 0) + (input.estimated_price ?? 0), 2) : null, updated_at: nowIso() });
          } else t.put("products", makeProduct(input));
        }
      }, inputs.length === 1 ? `${inputs[0].name} added to your fridge` : `${inputs.length} products added to your fridge`),

    updateProduct: (id: string, patch: Partial<Product>) =>
      commit((t) => {
        const p = t.d.products.find((x) => x.id === id);
        if (p) t.put("products", { ...p, ...patch, unit: patch.unit ? normalizeUnit(patch.unit) : p.unit, updated_at: nowIso() });
      }, "Product updated"),

    deleteProduct: (id: string) =>
      commit((t) => t.del("products", id), "Product deleted"),

    markUsed: (id: string, amount: number) =>
      commit((t) => {
        const p = t.d.products.find((x) => x.id === id);
        if (!p) return;
        const qty = Math.min(amount, p.quantity);
        const value = round(unitValue(p) * qty, 2);
        const d = daysUntil(p.expiration_date);
        t.put("usage_logs", { id: uid(), user_id: userId(), product_id: p.id, product_name: p.name, quantity: qty, estimated_value: value, used_before_expiry: d === null || d >= 0, created_at: nowIso() });
        const left = round(p.quantity - qty, 2);
        if (left <= 0) t.del("products", p.id);
        else t.put("products", { ...p, quantity: left, estimated_price: p.estimated_price !== null ? round(Math.max(0, p.estimated_price - value), 2) : null, updated_at: nowIso() });
      }, "Marked as used"),

    discardProduct: (id: string, amount: number, reason: string) =>
      commit((t) => {
        const p = t.d.products.find((x) => x.id === id);
        if (!p) return;
        const qty = Math.min(amount, p.quantity);
        const value = round(unitValue(p) * qty, 2);
        t.put("food_waste_logs", { id: uid(), user_id: userId(), product_id: p.id, product_name: p.name, quantity: qty, estimated_value: value, reason: reason || "Not specified", created_at: nowIso() });
        const left = round(p.quantity - qty, 2);
        if (left <= 0) t.del("products", p.id);
        else t.put("products", { ...p, quantity: left, estimated_price: p.estimated_price !== null ? round(Math.max(0, p.estimated_price - value), 2) : null, updated_at: nowIso() });
      }, "Recorded as discarded"),

    /* shopping list */
    addShoppingItem: (input: ShoppingInput) =>
      commit((t) => {
        t.put("shopping_items", {
          id: uid(), list_id: listId(), user_id: userId(), product_name: input.product_name.trim(), category: input.category, quantity: input.quantity,
          unit: normalizeUnit(input.unit), estimated_price: input.estimated_price ?? null, purchased: false, source: input.source ?? "manual", created_at: nowIso()
        });
      }, `${input.product_name} added to your list`),

    updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) =>
      commit((t) => {
        const i = t.d.shopping_items.find((x) => x.id === id);
        if (i) t.put("shopping_items", { ...i, ...patch });
      }),

    removeShoppingItem: (id: string) => commit((t) => t.del("shopping_items", id), "Removed from list"),

    clearPurchased: () =>
      commit((t) => { for (const i of t.d.shopping_items.filter((x) => x.purchased)) t.del("shopping_items", i.id); }, "Cleared purchased items"),

    /** Adds missing recipe ingredients, skipping anything already in the fridge or on the list. */
    addMissingIngredients: async (recipe: Recipe) => {
      const d = get();
      const missing = recipe.ingredients.filter((ing) => !ing.optional && matchIngredient(ing.key, d.products).state === "missing");
      const toAdd = missing.filter((ing) => !d.shopping_items.some((i) => !i.purchased && relatedProduct(i.product_name, ing.key)));
      if (!toAdd.length) return { added: 0, skipped: missing.length };
      await commit((t) => {
        for (const ing of toAdd) {
          t.put("shopping_items", {
            id: uid(), list_id: listId(), user_id: userId(), product_name: ing.name, category: toShoppingCategory(ing.category),
            quantity: ["g", "ml"].includes(ing.unit) ? 1 : Math.max(1, Math.ceil(ing.amount)), unit: ["g", "ml", "cup", "tbsp", "tsp", "clove", "slices"].includes(ing.unit) ? "pack" : normalizeUnit(ing.unit),
            estimated_price: SAMPLE_PRICES[ing.key] ?? null, purchased: false, source: "recipe", created_at: nowIso()
          });
        }
      }, `${toAdd.length} ingredient${toAdd.length === 1 ? "" : "s"} added to your list`);
      return { added: toAdd.length, skipped: missing.length - toAdd.length };
    },

    /* purchases */
    recordPurchase: async (input: { store_name: string; purchase_date: string; lines: PurchaseLine[]; receipt_image_url?: string | null; markListItems?: boolean }) => {
      const id = uid();
      const total = round(input.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), 2);
      const ok = await commit((t) => {
        const tx: Transaction = { id, user_id: userId(), store_name: input.store_name.trim() || "Grocery store", total_amount: total, purchase_date: input.purchase_date, receipt_image_url: input.receipt_image_url ?? null, created_at: nowIso() };
        t.put("transactions", tx);
        for (const l of input.lines) {
          const item: TransactionItem = { id: uid(), transaction_id: id, user_id: userId(), product_name: l.product_name.trim(), quantity: l.quantity, unit_price: round(l.unit_price, 2), category: l.category };
          t.put("transaction_items", item);
          if (input.markListItems !== false) {
            const match = t.d.shopping_items.find((s) => !s.purchased && relatedProduct(s.product_name, l.product_name));
            if (match) t.put("shopping_items", { ...match, purchased: true });
          }
        }
      }, `Purchase of ${total.toFixed(2)} saved`);
      return ok ? id : null;
    },

    deleteTransaction: (id: string) =>
      commit((t) => {
        for (const i of t.d.transaction_items.filter((x) => x.transaction_id === id)) t.del("transaction_items", i.id);
        t.del("transactions", id);
      }, "Purchase deleted"),

    /* recipes */
    toggleSaveRecipe: (recipeId: string) =>
      commit((t) => {
        const s = t.d.saved_recipes.find((x) => x.recipe_id === recipeId);
        if (s) t.del("saved_recipes", s.id);
        else t.put("saved_recipes", { id: uid(), user_id: userId(), recipe_id: recipeId, created_at: nowIso() });
      }, get().saved_recipes.some((x) => x.recipe_id === recipeId) ? "Removed from saved recipes" : "Recipe saved"),

    rateRecipe: (recipeId: string, rating: number) =>
      commit((t) => {
        const r = t.d.recipe_ratings.find((x) => x.recipe_id === recipeId);
        t.put("recipe_ratings", { id: r?.id ?? uid(), user_id: userId(), recipe_id: recipeId, rating, created_at: nowIso() });
      }, "Thanks! Your rating improves future suggestions"),

    saveUserRecipe: (recipe: Recipe) =>
      commit((t) => {
        const row: UserRecipe = { ...recipe, user_id: userId(), created_at: nowIso() };
        t.put("user_recipes", row);
      }, "Recipe added to your library"),

    /** Called when the user confirms they cooked a recipe. Only confirmed amounts change the fridge. */
    finishCooking: (input: { recipe: Recipe; used: { productId: string; amount: number }[]; portion: number | null }) =>
      commit((t) => {
        for (const u of input.used) {
          const p = t.d.products.find((x) => x.id === u.productId);
          if (!p || u.amount <= 0) continue;
          const qty = Math.min(u.amount, p.quantity);
          const value = round(unitValue(p) * qty, 2);
          const d = daysUntil(p.expiration_date);
          t.put("usage_logs", { id: uid(), user_id: userId(), product_id: p.id, product_name: p.name, quantity: qty, estimated_value: value, used_before_expiry: d === null || d >= 0, created_at: nowIso() });
          const left = round(p.quantity - qty, 2);
          if (left <= 0) t.del("products", p.id);
          else t.put("products", { ...p, quantity: left, estimated_price: p.estimated_price !== null ? round(Math.max(0, p.estimated_price - value), 2) : null, updated_at: nowIso() });
        }
        if (input.portion && input.portion > 0) {
          const r = input.recipe;
          const meal: MealLog = {
            id: uid(), user_id: userId(), recipe_id: r.id, meal_name: r.name, serving_size: input.portion,
            calories: round(r.calories * input.portion), protein: round(r.protein * input.portion, 1), carbohydrates: round(r.carbohydrates * input.portion, 1), fat: round(r.fat * input.portion, 1),
            is_estimate: true, consumed_at: nowIso()
          };
          t.put("meal_logs", meal);
        }
      }, input.portion ? "Nice cooking! Your fridge and nutrition are updated" : "Your fridge is updated"),

    /* nutrition */
    logMeal: (input: MealInput) =>
      commit((t) => {
        t.put("meal_logs", {
          id: uid(), user_id: userId(), recipe_id: input.recipe_id ?? null, meal_name: input.meal_name.trim(), serving_size: input.serving_size ?? 1,
          calories: round(input.calories), protein: round(input.protein, 1), carbohydrates: round(input.carbohydrates, 1), fat: round(input.fat, 1),
          is_estimate: input.is_estimate ?? false, consumed_at: input.consumed_at ?? nowIso()
        });
      }, `${input.meal_name} logged`),

    deleteMeal: (id: string) => commit((t) => t.del("meal_logs", id), "Meal removed"),

    logWater: (ml: number) =>
      commit((t) => t.put("water_logs", { id: uid(), user_id: userId(), amount_ml: ml, logged_at: nowIso() }), `${ml} ml of water logged`),

    undoLastWater: () =>
      commit((t) => {
        const today = toDateKey();
        const last = [...t.d.water_logs].filter((w) => toDateKey(new Date(w.logged_at)) === today).sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
        if (last) t.del("water_logs", last.id);
      }, "Last water entry removed"),

    /* reminders */
    saveReminder: (r: Omit<Reminder, "id" | "user_id" | "last_done_on"> & { id?: string }) =>
      commit((t) => {
        const existing = r.id ? t.d.reminders.find((x) => x.id === r.id) : undefined;
        t.put("reminders", { last_done_on: null, ...existing, ...r, id: r.id ?? uid(), user_id: userId() } as Reminder);
      }, "Reminder saved"),

    deleteReminder: (id: string) => commit((t) => t.del("reminders", id), "Reminder deleted"),

    markReminderDone: (id: string) =>
      commit((t) => {
        const r = t.d.reminders.find((x) => x.id === id);
        if (r) t.put("reminders", { ...r, last_done_on: toDateKey() });
      }, "Marked as taken"),

    /* coupons */
    saveCoupon: (couponId: string) =>
      commit((t) => {
        if (t.d.coupon_saves.some((c) => c.coupon_id === couponId)) return;
        const row: CouponSave = { id: uid(), user_id: userId(), coupon_id: couponId, status: "saved", created_at: nowIso() };
        t.put("coupon_saves", row);
      }, "Coupon saved"),

    unsaveCoupon: (couponId: string) =>
      commit((t) => {
        const s = t.d.coupon_saves.find((c) => c.coupon_id === couponId);
        if (s) t.del("coupon_saves", s.id);
      }, "Coupon removed"),

    /** Tracks use inside MyPantryPal only. It never claims redemption at a real store. */
    markCouponUsed: (couponId: string) =>
      commit((t) => {
        const s = t.d.coupon_saves.find((c) => c.coupon_id === couponId);
        t.put("coupon_saves", { id: s?.id ?? uid(), user_id: userId(), coupon_id: couponId, status: "used", created_at: s?.created_at ?? nowIso() });
      }, "Marked as used in MyPantryPal"),

    /* profile & settings */
    updateProfile: (patch: Partial<Profile>) => commit((t) => t.profile(patch), "Profile saved"),
    updatePreferences: (patch: Partial<UserPreferences>, msg = "Preferences saved") => commit((t) => t.prefs(patch), msg),
    completeOnboarding: (profile: Partial<Profile>, prefs: Partial<UserPreferences>) =>
      commit((t) => { t.profile({ ...profile, onboarded: true }); t.prefs(prefs); }),

    /* data management */
    loadSampleData: async () => {
      const cur = get();
      const sample = demoData(cur.profile.id);
      sample.profile = { ...sample.profile, full_name: cur.profile.full_name || "Julian", email: cur.profile.email, is_demo: extra.isDemoUser };
      await repo.replaceAll(sample);
      return sample;
    },
    deleteAllData: async () => {
      await repo.deleteAll(userId());
      if (!extra.isDemoUser) deleteLocalAccount(get().profile.email);
      await extra.signOutAll();
    },
    exportData: () => {
      const d = get();
      const { coupons: _c, ...mine } = d;
      void _c;
      return JSON.stringify(mine, null, 2);
    }
  };
}

export function DataProvider({ children, onError, onSaved }: { children: ReactNode; onError: (msg: string) => void; onSaved: (msg: string) => void }) {
  const auth = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<AppData | null>(null);
  const user = auth.user;
  const repo: Repository = user && !user.local ? supabaseRepo : localRepo;
  const mode: DataApi["mode"] = user?.demo ? "demo" : repo.kind === "supabase" ? "supabase" : "local";

  const load = useCallback(async () => {
    if (!user) { ref.current = null; setData(null); setReady(false); return; }
    setReady(false);
    setError(null);
    try {
      let d = await repo.load(user.id);
      if (!d) {
        d = user.demo || user.id === DEMO_USER_ID
          ? demoData(user.id)
          : emptyData({ id: user.id, full_name: user.name, email: user.email, avatar_url: null, age: null, currency: "USD", onboarded: false, is_demo: false });
        await repo.replaceAll(d);
      }
      ref.current = d;
      setData(d);
      setReady(true);
    } catch (e) {
      setError((e as Error).message || "Your data could not be loaded.");
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.demo, user?.local]);

  useEffect(() => { void load(); }, [load]);

  const commit = useCallback(async (fn: (draft: Draft) => void, msg?: string) => {
    const cur = ref.current;
    if (!cur) return false;
    const draft = new Draft(cur);
    fn(draft);
    if (!draft.ops.length) return true;
    ref.current = draft.d;
    setData(draft.d);
    setSaving(true);
    try {
      await repo.apply(draft.ops, draft.d);
      if (msg) onSaved(msg);
      return true;
    } catch (e) {
      onError(`Could not save: ${(e as Error).message}`);
      ref.current = cur;
      setData(cur);
      return false;
    } finally {
      setSaving(false);
    }
  }, [repo, onError, onSaved]);

  const actions = useMemo(
    () => buildActions(commit, () => ref.current!, repo, { signOutAll: auth.signOut, isDemoUser: Boolean(user?.demo) }),
    [commit, repo, auth.signOut, user?.demo]
  );

  const reloadAfterSample = useCallback(async () => { await load(); }, [load]);

  const value = useMemo<DataApi>(() => ({ data, ready, error, mode, saving, actions, reload: reloadAfterSample }), [data, ready, error, mode, saving, actions, reloadAfterSample]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/** Convenience hook for screens that render only after data has loaded. */
export function useAppData(): { data: AppData; actions: DataApi["actions"]; mode: DataApi["mode"]; reload: () => Promise<void> } {
  const { data, actions, mode, reload } = useData();
  if (!data) throw new Error("Data is not loaded yet");
  return { data, actions, mode, reload };
}

export { normalizeName, guessCategory };
