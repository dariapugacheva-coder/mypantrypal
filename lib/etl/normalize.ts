import type { Category, ShoppingCategory } from "@/types/product";

/**
 * Product name normalization (the "Transform" step of our ETL).
 * "Milk 1%", "1% Milk" and "milk" all share the key "milk";
 * the variant ("1%") is kept so different products are not merged by mistake.
 */
const SYNONYMS: Record<string, string> = {
  eggs: "egg", "large eggs": "egg", "free range eggs": "egg",
  "whole milk": "milk", "skim milk": "milk", "oat milk": "oat milk", "almond milk": "almond milk",
  "greek yoghurt": "greek yogurt", yoghurt: "yogurt", "plain yogurt": "yogurt",
  "baby spinach": "spinach", "spinach leaves": "spinach",
  "chicken breasts": "chicken breast", "chicken fillet": "chicken breast",
  tomatoes: "tomato", "cherry tomatoes": "tomato", bananas: "banana", apples: "apple",
  "white rice": "rice", "brown rice": "rice", "jasmine rice": "rice",
  "cheddar cheese": "cheese", cheddar: "cheese", mozzarella: "cheese",
  "whole wheat bread": "bread", "sandwich bread": "bread", toast: "bread",
  "canned tuna": "tuna", "tuna can": "tuna", onions: "onion", carrots: "carrot",
  potatoes: "potato", "bell peppers": "bell pepper", peppers: "bell pepper",
  "spaghetti": "pasta", penne: "pasta", noodles: "pasta", tortillas: "tortilla", wraps: "tortilla",
  avocados: "avocado", lemons: "lemon", oats: "oats", "rolled oats": "oats", "frozen peas": "peas",
  "black beans": "beans", "kidney beans": "beans", chickpea: "chickpeas", "garlic cloves": "garlic"
};

const KEEP_PLURAL = new Set(["oats", "chickpeas", "beans", "peas", "greens", "lentils", "sprouts", "grits"]);

const VARIANT_RE = /(\d+(?:\.\d+)?\s?%|low[- ]fat|fat[- ]free|lactose[- ]free|organic|unsweetened|light)/gi;
const NOISE_RE = /\b(\d+(?:\.\d+)?\s?(?:g|kg|ml|l|oz|lb|pcs|pack|ct))\b|[^a-z0-9%\s-]/gi;

export interface NormalizedName { key: string; variant: string | null; display: string }

export function normalizeName(raw: string): NormalizedName {
  const lower = raw.toLowerCase().trim();
  const variants = (lower.match(VARIANT_RE) || []).map((v) => v.replace(/\s+/g, "")).sort();
  let base = lower.replace(VARIANT_RE, " ").replace(NOISE_RE, " ").replace(/\s+/g, " ").trim();
  if (SYNONYMS[base]) base = SYNONYMS[base];
  else if (base.length > 4 && /(oes|ches|shes)$/.test(base)) base = base.slice(0, -2);
  else if (base.endsWith("s") && !base.endsWith("ss") && base.length > 3 && !KEEP_PLURAL.has(base)) base = base.slice(0, -1);
  if (SYNONYMS[base]) base = SYNONYMS[base];
  const variant = variants.length ? variants.join(" ") : null;
  const display = raw.trim().replace(/\s+/g, " ");
  return { key: base || lower, variant, display };
}

export const productKey = (raw: string) => normalizeName(raw).key;

/** True when two names describe the same product (same key and same variant). */
export function sameProduct(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.key === nb.key && (na.variant ?? "") === (nb.variant ?? "");
}

/** True when two names are related (same key), even if the variant differs, e.g. "Milk 1%" vs "Milk". */
export function relatedProduct(a: string, b: string): boolean {
  return normalizeName(a).key === normalizeName(b).key;
}

const KEYWORD_CATEGORY: [RegExp, Category][] = [
  [/apple|banana|berry|berries|grape|orange|lemon|lime|avocado|mango|pear|peach|kiwi|melon/, "Fruits"],
  [/spinach|lettuce|tomato|carrot|onion|garlic|pepper|broccoli|cucumber|cabbage|potato|kale|mushroom|zucchini|celery|peas|corn/, "Vegetables"],
  [/milk|yogurt|cheese|butter|cream|kefir/, "Dairy"],
  [/egg/, "Eggs"],
  [/chicken|beef|pork|turkey|bacon|sausage|ham|lamb|mince/, "Meat"],
  [/tuna|salmon|fish|shrimp|prawn|cod|sardine/, "Seafood"],
  [/rice|pasta|oats|quinoa|flour|cereal|beans|lentil|chickpea|noodle/, "Grains"],
  [/bread|bagel|tortilla|bun|croissant|pita/, "Bread"],
  [/frozen|ice cream/, "Frozen Food"],
  [/chip|cookie|chocolate|cracker|snack|bar|nuts|popcorn/, "Snacks"],
  [/juice|soda|water|coffee|tea|drink|cola/, "Drinks"]
];

export function guessCategory(name: string): Category {
  const n = name.toLowerCase();
  for (const [re, cat] of KEYWORD_CATEGORY) if (re.test(n)) return cat;
  return "Other";
}

export function toShoppingCategory(c: Category): ShoppingCategory {
  switch (c) {
    case "Fruits": case "Vegetables": return "Produce";
    case "Dairy": case "Eggs": return "Dairy";
    case "Meat": case "Seafood": return "Meat";
    case "Bread": return "Bakery";
    case "Frozen Food": return "Frozen";
    case "Grains": case "Snacks": return "Pantry";
    case "Drinks": return "Drinks";
    default: return "Other";
  }
}

const UNIT_ALIASES: Record<string, string> = {
  piece: "pcs", pieces: "pcs", pc: "pcs", unit: "pcs", units: "pcs", gram: "g", grams: "g", kilogram: "kg",
  liter: "l", litre: "l", liters: "l", milliliter: "ml", bottles: "bottle", packs: "pack", packages: "pack",
  bags: "bag", cans: "can", boxes: "box", loaves: "loaf", cups: "cup", cartons: "carton", bunches: "bunch"
};

export function normalizeUnit(u: string): string {
  const k = u.toLowerCase().trim();
  return UNIT_ALIASES[k] ?? (k || "pcs");
}
