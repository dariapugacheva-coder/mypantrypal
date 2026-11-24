"use client";
import { getSupabase } from "./client";
import { STORAGE_BUCKET } from "@/lib/config";
import { uid } from "@/lib/utils";

/** Uploads an image to the user's private folder and returns its storage path. */
export async function uploadUserImage(userId: string, blob: Blob, folder: "fridge" | "receipts" | "products"): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${folder}/${uid()}.${ext}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Short-lived signed URL so private images are never publicly readable. */
export async function signedImageUrl(path: string): Promise<string | null> {
  const client = getSupabase();
  if (!client || !path || path.startsWith("data:")) return path || null;
  const { data } = await client.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
