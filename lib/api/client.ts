"use client";
import { STATIC_DEMO } from "@/lib/config";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; fallback?: boolean };

const UNAVAILABLE = "This feature needs a server connection, which is not part of the presentation demo.";

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  if (STATIC_DEMO) return { ok: false, status: 503, error: UNAVAILABLE, fallback: true };
  try {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? `Request failed (${res.status})`, fallback: Boolean(json.fallback) };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }
}

export const apiGet = <T,>(path: string) => call<T>(path);
export const apiPost = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export interface IntegrationStatus { vision: boolean; ocr: boolean; ai_text: boolean; usda: boolean; grocery: boolean; supabase: boolean }

let cached: Promise<IntegrationStatus> | null = null;
const NONE: IntegrationStatus = { vision: false, ocr: false, ai_text: false, usda: false, grocery: false, supabase: false };

export function getIntegrations(): Promise<IntegrationStatus> {
  if (!cached) cached = apiGet<IntegrationStatus>("/api/status").then((r) => (r.ok ? r.data : NONE));
  return cached;
}
