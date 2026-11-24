import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/home", "/fridge", "/cook", "/shop", "/progress", "/profile", "/settings", "/notifications", "/help", "/onboarding"];

/**
 * When Supabase is configured: refreshes the auth session cookie and redirects signed-out
 * visitors away from app pages. Without Supabase (demo mode) the client-side guard protects routes.
 * The demo account is local-only and is recognised by a cookie set when it starts.
 */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      }
    }
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isDemo = req.cookies.get("mpp-demo")?.value === "1";
  if (!data.user && !isDemo && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"] };
