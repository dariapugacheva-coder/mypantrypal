"use client";
import type { AppData, CollectionName, Coupon, Profile, UserPreferences } from "@/types/database";
import { COLLECTIONS } from "@/types/database";
import type { Op, Repository } from "@/lib/data/repository";
import { getSupabase } from "./client";
import { defaultPreferences, emptyData } from "@/lib/demo/seed";
import { demoCoupons } from "@/lib/demo/coupons";

function sb() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase is not configured.");
  return c;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Supabase-backed repository. Row Level Security restricts every query to the signed-in user. */
export const supabaseRepo: Repository = {
  kind: "supabase",
  async load(userId) {
    const client = sb();
    const profileRes = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    let profile = check(profileRes) as Profile | null;
    if (!profile) {
      const { data: auth } = await client.auth.getUser();
      const base = emptyData({ id: userId, full_name: (auth.user?.user_metadata?.full_name as string) ?? "", email: auth.user?.email ?? "", avatar_url: null, age: null, currency: "USD", onboarded: false, is_demo: false });
      profile = base.profile;
      check(await client.from("profiles").upsert(profile));
    }
    let prefs = check(await client.from("user_preferences").select("*").eq("user_id", userId).maybeSingle()) as UserPreferences | null;
    if (!prefs) {
      prefs = defaultPreferences(userId);
      check(await client.from("user_preferences").upsert(prefs));
    }
    const out = { profile, preferences: prefs } as AppData;
    await Promise.all(
      COLLECTIONS.map(async (table) => {
        const rows = check(await client.from(table).select("*").eq("user_id", userId));
        (out as unknown as Record<CollectionName, unknown[]>)[table] = rows ?? [];
      })
    );
    const coupons = check(await client.from("coupons").select("*").order("expiration_date")) as Coupon[];
    out.coupons = coupons.length ? coupons : demoCoupons();
    if (!out.shopping_lists.length) {
      const list = emptyData({ ...profile }).shopping_lists[0];
      check(await client.from("shopping_lists").insert(list));
      out.shopping_lists = [list];
    }
    return out;
  },
  async apply(ops: Op[]) {
    const client = sb();
    for (const op of ops) {
      if (op.type === "upsert") check(await client.from(op.table).upsert(op.row));
      else if (op.type === "remove") check(await client.from(op.table).delete().eq("id", op.id));
      else if (op.type === "profile") check(await client.from("profiles").upsert(op.row));
      else if (op.type === "preferences") check(await client.from("user_preferences").upsert(op.row));
    }
  },
  async replaceAll(data) {
    const client = sb();
    const userId = data.profile.id;
    for (const table of [...COLLECTIONS].reverse()) check(await client.from(table).delete().eq("user_id", userId));
    check(await client.from("profiles").upsert(data.profile));
    check(await client.from("user_preferences").upsert(data.preferences));
    for (const table of COLLECTIONS) {
      const rows = (data as unknown as Record<CollectionName, { id: string }[]>)[table];
      if (rows.length) check(await client.from(table).insert(rows));
    }
  },
  async deleteAll(userId) {
    const client = sb();
    for (const table of [...COLLECTIONS].reverse()) check(await client.from(table).delete().eq("user_id", userId));
    check(await client.from("user_preferences").delete().eq("user_id", userId));
    check(await client.from("profiles").delete().eq("id", userId));
    // Removing the auth user itself requires the service role; the delete_my_account() SQL function handles it.
    await client.rpc("delete_my_account").then(() => undefined, () => undefined);
  }
};
