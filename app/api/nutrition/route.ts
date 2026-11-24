import { NextResponse } from "next/server";
import { lookupLocalFood, searchLocalFoods } from "@/lib/nutrition/foods";

export const dynamic = "force-dynamic";

/** Nutrition lookup: USDA FoodData Central when a key is configured, otherwise the local table. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (!q) return NextResponse.json({ results: [], source: "none" });
  const key = process.env.USDA_API_KEY;
  if (key) {
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&pageSize=6&dataType=Foundation,SR%20Legacy`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const json = await res.json();
        const pick = (food: { foodNutrients?: { nutrientName?: string; nutrientNumber?: string; value?: number }[] }, nums: string[]) =>
          food.foodNutrients?.find((n) => nums.includes(String(n.nutrientNumber)))?.value ?? 0;
        const results = (json.foods ?? []).map((f: { description: string; foodNutrients?: { nutrientName?: string; nutrientNumber?: string; value?: number }[] }) => ({
          name: f.description, per: "100 g", grams: 100,
          calories: Math.round(pick(f, ["208", "957", "958"])), protein: pick(f, ["203"]), carbohydrates: pick(f, ["205"]), fat: pick(f, ["204"])
        }));
        return NextResponse.json({ results, source: "usda" });
      }
    } catch {
      /* fall through to local data */
    }
  }
  const local = searchLocalFoods(q);
  const exact = lookupLocalFood(q);
  return NextResponse.json({ results: exact && !local.includes(exact) ? [exact, ...local] : local, source: "local" });
}
