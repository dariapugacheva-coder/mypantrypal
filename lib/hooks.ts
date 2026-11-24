"use client";
import { useEffect, useState } from "react";
import { getIntegrations, type IntegrationStatus } from "@/lib/api/client";

export function useIntegrations(): IntegrationStatus | null {
  const [s, setS] = useState<IntegrationStatus | null>(null);
  useEffect(() => { let live = true; getIntegrations().then((v) => live && setS(v)); return () => { live = false; }; }, []);
  return s;
}

/** Re-render on an interval so time-based views (greeting, reminders) stay current. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}
