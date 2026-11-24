import { NextResponse } from "next/server";
import { demoCoupons } from "@/lib/demo/coupons";

export const dynamic = "force-dynamic";

/**
 * Coupon feed. With GROCERY_PARTNER_API_URL configured, coupons come from the partner API
 * (expected to return { coupons: Coupon[] }). Otherwise clearly labeled demo coupons are returned.
 * Redemption is only ever confirmed by a real partner integration.
 */
export async function GET() {
  const url = process.env.GROCERY_PARTNER_API_URL;
  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/coupons`, { headers: { Authorization: `Bearer ${process.env.GROCERY_PARTNER_API_KEY ?? ""}` }, next: { revalidate: 900 } });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.coupons)) return NextResponse.json({ coupons: json.coupons.map((c: Record<string, unknown>) => ({ ...c, is_demo: false })), source: "partner" });
      }
    } catch {
      /* fall back to demo */
    }
  }
  return NextResponse.json({ coupons: demoCoupons(), source: "demo" });
}
