import { NextResponse } from "next/server";
import { OPENAI_ENABLED } from "@/lib/ai/openai";
import { SUPABASE_ENABLED } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Tells the client which optional integrations are configured, without exposing any key. */
export async function GET() {
  return NextResponse.json({
    vision: OPENAI_ENABLED,
    ocr: OPENAI_ENABLED,
    ai_text: OPENAI_ENABLED,
    usda: Boolean(process.env.USDA_API_KEY),
    grocery: Boolean(process.env.GROCERY_PARTNER_API_URL),
    supabase: SUPABASE_ENABLED
  });
}
