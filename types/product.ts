export const CATEGORIES = [
  "Fruits", "Vegetables", "Dairy", "Meat", "Seafood", "Eggs", "Grains", "Bread", "Frozen Food", "Snacks", "Drinks", "Other"
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STORAGE_LOCATIONS = ["Refrigerator", "Freezer", "Pantry"] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export const UNITS = ["pcs", "g", "kg", "ml", "l", "pack", "bottle", "carton", "bag", "can", "box", "bunch", "loaf", "cup"] as const;

export const SHOPPING_CATEGORIES = ["Produce", "Dairy", "Meat", "Bakery", "Frozen", "Pantry", "Drinks", "Other"] as const;
export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

export type ExpiryStatus = "expired" | "urgent" | "soon" | "ok" | "unknown";

/** A product recognized by AI or entered by hand, before the user confirms it. */
export interface DetectedProduct {
  key: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  storage_location: StorageLocation;
  expiration_date: string | null;
  confidence: number;
  alternatives?: string[];
  estimated_price?: number | null;
}
