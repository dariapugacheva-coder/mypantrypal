import { NextResponse } from "next/server";
import { AiError, chatJson, OPENAI_ENABLED } from "@/lib/ai/openai";
import { TipRequestSchema } from "@/lib/validations/schemas";
import { requireUser } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!OPENAI_ENABLED) return NextResponse.json({ error: "AI tips are not configured.", fallback: true }, { status: 503 });
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = TipRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const raw = await chatJson({
      system: "You write one short, friendly, practical tip (max 25 words) for a college student who lives alone, based only on the data given. Do not give medical advice. Return JSON {\"tip\": string}.",
      user: JSON.stringify(body.data),
      maxTokens: 120
    });
    const parsed = z.object({ tip: z.string().min(5).max(240) }).safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "No tip available." }, { status: 502 });
    return NextResponse.json(parsed.data);
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("Tip failed.");
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
