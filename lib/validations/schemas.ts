import { z } from "zod";
import { CATEGORIES, STORAGE_LOCATIONS, SHOPPING_CATEGORIES } from "@/types/product";

const category = z.preprocess((v) => {
  const s = String(v ?? "").trim().toLowerCase();
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s) ?? (s === "frozen" ? "Frozen Food" : s === "egg" ? "Eggs" : undefined);
  return hit ?? "Other";
}, z.enum(CATEGORIES));

/** Validates the JSON the vision model returns before anything is shown or saved. */
export const VisionResultSchema = z.object({
  products: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    category,
    quantity: z.coerce.number().positive().max(1000).catch(1),
    unit: z.string().trim().max(20).catch("pcs"),
    storage_location: z.enum(STORAGE_LOCATIONS).catch("Refrigerator"),
    confidence: z.coerce.number().min(0).max(1).catch(0.5),
    alternatives: z.array(z.string().trim().min(1).max(60)).max(3).optional().catch(undefined)
  })).max(60)
});
export type VisionResult = z.infer<typeof VisionResultSchema>;

export const ReceiptResultSchema = z.object({
  store_name: z.string().trim().max(80).catch(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  items: z.array(z.object({
    product_name: z.string().trim().min(1).max(80),
    quantity: z.coerce.number().positive().max(1000).catch(1),
    unit_price: z.coerce.number().min(0).max(10000),
    category: z.enum(SHOPPING_CATEGORIES).catch("Other")
  })).max(100),
  total: z.coerce.number().min(0).max(100000).nullable().catch(null)
});
export type ReceiptResult = z.infer<typeof ReceiptResultSchema>;

export const ImageRequestSchema = z.object({
  image: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Image must be a JPG, PNG or WEBP data URL.").max(11_000_000, "Image is too large.")
});

export const TipRequestSchema = z.object({
  expiring: z.array(z.object({ name: z.string().max(60), days: z.number() })).max(10),
  budgetUsedPct: z.number().min(0).max(10),
  proteinToday: z.number().min(0).max(1000),
  proteinGoal: z.number().min(0).max(1000)
});

export const AiRecipeRequestSchema = z.object({
  ingredients: z.array(z.string().max(60)).min(1).max(40),
  expiring: z.array(z.string().max(60)).max(20),
  allergies: z.array(z.string().max(40)).max(20),
  diets: z.array(z.string().max(40)).max(10),
  maxMinutes: z.number().min(5).max(180)
});

export const AiRecipeSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240),
  cuisine: z.string().max(40).catch("Home"),
  preparation_time: z.coerce.number().min(1).max(240),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).catch("Easy"),
  servings: z.coerce.number().min(1).max(12).catch(1),
  calories: z.coerce.number().min(0).max(3000),
  protein: z.coerce.number().min(0).max(300),
  carbohydrates: z.coerce.number().min(0).max(500),
  fat: z.coerce.number().min(0).max(300),
  ingredients: z.array(z.object({ name: z.string().min(1).max(60), amount: z.coerce.number().min(0).max(5000), unit: z.string().max(20), optional: z.boolean().optional() })).min(1).max(20),
  instructions: z.array(z.string().min(2).max(400)).min(1).max(15)
});

export const ProductFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(60, "Keep the name under 60 characters."),
  category: z.enum(CATEGORIES),
  quantity: z.coerce.number({ invalid_type_error: "Enter a number." }).positive("Quantity must be more than 0.").max(10000),
  unit: z.string().trim().min(1).max(20),
  purchase_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  storage_location: z.enum(STORAGE_LOCATIONS),
  notes: z.string().max(300).nullable(),
  estimated_price: z.number().min(0).max(10000).nullable()
});
