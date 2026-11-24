import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "@/lib/config";

/** Server-side Supabase client bound to the request cookies (used in API routes). */
export async function getServerSupabase() {
  if (!SUPABASE_ENABLED) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a context that cannot set cookies */
        }
      }
    }
  });
}

/**
 * When Supabase is configured, AI routes require a signed-in user so the API keys
 * cannot be used anonymously. Without Supabase (local development) requests are allowed.
 */
export async function requireUser(): Promise<{ ok: true; userId: string | null } | { ok: false }> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: true, userId: null };
  const { data } = await sb.auth.getUser();
  return data.user ? { ok: true, userId: data.user.id } : { ok: false };
}
