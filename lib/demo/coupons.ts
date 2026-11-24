import type { Coupon } from "@/types/database";
import { dateKeyIn } from "@/lib/utils";

/**
 * Demonstration coupons. These are NOT real store offers: the stores are fictional
 * and every coupon is marked is_demo so the interface labels it clearly.
 * Real partner coupons arrive through /api/coupons when GROCERY_PARTNER_API_URL is configured.
 */
export function demoCoupons(): Coupon[] {
  const created = new Date().toISOString();
  const rows: [string, string, string, string, number, string, string][] = [
    ["demo-coupon-1", "Greenleaf Market (demo)", "Greek yogurt", "20% off", 6, "Any 32 oz Greek yogurt tub.", "One per customer. Demo coupon for presentation only."],
    ["demo-coupon-2", "Corner Grocer (demo)", "Chicken breast", "$1.50 off", 3, "Fresh chicken breast, 1 lb or more.", "Demo coupon for presentation only."],
    ["demo-coupon-3", "Greenleaf Market (demo)", "Near-expiry produce box", "40% off", 2, "Mixed fruit and vegetables close to their best-before date.", "While supplies last. Demo coupon."],
    ["demo-coupon-4", "Campus Fresh (demo)", "Eggs (12 pack)", "Buy 1, get 1 half off", 9, "Large eggs, any brand.", "Demo coupon for presentation only."],
    ["demo-coupon-5", "Corner Grocer (demo)", "Store-brand rice 2 lb", "$1 off", 14, "Long grain white or brown rice.", "Demo coupon for presentation only."],
    ["demo-coupon-6", "Campus Fresh (demo)", "Bananas", "15% off", 5, "Per pound, organic or regular.", "Demo coupon for presentation only."]
  ];
  return rows.map(([id, store_name, product_name, discount, days, description, conditions]) => ({
    id, store_name, product_name, discount, expiration_date: dateKeyIn(days), description, conditions, is_demo: true, created_at: created
  }));
}

/** Sample per-unit prices, used only as clearly labeled estimates when no store price feed is connected. */
export const SAMPLE_PRICES: Record<string, number> = {
  egg: 0.35, milk: 3.49, "greek yogurt": 5.99, yogurt: 1.29, spinach: 2.99, "chicken breast": 6.49, rice: 2.49, banana: 0.29,
  tomato: 0.79, cheese: 4.29, bread: 3.29, tuna: 1.59, pasta: 1.49, oats: 3.99, apple: 0.89, avocado: 1.49, onion: 0.69,
  potato: 0.59, beans: 1.19, chickpeas: 1.19, tofu: 2.49, salmon: 8.99, "bell pepper": 1.29, garlic: 0.59, tortilla: 3.49,
  "peanut butter": 3.79, cucumber: 0.99, peas: 1.99, "soy sauce": 2.99, honey: 4.49
};

/** Cheaper store-brand alternatives (sample data, labeled as estimates in the interface). */
export const CHEAPER_ALTERNATIVES: Record<string, { name: string; price: number; save: number }> = {
  "chicken breast": { name: "Chicken thighs (store brand)", price: 4.29, save: 2.2 },
  "greek yogurt": { name: "Store-brand Greek yogurt 32 oz", price: 4.49, save: 1.5 },
  cheese: { name: "Store-brand cheddar block", price: 3.19, save: 1.1 },
  salmon: { name: "Frozen salmon fillets", price: 6.99, save: 2.0 },
  spinach: { name: "Frozen spinach", price: 1.49, save: 1.5 },
  bread: { name: "Store-brand whole wheat bread", price: 2.19, save: 1.1 }
};
