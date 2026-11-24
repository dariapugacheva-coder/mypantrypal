"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUPABASE_ENABLED } from "@/lib/config";
import { getSupabase } from "@/lib/supabase/client";
import { safeStorage } from "@/lib/utils/storage";
import { uid } from "@/lib/utils";

export interface AuthUser { id: string; email: string; name: string; demo: boolean; local: boolean }
type Status = "loading" | "signed-in" | "signed-out";
type Result = { ok: true } | { ok: false; error: string };

interface AuthApi {
  status: Status;
  user: AuthUser | null;
  /** "supabase" when real accounts are configured, "local" when accounts live in this browser only. */
  backend: "supabase" | "local";
  signIn(email: string, password: string): Promise<Result>;
  signUp(name: string, email: string, password: string): Promise<Result>;
  signOut(): Promise<void>;
  startDemo(): void;
  requestPasswordReset(email: string): Promise<Result & { message?: string }>;
  updatePassword(password: string, email?: string): Promise<Result>;
}

const AuthContext = createContext<AuthApi | null>(null);

const SESSION_KEY = "mpp:session";
const ACCOUNTS_KEY = "mpp:accounts";
export const DEMO_USER_ID = "demo-julian";

/** Lets the middleware allow the local demo account through when Supabase is configured. */
function setDemoCookie(on: boolean) {
  try { document.cookie = on ? "mpp-demo=1; path=/; SameSite=Lax" : "mpp-demo=; path=/; max-age=0; SameSite=Lax"; } catch { /* cookies blocked */ }
}

interface LocalAccount { id: string; name: string; hash: string }

async function hashPassword(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`mpp:${email.toLowerCase()}:${password}`);
  try {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0;
    for (const b of bytes) h = (h * 31 + b) | 0;
    return `weak-${h}`;
  }
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const backend = SUPABASE_ENABLED ? "supabase" : "local";

  useEffect(() => {
    const local = safeStorage.getJSON<AuthUser>(SESSION_KEY);
    if (local && (local.demo || !SUPABASE_ENABLED)) {
      setUser(local);
      setStatus("signed-in");
      return;
    }
    const sb = getSupabase();
    if (!sb) { setStatus("signed-out"); return; }
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) { setUser({ id: u.id, email: u.email ?? "", name: (u.user_metadata?.full_name as string) ?? "", demo: false, local: false }); setStatus("signed-in"); }
      else setStatus("signed-out");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      if (safeStorage.getJSON<AuthUser>(SESSION_KEY)?.demo) return;
      if (u) { setUser({ id: u.id, email: u.email ?? "", name: (u.user_metadata?.full_name as string) ?? "", demo: false, local: false }); setStatus("signed-in"); }
      else { setUser(null); setStatus("signed-out"); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setLocalSession = (u: AuthUser) => {
    safeStorage.setJSON(SESSION_KEY, u);
    setUser(u);
    setStatus("signed-in");
  };

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return { ok: false, error: "Enter a valid email address." };
    if (!password) return { ok: false, error: "Enter your password." };
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.signInWithPassword({ email: e, password });
      return error ? { ok: false, error: error.message === "Invalid login credentials" ? "That email and password do not match an account." : error.message } : { ok: true };
    }
    const accounts = safeStorage.getJSON<Record<string, LocalAccount>>(ACCOUNTS_KEY) ?? {};
    const acc = accounts[e];
    if (!acc || acc.hash !== (await hashPassword(e, password))) return { ok: false, error: "That email and password do not match an account in this browser." };
    setLocalSession({ id: acc.id, email: e, name: acc.name, demo: false, local: true });
    return { ok: true };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<Result> => {
    const e = email.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: "Enter your name." };
    if (!emailOk(e)) return { ok: false, error: "Enter a valid email address." };
    if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signUp({ email: e, password, options: { data: { full_name: name.trim() } } });
      if (error) return { ok: false, error: error.message };
      if (!data.session) return { ok: false, error: "Check your email to confirm your account, then sign in." };
      return { ok: true };
    }
    const accounts = safeStorage.getJSON<Record<string, LocalAccount>>(ACCOUNTS_KEY) ?? {};
    if (accounts[e]) return { ok: false, error: "An account with this email already exists in this browser. Sign in instead." };
    const acc: LocalAccount = { id: uid(), name: name.trim(), hash: await hashPassword(e, password) };
    accounts[e] = acc;
    safeStorage.setJSON(ACCOUNTS_KEY, accounts);
    setLocalSession({ id: acc.id, email: e, name: acc.name, demo: false, local: true });
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    const wasDemo = safeStorage.getJSON<AuthUser>(SESSION_KEY);
    safeStorage.remove(SESSION_KEY);
    setDemoCookie(false);
    const sb = getSupabase();
    if (sb && !wasDemo?.demo) await sb.auth.signOut();
    setUser(null);
    setStatus("signed-out");
  }, []);

  const startDemo = useCallback(() => {
    setDemoCookie(true);
    setLocalSession({ id: DEMO_USER_ID, email: "julian@example.com", name: "Julian", demo: true, local: true });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return { ok: false as const, error: "Enter a valid email address." };
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.resetPasswordForEmail(e, { redirectTo: `${window.location.origin}/reset-password` });
      return error ? { ok: false as const, error: error.message } : { ok: true as const, message: "If an account exists for this email, a reset link is on its way." };
    }
    const accounts = safeStorage.getJSON<Record<string, LocalAccount>>(ACCOUNTS_KEY) ?? {};
    if (!accounts[e]) return { ok: false as const, error: "No account with this email exists in this browser." };
    return { ok: true as const, message: "Local account found. Choose a new password below." };
  }, []);

  const updatePassword = useCallback(async (password: string, email?: string): Promise<Result> => {
    if (password.length < 8) return { ok: false, error: "Use at least 8 characters for your password." };
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.auth.updateUser({ password });
      return error ? { ok: false, error: error.message } : { ok: true };
    }
    const e = (email ?? "").trim().toLowerCase();
    const accounts = safeStorage.getJSON<Record<string, LocalAccount>>(ACCOUNTS_KEY) ?? {};
    if (!accounts[e]) return { ok: false, error: "No account with this email exists in this browser." };
    accounts[e].hash = await hashPassword(e, password);
    safeStorage.setJSON(ACCOUNTS_KEY, accounts);
    return { ok: true };
  }, []);

  const value = useMemo<AuthApi>(() => ({ status, user, backend, signIn, signUp, signOut, startDemo, requestPasswordReset, updatePassword }), [status, user, backend, signIn, signUp, signOut, startDemo, requestPasswordReset, updatePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Removes a local (browser-only) account record. */
export function deleteLocalAccount(email: string) {
  const accounts = safeStorage.getJSON<Record<string, LocalAccount>>(ACCOUNTS_KEY) ?? {};
  delete accounts[email.toLowerCase()];
  safeStorage.setJSON(ACCOUNTS_KEY, accounts);
}
