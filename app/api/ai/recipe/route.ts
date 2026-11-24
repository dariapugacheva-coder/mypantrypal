import { NextResponse } from "next/server";
import { AiError, chatJson, OPENAI_ENABLED } from "@/lib/ai/openai";
import { AiRecipeRequestSchema, AiRecipeSchema } from "@/lib/validations/schemas";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Generates one recipe from the user's ingredients. Allergies are passed as hard exclusions and re-checked on the client. */
export async function POST(req: Request) {
  if (!OPENAI_ENABLED) return NextResponse.json({ error: "AI recipes are not configured. Choose from the recipe library instead.", fallback: true }, { status: 503 });
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = AiRecipeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Add a few ingredients to your fridge first." }, { status: 400 });
  const d = body.data;
  try {
    const raw = await chatJson({
      system: `You create one simple, budget-friendly recipe for one person who lives alone.
Use mainly the available ingredients and prioritize the ones expiring soon. Pantry basics (oil, salt, pepper, spices) are allowed.
NEVER use any ingredient related to these allergies: ${d.allergies.join(", ") || "none"}. Respect these diets: ${d.diets.join(", ") || "none"}.
Keep total time under ${d.maxMinutes} minutes. Nutrition values are per serving estimates.
Return JSON {"name","description","cuisine","preparation_time","difficulty","servings","calories","protein","carbohydrates","fat","ingredients":[{"name","amount","unit","optional"}],"instructions":[string]}`,
      user: JSON.stringify({ available: d.ingredients, expiring_soon: d.expiring }),
      maxTokens: 900
    });
    const parsed = AiRecipeSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "The AI recipe was incomplete. Please try again." }, { status: 502 });
    return NextResponse.json(parsed.data);
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("Recipe generation failed.");
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
