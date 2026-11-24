export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "uploads";
/** True only in the single-file presentation build, which has no server and no API routes. */
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

export const APP_NAME = "MyPantryPal";
export const CREATOR = "Daria Pugacheva";
export const COPYRIGHT = "© 2026 MyPantryPal. All rights reserved.";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
