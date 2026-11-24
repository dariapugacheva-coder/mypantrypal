"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNav } from "@/lib/nav";
import { Splash } from "@/components/layout/Guards";

export default function Index() {
  const { status } = useAuth();
  const nav = useNav();
  useEffect(() => { if (status !== "loading") nav.replace(status === "signed-in" ? "/home" : "/login"); }, [status, nav]);
  return <Splash label="Loading" />;
}
