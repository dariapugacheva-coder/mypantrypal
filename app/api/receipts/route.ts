import { NextResponse } from "next/server";
import { AiError, chatJson, OPENAI_ENABLED, RECEIPT_PROMPT } from "@/lib/ai/openai";
import { ImageRequestSchema, ReceiptResultSchema } from "@/lib/validations/schemas";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Receipt OCR. Returns extracted lines for the user to review; nothing is saved here. */
export async function POST(req: Request) {
  if (!OPENAI_ENABLED) return NextResponse.json({ error: "Receipt reading is not configured. Enter the receipt manually instead.", fallback: true }, { status: 503 });
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "Please sign in to scan receipts." }, { status: 401 });
  const body = ImageRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid image." }, { status: 400 });
  try {
    const raw = await chatJson({
      system: RECEIPT_PROMPT,
      vision: true,
      maxTokens: 2000,
      user: [{ type: "text", text: "Extract this receipt." }, { type: "image_url", image_url: { url: body.data.image, detail: "high" } }]
    });
    const parsed = ReceiptResultSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "The receipt could not be read clearly. Try a sharper photo or enter it manually." }, { status: 502 });
    return NextResponse.json(parsed.data);
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("Receipt reading failed.");
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
