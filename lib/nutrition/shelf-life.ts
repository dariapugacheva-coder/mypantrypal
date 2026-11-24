import type { Category, StorageLocation } from "@/types/product";
import { dateKeyIn } from "@/lib/utils";
import { productKey } from "@/lib/etl/normalize";

/**
 * Typical shelf life in days, by product key and storage location.
 * These are general food-safety estimates, not exact dates: a photo cannot show
 * a real expiration date, so we estimate from the food type and where it is stored,
 * and the user can always replace the estimate with the date on the package.
 */
const BY_KEY: Record<string, Partial<Record<StorageLocation, number>>> = {
  milk: { Refrigerator: 7 }, "oat milk": { Refrigerator: 7, Pantry: 180 }, yogurt: { Refrigerator: 14 }, "greek yogurt": { Refrigerator: 14 },
  cheese: { Refrigerator: 21, Freezer: 180 }, butter: { Refrigerator: 30, Freezer: 180 }, cream: { Refrigerator: 7 },
  egg: { Refrigerator: 28 }, spinach: { Refrigerator: 5 }, lettuce: { Refrigerator: 6 }, tomato: { Refrigerator: 7, Pantry: 5 },
  banana: { Pantry: 5, Refrigerator: 7 }, apple: { Refrigerator: 30, Pantry: 10 }, avocado: { Pantry: 4, Refrigerator: 7 },
  berries: { Refrigerator: 4 }, strawberry: { Refrigerator: 4 }, carrot: { Refrigerator: 21 }, onion: { Pantry: 30 },
  garlic: { Pantry: 60 }, potato: { Pantry: 30 }, "bell pepper": { Refrigerator: 10 }, broccoli: { Refrigerator: 5 },
  cucumber: { Refrigerator: 7 }, mushroom: { Refrigerator: 6 }, "chicken breast": { Refrigerator: 2, Freezer: 180 },
  chicken: { Refrigerator: 2, Freezer: 180 }, beef: { Refrigerator: 3, Freezer: 120 }, "ground beef": { Refrigerator: 2, Freezer: 120 },
  pork: { Refrigerator: 3, Freezer: 120 }, salmon: { Refrigerator: 2, Freezer: 90 }, tuna: { Pantry: 730, Refrigerator: 3 },
  tofu: { Refrigerator: 7 }, rice: { Pantry: 365 }, pasta: { Pantry: 365 }, oats: { Pantry: 365 }, bread: { Pantry: 5, Freezer: 90 },
  tortilla: { Pantry: 10, Refrigerator: 21 }, beans: { Pantry: 730 }, chickpeas: { Pantry: 730 }, peas: { Freezer: 240 },
  lemon: { Refrigerator: 21, Pantry: 7 }, hummus: { Refrigerator: 7 }, ham: { Refrigerator: 5 }
};

const BY_CATEGORY: Record<Category, Record<StorageLocation, number>> = {
  Fruits: { Refrigerator: 7, Freezer: 240, Pantry: 5 },
  Vegetables: { Refrigerator: 7, Freezer: 240, Pantry: 7 },
  Dairy: { Refrigerator: 10, Freezer: 90, Pantry: 3 },
  Meat: { Refrigerator: 3, Freezer: 150, Pantry: 1 },
  Seafood: { Refrigerator: 2, Freezer: 90, Pantry: 1 },
  Eggs: { Refrigerator: 28, Freezer: 90, Pantry: 7 },
  Grains: { Refrigerator: 180, Freezer: 365, Pantry: 365 },
  Bread: { Refrigerator: 10, Freezer: 90, Pantry: 5 },
  "Frozen Food": { Refrigerator: 2, Freezer: 180, Pantry: 1 },
  Snacks: { Refrigerator: 60, Freezer: 180, Pantry: 90 },
  Drinks: { Refrigerator: 14, Freezer: 180, Pantry: 180 },
  Other: { Refrigerator: 14, Freezer: 120, Pantry: 60 }
};

export function shelfLifeDays(name: string, category: Category, storage: StorageLocation): number {
  const fromKey = BY_KEY[productKey(name)]?.[storage];
  return fromKey ?? BY_CATEGORY[category][storage];
}

export function estimateExpiration(name: string, category: Category, storage: StorageLocation, from: Date = new Date()): string {
  return dateKeyIn(shelfLifeDays(name, category, storage), from);
}

export function defaultStorage(category: Category): StorageLocation {
  if (category === "Frozen Food") return "Freezer";
  if (["Grains", "Snacks", "Bread", "Drinks"].includes(category)) return "Pantry";
  return "Refrigerator";
}
