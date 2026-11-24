import type { ShoppingCategory } from "@/types/product";
import { guessCategory, toShoppingCategory } from "@/lib/etl/normalize";

export interface ParsedReceiptLine { product_name: string; quantity: number; unit_price: number; category: ShoppingCategory }

/**
 * Parses receipt text typed or pasted by the user (manual fallback when OCR is unavailable).
 * Accepts lines such as "Milk 3.49", "2 x Eggs 4.20" or "Bananas $1.47".
 */
export function parseReceiptText(text: string): ParsedReceiptLine[] {
  const out: ParsedReceiptLine[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line || /total|subtotal|tax|change|cash|visa|card/i.test(line)) continue;
    const price = line.match(/\$?\s?(\d+[.,]\d{2})\s*$/);
    if (!price) continue;
    let name = line.slice(0, price.index).trim();
    let quantity = 1;
    const q = name.match(/^(\d+)\s*[xX@]?\s+/);
    if (q) { quantity = Number(q[1]); name = name.slice(q[0].length); }
    name = name.replace(/[-–:]+$/, "").trim();
    if (!name) continue;
    const total = Number(price[1].replace(",", "."));
    out.push({ product_name: name, quantity, unit_price: Math.round((total / quantity) * 100) / 100, category: toShoppingCategory(guessCategory(name)) });
  }
  return out;
}
