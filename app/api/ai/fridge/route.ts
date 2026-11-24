import { NextResponse } from "next/server";
import { AiError, chatJson, FRIDGE_PROMPT, OPENAI_ENABLED } from "@/lib/ai/openai";
import { ImageRequestSchema, VisionResultSchema } from "@/lib/validations/schemas";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!OPENAI_ENABLED) return NextResponse.json({ error: "Fridge recognition is not configured. Add products manually instead.", fallback: true }, { status: 503 });
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "Please sign in to scan your fridge." }, { status: 401 });
  const body = ImageRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid image." }, { status: 400 });
  try {
    const raw = await chatJson({
      system: FRIDGE_PROMPT,
      vision: true,
      user: [{ type: "text", text: "Identify the groceries in this photo." }, { type: "image_url", image_url: { url: body.data.image, detail: "high" } }]
    });
    const parsed = VisionResultSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "The AI answer did not have the expected format. Please try again or add items manually." }, { status: 502 });
    return NextResponse.json(parsed.data);
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("Recognition failed.");
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
