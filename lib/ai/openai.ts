import "server-only";

/** Minimal server-side OpenAI client (REST). The API key never reaches the browser. */
export const OPENAI_ENABLED = Boolean(process.env.OPENAI_API_KEY);
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

type Content = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } })[];

export class AiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export async function chatJson(opts: { system: string; user: Content; vision?: boolean; maxTokens?: number }): Promise<unknown> {
  if (!OPENAI_ENABLED) throw new AiError("AI is not configured.", 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: opts.vision ? VISION_MODEL : TEXT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: opts.maxTokens ?? 1200,
        messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.user }]
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenAI error", res.status, detail.slice(0, 300));
      throw new AiError(res.status === 429 ? "The AI service is busy. Please try again in a minute." : "The AI service could not process this request.", res.status === 429 ? 429 : 502);
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    try {
      return JSON.parse(text);
    } catch {
      throw new AiError("The AI returned an unreadable answer. Please try again.");
    }
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError((e as Error).name === "AbortError" ? "The AI took too long to answer. Please try again." : "Could not reach the AI service.");
  } finally {
    clearTimeout(timer);
  }
}

export const FRIDGE_PROMPT = `You identify groceries in a photo of a refrigerator, freezer or pantry.
Return JSON: {"products":[{"name":string,"category":one of "Fruits","Vegetables","Dairy","Meat","Seafood","Eggs","Grains","Bread","Frozen Food","Snacks","Drinks","Other","quantity":number,"unit":string,"storage_location":"Refrigerator"|"Freezer"|"Pantry","confidence":number 0-1,"alternatives":string[]}]}
Rules:
- List only food and drink you can actually see. Do not guess hidden items.
- Use short generic names ("Milk", "Greek yogurt", "Spinach"), not brands.
- Estimate quantity and unit (pcs, bottle, carton, bag, pack, g).
- confidence below 0.6 when unsure; then give up to 3 plausible alternatives (e.g. "Milk" vs "Yogurt").
- Never state expiration dates; they cannot be read reliably from a photo.`;

export const RECEIPT_PROMPT = `You read grocery receipts (OCR). Return JSON:
{"store_name":string,"date":"YYYY-MM-DD" or null,"items":[{"product_name":string,"quantity":number,"unit_price":number,"category":one of "Produce","Dairy","Meat","Bakery","Frozen","Pantry","Drinks","Other"}],"total":number or null}
Rules: copy prices exactly as printed. Expand abbreviations when obvious (e.g. "GRK YOG" -> "Greek yogurt").
Skip tax, bag fees, discounts and loyalty lines as items. If a value is unreadable use null rather than guessing.`;
