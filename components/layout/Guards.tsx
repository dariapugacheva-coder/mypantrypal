"use client";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useData } from "@/lib/data/DataProvider";
import { useNav, usePath } from "@/lib/nav";
import { Penguin } from "@/components/mascot/Penguin";
import { Button } from "@/components/ui";
import { AppShell } from "./AppShell";

export function Splash({ label = "Getting your kitchen ready" }: { label?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center" role="status">
      <Penguin mood="happy" size={84} className="animate-bob" />
      <p className="text-sm text-muted">{label}…</p>
    </div>
  );
}

/** Protects app pages: requires a session, loaded data and completed onboarding. */
export function ProtectedApp({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { data, ready, error, reload } = useData();
  const nav = useNav();
  const path = usePath();
  useEffect(() => {
    if (status === "signed-out") nav.replace("/login");
  }, [status, nav]);
  useEffect(() => {
    if (ready && data && !data.profile.onboarded && path !== "/onboarding") nav.replace("/onboarding");
  }, [ready, data, path, nav]);
  if (status !== "signed-in" || !ready) return <Splash />;
  if (error || !data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Penguin mood="think" size={84} />
        <h1 className="text-xl font-semibold">We could not load your kitchen</h1>
        <p className="max-w-md text-sm text-muted">{error ?? "Something went wrong."} Check your connection and try again.</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }
  if (!data.profile.onboarded) return <Splash label="Starting setup" />;
  return <AppShell>{children}</AppShell>;
}

/** For login and signup pages: sends signed-in users into the app. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const nav = useNav();
  useEffect(() => { if (status === "signed-in") nav.replace("/home"); }, [status, nav]);
  if (status === "loading") return <Splash label="Loading" />;
  if (status === "signed-in") return <Splash label="Opening your kitchen" />;
  return <>{children}</>;
}
